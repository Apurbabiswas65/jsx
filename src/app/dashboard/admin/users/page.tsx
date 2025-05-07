// src/app/dashboard/admin/users/page.tsx
'use client';

import { useState, useEffect, useTransition } from 'react'; // Import useTransition
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Search, CheckCircle, XCircle, Clock, UserCog, Trash2, Loader2, Ban } from 'lucide-react'; // Added Ban for suspend
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
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateUserRole, getAdminUsers, toggleUserSuspension, deleteUserAccount } from '@/actions/adminActions'; // Import the server actions
import type { UserProfileData } from '@/types/user'; // Import type
import { format } from 'date-fns'; // Import format for date

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserProfileData[]>([]); // Use UserProfileData type
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, startLoadingTransition] = useTransition(); // Loading state for fetching
    const [isProcessingAction, startActionTransition] = useTransition(); // Separate transition for actions
    const [userToDelete, setUserToDelete] = useState<UserProfileData | null>(null); // State for deletion confirmation
    const [userToSuspend, setUserToSuspend] = useState<UserProfileData | null>(null); // State for suspension confirmation
    const { toast } = useToast();

    // Fetch users using the server action
    const fetchUsers = async () => {
        startLoadingTransition(async () => {
            try {
                const fetchedUsers = await getAdminUsers();
                if (fetchedUsers) {
                    setUsers(fetchedUsers);
                } else {
                    setUsers([]);
                    toast({ title: "Error", description: "Could not fetch users.", variant: "destructive" });
                }
            } catch (error: any) {
                 setUsers([]);
                 console.error("Error fetching users:", error);
                 toast({ title: "Error", description: `Failed to fetch users: ${error.message || 'Unknown error'}`, variant: "destructive" });
            }
        });
    };

    useEffect(() => {
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Fetch on initial load only

    // Filtering remains client-side after data is fetched
    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleRoleChange = async (userId: string, newRole: 'user' | 'owner') => {
        const userToUpdate = users.find(u => u.uid === userId);
        if (!userToUpdate || userToUpdate.role === newRole) return; // No change needed

        startActionTransition(async () => {
            try {
                const result = await updateUserRole(userId, newRole);
                if (result.success) {
                    toast({ title: "Role Updated", description: `User ${userToUpdate.name}'s role changed to ${newRole}.` });
                    // Re-fetch or rely on revalidatePath in action
                    // fetchUsers(); // Optionally re-fetch manually if needed
                } else {
                    throw new Error(result.message);
                }
            } catch (error: any) {
                console.error("Failed to update user role:", error);
                toast({ title: "Update Failed", description: error.message || "Could not update user role.", variant: "destructive" });
            }
        });
    };

    // --- Action Handlers using Server Actions ---
    const handleToggleSuspend = async (user: UserProfileData) => {
         if (!user) return;
         setUserToSuspend(null); // Close dialog

         startActionTransition(async () => {
             try {
                 const result = await toggleUserSuspension(user.uid);
                 if (result.success) {
                    toast({
                        title: result.newStatus === 'suspended' ? "User Suspended" : "User Unsuspended",
                        description: `User ${user.name}'s account is now ${result.newStatus}.`,
                        variant: result.newStatus === 'suspended' ? 'destructive' : 'default'
                    });
                    // Re-fetch or rely on revalidatePath in action
                    // fetchUsers();
                 } else {
                    throw new Error(result.message);
                 }
             } catch (error: any) {
                 console.error("Error toggling suspension:", error);
                 toast({ title: "Action Failed", description: error.message || "Could not update user status.", variant: "destructive" });
             }
         });
    };

    const handleDelete = async (userId: string | undefined) => {
        if (!userId) return;
        setUserToDelete(null); // Close confirmation dialog

        startActionTransition(async () => {
            try {
                const result = await deleteUserAccount(userId);
                if (result.success) {
                    toast({ title: "User Deleted", description: result.message, variant: "destructive" });
                    // Re-fetch or rely on revalidatePath in action
                    // fetchUsers();
                } else {
                    throw new Error(result.message);
                }
            } catch (error: any) {
                 console.error("Error deleting user:", error);
                 toast({ title: "Deletion Failed", description: error.message || "Could not delete user.", variant: "destructive" });
            }
        });
    };


    // Format timestamp utility - PARSE the string date first
    const formatTimestamp = (timestampString: string | null | undefined): string => {
        if (!timestampString) return 'N/A';
        try {
            const dateObj = new Date(timestampString);
            if (isNaN(dateObj.getTime())) {
                // Check if it's already a simple date string like 'YYYY-MM-DD'
                 if (/^\d{4}-\d{2}-\d{2}$/.test(timestampString)) {
                     return format(new Date(timestampString + 'T00:00:00'), 'PP'); // Add time part for parsing
                 }
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
            {/* Suspension Confirmation Dialog */}
             <AlertDialog open={!!userToSuspend} onOpenChange={(open) => !open && setUserToSuspend(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Suspension/Activation</AlertDialogTitle>
                    <AlertDialogDescription>
                         Are you sure you want to {userToSuspend?.status === 'suspended' ? 'unsuspend' : 'suspend'} the account for <span className="font-semibold">{userToSuspend?.name}</span>?
                         {userToSuspend?.status !== 'suspended' && " Suspending will prevent them from logging in."}
                         {userToSuspend?.status === 'suspended' && " Unsuspending will allow them to log in again."}
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel disabled={isProcessingAction}>Cancel</AlertDialogCancel>
                     <AlertDialogAction
                         onClick={() => handleToggleSuspend(userToSuspend!)} // Non-null assertion as dialog is open
                         className={userToSuspend?.status !== 'suspended' ? "bg-yellow-600 hover:bg-yellow-700" : "bg-green-600 hover:bg-green-700"}
                         disabled={isProcessingAction}
                     >
                         {isProcessingAction ? <Loader2 className='mr-2 h-4 w-4 animate-spin'/> : null}
                         {userToSuspend?.status === 'suspended' ? 'Yes, Unsuspend' : 'Yes, Suspend'}
                     </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

             {/* Deletion Confirmation Dialog */}
             <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the user account for <span className="font-semibold">{userToDelete?.name}</span> ({userToDelete?.email}).
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel disabled={isProcessingAction}>Cancel</AlertDialogCancel>
                     <AlertDialogAction
                         onClick={() => handleDelete(userToDelete?.uid)}
                         className="bg-destructive hover:bg-destructive/90"
                         disabled={isProcessingAction}
                     >
                         {isProcessingAction ? <Loader2 className='mr-2 h-4 w-4 animate-spin'/> : null} Yes, Delete User
                     </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>


            <h1 className="text-3xl font-bold text-secondary-foreground">Manage Users</h1>
            <p className="text-muted-foreground">Oversee all registered users and owners on the platform.</p>

            <Card className="shadow-lg transition-shadow hover:shadow-xl">
                <CardHeader>
                     <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <CardTitle className="text-xl text-secondary-foreground">User List</CardTitle>
                         <div className="relative w-full sm:w-64">
                             <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search by name or email..."
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
                    ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                                <TableRow key={user.uid} className="hover:bg-muted/50">
                                    <TableCell className="font-medium">{user.name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === 'admin' ? 'destructive' : user.role === 'owner' ? 'secondary' : 'outline'} className="capitalize">
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                         <Badge variant={
                                            user.status === 'active' ? 'default' : user.status === 'pending' ? 'secondary' : 'destructive'
                                            } className={
                                            `capitalize ${
                                            user.status === 'active' ? 'bg-green-100 text-green-800 border-green-300' :
                                            user.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                            user.status === 'suspended' ? 'bg-red-100 text-red-800 border-red-300' : ''
                                            }`
                                            }>
                                        {user.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{formatTimestamp(user.createdAt)}</TableCell>
                                    <TableCell className="text-right space-x-1">
                                         {user.role !== 'admin' && ( // Admins cannot modify themselves or other admins easily here
                                            <>
                                                {/* Role Change Dropdown */}
                                                 <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" disabled={isProcessingAction}>
                                                            {/* Show loader only if this specific user's role is being changed */}
                                                            {isProcessingAction ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <UserCog className="mr-1 h-4 w-4" />} Change Role
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Set Role</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            disabled={user.role === 'user'}
                                                            onSelect={() => handleRoleChange(user.uid, 'user')}
                                                            className="cursor-pointer"
                                                        >
                                                            Make User
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            disabled={user.role === 'owner'}
                                                            onSelect={() => handleRoleChange(user.uid, 'owner')}
                                                            className="cursor-pointer"
                                                        >
                                                            Make Owner
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>

                                                 {/* Suspend/Unsuspend Button */}
                                                 <Button
                                                    variant="ghost" size="sm"
                                                    className={`hover:bg-yellow-100 ${user.status === 'suspended' ? 'text-yellow-600' : 'text-yellow-600'}`}
                                                    onClick={() => setUserToSuspend(user)} // Open confirmation dialog
                                                    disabled={isProcessingAction}
                                                >
                                                    {user.status === 'suspended' ? <CheckCircle className="mr-1 h-4 w-4" /> : <Ban className="mr-1 h-4 w-4" />}
                                                     {user.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                                                </Button>

                                                 {/* Delete Button */}
                                                <Button
                                                    variant="ghost" size="sm"
                                                    className="text-destructive hover:bg-destructive/10"
                                                    onClick={() => setUserToDelete(user)} // Open confirmation dialog
                                                    disabled={isProcessingAction}
                                                >
                                                    <Trash2 className="mr-1 h-4 w-4" /> Delete
                                                </Button>
                                            </>
                                        )}
                                         {user.role === 'admin' && (
                                             <span className="text-xs text-muted-foreground italic">No actions</span>
                                         )}
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        No users found matching your search.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    )}
                     {/* TODO: Add Pagination */}
                </CardContent>
            </Card>
        </div>
    );
}

    