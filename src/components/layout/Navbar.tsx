'use client';

import React, { useState, useEffect } from 'react'; // Import React
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
    Home, Search, LogIn, UserPlus, LayoutDashboard, Phone, LogOut,
    CalendarCheck, Settings, Briefcase, PlusCircle, Edit, Trash2, Eye,
    MessageSquare, BarChart, KeyRound, UserCog, Building, Users, ClipboardCheck, ShieldCheck, UserCheck, Loader2, Contact, Menu, Info // Added Info icon for About Us
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { DEFAULT_LOGO_URL } from '@/lib/constants';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose // Import SheetClose
} from "@/components/ui/sheet"; // Import Sheet components
import { useToast } from '@/hooks/use-toast';
import { logoutUser } from '@/actions/authActions';
import { getUserProfile } from '@/actions/userActions';
import type { UserProfileData } from '@/types/user';

// Placeholder for session/token check
async function getCurrentUserUidFromSession(): Promise<string | null> {
   if (typeof window !== 'undefined') {
      const simulatedUid = localStorage.getItem('simulated_user_uid');
      return simulatedUid || null;
   }
   return null;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // State for mobile menu

  const logoUrl = DEFAULT_LOGO_URL; // Assuming you have a default logo constant

  useEffect(() => {
      setIsMounted(true);
  }, []);

  // Fetch user profile based on session/token
  useEffect(() => {
      if (!isMounted) return;

      const fetchProfile = async () => {
          setIsLoadingAuth(true);
          const userUid = await getCurrentUserUidFromSession();

          if (userUid) {
              try {
                  const profileData = await getUserProfile(userUid);
                  if (profileData) {
                      setUserProfile(profileData);
                  } else {
                      setUserProfile(null);
                      localStorage.removeItem('simulated_user_uid');
                  }
              } catch (error) {
                  console.error("[Navbar] Error fetching user profile via Action:", error);
                  setUserProfile(null);
                  localStorage.removeItem('simulated_user_uid');
              }
          } else {
              setUserProfile(null);
          }
          setIsLoadingAuth(false);
      };

      fetchProfile();
  }, [pathname, isMounted]); // Re-fetch on path change

  const handleLogoutClick = async () => {
    try {
        await logoutUser();
        setUserProfile(null);
        localStorage.removeItem('simulated_user_uid');
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
        router.push('/');
    } catch (error) {
         console.error("Logout initiation error:", error);
         toast({ title: "Logout Failed", description: "Could not log out. Please try again.", variant: "destructive" });
    }
  };

  // Define Navigation Items based on login status
  const commonNavItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/browse', label: 'Properties', icon: Search }, // Renamed for clarity
    { href: '/contact', label: 'Contact', icon: Contact },
  ];

  const loggedInNavItems = [
    ...commonNavItems,
    { href: '/dashboard/user/bookings', label: 'My Bookings', icon: CalendarCheck }, // Added My Bookings
    { href: '/about', label: 'About', icon: Info },
  ];

  const loggedOutNavItems = [
    ...commonNavItems,
    { href: '/about', label: 'About', icon: Info },
  ];

  const navItemsForCurrentUser = userProfile ? loggedInNavItems : loggedOutNavItems;
  const userInitials = userProfile?.name ? userProfile.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'G';

  return (
    // Changed background to bg-background, text to text-foreground
    <nav className="bg-background text-foreground shadow-md sticky top-0 z-50 border-b border-border/50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary hover:opacity-90 transition-opacity">
           <Building className="h-7 w-7 text-primary" /> {/* Use primary color for icon */}
           <span className="hidden sm:inline text-primary">OwnsBroker</span> {/* Use primary color */}
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center space-x-1">
          {navItemsForCurrentUser.map((item) => {
             if (!item) return null;
             const isActive = pathname === item.href;
             return (
                <Link key={item.href} href={item.href} passHref legacyBehavior>
                <Button
                    variant='ghost'
                    size="sm"
                    className={cn(
                        "text-foreground hover:bg-accent hover:text-accent-foreground", // Adjusted hover state for light bg
                        isActive && "bg-accent text-accent-foreground font-semibold" // Adjusted active state for light bg
                    )}
                >
                    <item.icon className="mr-1.5 h-4 w-4" />
                    {item.label}
                </Button>
                </Link>
            );
           })}
        </div>

        {/* Auth/Profile & Mobile Menu Trigger */}
        <div className="flex items-center space-x-2">
          {/* Auth / User Profile Section */}
          <div className="hidden md:flex items-center space-x-2">
            {isLoadingAuth || !isMounted ? (
                 <div className="flex items-center space-x-2">
                     {/* Use muted placeholders on light background */}
                     <div className="h-9 w-9 rounded-full bg-muted animate-pulse"></div>
                     <div className="h-7 w-20 bg-muted rounded-md animate-pulse hidden lg:block"></div>
                 </div>
            ) : userProfile ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 w-auto px-2 flex items-center gap-2 text-foreground hover:bg-accent hover:text-accent-foreground"> {/* Text foreground */}
                            <Avatar className="h-7 w-7 border border-border/50"> {/* Subtle border */}
                                <AvatarImage src={userProfile.avatarUrl || undefined} alt={userProfile.name} />
                                <AvatarFallback className="bg-muted">{userInitials}</AvatarFallback> {/* Muted fallback */}
                            </Avatar>
                            <span className="text-sm font-medium hidden lg:inline text-foreground">{userProfile.name}</span> {/* Text foreground */}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-60 bg-card text-card-foreground border-border" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none text-card-foreground">{userProfile.name}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                            {userProfile.email} ({userProfile.role})
                            </p>
                        </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                         {(userProfile.role === 'user' || userProfile.role === 'owner' || userProfile.role === 'admin') && (
                             <DropdownMenuItem asChild className="text-card-foreground focus:bg-accent focus:text-accent-foreground">
                                <Link href={`/dashboard/${userProfile.role}`}>
                                    <LayoutDashboard className="mr-2 h-4 w-4" />
                                    <span>{userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)} Dashboard</span>
                                </Link>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem asChild className="text-card-foreground focus:bg-accent focus:text-accent-foreground">
                            <Link href="/dashboard/user/settings">
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Profile Settings</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogoutClick} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                 <>
                    <Link href="/login" passHref>
                        <Button variant="ghost" size="sm" className="text-foreground hover:bg-accent hover:text-accent-foreground"> {/* Text foreground */}
                            <LogIn className="mr-1.5 h-4 w-4" /> Login
                        </Button>
                    </Link>
                    <Link href="/register" passHref>
                        {/* Use primary button variant for register */}
                        <Button variant="default" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                            <UserPlus className="mr-1.5 h-4 w-4" /> Register
                        </Button>
                    </Link>
                 </>
            )}
            </div>

            {/* Mobile Menu Trigger */}
            <div className="md:hidden">
                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-foreground hover:bg-accent"> {/* Text foreground */}
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Toggle Menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] sm:w-[320px] bg-card text-card-foreground border-border"> {/* Use card bg */}
                    <SheetHeader className="mb-6 text-left border-b border-border pb-4">
                        <SheetTitle className="flex items-center gap-2 text-xl text-primary"> {/* Text primary */}
                             <Building className="h-6 w-6 text-primary" />
                            OwnsBroker
                        </SheetTitle>
                    </SheetHeader>
                    <div className="flex flex-col space-y-2">
                    {navItemsForCurrentUser.map((item) => (
                        <SheetClose asChild key={item.href}>
                            <Link href={item.href} passHref legacyBehavior>
                                <Button
                                    variant={pathname === item.href ? 'secondary' : 'ghost'} // Use secondary for active
                                    className={cn(
                                        "w-full justify-start text-base",
                                        pathname === item.href ? "bg-accent text-accent-foreground font-semibold" : "text-card-foreground hover:bg-accent hover:text-accent-foreground"
                                    )}
                                    onClick={() => setIsMobileMenuOpen(false)} // Close menu on click
                                >
                                <item.icon className="mr-2 h-5 w-5" />
                                {item.label}
                                </Button>
                            </Link>
                         </SheetClose>
                    ))}
                     <hr className="my-4 border-border" /> {/* Separator */}
                     {!isLoadingAuth && userProfile && (
                        <>
                            <SheetClose asChild>
                                <Link href={`/dashboard/${userProfile.role}`} passHref legacyBehavior>
                                    <Button variant="ghost" className="w-full justify-start text-base text-card-foreground hover:bg-accent hover:text-accent-foreground">
                                        <LayoutDashboard className="mr-2 h-5 w-5" /> Dashboard
                                    </Button>
                                </Link>
                             </SheetClose>
                             <SheetClose asChild>
                                <Link href="/dashboard/user/settings" passHref legacyBehavior>
                                    <Button variant="ghost" className="w-full justify-start text-base text-card-foreground hover:bg-accent hover:text-accent-foreground">
                                        <Settings className="mr-2 h-5 w-5" /> Settings
                                    </Button>
                                </Link>
                             </SheetClose>
                             <hr className="my-4 border-border" />
                        </>
                     )}
                    {!isLoadingAuth && !userProfile && (
                         <>
                             <SheetClose asChild>
                                <Link href="/login" passHref legacyBehavior>
                                    <Button variant="ghost" className="w-full justify-start text-base text-card-foreground hover:bg-accent hover:text-accent-foreground">
                                        <LogIn className="mr-2 h-5 w-5" /> Login
                                    </Button>
                                </Link>
                            </SheetClose>
                             <SheetClose asChild>
                                <Link href="/register" passHref legacyBehavior>
                                    <Button variant="default" className="w-full justify-start text-base bg-primary text-primary-foreground hover:bg-primary/90">
                                        <UserPlus className="mr-2 h-5 w-5" /> Register
                                    </Button>
                                </Link>
                            </SheetClose>
                         </>
                    )}
                    {!isLoadingAuth && userProfile && (
                        <Button variant="ghost" onClick={() => { handleLogoutClick(); setIsMobileMenuOpen(false); }} className="w-full justify-start text-base text-destructive hover:bg-destructive/10 hover:text-destructive">
                            <LogOut className="mr-2 h-5 w-5" /> Logout
                        </Button>
                    )}
                    </div>
                </SheetContent>
                </Sheet>
            </div>
        </div>
      </div>
    </nav>
  );
}
