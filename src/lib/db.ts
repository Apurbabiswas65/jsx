// src/lib/db.ts
// Example setup for SQLite using the 'sqlite3' library.
// Connection logic moved to server-side (e.g., Server Actions)
'use server'; // Ensure this module runs only on the server

import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { DEFAULT_LOGO_URL } from '@/lib/constants'; // Import default logo URL
// import bcrypt from 'bcrypt'; // Keep commented unless switching to bcrypt for seeding
import path from 'path'; // Import path for absolute path resolution

// Resolve the absolute path to the database file relative to the project root
// This assumes the script is run from the project root directory.
const DB_FILE_PATH = path.resolve(process.cwd(), './database.db');

let db: Database | null = null;
let isInitializing = false; // Flag to prevent concurrent initialization
let initializationPromise: Promise<Database> | null = null; // Promise for concurrent requests

/**
 * Initializes and returns the SQLite database connection instance.
 * Uses a singleton pattern with promise locking to avoid multiple connections and race conditions.
 * IMPORTANT: Call this function only on the server-side (Server Components, Route Handlers, Server Actions).
 */
export async function getDbConnection(): Promise<Database> {
  // console.log("[DB getDbConnection] Attempting to get connection."); // Log entry (can be noisy)

  // If db already exists and is open, return it
  if (db) {
    // console.log("[DB getDbConnection] Returning existing connection."); // Log entry (can be noisy)
    return db;
  }

  // If initialization is in progress, wait for it to complete
  if (isInitializing && initializationPromise) {
    console.log("[DB getDbConnection] Waiting for ongoing initialization...");
    try {
      const result = await initializationPromise;
      console.log("[DB getDbConnection] Ongoing initialization finished successfully."); // Log success
      return result;
    } catch (error) {
      console.error("[DB getDbConnection] Error awaiting ongoing initialization:", error); // Log error during wait
      // Rethrow the specific error encountered during initialization
      throw new Error(`Could not establish or initialize database connection: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Start initialization
  isInitializing = true;
  console.log("[DB getDbConnection] Starting new initialization process."); // Added log
  initializationPromise = (async (): Promise<Database> => {
    let newDb: Database | null = null; // Temporary variable for the connection being initialized
    try {
      // Use verbose mode for more detailed logging during development
      const verboseSqlite3 = sqlite3.verbose();
      console.log('[DB Init] Attempting to open SQLite database:', DB_FILE_PATH);
      newDb = await open({
        filename: DB_FILE_PATH,
        driver: verboseSqlite3.Database
      });
      console.log('[DB Init] SQLite connection established successfully.');

      // Run migrations or initial setup ONCE during application startup or build.
      // Avoid running this on every connection request in production.
      console.log('[DB Init] Running initial SQLite schema setup/migration...');
      // Enable foreign key constraints FIRST
      await newDb.exec('PRAGMA foreign_keys = ON;');
      console.log('[DB Init] Foreign key constraints enabled.');


      // Create tables if they don't exist - ENSURE 'uid' IS PRIMARY KEY FOR users
      // This `CREATE TABLE IF NOT EXISTS` block already includes all columns.
      await newDb.exec(`
         CREATE TABLE IF NOT EXISTS users (
           uid TEXT PRIMARY KEY, -- USE uid consistently AS PRIMARY KEY
           name TEXT NOT NULL,
           email TEXT UNIQUE NOT NULL,
           passwordHash TEXT NOT NULL, -- Store HASHED password (or plain text for testing ONLY)
           role TEXT CHECK(role IN ('user', 'owner', 'admin')) NOT NULL DEFAULT 'user',
           status TEXT CHECK(status IN ('active', 'pending', 'suspended')) NOT NULL DEFAULT 'active',
           mobile TEXT,
           avatarUrl TEXT,
           createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
           -- No separate 'userId' column --
         );

         CREATE TABLE IF NOT EXISTS properties (
             id TEXT PRIMARY KEY,
             ownerId TEXT NOT NULL, -- FK references users.uid
             title TEXT NOT NULL,
             description TEXT,
             price REAL NOT NULL,
             city TEXT,
             propertyType TEXT,
             imageUrl TEXT,
             panoImageUrl TEXT,
             amenities TEXT, -- JSON array string for amenities
             status TEXT CHECK(status IN ('pending', 'verified', 'rejected')) NOT NULL DEFAULT 'pending',
             latitude REAL,
             longitude REAL,
             bedrooms INTEGER,       -- Added bedrooms
             bathrooms INTEGER,      -- Added bathrooms
             balconies INTEGER,      -- Added balconies
             kitchenAvailable BOOLEAN, -- Added kitchenAvailable
             hallAvailable BOOLEAN,  -- Added hallAvailable
             size REAL,              -- Added size (e.g., sq.ft)
             floorNumber INTEGER,    -- Added floorNumber
             totalFloors INTEGER,    -- Added totalFloors
             facing TEXT CHECK(facing IN ('East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West')), -- Added facing
             galleryImages TEXT,     -- Added galleryImages (JSON array string)
             tags TEXT,              -- Added tags (JSON array string or comma-separated)
             createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
             FOREIGN KEY (ownerId) REFERENCES users(uid) ON DELETE CASCADE -- Reference uid
         );

         -- REMOVED ALTER TABLE STATEMENTS - Columns are defined in CREATE TABLE above
         -- ALTER TABLE properties ADD COLUMN bedrooms INTEGER; -- REMOVED
         -- ALTER TABLE properties ADD COLUMN bathrooms INTEGER; -- REMOVED
         -- ALTER TABLE properties ADD COLUMN balconies INTEGER; -- REMOVED
         -- ALTER TABLE properties ADD COLUMN kitchenAvailable BOOLEAN; -- REMOVED
         -- ALTER TABLE properties ADD COLUMN hallAvailable BOOLEAN; -- REMOVED
         -- ALTER TABLE properties ADD COLUMN size REAL; -- REMOVED
         -- ALTER TABLE properties ADD COLUMN floorNumber INTEGER; -- REMOVED
         -- ALTER TABLE properties ADD COLUMN totalFloors INTEGER; -- REMOVED
         -- ALTER TABLE properties ADD COLUMN facing TEXT CHECK(facing IN ('East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West')); -- REMOVED
         -- ALTER TABLE properties ADD COLUMN galleryImages TEXT; -- REMOVED
         -- ALTER TABLE properties ADD COLUMN tags TEXT; -- REMOVED

         CREATE TABLE IF NOT EXISTS bookings (
             id TEXT PRIMARY KEY,
             userId TEXT NOT NULL, -- FK references users.uid
             propertyId TEXT NOT NULL,
             startDate TEXT NOT NULL, -- Store dates as ISO strings or Unix timestamps
             endDate TEXT NOT NULL,
             status TEXT CHECK(status IN ('pending', 'approved', 'cancelled')) NOT NULL DEFAULT 'pending',
             bookingDate DATETIME DEFAULT CURRENT_TIMESTAMP,
             FOREIGN KEY (userId) REFERENCES users(uid) ON DELETE CASCADE, -- Reference 'uid'
             FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE CASCADE
         );

         CREATE TABLE IF NOT EXISTS contactMessages (
             id INTEGER PRIMARY KEY AUTOINCREMENT,
             userId TEXT NULL, -- FK references users.uid
             name TEXT NOT NULL,
             email TEXT NOT NULL,
             subject TEXT NOT NULL,
             message TEXT NOT NULL,
             timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
             status TEXT CHECK(status IN ('unseen', 'seen')) NOT NULL DEFAULT 'unseen',
             reply_text TEXT NULL, -- Store admin reply
             reply_timestamp DATETIME NULL, -- Timestamp of admin reply
             has_admin_reply INTEGER DEFAULT 0, -- Flag (0=false, 1=true)
             FOREIGN KEY (userId) REFERENCES users(uid) ON DELETE SET NULL -- Reference 'uid'
         );

         CREATE TABLE IF NOT EXISTS roleRequests (
             id INTEGER PRIMARY KEY AUTOINCREMENT,
             userId TEXT NOT NULL UNIQUE, -- FK references users.uid
             userName TEXT NOT NULL,
             userEmail TEXT NOT NULL,
             requestedRole TEXT NOT NULL DEFAULT 'owner',
             status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) NOT NULL DEFAULT 'pending',
             requestTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
             actionTimestamp DATETIME,
             adminNotes TEXT,
             FOREIGN KEY (userId) REFERENCES users(uid) ON DELETE CASCADE -- Reference 'uid'
         );

         CREATE TABLE IF NOT EXISTS platformSettings (
             key TEXT PRIMARY KEY,
             value TEXT
         );

         CREATE TABLE IF NOT EXISTS notifications (
             id INTEGER PRIMARY KEY AUTOINCREMENT,
             userId TEXT NOT NULL, -- FK references users.uid
             type TEXT NOT NULL, -- e.g., 'booking_status', 'role_request_status', 'admin_message', 'contact_reply'
             title TEXT NOT NULL,
             message TEXT NOT NULL,
             relatedId TEXT NULL, -- e.g., booking ID, request ID, contact message ID
             status TEXT CHECK(status IN ('unread', 'read')) NOT NULL DEFAULT 'unread',
             createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
             FOREIGN KEY (userId) REFERENCES users(uid) ON DELETE CASCADE -- Reference 'uid'
         );

         -- Add indexes for frequently queried columns
         CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
         CREATE INDEX IF NOT EXISTS idx_properties_ownerId ON properties(ownerId);
         CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
         CREATE INDEX IF NOT EXISTS idx_bookings_userId ON bookings(userId);
         CREATE INDEX IF NOT EXISTS idx_bookings_propertyId ON properties(id);
         CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
         CREATE INDEX IF NOT EXISTS idx_roleRequests_userId ON roleRequests(userId);
         CREATE INDEX IF NOT EXISTS idx_roleRequests_status ON roleRequests(status);
         CREATE INDEX IF NOT EXISTS idx_contactMessages_status ON contactMessages(status);
         CREATE INDEX IF NOT EXISTS idx_contactMessages_userId ON contactMessages(userId);
         CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications(userId);
         CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
      `);
      console.log('[DB Init] Schema creation/check finished.');

       // ----- Schema Verification after Creation -----
       try {
           await _verifySchemaInternal(newDb); // Run internal verification
           console.log('[DB Init] Schema verification passed successfully.');
       } catch (schemaError: any) {
           console.error('[DB Init] CRITICAL SCHEMA ERROR during initial verification:', schemaError.message);
           // If schema is wrong immediately after creation attempt, something is fundamentally wrong.
           if (newDb) await newDb.close();
           // Add a more specific error message indicating the schema definition itself might be wrong
           throw new Error(`Database schema creation failed verification: ${schemaError.message}. Check the CREATE TABLE statements in db.ts.`);
       }
       // ----- End Schema Verification -----


      // Seed default platform settings if they don't exist
       console.log('[DB Init] Seeding default platform settings...');
       const defaultSettings: { [key: string]: string } = {
          platformName: "OwnBroker Simplified",
          logoUrl: DEFAULT_LOGO_URL,
          maintenanceMode: 'false',
          allowNewRegistrations: 'true',
          defaultBookingFee: '5.0',
          adminEmail: "admin@ownbroker.com",
          termsAndConditions: "Please refer to the /terms page...",
       };
        const insertSettingStmt = await newDb.prepare('INSERT OR IGNORE INTO platformSettings (key, value) VALUES (?, ?)');
        for (const [key, value] of Object.entries(defaultSettings)) {
             await insertSettingStmt.run(key, value);
        }
       await insertSettingStmt.finalize();
       console.log('[DB Init] Platform settings seeding complete.');

      // Add demo users if they don't exist
      // **INSECURE**: Using plain text passwords for testing ONLY. Replace with hashed passwords in production.
      // **IMPORTANT**: Ensure these UIDs match any pre-existing UIDs if you're not deleting the DB file.
      const demoUsers = [
        { uid: 'test-owner-uid-placeholder', name: 'Owner User', email: 'owner@ownbroker.com', password: 'plaintext:Owner@123', role: 'owner', status: 'active' },
        { uid: 'test-user-uid-placeholder', name: 'Buyer User', email: 'user@ownbroker.com', password: 'plaintext:User@123', role: 'user', status: 'active' },
        { uid: 'admin-apurba-uid-placeholder', name: 'Apurba Biswas', email: 'biswas.apurba367@gmail.com', password: 'plaintext:Asusvivobook15', role: 'admin', status: 'active' },
      ];

      // Use a transaction for seeding users
      await newDb.exec('BEGIN TRANSACTION');
      try {
          const insertUserStmt = await newDb.prepare('INSERT OR IGNORE INTO users (uid, name, email, passwordHash, role, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))');
          const updateUserStmt = await newDb.prepare('UPDATE users SET name = ?, passwordHash = ?, role = ?, status = ? WHERE email = ? AND uid = ?'); // More specific update

          for (const user of demoUsers) {
             console.log(`[DB Seeding] Processing demo user: ${user.email} with intended UID: ${user.uid}`);
             // Check if email exists
             const existingUser = await newDb.get<{ uid: string, passwordHash: string }>('SELECT uid, passwordHash FROM users WHERE email = ?', user.email);

             if (!existingUser) {
                  console.log(`[DB Seeding] Inserting new demo user: ${user.email}`);
                  await insertUserStmt.run(user.uid, user.name, user.email, user.password, user.role, user.status);
             } else {
                  console.log(`[DB Seeding] Demo user ${user.email} exists (UID: ${existingUser.uid}). Checking if update needed...`);
                  // Check if password needs update (or other fields if necessary)
                  if (existingUser.passwordHash !== user.password) {
                      console.warn(`[DB Seeding] Updating password for existing demo user ${user.email}.`);
                      // Update only if the UID matches the intended UID to avoid accidental overwrites
                      // Although email is UNIQUE, this adds an extra safety check
                      const updateResult = await updateUserStmt.run(user.name, user.password, user.role, user.status, user.email, existingUser.uid);
                      if(updateResult.changes === 0) {
                          console.warn(`[DB Seeding] Update for ${user.email} affected 0 rows (UID might not match or user not found?).`);
                      } else {
                          console.log(`[DB Seeding] Updated details for ${user.email}`);
                      }
                  } else {
                      console.log(`[DB Seeding] Existing demo user ${user.email} details are up-to-date.`);
                  }
             }
          }
          await insertUserStmt.finalize();
          await updateUserStmt.finalize();
          await newDb.exec('COMMIT'); // Commit transaction
          console.log("[DB Init] Demo user seeding transaction committed.");
      } catch (seedError: any) {
          console.error("[DB Init] Error during user seeding transaction:", seedError);
          await newDb.exec('ROLLBACK'); // Rollback on error
          throw seedError; // Re-throw after rollback
      }


      db = newDb; // Assign the successfully initialized connection to the singleton variable
      isInitializing = false; // Reset the flag
      initializationPromise = null; // Clear the promise
      console.log("[DB getDbConnection] Initialization successful. Returning connection.");
      return db;

    } catch (error: any) {
       console.error(`[DB Init] Error during initialization process: ${error.message || 'Unknown error'}`, error);
       // Attempt to close the potentially opened connection if initialization failed partially
       if (newDb) {
         try {
           await newDb.close();
           console.log("[DB Init] Partially opened DB connection closed on error.");
         } catch (closeError) {
           console.error("[DB Init] Error closing DB connection after initialization failure:", closeError);
         }
       }
       isInitializing = false; // Reset flag on error
       initializationPromise = null; // Clear promise on error
       db = null; // Ensure db is null on error

       // Check specifically for the 'no such column: userId' error during initialization
       if (error.message?.includes('no such column: userId')) {
           console.error("[DB Init] CRITICAL SCHEMA ERROR: The error 'no such column: userId' occurred during initialization. This likely means the database file is using an old schema or the CREATE TABLE statements are incorrect.");
           throw new Error(`Database schema error (userId vs uid mismatch) during initialization. Please contact support or reset the database. Error: ${error.message}`);
       }
       // Catch duplicate column errors
       if (error.code === 'SQLITE_ERROR' && error.message.includes('duplicate column name')) {
          console.error("[DB Init] CRITICAL SCHEMA ERROR:", error.message, ". This likely means ALTER TABLE tried to add a column that already exists from CREATE TABLE.");
          throw new Error(`Database schema creation/update failed: ${error.message}. Check for duplicate ALTER TABLE statements in db.ts.`);
       }


      throw new Error(`Could not establish or initialize database connection: ${error.message}`);
    }
  })();

  return initializationPromise;
}

/**
 * Closes the database connection. Useful for graceful shutdown.
 * Call this function only on the server-side.
 */
export async function closeDbConnection(): Promise<void> {
    if (db) {
        console.log("[DB] Closing SQLite connection.");
        await db.close();
        db = null;
        console.log("[DB] SQLite connection closed.");
    } else {
        console.log("[DB] No active SQLite connection to close.");
    }
     // Reset initialization state as well
     isInitializing = false;
     initializationPromise = null;
}

// Optional: Handle application exit signals for cleanup
process.on('SIGINT', async () => {
  console.log('Received SIGINT. Closing DB connection...');
  await closeDbConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Closing DB connection...');
  await closeDbConnection();
  process.exit(0);
});

// --- Internal Schema Verification Helper ---
/**
 * Internal helper to verify the database schema. Should be called *after* CREATE TABLE statements.
 * Checks table existence, primary keys, and foreign keys.
 * Throws an error if critical discrepancies are found.
 * @param verifyDb - The Database connection instance to use for verification.
 */
async function _verifySchemaInternal(verifyDb: Database): Promise<void> {
    console.log('[DB Verify Schema Internal] Starting schema verification...');
    try {
        // 1. Check `users` table PK
        const usersColumns = await verifyDb.all(`PRAGMA table_info(users)`);
        if (!usersColumns || usersColumns.length === 0) throw new Error("`users` table not found.");
        const usersPk = usersColumns.find(c => c.pk > 0);
        if (!usersPk || usersPk.name !== 'uid') {
            console.error('[DB Verify Schema Internal] Users Table Columns:', usersColumns); // Log columns for debugging
            throw new Error(`'users' table Primary Key is "${usersPk?.name || 'MISSING'}", expected "uid".`);
        }
        // **Explicit check for 'userId' column**
        if (usersColumns.some(c => c.name === 'userId')) {
             console.error('[DB Verify Schema Internal] Users Table Columns:', usersColumns); // Log columns for debugging
             throw new Error("'users' table contains an unexpected 'userId' column. The Primary Key should be 'uid'.");
        }
        console.log('[DB Verify Schema Internal] `users` table PK verified as `uid`.');

        // 2. Check Foreign Keys referencing users.uid
        const checkForeignKey = async (tableName: string, columnName: string, targetTable: string, targetColumn: string) => {
            console.log(`[DB Verify Schema Internal] Checking FK: ${tableName}.${columnName} -> ${targetTable}.${targetColumn}`);
            let fks;
            try {
                fks = await verifyDb.all(`PRAGMA foreign_key_list(${tableName})`);
                 // console.log(`[DB Verify Schema Internal] FKs for ${tableName}:`, fks); // Log FKs found - Can be noisy
            } catch (fkError: any) {
                 // Handle cases where the table might not exist yet (less likely if creation is robust)
                 if (fkError.message?.includes(`no such table: ${tableName}`)) {
                     throw new Error(`Cannot verify Foreign Key for non-existent table: ${tableName}`);
                 }
                 throw fkError; // Re-throw other PRAGMA errors
            }

            const targetFk = fks.find(fk => fk.from === columnName && fk.table === targetTable);
            if (!targetFk) {
                throw new Error(`Missing Foreign Key from ${tableName}.${columnName} to ${targetTable}.${targetColumn}`);
            }
            // IMPORTANT: Check that the FK references the correct target column ('uid')
            if (targetFk.to !== targetColumn) {
                throw new Error(`Foreign Key ${tableName}.${columnName} references ${targetTable}.${targetFk.to}, expected ${targetTable}.${targetColumn}. Ensure all FOREIGN KEY constraints reference 'uid'.`);
            }
             // console.log(`[DB Verify Schema Internal] FK ${tableName}.${columnName} -> ${targetTable}.${targetColumn} verified.`); // Can be noisy
        };

        // Verify FKs referencing users.uid
        await checkForeignKey('properties', 'ownerId', 'users', 'uid');
        await checkForeignKey('bookings', 'userId', 'users', 'uid');
        await checkForeignKey('contactMessages', 'userId', 'users', 'uid');
        await checkForeignKey('roleRequests', 'userId', 'users', 'uid');
        await checkForeignKey('notifications', 'userId', 'users', 'uid');

        // Verify FKs referencing other tables (e.g., properties.id)
        await checkForeignKey('bookings', 'propertyId', 'properties', 'id');

        console.log('[DB Verify Schema Internal] All schema checks passed successfully.');

    } catch (error: any) {
        console.error('[DB Verify Schema Internal] CRITICAL SCHEMA ERROR:', error.message);
        // Don't close the connection here, let the caller handle it if necessary

        // Check specifically for 'no such column: userId' during verification - THIS IS A KEY CHECK
        if (error.message?.includes('no such column: userId')) {
             throw new Error(`Database schema verification failed: 'no such column: userId' detected. Ensure all FOREIGN KEY constraints and queries use 'uid'. Error: ${error.message}`);
        }
        // Check if the error message indicates a FK references 'userId' instead of 'uid'
        if (error.message?.includes(`references users.userId`)) { // Hypothetical error message check
             throw new Error(`Database schema verification failed: A Foreign Key likely references 'users.userId' instead of 'users.uid'. Update the FOREIGN KEY constraint. Error: ${error.message}`);
        }
        // Check if the error message indicates the PK is wrong
        if (error.message?.includes(`'users' table Primary Key is`)) {
             throw error; // Rethrow the specific PK error
        }
        // Check if error message indicates an unexpected 'userId' column exists
         if (error.message?.includes("contains an unexpected 'userId' column")) {
             throw error; // Rethrow the specific column error
         }


        throw new Error(`Database schema verification failed: ${error.message}. Check logs for details.`);
    }
}


/**
 * Public function to explicitly verify the database schema.
 * Gets a connection and calls the internal verification helper.
 * Throws an error if critical discrepancies are found.
 * It's recommended to call this during application startup in development/staging
 * or potentially before critical database operations if concerned about schema drift.
 *
 * **SECURITY NOTE (Development):** If this verification fails consistently,
 * it often indicates a mismatch between your code's expectations (e.g., CREATE TABLE statements)
 * and the actual state of the `database.db` file. The safest way to resolve this during
 * development is often to *delete the `database.db` file* and let the application recreate it
 * with the correct schema upon the next run. **Do NOT do this in production!**
 */
export async function verifyDatabaseSchema(): Promise<void> {
    console.log('[DB Verify Schema Public] Explicitly verifying database schema...');
    let verifyDb: Database | null = null;
    try {
        verifyDb = await getDbConnection(); // Get the connection (should be initialized)
        await _verifySchemaInternal(verifyDb); // Run the internal checks
        console.log('[DB Verify Schema Public] Schema verified successfully.');
    } catch (error: any) {
        console.error('[DB Verify Schema Public] Schema verification failed:', error.message);
        // Close connection if obtained specifically for verification *and* it failed
        // Although getDbConnection manages singleton, explicit close here might be needed
        // if the failure prevents normal operation. Be cautious with this.
        // if (verifyDb) { await closeDbConnection(); }

        // Rethrow the error with context, including the recommendation to delete DB file in dev
        throw new Error(`Database schema verification failed: ${error.message}. See previous logs. If in development, consider deleting database.db to recreate the schema.`);
    }
    // Note: We don't close the main connection here, as it's managed by the singleton pattern
}

// Add a security note file for clarity about password handling and UID usage
const securityNoteContent = `
**Important Security Note (SQLite Context):**

*   Storing passwords in plain text (\`'plaintext:Admin@123'\`, \`'plaintext:Owner@123'\`, \`'plaintext:User@123'\`) is **highly insecure** and should **only** be done for temporary local testing.
*   In a real application using SQLite (or any SQL database), you **must** hash the passwords using a strong hashing algorithm like bcrypt before storing them.
*   In this application (using Server Actions), the plaintext prefixing for testing is handled within the \`registerUser\` action in \`src/actions/authActions.ts\`.
*   During login, the \`loginUser\` action retrieves the \`passwordHash\` from the database for the given email and verifies the submitted password (checking for the 'plaintext:' prefix).
*   Ensure your \`users\` table schema uses the primary key \`uid TEXT PRIMARY KEY\` and references this \`uid\` in foreign keys from other tables (e.g., \`bookings.userId\`, \`properties.ownerId\`, \`roleRequests.userId\` should all reference \`users.uid\`). Do not use a separate \`userId\` column alongside \`uid\`.
`;

// Ensure the security note file exists or is created
import fs from 'fs';
const securityNotePath = path.resolve(process.cwd(), 'security_note.txt');
if (!fs.existsSync(securityNotePath)) {
  try {
    fs.writeFileSync(securityNotePath, securityNoteContent.trim(), 'utf8');
    console.log('[DB Init] security_note.txt created.');
  } catch (writeError) {
    console.error('[DB Init] Failed to write security_note.txt:', writeError);
  }
}
