# **App Name**: OwnBroker Simplified

## Core Features:

- Property Browsing: Browse properties using filters (location, price, amenities). Display property details: photos, location, and pricing.
- Property Management: List and manage property listings with images, descriptions, and prices. Receive booking requests.
- Booking: Book a property by selecting dates and providing contact details.

## Style Guidelines:

- Primary color: Navy Blue (#0B1F3A) for navbar, footer, buttons, and key backgrounds.
- Background: Neutral White or Light Gray (#F7F7F7) for clean readability.
- Secondary color: Soft Blue (#ADD8E6) for section highlights, icons, and hover states.
- Accent: Teal (#008080) for call-to-action buttons and alerts.
- Clean and structured layout with clear visual hierarchy.
- Simple, modern icons to represent features (WiFi, AC, Rooms, etc.).
- Smooth transitions and hover animations using CSS.

## Original User Request:
Create a fully functional, modern, and visually appealing property booking platform called “OwnBroker”. This platform should allow users to browse and book properties, owners to list and manage their properties, and admins to oversee all operations. The system should be user-friendly, secure, and scalable with a professional UI inspired by a navy blue theme that builds trust and communicates reliability.

🎨 Theme & Design Guidelines
Color Scheme:

🔵 Primary Color: Navy Blue (#0B1F3A) – used for navbar, footer, buttons, and key backgrounds to establish trust and professionalism.

⚪ Background: Neutral White or Light Gray (#F7F7F7) – for clean and easy readability throughout the platform.

🔷 Secondary Color: Soft Blue (#ADD8E6) – for section highlights, icons, hover states, and secondary buttons.

🟢 Accent Color: Teal (#008080) – for call-to-action buttons, alerts, and important interactive elements.

Layout Style:

Clean and structured with clear visual hierarchy.

Use simple, modern icons to represent features (WiFi, AC, Rooms, etc.).

Responsive and mobile-first design using HTML, CSS (Bootstrap or Tailwind), JS, PHP, and MySQL.

Smooth transitions and hover animations using CSS.

🔧 Core Features
👤 1. User Role Features:
User:

Browse properties using filters (location, price, amenities).

View full property details: photos, location on map, owner profile, and pricing.

Book property by selecting dates and providing contact details.

View personal booking history and status updates (approved, pending, cancelled).

Owner:

Register/login and get redirected to the Owner Dashboard.

Upload and manage property listings with images, descriptions, prices, and availability.

Receive booking requests and approve or reject them based on availability.

Track earnings and booking history of all their properties.

Admin:

Access a powerful Admin Dashboard with full control.

Manage all users and owners: approve/suspend/delete accounts.

View all property listings and bookings.

Approve or cancel any booking across the platform.

Generate reports and monitor platform analytics (total users, bookings, revenue).

🔐 2. General Platform Features
Unified Login System with role-based redirection (user, owner, admin).

Passwords hashed with bcrypt for enhanced security.

PHP sessions to manage login and access.

Form validations and sanitization to prevent SQL Injection, XSS, and CSRF.

🗂️ 3. Database Schema (MySQL)
users: id, name, email, password, role (user/owner/admin), status

properties: id, owner_id, title, description, price, location, image, status

bookings: id, user_id, property_id, date_booked, status (pending/approved/cancelled)

messages: id, sender_id, receiver_id, message, timestamp (optional for contact/support)

💻 4. Front-End Design
Navbar (Navy Blue) with logo, Home, Browse, Login/Register, and Role-specific Dashboard buttons.

Hero Section: Eye-catching image banner with a CTA like “Find Your Ideal Home”.

Property Listings Grid: Card layout with price, thumbnail, short description, “Book Now” button (teal).

Why Choose Us Section: Icons + points like Verified Properties, KYC-Backed, Secure Booking.

Testimonials Section: Carousel of client feedback.

Subscription Plan Section for Owners with soft blue card layout.

Footer (Navy background): Contact info, quick links, newsletter form, social icons.

✉️ 5. Optional/Advanced Features
Email Notifications for booking actions (via PHPMailer).

Advanced Search Filters: By property type, rating, amenities.

Admin Analytics Panel: Charts and stats on user activity, listings, and earnings.

KYC Verification for owners using Aadhaar APIs.

Dark Mode Toggle (optional) with theme switching logic.
  