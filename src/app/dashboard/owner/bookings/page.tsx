// src/app/dashboard/owner/bookings/page.tsx
'use client';

import { useState, useEffect, useTransition } from 'react'; // Import useTransition
import { useSearchParams, useRouter } from 'next/navigation'; // Import useRouter
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Filter, Loader2, AlertTriangle } from 'lucide-react'; // Added Loader2, AlertTriangle
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import { getOwnerReceivedBookings, approveBooking, rejectBooking } from '@/actions/bookingActions'; // Import booking actions
import type { Booking } from '@/types/booking'; // Import Booking type


// Placeholder for session check
async function getCurrentUserUidFromSession(): Promise<string | null> {
   if (typeof window !== 'undefined') {
       return localStorage.getItem('simulated_user_uid');
   }
   return null;
}

export default function OwnerBookingsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const initialFilter = searchParams.get('status') as Booking['status'] | 'all' || 'all';

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<'all' | Booking['status']>(initialFilter);
    const [isProcessing, startTransition] = useTransition(); // For approve/reject loading state
    const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);
    const { toast } = useToast();

    // Fetch owner's bookings using server action
    const fetchBookings = async (uid: string) => {
        setIsLoading(true);
        try {
            const fetchedBookings = await getOwnerReceivedBookings(uid, filterStatus); // Pass filter to action
            setBookings(fetchedBookings || []);
        } catch (error) {
            console.error("Error fetching owner bookings:", error);
            toast({ title: "Error", description: "Could not load your bookings.", variant: "destructive" });
            setBookings([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Get UID and fetch bookings on mount and when filter changes
    useEffect(() => {
        const init = async () => {
            const uid = await getCurrentUserUidFromSession();
            setCurrentUserUid(uid);
            if (uid) {
                fetchBookings(uid);
            } else {
                setIsLoading(false);
                toast({ title: "Unauthorized", description: "Please log in to view bookings.", variant: "destructive" });
                router.push('/login');
            }
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterStatus]); // Re-fetch when filterStatus changes

    const handleApproveBooking = (bookingId: string) => {
        if (!currentUserUid) return;
        startTransition(async () => {
            try {
                const result = await approveBooking(bookingId, currentUserUid); // Pass owner UID for verification
                if (result.success) {
                    toast({ title: "Booking Approved", description: result.message });
                    // Revalidation is handled by the action
                    // fetchBookings(currentUserUid); // Optional manual refetch
                } else {
                    throw new Error(result.message);
                }
            } catch (error: any) {
                 console.error("Error approving booking:", error);
                 toast({ title: "Approval Failed", description: error.message, variant: "destructive" });
            }
        });
    };

    const handleRejectBooking = (bookingId: string) => {
         if (!currentUserUid) return;
         startTransition(async () => {
            try {
                 const result = await rejectBooking(bookingId, currentUserUid); // Pass owner UID for verification
                 if (result.success) {
                     toast({ title: "Booking Rejected", description: result.message, variant: "destructive" });
                     // Revalidation is handled by the action
                     // fetchBookings(currentUserUid); // Optional manual refetch
                 } else {
                    throw new Error(result.message);
                 }
            } catch (error: any) {
                 console.error("Error rejecting booking:", error);
                 toast({ title: "Rejection Failed", description: error.message, variant: "destructive" });
            }
        });
    };

    const handleFilterChange = (status: 'all' | Booking['status']) => {
        setFilterStatus(status);
        // Update URL without full page reload (optional, good UX)
        const currentPath = '/dashboard/owner/bookings';
        const newUrl = status === 'all' ? currentPath : `${currentPath}?status=${status}`;
        router.replace(newUrl, { scroll: false });
        // Fetching is triggered by useEffect dependency change
    };

    // Format timestamp utility
    const formatTimestamp = (timestampString: string | null | undefined): string => {
        if (!timestampString) return 'N/A';
        try {
            const dateObj = new Date(timestampString);
            return isNaN(dateObj.getTime()) ? 'Invalid Date' : format(dateObj, 'PP'); // Format like: Aug 15, 2024
        } catch (e) {
            console.error("Error formatting timestamp:", e);
            return 'Invalid Date';
        }
    };


  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Booking Requests Section */}
      <Card className="shadow-lg transition-shadow hover:shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between">
           <div>
             <CardTitle className="text-xl text-secondary-foreground">Booking Requests</CardTitle>
             <CardDescription>Review and manage booking requests for your properties.</CardDescription>
          </div>
          {/* Filter Dropdown */}
           <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" /> Filter ({filterStatus === 'all' ? 'All' : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={filterStatus === 'all'}
                  onCheckedChange={() => handleFilterChange('all')}
                >
                  All Bookings
                </DropdownMenuCheckboxItem>
                 <DropdownMenuCheckboxItem
                  checked={filterStatus === 'pending'}
                  onCheckedChange={() => handleFilterChange('pending')}
                >
                  Pending
                </DropdownMenuCheckboxItem>
                 <DropdownMenuCheckboxItem
                  checked={filterStatus === 'approved'}
                  onCheckedChange={() => handleFilterChange('approved')}
                >
                  Approved
                </DropdownMenuCheckboxItem>
                 <DropdownMenuCheckboxItem
                  checked={filterStatus === 'cancelled'}
                  onCheckedChange={() => handleFilterChange('cancelled')}
                >
                  Cancelled
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
             ) : bookings.length > 0 ? (
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {bookings.map((booking) => (
                    <TableRow key={booking.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{booking.propertyName}</TableCell>
                    <TableCell>
                        <div>{booking.userName}</div>
                        <div className="text-xs text-muted-foreground">{booking.userEmail}</div>
                    </TableCell>
                    <TableCell>{formatTimestamp(booking.startDate)} - {formatTimestamp(booking.endDate)}</TableCell>
                    <TableCell>
                         <Badge variant={
                                booking.status === 'approved' ? 'default' : booking.status === 'pending' ? 'secondary' : 'destructive'
                                } className={
                                    `capitalize ${
                                    booking.status === 'approved' ? 'bg-green-100 text-green-800 border-green-300' :
                                    booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                    booking.status === 'cancelled' ? 'bg-red-100 text-red-800 border-red-300' : ''
                                    }`
                                }>
                           {booking.status}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                        {booking.status === 'pending' && (
                        <>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-green-600 hover:bg-green-100" disabled={isProcessing}>
                                        <CheckCircle className="mr-1 h-4 w-4" /> Approve
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Approve Booking?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Are you sure you want to approve the booking for <span className="font-semibold">{booking.userName}</span> at <span className="font-semibold">{booking.propertyName}</span> from {formatTimestamp(booking.startDate)} to {formatTimestamp(booking.endDate)}?
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleApproveBooking(booking.id)} className="bg-primary hover:bg-primary/90" disabled={isProcessing}>
                                            {isProcessing ? <Loader2 className='mr-2 h-4 w-4 animate-spin'/> : null} Yes, Approve
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" disabled={isProcessing}>
                                        <XCircle className="mr-1 h-4 w-4" /> Reject
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Reject Booking?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Are you sure you want to reject the booking for <span className="font-semibold">{booking.userName}</span> at <span className="font-semibold">{booking.propertyName}</span>? This cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleRejectBooking(booking.id)} className="bg-destructive hover:bg-destructive/90" disabled={isProcessing}>
                                             {isProcessing ? <Loader2 className='mr-2 h-4 w-4 animate-spin'/> : null} Yes, Reject
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                             </AlertDialog>
                        </>
                        )}
                         {booking.status !== 'pending' && (
                             <span className="text-xs text-muted-foreground italic">No actions available</span>
                         )}
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
             ) : (
                 <div className="text-center text-muted-foreground py-8">
                     <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
                     <p>No booking requests found matching the filter criteria.</p>
                 </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

    