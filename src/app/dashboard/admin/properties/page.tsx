// src/app/dashboard/admin/properties/page.tsx
'use client';

import { useState, useEffect, useTransition } from 'react'; // Import useTransition
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building, Search, Eye, Trash2, CheckCircle, XCircle, Clock, BadgeCheck, Loader2, AlertTriangle } from 'lucide-react'; // Icons
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import type { Property } from '@/types/property'; // Assuming types are defined here
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
import { getAdminProperties, approveAdminProperty, rejectAdminProperty, deleteAdminProperty } from '@/actions/adminActions'; // Import admin actions

// Augment Property type for Admin view (if needed)
interface AdminProperty extends Property {
    ownerName?: string; // Add owner name for display
    ownerId?: string;
}


export default function AdminPropertiesPage() {
    const [properties, setProperties] = useState<AdminProperty[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isProcessing, startTransition] = useTransition(); // For action loading states
    const { toast } = useToast();

    // Fetch all properties using the server action
    const fetchProperties = async () => {
        setIsLoading(true);
        try {
            const fetchedProperties = await getAdminProperties(); // Call the admin action
            setProperties(fetchedProperties || []);
        } catch (error: any) {
            console.error("Error fetching admin properties:", error);
            toast({ title: "Error", description: `Failed to fetch properties: ${error.message || 'Unknown error'}`, variant: "destructive" });
            setProperties([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProperties();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Fetch on initial load only

    const filteredProperties = properties.filter(prop =>
        prop.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (prop.ownerName && prop.ownerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (prop.ownerId && prop.ownerId.toLowerCase().includes(searchTerm.toLowerCase())) || // Search by owner ID
        (prop.id && prop.id.toLowerCase().includes(searchTerm.toLowerCase())) // Search by property ID
    );

     const handleApproveProperty = (propertyId: string, title: string) => {
         startTransition(async () => {
             try {
                 const result = await approveAdminProperty(propertyId);
                 if (result.success) {
                     toast({ title: "Property Verified", description: `Property "${title}" has been approved.` });
                     // Revalidation handled by action, update local state
                     setProperties(prev => prev.map(p => p.id === propertyId ? { ...p, status: 'verified' } : p));
                 } else {
                     throw new Error(result.message);
                 }
             } catch (error: any) {
                 console.error("Error approving property:", error);
                 toast({ title: "Approval Failed", description: error.message, variant: "destructive" });
             }
         });
     };

     const handleRejectProperty = (propertyId: string, title: string) => {
         startTransition(async () => {
             // TODO: Potentially add a dialog to get rejection reason
             const reason = "Rejected by Admin"; // Placeholder reason
             try {
                 const result = await rejectAdminProperty(propertyId, reason);
                 if (result.success) {
                     toast({ title: "Property Rejected", description: `Property "${title}" has been rejected.`, variant: "destructive" });
                     // Revalidation handled by action, update local state
                     setProperties(prev => prev.map(p => p.id === propertyId ? { ...p, status: 'rejected' } : p));
                 } else {
                     throw new Error(result.message);
                 }
             } catch (error: any) {
                 console.error("Error rejecting property:", error);
                 toast({ title: "Rejection Failed", description: error.message, variant: "destructive" });
             }
         });
     };

     const handleDeleteProperty = (propertyId: string, title: string) => {
         startTransition(async () => {
             try {
                 const result = await deleteAdminProperty(propertyId);
                 if (result.success) {
                     toast({ title: "Property Deleted", description: `Property "${title}" has been removed.`, variant: "destructive" });
                     // Revalidation handled by action, update local state
                     setProperties(prev => prev.filter(p => p.id !== propertyId));
                 } else {
                    throw new Error(result.message);
                 }
             } catch (error: any) {
                 console.error("Error deleting property:", error);
                 toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
             }
         });
     };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <h1 className="text-3xl font-bold text-secondary-foreground">Manage Properties</h1>
            <p className="text-muted-foreground">Oversee all property listings on the platform.</p>

            <Card className="shadow-lg transition-shadow hover:shadow-xl">
                <CardHeader>
                     <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <CardTitle className="text-xl text-secondary-foreground">Property List</CardTitle>
                         <div className="relative w-full sm:w-64">
                             <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search by title, owner, ID..."
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
                     ) : filteredProperties.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Owner</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProperties.map((prop) => (
                                    <TableRow key={prop.id} className="hover:bg-muted/50">
                                        <TableCell className="font-medium">
                                            <Link href={`/properties/${prop.id}`} className="hover:underline text-primary flex items-center gap-2">
                                                {prop.imageUrl && <img src={prop.imageUrl} alt={prop.title} className="h-8 w-10 object-cover rounded-sm hidden md:inline-block"/>}
                                                {prop.title}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                             <div>{prop.ownerName || 'N/A'}</div>
                                             <div className="text-xs text-muted-foreground font-mono">{prop.ownerId}</div>
                                         </TableCell>
                                        <TableCell>{formatCurrency(prop.price)}</TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                prop.status === 'verified' ? 'default' : prop.status === 'pending' ? 'secondary' : 'destructive'
                                                } className={
                                                prop.status === 'verified' ? 'bg-green-100 text-green-800 border-green-300' :
                                                prop.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                                prop.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-300' : ''
                                                }>
                                            {prop.status === 'verified' ? <CheckCircle className="mr-1 h-3 w-3"/> : prop.status === 'pending' ? <Clock className="mr-1 h-3 w-3"/> : <XCircle className="mr-1 h-3 w-3"/>}
                                            {prop.status ? prop.status.charAt(0).toUpperCase() + prop.status.slice(1) : 'Unknown'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right space-x-1">
                                            <Link href={`/properties/${prop.id}`} passHref>
                                                <Button variant="ghost" size="icon" title="View Property">
                                                    <Eye className="h-4 w-4 text-primary" />
                                                </Button>
                                            </Link>
                                            {prop.status === 'pending' && (
                                                <>
                                                    <Button variant="ghost" size="sm" className="text-green-600 hover:bg-green-100" onClick={() => handleApproveProperty(prop.id, prop.title)} disabled={isProcessing}>
                                                        {isProcessing ? <Loader2 className='mr-1 h-4 w-4 animate-spin'/> : <CheckCircle className="mr-1 h-4 w-4" />} Approve
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleRejectProperty(prop.id, prop.title)} disabled={isProcessing}>
                                                        {isProcessing ? <Loader2 className='mr-1 h-4 w-4 animate-spin'/> : <XCircle className="mr-1 h-4 w-4" />} Reject
                                                    </Button>
                                                </>
                                            )}
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" title="Delete Property" className="text-destructive hover:bg-destructive/10" disabled={isProcessing}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete the property listing for <span className="font-semibold">{prop.title}</span>.
                                                    </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                    <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteProperty(prop.id, prop.title)} className="bg-destructive hover:bg-destructive/90" disabled={isProcessing}>
                                                         {isProcessing ? <Loader2 className='mr-2 h-4 w-4 animate-spin'/> : null} Yes, Delete Property
                                                    </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     ) : (
                         <div className="text-center text-muted-foreground py-8">
                            <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
                            <p>No properties found matching your search criteria.</p>
                         </div>
                     )}
                     {/* TODO: Add Pagination */}
                </CardContent>
            </Card>
        </div>
    );
}
