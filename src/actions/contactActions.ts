'use server';

import { z } from 'zod';
import { getDbConnection } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { addNotification } from './userActions'; // Import notification helper

// Define the schema for the contact form data
const ContactFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
  userId: z.string().optional(), // Optional userId if user is logged in
});

export type ContactFormState = {
  message: string;
  success: boolean;
  errors?: z.ZodIssue[];
};

/**
 * Server Action to save a contact message to the database.
 * Optionally links the message to a logged-in user.
 * @param userId - Optional UID of the logged-in user.
 * @param prevState - The previous state of the form.
 * @param formData - The form data submitted by the user.
 * @returns The new state of the form, including success/error messages.
 */
export async function saveContactMessage(
  // Note: Server actions bound to forms don't easily accept extra parameters like userId.
  // Instead, we should pass userId *within* the formData itself if needed.
  // Let's adjust the schema and how we get userId.
  prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {

  // Extract userId from formData if passed (e.g., via a hidden input)
  const userId = formData.get('userId') as string | null;

  // Validate form data
  const validatedFields = ContactFormSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    subject: formData.get('subject'),
    message: formData.get('message'),
    userId: userId || undefined, // Pass userId to validation if it exists
  });

  // If validation fails, return errors
  if (!validatedFields.success) {
    console.log("[SaveContact Action] Validation Errors:", validatedFields.error.flatten().fieldErrors);
    return {
      message: 'Validation failed. Please check your input.',
      success: false,
      errors: validatedFields.error.issues,
    };
  }

  // validatedUserId will be undefined if not logged in or not passed
  const { name, email, subject, message, userId: validatedUserId } = validatedFields.data;

  // Save to database
  try {
    const db = await getDbConnection();
    const sql = `
      INSERT INTO contactMessages (userId, name, email, subject, message, timestamp, status)
      VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
    `;
    // Pass validatedUserId (which can be null) to the query
    const result = await db.run(sql, [validatedUserId ?? null, name, email, subject, message, 'unseen']);
    const messageId = result.lastID; // Get the ID of the inserted message

     console.log(`[SaveContact Action] Message saved. User ID: ${validatedUserId || 'Guest'}, Message ID: ${messageId}`);

    // --- Revalidate Paths AFTER successful save ---
    revalidatePath('/dashboard/admin/messages');
    if (validatedUserId) {
        revalidatePath('/dashboard/user/messages');
    }

     // --- Optionally notify admin (using the same notification system) ---
     // This requires fetching admin user IDs or having a designated admin recipient ID
     // For simplicity, we'll skip admin notification here, but it could be added.
     // Example:
     // const adminUsers = await db.all('SELECT uid FROM users WHERE role = "admin"');
     // for (const admin of adminUsers) {
     //     await addNotification(admin.uid, 'new_contact_message', 'New Contact Message', `Received from ${name} (${email}). Subject: ${subject}`, messageId);
     // }
     // --- End Admin Notification ---


    return { message: 'Message sent successfully!', success: true };
  } catch (error) {
    console.error("[SaveContact Action] Error saving contact message to SQLite:", error);
    return {
      message: 'Database Error: Failed to send message.',
      success: false,
    };
  }
}

    