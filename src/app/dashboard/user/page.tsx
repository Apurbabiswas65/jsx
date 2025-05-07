// src/app/dashboard/user/page.tsx (Buyer Overview)
'use client';

import React, { useState, useEffect } from 'react'; // Add React import
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CalendarCheck, History, Search, Settings, MessageSquare, Clock, Loader2 } from 'lucide-react'; // Added Loader2
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from '@/hooks/use-toast';
import { getUserProfile, getUserBookingsSummary } from '@/actions/userActions'; // Import server actions
import type { UserProfileData } from '@/types/user';
import { useRouter } from 'next/navigation'; // Import useRouter

interface UserBookingsSummary {
  total: number;
  upcoming: number;
  pending: number;
}

// Placeholder for session check
async function getCurrentUserUidFromSession(): Promise<string | null> {
   if (typeof window !== 'undefined') {
       return localStorage.getItem('simulated_user_uid');
   }
   return null;
}

export default function UserDashboardOverview() {
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [bookingsSummary, setBookingsSummary] = useState<UserBookingsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const uid = await getCurrentUserUidFromSession();
      setCurrentUserUid(uid);

      if (uid) {
        try {
          // Fetch profile and summary in parallel
          const [profile, summary] = await Promise.all([
            getUserProfile(uid),
            getUserBookingsSummary(uid),
          ]);

          if (profile) {
            setUserProfile(profile);
            setBookingsSummary(summary);
          } else {
            // Profile not found, likely an issue, logout/redirect
            toast({ title: "Error", description: "Could not load profile.", variant: "destructive" });
             if (typeof window !== 'undefined') localStorage.removeItem('simulated_user_uid');
             router.push('/login');
          }
        } catch (error) {
          console.error("Error fetching user dashboard data:", error);
          toast({
            title: "Error",
            description: "Could not load dashboard data.",
            variant: "destructive",
          });
           setUserProfile(null);
           setBookingsSummary(null);
        } finally {
          setIsLoading(false);
        }
      } else {
         setIsLoading(false);
         toast({ title: "Unauthorized", description: "Please log in.", variant: "destructive" });
         router.push('/login');
      }
    };
    fetchData();
  }, [toast, router]); // Add router dependency

   const renderStatCard = (title: string, value: number | string, icon: React.ElementType, link: string, linkText: string) => (
     <Card className="bg-secondary shadow-lg rounded-lg hover:shadow-xl transition-shadow duration-300 animate-in fade-in zoom-in-95">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">{title}</CardTitle>
            {React.createElement(icon, { className: "h-4 w-4 text-primary" })}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold text-primary">{value}</div>
        </CardContent>
        <CardFooter>
            <Link href={link} className='w-full'>
                <Button variant="primary" size="sm" className='w-full'>{linkText}</Button>
            </Link>
        </CardFooter>
     </Card>
   );

   const userInitials = userProfile?.name ? userProfile.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';


  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Section */}
       {isLoading ? (
            <Card className="shadow-lg bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="space-y-2">
                        <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
                        <div className="h-4 bg-muted rounded w-64 animate-pulse"></div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="h-9 w-9 bg-muted rounded-full animate-pulse"></div>
                        <div className="h-12 w-12 bg-muted rounded-full animate-pulse"></div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                         {[...Array(4)].map((_, i) => (
                             <Card key={i} className="bg-background shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
                                    <div className="h-4 w-4 bg-muted rounded animate-pulse"></div>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-8 bg-muted rounded w-1/4 mb-2 animate-pulse"></div>
                                </CardContent>
                                <CardFooter>
                                    <div className="h-8 bg-muted rounded w-full animate-pulse"></div>
                                </CardFooter>
                            </Card>
                         ))}
                    </div>
                </CardContent>
             </Card>
       ) : userProfile ? (
            <Card className="shadow-lg bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-secondary-foreground">
                        Welcome back, {userProfile.name}!
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Manage your bookings and profile information.
                    </CardDescription>
                </div>
                <div className="flex items-center space-x-4">
                    <Link href="/dashboard/user/settings" passHref>
                        <Button variant="outline" size="icon" title="Profile Settings">
                            <Settings className="h-5 w-5 text-muted-foreground" />
                        </Button>
                    </Link>
                        <Avatar className="h-12 w-12 border">
                            <AvatarImage src={userProfile.avatarUrl || undefined} alt={userProfile.name} />
                            <AvatarFallback>{userInitials}</AvatarFallback>
                        </Avatar>
                    </div>
                </CardHeader>
                <CardContent>
                     {bookingsSummary ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {renderStatCard("Total Bookings", bookingsSummary.total, History, "/dashboard/user/bookings", "View All Bookings")}
                            {renderStatCard("Upcoming Stays", bookingsSummary.upcoming, CalendarCheck, "/dashboard/user/bookings?filter=upcoming", "View Upcoming")}
                            {renderStatCard("Pending Requests", bookingsSummary.pending, Clock, "/dashboard/user/bookings?filter=pending", "View Pending")}
                            <Link href="/browse" passHref className="lg:col-start-4 flex items-center justify-center">
                                <Button className="w-full h-full text-lg" variant="default">
                                    <Search className="mr-2 h-5 w-5" /> Find Your Perfect Stay
                                </Button>
                            </Link>
                        </div>
                    ) : (
                         <div className="text-center text-muted-foreground py-4">Could not load booking summary.</div>
                    )}
                </CardContent>
            </Card>
         ) : (
              <Card>
                <CardContent className="text-center py-8 text-muted-foreground">
                    Could not load user profile. Please try logging in again.
                </CardContent>
             </Card>
         )}


       {/* Quick Actions or Links - These can remain static or be conditionally rendered */}
       {userProfile && (
            <Card className="shadow-lg transition-shadow hover:shadow-xl">
                <CardHeader>
                    <CardTitle className="text-xl text-secondary-foreground">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <Link href="/dashboard/user/bookings" passHref>
                        <Button variant="outline" className="w-full">
                            <History className="mr-2 h-4 w-4" /> My Booking History
                        </Button>
                    </Link>
                    <Link href="/dashboard/user/messages" passHref>
                        <Button variant="outline" className="w-full">
                            <MessageSquare className="mr-2 h-4 w-4" /> My Messages
                        </Button>
                    </Link>
                    <Link href="/dashboard/user/settings" passHref>
                        <Button variant="outline" className="w-full">
                            <Settings className="mr-2 h-4 w-4" /> Edit Profile
                        </Button>
                    </Link>
                    {/* Add links to other sections like Saved Properties, KYC etc. */}
                     <Link href="/dashboard/user/saved-properties" passHref>
                        <Button variant="outline" className="w-full">
                            <History className="mr-2 h-4 w-4" /> Saved Properties {/* Placeholder Icon */}
                        </Button>
                    </Link>
                     <Link href="/dashboard/user/my-room" passHref>
                        <Button variant="outline" className="w-full">
                            <History className="mr-2 h-4 w-4" /> My Room {/* Placeholder Icon */}
                        </Button>
                    </Link>
                     <Link href="/dashboard/user/kyc" passHref>
                        <Button variant="outline" className="w-full">
                            <History className="mr-2 h-4 w-4" /> KYC Status {/* Placeholder Icon */}
                        </Button>
                    </Link>
                </CardContent>
            </Card>
       )}

    </div>
  );
}
