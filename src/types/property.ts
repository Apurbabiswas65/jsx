
/**
 * Represents a geographical location with latitude and longitude coordinates.
 */
export interface Location {
  lat: number;
  lng: number;
}

/**
 * Represents property details, including image URLs, descriptions, prices, and amenities.
 */
export interface Property {
  id: string;
  ownerId: string; // Essential for linking property to owner
  title: string;
  description: string;
  price: number;
  location: Location;
  city?: string; // Optional: City or general area for filtering
  propertyType?: string; // Optional: e.g., Apartment, Villa, House
  ownerInfo?: string; // Optional: e.g., Owner Name, 'Verified Owner'
  imageUrl: string | null; // Allow null or empty string for image URL
  panoImageUrl?: string | null; // Optional URL for 360-degree panoramic image, allow null
  galleryImages?: string[]; // Optional: Array of additional image URLs (store paths or full URLs)
  amenities?: string[]; // e.g., ['wifi', 'ac', 'pool'] - Use amenity IDs like 'ac', 'tv'
  status?: 'pending' | 'verified' | 'rejected'; // Optional property verification status
  ownerContact?: string; // Optional: Contact info (phone/email) visible to logged-in users
  // Detailed Room Information
  bedrooms?: number | null;
  bathrooms?: number | null;
  balconies?: number | null;
  kitchenAvailable?: boolean | null;
  hallAvailable?: boolean | null;
  size?: number | null; // Property size (e.g., in Sq.Ft)
  floorNumber?: number | null;
  totalFloors?: number | null;
  facing?: 'East' | 'West' | 'North' | 'South' | 'North-East' | 'North-West' | 'South-East' | 'South-West' | null;
  // Tags
  tags?: string[] | null; // Optional: Array of custom tags
  // Timestamps
  createdAt?: string; // Add createdAt if needed
}

/**
 * Represents booking details, including dates and contact information.
 * Note: This might be defined elsewhere if it's used across different contexts.
 */
export interface BookingDetails {
  startDate: Date;
  endDate: Date;
  contact: string; // Or potentially userId
}
    