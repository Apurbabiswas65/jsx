// src/app/dashboard/admin/role-requests/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react'; // Import React
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input'; // Keep Input for potential notes
import { Textarea } from '@/components/ui/textarea'; // For admin notes
import { Label } from '@/components/ui/label'; // Import Label component
import { CheckCircle, XCircle, Clock, Loader2, UserCheck, Search, Filter } from 'lucide-react'; // Icons
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RoleRequest } from '@/types/roleRequest'; // Import RoleRequest type
// Import Server Actions
import {
    getAdminRoleRequests,
    approveRoleRequest,
    rejectRoleRequest,
} from '@/actions/adminActions';


export default function AdminRoleRequestsPage() {
    // TODO: Add authentication check here to ensure only admins can access
    const [requests, setRequests] = useState<RoleRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<'all' | RoleRequest['status']>('pending'); // Default to pending
    const [selectedRequest, setSelectedRequest] = useState<RoleRequest | null>(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [isProcessing, startTransition] = useTransition(); // Use useTransition for server action loading
    const { toast } = useToast();

    // --- Function to fetch role requests using Server Action ---
    const fetchRequests = async (status: 'all' | RoleRequest['status']) => {
        setIsLoading(true);
        startTransition(async () => {
            try {
                const fetchedRequests = await getAdminRoleRequests(status);
                if (fetchedRequests) {
                    setRequests(fetchedRequests);
                } else {
                    toast({ title: "Error", description: "Could not fetch role requests.", variant: "destructive" });
                    setRequests([]);
                }
            } catch (error) {
                console.error("Error fetching role requests via Action: ", error);
                toast({ title: "Error", description: "Could not fetch role requests.", variant: "destructive" });
                setRequests([]);
            } finally {
                setIsLoading(false);
            }
        });
    };

    useEffect(() => {
        fetchRequests(filterStatus);
    }, [filterStatus, toast]); // Re-fetch when filter changes


    // Client-side filtering is no longer needed as the action handles it
    const filteredRequests = requests; // Directly use the state


    const handleApproveRequest = async (request: RoleRequest) => {
        if (isProcessing) return;

        startTransition(async () => {
            const result = await approveRoleRequest(request.id, request.userId, adminNotes || 'Approved');
            if (result.success) {
                toast({ title: "Request Approved", description: `${request.userName}'s role updated to Owner.` });
                setSelectedRequest(null); // Close dialog/modal
                setAdminNotes(''); // Clear notes
                // Re-fetch with current filter to refresh list
                fetchRequests(filterStatus);
                // TODO: Optionally send notification to user
            } else {
                toast({ title: "Approval Failed", description: result.message, variant: "destructive" });
            }
        });
    };

    const handleRejectRequest = async (request: RoleRequest) => {
        if (isProcessing || !adminNotes) { // Require notes for rejection
            toast({ title: "Rejection Failed", description: "Please provide a reason for rejection in the notes.", variant: "destructive" });
             return;
        }

        startTransition(async () => {
            const result = await rejectRoleRequest(request.id, request.userId, adminNotes); // Pass userId
            if (result.success) {
                toast({ title: "Request Rejected", description: `${request.userName}'s request has been rejected.`, variant: "destructive" });
                setSelectedRequest(null); // Close dialog/modal
                setAdminNotes(''); // Clear notes
                // Re-fetch with current filter to refresh list
                fetchRequests(filterStatus);
                // TODO: Optionally send notification to user with the reason (adminNotes)
            } else {
                toast({ title: "Rejection Failed", description: result.message, variant: "destructive" });
            }
        });
    };


    const handleFilterChange = (status: 'all' | RoleRequest['status']) => {
        setFilterStatus(status);
        // Fetching is triggered by useEffect dependency change
    };

    // Format timestamp utility - PARSE the string date first
    const formatTimestamp = (timestampString: string | null | undefined): string => {
        if (!timestampString) return 'N/A';
        try {
            const dateObj = new Date(timestampString);
            if (isNaN(dateObj.getTime())) {
                throw new Error("Invalid date string received");
            }
            return format(dateObj, 'PPp'); // Format like: Aug 15, 2024, 4:30 PM
        } catch (e) {
             console.error("Error formatting timestamp:", e, "Input:", timestampString);
            return 'Invalid Date';
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-secondary-foreground">Manage Role Requests</h1>
            <p className="text-muted-foreground">Approve or reject requests from users wanting to become Property Owners.</p>

             {/* Shared Dialog for Actions */}
             <Dialog open={!!selectedRequest} onOpenChange={(isOpen) => {if (!isOpen) {setSelectedRequest(null); setAdminNotes('');}}}>
                 <DialogContent>
                     <DialogHeader>
                         <DialogTitle>Action on Request for {selectedRequest?.userName}</DialogTitle>
                         <DialogDescription>
                            Review the request details before approving or rejecting. Requested Role: <Badge variant="secondary" className='ml-1'>{selectedRequest?.requestedRole}</Badge>
                         </DialogDescription>
                     </DialogHeader>
                      <div className="py-4 space-y-4">
                           <p className="text-sm">User: <span className="font-medium">{selectedRequest?.userName}</span> ({selectedRequest?.userEmail})</p>
                           <p className="text-sm">Requested On: {formatTimestamp(selectedRequest?.requestTimestamp)}</p>
                            <div className="space-y-2">
                                <Label htmlFor="admin-notes">Admin Notes (Required for Rejection)</Label>
                                <Textarea
                                    id="admin-notes"
                                    placeholder="Provide reason for rejection or notes for approval..."
                                    rows={3}
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    className="bg-background"
                                />
                            </div>
                       </div>
                     <DialogFooter className="gap-2">
                         <DialogClose asChild>
                             <Button variant="outline" disabled={isProcessing}>Cancel</Button>
                         </DialogClose>
                          <Button
                             variant="destructive"
                             onClick={() => selectedRequest && handleRejectRequest(selectedRequest)}
                             disabled={isProcessing || !adminNotes}
                         >
                             {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                             Reject
                         </Button>
                         <Button
                             variant="default"
                             onClick={() => selectedRequest && handleApproveRequest(selectedRequest)}
                              disabled={isProcessing}
                         >
                             {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                             Approve
                         </Button>
                     </DialogFooter>
                 </DialogContent>
             </Dialog>


            <Card className="shadow-lg">
                 <CardHeader>
                     <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                         <div className="flex-1">
                            <CardTitle className="text-xl text-secondary-foreground">Role Upgrade Requests</CardTitle>
                            <CardDescription>Users requesting 'Owner' role.</CardDescription>
                        </div>
                         <div className="flex gap-2 w-full sm:w-auto">
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
                                    > All Requests </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                        checked={filterStatus === 'pending'}
                                        onCheckedChange={() => handleFilterChange('pending')}
                                    > Pending </DropdownMenuCheckboxItem>
                                     <DropdownMenuCheckboxItem
                                        checked={filterStatus === 'approved'}
                                        onCheckedChange={() => handleFilterChange('approved')}
                                    > Approved </DropdownMenuCheckboxItem>
                                     <DropdownMenuCheckboxItem
                                        checked={filterStatus === 'rejected'}
                                        onCheckedChange={() => handleFilterChange('rejected')}
                                    > Rejected </DropdownMenuCheckboxItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                         </div>
                    </div>
                </CardHeader>
                <CardContent>
                     {isLoading && !isProcessing ? ( // Show loading spinner only during initial fetch
                         <div className="flex justify-center items-center h-64">
                             <Loader2 className="h-8 w-8 animate-spin text-primary" />
                         </div>
                     ) : (
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Requested Role</TableHead>
                                    <TableHead>Requested On</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRequests.length > 0 ? filteredRequests.map((req) => (
                                    <TableRow key={req.id} className={`hover:bg-muted/50 ${req.status === 'pending' ? 'font-semibold' : ''}`}>
                                        <TableCell>{req.userName}</TableCell>
                                        <TableCell>{req.userEmail}</TableCell>
                                         <TableCell><Badge variant="outline" className="capitalize">{req.requestedRole}</Badge></TableCell>
                                        <TableCell>{formatTimestamp(req.requestTimestamp)}</TableCell>
                                        <TableCell>
                                             <Badge variant={
                                                req.status === 'approved' ? 'default' : req.status === 'pending' ? 'secondary' : 'destructive'
                                                } className={`capitalize ${
                                                req.status === 'approved' ? 'bg-green-100 text-green-800 border-green-300' :
                                                req.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                                req.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-300' : ''
                                                }`}>
                                                {req.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right space-x-1">
                                             {req.status === 'pending' ? (
                                                <Button variant="default" size="sm" onClick={() => setSelectedRequest(req)} disabled={isProcessing}>
                                                    {isProcessing && selectedRequest?.id === req.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Review
                                                 </Button>
                                            ) : (
                                                 <span className="text-xs text-muted-foreground italic">
                                                     {req.status === 'approved' ? `Approved on ${formatTimestamp(req.actionTimestamp)}` : req.status === 'rejected' ? `Rejected on ${formatTimestamp(req.actionTimestamp)}` : 'Action Taken'}
                                                     {req.status === 'rejected' && req.adminNotes && <p className='text-xs not-italic'>Reason: {req.adminNotes}</p>}
                                                 </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            No role requests found matching criteria.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                     )}
                     {/* TODO: Add Pagination if needed */}
                </CardContent>
            </Card>
        </div>
    );
}