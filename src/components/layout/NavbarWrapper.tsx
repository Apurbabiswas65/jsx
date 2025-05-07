
'use client';

// import React, { useEffect, useState } from 'react'; // Keep React import
import { Navbar } from './Navbar'; // Import the original Navbar component
// Import your Auth Context or session management hook if using one client-side
// import { useAuth } from '@/context/AuthContext';

export default function NavbarWrapper() {
  // Example: If using client-side auth context
  // const { user, loading } = useAuth();
  // You could pass user/loading state down to Navbar if needed,
  // but currently, Navbar fetches its own state based on session/token.

  return <Navbar />;
}
