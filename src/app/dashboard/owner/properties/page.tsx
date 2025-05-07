// src/app/dashboard/owner/properties/page.tsx
'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2, Eye, Image as ImageIcon, RefreshCcw, BadgeCheck, Loader2, AlertTriangle } from 'lucide-react';
import type { Property } from '@/types/property';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { PropertyForm } from '@/components/property/PropertyForm';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
// Import server actions
import { getOwnerProperties, deleteProperty, updateProperty, requestPropertyPano } from '@/actions/ownerActions';

// Placeholder for session check
async function getCurrentUserUidFromSession(): Promise<string | null> {
   if (typeof window !== 'undefined') {
       return localStorage.getItem('simulated_user_uid');
   }
   return null;
}

export default function OwnerPropertiesPage() {
    const [properties, setProperties] = useState<Property[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingProperty, setEditingProperty] = useState<Property | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null); // For delete confirmation
    const [isProcessing, startTransition] = useTransition(); // Transition for actions
    const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);
    const { toast } = useToast();
    const router = useRouter();

    // Fetch owner's properties using server action
    const fetchProperties = async (uid: string) => {
        setIsLoading(true);
        try {
            const fetchedProperties = await getOwnerProperties(uid);
            setProperties(fetchedProperties || []);
        } catch (error) {
            console.error("Error fetching owner properties:", error);
            toast({ title: "Error", description: "Could not load your properties.", variant: "destructive" });
            setProperties([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Get UID and fetch properties on mount
    useEffect(() => {
        const init = async () => {
            const uid = await getCurrentUserUidFromSession();
            setCurrentUserUid(uid);
            if (uid) {
                fetchProperties(uid);
            } else {
                setIsLoading(false);
                 toast({ title: "Unauthorized", description: "Please log in to view your properties.", variant: "destructive" });
                 router.push('/login');
            }
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only on mount

    const handleDelete = async (propertyId: string | undefined) => {
        if (!propertyId || !currentUserUid) return;
        setPropertyToDelete(null); // Close confirmation dialog

        startTransition(async () => {
            try {
                const result = await deleteProperty(propertyId, currentUserUid); // Call server action
                if (result.success) {
                    toast({ title: "Property Deleted", description: result.message, variant: "destructive" });
                    // Revalidation is handled by the action, UI should update
                } else {
                    throw new Error(result.message);
                }
            } catch (error: any) {
                console.error("Error deleting property:", error);
                toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
            }
        });
    };


    const handleOpenEditForm = (property: Property) => {
        setEditingProperty(property);
        setIsFormOpen(true);
    }

    const handleOpenAddForm = () => {
        router.push('/dashboard/owner/properties/add'); // Navigate to dedicated add page
    }

    // This function receives the validated data from PropertyForm's react-hook-form handleSubmit
    const handleEditFormSubmit = (values: any) => {
        if (!editingProperty || !currentUserUid) return;
         console.log("[OwnerPropertiesPage] Received data from PropertyForm for update:", values);

        startTransition(async () => {
            try {
                console.log(`[OwnerPropertiesPage] Calling updateProperty action for property ${editingProperty.id}...`);
                const result = await updateProperty(editingProperty.id, currentUserUid, values);
                console.log("[OwnerPropertiesPage] updateProperty action result:", result);

                if (result.success) {
                    toast({ title: "Property Updated", description: result.message });
                    setIsFormOpen(false);
                    setEditingProperty(null);
                    // Revalidation should handle the data refresh, but you can manually fetch if needed:
                    // if (currentUserUid) fetchProperties(currentUserUid);
                } else {
                     throw new Error(result.message);
                }
            } catch(error: any) {
                 console.error("Error updating property via action:", error);
                 toast({ title: "Update Failed", description: error.message || "Could not update property.", variant: "destructive" });
            }
        });
    };

   const handleRequestPano = (propertyId: string, propertyTitle: string) => {
        if (!currentUserUid) return;
        startTransition(async () => {
            try {
                const result = await requestPropertyPano(propertyId, currentUserUid);
                if(result.success) {
                     toast({ title: "Request Sent", description: result.message });
                } else {
                     throw new Error(result.message);
                }
            } catch (error: any) {
                 console.error("Error requesting pano:", error);
                 toast({ title: "Request Failed", description: error.message, variant: "destructive" });
            }
        });
    };


  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Edit Property Dialog */}
       <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) { setEditingProperty(null); } setIsFormOpen(open); }}>
        {/* No DialogTrigger needed, opened programmatically */}
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
            <DialogDescription>
              Update the details of your property. Click "Update Property" when you're done.
            </DialogDescription>
          </DialogHeader>
           {/* PropertyForm content will scroll within the DialogContent */}
           <PropertyForm
              initialData={editingProperty}
              onSubmit={handleEditFormSubmit} // This function receives data from RHF's handleSubmit
              onCancel={() => {setIsFormOpen(false); setEditingProperty(null);}}
              isSubmitting={isProcessing} // Pass submitting state
            />
             {/* Footer with buttons is now inside PropertyForm */}
        </DialogContent>
      </Dialog>

       {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!propertyToDelete} onOpenChange={(open) => !open && setPropertyToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the property listing for <span className="font-semibold">{propertyToDelete?.title}</span>.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
                 <AlertDialogAction onClick={() => handleDelete(propertyToDelete?.id)} className="bg-destructive hover:bg-destructive/90" disabled={isProcessing}>
                     {isProcessing ? <Loader2 className='mr-2 h-4 w-4 animate-spin'/> : null} Yes, Delete Property
                 </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>


      {/* Property Listings Section */}
      <Card className="shadow-lg transition-shadow hover:shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl text-secondary-foreground">My Properties</CardTitle>
              <CardDescription>Manage your listed properties.</CardDescription>
            </div>
           <Button variant="default" size="sm" onClick={handleOpenAddForm}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Property
          </Button>
        </CardHeader>
        <CardContent>
           {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
           ) : properties.length > 0 ? (
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Price (/night)</TableHead>
                    <TableHead>Verification</TableHead>
                     <TableHead>360° Image</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {properties.map((property) => (
                    <TableRow key={property.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{property.title}</TableCell>
                        <TableCell>{formatCurrency(property.price)}</TableCell>
                        <TableCell>
                            <Badge variant={
                                property.status === 'verified' ? 'default' : property.status === 'pending' ? 'secondary' : 'destructive'
                                } className={
                                    `capitalize ${
                                    property.status === 'verified' ? 'bg-green-100 text-green-800 border-green-300' :
                                    property.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                    property.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-300' : ''
                                    }`
                                }>
                                {property.status === 'verified' ? <BadgeCheck className="mr-1 h-3 w-3 text-green-600" /> : null}
                                {property.status}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            {property.panoImageUrl ? (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-300">
                                    <ImageIcon className="mr-1 h-3 w-3" /> Uploaded
                                </Badge>
                            ) : (
                            <div className="flex items-center gap-1">
                                    <Badge variant="outline">
                                        <ImageIcon className="mr-1 h-3 w-3 text-muted-foreground" /> Missing
                                    </Badge>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-primary hover:bg-primary/10" title="Request 360° Image from Admin" onClick={() => handleRequestPano(property.id, property.title)} disabled={isProcessing}>
                                         {isProcessing ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCcw className="h-4 w-4" />}
                                    </Button>
                            </div>
                            )}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                            <Link href={`/properties/${property.id}`} passHref>
                                <Button variant="ghost" size="icon" title="View Property">
                                    <Eye className="h-4 w-4 text-primary" />
                                </Button>
                            </Link>
                            <Button variant="ghost" size="icon" title="Edit Property" onClick={() => handleOpenEditForm(property)} disabled={isProcessing}>
                                <Edit className="h-4 w-4 text-accent-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Delete Property" className="text-destructive hover:bg-destructive/10" onClick={() => setPropertyToDelete(property)} disabled={isProcessing}>
                                <Trash2 className="h-4 w-4" />
                            </Button>

                        </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            ) : (
                 <div className="text-center text-muted-foreground py-8">
                    <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
                    <p className="mb-4">You haven't listed any properties yet.</p>
                     <Button variant="default" size="sm" onClick={handleOpenAddForm}>
                        <PlusCircle className="mr-2 h-4 w-4" /> List Your First Property
                    </Button>
                 </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
