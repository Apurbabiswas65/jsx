// src/app/dashboard/owner/page.tsx (Owner Overview)
'use client';

import React, { useState, useEffect } from 'react'; // Added React import
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2, Eye, Image as ImageIcon, RefreshCcw, CheckCircle, XCircle, BarChart, MessageSquare, CalendarDays, BadgeCheck, Star, Settings, Building, Users, Clock, Check, Loader2 } from 'lucide-react'; // Added Loader2
import type { Property, BookingDetails } from '@/types/property';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation'; // Import useRouter
import { getOwnerDashboardStats } from '@/actions/ownerActions'; // Import the server action

// Placeholder for session check
async function getCurrentUserUidFromSession(): Promise<string | null> {
   if (typeof window !== 'undefined') {
       return localStorage.getItem('simulated_user_uid');
   }
   return null;
}

interface OwnerStats {
    totalProperties: number;
    pendingProperties: number; // Added
    verifiedProperties: number; // Added
    totalBookings: number;
    pendingBookings: number;
    approvedBookings: number;
}


export default function OwnerDashboardOverview() {
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      const uid = await getCurrentUserUidFromSession();
      setCurrentUserUid(uid);

      if (uid) {
          try {
            const fetchedStats = await getOwnerDashboardStats(uid);
            setStats(fetchedStats);
          } catch (error) {
            console.error("Error fetching owner dashboard stats:", error);
            toast({
              title: "Error",
              description: "Could not load dashboard statistics.",
              variant: "destructive",
            });
            setStats(null); // Set to null on error
          } finally {
            setIsLoading(false);
          }
      } else {
          setIsLoading(false);
          toast({ title: "Unauthorized", description: "Please log in.", variant: "destructive" });
          router.push('/login');
      }
    };
    fetchStats();
  }, [toast, router]);


    const renderStatCard = (title: string, value: number | string, icon: React.ElementType, link: string, linkText: string, description: string) => (
        // Updated card styles for modern UI theme
        <Card className="bg-secondary shadow-lg rounded-lg hover:shadow-xl transition-shadow duration-300 animate-in fade-in zoom-in-95">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">{title}</CardTitle>
            {React.createElement(icon, { className: "h-4 w-4 text-primary" })}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold text-primary">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
        <CardFooter>
            <Link href={link} className='w-full'>
                <Button  size="sm" className='w-full'>{linkText}</Button>
            </Link>
        </CardFooter>
        </Card>
    );


  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome & Overview Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
            <h1 className="text-3xl font-bold text-secondary-foreground">Owner Dashboard</h1>
            {/* Link to shared settings page */}
            <Link href="/dashboard/user/settings" passHref>
                <Button variant="outline">
                    <Settings className="mr-2 h-4 w-4" /> Profile Settings
                </Button>
            </Link>
        </div>

       {/* Stats Cards */}
        {isLoading ? (
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => ( // Show 4 skeleton cards
                    <Card key={i} className="shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
                        <div className="h-4 w-4 bg-muted rounded animate-pulse"></div>
                        </CardHeader>
                        <CardContent>
                        <div className="h-8 bg-muted rounded w-1/4 mb-2 animate-pulse"></div>
                        <div className="h-3 bg-muted rounded w-3/4 animate-pulse"></div>
                        </CardContent>
                        <CardFooter>
                            <div className="h-8 bg-muted rounded w-full animate-pulse"></div>
                        </CardFooter>
                    </Card>
                 ))}
             </div>
        ) : stats ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {renderStatCard("Total Properties", stats.totalProperties, Building, "/dashboard/owner/properties", "Manage Properties", `Active & Pending (${stats.pendingProperties} pending)`)}
                {renderStatCard("Total Bookings", stats.totalBookings, Users, "/dashboard/owner/bookings", "View All Bookings", "All time received bookings")}
                {renderStatCard("Pending Bookings", stats.pendingBookings, Clock, "/dashboard/owner/bookings?status=pending", "Review Pending", "Require your approval")}
                {renderStatCard("Approved Bookings", stats.approvedBookings, Check, "/dashboard/owner/bookings?status=approved", "View Approved", "Confirmed stays")}
            </div>
         ) : (
            <Card>
                <CardContent className="text-center py-8 text-muted-foreground">
                    Could not load dashboard statistics. Please try again later.
                </CardContent>
            </Card>
         )}


       {/* Quick Actions or Links - These can remain static */}
        <Card className="shadow-lg transition-shadow hover:shadow-xl animate-in fade-in-5 delay-150 duration-500">
            <CardHeader>
                <CardTitle className="text-xl text-secondary-foreground">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <Link href="/dashboard/owner/properties/add" passHref>
                     <Button variant="default" className="w-full hover:bg-primary/90 transition-colors duration-200">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add New Property
                    </Button>
                </Link>
                 <Link href="/dashboard/owner/messages" passHref>
                    <Button variant="outline" className="w-full hover:bg-accent transition-colors duration-200">
                        <MessageSquare className="mr-2 h-4 w-4" /> View Messages
                    </Button>
                 </Link>
                  <Link href="/dashboard/owner/analytics" passHref>
                    <Button variant="outline" className="w-full hover:bg-accent transition-colors duration-200">
                        <BarChart className="mr-2 h-4 w-4" /> View Analytics
                    </Button>
                </Link>
            </CardContent>
        </Card>
    </div>
  );
}
