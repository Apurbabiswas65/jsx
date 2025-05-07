// src/app/dashboard/user/settings/page.tsx
'use client';

import React, { useState, useEffect, useTransition } from 'react'; // Ensure React is imported, add useTransition
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Trash2, Upload, UserCircle, KeyRound, Building, Check, HelpCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
} from "@/components/ui/alert-dialog"
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
// Firebase Auth needed for password change and account deletion
import { onAuthStateChanged, User, updatePassword, reauthenticateWithCredential, EmailAuthProvider, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Keep auth import for these actions
import type { UserProfileData } from '@/types/user';
import type { RoleRequest } from '@/types/roleRequest';
import { useRouter } from 'next/navigation'; // Import useRouter
// Import Server Actions
import {
    getUserProfile,
    updateUserProfile,
    requestOwnerRoleUpgrade,
    checkExistingRoleRequest,
} from '@/actions/userActions';
import { getDbConnection } from '@/lib/db'; // Import only for account deletion within client component

export default function UserSettingsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter(); // Initialize router

  // Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState(''); // Usually not editable
  const [mobile, setMobile] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);

  // Loading/State Management
  const [isSavingProfile, startProfileSaveTransition] = useTransition();
  const [isChangingPassword, setIsChangingPassword] = useState(false); // Keep client-side state for Firebase action
  const [isDeletingAccount, setIsDeletingAccount] = useState(false); // Keep client-side state for Firebase action
  const [isRequestingRole, startRoleRequestTransition] = useTransition();
  const [existingRequest, setExistingRequest] = useState<RoleRequest | null>(null);

  const { toast } = useToast();

   // Fetch user data on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true); // Start loading indicator
      if (user) {
        setCurrentUser(user);
        try {
            // Use Server Action to fetch profile
            const profileData = await getUserProfile(user.uid);

            if (profileData) {
                setProfile(profileData);
                setName(profileData.name || '');
                setEmail(profileData.email || ''); // Ensure email is not null
                setMobile(profileData.mobile || ''); // Handle potentially null mobile
                setProfilePicPreview(profileData.avatarUrl || null);

                // Check for existing role requests if user is 'user'
                if (profileData.role === 'user') {
                   const request = await checkExistingRoleRequest(user.uid);
                   setExistingRequest(request);
                } else {
                    setExistingRequest(null); // Clear if not a 'user'
                }
            } else {
                console.error("User profile not found in DB.");
                toast({ title: "Error", description: "Could not load profile.", variant: "destructive" });
                 if (auth) await signOut(auth); // Sign out if profile is missing
                router.push('/login');
            }
        } catch (error) {
            console.error("Error fetching user profile via Action:", error);
            toast({ title: "Error", description: "Failed to fetch profile.", variant: "destructive" });
             if (auth) await signOut(auth); // Sign out on error
             router.push('/login');
        } finally {
          setIsLoading(false);
        }
      } else {
         setCurrentUser(null);
         setProfile(null);
         setExistingRequest(null);
        setIsLoading(false);
        router.push('/login'); // Redirect if not logged in
      }
    });
    return () => unsubscribe();
  }, [toast, router]); // Add router to dependencies


  const handleProfilePicChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setProfilePic(file);
      const reader = new FileReader();
      reader.onloadend = () => {
          setProfilePicPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
        setProfilePic(null);
        setProfilePicPreview(profile?.avatarUrl || null);
    }
  };

  const handleProfileSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser) return;

    // TODO: Implement image upload logic here if profilePic exists
    // This typically involves uploading to a service (like Firebase Storage)
    // and getting the URL *before* calling the server action.
    // For now, we assume avatarUrl is handled separately or not implemented.

    const formData = new FormData();
    formData.append('name', name);
    formData.append('mobile', mobile);
    // If avatar URL was updated after upload, append it:
    // formData.append('avatarUrl', newAvatarUrl);

    startProfileSaveTransition(async () => {
        const result = await updateUserProfile(currentUser.uid, formData);
        if (result.success) {
            toast({ title: 'Profile Updated', description: result.message });
            // Optionally update local state if needed, though revalidation should handle it
            setProfile(prev => prev ? { ...prev, name, mobile } : null);
            setProfilePic(null); // Clear file input state
        } else {
            toast({ title: 'Update Failed', description: result.message, variant: 'destructive' });
        }
    });
  };

   // Password change remains client-side due to Firebase re-authentication requirement
  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser || !currentUser.email || !currentPassword) {
         toast({ title: 'Error', description: 'Current password is required.', variant: 'destructive' });
        return;
    }
     if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'New passwords do not match.', variant: 'destructive' });
      return;
    }
     if (newPassword.length < 8) {
      toast({ title: 'Error', description: 'New password must be at least 8 characters.', variant: 'destructive' });
      return;
    }
    setIsChangingPassword(true);

    try {
         const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
         await reauthenticateWithCredential(currentUser, credential);
         await updatePassword(currentUser, newPassword);

        toast({ title: 'Password Changed', description: 'Your password has been updated successfully.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
    } catch (error: any) {
        console.error("Password change error:", error);
        let message = 'Could not change password.';
        if (error.code === 'auth/wrong-password') {
            message = 'Incorrect current password.';
        } else if (error.code === 'auth/too-many-requests') {
             message = 'Too many attempts. Please try again later.';
        }
         toast({ title: 'Change Failed', description: message, variant: 'destructive' });
    } finally {
        setIsChangingPassword(false);
    }
  };

   // Account deletion remains client-side due to Firebase Auth requirement
   const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    if (!currentUser) {
        toast({ title: 'Error', description: 'User not logged in.', variant: 'destructive' });
        setIsDeletingAccount(false);
        return;
    }

    console.log('Attempting to delete account for UID:', currentUser.uid);

    try {
        // TODO: Implement re-authentication if needed by Firebase security rules
        // const credential = promptForCredentials(); // Need a UI for this
        // await reauthenticateWithCredential(currentUser, credential);

        // Delete from Firebase Auth
        await currentUser.delete();

        // Delete from SQLite (can be a separate Server Action or done here if careful)
        const db = await getDbConnection(); // Be cautious using DB connection directly in client components
        await db.run('DELETE FROM users WHERE uid = ?', currentUser.uid);
        // Consider potential cascade deletes or related data cleanup

        toast({ title: 'Account Deleted', description: 'Your account has been permanently deleted.' });
        // Clear local simulated session
        localStorage.removeItem('simulated_user_uid');
        router.push('/'); // Redirect user after deletion

    } catch (error: any) {
        console.error('Account deletion error:', error);
         let message = 'Could not delete account.';
        if (error.code === 'auth/requires-recent-login') {
            message = 'Please log out and log back in before deleting your account.';
        } else if (error.code === 'auth/wrong-password') {
            message = 'Incorrect password provided for deletion confirmation.';
        }
        toast({ title: 'Deletion Failed', description: message, variant: 'destructive' });
         setIsDeletingAccount(false);
    }
  };

   // Role request uses Server Action
   const handleRequestOwnerRole = async () => {
     if (!currentUser || !profile || profile.role !== 'user' || existingRequest?.status === 'pending' || existingRequest?.status === 'approved') {
       if (existingRequest?.status === 'pending') {
         toast({ title: "Request Pending", description: "Your request to become an owner is already pending review.", variant: "default" });
       } else if (existingRequest?.status === 'approved') {
          toast({ title: "Already Approved", description: "Your role is already Owner or your request was approved.", variant: "default" });
       }
       return;
     }

     startRoleRequestTransition(async () => {
         const result = await requestOwnerRoleUpgrade(currentUser.uid, profile.name, profile.email);
         if (result.success) {
            toast({ title: "Request Sent", description: result.message });
            // Re-check status after submitting by calling the check action again
            const updatedRequest = await checkExistingRoleRequest(currentUser.uid);
            setExistingRequest(updatedRequest);
         } else {
            toast({ title: "Request Failed", description: result.message, variant: "destructive" });
         }
     });
   };


  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!profile) {
     return <div className="text-center text-muted-foreground">Could not load user profile. Please try logging in again.</div>;
  }

  const userInitials = profile?.name ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';


  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-secondary-foreground">Profile Settings</h1>

      {/* Edit Profile Section */}
      <Card className="shadow-lg border-border">
        <CardHeader>
          <CardTitle className="text-xl text-secondary-foreground flex items-center gap-2"><UserCircle className="h-5 w-5"/> Edit Profile</CardTitle>
          <CardDescription>Update your personal information.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSave} className="space-y-6">
             <div className="flex items-center gap-4">
                 <Avatar className="h-20 w-20">
                    <AvatarImage src={profilePicPreview || undefined} alt={name} />
                    <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
                 <div className="space-y-2 flex-grow">
                     <Label htmlFor="profilePic">Profile Picture</Label>
                     <Input
                        id="profilePic"
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePicChange}
                        className="bg-background border-input file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-accent-foreground hover:file:bg-accent/90"
                    />
                     <p className="text-xs text-muted-foreground">Upload a new photo (JPG, PNG).</p>
                </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                <Label htmlFor="name-settings">Full Name</Label>
                <Input
                    id="name-settings"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-background border-input"
                    name="name" // Add name attribute for FormData
                />
                </div>
                <div className="space-y-2">
                <Label htmlFor="email-settings">Email Address</Label>
                 <Input
                    id="email-settings"
                    type="email"
                    value={email}
                    disabled // Typically email is not editable directly
                    readOnly
                    className="bg-muted border-input text-muted-foreground cursor-not-allowed"
                />
                 <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="mobile-settings">Mobile Number</Label>
                    <Input
                        id="mobile-settings"
                        type="tel"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        required
                        className="bg-background border-input"
                        name="mobile" // Add name attribute for FormData
                    />
                </div>
                 {/* Display Current Role */}
                 <div className="space-y-2">
                     <Label>Current Role</Label>
                     <Badge variant={profile.role === 'admin' ? 'destructive' : profile.role === 'owner' ? 'secondary' : 'outline'} className="capitalize mt-1">
                        {profile.role}
                    </Badge>
                 </div>
            </div>
             <div className="flex justify-end">
                <Button type="submit" disabled={isSavingProfile} variant="default">
                    {isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isSavingProfile ? 'Saving...' : 'Save Profile'}
                </Button>
            </div>
          </form>
        </CardContent>
      </Card>

       {/* Role Upgrade Request Section */}
       {profile.role === 'user' && (
            <Card className="shadow-lg border-border">
                <CardHeader>
                    <CardTitle className="text-xl text-secondary-foreground flex items-center gap-2">
                        <Building className="h-5 w-5" /> Become an Owner
                    </CardTitle>
                    <CardDescription>Request to list your properties on OwnBroker.</CardDescription>
                </CardHeader>
                <CardContent>
                    {existingRequest?.status === 'pending' ? (
                        <div className="flex items-center gap-2 p-3 rounded-md bg-yellow-100 border border-yellow-300 text-yellow-800">
                           <Loader2 className="h-5 w-5 animate-spin flex-shrink-0" />
                           <p className="text-sm font-medium">Your request to become an owner is currently pending admin review.</p>
                        </div>
                    ) : existingRequest?.status === 'approved' ? (
                         <div className="flex items-center gap-2 p-3 rounded-md bg-green-100 border border-green-300 text-green-800">
                           <Check className="h-5 w-5 flex-shrink-0" />
                           <p className="text-sm font-medium">Your request was approved! You can now access the Owner Dashboard.</p>
                        </div>
                    ) : existingRequest?.status === 'rejected' ? (
                         <div className="flex items-center gap-2 p-3 rounded-md bg-red-100 border border-red-300 text-red-800">
                            <HelpCircle className="h-5 w-5 flex-shrink-0" />
                           <div className="text-sm">
                             <p className="font-medium mb-1">Your previous request was rejected.</p>
                              {existingRequest.adminNotes && <p className="text-xs italic">Reason: {existingRequest.adminNotes}</p>}
                              {/* Don't allow re-request immediately after rejection, let button handle enabling */}
                           </div>
                         </div>
                    ) : (
                         <p className="text-muted-foreground text-sm mb-4">
                            If you own properties and want to list them on our platform, you can request an upgrade to an Owner account. This will allow you to access the Owner Dashboard.
                        </p>
                    )}
                </CardContent>
                <CardFooter className="flex justify-end">
                     {/* Button is enabled only if no pending/approved request or if last request was rejected */}
                    <Button
                        onClick={handleRequestOwnerRole}
                        disabled={isRequestingRole || existingRequest?.status === 'pending' || existingRequest?.status === 'approved'}
                        variant="default"
                    >
                         {isRequestingRole ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Building className="mr-2 h-4 w-4" />}
                         {existingRequest?.status === 'pending' ? 'Request Pending' :
                          existingRequest?.status === 'approved' ? 'Role Granted' :
                          isRequestingRole ? 'Sending Request...' :
                          existingRequest?.status === 'rejected' ? 'Re-submit Request' : 'Request Owner Role'}
                    </Button>
                </CardFooter>
            </Card>
       )}


      {/* Change Password Section */}
      <Card className="shadow-lg border-border">
        <CardHeader>
          <CardTitle className="text-xl text-secondary-foreground flex items-center gap-2"><KeyRound className="h-5 w-5"/> Change Password</CardTitle>
          <CardDescription>Update your account password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="bg-background border-input"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                        id="newPassword"
                        type="password"
                        placeholder="Min. 8 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={8}
                        className="bg-background border-input"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirmPassword-settings">Confirm New Password</Label>
                    <Input
                        id="confirmPassword-settings"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="bg-background border-input"
                    />
                </div>
            </div>
             <div className="flex justify-end">
                 <Button type="submit" disabled={isChangingPassword} variant="default">
                     {isChangingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                    {isChangingPassword ? 'Changing...' : 'Change Password'}
                </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Delete Account Section */}
      <Card className="shadow-lg border-destructive bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-xl text-destructive flex items-center gap-2"><Trash2 className="h-5 w-5"/> Delete Account</CardTitle>
          <CardDescription className="text-destructive/90">Permanently delete your account and all associated data. This action cannot be undone.</CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-end">
           <AlertDialog>
              <AlertDialogTrigger asChild>
                 <Button variant="destructive" disabled={isDeletingAccount}>
                    {isDeletingAccount ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    {isDeletingAccount ? 'Deleting...' : 'Delete My Account'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account ({profile.email}), booking history, and all related data from OwnBroker. You might be asked to re-enter your password for confirmation.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                 {/* TODO: Add password input here for re-authentication before deletion */}
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90">
                    Yes, Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
}