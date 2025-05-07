// src/actions/bookingActions.ts
'use server';

import { getDbConnection } from '@/lib/db';
import type { Booking } from '@/types/booking';
import { revalidatePath } from 'next/cache';
import { addNotification } from './userActions'; // Import notification helper

// --- Types ---
// Raw booking data as fetched from DB
type RawBookingData = Omit<Booking, 'bookingDate' | 'startDate' | 'endDate'> & {
    bookingDate: string | Date;
    startDate: string; // Dates are stored as strings
    endDate: string;
     // Include fields joined from other tables
     propertyName?: string;
     userName?: string;
     userEmail?: string;
     ownerName?: string;
     propertyImageUrl?: string;
};

// --- Get Bookings for a Specific User ---
export async function getUserBookings(userId: string, statusFilter: 'all' | 'upcoming' | Booking['status'] = 'all'): Promise<Booking[] | null> {
    if (!userId) {
        console.error("[getUserBookings Action] Missing User ID.");
        return null;
    }

    try {
        const db = await getDbConnection();
        let sql = `
            SELECT
                b.id, b.userId, b.propertyId, b.startDate, b.endDate, b.status, b.bookingDate,
                p.title AS propertyName,
                p.imageUrl AS propertyImageUrl,
                u_owner.name AS ownerName
            FROM bookings b
            JOIN properties p ON b.propertyId = p.id
            JOIN users u_owner ON p.ownerId = u_owner.uid
            WHERE b.userId = ?
        `;
        const params: any[] = [userId];

        // Apply status filter (adjusting for 'upcoming')
         if (statusFilter === 'upcoming') {
            sql += ` AND b.status = 'approved' AND date(b.startDate) >= date('now')`;
         } else if (statusFilter !== 'all') {
            sql += ` AND b.status = ?`;
            params.push(statusFilter);
        }

        sql += ` ORDER BY b.bookingDate DESC`;

        const rawBookings = await db.all<RawBookingData[]>(sql, params);

        const serializedBookings = rawBookings.map(b => ({
            ...b,
             // Ensure all fields from Booking type are present
             userName: b.userName || 'N/A', // User name not directly needed here, fetched separately if required
             userEmail: b.userEmail || 'N/A', // User email not directly needed here
             ownerName: b.ownerName || 'Unknown Owner',
             propertyName: b.propertyName || 'Unknown Property',
             propertyImageUrl: b.propertyImageUrl || undefined,
             bookingDate: b.bookingDate instanceof Date ? b.bookingDate.toISOString() : String(b.bookingDate),
             // Dates are already strings from DB
             startDate: b.startDate,
             endDate: b.endDate,
        }));

        return serializedBookings;
    } catch (error) {
        console.error("[getUserBookings Action] Error fetching user bookings:", error);
        return null;
    }
}

// --- Get Bookings Received by an Owner ---
export async function getOwnerReceivedBookings(ownerId: string, statusFilter: 'all' | Booking['status'] = 'all'): Promise<Booking[] | null> {
     if (!ownerId) {
        console.error("[getOwnerReceivedBookings Action] Missing Owner ID.");
        return null;
    }
     try {
        const db = await getDbConnection();
        let sql = `
            SELECT
                b.id, b.userId, b.propertyId, b.startDate, b.endDate, b.status, b.bookingDate,
                p.title AS propertyName,
                u_renter.name AS userName,
                u_renter.email AS userEmail
            FROM bookings b
            JOIN properties p ON b.propertyId = p.id
            JOIN users u_renter ON b.userId = u_renter.uid
            WHERE p.ownerId = ?
        `;
         const params: any[] = [ownerId];

         if (statusFilter !== 'all') {
            sql += ` AND b.status = ?`;
            params.push(statusFilter);
         }

        sql += ` ORDER BY b.bookingDate DESC`;

        const rawBookings = await db.all<RawBookingData[]>(sql, params);

        const serializedBookings = rawBookings.map(b => ({
            ...b,
             // Ensure all fields from Booking type are present
             userName: b.userName || 'Unknown User',
             userEmail: b.userEmail || 'N/A',
             ownerName: b.ownerName || 'N/A', // Owner name not directly needed here
             propertyName: b.propertyName || 'Unknown Property',
             propertyImageUrl: b.propertyImageUrl || undefined,
             bookingDate: b.bookingDate instanceof Date ? b.bookingDate.toISOString() : String(b.bookingDate),
             startDate: b.startDate,
             endDate: b.endDate,
        }));

        return serializedBookings;
    } catch (error) {
        console.error("[getOwnerReceivedBookings Action] Error fetching owner bookings:", error);
        return null;
    }
}


// --- Approve Booking (by Owner) ---
export async function approveBooking(bookingId: string, ownerId: string): Promise<{ success: boolean; message: string }> {
     if (!bookingId || !ownerId) {
        return { success: false, message: "Missing booking ID or owner ID." };
    }

    let db;
    try {
        db = await getDbConnection();

        // 1. Verify the booking exists, is pending, and belongs to the owner
        const booking = await db.get<RawBookingData>(
            `SELECT b.id, b.status, b.userId, p.title as propertyName
             FROM bookings b
             JOIN properties p ON b.propertyId = p.id
             WHERE b.id = ? AND p.ownerId = ?`,
            [bookingId, ownerId]
        );

        if (!booking) {
            return { success: false, message: "Booking not found or you don't have permission." };
        }
        if (booking.status !== 'pending') {
            return { success: false, message: `Booking is already ${booking.status}.` };
        }

         // 2. Update booking status
         await db.run('UPDATE bookings SET status = ? WHERE id = ?', ['approved', bookingId]);

        // 3. Revalidate paths AFTER DB update
        revalidatePath('/dashboard/owner/bookings');
        revalidatePath('/dashboard/user/bookings'); // Revalidate user's booking page
        revalidatePath('/dashboard/admin/bookings'); // Revalidate admin booking page
        revalidatePath('/', 'layout'); // Revalidate layout for potential summary updates


         // 4. Notify the user
         try {
            const notificationTitle = "Booking Approved!";
            const notificationMessage = `Your booking request for "${booking.propertyName}" has been approved by the owner.`;
            await addNotification(booking.userId, 'booking_status', notificationTitle, notificationMessage, bookingId);
            console.log(`[approveBooking Action] Sent approval notification to user ${booking.userId}`);
        } catch (notificationError) {
            console.error(`[approveBooking Action] Failed to send approval notification to user ${booking.userId}:`, notificationError);
        }


        return { success: true, message: "Booking approved successfully." };

    } catch (error: any) {
        console.error("[approveBooking Action] Error:", error);
        return { success: false, message: `Database Error: ${error.message || 'Failed to approve booking.'}` };
    }
}

// --- Reject Booking (by Owner) ---
export async function rejectBooking(bookingId: string, ownerId: string): Promise<{ success: boolean; message: string }> {
    if (!bookingId || !ownerId) {
        return { success: false, message: "Missing booking ID or owner ID." };
    }

    let db;
     try {
        db = await getDbConnection();

        // 1. Verify the booking exists, is pending, and belongs to the owner
        const booking = await db.get<RawBookingData>(
             `SELECT b.id, b.status, b.userId, p.title as propertyName
             FROM bookings b
             JOIN properties p ON b.propertyId = p.id
             WHERE b.id = ? AND p.ownerId = ?`,
            [bookingId, ownerId]
        );

        if (!booking) {
            return { success: false, message: "Booking not found or you don't have permission." };
        }
         if (booking.status !== 'pending') {
            return { success: false, message: `Booking is already ${booking.status}.` };
        }

        // 2. Update booking status
         await db.run('UPDATE bookings SET status = ? WHERE id = ?', ['cancelled', bookingId]); // Set to 'cancelled' on rejection

        // 3. Revalidate paths AFTER DB update
        revalidatePath('/dashboard/owner/bookings');
        revalidatePath('/dashboard/user/bookings');
        revalidatePath('/dashboard/admin/bookings');
         revalidatePath('/', 'layout'); // Revalidate layout for potential summary updates

        // 4. Notify the user
        try {
            const notificationTitle = "Booking Rejected";
            const notificationMessage = `Unfortunately, your booking request for "${booking.propertyName}" has been rejected by the owner.`;
            await addNotification(booking.userId, 'booking_status', notificationTitle, notificationMessage, bookingId);
            console.log(`[rejectBooking Action] Sent rejection notification to user ${booking.userId}`);
         } catch (notificationError) {
            console.error(`[rejectBooking Action] Failed to send rejection notification to user ${booking.userId}:`, notificationError);
         }


        return { success: true, message: "Booking rejected successfully." };

    } catch (error: any) {
        console.error("[rejectBooking Action] Error:", error);
        return { success: false, message: `Database Error: ${error.message || 'Failed to reject booking.'}` };
    }
}

// --- Cancel Booking (by User) ---
export async function cancelBooking(bookingId: string, userId: string): Promise<{ success: boolean; message: string }> {
     if (!bookingId || !userId) {
        return { success: false, message: "Missing booking ID or user ID." };
    }

    let db;
    try {
        db = await getDbConnection();

        // 1. Verify the booking exists, belongs to the user, and is cancellable (pending or approved)
        const booking = await db.get<RawBookingData>(
             `SELECT id, status, propertyId FROM bookings WHERE id = ? AND userId = ?`,
            [bookingId, userId]
        );

        if (!booking) {
            return { success: false, message: "Booking not found or you don't have permission." };
        }
        if (booking.status === 'cancelled') {
            return { success: false, message: "Booking is already cancelled." };
        }
        // Add any other cancellation policy checks here (e.g., cannot cancel within 24 hours)

         // 2. Update booking status
         await db.run('UPDATE bookings SET status = ? WHERE id = ?', ['cancelled', bookingId]);

        // 3. Revalidate paths AFTER DB update
        revalidatePath('/dashboard/user/bookings');
        revalidatePath('/dashboard/owner/bookings'); // Notify owner implicitly by revalidating their list
        revalidatePath('/dashboard/admin/bookings');
         revalidatePath('/', 'layout'); // Revalidate layout for potential summary updates

         // 4. Optionally, notify the owner (implementation depends on how owners get notifications)
         // Example using our system:
         // const property = await db.get('SELECT ownerId, title FROM properties WHERE id = ?', booking.propertyId);
         // if (property) {
         //     await addNotification(property.ownerId, 'booking_cancelled_by_user', 'Booking Cancelled', `User cancelled their booking for "${property.title}".`, bookingId);
         // }


        return { success: true, message: "Booking cancelled successfully." };

    } catch (error: any) {
        console.error("[cancelBooking Action] Error:", error);
        return { success: false, message: `Database Error: ${error.message || 'Failed to cancel booking.'}` };
    }
}