// src/actions/userActions.ts
'use server';

import { getDbConnection } from '@/lib/db';
import type { UserProfileData } from '@/types/user'; // Import UserProfileData type
import type { RoleRequest } from '@/types/roleRequest'; // Import RoleRequest type
import type { Notification } from '@/types/notification'; // Import Notification type
import type { ContactMessage } from '@/types/message'; // Import ContactMessage type
import { revalidatePath } from 'next/cache'; // Import revalidatePath
import { z } from 'zod'; // Import zod for validation

// Type returned directly from the DB query
type RawUserProfileData = Omit<UserProfileData, 'createdAt'> & {
    createdAt: string | Date; // DB might return string or Date depending on driver/config
};

/**
 * Fetches user profile data from the SQLite database based on UID.
 * Converts date fields to serializable strings before returning.
 * @param uid - The User ID.
 * @returns The user profile data with dates as ISO strings, or null if not found/error.
 */
export async function getUserProfile(uid: string): Promise<UserProfileData | null> {
  if (!uid) {
    console.error("getUserProfile called with invalid UID.");
    return null;
  }

  try {
    const db = await getDbConnection();
    const rawProfileData = await db.get<RawUserProfileData>(
      'SELECT uid, name, email, mobile, role, status, avatarUrl, createdAt FROM users WHERE uid = ?',
      uid
    );

    if (rawProfileData) {
      // Basic validation for role and status
      if (!rawProfileData.role || !rawProfileData.status) {
        console.warn("User profile data incomplete (missing role or status). Returning potentially incomplete profile.", rawProfileData);
        // Still need to serialize the date even if incomplete
        const createdAtString = rawProfileData.createdAt instanceof Date
          ? rawProfileData.createdAt.toISOString()
          : String(rawProfileData.createdAt); // Assume string if not Date

        return {
            ...rawProfileData,
            // Provide default values for potentially missing fields expected by UserProfileData
            name: rawProfileData.name || '',
            email: rawProfileData.email || '',
            mobile: rawProfileData.mobile || '',
            role: rawProfileData.role || 'user', // Default role if missing
            status: rawProfileData.status || 'active', // Default status if missing
            createdAt: createdAtString,
            avatarUrl: rawProfileData.avatarUrl || null, // Ensure null if missing
        };
      }

      // Ensure createdAt is serialized to a string (ISO format recommended)
      const createdAtString = rawProfileData.createdAt instanceof Date
          ? rawProfileData.createdAt.toISOString()
          : String(rawProfileData.createdAt); // Assume string if not Date

      // Construct the final profile data matching the type
      const profileData: UserProfileData = {
        uid: rawProfileData.uid,
        name: rawProfileData.name,
        email: rawProfileData.email,
        mobile: rawProfileData.mobile,
        role: rawProfileData.role,
        status: rawProfileData.status,
        avatarUrl: rawProfileData.avatarUrl || null, // Ensure null if undefined
        createdAt: createdAtString,
        // kyc: rawProfileData.kyc || null, // Ensure kyc is handled - REMOVED as not part of core
      };


      return profileData;
    } else {
      console.warn("User profile not found in SQLite for UID:", uid);
      return null; // Profile doesn't exist
    }
  } catch (error) {
    console.error("Error fetching user profile from SQLite:", error);
    return null; // Return null on error
  }
}


// ----- Update User Profile -----

// Zod schema for profile update validation
const UpdateProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  mobile: z.string().min(10, "Mobile number is required"), // Basic length check
  // Add avatarUrl validation if handling file uploads here (more complex)
  // avatarUrl: z.string().url("Invalid avatar URL").optional().nullable(),
});

export type UpdateProfileState = {
  message: string;
  success: boolean;
  errors?: z.ZodIssue[];
};

/**
 * Server Action to update user profile information (name, mobile, avatar).
 * @param uid - The UID of the user to update.
 * @param formData - Form data containing 'name' and 'mobile'.
 * @returns State object indicating success or failure.
 */
export async function updateUserProfile(
    uid: string,
    formData: FormData
): Promise<UpdateProfileState> {
    if (!uid) {
        return { success: false, message: "User ID is missing." };
    }

    // --- Handle Avatar Upload (Separate Logic Recommended) ---
    // If formData contains an avatar file, upload it first, get the URL.
    // For now, we'll assume avatarUrl is passed directly if updated.
    // const avatarFile = formData.get('avatarFile') as File | null;
    // let newAvatarUrl = formData.get('avatarUrl') as string | null; // Get potentially existing URL
    // if (avatarFile) {
    //     // Perform upload logic here...
    //     // newAvatarUrl = await uploadFileAndGetURL(avatarFile);
    // }
    // --- End Avatar Upload Placeholder ---

    const validatedFields = UpdateProfileSchema.safeParse({
        name: formData.get('name'),
        mobile: formData.get('mobile'),
        // avatarUrl: newAvatarUrl, // Include if handling avatar
    });

    if (!validatedFields.success) {
         console.log("[UpdateProfile Action] Validation Errors:", validatedFields.error.flatten().fieldErrors);
        return {
            success: false,
            message: "Validation failed. Please check your input.",
            errors: validatedFields.error.issues,
        };
    }

    const { name, mobile } = validatedFields.data;
    // const { name, mobile, avatarUrl } = validatedFields.data; // If handling avatar

    try {
        const db = await getDbConnection();
        // Update query might include avatarUrl if handled
        const sql = `UPDATE users SET name = ?, mobile = ? WHERE uid = ?`;
        const params = [name, mobile, uid];
        // If handling avatar:
        // const sql = `UPDATE users SET name = ?, mobile = ?, avatarUrl = ? WHERE uid = ?`;
        // const params = [name, mobile, avatarUrl, uid];

        const result = await db.run(sql, params);

        if (result.changes === 0) {
            return { success: false, message: "User not found or profile not changed." };
        }

        // Revalidate paths AFTER successful update
        revalidatePath('/dashboard/user/settings'); // Revalidate settings page
        revalidatePath('/', 'layout'); // Revalidate layout for navbar update

        return { success: true, message: "Profile updated successfully." };

    } catch (error: any) {
        console.error("Error updating profile in SQLite:", error);
        return { success: false, message: `Database Error: ${error.message || 'Failed to update profile.'}` };
    }
}

// ----- Role Upgrade Request -----

// Type for raw data from DB before timestamp serialization adjustment
type RawRoleRequest = Omit<RoleRequest, 'requestTimestamp' | 'actionTimestamp'> & {
    requestTimestamp: string | Date;
    actionTimestamp?: string | Date | null;
};

/**
 * Server Action for a 'user' to request an upgrade to the 'owner' role.
 * @param userId - The UID of the user making the request.
 * @param userName - The name of the user.
 * @param userEmail - The email of the user.
 * @param message - Optional message from the user (currently not stored).
 * @returns State object indicating success or failure.
 */
export async function requestOwnerRoleUpgrade(
    userId: string,
    userName: string,
    userEmail: string,
    message?: string // Accept optional message
): Promise<{ success: boolean; message: string }> {
    if (!userId || !userName || !userEmail) {
        return { success: false, message: "User information is incomplete." };
    }

    console.log(`[Role Request Action] User ${userId} (${userName}) requested owner role. Message: ${message || 'None'}`);

    let db;
    try {
        db = await getDbConnection();

        // 1. Check if the user is actually a 'user'
        const currentUser = await db.get<{ role: string, status: string } | undefined>(
            'SELECT role, status FROM users WHERE uid = ?', userId
        );

        if (!currentUser) {
             return { success: false, message: "User profile not found." };
        }
         if (currentUser.status !== 'active') {
             return { success: false, message: `Cannot request upgrade. Account status is: ${currentUser.status}.` };
        }
        if (currentUser.role !== 'user') {
            return { success: false, message: `Role upgrade only available for 'user' role (current: ${currentUser.role}).` };
        }


        // 2. Check for existing pending or approved requests for this user
        const existingRequest = await db.get<RawRoleRequest>(
             `SELECT id, status FROM roleRequests WHERE userId = ?`, userId // Check any status for this user
        );

        // If request exists and is pending or approved, prevent new request
        if (existingRequest?.status === 'pending') {
             return { success: false, message: "You already have a role upgrade request pending review." };
        }
         if (existingRequest?.status === 'approved') {
             // This case indicates an inconsistency if the user's role is still 'user'
             console.warn(`[Role Request Action] Found approved request for user ${userId} but their role is still 'user'.`);
             // Consider automatically updating the user's role here or logging for admin attention
             // For now, prevent new request but inform user.
             return { success: false, message: "Your role upgrade request was previously approved. If your role hasn't updated, please contact support." };
        }

        // 3. Insert the new request (or update if previously rejected)
        // Using INSERT OR REPLACE based on userId UNIQUE constraint in roleRequests table
         await db.exec('BEGIN TRANSACTION'); // Start transaction
        const sql = `
            INSERT OR REPLACE INTO roleRequests (userId, userName, userEmail, requestedRole, status, requestTimestamp, actionTimestamp, adminNotes)
            VALUES (?, ?, ?, ?, ?, datetime('now'), NULL, NULL) -- Reset actionTimestamp and adminNotes on new request
        `;
        const result = await db.run(sql, [userId, userName, userEmail, 'owner', 'pending']);
        const requestId = result.lastID; // Get the ID of the inserted/replaced request

        // --- Revalidation BEFORE notification ---
        revalidatePath('/dashboard/user/settings'); // Revalidate settings page to show status
        revalidatePath('/dashboard/user/messages'); // Revalidate user messages page
        revalidatePath('/'); // Revalidate homepage if the "Become Owner" button state needs update
        revalidatePath('/dashboard/admin/role-requests'); // Revalidate admin page

        // --- Add Notification for User (Request Submitted) ---
        try {
            const notificationTitle = "Owner Role Request Submitted";
            const notificationMessage = "Your request to become a Property Owner has been submitted and is pending review by an administrator.";
            // Ensure correct notification type is used
            await addNotification(userId, 'role_request_status', notificationTitle, notificationMessage, requestId);
             console.log(`[requestOwnerRoleUpgrade Action] Notification sent to user ${userId} for submitted request ID: ${requestId}.`);
       } catch (notificationError) {
            console.error(`[requestOwnerRoleUpgrade Action] Failed to send request submission notification to user ${userId}:`, notificationError);
            // Don't fail the entire action, just log the error
       }
       // --- End Notification ---

        await db.exec('COMMIT'); // Commit transaction


        return { success: true, message: "Owner role request submitted successfully. It will be reviewed by an administrator." };

    } catch (error: any) {
        console.error("Error submitting role request to SQLite:", error);
         // Check if it's a constraint violation (though INSERT OR REPLACE should handle UNIQUE)
         if (db) {
            try { await db.exec('ROLLBACK'); } catch (rbError) { console.error("Rollback failed:", rbError); }
         }
         if (error.code?.includes('SQLITE_CONSTRAINT')) {
            // This might happen if there's another constraint issue
            console.error("[Role Request Action] Constraint violation:", error.message);
            return { success: false, message: "Could not submit request due to a database constraint." };
        }
        return { success: false, message: `Database Error: ${error.message || 'Failed to submit request.'}` };
    }
}

/**
 * Server Action to check for an existing role request for a given user.
 * Ensures timestamps are serialized.
 * @param userId - The UID of the user.
 * @returns The latest RoleRequest object for the user (any status), or null if none exists or on error.
 */
export async function checkExistingRoleRequest(userId: string): Promise<RoleRequest | null> {
     if (!userId) return null;
     try {
        const db = await getDbConnection();
        // Fetch the single request for the user (due to UNIQUE constraint)
        const sql = `SELECT * FROM roleRequests WHERE userId = ? LIMIT 1`;
        const latestRequest = await db.get<RawRoleRequest>(sql, userId);

        if (!latestRequest) return null;

        // Serialize timestamps
        return {
            ...latestRequest,
            requestTimestamp: latestRequest.requestTimestamp instanceof Date ? latestRequest.requestTimestamp.toISOString() : String(latestRequest.requestTimestamp),
            actionTimestamp: latestRequest.actionTimestamp instanceof Date ? latestRequest.actionTimestamp.toISOString() : (latestRequest.actionTimestamp ? String(latestRequest.actionTimestamp) : null),
        };
    } catch (error) {
        console.error("Error checking role requests from SQLite:", error);
        return null;
    }
}


// ----- User Notifications -----

// Type for raw notification data from DB
type RawNotification = Omit<Notification, 'createdAt'> & {
    createdAt: string | Date;
};

/**
 * Server Action to fetch notifications for a specific user.
 * Serializes timestamps before returning.
 * @param userId - The UID of the user.
 * @param statusFilter - Optional filter ('all', 'read', 'unread'). Defaults to 'all'.
 * @returns An array of Notification objects or null on error.
 */
export async function getUserNotifications(
    userId: string,
    statusFilter: 'all' | Notification['status'] = 'all'
): Promise<Notification[] | null> {
    if (!userId) {
        console.error("[getUserNotifications Action] Missing User ID.");
        return null;
    }
    try {
        const db = await getDbConnection();
        let sql = `SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC`;
        let params: any[] = [userId];

        if (statusFilter !== 'all') {
            sql = `SELECT * FROM notifications WHERE userId = ? AND status = ? ORDER BY createdAt DESC`;
            params = [userId, statusFilter];
        }

        const rawNotifications = await db.all<RawNotification[]>(sql, params);

        // Serialize dates
        const serializedNotifications = rawNotifications.map(n => ({
            ...n,
            createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : String(n.createdAt),
             // Ensure relatedId is explicitly handled for null/undefined
             relatedId: n.relatedId ?? null,
        }));

        return serializedNotifications;
    } catch (error) {
        console.error("[getUserNotifications Action] Error fetching notifications:", error);
        return null;
    }
}

/**
 * Server Action to mark a specific notification as read.
 * @param notificationId - The ID of the notification to mark as read.
 * @param userId - The UID of the user owning the notification (for security).
 * @returns Object indicating success or failure.
 */
export async function markNotificationAsRead(
    notificationId: number | string,
    userId: string
): Promise<{ success: boolean; message: string }> {
     if (!userId || notificationId === null || notificationId === undefined) { // Check for valid notificationId
        return { success: false, message: "Missing required information." };
    }
     try {
        const db = await getDbConnection();
        // Ensure the notification belongs to the user before updating
        const sql = `UPDATE notifications SET status = 'read' WHERE id = ? AND userId = ? AND status = 'unread'`; // Only update if unread
        const result = await db.run(sql, [notificationId, userId]);

        if (result.changes === 0) {
             console.warn(`[markNotificationAsRead Action] No change for notification ${notificationId} for user ${userId}. Already read or not found.`);
            // Return success=true even if already read, as the goal is achieved
            return { success: true, message: 'Notification already read or not found.' };
        }
         console.log(`[markNotificationAsRead Action] Marked notification ${notificationId} as read for user ${userId}.`);

        // Revalidate paths AFTER successful update
        revalidatePath('/dashboard/user/messages'); // Revalidate the user messages/notifications page
        revalidatePath('/', 'layout'); // Revalidate layout for potential notification count updates

        return { success: true, message: 'Notification marked as read.' };
     } catch (error: any) {
        console.error("[markNotificationAsRead Action] Error:", error);
        return { success: false, message: `Database Error: ${error.message || 'Failed to update notification.'}` };
     }
}


// --- Helper function to add notification (can be called from other actions) ---
/**
 * Adds a notification for a user in the database.
 * Internal helper function. Ensures revalidation occurs AFTER DB insert.
 * @param userId - The UID of the user to notify.
 * @param type - The type of notification (e.g., 'booking_status', 'role_request_status').
 * @param title - The title of the notification.
 * @param message - The notification message content.
 * @param relatedId - Optional related ID (e.g., booking ID, request ID).
 */
export async function addNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    relatedId?: string | number | null
): Promise<void> {
     if (!userId || !type || !title || !message) {
         console.error("[addNotification Helper] Missing required notification details.");
         return; // Exit early if data is incomplete
     }
     try {
         const db = await getDbConnection();
         const sql = `INSERT INTO notifications (userId, type, title, message, relatedId, status, createdAt) VALUES (?, ?, ?, ?, ?, 'unread', datetime('now'))`;
         const result = await db.run(
             sql,
             [userId, type, title, message, relatedId ?? null] // Pass null explicitly if relatedId is undefined/null
         );

         if (result.lastID) {
             console.log(`[addNotification Helper] Notification added for user ${userId}. Type: ${type}, ID: ${result.lastID}`);
             // Revalidate the user messages page *after* successfully adding the notification
             revalidatePath('/dashboard/user/messages');
             revalidatePath('/', 'layout'); // Revalidate layout for notification count
         } else {
             console.warn(`[addNotification Helper] Notification insert for user ${userId} did not return a lastID.`);
         }

     } catch (error) {
         console.error(`[addNotification Helper] Failed to add notification for user ${userId} (Type: ${type}):`, error);
         // Log the error but don't throw, as this is often a secondary effect
     }
}

// ----- User Contact Messages -----

// Type for raw data from DB before timestamp serialization adjustment
type RawUserContactMessage = Omit<ContactMessage, 'timestamp' | 'reply_timestamp'> & {
    timestamp: string | Date;
    reply_timestamp?: string | Date | null;
};

/**
 * Server Action to fetch contact messages submitted by a specific user.
 * Includes admin replies if available.
 * Ensures timestamps are serialized.
 * @param userId - The UID of the user.
 * @returns An array of ContactMessage objects or null on error.
 */
export async function getUserContactMessages(userId: string): Promise<ContactMessage[] | null> {
    if (!userId) {
        console.error("[getUserContactMessages Action] Missing User ID.");
        return null;
    }
    try {
        const db = await getDbConnection();
        // Fetch messages linked to the specific userId
        const sql = `SELECT * FROM contactMessages WHERE userId = ? ORDER BY timestamp DESC`;
        const rawMsgs = await db.all<RawUserContactMessage[]>(sql, [userId]);

        // Serialize dates and structure data
        const serializedMsgs = rawMsgs.map(msg => ({
            ...msg,
            reply_text: msg.reply_text ?? null,
            has_admin_reply: msg.has_admin_reply === 1, // Convert integer to boolean
            timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : String(msg.timestamp),
            reply_timestamp: msg.reply_timestamp instanceof Date ? msg.reply_timestamp.toISOString() : (msg.reply_timestamp ? String(msg.reply_timestamp) : null)
        } as ContactMessage)); // Assert the final type

        return serializedMsgs;
    } catch (error) {
        console.error("[getUserContactMessages Action] Error fetching user messages:", error);
        return null; // Return null on error
    }
}

// ----- User Bookings Summary -----

interface UserBookingsSummary {
    total: number;
    upcoming: number;
    pending: number;
}

/**
 * Server Action to fetch summary counts of bookings for a specific user.
 * @param userId - The UID of the user.
 * @returns Booking summary counts or null on error.
 */
export async function getUserBookingsSummary(userId: string): Promise<UserBookingsSummary | null> {
    if (!userId) {
        console.error("[getUserBookingsSummary Action] Missing User ID.");
        return null;
    }
    try {
        const db = await getDbConnection();
        // Use COUNT with conditional SUM (or FILTER in newer SQLite) for efficiency
        const summary = await db.get<{ total: number, upcoming: number, pending: number }>(`
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'approved' AND date(startDate) >= date('now') THEN 1 ELSE 0 END) AS upcoming,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending
            FROM bookings
            WHERE userId = ?
        `, userId);

        if (summary) {
            return {
                total: summary.total ?? 0,
                upcoming: summary.upcoming ?? 0,
                pending: summary.pending ?? 0,
            };
        } else {
            // Return zero counts if the query somehow returns null (e.g., no bookings)
            return { total: 0, upcoming: 0, pending: 0 };
        }
    } catch (error) {
        console.error("[getUserBookingsSummary Action] Error fetching booking summary:", error);
        return null; // Return null on error
    }
}
