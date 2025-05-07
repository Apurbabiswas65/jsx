
/**
 * Represents a notification object for a user.
 * Uses serializable types suitable for passing between Server and Client Components.
 */
export interface Notification {
  id: number | string; // SQLite ID or potentially UUID
  userId: string; // The user this notification is for
  type: string; // Category of notification (e.g., 'booking_status', 'role_request_status', 'admin_message', 'new_enquiry')
  title: string; // Brief title of the notification
  message: string; // Detailed message content
  relatedId?: string | number | null; // Optional ID related to the notification (e.g., booking ID, request ID, property ID)
  status: 'unread' | 'read'; // Current status of the notification
  createdAt: string; // ISO string representation of the creation timestamp
}
