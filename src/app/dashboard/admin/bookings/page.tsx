// src/app/dashboard/admin/bookings/page.tsx
'use client';

import { useState, useEffect, useTransition } from 'react'; // Import useTransition
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClipboardCheck, Search, Eye, Trash2, Ban, Loader2, AlertTriangle } from 'lucide-react'; // Icons
import Link from 'next/link';
import { format } from 'date-fns';
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
import { getAdminBookings, cancelAdminBooking, deleteAdminBooking } from '@/actions/adminActions'; // Use admin actions
import type { Booking } from '@/types/booking'; // Import Booking type

export default function AdminBookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isProcessing, startTransition] = useTransition();
    const { toast } = useToast();

    // Fetch all bookings using the server action
    const fetchBookings = async () => {
        setIsLoading(true);
        try {
            const fetchedBookings = await getAdminBookings(); // Fetch all bookings
            setBookings(fetchedBookings || []);
        } catch (error: any) {
            console.error("Error fetching admin bookings:", error);
            toast({ title: "Error", description: `Failed to fetch bookings: ${error.message || 'Unknown error'}`, variant: "destructive" });
            setBookings([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Fetch on initial load only

    const filteredBookings = bookings.filter(booking =>
        (booking.propertyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (booking.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (booking.ownerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

     const handleCancelBooking = (bookingId: string, propertyName: string | undefined) => {
         startTransition(async () => {
             try {
                 const result = await cancelAdminBooking(bookingId); // Use admin cancel action
                 if (result.success) {
                     toast({ title: "Booking Cancelled", description: `Booking ${bookingId} for ${propertyName} cancelled by admin.`, variant: "destructive" });
                     // Revalidation is handled by the action, but update local state for immediate feedback
                     setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
                 } else {
                     throw new Error(result.message);
                 }
             } catch (error: any) {
                 console.error("Error cancelling booking:", error);
                 toast({ title: "Cancellation Failed", description: error.message, variant: "destructive" });
             }
         });
     };

    const handleDeleteBookingRecord = (bookingId: string) => {
        startTransition(async () => {
            try {
                const result = await deleteAdminBooking(bookingId); // Use admin delete action
                if (result.success) {
                     toast({ title: "Booking Record Deleted", description: `Booking record ${bookingId} has been removed.`, variant: "destructive" });
                     // Revalidation is handled by the action, but update local state for immediate feedback
                     setBookings(prev => prev.filter(b => b.id !== bookingId));
                } else {
                     throw new Error(result.message);
                }
            } catch (error: any) {
                console.error("Error deleting booking record:", error);
                 toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
            }
        });
    };

     // Format timestamp utility
     const formatTimestamp = (timestampString: string | null | undefined): string => {
         if (!timestampString) return 'N/A';
         try {
             // Check if it's already a simple date string like 'YYYY-MM-DD'
             if (/^\d{4}-\d{2}-\d{2}$/.test(timestampString)) {
                 return format(new Date(timestampString + 'T00:00:00'), 'PP'); // Add time part for parsing
             }
             const dateObj = new Date(timestampString);
             if (isNaN(dateObj.getTime())) {
                 throw new Error("Invalid date string received: " + timestampString);
             }
             return format(dateObj, 'PP'); // Format like: Aug 15, 2024
         } catch (e: any) {
             console.error("Error formatting timestamp:", e.message, "Input:", timestampString);
             return 'Invalid Date';
         }
     };


    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <h1 className="text-3xl font-bold text-secondary-foreground">Manage Bookings</h1>
            <p className="text-muted-foreground">View and manage all booking activities across the platform.</p>

            <Card className="shadow-lg transition-shadow hover:shadow-xl">
                <CardHeader>
                     <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <CardTitle className="text-xl text-secondary-foreground">All Bookings</CardTitle>
                         <div className="relative w-full sm:w-64">
                             <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search bookings..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 w-full bg-background"
                            />
                         </div>
                    </div>
                </CardHeader>
                <CardContent>
                     {isLoading ? (
                         <div className="flex justify-center items-center h-64">
                             <Loader2 className="h-8 w-8 animate-spin text-primary" />
                         </div>
                     ) : filteredBookings.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Booking ID</TableHead>
                                    <TableHead>Property</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Owner</TableHead>
                                    <TableHead>Dates</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredBookings.map((booking) => {
                                    if (!booking) {
                                      console.error('Error: Booking is null or undefined');
                                      return null;
                                    }

                                    return (
                                      <TableRow key={booking.id} className="hover:bg-muted/50">
                                        <TableCell className="font-mono text-xs">{booking.id}</TableCell>
                                        <TableCell>
                                            <Link href={`/properties/${booking.propertyId}`} className="hover:underline text-primary text-sm">
                                                {booking.propertyName || `Property ID: ${booking.propertyId}`}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{booking.userName || `User ID: ${booking.userId}`}</TableCell>
                                        <TableCell>{booking.ownerName || (booking.ownerId ? `Owner ID: ${booking.ownerId}` : 'N/A')}</TableCell>
                                        <TableCell>{formatTimestamp(booking.startDate)} - {formatTimestamp(booking.endDate)}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                  booking.status === 'approved'
                                                    ? 'default'
                                                    : booking.status === 'pending'
                                                    ? 'secondary'
                                                    : 'destructive'
                                                }
                                                className={
                                                  booking.status === 'approved'
                                                    ? 'bg-green-100 text-green-800 border-green-300'
                                                    : booking.status === 'pending'
                                                    ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                                                    : booking.status === 'cancelled'
                                                    ? 'bg-red-100 text-red-800 border-red-300'
                                                    : ''
                                                }
                                            >
                                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right space-x-1">
                                            {booking.status !== 'cancelled' && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" title="Cancel Booking" className="text-destructive hover:bg-destructive/10" disabled={isProcessing}>
                                                        <Ban className="h-4 w-4" />
                                                    </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Cancel this Booking?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                        Are you sure you want to cancel the booking (<span className='font-semibold'>{booking.id}</span>) for <span className="font-semibold">{booking.propertyName}</span>? This action will notify the user and owner.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel disabled={isProcessing}>Keep Booking</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleCancelBooking(booking.id, booking.propertyName)} className="bg-destructive hover:bg-destructive/90" disabled={isProcessing}>
                                                            {isProcessing ? <Loader2 className='mr-2 h-4 w-4 animate-spin'/> : null} Yes, Cancel Booking
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" title="Delete Booking Record" className="text-destructive hover:bg-destructive/10" disabled={isProcessing}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Booking Record?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete the record for booking <span className="font-semibold">{booking.id}</span>. This is usually not recommended unless necessary.
                                                    </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                    <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteBookingRecord(booking.id)} className="bg-destructive hover:bg-destructive/90" disabled={isProcessing}>
                                                         {isProcessing ? <Loader2 className='mr-2 h-4 w-4 animate-spin'/> : null} Yes, Delete Record
                                                    </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                     ) : (
                          <div className="text-center text-muted-foreground py-8">
                            <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
                            <p>No bookings found matching your search criteria.</p>
                         </div>
                     )}
                     {/* TODO: Add Pagination */}
                </CardContent>
            </Card>
        </div>
    );
}
