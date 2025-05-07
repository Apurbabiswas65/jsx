

/**
 * Represents a message submitted through the contact form or user enquiry.
 * Uses serializable types suitable for passing between Server and Client Components.
 */
export interface ContactMessage {
  id: number | string; // SQLite typically uses integer primary keys
  userId?: string | null; // Link to user if submitted while logged in
  name: string;
  email: string;
  subject: string;
  message: string;
  timestamp: string; // Store dates as ISO strings for serialization
  status: 'unseen' | 'seen'; // Status from admin's perspective
  reply_text?: string | null; // Admin's reply content
  reply_timestamp?: string | null; // Timestamp of admin's reply (ISO string)
  has_admin_reply?: boolean; // Flag indicating if admin has replied
}