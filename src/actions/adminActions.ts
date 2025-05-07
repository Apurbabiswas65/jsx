// src/actions/adminActions.ts
'use server';

import { z } from 'zod';
import { getDbConnection, verifyDatabaseSchema } from '@/lib/db'; // Added verifyDatabaseSchema import
import { revalidatePath } from 'next/cache';
import type { ContactMessage } from '@/types/message'; // Import message type
import type { RoleRequest } from '@/types/roleRequest'; // Import role request type
import type { UserProfileData } from '@/types/user'; // Import user profile type
import type { PlatformSettings } from '@/types/settings'; // Import PlatformSettings type
import { DEFAULT_LOGO_URL } from '@/lib/constants'; // Import default logo URL
import { addNotification } from '@/actions/userActions'; // Import the notification helper
import type { Property } from '@/types/property'; // Import Property type
import type { Booking } from '@/types/booking'; // Import Booking type

// Define AdminProperty type locally if needed for joins
interface AdminProperty extends Property {
    ownerName?: string; // Add owner name for display
    ownerId?: string;
}


// ----- Admin Dashboard Stats -----
export async function getAdminDashboardStats(): Promise<{
    totalUsers: number;
    totalProperties: number;
    pendingProperties: number;
    pendingRoleRequests: number;
    totalBookings: number;
    unseenMessages: number;
}> {
    try {
        const db = await getDbConnection();
        const [
            userCount,
            propertyCounts,
            pendingRoleRequestCount,
            bookingCount,
            unseenMessageCount
        ] = await Promise.all([
            db.get<{ count: number }>('SELECT COUNT(*) as count FROM users'),
            db.get<{ total: number; pending: number }>(
                'SELECT COUNT(*) as total, SUM(CASE WHEN status = "pending" THEN 1 ELSE 0 END) as pending FROM properties'
            ),
            db.get<{ count: number }>("SELECT COUNT(*) as count FROM roleRequests WHERE status = 'pending'"),
            db.get<{ count: number }>('SELECT COUNT(*) as count FROM bookings'),
            db.get<{ count: number }>("SELECT COUNT(*) as count FROM contactMessages WHERE status = 'unseen'")
        ]);

        return {
            totalUsers: userCount?.count ?? 0,
            totalProperties: propertyCounts?.total ?? 0,
            pendingProperties: propertyCounts?.pending ?? 0,
            pendingRoleRequests: pendingRoleRequestCount?.count ?? 0,
            totalBookings: bookingCount?.count ?? 0,
            unseenMessages: unseenMessageCount?.count ?? 0,
        };
    } catch (error) {
        console.error("[getAdminDashboardStats Action] Error fetching stats:", error);
        // Return zero values on error to prevent breaking the UI
        return {
            totalUsers: 0,
            totalProperties: 0,
            pendingProperties: 0,
            pendingRoleRequests: 0,
            totalBookings: 0,
            unseenMessages: 0,
        };
    }
}


// ----- Role Update -----

// Define the schema for role update input
const UpdateRoleSchema = z.object({
    userId: z.string().min(1, "User ID cannot be empty."), // Use min(1) instead of uuid if UIDs are not strictly UUIDs
    newRole: z.enum(['user', 'owner'], { errorMap: () => ({ message: "Invalid role specified." }) })
});


export type UpdateRoleState = {
    message: string;
    success: boolean;
    errors?: z.ZodIssue[];
};

/**
 * Server Action to update a user's role (by Admin).
 * @param userId - The UID of the user to update.
 * @param newRole - The new role ('user' or 'owner').
 * @returns The result state.
 */
export async function updateUserRole(
    userId: string,
    newRole: 'user' | 'owner'
): Promise<UpdateRoleState> {
    // Validate input using the schema
    const validatedInput = UpdateRoleSchema.safeParse({ userId, newRole });

    if (!validatedInput.success) {
        console.error("[UpdateRole Action] Validation Errors:", validatedInput.error.flatten().fieldErrors);
        return {
            message: 'Invalid input provided.',
            success: false,
            errors: validatedInput.error.issues,
        };
    }

    const { userId: validatedUserId, newRole: validatedNewRole } = validatedInput.data;

    // Prevent changing role of admins or to admin directly
    if (validatedNewRole === 'admin') {
        console.warn("[UpdateRole Action] Attempted to change role to 'admin'. This is not allowed.");
        return { message: 'Changing role to Admin is not permitted via this action.', success: false };
    }

    let db;
    try {
        db = await getDbConnection();

        // Optional: Check if the target user is an admin first
        const currentUser = await db.get<Pick<UserProfileData, 'role'>>('SELECT role FROM users WHERE uid = ?', validatedUserId);
        if (!currentUser) {
            return { message: 'User not found.', success: false };
        }
        if (currentUser.role === 'admin') {
             console.warn("[UpdateRole Action] Attempted to change role of an 'admin'. This is not allowed.");
            return { message: 'Cannot change the role of an Admin user.', success: false };
        }


        // Update the user's role in the database
        console.log(`[UpdateRole Action] Attempting to update role for user ${validatedUserId} to ${validatedNewRole}`);
        const result = await db.run('UPDATE users SET role = ? WHERE uid = ?', [validatedNewRole, validatedUserId]);

        if (result.changes === 0) {
            console.warn(`[UpdateRole Action] User ${validatedUserId} not found or role already set to ${validatedNewRole}.`);
            // Consider if this should be an error or just a warning/success=false
            return { message: 'User not found or role was not changed.', success: false };
        }

        console.log(`[UpdateRole Action] Successfully updated role for user ${validatedUserId} to ${validatedNewRole}.`);

        // Revalidate paths AFTER successful update and BEFORE notification
        revalidatePath('/dashboard/admin/users');
        revalidatePath('/dashboard/user/settings'); // Revalidate user's own settings view potentially
        revalidatePath('/', 'layout'); // Revalidate layout for potential role changes affecting nav/access

        // --- Add Notification for User ---
        try {
             const notificationTitle = "User Role Updated";
             const notificationMessage = `An administrator has updated your role to '${validatedNewRole}'.`;
             // Use the imported helper function - Use correct type 'role_change'
             await addNotification(validatedUserId, 'role_change', notificationTitle, notificationMessage);
             console.log(`[UpdateRole Action] Notification sent to user ${validatedUserId}`);
        } catch (notificationError) {
             console.error(`[UpdateRole Action] Failed to send role update notification to user ${validatedUserId}:`, notificationError);
             // Don't fail the entire action, just log the error
        }
        // --- End Notification ---

        return { message: 'User role updated successfully!', success: true };

    } catch (error: any) {
        console.error("[UpdateRole Action] Database Error:", error);
        // Handle specific DB errors if needed
        if (error.code?.includes('SQLITE_CONSTRAINT')) {
             return { message: 'Database constraint violation.', success: false };
        }
        return { message: `Database Error: ${error.message || 'Failed to update user role.'}`, success: false };
    } finally {
        // Connection is managed elsewhere
    }
}


// ----- Fetch Contact Messages -----

// Type for raw data fetched from DB before serialization adjustment
type RawContactMessage = Omit<ContactMessage, 'timestamp' | 'reply_timestamp'> & {
    timestamp: string | Date; // DB might return string or Date depending on driver/config
    reply_timestamp?: string | Date | null; // Expect string, Date or null
};

/**
 * Server Action to fetch all contact messages from the database for the admin.
 * Ensures timestamps are serialized.
 * @returns An array of ContactMessage objects or null on error.
 */
export async function getAdminContactMessages(): Promise<ContactMessage[] | null> {
    try {
        const db = await getDbConnection();
        // Fetch raw data
        const sql = `SELECT * FROM contactMessages ORDER BY timestamp DESC`;
        const rawMsgs = await db.all<RawContactMessage[]>(sql);

        // Serialize dates
        const serializedMsgs = rawMsgs.map(msg => ({
            ...msg,
            // Ensure reply_text is handled for null/undefined
            reply_text: msg.reply_text ?? null,
            has_admin_reply: msg.has_admin_reply === 1, // Convert integer to boolean
            timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : String(msg.timestamp),
             reply_timestamp: msg.reply_timestamp instanceof Date ? msg.reply_timestamp.toISOString() : (msg.reply_timestamp ? String(msg.reply_timestamp) : null)
        } as ContactMessage)); // Assert the final type

        return serializedMsgs;
    } catch (error) {
        console.error("[getAdminContactMessages Action] Error fetching messages:", error);
        return null; // Return null on error
    }
}

// Action to mark a message as seen
export async function markMessageAsSeen(messageId: number | string): Promise<{ success: boolean; message: string }> {
     try {
        const db = await getDbConnection();
        const sql = `UPDATE contactMessages SET status = 'seen' WHERE id = ?`;
        const result = await db.run(sql, messageId);

        if (result.changes === 0) {
             return { success: false, message: 'Message not found or already seen.' };
        }
         revalidatePath('/dashboard/admin/messages'); // Revalidate the path to refresh data
        return { success: true, message: 'Message marked as seen.' };
     } catch (error) {
        console.error("[markMessageAsSeen Action] Error updating status:", error);
        return { success: false, message: 'Database error.' };
     }
}

// Action to delete a message
export async function deleteContactMessage(messageId: number | string): Promise<{ success: boolean; message: string }> {
     try {
        const db = await getDbConnection();
        const sql = `DELETE FROM contactMessages WHERE id = ?`;
        const result = await db.run(sql, messageId);

        if (result.changes === 0) {
             return { success: false, message: 'Message not found.' };
        }
        revalidatePath('/dashboard/admin/messages'); // Revalidate the path to refresh data
        return { success: true, message: 'Message deleted.' };
     } catch (error) {
        console.error("[deleteContactMessage Action] Error deleting message:", error);
        return { success: false, message: 'Database error.' };
     }
}

// ----- Send Admin Reply to Contact Message -----

const ReplySchema = z.object({
    messageId: z.union([z.number().int().positive(), z.string()]).refine(val => val != null, "Message ID is required."),
    replyText: z.string().min(1, "Reply message cannot be empty."),
    userId: z.string().optional(), // The original sender's user ID (if they were logged in)
});

export type SendReplyState = {
    success: boolean;
    message: string;
    errors?: z.ZodIssue[];
};

/**
 * Server Action for an admin to send a reply to a contact message.
 * Saves the reply to the database and notifies the user if possible.
 * @param messageId - ID of the message being replied to.
 * @param replyText - The content of the admin's reply.
 * @param userId - Optional UID of the user who sent the original message.
 * @returns Object indicating success or failure.
 */
export async function sendAdminReply(
    messageId: number | string,
    replyText: string,
    userId?: string | null // Pass userId if known
): Promise<SendReplyState> {
    const validation = ReplySchema.safeParse({ messageId, replyText, userId: userId ?? undefined });
    if (!validation.success) {
         console.error("[SendReply Action] Validation Errors:", validation.error.flatten().fieldErrors);
        return {
            success: false,
            message: "Invalid input for reply.",
            errors: validation.error.issues,
        };
    }

    const { messageId: validMessageId, replyText: validReplyText, userId: validUserId } = validation.data;

    try {
        const db = await getDbConnection();
        // Update the contact message record with the reply
        const sql = `
            UPDATE contactMessages
            SET reply_text = ?, reply_timestamp = datetime('now'), has_admin_reply = 1, status = 'seen'
            WHERE id = ?
        `;
        const result = await db.run(sql, [validReplyText, validMessageId]);

        if (result.changes === 0) {
            return { success: false, message: "Message not found or could not be updated." };
        }

        console.log(`[SendReply Action] Reply saved for message ID: ${validMessageId}.`);

        // Revalidate paths AFTER successful DB update and BEFORE notification
        revalidatePath('/dashboard/admin/messages');
        if (validUserId) {
            revalidatePath('/dashboard/user/messages'); // Revalidate user's message page too
        }

        // --- Add Notification for User (if userId is available) ---
        if (validUserId) {
            try {
                const notificationTitle = "Admin replied to your message";
                // Keep notification message concise, user clicks to see full reply
                const notificationMessage = `An administrator has replied to your message regarding the subject.`;
                // Use correct notification type 'contact_reply' and related ID
                await addNotification(validUserId, 'contact_reply', notificationTitle, notificationMessage, validMessageId);
                console.log(`[SendReply Action] Notification sent to user ${validUserId} for reply to message ${validMessageId}`);
            } catch (notificationError) {
                console.error(`[SendReply Action] Failed to send reply notification to user ${validUserId}:`, notificationError);
                // Don't fail the action, just log
            }
        } else {
            console.log(`[SendReply Action] No userId associated with message ${validMessageId}, notification skipped.`);
        }
        // --- End Notification ---

        return { success: true, message: "Reply sent and saved successfully." };

    } catch (error: any) {
        console.error("[SendReply Action] Database Error:", error);
        return { success: false, message: `Database Error: ${error.message || 'Failed to send reply.'}` };
    }
}


// ----- Fetch Role Requests -----

// Type for raw data from DB before timestamp serialization adjustment
type RawRoleRequest = Omit<RoleRequest, 'requestTimestamp' | 'actionTimestamp'> & {
    requestTimestamp: string | Date; // Expect string or Date from SQLite DATETIME
    actionTimestamp?: string | Date | null; // Expect string, Date or null
    userName?: string; // Include potentially null fields from JOIN
    userEmail?: string;
};


/**
 * Server Action to fetch role upgrade requests.
 * Ensures timestamps are serialized.
 * @param statusFilter - Optional filter for status ('pending', 'approved', 'rejected', 'all'). Defaults to 'all'.
 * @returns An array of RoleRequest objects or null on error.
 */
export async function getAdminRoleRequests(
    statusFilter: 'all' | RoleRequest['status'] = 'all'
): Promise<RoleRequest[] | null> {
    try {
        const db = await getDbConnection();
        // Select all fields from roleRequests and needed fields from users
        let sql = `SELECT rr.*, u.name as userName, u.email as userEmail
                   FROM roleRequests rr
                   LEFT JOIN users u ON rr.userId = u.uid`; // Use LEFT JOIN to ensure requests are shown even if user is deleted somehow
        let params: any[] = [];

        if (statusFilter !== 'all') {
            sql += ` WHERE rr.status = ?`;
            params = [statusFilter];
        }
        sql += ` ORDER BY rr.requestTimestamp DESC`;

        const rawReqs = await db.all<RawRoleRequest[]>(sql, params); // Fetch raw data

        // Serialize dates and ensure required fields are present
        const serializedReqs = rawReqs.map(req => ({
            ...req,
            // Provide defaults for potentially missing user info if user was deleted
            userName: req.userName || 'User Deleted',
            userEmail: req.userEmail || 'N/A',
            requestTimestamp: req.requestTimestamp instanceof Date ? req.requestTimestamp.toISOString() : String(req.requestTimestamp),
            actionTimestamp: req.actionTimestamp instanceof Date ? req.actionTimestamp.toISOString() : (req.actionTimestamp ? String(req.actionTimestamp) : null)
        } as RoleRequest)); // Assert the final type

        return serializedReqs;
    } catch (error) {
        console.error("[getAdminRoleRequests Action] Error fetching role requests:", error);
        return null; // Return null on error
    }
}


// Action to approve a role request
export async function approveRoleRequest(requestId: number, userId: string, adminNotes?: string): Promise<{ success: boolean; message: string }> {
    let db;
    try {
        db = await getDbConnection();
        // Use a transaction to ensure atomicity
        await db.exec('BEGIN TRANSACTION');

        // 1. Update the role request status
        const updateRequestSql = `
            UPDATE roleRequests
            SET status = 'approved', actionTimestamp = datetime('now'), adminNotes = ?
            WHERE id = ? AND status = 'pending'
        `;
        const requestResult = await db.run(updateRequestSql, [adminNotes || 'Approved', requestId]);

        if (requestResult.changes === 0) {
            await db.exec('ROLLBACK');
            return { success: false, message: 'Request not found or already processed.' };
        }

        // 2. Update the user's role in the 'users' table
        const updateUserSql = `UPDATE users SET role = 'owner', status = 'active' WHERE uid = ?`;
        const userResult = await db.run(updateUserSql, [userId]);

         if (userResult.changes === 0) {
            await db.exec('ROLLBACK');
            // This case is less likely if the FK constraint is working, but good to handle
            console.warn(`[approveRoleRequest Action] User ${userId} not found for role update after request approval.`);
            return { success: false, message: 'User not found for role update.' };
        }

        await db.exec('COMMIT'); // Commit transaction

        // Revalidate paths AFTER successful commit
        revalidatePath('/dashboard/admin/role-requests');
        revalidatePath('/dashboard/admin/users'); // Also revalidate users page
        revalidatePath('/dashboard/user/messages'); // Revalidate user messages page
        revalidatePath('/dashboard/user/settings'); // Revalidate user settings page
        revalidatePath('/', 'layout'); // Revalidate layout for role changes

        // --- Add Notification for User (AFTER successful commit and revalidation) ---
        try {
             const notificationTitle = "Owner Role Request Approved";
             const notificationMessage = "Congratulations! Your request to become a Property Owner has been approved. You can now access the Owner Dashboard and list properties.";
             // Use the correct notification type 'role_request_status' and pass the request ID
             await addNotification(userId, 'role_request_status', notificationTitle, notificationMessage, requestId);
             console.log(`[approveRoleRequest Action] Notification sent to user ${userId}`);
        } catch (notificationError) {
             console.error(`[approveRoleRequest Action] Failed to send approval notification to user ${userId}:`, notificationError);
             // Don't fail the entire action, just log the error
        }
        // --- End Notification ---

        return { success: true, message: 'Role request approved and user updated.' };

    } catch (error: any) {
        console.error("[approveRoleRequest Action] Error:", error);
        if (db) {
             try { await db.exec('ROLLBACK'); } catch (rbError) { console.error("Rollback failed:", rbError); }
        }
        return { success: false, message: `Database Error: ${error.message || 'Approval failed.'}` };
    }
}

// Action to reject a role request
export async function rejectRoleRequest(requestId: number, userId: string, adminNotes: string): Promise<{ success: boolean; message: string }> {
    if (!adminNotes) {
        return { success: false, message: "Reason for rejection is required." };
    }
    let db;
    try {
        db = await getDbConnection();
        // Use a transaction for atomicity (optional here, but good practice)
        await db.exec('BEGIN TRANSACTION');

        const sql = `
            UPDATE roleRequests
            SET status = 'rejected', actionTimestamp = datetime('now'), adminNotes = ?
            WHERE id = ? AND status = 'pending'
        `;
        const result = await db.run(sql, [adminNotes, requestId]);

         if (result.changes === 0) {
            await db.exec('ROLLBACK');
            return { success: false, message: 'Request not found or already processed.' };
        }

        await db.exec('COMMIT'); // Commit transaction

        // Revalidate paths AFTER successful commit
        revalidatePath('/dashboard/admin/role-requests');
        revalidatePath('/dashboard/user/messages'); // Revalidate user messages page
        revalidatePath('/dashboard/user/settings'); // Revalidate user settings page

        // --- Add Notification for User (AFTER successful commit and revalidation) ---
        try {
             const notificationTitle = "Owner Role Request Rejected";
             const notificationMessage = `Your request to become a Property Owner has been rejected. Reason: ${adminNotes}`;
             // Use the correct notification type 'role_request_status' and pass the request ID
             await addNotification(userId, 'role_request_status', notificationTitle, notificationMessage, requestId);
             console.log(`[rejectRoleRequest Action] Notification sent to user ${userId}`);
        } catch (notificationError) {
             console.error(`[rejectRoleRequest Action] Failed to send rejection notification to user ${userId}:`, notificationError);
             // Don't fail the entire action, just log the error
        }
        // --- End Notification ---

        return { success: true, message: 'Role request rejected.' };

    } catch (error: any) {
        console.error("[rejectRoleRequest Action] Error:", error);
         if (db) {
            try { await db.exec('ROLLBACK'); } catch (rbError) { console.error("Rollback failed:", rbError); }
         }
        return { success: false, message: `Database Error: ${error.message || 'Rejection failed.'}` };
    }
}


// ----- Platform Settings -----

/**
 * Fetches all platform settings from the database.
 * Returns defaults if the database query fails.
 * @returns PlatformSettings object.
 */
export async function getPlatformSettings(): Promise<PlatformSettings> {
    const defaultSettings: PlatformSettings = {
        platformName: "OwnBroker Simplified",
        logoUrl: DEFAULT_LOGO_URL,
        maintenanceMode: false,
        allowNewRegistrations: true,
        defaultBookingFee: 5.0,
        adminEmail: "admin@ownbroker.com",
        termsAndConditions: "Please refer to the /terms page...",
    };

    try {
        const db = await getDbConnection();
        const rows = await db.all<{ key: string, value: string }[]>(`SELECT key, value FROM platformSettings`);

        if (!rows || rows.length === 0) {
             console.warn('[getPlatformSettings] No settings found in DB, returning defaults.');
             return defaultSettings;
        }

        // Convert rows to a PlatformSettings object
        const settings: Partial<PlatformSettings> = {};
        rows.forEach(row => {
            const key = row.key as keyof PlatformSettings;
            let value: any = row.value;

            // Convert specific string values back to their correct types
            if (key === 'maintenanceMode' || key === 'allowNewRegistrations') {
                value = value === 'true';
            } else if (key === 'defaultBookingFee') {
                value = parseFloat(value);
            }
             // Assign if key exists in PlatformSettings type (basic type safety)
             if (key in defaultSettings) {
                 (settings as any)[key] = value;
            }
        });

        // Merge fetched settings with defaults to ensure all keys are present
        const finalSettings = { ...defaultSettings, ...settings };
        console.log('[getPlatformSettings] Fetched settings:', finalSettings);
        return finalSettings;

    } catch (error) {
        console.error("[getPlatformSettings Action] Error fetching settings:", error);
        return defaultSettings; // Return defaults on error
    }
}

/**
 * Server Action to update multiple platform settings.
 * @param settingsToUpdate - An object containing the settings to update.
 * @returns State object indicating success or failure.
 */
export async function updatePlatformSettings(
    settingsToUpdate: Partial<PlatformSettings>
): Promise<{ success: boolean; message: string }> {
    if (Object.keys(settingsToUpdate).length === 0) {
        return { success: false, message: 'No settings provided to update.' };
    }

    let db;
    try {
        db = await getDbConnection();
        await db.exec('BEGIN TRANSACTION'); // Use transaction for atomic updates

        const stmt = await db.prepare(`UPDATE platformSettings SET value = ? WHERE key = ?`);

        let changes = 0;
        for (const [key, value] of Object.entries(settingsToUpdate)) {
             if (value === undefined) continue; // Skip undefined values

             // Convert boolean/number values to string for storage
             let valueToStore = String(value);
            if (typeof value === 'boolean') {
                valueToStore = value ? 'true' : 'false';
            } else if (typeof value === 'number') {
                valueToStore = value.toString(); // Ensure numbers are stored as strings
            }


             console.log(`[updatePlatformSettings] Updating ${key} to ${valueToStore}`);
             const result = await stmt.run(valueToStore, key);
             if (result.changes !== undefined) {
                // Ensure the key exists in the database first before counting changes
                const checkStmt = await db.get(`SELECT 1 FROM platformSettings WHERE key = ?`, key);
                if (checkStmt) {
                    changes += result.changes;
                } else {
                     console.warn(`[updatePlatformSettings] Key "${key}" does not exist in platformSettings table. Skipping.`);
                }
             } else {
                 // If result.changes is undefined, maybe log a warning
                 console.warn(`[updatePlatformSettings] Update result for key "${key}" did not report changes.`);
             }
        }
        await stmt.finalize(); // Finalize prepared statement
        await db.exec('COMMIT'); // Commit transaction

         console.log(`[updatePlatformSettings] Update complete. Rows affected: ${changes}`);

        // Fetch the potentially updated settings to return the latest state
        const currentSettings = await getPlatformSettings();
        // Update the internal state if necessary or revalidate paths


        if (changes === 0 && Object.keys(settingsToUpdate).length > 0) {
            // Check if any valid keys were actually provided
             const defaultKeys = Object.keys({ // Create an object with the keys of the default type
                  platformName: "",
                  logoUrl: "",
                  maintenanceMode: false,
                  allowNewRegistrations: true,
                  defaultBookingFee: 0,
                  adminEmail: "",
                  termsAndConditions: "",
              });
             const validKeys = Object.keys(settingsToUpdate).filter(key => defaultKeys.includes(key));
             if(validKeys.length > 0) {
                console.warn('[updatePlatformSettings] No settings were actually updated (keys might be invalid or values unchanged).');
                // If valid keys were provided but no changes occurred, it might be because values were the same
                // Return success=true because the desired state (unchanged) was achieved
                return { success: true, message: 'No settings were changed (values might be the same).' };
             } else {
                 return { success: false, message: 'Invalid settings keys provided.' };
             }
        }

        revalidatePath('/dashboard/admin/settings'); // Revalidate the settings page
        revalidatePath('/', 'layout'); // Revalidate layout if platform name/logo changed

        return { success: true, message: 'Platform settings updated successfully.' };

    } catch (error: any) {
        console.error("[updatePlatformSettings Action] Database Error:", error);
        if (db) {
            try { await db.exec('ROLLBACK'); } catch (rbError) { console.error("Rollback failed:", rbError); }
        }
        return { success: false, message: `Database Error: ${error.message || 'Failed to update settings.'}` };
    }
}


// ----- Fetch All Users (for Admin) -----

// Type for raw data fetched from DB before serialization adjustment
type RawAdminUserData = Omit<UserProfileData, 'createdAt'> & {
    createdAt: string | Date; // Expect string or Date from SQLite DATETIME
};

/**
 * Server Action to fetch all user profiles for the admin dashboard.
 * Ensures timestamps are serialized.
 * @returns An array of UserProfileData objects or null on error.
 */
export async function getAdminUsers(): Promise<UserProfileData[] | null> {
    try {
        await verifyDatabaseSchema(); // Verify schema before fetching
        const db = await getDbConnection();
        const sql = `SELECT uid, name, email, mobile, role, status, avatarUrl, createdAt FROM users ORDER BY createdAt DESC`;
        const rawUsers = await db.all<RawAdminUserData[]>(sql);

        // Serialize dates and ensure correct types
        const serializedUsers = rawUsers.map(user => ({
            ...user,
            avatarUrl: user.avatarUrl || null, // Ensure null if missing
            createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : String(user.createdAt),
            // Ensure role and status have valid default values if somehow missing (though DB constraints should prevent this)
            role: user.role || 'user',
            status: user.status || 'active',
            kyc: user.kyc || null, // Handle KYC if added back
        } as UserProfileData));

        console.log(`[getAdminUsers Action] Fetched ${serializedUsers.length} users.`);
        return serializedUsers;
    } catch (error: any) {
        console.error("[getAdminUsers Action] Error fetching users:", error);
        return null; // Return null on error
    }
}


// --- Suspend/Unsuspend User Action ---
export async function toggleUserSuspension(userId: string): Promise<{ success: boolean; message: string; newStatus?: UserProfileData['status'] }> {
     let db;
    try {
        db = await getDbConnection();
        const currentUser = await db.get<{ status: UserProfileData['status'], role: UserProfileData['role'] }>(
            'SELECT status, role FROM users WHERE uid = ?', userId
        );

        if (!currentUser) {
            return { success: false, message: "User not found." };
        }

         // Prevent suspending admins
        if (currentUser.role === 'admin') {
            return { success: false, message: "Cannot suspend an admin user." };
        }

        const newStatus: UserProfileData['status'] = currentUser.status === 'suspended' ? 'active' : 'suspended';

        await db.exec('BEGIN TRANSACTION');
        const result = await db.run('UPDATE users SET status = ? WHERE uid = ?', [newStatus, userId]);
        if (result.changes === 0) {
            await db.exec('ROLLBACK');
             return { success: false, message: "User status not changed." };
        }

        await db.exec('COMMIT');

        // Revalidate necessary paths AFTER commit
        revalidatePath('/dashboard/admin/users');

        // Optionally, notify the user
        try {
             const notificationTitle = `Account ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`;
             const notificationMessage = `An administrator has ${newStatus} your account.`;
             await addNotification(userId, 'account_status', notificationTitle, notificationMessage);
         } catch (notificationError) {
             console.error(`Failed to send suspension/activation notification to user ${userId}:`, notificationError);
         }


        return {
            success: true,
            message: `User ${newStatus}.`,
            newStatus: newStatus // Return the new status for optimistic UI updates
        };

    } catch (error: any) {
        if (db) {
            try { await db.exec('ROLLBACK'); } catch (rbError) { console.error("Rollback failed:", rbError); }
        }
        console.error("Error toggling user suspension:", error);
        return { success: false, message: `Database Error: ${error.message || 'Failed to update status.'}` };
    }
}

// --- Delete User Action ---
export async function deleteUserAccount(userId: string): Promise<{ success: boolean; message: string }> {
     let db;
    try {
        db = await getDbConnection();

        const currentUser = await db.get<{ role: UserProfileData['role'] }>(
            'SELECT role FROM users WHERE uid = ?', userId
        );

         if (!currentUser) {
            return { success: false, message: "User not found." };
        }

        // Prevent deleting admins via this interface
        if (currentUser.role === 'admin') {
            return { success: false, message: "Cannot delete an admin user via this action." };
        }

        // Use a transaction if deleting related data (e.g., properties, bookings) is needed
        // For simplicity, here we only delete the user record (assuming CASCADE handles related data)
        const result = await db.run('DELETE FROM users WHERE uid = ?', userId);

        if (result.changes === 0) {
             return { success: false, message: 'User not found or already deleted.' };
        }

        // Revalidate the user list AFTER successful deletion
        revalidatePath('/dashboard/admin/users');

        return { success: true, message: 'User account deleted successfully.' };

    } catch (error: any) {
        console.error("Error deleting user:", error);
         // Check for foreign key constraints if CASCADE is not set up correctly
         if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
             return { success: false, message: 'Cannot delete user: They have related data (properties, bookings, etc.). Consider suspending instead.' };
         }
        return { success: false, message: `Database Error: ${error.message || 'Failed to delete user.'}` };
    }
}


// ----- Property Management (Admin) -----

type RawAdminProperty = Omit<Property, 'amenities' | 'location'> & {
    amenities: string | null; // Amenities stored as JSON string
    latitude: number | null;
    longitude: number | null;
    ownerName?: string; // Optional owner name from JOIN
    ownerId?: string; // Include ownerId
};

/**
 * Server Action to fetch all properties for the admin dashboard.
 * Includes owner information.
 */
export async function getAdminProperties(): Promise<AdminProperty[] | null> {
    try {
        const db = await getDbConnection();
        // Join with users table to get owner name
        const sql = `
            SELECT
                p.id, p.title, p.description, p.price, p.city, p.propertyType, p.imageUrl, p.panoImageUrl, p.amenities, p.status, p.latitude, p.longitude, p.createdAt,
                u.name as ownerName, p.ownerId
            FROM properties p
            LEFT JOIN users u ON p.ownerId = u.uid
            ORDER BY p.createdAt DESC
        `;
        const rawProperties = await db.all<RawAdminProperty[]>(sql);

        // Process raw data
        const properties = rawProperties.map(p => ({
            ...p,
            amenities: p.amenities ? JSON.parse(p.amenities) : [],
            location: { lat: p.latitude ?? 0, lng: p.longitude ?? 0 },
            status: p.status as Property['status'] | undefined,
            ownerName: p.ownerName || 'Unknown Owner',
            ownerId: p.ownerId, // Ensure ownerId is included
             // Ensure dates are serialized (if needed, createdAt is not in Property type currently)
             // createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
        } as AdminProperty)); // Assert the final type

        console.log(`[getAdminProperties Action] Fetched ${properties.length} properties.`);
        return properties;
    } catch (error) {
        console.error("[getAdminProperties Action] Error fetching properties:", error);
        return null;
    }
}


// --- Approve Property Action (Admin) ---
export async function approveAdminProperty(propertyId: string): Promise<{ success: boolean; message: string }> {
    try {
        const db = await getDbConnection();
        const result = await db.run(
            "UPDATE properties SET status = 'verified' WHERE id = ? AND status = 'pending'", // Only approve pending
            [propertyId]
        );

        if (result.changes === 0) {
            return { success: false, message: 'Property not found or already verified/rejected.' };
        }

        // Notify owner (optional)
        // const property = await db.get('SELECT ownerId, title FROM properties WHERE id = ?', propertyId);
        // if (property) {
        //     await addNotification(property.ownerId, 'property_status', 'Property Approved', `Your property "${property.title}" has been verified by an admin.`, propertyId);
        // }

        revalidatePath('/dashboard/admin/properties');
        revalidatePath('/dashboard/owner/properties'); // Revalidate owner's view too
        revalidatePath('/browse'); // Revalidate public browse page
        revalidatePath('/'); // Revalidate homepage

        return { success: true, message: 'Property approved successfully.' };
    } catch (error: any) {
        console.error("[approveAdminProperty Action] Error:", error);
        return { success: false, message: `Database Error: ${error.message || 'Failed to approve property.'}` };
    }
}

// --- Reject Property Action (Admin) ---
export async function rejectAdminProperty(propertyId: string, reason: string): Promise<{ success: boolean; message: string }> {
    if (!reason) return { success: false, message: "Rejection reason is required." };
    try {
        const db = await getDbConnection();
        const result = await db.run(
            "UPDATE properties SET status = 'rejected' WHERE id = ? AND status = 'pending'", // Only reject pending
            [propertyId]
        );

        if (result.changes === 0) {
             return { success: false, message: 'Property not found or already verified/rejected.' };
        }

        // Notify owner (optional)
        // const property = await db.get('SELECT ownerId, title FROM properties WHERE id = ?', propertyId);
        // if (property) {
        //     await addNotification(property.ownerId, 'property_status', 'Property Rejected', `Your property "${property.title}" was rejected. Reason: ${reason}`, propertyId);
        // }

         revalidatePath('/dashboard/admin/properties');
         revalidatePath('/dashboard/owner/properties');
         revalidatePath('/browse'); // Revalidate public browse page
         revalidatePath('/'); // Revalidate homepage

        return { success: true, message: 'Property rejected successfully.' };
    } catch (error: any) {
        console.error("[rejectAdminProperty Action] Error:", error);
        return { success: false, message: `Database Error: ${error.message || 'Failed to reject property.'}` };
    }
}

// --- Delete Property Action (Admin) ---
export async function deleteAdminProperty(propertyId: string): Promise<{ success: boolean; message: string }> {
    try {
        const db = await getDbConnection();
        // Admin can delete any property regardless of owner
        const result = await db.run('DELETE FROM properties WHERE id = ?', [propertyId]);

        if (result.changes === 0) {
             return { success: false, message: 'Property not found or already deleted.' };
        }

        console.log(`[deleteAdminProperty Action] Property ${propertyId} deleted by admin.`);
        revalidatePath('/dashboard/admin/properties');
        revalidatePath('/dashboard/owner/properties'); // Revalidate owner's view
        revalidatePath('/browse');
        revalidatePath(`/properties/${propertyId}`); // Revalidate specific page (will 404)
        revalidatePath('/', 'layout');
        revalidatePath('/'); // Revalidate homepage

        return { success: true, message: 'Property deleted successfully.' };

    } catch (error: any) {
        console.error("[deleteAdminProperty Action] Error deleting property:", error);
         if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
             // Instruct admin to handle bookings first
             return { success: false, message: 'Cannot delete property: It has existing bookings. Please manage bookings first.' };
         }
        return { success: false, message: `Database Error: ${error.message || 'Failed to delete property.'}` };
    }
}


// ----- Booking Management (Admin) -----

// Type for raw data fetched from DB before serialization adjustment
type RawAdminBookingData = Omit<Booking, 'bookingDate' | 'startDate' | 'endDate'> & {
    bookingDate: string | Date;
    startDate: string;
    endDate: string;
    propertyName?: string;
    userName?: string;
    userEmail?: string;
    ownerName?: string;
    ownerId?: string; // Include ownerId
    propertyImageUrl?: string;
};

/**
 * Server Action to fetch ALL bookings for the admin dashboard.
 */
export async function getAdminBookings(): Promise<Booking[] | null> {
    try {
        const db = await getDbConnection();
        // Join bookings with properties and users (renter and owner)
        const sql = `
            SELECT
                b.*,
                p.title AS propertyName,
                p.imageUrl AS propertyImageUrl,
                u_renter.name AS userName,
                u_renter.email AS userEmail,
                u_owner.name AS ownerName,
                p.ownerId -- Include ownerId from property
            FROM bookings b
            LEFT JOIN properties p ON b.propertyId = p.id
            LEFT JOIN users u_renter ON b.userId = u_renter.uid
            LEFT JOIN users u_owner ON p.ownerId = u_owner.uid
            ORDER BY b.bookingDate DESC
        `;
        const rawBookings = await db.all<RawAdminBookingData[]>(sql);

        const serializedBookings = rawBookings.map(b => ({
            ...b,
            propertyName: b.propertyName || 'Property Deleted',
            propertyImageUrl: b.propertyImageUrl || undefined,
            userName: b.userName || 'User Deleted',
            userEmail: b.userEmail || 'N/A',
            ownerName: b.ownerName || 'Owner Deleted/Unknown',
            ownerId: b.ownerId, // Ensure ownerId is mapped
            bookingDate: b.bookingDate instanceof Date ? b.bookingDate.toISOString() : String(b.bookingDate),
            startDate: b.startDate,
            endDate: b.endDate,
        }));

        return serializedBookings;
    } catch (error) {
        console.error("[getAdminBookings Action] Error fetching bookings:", error);
        return null;
    }
}

// --- Cancel Booking Action (Admin) ---
export async function cancelAdminBooking(bookingId: string): Promise<{ success: boolean; message: string }> {
    let db;
    try {
        db = await getDbConnection();

        // 1. Verify the booking exists and is not already cancelled
        const booking = await db.get<Pick<Booking, 'id' | 'status' | 'userId' | 'propertyName'>>(
            `SELECT b.id, b.status, b.userId, p.title as propertyName
             FROM bookings b
             LEFT JOIN properties p ON b.propertyId = p.id
             WHERE b.id = ?`,
            [bookingId]
        );

        if (!booking) {
            return { success: false, message: "Booking not found." };
        }
        if (booking.status === 'cancelled') {
            return { success: false, message: "Booking is already cancelled." };
        }

        // 2. Update booking status to 'cancelled'
        await db.run('UPDATE bookings SET status = ? WHERE id = ?', ['cancelled', bookingId]);

        // 3. Revalidate paths
        revalidatePath('/dashboard/admin/bookings');
        revalidatePath('/dashboard/user/bookings'); // Revalidate user's booking page
        revalidatePath('/dashboard/owner/bookings'); // Revalidate owner's booking page
        revalidatePath('/', 'layout');

        // 4. Notify the user (and potentially owner)
        try {
            const notificationTitle = "Booking Cancelled by Admin";
            const notificationMessage = `An administrator has cancelled your booking for "${booking.propertyName || 'a property'}". Please contact support if you have questions.`;
            await addNotification(booking.userId, 'booking_status', notificationTitle, notificationMessage, bookingId);
            console.log(`[cancelAdminBooking Action] Sent cancellation notification to user ${booking.userId}`);
            // Optionally notify owner too
        } catch (notificationError) {
            console.error(`[cancelAdminBooking Action] Failed to send cancellation notification to user ${booking.userId}:`, notificationError);
        }

        return { success: true, message: "Booking cancelled successfully by admin." };

    } catch (error: any) {
        console.error("[cancelAdminBooking Action] Error:", error);
        return { success: false, message: `Database Error: ${error.message || 'Failed to cancel booking.'}` };
    }
}


// --- Delete Booking Record Action (Admin) ---
export async function deleteAdminBooking(bookingId: string): Promise<{ success: boolean; message: string }> {
    let db;
    try {
        db = await getDbConnection();
        const result = await db.run('DELETE FROM bookings WHERE id = ?', bookingId);

        if (result.changes === 0) {
            return { success: false, message: 'Booking record not found or already deleted.' };
        }

        // Revalidate paths
        revalidatePath('/dashboard/admin/bookings');
        revalidatePath('/dashboard/user/bookings');
        revalidatePath('/dashboard/owner/bookings');
        revalidatePath('/', 'layout');

        return { success: true, message: 'Booking record deleted successfully.' };

    } catch (error: any) {
        console.error("[deleteAdminBooking Action] Error:", error);
        return { success: false, message: `Database Error: ${error.message || 'Failed to delete booking record.'}` };
    }
}
