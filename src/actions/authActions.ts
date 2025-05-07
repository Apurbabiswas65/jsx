// src/actions/authActions.ts
'use server';

import { z } from 'zod';
import { getDbConnection, verifyDatabaseSchema } from '@/lib/db'; // Added verifyDatabaseSchema import
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcrypt';
import crypto from 'crypto'; // Keep for UUID generation in registration
import type { Database } from 'sqlite'; // Import Database type for type hinting

// ----- LOGIN -----

const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormState = {
  message: string;
  success: boolean;
  redirectTo?: string; // Path to redirect to on successful login
  uid?: string; // Add UID to the state for session simulation
  errors?: z.ZodIssue[];
};

export async function loginUser(
  prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  console.log("[Login Action] Attempting login...");
  const validatedFields = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    console.log("[Login Action] Validation Errors:", validatedFields.error.flatten().fieldErrors);
    return {
      message: 'Invalid fields provided.',
      success: false,
      errors: validatedFields.error.issues,
    };
  }

  const { email, password } = validatedFields.data;
  console.log(`[Login Action] Validated email: ${email}`);

  let db: Database | null = null; // Initialize db as potentially null
  try {
    // --- VERIFY DB SCHEMA ---
    try {
      // Run verification check first. This will throw if schema is incorrect.
      await verifyDatabaseSchema();
      console.log("[Login Action] Database schema verified successfully before login attempt.");
    } catch (schemaError: any) {
      console.error("[Login Action] CRITICAL SCHEMA ERROR:", schemaError.message);
      return {
        // Return the specific error from verifyDatabaseSchema
        message: `Login failed due to a database schema issue: ${schemaError.message}`,
        success: false,
      };
    }
    // --- END SCHEMA VERIFICATION ---

    // Try establishing DB connection
    try {
      console.log("[Login Action] Attempting to get DB connection...");
      db = await getDbConnection();
      console.log(`[Login Action] SQLite connection obtained for email: ${email}`);
    } catch (dbError: any) {
      console.error("[Login Action] CRITICAL: Could not get database connection.", dbError);
      return {
        message: `Login error: Database connection failed. ${dbError.message || ''}`, // More specific error
        success: false
      };
    }


    // 1. Find user by email in SQLite
    console.log(`[Login Action] Querying database for email: ${email}...`);
    // --- ENSURE QUERY USES 'uid' AS THE PRIMARY IDENTIFIER ---
    // THIS IS THE MOST LIKELY PLACE FOR THE 'no such column: userId' ERROR
    const userQuery = 'SELECT uid, passwordHash, role, status FROM users WHERE email = ?';
    type UserData = { uid: string, passwordHash: string, role: 'user' | 'owner' | 'admin', status: 'active' | 'pending' | 'suspended' };
    let userData: UserData | undefined;

    try {
         console.log(`[Login Action] Executing query: ${userQuery} with params: [${email}]`);
         userData = await db.get<UserData>(userQuery, email);
    } catch (queryError: any) {
        console.error(`[Login Action] Database query error while fetching user ${email}:`, queryError);
         // --- Explicitly check for 'userId' vs 'uid' column errors ---
        if (queryError.message?.includes('no such column: userId')) {
            console.error("[Login Action] CRITICAL SCHEMA ERROR: Query failed because 'userId' column was referenced instead of 'uid'.");
            return { message: 'Database schema error (userId vs uid mismatch). Please contact support or reset the database.', success: false };
        }
         if (queryError.message?.includes('no such column: uid')) {
            console.error("[Login Action] CRITICAL SCHEMA ERROR: Query failed because 'uid' column does not exist. Database schema is likely outdated or incorrect.");
            return { message: 'Database schema error (missing uid). Please contact support or reset the database.', success: false };
        }
        // --- Specific check for general table issue ---
        if (queryError.message?.includes('no such table: users')) {
             console.error("[Login Action] CRITICAL DB ERROR: Query failed because 'users' table does not exist.");
             return { message: 'Database error (missing users table). Please contact support or reset the database.', success: false };
        }
        // General query error
        return { message: `Database query error: ${queryError.message || 'Failed to retrieve user.'}`, success: false };
    }

    console.log(`[Login Action] SQLite user data query result for email ${email}:`, userData ? `User Found (UID: ${userData.uid}, Role: ${userData.role}, Status: ${userData.status})` : 'User Not Found');

    if (!userData) {
        console.warn(`[Login Action] User not found in SQLite for email: ${email}`);
        return { message: 'Invalid email or password.', success: false };
    }

    // 2. Verify password using bcrypt or plain text check
    let passwordMatch = false;
    if (!userData.passwordHash) {
         console.error(`[Login Action] No password hash/plaintext found for user: ${email} (UID: ${userData.uid})`);
         return { message: 'User account configuration error (no password).', success: false };
    }

    // Check if passwordHash indicates plaintext storage (INSECURE - for testing only)
    if (userData.passwordHash.startsWith('plaintext:')) {
        console.log(`[Login Action] Comparing plain text password for ${email}`);
        const storedPlainPassword = userData.passwordHash.substring(10); // Extract password after 'plaintext:'
        if (password === storedPlainPassword) { // Direct comparison
            passwordMatch = true;
            console.log(`[Login Action] Plain text password verified for email: ${email}`);
        } else {
             console.warn(`[Login Action] Password mismatch (plain text test) for email: ${email}. Provided: "${password}", Stored: "${storedPlainPassword}"`);
        }
    } else {
        // Assume bcrypt hash if not plaintext
        console.log(`[Login Action] Comparing bcrypt hash for ${email}`);
        try {
             // Ensure passwordHash is not null or undefined before comparing
             if (userData.passwordHash) {
                 passwordMatch = await bcrypt.compare(password, userData.passwordHash);
                 if (passwordMatch) {
                     console.log(`[Login Action] Bcrypt password verified for email: ${email}`);
                 } else {
                     console.warn(`[Login Action] Password mismatch (bcrypt) for email: ${email}`);
                 }
             } else {
                  console.error(`[Login Action] bcrypt comparison skipped: passwordHash is null/undefined for user ${email}`);
                  return { message: 'User account configuration error (missing hash).', success: false };
             }

        } catch (compareError: any) {
            console.error(`[Login Action] bcrypt.compare error for user ${email}:`, compareError);
            return { message: 'Password verification error.', success: false };
        }
    }


    if (!passwordMatch) {
        console.log(`[Login Action] Final password match status for ${email}: FAILED`);
        return { message: 'Invalid email or password.', success: false };
    }
     console.log(`[Login Action] Final password match status for ${email}: SUCCESS`);


    // 3. Check user status
    if (userData.status !== 'active') {
        console.warn(`[Login Action] User account is not active for email: ${email}. Status: ${userData.status}`);
        const statusMessage = userData.status === 'pending' ? 'Your account is pending approval.' :
                              userData.status === 'suspended' ? 'Your account has been suspended.' :
                              'Your account is inactive.';
        return { message: statusMessage, success: false };
    }

     // 4. Check user role and determine redirect path
     if (!userData.role || !['user', 'owner', 'admin'].includes(userData.role)) {
        console.error(`[Login Action] Invalid or missing role for email: ${email}. Role: ${userData.role}`);
        return { message: 'User profile configuration error. Please contact support.', success: false };
     }

     const role = userData.role;
     let redirectTo = '/dashboard/user'; // Default redirect for 'user' role
     if (role === 'admin') redirectTo = '/dashboard/admin';
     else if (role === 'owner') redirectTo = '/dashboard/owner';

     console.log(`[Login Action] SQLite login successful for ${email} (Role: ${role}). Redirecting to ${redirectTo}`);

     // 5. Login successful (SQLite only). Revalidate relevant paths.
     revalidatePath('/', 'layout'); // Revalidate layout to update navbar/state

     // Return necessary user info (like UID, role) for client-side session/token handling
     return {
        message: 'Login successful!',
        success: true,
        redirectTo: redirectTo,
        uid: userData.uid // Return the user's UID
     };

  } catch (error: any) {
    console.error("[Login Action] General Error:", error); // Log the full error object

    let message = 'Login failed. Please check your credentials or try again later.';
    // --- Check for specific error messages ---
    if (error.message?.includes('Database connection failed')) {
         message = `Login error: Database connection failed. ${error.message}`;
    } else if (error.message?.includes('Could not establish or initialize database connection')) {
         message = `Login error: ${error.message}`; // Use the detailed error message
    } else if (error.message?.includes('Database schema error (userId vs uid mismatch)')) { // Specific schema mismatch
        console.error(`[Login Action] CRITICAL SCHEMA ERROR: ${error.message}`);
        message = error.message; // Use the specific message from the query catch block
    } else if (error.message?.includes('Database schema verification failed')) { // Catch verification error
        message = `Login error: ${error.message}`; // Use the detailed verification error
    } else if (error instanceof Error) {
        message = `Login error: ${error.message}`; // Use generic error message if available
    }

    return { message: message, success: false };
  } finally {
    // Connection managed elsewhere (singleton pattern in getDbConnection)
    console.log("[Login Action] Action finished.");
  }
}


// ----- REGISTRATION -----

const RegisterSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  mobile: z.string().min(10, "Mobile number is required"), // Basic length check
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  termsAccepted: z.literal('on', { errorMap: () => ({ message: "You must accept the terms" }) }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], // Path of error
});


export type RegisterFormState = {
  message: string;
  success: boolean;
  errors?: z.ZodIssue[];
};

export async function registerUser(
  prevState: RegisterFormState,
  formData: FormData
): Promise<RegisterFormState> {
  console.log("[Register Action] Attempting registration...");

  const validatedFields = RegisterSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    mobile: formData.get('mobile'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
    termsAccepted: formData.get('terms'),
  });


  if (!validatedFields.success) {
     console.log("[Register Action] Validation Errors:", validatedFields.error.flatten().fieldErrors);
    return {
      message: 'Validation failed. Please check your input.',
      success: false,
      errors: validatedFields.error.issues,
    };
  }

  const { name, email, mobile, password } = validatedFields.data;
  console.log(`[Register Action] Validated data for email: ${email}`);

   let db: Database | null = null; // Initialize db as potentially null
   let userUid: string | null = null; // Keep track of UID for potential rollback/logging

  try {
    // --- VERIFY DB SCHEMA FIRST ---
    try {
        await verifyDatabaseSchema();
         console.log("[Register Action] Database schema verified successfully before registration attempt.");
    } catch (schemaError: any) {
        console.error("[Register Action] CRITICAL SCHEMA ERROR:", schemaError.message);
        return {
            // Use the specific message from verifyDatabaseSchema
            message: `Registration failed due to a database schema issue: ${schemaError.message}`,
            success: false,
        };
    }
    // --- END SCHEMA VERIFICATION ---

    // 1. Generate a unique ID (UUID) for the user
    userUid = crypto.randomUUID();
    console.log(`[Register Action] Generated UID: ${userUid}`);

    // 2. Hash the password securely using bcrypt
    let passwordToStore: string;
    try {
        // Store plain text password prefixed for testing ONLY (use bcrypt in production)
        passwordToStore = `plaintext:${password}`;
        console.log(`[Register Action] Storing plain text password (TESTING ONLY) for ${email}.`);
        // --- PRODUCTION CODE ---
        // const saltRounds = 10; // Recommended salt rounds
        // passwordToStore = await bcrypt.hash(password, saltRounds);
        // console.log(`[Register Action] Password hashed successfully for ${email}.`);
        // --- END PRODUCTION CODE ---
    } catch (hashError: any) {
        console.error("[Register Action] Password Processing Error:", hashError);
        return { message: `Password processing error: ${hashError.message || 'Processing failed.'}`, success: false };
    }


    // 3. Save user data directly to SQLite
     try {
         console.log("[Register Action] Attempting to get DB connection...");
        db = await getDbConnection(); // Assign db connection
         console.log("[Register Action] DB connection obtained.");
    } catch (dbError: any) {
        console.error("[Register Action] CRITICAL: Could not get database connection.", dbError);
        return {
            message: `Registration failed: Database connection error. ${dbError.message || ''}`,
            success: false
        };
    }

    console.log(`[Register Action] Attempting to insert user into SQLite for UID: ${userUid}`);
    // --- USE uid AS THE PRIMARY KEY IN THE INSERT ---
    const sql = `
      INSERT INTO users (uid, name, email, mobile, passwordHash, role, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `;
    // Default role is 'user', status is 'active' for new registrations
     let result;
     try {
         // Ensure 'uid' is passed correctly as the first parameter
         result = await db.run(sql, [userUid, name, email, mobile, passwordToStore, 'user', 'active']);
     } catch (insertError: any) {
          console.error(`[Register Action] SQLite insert error for email: ${email} (UID: ${userUid})`, insertError);
          // Check for specific errors
          if (insertError.code === 'SQLITE_CONSTRAINT_UNIQUE' || insertError.message?.includes('UNIQUE constraint failed: users.email')) {
              return { message: 'This email address is already registered.', success: false };
          } else if (insertError.message?.includes('no such table: users')) {
               console.error("[Register Action] CRITICAL DB ERROR: Insert failed because 'users' table does not exist.");
               return { message: 'Database error (missing users table). Please contact support or reset the database.', success: false };
          } else if (insertError.message?.includes('no such column: userId')) { // Catch specific schema error during INSERT
                console.error(`[Register Action] CRITICAL SCHEMA ERROR during INSERT: ${insertError.message}`);
                return { message: 'Database schema error (userId vs uid). Please contact support or reset the database.', success: false };
          } else if (insertError.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' && insertError.message?.includes('users.uid')) {
               // Handle potential UID collision (extremely unlikely with UUIDs, but possible if manually setting)
               console.error(`[Register Action] CRITICAL ERROR: UID collision for generated UID ${userUid}. This should not happen with UUIDs.`);
               return { message: 'Internal error generating unique user ID. Please try again.', success: false };
          }
          // Throw other insert errors to be caught by the general catch block
          throw insertError;
     }


    // Check if insertion was successful
     if (!result || result.changes === 0 ) { // lastID might be null or 0 for TEXT PKs, so rely on changes
          console.error(`[Register Action] SQLite insert failed for email: ${email} (UID: ${userUid}). No rows affected.`);
          // Attempt to find if user exists already (double-check for race conditions or previous errors)
           const existingUser = await db.get('SELECT uid FROM users WHERE email = ?', email);
           if (existingUser) {
                console.warn(`[Register Action] User already exists with email: ${email}`);
                return { message: 'This email address is already registered.', success: false };
           }
          throw new Error("Database insert failed unexpectedly."); // Throw a generic error if constraint didn't catch it
     }

    console.log(`[Register Action] User successfully inserted into SQLite for UID: ${userUid}, Changes: ${result.changes}`);


    // Revalidate paths after successful registration? Maybe not necessary until login.
    // revalidatePath('/login');

    return { message: 'Registration successful! Please login.', success: true };

  } catch (error: any) {
    console.error("[Register Action] Registration Database/Operation Error:", error); // Log the full error

    let message = 'Could not create account. Please try again.'; // Default error message

    // Handle potential SQLite errors specifically (already handled above, but keep as fallback)
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || (error.message && error.message.includes('UNIQUE constraint failed: users.email'))) {
        message = 'This email address is already registered.';
        console.warn(`[Register Action] SQLite insert constraint violation for email: ${email}.`);
    } else if (error instanceof Error && error.message?.includes('Database connection error')) { // Check for DB connection error message
         message = 'Database connection error during registration.';
    } else if (error.message?.includes('SQLITE_ERROR: no such column: userId')) { // Catch specific schema error
        console.error(`[Register Action] CRITICAL SCHEMA ERROR: ${error.message}`);
        message = 'Database schema error (userId vs uid). Please contact support or reset the database.';
    } else if (error instanceof Error) {
         message = `Registration failed: ${error.message}`; // Use error message if available
    } else {
         message = 'An unknown error occurred during registration.';
    }

    return { message: message, success: false };
  } finally {
     // Connection managed elsewhere
     console.log("[Register Action] Action finished.");
  }
}


// ----- LOGOUT -----

export async function logoutUser() {
  // Primary action needed is to clear the session token/cookie.
  // Since we are using client-side storage simulation, this action mainly signals revalidation.

  // TODO: Implement actual server-side session invalidation if applicable.
  console.log("[Logout Action] Server action triggered for logout. Revalidating path.");

  revalidatePath('/', 'layout'); // Revalidate layout to update navbar (trigger profile re-fetch which should fail)
  // Client-side will handle removing local storage and redirecting.
}
