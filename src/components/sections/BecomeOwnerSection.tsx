'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Building, Loader2, LogIn, Check, ArrowRight, UserPlus } from 'lucide-react'; // Added UserPlus
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getUserProfile, checkExistingRoleRequest, requestOwnerRoleUpgrade } from '@/actions/userActions';
import type { UserProfileData } from '@/types/user';
import type { RoleRequest } from '@/types/roleRequest';
import { RequestOwnerRoleDialog } from '@/components/auth/RequestOwnerRoleDialog';
import { cn } from '@/lib/utils'; // Import cn utility

// Placeholder for session check (use your actual implementation)
async function getCurrentUserUidFromSession(): Promise<string | null> {
   if (typeof window !== 'undefined') {
       return localStorage.getItem('simulated_user_uid');
   }
   return null;
}

export function BecomeOwnerSection() {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
    const [existingRequest, setExistingRequest] = useState<RoleRequest | null>(null);
    const [isSubmittingRequest, startTransition] = useTransition();
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Fetch user profile and existing request status on mount
    useEffect(() => {
        if (!isMounted) return;

        const fetchUserData = async () => {
            setIsLoadingAuth(true);
            const userUid = await getCurrentUserUidFromSession();

            if (userUid) {
                try {
                    const profile = await getUserProfile(userUid);
                    setUserProfile(profile);
                    if (profile?.role === 'user') {
                        const request = await checkExistingRoleRequest(userUid);
                        setExistingRequest(request);
                    } else {
                         setExistingRequest(null); // Clear request if not 'user' role
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    setUserProfile(null); // Clear profile on error
                    setExistingRequest(null);
                }
            } else {
                 setUserProfile(null); // Not logged in
                 setExistingRequest(null);
            }
            setIsLoadingAuth(false);
        };

        fetchUserData();
    }, [isMounted]);

    const handleBecomeOwnerClick = () => {
        if (!userProfile) {
            // Not logged in, redirect to login/register
            router.push('/register'); // Redirect to register for clarity
            return;
        }

        if (userProfile.role === 'user' && existingRequest?.status !== 'pending' && existingRequest?.status !== 'approved') {
            // Logged in as user, no pending/approved request -> open dialog
            setIsDialogOpen(true);
        } else if (userProfile.role === 'owner' || userProfile.role === 'admin') {
            // Already an owner or admin, maybe redirect to dashboard or show message
             toast({ title: `Already a ${userProfile.role}!`, description: `You can access the ${userProfile.role} dashboard.` });
            router.push(`/dashboard/${userProfile.role}`);
        } else if (existingRequest?.status === 'pending') {
             toast({ title: "Request Pending", description: "Your request to become an owner is already under review.", variant: "default" });
        } else if (existingRequest?.status === 'approved') {
            // This case shouldn't be reachable if role updated correctly, but handle defensively
             toast({ title: "Already Approved", description: "Your request was previously approved.", variant: "default" });
             router.push('/dashboard/owner');
        } else if (existingRequest?.status === 'rejected') {
            // Allow re-request by opening the dialog
             setIsDialogOpen(true);
        }
    };

    const handleRequestSubmit = async (message?: string) => { // Accept optional message
         if (!userProfile || userProfile.role !== 'user' || !userProfile.email) return; // Ensure email is present

        startTransition(async () => {
            // Note: Current action `requestOwnerRoleUpgrade` doesn't take a message.
            console.log("User message (if action supported):", message);
            const result = await requestOwnerRoleUpgrade(userProfile.uid, userProfile.name, userProfile.email); // Use profile.email

            if (result.success) {
                toast({ title: "Request Sent", description: result.message });
                setIsDialogOpen(false); // Close dialog
                // Re-check status after submitting
                const updatedRequest = await checkExistingRoleRequest(userProfile.uid);
                setExistingRequest(updatedRequest);
            } else {
                toast({ title: "Request Failed", description: result.message, variant: "destructive" });
            }
        });
    };

    let buttonText = "List Your Property"; // Updated button text
    let buttonDisabled = isLoadingAuth || isSubmittingRequest;
    let buttonVariant: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link" = "default";
    // Rename variable to PascalCase
    let ButtonIcon = isLoadingAuth ? Loader2 : Building;

    if (!isLoadingAuth && userProfile) {
        if (userProfile.role === 'owner') {
            buttonText = "Go to Owner Dashboard";
            ButtonIcon = ArrowRight; // Change icon for redirection
        }
        if (userProfile.role === 'admin'){
             buttonText = "Go to Admin Dashboard";
             ButtonIcon = ArrowRight;
        }
        if (existingRequest?.status === 'pending') {
             buttonText = "Request Pending";
             buttonDisabled = true;
             buttonVariant = "secondary";
             ButtonIcon = Loader2; // Use loader for pending
        }
    } else if (!isLoadingAuth && !userProfile) {
         buttonText = "Register to Become an Owner";
         ButtonIcon = UserPlus; // Icon for registration prompt
    }

    return (
        <>
            {/* Use secondary background, main foreground color for text */}
            <section className="py-16 bg-secondary text-foreground text-center section-animate">
                <div className="container mx-auto px-4">
                <Building className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h2 className="text-3xl font-bold mb-4 text-foreground">Ready to List Your Property?</h2>
                <p className="text-lg mb-8 max-w-2xl mx-auto text-muted-foreground">
                    Join OwnsBroker as a property owner and start earning. Benefit from our easy listing process and reach a wide audience of potential renters.
                </p>
                 {/* Updated Button Logic */}
                 <Button
                    size="lg"
                    variant={buttonVariant}
                    className="text-lg px-8 py-3 shadow-md hover:shadow-lg transition-shadow bg-primary text-primary-foreground hover:bg-primary/90" // Explicitly set primary colors
                    onClick={handleBecomeOwnerClick}
                    disabled={buttonDisabled}
                 >
                    {/* Use PascalCase component name */}
                    <ButtonIcon className={cn("mr-2 h-5 w-5", isLoadingAuth || existingRequest?.status === 'pending' || isSubmittingRequest ? 'animate-spin' : '')} />
                    {buttonText}
                </Button>
                </div>
            </section>

            {/* Role Request Dialog */}
             <RequestOwnerRoleDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSubmit={handleRequestSubmit}
                isSubmitting={isSubmittingRequest}
            />
        </>
    );
}