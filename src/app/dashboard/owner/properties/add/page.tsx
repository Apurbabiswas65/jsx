
// src/app/dashboard/owner/properties/add/page.tsx
'use client';

import { useState, useEffect } from 'react'; // Import useEffect
import { PropertyForm } from '@/components/property/PropertyForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { Property } from '@/types/property'; // Import Property type for potential use
// Firebase/Auth imports removed as we use server actions & session simulation
import type { UserProfileData } from '@/types/user'; // Import user profile type
import { Loader2, AlertTriangle } from 'lucide-react'; // Import icons
// Import server actions for profile and authorization
import { getUserProfile } from '@/actions/userActions';
import { addProperty } from '@/actions/ownerActions'; // Import the add property action

// Placeholder for session check
async function getCurrentUserUidFromSession(): Promise<string | null> {
   if (typeof window !== 'undefined') {
       return localStorage.getItem('simulated_user_uid');
   }
   return null;
}

export default function AddPropertyPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [currentUserUid, setCurrentUserUid] = useState<string | null>(null); // Store only UID
    const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
    const [isAuthorized, setIsAuthorized] = useState(false); // State to track authorization

     // Check authentication and role on mount
    useEffect(() => {
        const checkAuthAndRole = async () => {
             setIsLoadingAuth(true);
            const uid = await getCurrentUserUidFromSession();
            setCurrentUserUid(uid);

            if (uid) {
                 try {
                    const profile = await getUserProfile(uid); // Fetch profile using action
                    if (profile) {
                        setUserProfile(profile);
                        // Authorize only if role is 'owner' and status is 'active'
                        if (profile.role === 'owner' && profile.status === 'active') {
                            setIsAuthorized(true);
                        } else {
                             setIsAuthorized(false);
                             let reason = "You do not have permission to add properties.";
                             if (profile.role !== 'owner') reason = "Only owners can add properties.";
                             else if (profile.status === 'pending') reason = "Your owner account is pending approval.";
                             else if (profile.status === 'suspended') reason = "Your account is suspended.";
                              toast({
                                title: "Access Denied",
                                description: reason,
                                variant: "destructive",
                             });
                             router.replace('/dashboard/owner'); // Redirect if not authorized
                        }
                    } else {
                        setIsAuthorized(false);
                         toast({ title: "Error", description: "User profile not found.", variant: "destructive" });
                         if (typeof window !== 'undefined') localStorage.removeItem('simulated_user_uid'); // Clear invalid session
                         router.replace('/login');
                    }
                 } catch (error) {
                     setIsAuthorized(false);
                     console.error("Error fetching profile:", error);
                     toast({ title: "Error", description: "Could not verify user role.", variant: "destructive" });
                     if (typeof window !== 'undefined') localStorage.removeItem('simulated_user_uid'); // Clear session on error
                     router.replace('/login');
                 } finally {
                    setIsLoadingAuth(false);
                 }
            } else {
                // No user logged in
                 setIsLoadingAuth(false);
                 setIsAuthorized(false);
                router.replace('/login');
            }
        };
        checkAuthAndRole();
    }, [router, toast]);


    const handleFormSubmit = async (values: any) => { // Use 'any' for now, refine with PropertyFormData type
        if (!isAuthorized || !currentUserUid) {
             toast({ title: "Unauthorized", description: "You cannot perform this action.", variant: "destructive" });
             return;
        }

        // TODO: Handle image uploads here separately if needed before calling the action
        // For now, assuming image URLs are handled or passed within 'values' if applicable.

        try {
             // Call the server action to add the property
             const result = await addProperty(currentUserUid, values); // Pass owner UID and form data

             if (result.success) {
                 toast({ title: "Property Added", description: result.message || `${values.title} has been listed and is pending verification.` });
                 // Redirect back to the properties list page after successful submission
                 // revalidatePath in the action handles the data refresh
                 router.push('/dashboard/owner/properties');
             } else {
                  toast({ title: "Failed to Add Property", description: result.message || 'Could not add the property.', variant: "destructive" });
             }
        } catch (error: any) {
             console.error("Error calling addProperty action:", error);
             toast({ title: "Error", description: `An unexpected error occurred: ${error.message}`, variant: "destructive" });
        }
    };


    const handleCancel = () => {
        router.push('/dashboard/owner/properties'); // Go back to the list view
    };

    if (isLoadingAuth) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

     if (!isAuthorized && userProfile) {
         // Show a message if the user is logged in but not authorized
         return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                <h2 className="text-xl font-semibold text-destructive">Access Denied</h2>
                {userProfile.role === 'owner' && userProfile.status === 'pending' ? (
                     <p className="text-muted-foreground mt-2">Your owner account is awaiting admin approval before you can add properties.</p>
                ) : (
                     <p className="text-muted-foreground mt-2">You do not have the necessary permissions to add properties.</p>
                )}
                 <Button onClick={() => router.push('/dashboard/owner')} className="mt-4">Go to Owner Dashboard</Button>
            </div>
        );
    }

    // Render form only if authorized
    return (
         isAuthorized && (
            <div className="space-y-6">
                <Card className="shadow-lg max-w-3xl mx-auto">
                    <CardHeader>
                        <CardTitle className="text-xl text-secondary-foreground">Add New Property</CardTitle>
                        <CardDescription>Fill in the details to list a new property on OwnBroker.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PropertyForm
                            onSubmit={handleFormSubmit}
                            onCancel={handleCancel}
                            // No initialData needed for adding
                        />
                    </CardContent>
                </Card>
            </div>
         )
    );
}

    