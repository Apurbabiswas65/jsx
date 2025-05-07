-- Make sure you have a `users` table with appropriate columns.
-- Example structure:
-- CREATE TABLE users (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   name VARCHAR(255) NOT NULL,
--   email VARCHAR(255) NOT NULL UNIQUE,
--   password VARCHAR(255) NOT NULL, -- Store hashed passwords in production!
--   role ENUM('admin', 'owner', 'user') NOT NULL,
--   status ENUM('active', 'pending', 'suspended') NOT NULL DEFAULT 'active',
--   mobile VARCHAR(20),
--   avatarUrl VARCHAR(255),
--   createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- Insert Admin User
INSERT INTO users (name, email, password, role, status)
VALUES ('Admin User', 'admin@ownbroker.com', 'Admin@123', 'admin', 'active');

-- Insert Owner User
INSERT INTO users (name, email, password, role, status)
VALUES ('Property Owner', 'owner@ownbroker.com', 'Owner@123', 'owner', 'active');

-- Insert Buyer/User
INSERT INTO users (name, email, password, role, status)
VALUES ('Regular User', 'user@ownbroker.com', 'User@123', 'user', 'active');


    