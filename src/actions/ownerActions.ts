// src/actions/ownerActions.ts
'use server';

import { z } from 'zod';
import { getDbConnection } from '@/lib/db';
import type { Property } from '@/types/property';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto'; // For generating property IDs

// ----- Owner Dashboard Stats -----
export async function getOwnerDashboardStats(ownerId: string): Promise<{
    totalProperties: number;
    pendingProperties: number;
    verifiedProperties: number;
    totalBookings: number;
    pendingBookings: number;
    approvedBookings: number;
} | null> {
    if (!ownerId) {
        console.error("[getOwnerDashboardStats Action] Missing Owner ID.");
        return null;
    }

    try {
        const db = await getDbConnection();
        const [propertyStats, bookingStats] = await Promise.all([
            // Get property counts (total, pending, verified) for the specific owner
            db.get<{ total: number; pending: number; verified: number }>(`
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verified
                FROM properties
                WHERE ownerId = ?
            `, ownerId),
            // Get booking counts (total, pending, approved) for properties owned by this owner
            db.get<{ total: number; pending: number; approved: number }>(`
                SELECT
                    COUNT(b.id) as total,
                    SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN b.status = 'approved' THEN 1 ELSE 0 END) as approved -- Fixed aggregation
                FROM bookings b
                JOIN properties p ON b.propertyId = p.id
                WHERE p.ownerId = ?
            `, ownerId)
        ]);

        return {
            totalProperties: propertyStats?.total ?? 0,
            pendingProperties: propertyStats?.pending ?? 0,
            verifiedProperties: propertyStats?.verified ?? 0,
            totalBookings: bookingStats?.total ?? 0,
            pendingBookings: bookingStats?.pending ?? 0,
            approvedBookings: bookingStats?.approved ?? 0,
        };
    } catch (error) {
        console.error("[getOwnerDashboardStats Action] Error fetching owner stats:", error);
        return null; // Return null on error
    }
}

// --- Add Property Action ---

// Updated Zod schema to match PropertyForm and Property type
const PropertyFormSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  price: z.coerce.number().min(1, { message: "Price must be a positive number." }),
  city: z.string().optional().nullable(),
  propertyType: z.string().optional().nullable(),
  bedrooms: z.coerce.number().int().min(0, "Cannot be negative").optional().nullable(),
  bathrooms: z.coerce.number().int().min(0, "Cannot be negative").optional().nullable(),
  balconies: z.coerce.number().int().min(0, "Cannot be negative").optional().nullable(),
  kitchenAvailable: z.boolean().optional(),
  hallAvailable: z.boolean().optional(),
  size: z.coerce.number().positive("Size must be positive").optional().nullable(),
  floorNumber: z.coerce.number().int().optional().nullable(),
  totalFloors: z.coerce.number().int().min(0, "Total floors cannot be negative").optional().nullable(),
  // Allow 'none' or empty string as valid input, map to null later
  facing: z.enum(['East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West', 'none', '']).optional().nullable(),
  amenities: z.array(z.string()).optional(),
  imageUrl: z.string().url({ message: "Invalid URL format" }).optional().or(z.literal('')).nullable(),
  panoImageUrl: z.string().url({ message: "Invalid URL format" }).optional().or(z.literal('')).nullable(),
  galleryImages: z.array(z.string().url({ message: "Invalid gallery URL format" })).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
});


type AddPropertyFormData = z.infer<typeof PropertyFormSchema>;

export async function addProperty(
    ownerId: string,
    formData: AddPropertyFormData // Use the validated form data type
): Promise<{ success: boolean; message?: string; propertyId?: string }> {
    if (!ownerId) {
        return { success: false, message: "Owner ID is missing." };
    }
     console.log("[AddProperty Action] Received Data:", JSON.stringify(formData, null, 2));

    // Validate form data against schema
    const validation = PropertyFormSchema.safeParse(formData);
    if (!validation.success) {
        console.error("[AddProperty Action] Validation Errors:", validation.error.flatten().fieldErrors);
        const errorMessages = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        return { success: false, message: `Validation failed: ${errorMessages}` };
    }
    console.log("[AddProperty Action] Validation Successful.");


    // Destructure validated data including new fields
    const {
        title, description, price, city, propertyType, amenities, imageUrl, panoImageUrl,
        bedrooms, bathrooms, balconies, kitchenAvailable, hallAvailable, size,
        floorNumber, totalFloors, facing, galleryImages, tags
     } = validation.data;

    // Handle file uploads (simulation - use placeholder URLs)
    let finalImageUrl = imageUrl;
    let finalPanoUrl = panoImageUrl;

    // If the form provided URLs (likely placeholders), use them. Otherwise, generate a new placeholder.
    if (!finalImageUrl) {
        finalImageUrl = `https://picsum.photos/seed/${crypto.randomUUID()}/600/400`;
        console.log("[AddProperty Action] No imageUrl provided, generating placeholder:", finalImageUrl);
    }
    if (!finalPanoUrl) {
         console.log("[AddProperty Action] No panoImageUrl provided or simulated.");
         finalPanoUrl = null; // Explicitly set to null if none provided
    }
    // TODO: Handle gallery image uploads similarly if files are passed

    const newPropertyId = crypto.randomUUID(); // Generate a unique ID

    try {
        const db = await getDbConnection();
        // Store arrays as JSON strings
        const amenitiesString = amenities && amenities.length > 0 ? JSON.stringify(amenities) : null;
        const galleryImagesString = galleryImages && galleryImages.length > 0 ? JSON.stringify(galleryImages) : null;
        const tagsString = tags && tags.length > 0 ? JSON.stringify(tags) : null;


        // Ensure latitude and longitude are handled if needed, default to null here
        const latitude = null; // Replace with actual value if available
        const longitude = null; // Replace with actual value if available

        // Convert boolean to SQLite compatible integer (0 or 1)
        const kitchenAvailableInt = kitchenAvailable ? 1 : 0;
        const hallAvailableInt = hallAvailable ? 1 : 0;
        // Handle 'facing' value ('none' or '' becomes null)
        const facingValue = (facing === 'none' || facing === '') ? null : facing;

        const sql = `
            INSERT INTO properties (
                id, ownerId, title, description, price, city, propertyType,
                amenities, imageUrl, panoImageUrl, status, latitude, longitude,
                bedrooms, bathrooms, balconies, kitchenAvailable, hallAvailable,
                size, floorNumber, totalFloors, facing,
                galleryImages, tags, createdAt
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')
            )
        `;
         const params = [
             newPropertyId, ownerId, title, description, price, city ?? null, propertyType ?? null,
             amenitiesString, finalImageUrl || null, finalPanoUrl || null, 'pending', latitude, longitude,
             bedrooms ?? null, bathrooms ?? null, balconies ?? null, kitchenAvailableInt, hallAvailableInt, // Use integer values
             size ?? null, floorNumber ?? null, totalFloors ?? null, facingValue, // Use processed facing value
             galleryImagesString, tagsString
         ];
         console.log("[AddProperty Action] Executing SQL:", sql);
         console.log("[AddProperty Action] Parameters:", JSON.stringify(params, null, 2));


        await db.run(sql, params);

        console.log(`[AddProperty Action] Property added successfully. ID: ${newPropertyId}, Owner: ${ownerId}`);

        // Revalidate paths AFTER successful insert
        revalidatePath('/dashboard/owner/properties');
        revalidatePath('/browse'); // Revalidate browse page if new property might appear
        revalidatePath('/', 'layout'); // Revalidate layout for potential count changes
        revalidatePath('/'); // Revalidate homepage

        return { success: true, message: "Property added successfully and is pending verification.", propertyId: newPropertyId };

    } catch (error: any) {
        console.error("[AddProperty Action] Database Error:", error);
        return { success: false, message: `Database Error: ${error.message || 'Failed to add property.'}` };
    }
}

// --- Get Owner Properties Action ---

// Adjusted RawOwnerProperty to include all fields from DB
type RawOwnerProperty = Omit<Property, 'amenities' | 'location' | 'galleryImages' | 'tags' | 'kitchenAvailable' | 'hallAvailable'> & {
    amenities: string | null;
    galleryImages: string | null;
    tags: string | null;
    latitude: number | null;
    longitude: number | null;
    imageUrl: string | null;
    panoImageUrl: string | null;
    kitchenAvailable: number | null; // SQLite stores BOOLEAN as 0 or 1
    hallAvailable: number | null;   // SQLite stores BOOLEAN as 0 or 1
};

export async function getOwnerProperties(ownerId: string): Promise<Property[] | null> {
    if (!ownerId) {
        console.error("[GetOwnerProperties Action] Missing Owner ID.");
        return null;
    }
    try {
        const db = await getDbConnection();
        // Ensure all relevant columns are selected
        const sql = `
            SELECT id, ownerId, title, description, price, city, propertyType, imageUrl, panoImageUrl, amenities, status,
                   latitude, longitude, bedrooms, bathrooms, balconies, kitchenAvailable, hallAvailable, size,
                   floorNumber, totalFloors, facing, galleryImages, tags, createdAt
            FROM properties
            WHERE ownerId = ?
            ORDER BY createdAt DESC`;
        const rawProperties = await db.all<RawOwnerProperty[]>(sql, [ownerId]);

        // Process raw data
        const properties = rawProperties.map(p => ({
            ...p,
            amenities: p.amenities ? JSON.parse(p.amenities) : [],
            galleryImages: p.galleryImages ? JSON.parse(p.galleryImages) : [],
            tags: p.tags ? JSON.parse(p.tags) : [],
            location: { lat: p.latitude ?? 0, lng: p.longitude ?? 0 },
            kitchenAvailable: p.kitchenAvailable === 1, // Convert SQLite integer to boolean
            hallAvailable: p.hallAvailable === 1,     // Convert SQLite integer to boolean
            status: p.status as Property['status'] | undefined,
            imageUrl: p.imageUrl ?? null,
            panoImageUrl: p.panoImageUrl ?? null,
            bedrooms: p.bedrooms ?? null, // Handle nulls explicitly
            bathrooms: p.bathrooms ?? null,
            balconies: p.balconies ?? null,
            size: p.size ?? null,
            floorNumber: p.floorNumber ?? null,
            totalFloors: p.totalFloors ?? null,
            facing: p.facing as Property['facing'] ?? null,
            createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : undefined, // Serialize date
        } as Property)); // Cast to Property type

        return properties;
    } catch (error) {
        console.error("[GetOwnerProperties Action] Error fetching properties:", error);
        return null;
    }
}

// --- Delete Property Action ---
export async function deleteProperty(propertyId: string, ownerId: string): Promise<{ success: boolean; message: string }> {
     if (!propertyId || !ownerId) {
        return { success: false, message: "Missing property ID or owner ID." };
    }
    try {
        const db = await getDbConnection();
        // Ensure the property belongs to the owner deleting it
        const result = await db.run('DELETE FROM properties WHERE id = ? AND ownerId = ?', [propertyId, ownerId]);

        if (result.changes === 0) {
             return { success: false, message: 'Property not found or you do not have permission to delete it.' };
        }

        console.log(`[DeleteProperty Action] Property ${propertyId} deleted by owner ${ownerId}.`);
        // Revalidate paths AFTER successful deletion
        revalidatePath('/dashboard/owner/properties');
        revalidatePath('/browse'); // Revalidate browse page
        revalidatePath(`/properties/${propertyId}`); // Revalidate the specific property page (will likely 404)
         revalidatePath('/', 'layout'); // Revalidate layout for potential count changes
         revalidatePath('/'); // Revalidate homepage

        return { success: true, message: 'Property deleted successfully.' };

    } catch (error: any) {
        console.error("[DeleteProperty Action] Error deleting property:", error);
        // Handle potential foreign key issues if bookings reference this property
         if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
             return { success: false, message: 'Cannot delete property: It has existing bookings associated with it.' };
         }
        return { success: false, message: `Database Error: ${error.message || 'Failed to delete property.'}` };
    }
}


// --- Update Property Action ---
const UpdatePropertySchema = PropertyFormSchema; // Reuse the add schema for update validation
type UpdatePropertyFormData = AddPropertyFormData;

export async function updateProperty(
    propertyId: string,
    ownerId: string,
    formData: UpdatePropertyFormData
): Promise<{ success: boolean; message?: string }> {
     if (!propertyId || !ownerId) {
        return { success: false, message: "Missing property ID or owner ID." };
    }
     console.log(`[UpdateProperty Action] Received update for Property ID: ${propertyId}, Owner ID: ${ownerId}`);
     console.log("[UpdateProperty Action] Received Form Data:", JSON.stringify(formData, null, 2)); // Log incoming data


    const validation = UpdatePropertySchema.safeParse(formData);
    if (!validation.success) {
        console.error("[UpdateProperty Action] Validation Errors:", validation.error.flatten().fieldErrors);
        const errorMessages = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        return { success: false, message: `Validation failed: ${errorMessages}` };
    }
     console.log("[UpdateProperty Action] Validation Successful. Validated Data:", JSON.stringify(validation.data, null, 2));

    const {
        title, description, price, city, propertyType, amenities, imageUrl, panoImageUrl,
        bedrooms, bathrooms, balconies, kitchenAvailable, hallAvailable, size,
        floorNumber, totalFloors, facing, galleryImages, tags
     } = validation.data;

     let finalImageUrl = imageUrl;
     let finalPanoUrl = panoImageUrl;

     // Placeholder: Add actual image upload logic if needed before saving URLs
     console.log("[UpdateProperty Action] Processing imageUrl:", finalImageUrl);
     console.log("[UpdateProperty Action] Processing panoImageUrl:", finalPanoUrl);
     // In a real app, if files were uploaded, get their URLs here.

     try {
        const db = await getDbConnection();
        const amenitiesString = amenities && amenities.length > 0 ? JSON.stringify(amenities) : null;
        const galleryImagesString = galleryImages && galleryImages.length > 0 ? JSON.stringify(galleryImages) : null;
        const tagsString = tags && tags.length > 0 ? JSON.stringify(tags) : null;

         // Convert boolean to SQLite compatible integer (0 or 1) for update
        const kitchenAvailableInt = kitchenAvailable ? 1 : 0;
        const hallAvailableInt = hallAvailable ? 1 : 0;
        // Handle 'facing' value ('none' or '' becomes null)
        const facingValue = (facing === 'none' || facing === '') ? null : facing;

        // Fetch current status to apply correct logic
        const currentProperty = await db.get<{ status: string }>('SELECT status FROM properties WHERE id = ? AND ownerId = ?', [propertyId, ownerId]);

        if (!currentProperty) {
             console.error(`[UpdateProperty Action] Property not found for ID: ${propertyId}, Owner: ${ownerId}`);
            return { success: false, message: 'Property not found or you do not have permission.' };
        }
         console.log(`[UpdateProperty Action] Found current property status: ${currentProperty.status}`);


        // Determine the new status based on the current status
        // If currently rejected, set back to pending upon update. Otherwise, keep current status.
        const newStatus = currentProperty.status === 'rejected' ? 'pending' : currentProperty.status;
        console.log(`[UpdateProperty Action] Current Status: ${currentProperty.status}, New Status after update will be: ${newStatus}`);

        // Update query - selectively update fields provided
        // IMPORTANT: Status IS updated here: reset to 'pending' if it was 'rejected'
        const sql = `
            UPDATE properties SET
                title = ?, description = ?, price = ?, city = ?, propertyType = ?,
                amenities = ?, imageUrl = ?, panoImageUrl = ?,
                bedrooms = ?, bathrooms = ?, balconies = ?, kitchenAvailable = ?, hallAvailable = ?,
                size = ?, floorNumber = ?, totalFloors = ?, facing = ?,
                galleryImages = ?, tags = ?,
                status = ? -- Update status based on logic
            WHERE id = ? AND ownerId = ?
        `;

         const params = [
             title, description, price, city ?? null, propertyType ?? null,
             amenitiesString, finalImageUrl || null, finalPanoUrl || null,
             bedrooms ?? null, bathrooms ?? null, balconies ?? null, kitchenAvailableInt, hallAvailableInt, // Use integers
             size ?? null, floorNumber ?? null, totalFloors ?? null, facingValue, // Use processed facing value
             galleryImagesString, tagsString,
             newStatus, // Use the determined new status
             propertyId, ownerId
         ];

         console.log("[UpdateProperty Action] Executing SQL:", sql);
         console.log("[UpdateProperty Action] Parameters:", JSON.stringify(params, null, 2));


        const result = await db.run(sql, params);

         console.log("[UpdateProperty Action] DB Run Result:", result);

        if (result.changes === 0) {
             // This might happen if the data submitted is exactly the same as the current data
             // Or if the WHERE clause didn't match (propertyId/ownerId incorrect)
             console.warn(`[UpdateProperty Action] No changes detected or property not found for update (ID: ${propertyId}, Owner: ${ownerId}).`);
             // Check if the record exists to differentiate between no change and not found
             const checkExists = await db.get('SELECT 1 FROM properties WHERE id = ? AND ownerId = ?', [propertyId, ownerId]);
             if (!checkExists) {
                 console.error(`[UpdateProperty Action] Double check failed: Property not found for ID: ${propertyId}, Owner: ${ownerId}`);
                 return { success: false, message: 'Property not found or you do not have permission.' };
             }
             console.log(`[UpdateProperty Action] Property exists, but no data was changed.`);
             return { success: true, message: 'No changes detected, property details remain the same.' }; // Consider this success if no data changed
        }

        console.log(`[UpdateProperty Action] Property ${propertyId} updated by owner ${ownerId}. Rows affected: ${result.changes}.`);
        // Revalidate relevant paths AFTER successful update
        revalidatePath('/dashboard/owner/properties');
        revalidatePath(`/properties/${propertyId}`); // Revalidate the public property page
        revalidatePath('/browse'); // Revalidate browse page if details changed
        revalidatePath('/'); // Revalidate homepage
        revalidatePath('/', 'layout'); // Revalidate layout for potential summary updates

        return { success: true, message: `Property updated successfully. ${newStatus === 'pending' ? 'It is now pending verification again.' : ''}` };

    } catch (error: any) {
        console.error("[UpdateProperty Action] Database Error:", error);
        return { success: false, message: `Database Error: ${error.message || 'Failed to update property.'}` };
    }
}


// --- Request Pano Image Action ---
export async function requestPropertyPano(propertyId: string, ownerId: string): Promise<{ success: boolean; message: string }> {
    if (!propertyId || !ownerId) {
        return { success: false, message: "Missing property ID or owner ID." };
    }

    try {
        // In a real application, this would trigger a workflow:
        // 1. Save the request (e.g., in a 'panoRequests' table or update property status).
        // 2. Notify the admin (e.g., via email or an internal notification system).

        console.log(`[RequestPano Action] Owner ${ownerId} requested 360 pano for property ${propertyId}.`);

        // For now, just return success message.
        // No database change or revalidation needed for this mock implementation.
        // If a status was updated, revalidatePath('/dashboard/owner/properties'); would be needed.

        return { success: true, message: "Request for 360° image sent to admin." };

    } catch (error: any) {
        console.error("[RequestPano Action] Error:", error);
        return { success: false, message: `Error processing request: ${error.message || 'Unknown error.'}` };
    }
}

// Add other owner-specific actions here (e.g., manage bookings, view analytics)
    
