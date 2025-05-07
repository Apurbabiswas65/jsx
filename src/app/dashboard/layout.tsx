// src/app/dashboard/layout.tsx
'use client'

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useState, useEffect, useMemo } from 'react'; // Keep useEffect, add useMemo
import { cn } from '@/lib/utils';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarTrigger,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarFooter,
  SidebarMenuSkeleton, // Import Skeleton
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
    LayoutDashboard, UserCircle, Building, Briefcase, ShieldCheck, LogOut,
    Users, ClipboardCheck, BarChart, MessageSquare, Settings, PlusCircle,
    Eye, CalendarDays, KeyRound, BadgeCheck, Loader2, UserCheck, Hourglass,
    Home, Search, Contact, Info, Heart, BedDouble, FileCheck, AlertTriangle // Added AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UserProfileData } from '@/types/user';
import { getUserProfile } from '@/actions/userActions'; // Import the Server Action
import { logoutUser } from '@/actions/authActions'; // Import the Server Action
import { NotificationList } from '@/components/ui/notification-list';

// --- Placeholder for session/token check ---
async function getCurrentUserUidFromSession(): Promise<string | null> {
   console.log("[Session Check - Layout] Simulating getting UID from session...");
   if (typeof window !== 'undefined') {
       const simulatedUid = localStorage.getItem('simulated_user_uid');
       console.log("[Session Check - Layout] Simulated UID from localStorage:", simulatedUid);
       return simulatedUid || null;
   }
   return null;
}
// --- End Placeholder ---

interface NavLink {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: ('user' | 'owner' | 'admin')[];
  subPath?: string; // Optional: Base path for this section
}

const sidebarLinks: NavLink[] = [
    // --- Common / User (Buyer) ---
    { href: '/dashboard/user', label: 'My Dashboard', icon: LayoutDashboard, roles: ['user'], subPath: '/dashboard/user' },
    { href: '/dashboard/user/bookings', label: 'My Bookings', icon: CalendarDays, roles: ['user'], subPath: '/dashboard/user/bookings' },
    { href: '/dashboard/user/saved-properties', label: 'Saved Properties', icon: Heart, roles: ['user'], subPath: '/dashboard/user/saved-properties' }, // Added Saved Properties
    { href: '/dashboard/user/my-room', label: 'My Room & Roommates', icon: BedDouble, roles: ['user'], subPath: '/dashboard/user/my-room' }, // Added My Room & Roommates
    { href: '/dashboard/user/messages', label: 'Messages', icon: MessageSquare, roles: ['user'], subPath: '/dashboard/user/messages' },
    { href: '/dashboard/user/kyc', label: 'KYC Verification', icon: FileCheck, roles: ['user'], subPath: '/dashboard/user/kyc' }, // Added KYC
    // Shared settings page for all roles
    { href: '/dashboard/user/settings', label: 'Profile Settings', icon: Settings, roles: ['user', 'owner', 'admin'], subPath: '/dashboard/user/settings' },

    // --- Owner ---
    { href: '/dashboard/owner', label: 'Owner Overview', icon: LayoutDashboard, roles: ['owner'], subPath: '/dashboard/owner' },
    { href: '/dashboard/owner/properties/add', label: 'Add Property', icon: PlusCircle, roles: ['owner'], subPath: '/dashboard/owner/properties/add' },
    { href: '/dashboard/owner/properties', label: 'My Properties', icon: Building, roles: ['owner'], subPath: '/dashboard/owner/properties' },
    { href: '/dashboard/owner/bookings', label: 'Received Bookings', icon: ClipboardCheck, roles: ['owner'], subPath: '/dashboard/owner/bookings' }, // Renamed from Enquiries
    { href: '/dashboard/owner/messages', label: 'Enquiries', icon: MessageSquare, roles: ['owner'], subPath: '/dashboard/owner/messages' }, // Kept name Enquiries for consistency? Changed to Messages to match user's
    { href: '/dashboard/owner/analytics', label: 'Analytics', icon: BarChart, roles: ['owner'], subPath: '/dashboard/owner/analytics' }, // Kept Analytics

    // --- Admin ---
    { href: '/dashboard/admin', label: 'Admin Overview', icon: ShieldCheck, roles: ['admin'], subPath: '/dashboard/admin' },
    { href: '/dashboard/admin/users', label: 'Manage Users', icon: Users, roles: ['admin'], subPath: '/dashboard/admin/users' },
    { href: '/dashboard/admin/properties', label: 'Manage Properties', icon: Building, roles: ['admin'], subPath: '/dashboard/admin/properties' },
    { href: '/dashboard/admin/bookings', label: 'Manage Bookings', icon: ClipboardCheck, roles: ['admin'], subPath: '/dashboard/admin/bookings' },
    { href: '/dashboard/admin/role-requests', label: 'Role Requests', icon: UserCheck, roles: ['admin'], subPath: '/dashboard/admin/role-requests' }, // New Role Requests link
    { href: '/dashboard/admin/messages', label: 'User Messages', icon: MessageSquare, roles: ['admin'], subPath: '/dashboard/admin/messages' },
    { href: '/dashboard/admin/reports', label: 'Manage Reports', icon: ClipboardCheck, roles: ['admin'], subPath: '/dashboard/admin/reports' }, // Added Manage Reports link
    { href: '/dashboard/admin/settings', label: 'Platform Settings', icon: Settings, roles: ['admin'], subPath: '/dashboard/admin/settings' }, // Admin specific settings
    // Admin also uses the shared /dashboard/user/settings for their own profile
];


export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Loading state for profile fetching
  const [isMounted, setIsMounted] = useState(false); // State to track client mount
  const [fetchError, setFetchError] = useState<string | null>(null); // State to track fetch errors

  // Set isMounted to true after component mounts on the client
  useEffect(() => {
    setIsMounted(true);
  }, []);


  // Fetch user profile based on session/token on mount and pathname change
  useEffect(() => {
     // Only run fetch logic on the client side
     if (!isMounted) return;

     const fetchProfile = async () => {
         setIsLoading(true);
         setFetchError(null); // Reset error on new fetch attempt
         console.log(`[Layout] Checking profile for path: ${pathname}`);
         // Check for session/token to get UID
         const userUid = await getCurrentUserUidFromSession(); // Implement this function

         if (userUid) {
             console.log(`[Layout] Found UID ${userUid} in session. Fetching profile...`);
             try {
                // --- Fetch user role using Server Action ---
                const profileData = await getUserProfile(userUid);

                if (profileData) {
                    console.log("[Layout] Profile fetched successfully:", profileData);
                    setUserProfile(profileData);
                    setFetchError(null); // Clear any previous error

                    // --- Authorization & Redirection Logic ---
                    if (pathname.startsWith('/dashboard')) {
                        console.log(`[Layout] Verifying access for user ${profileData.uid} (Role: ${profileData.role}, Status: ${profileData.status}) to path: ${pathname}`);

                        const isSettingsPage = pathname === '/dashboard/user/settings';
                        // Allow access if the path STARTS WITH the expected base path for the role
                        const expectedBasePath = `/dashboard/${profileData.role}`;

                        // 1. ALWAYS ALLOW ACCESS to the shared settings page if logged in.
                        if (isSettingsPage) {
                            console.log(`[Layout] Allowing access to settings page: ${pathname}`);
                        }
                        // 2. Redirect suspended users to settings (they can only manage profile/delete)
                        else if (profileData.status === 'suspended') {
                            console.log(`[Layout] Redirecting suspended user from ${pathname} to settings`);
                            toast({ title: "Account Suspended", description: "Your account is suspended. Contact support.", variant: "destructive" });
                            router.replace('/dashboard/user/settings'); // Redirect to settings
                        }
                        // 3. Handle PENDING owners
                        else if (profileData.role === 'owner' && profileData.status === 'pending') {
                            const allowedPendingPaths = ['/dashboard/owner', '/dashboard/user/settings']; // Overview and Settings
                            // Allow access only if the current path *exactly* matches one of the allowed paths
                            if (!allowedPendingPaths.includes(pathname)) {
                                console.log(`[Layout] Redirecting PENDING owner from restricted path ${pathname} to /dashboard/owner`);
                                toast({ title: "Account Pending", description: "Your owner account is pending approval.", variant: "default" });
                                router.replace('/dashboard/owner');
                            } else {
                                console.log(`[Layout] Allowing PENDING owner access to ${pathname}`);
                            }
                        }
                        // 4. Check if the path starts with the expected base path for the user's role
                        //    OR if it's the user role accessing their own dashboard sections
                        else if (!pathname.startsWith(expectedBasePath) && !(profileData.role === 'user' && pathname.startsWith('/dashboard/user'))) {
                             // Special case: Admins and Owners might access /dashboard/user/settings, which is fine (handled above)
                             // But if an admin tries /dashboard/owner, or user tries /dashboard/admin, redirect them.
                            console.log(`[Layout] Role mismatch: User role '${profileData.role}' accessing path '${pathname}'. Expected base: '${expectedBasePath}'. Redirecting...`);
                            router.replace(expectedBasePath); // Redirect to their correct dashboard base
                        }
                        // 5. If none of the above conditions met, access is granted
                        else {
                           console.log(`[Layout] Access granted for user role '${profileData.role}' to path ${pathname}`);
                        }
                    }
                     // --- End Authorization & Redirection ---

                } else {
                   // User UID exists in session, but profile not found in DB.
                   // This indicates an inconsistency.
                   console.error("[Layout] Profile Error: User profile not found in DB for UID:", userUid, "Path:", pathname);
                   setUserProfile(null); // Clear profile state
                   setFetchError("Your profile could not be loaded. Please log in again."); // Set specific error
                   // --- FORCE LOGOUT AND REDIRECT ---
                   localStorage.removeItem('simulated_user_uid'); // Clear the invalid session UID
                   router.push('/login'); // Redirect to login
                   return; // Exit the function early after redirect
                   // --- END FORCE LOGOUT ---
                }
             } catch (error: any) {
                  // General error fetching profile (network issue, server action error)
                  console.error("[Layout] Error fetching user profile:", error, "Path:", pathname);
                  setUserProfile(null);
                  setFetchError(`Failed to load profile: ${error.message || 'Please try again later.'}`);
                  // Don't redirect here immediately, let the UI render the error state initially
                  // But maybe consider logout/redirect if it's a critical fetch error
                   // --- FORCE LOGOUT ON FETCH ERROR (Optional but safer) ---
                   localStorage.removeItem('simulated_user_uid'); // Clear potentially problematic session
                   router.push('/login');
                   return;
                  // --- END FORCE LOGOUT ---
             }
         } else {
             // No user UID found in session/token
             console.log("[Layout] No user UID in session.", "Path:", pathname);
             setUserProfile(null);
             setFetchError(null); // No fetch error, just not logged in.
             // Redirect to login ONLY if trying to access dashboard routes while not logged in
             if (pathname.startsWith('/dashboard')) {
                 console.log("[Layout] Not logged in, redirecting to login for path:", pathname);
                 router.push('/login');
                 return; // Exit early
             }
         }
         // Ensure isLoading is set to false *only* after all checks/redirects/state updates
         setIsLoading(false);
     };

     fetchProfile();
  }, [pathname, router, toast, isMounted]); // Add isMounted to dependency array


   // Filter links based on the current user role AND status using useMemo
   const allowedLinks = useMemo(() => {
       if (!userProfile) return []; // No user, no links

        console.log(`[Layout] Filtering links for role: ${userProfile.role}, status: ${userProfile.status}`);

       return sidebarLinks.filter(link => {
            // Always show Profile Settings link if user is logged in
            if (link.href === '/dashboard/user/settings') {
                 console.log(`[Layout Link Filter] Allowing settings link: ${link.href}`);
                return true;
            }

            // Check role first
            if (!link.roles.includes(userProfile.role)) {
                // console.log(`[Layout Link Filter] Hiding link due to role mismatch: ${link.href} (User: ${userProfile.role}, Required: ${link.roles})`);
                return false;
            }

            // Handle special cases based on status AFTER role match
            if (userProfile.status === 'suspended') {
                // console.log(`[Layout Link Filter] Hiding link for suspended user (except settings): ${link.href}`);
                return false; // Only settings is allowed (handled above)
            }

            if (userProfile.role === 'owner' && userProfile.status === 'pending') {
                const allowedPendingPaths = ['/dashboard/owner', '/dashboard/user/settings']; // Keep Owner Overview & Settings
                if (!allowedPendingPaths.includes(link.href)) {
                     console.log(`[Layout Link Filter] Hiding link for PENDING owner: ${link.href}`);
                    return false;
                }
            }

            // If none of the above exclusion rules apply, show the link
            console.log(`[Layout Link Filter] Allowing link: ${link.href}`);
            return true;
        });
   }, [userProfile]); // Recalculate only when userProfile changes


  const isActive = (link: NavLink) => {
     // Exact match or if subPath is defined and pathname starts with subPath
      return pathname === link.href || (link.subPath && pathname.startsWith(link.subPath));
  };

   const handleLogout = async (showToast = true) => {
    try {
        await logoutUser(); // Call the server action
        setUserProfile(null); // Clear local profile state
        setFetchError(null); // Clear any errors
        if (typeof window !== 'undefined') {
            localStorage.removeItem('simulated_user_uid'); // Use actual session clearing
             console.log("[Logout] Cleared simulated UID.");
        }
         if (showToast) {
            toast({ title: "Logged Out", description: "You have been successfully logged out." });
         }
        // Redirect happens client-side
        router.push('/'); // Redirect to home page after logout
    } catch (error) {
         console.error("Logout initiation error:", error);
          if (showToast) {
            toast({ title: "Logout Failed", description: "Could not log out. Please try again.", variant: "destructive" });
          }
    }
  };

   // --- Loading UI ---
   if (!isMounted || isLoading) {
        if (pathname.startsWith('/dashboard')) {
            return (
                <SidebarProvider defaultOpen>
                    <Sidebar side="left" collapsible="icon" className="bg-primary text-secondary">
                        <SidebarHeader>
                            <div className="flex justify-between items-center p-2">
                                <span className="font-semibold text-lg text-secondary group-data-[state=collapsed]:hidden">OwnBroker</span>
                                <span className="font-semibold text-lg text-secondary group-data-[state=expanded]:hidden">OB</span>
                                <SidebarTrigger />
                            </div>
                        </SidebarHeader>
                        <SidebarContent>
                            <SidebarMenu>
                                {[...Array(6)].map((_, i) => (
                                    <SidebarMenuItem key={i}>
                                        <SidebarMenuSkeleton showIcon />
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarContent>
                        <SidebarFooter>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuSkeleton showIcon />
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarFooter>
                    </Sidebar>
                    <SidebarInset className="container mx-auto px-4 py-8 animate-in fade-in duration-300">
                        <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        </div>
                    </SidebarInset>
                </SidebarProvider>
            );
        } else {
            return <>{children}</>;
        }
    }

   // --- Not Logged In & Accessing Dashboard ---
   if (isMounted && !isLoading && !userProfile && !fetchError && pathname.startsWith('/dashboard')) {
        // Redirect is handled in useEffect, show loading indicator until redirect completes
        return (
             <div className="container mx-auto px-4 py-8 animate-in fade-in duration-300">
                 <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mr-3" /> Redirecting to login...
                </div>
             </div>
        );
   }

   // --- Fetch Error State ---
   if (isMounted && !isLoading && fetchError && pathname.startsWith('/dashboard')) {
        // If profile not found error occurred, redirect already happened in useEffect
        // Show error for other fetch issues
        return (
            <div className="container mx-auto px-4 py-8 animate-in fade-in duration-300">
                 <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center">
                     <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                     <h2 className="text-xl font-semibold text-destructive mb-2">Session Error</h2>
                     <p className="text-muted-foreground mb-4">{fetchError}</p>
                     <Button onClick={() => router.push('/login')}>Go to Login</Button>
                 </div>
             </div>
        );
   }

  // --- Render Full Dashboard (if profile loaded successfully) ---
   if (isMounted && !isLoading && userProfile) {
       return (
            <SidebarProvider defaultOpen>
                <Sidebar side="left" collapsible="icon" className="bg-primary text-secondary">
                    <SidebarHeader>
                        <div className="flex justify-between items-center p-2">
                            <Link href="/" className="font-semibold text-lg text-secondary group-data-[state=collapsed]:hidden">OwnBroker</Link>
                            <span className="font-semibold text-lg text-secondary group-data-[state=expanded]:hidden">OB</span>
                            <SidebarTrigger />
                        </div>
                    </SidebarHeader>
                    <SidebarContent>
                        <SidebarMenu>
                            {allowedLinks.map((link) => (
                                <SidebarMenuItem key={link.href}>
                                    <Link href={link.href} passHref legacyBehavior>
                                        <SidebarMenuButton
                                            isActive={isActive(link)}
                                            tooltip={link.label}
                                            className={cn(
                                                'transition-all duration-200 ease-in-out',
                                                isActive(link) ? 'bg-accent text-secondary hover:bg-accent/90' : 'hover:bg-secondary hover:text-primary'
                                            )}
                                        >
                                            <link.icon />
                                            <span>{link.label}</span>
                                        </SidebarMenuButton>
                                    </Link>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                        <NotificationList role={userProfile?.role} />
                    </SidebarContent>
                    <SidebarFooter>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton tooltip="Logout" onClick={() => handleLogout()} className="transition-colors duration-200 ease-in-out hover:bg-destructive/10 hover:text-destructive">
                                    <LogOut />
                                    <span>Logout</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarFooter>
                </Sidebar>

                {/* Add container classes here for dashboard content */}
                <SidebarInset className="container mx-auto px-4 py-8 animate-in fade-in duration-500">
                    {children}
                </SidebarInset>
            </SidebarProvider>
       );
   }

    // --- Fallback for Non-Dashboard Routes or initial server render ---
    if (!pathname.startsWith('/dashboard')) {
         return <>{children}</>; // Render children directly, assumes Navbar is already in RootLayout
    }

    // Should not be reached in most cases, but provide a minimal fallback
    console.log("[Layout Fallback] Rendering minimal fallback (shouldn't happen often).");
    return <div className="text-center p-10">Loading layout...</div>;
}
