// src/actions/propertyActions.ts
'use server';

import { getDbConnection } from '@/lib/db';
import type { Property } from '@/types/property';

// --- Types ---
// Raw property data as fetched from DB before processing JSON fields etc.
type RawPropertyData = Omit<Property, 'amenities' | 'location' | 'galleryImages' | 'tags' | 'kitchenAvailable' | 'hallAvailable'> & {
    amenities: string | null;
    galleryImages: string | null;
    tags: string | null;
    latitude: number | null;
    longitude: number | null;
    ownerName?: string; // Optional owner name from JOIN (if needed later)
    kitchenAvailable: number | null; // SQLite stores BOOLEAN as 0 or 1
    hallAvailable: number | null;   // SQLite stores BOOLEAN as 0 or 1
};

// Define filter types for fetching properties
export interface PropertyFilter {
    status?: Property['status'];
    city?: string;
    minPrice?: number;
    maxPrice?: number;
    propertyType?: string;
    amenities?: string[];
    search?: string; // For text search on title/description
    limit?: number;
    offset?: number;
}

/**
 * Server Action to fetch public properties based on filters.
 * Only retrieves properties with a 'verified' status by default unless specified otherwise.
 * Converts JSON string fields (amenities, galleryImages, tags) to arrays.
 * Converts SQLite boolean integers (kitchenAvailable, hallAvailable) to booleans.
 * Constructs location object.
 *
 * @param filters - An object containing filter criteria.
 * @returns An array of Property objects or null on error.
 */
export async function getPublicProperties(filters: PropertyFilter = {}): Promise<Property[] | null> {
    console.log("[getPublicProperties Action] Fetching with filters:", filters);
    try {
        const db = await getDbConnection();
        // Select all necessary columns, including ownerId and new detailed fields
        let sql = `
            SELECT id, ownerId, title, description, price, city, propertyType, imageUrl, panoImageUrl,
                   amenities, status, latitude, longitude, bedrooms, bathrooms, balconies,
                   kitchenAvailable, hallAvailable, size, floorNumber, totalFloors, facing,
                   galleryImages, tags, createdAt
            FROM properties`;
        const whereClauses: string[] = [];
        const params: any[] = [];

        // Default to 'verified' status if not provided
        const statusFilter = filters.status ?? 'verified';
        whereClauses.push('status = ?');
        params.push(statusFilter);

        // Add other filters
        if (filters.city) {
            whereClauses.push('LOWER(city) LIKE ?');
            params.push(`%${filters.city.toLowerCase()}%`);
        }
        if (filters.minPrice !== undefined) {
            whereClauses.push('price >= ?');
            params.push(filters.minPrice);
        }
         if (filters.maxPrice !== undefined) {
            whereClauses.push('price <= ?');
            params.push(filters.maxPrice);
        }
        if (filters.propertyType) {
            whereClauses.push('LOWER(propertyType) = ?');
            params.push(filters.propertyType.toLowerCase());
        }
         if (filters.search) {
            whereClauses.push('(LOWER(title) LIKE ? OR LOWER(description) LIKE ?)');
            params.push(`%${filters.search.toLowerCase()}%`);
            params.push(`%${filters.search.toLowerCase()}%`);
        }
        // Filtering by amenities (using JSON string search)
         if (filters.amenities && filters.amenities.length > 0) {
            filters.amenities.forEach(amenity => {
                 whereClauses.push(`amenities LIKE ?`);
                 // Match the amenity string surrounded by quotes or at start/end of JSON array
                 params.push(`%"${amenity}"%`); // More robust check for JSON array elements
            });
        }

        if (whereClauses.length > 0) {
            sql += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        sql += ` ORDER BY createdAt DESC`; // Or relevant order

        if (filters.limit !== undefined) {
            sql += ` LIMIT ?`;
            params.push(filters.limit);
        }
        if (filters.offset !== undefined) {
            sql += ` OFFSET ?`;
            params.push(filters.offset);
        }

         console.log("[getPublicProperties Action] Executing SQL:", sql);
         console.log("[getPublicProperties Action] With Params:", params);

        const rawProperties = await db.all<RawPropertyData[]>(sql, params);

        // Process raw data: parse JSON, convert booleans, create location object
        const properties = rawProperties.map(p => ({
            ...p,
             ownerId: p.ownerId,
            amenities: p.amenities ? JSON.parse(p.amenities) : [],
            galleryImages: p.galleryImages ? JSON.parse(p.galleryImages) : [],
            tags: p.tags ? JSON.parse(p.tags) : [],
            location: { lat: p.latitude ?? 0, lng: p.longitude ?? 0 },
            kitchenAvailable: p.kitchenAvailable === 1,
            hallAvailable: p.hallAvailable === 1,
            status: p.status as Property['status'] | undefined,
            imageUrl: p.imageUrl ?? null,
            panoImageUrl: p.panoImageUrl ?? null,
            // Ensure numeric fields handle null correctly
            bedrooms: p.bedrooms ?? null,
            bathrooms: p.bathrooms ?? null,
            balconies: p.balconies ?? null,
            size: p.size ?? null,
            floorNumber: p.floorNumber ?? null,
            totalFloors: p.totalFloors ?? null,
            facing: p.facing as Property['facing'] ?? null,
        }));

         console.log(`[getPublicProperties Action] Fetched ${properties.length} properties.`);
        return properties;

    } catch (error: any) {
        console.error("[getPublicProperties Action] Error fetching properties:", error);
        if (error.code?.includes('SQLITE_ERROR')) {
            console.error("[getPublicProperties Action] SQLite Error Code:", error.code);
            console.error("[getPublicProperties Action] SQLite Error Message:", error.message);
        }
        return null; // Return null on error
    }
}

/**
 * Server Action to fetch a single property by its ID from the SQLite database.
 * Includes owner name if available and processes all fields.
 *
 * @param propertyId - The ID of the property to fetch.
 * @returns The Property object or null if not found or on error.
 */
export async function getPropertyById(propertyId: string): Promise<Property | null> {
    if (!propertyId) {
        console.error("[getPropertyById Action] No property ID provided.");
        return null;
    }
    console.log(`[getPropertyById Action] Fetching property with ID: ${propertyId}`);
    try {
        const db = await getDbConnection();
        // Join with users table to potentially get owner name
        // Select all new fields
        const sql = `
            SELECT
                p.id, p.ownerId, p.title, p.description, p.price, p.city, p.propertyType,
                p.imageUrl, p.panoImageUrl, p.amenities, p.status, p.latitude, p.longitude,
                p.bedrooms, p.bathrooms, p.balconies, p.kitchenAvailable, p.hallAvailable, p.size,
                p.floorNumber, p.totalFloors, p.facing, p.galleryImages, p.tags,
                p.createdAt, u.name as ownerName
            FROM properties p
            LEFT JOIN users u ON p.ownerId = u.uid
            WHERE p.id = ?
        `;
        const rawProperty = await db.get<RawPropertyData & { ownerName?: string }>(sql, [propertyId]);

        if (!rawProperty) {
            console.warn(`[getPropertyById Action] Property with ID ${propertyId} not found.`);
            return null; // Property not found
        }

        console.log(`[getPropertyById Action] Found property: ${rawProperty.title}`);

        // Process raw data fully
        const property: Property = {
            id: rawProperty.id,
            ownerId: rawProperty.ownerId,
            title: rawProperty.title,
            description: rawProperty.description,
            price: rawProperty.price,
            city: rawProperty.city,
            propertyType: rawProperty.propertyType,
            ownerInfo: rawProperty.ownerName ? `${rawProperty.ownerName} (Owner)` : 'OwnBroker Verified',
            imageUrl: rawProperty.imageUrl ?? null,
            panoImageUrl: rawProperty.panoImageUrl ?? null,
            amenities: rawProperty.amenities ? JSON.parse(rawProperty.amenities) : [],
            galleryImages: rawProperty.galleryImages ? JSON.parse(rawProperty.galleryImages) : [],
            tags: rawProperty.tags ? JSON.parse(rawProperty.tags) : [],
            location: { lat: rawProperty.latitude ?? 0, lng: rawProperty.longitude ?? 0 },
            status: rawProperty.status as Property['status'] | undefined,
            bedrooms: rawProperty.bedrooms ?? null,
            bathrooms: rawProperty.bathrooms ?? null,
            balconies: rawProperty.balconies ?? null,
            kitchenAvailable: rawProperty.kitchenAvailable === 1,
            hallAvailable: rawProperty.hallAvailable === 1,
            size: rawProperty.size ?? null,
            floorNumber: rawProperty.floorNumber ?? null,
            totalFloors: rawProperty.totalFloors ?? null,
            facing: rawProperty.facing as Property['facing'] ?? null,
            createdAt: rawProperty.createdAt,
            // ownerContact: rawProperty.ownerContact || undefined, // Add owner contact if available in DB
        };

        return property;

    } catch (error: any) {
        console.error(`[getPropertyById Action] Error fetching property ${propertyId}:`, error);
        if (error.code?.includes('SQLITE_ERROR')) {
            console.error("[getPropertyById Action] SQLite Error Code:", error.code);
            console.error("[getPropertyById Action] SQLite Error Message:", error.message);
        }
        return null; // Return null on error
    }
}
    