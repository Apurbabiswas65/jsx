// src/types/booking.ts

/**
 * Represents a booking object.
 * Uses serializable types suitable for passing between Server and Client Components.
 */
export interface Booking {
  id: string; // Unique booking ID (UUID or DB ID)
  userId: string; // UID of the user making the booking
  propertyId: string; // ID of the booked property
  ownerId?: string; // UID of the property owner (optional, useful for joins)
  startDate: string; // ISO Date string
  endDate: string; // ISO Date string
  status: 'pending' | 'approved' | 'cancelled';
  bookingDate: string; // ISO Date string of when the booking was made
  // Optional fields fetched via JOINs for display purposes:
  propertyName?: string;
  userName?: string;
  userEmail?: string;
  ownerName?: string;
  propertyImageUrl?: string;
}

    