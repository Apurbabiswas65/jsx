

/**
 * Represents the structure of user profile data stored in the database.
 * Uses serializable types suitable for passing between Server and Client Components.
 */
export interface UserProfileData {
  uid: string; // Matches Auth UID
  name: string;
  email: string;
  mobile: string;
  role: 'user' | 'owner' | 'admin';
  kyc?: string | null;
  status: 'active' | 'pending' | 'suspended';
  avatarUrl?: string | null;
  createdAt: string; // Store dates as ISO strings for serialization
  // Add any other relevant profile fields
}
