// src/app/dashboard/admin/page.tsx (Admin Overview)
'use client';

import React, { useState, useEffect } from 'react'; // Added React import
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Users, Building, ClipboardCheck, CalendarCheck, Settings, ShieldCheck, MessageSquare, UserCheck, Hourglass, Loader2 } from 'lucide-react'; // Import icons
import { getAdminDashboardStats } from '@/actions/adminActions'; // Import the server action
import { useToast } from '@/hooks/use-toast';

interface AdminStats {
  totalUsers: number;
  totalProperties: number;
  pendingRoleRequests: number;
  totalBookings: number;
  unseenMessages: number; // Added unseen message count
  pendingProperties: number; // Added pending property count
}

export default function AdminDashboardOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const fetchedStats = await getAdminDashboardStats();
        setStats(fetchedStats);
      } catch (error) {
        console.error("Error fetching admin dashboard stats:", error);
        toast({
          title: "Error",
          description: "Could not load dashboard statistics.",
          variant: "destructive",
        });
        setStats(null); // Set to null on error
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [toast]);

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
          <Button size="sm" className='w-full'>{linkText}</Button>
        </Link>
      </CardFooter>
    </Card>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold text-secondary-foreground">Admin Dashboard</h1>

      {isLoading ? (
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
           {[...Array(6)].map((_, i) => ( // Show 6 skeleton cards
              <Card key={i} className="shadow-md animate-pulse">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-4 w-4 bg-muted rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                </CardContent>
                <CardFooter>
                    <div className="h-8 bg-muted rounded w-full"></div>
                 </CardFooter>
              </Card>
            ))}
        </div>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {renderStatCard("Total Users", stats.totalUsers, Users, "/dashboard/admin/users", "Manage Users", "All registered users & owners")}
          {renderStatCard("Total Properties", stats.totalProperties, Building, "/dashboard/admin/properties", "Manage Properties", "Listed across the platform")}
          {renderStatCard("Pending Properties", stats.pendingProperties, Hourglass, "/dashboard/admin/properties", "Review Properties", "Awaiting admin verification")}
          {renderStatCard("Pending Role Requests", stats.pendingRoleRequests, UserCheck, "/dashboard/admin/role-requests", "Review Requests", "Users requesting owner role")}
          {renderStatCard("Total Bookings", stats.totalBookings, CalendarCheck, "/dashboard/admin/bookings", "Manage Bookings", "All time bookings")}
          {renderStatCard("Unseen Messages", stats.unseenMessages, MessageSquare, "/dashboard/admin/messages", "View Messages", "From Contact Us form")}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            Could not load dashboard statistics. Please try again later.
          </CardContent>
        </Card>
      )}

       {/* Quick Actions or Links - These can remain static */}
        <Card className="shadow-lg transition-shadow hover:shadow-xl animate-in fade-in-5 duration-500 delay-150">
            <CardHeader>
                <CardTitle className="text-xl text-secondary-foreground">Admin Actions</CardTitle>
            </CardHeader>
             <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                 <Link href="/dashboard/admin/users" passHref>
                     <Button variant="default" className="w-full hover:bg-primary/90 transition-colors duration-200">
                        <Users className="mr-2 h-4 w-4" /> Manage Users
                    </Button>
                </Link>
                 <Link href="/dashboard/admin/properties" passHref>
                    <Button variant="default" className="w-full hover:bg-primary/90 transition-colors duration-200">
                        <Building className="mr-2 h-4 w-4" /> Manage Properties
                    </Button>
                 </Link>
                  <Link href="/dashboard/admin/bookings" passHref>
                    <Button variant="default" className="w-full hover:bg-primary/90 transition-colors duration-200">
                        <ClipboardCheck className="mr-2 h-4 w-4" /> Manage Bookings
                    </Button>
                </Link>
                 <Link href="/dashboard/admin/role-requests" passHref>
                    <Button variant="default" className="w-full hover:bg-primary/90 transition-colors duration-200">
                        <UserCheck className="mr-2 h-4 w-4" /> Role Requests
                    </Button>
                 </Link>
                <Link href="/dashboard/admin/settings" passHref>
                    <Button variant="outline" className="w-full hover:bg-accent transition-colors duration-200">
                        <Settings className="mr-2 h-4 w-4" /> Platform Settings
                    </Button>
                 </Link>
                  <Link href="/dashboard/admin/messages" passHref>
                    <Button variant="outline" className="w-full hover:bg-accent transition-colors duration-200">
                        <MessageSquare className="mr-2 h-4 w-4" /> View Messages/Support
                    </Button>
                 </Link>
                  <Link href="/dashboard/admin/reports" passHref>
                    <Button variant="default" className="w-full hover:bg-primary/90 transition-colors duration-200">
                      <ClipboardCheck className="mr-2 h-4 w-4" /> Manage Reports
                    </Button>
                  </Link>
            </CardContent>
        </Card>

    </div>
  );
}
