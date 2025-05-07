

/**
 * Represents a request from a user to upgrade their role.
 * Uses serializable types suitable for passing between Server and Client Components.
 */
export interface RoleRequest {
  id: number; // SQLite uses integer IDs
  userId: string;
  userName: string;
  userEmail: string;
  requestedRole: 'owner';
  status: 'pending' | 'approved' | 'rejected';
  requestTimestamp: string; // Store dates as ISO strings for serialization
  actionTimestamp?: string | null; // Store dates as ISO strings for serialization
  adminNotes?: string;
}
