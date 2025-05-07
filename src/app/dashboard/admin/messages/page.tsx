// src/app/dashboard/admin/messages/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react'; // Import React
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label'; // Import Label component
import { Inbox, Search, Eye, Trash2, Reply, Loader2, Filter, CheckCheck, Send } from 'lucide-react'; // Icons
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
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ContactMessage } from '@/types/message';
// Import server actions
import {
    getAdminContactMessages,
    markMessageAsSeen,
    deleteContactMessage,
    sendAdminReply, // Import the new reply action
} from '@/actions/adminActions';

export default function AdminMessagesPage() {
    const [messages, setMessages] = useState<ContactMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [isReplying, startReplyTransition] = useTransition(); // Transition for reply action
    const [filterStatus, setFilterStatus] = useState<'all' | 'seen' | 'unseen'>('all');
    const [isPending, startTransition] = useTransition(); // For delete/mark as seen loading state
    const { toast } = useToast();

    // --- Function to fetch messages using Server Action ---
    const fetchMessages = async () => {
      setIsLoading(true);
      // No need for transition here, just set loading state
      // startTransition(async () => { // Remove transition for fetch
          try {
              const fetchedMessages = await getAdminContactMessages();
              if (fetchedMessages) {
                  setMessages(fetchedMessages);
              } else {
                  toast({ title: "Error", description: "Could not fetch messages.", variant: "destructive" });
                  setMessages([]); // Clear messages on error
              }
          } catch (error) {
              console.error("Error fetching messages via Action: ", error);
              toast({ title: "Error", description: "Could not fetch messages.", variant: "destructive" });
              setMessages([]);
          } finally {
              setIsLoading(false);
          }
      // }); // Remove transition for fetch
    };

    useEffect(() => {
        fetchMessages();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [toast]); // Only include toast in dependencies, fetchMessages doesn't need to be listed

    // --- Filter logic remains client-side ---
    const filteredMessages = useMemo(() => {
        return messages.filter(msg => {
            const matchesSearch = msg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  msg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  msg.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  msg.message.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesFilter = filterStatus === 'all' || msg.status === filterStatus;
            return matchesSearch && matchesFilter;
        });
    }, [messages, searchTerm, filterStatus]);

    // --- Handlers using Server Actions ---
    const handleViewMessage = async (message: ContactMessage) => {
        setSelectedMessage(message);
        setReplyContent(message.reply_text || ''); // Pre-fill reply if it exists
        // Mark as seen if unseen using Server Action
        if (message.status === 'unseen') {
            startTransition(async () => {
                try {
                    const result = await markMessageAsSeen(message.id);
                    if (result.success) {
                        // Optimistically update local state or rely on revalidation
                        setMessages(prev => prev.map(m => m.id === message.id ? { ...m, status: 'seen' } : m));
                        // toast({ title: "Status Updated", description: `Message marked as seen.` }); // Optional
                    } else {
                         throw new Error(result.message);
                    }
                 } catch (error: any) {
                      console.error("Error marking message as seen:", error);
                      toast({ title: "Error", description: error.message, variant: "destructive" });
                 }
            });
        }
    };

    const handleDeleteMessage = async (messageId: string | number) => {
        startTransition(async () => {
             try {
                 const result = await deleteContactMessage(messageId);
                 if (result.success) {
                     toast({ title: "Message Deleted", description: `Message ${messageId} has been removed.`, variant: "destructive" });
                     setSelectedMessage(null); // Close dialog if open
                     // Revalidation is handled by the action, update local state for immediate feedback
                     setMessages(prev => prev.filter(m => m.id !== messageId));
                 } else {
                      throw new Error(result.message);
                 }
             } catch (error: any) {
                  console.error("Error deleting message:", error);
                  toast({ title: "Error", description: error.message, variant: "destructive" });
             }
        });
    };

    // --- Handle Reply Submit using Server Action ---
    const handleReplySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMessage || !replyContent) return;

        // Use the server action to send the reply
        startReplyTransition(async () => {
             try {
                const result = await sendAdminReply(selectedMessage.id, replyContent, selectedMessage.userId); // Pass userId if available
                if (result.success) {
                    toast({ title: "Reply Sent", description: result.message });
                    // Update message state locally to reflect reply status immediately
                    setMessages(prev => prev.map(m => m.id === selectedMessage.id ? { ...m, has_admin_reply: true, reply_text: replyContent, reply_timestamp: new Date().toISOString(), status: 'seen' } : m));
                    // Close the dialog
                    const closeButton = document.getElementById(`close-view-dialog-${selectedMessage?.id}`);
                    closeButton?.click();
                    setSelectedMessage(null); // Reset selection
                    setReplyContent(''); // Clear reply input
                } else {
                    throw new Error(result.message);
                }
             } catch (error: any) {
                 console.error("Error sending reply:", error);
                 toast({ title: "Reply Failed", description: error.message, variant: "destructive" });
             }
        });
    };


     const handleFilterChange = (status: 'all' | 'seen' | 'unseen') => {
        setFilterStatus(status);
        // Filtering is client-side based on the fetched data
    };


    // Format timestamp utility - PARSE the string date first
    const formatTimestamp = (timestampString: string | null | undefined): string => {
        if (!timestampString) return 'N/A';
        try {
            const dateObj = new Date(timestampString);
            if (isNaN(dateObj.getTime())) {
                throw new Error("Invalid date string received");
            }
            return format(dateObj, 'PPpp');
        } catch (e) {
             console.error("Error formatting timestamp:", e, "Input:", timestampString);
            return 'Invalid Date';
        }
    };


    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <h1 className="text-3xl font-bold text-secondary-foreground">User Messages</h1>
            <p className="text-muted-foreground">View and manage messages submitted through the Contact Us form.</p>

            <Card className="shadow-lg transition-shadow hover:shadow-xl">
                 <CardHeader>
                     <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                         <div className="flex-1">
                            <CardTitle className="text-xl text-secondary-foreground">Message Inbox</CardTitle>
                            <CardDescription>Review user inquiries and support requests.</CardDescription>
                        </div>
                         <div className="flex gap-2 w-full sm:w-auto">
                             <div className="relative flex-1 sm:flex-grow-0 sm:w-64">
                                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Search messages..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 w-full bg-background"
                                />
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
                                    All Messages
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                    checked={filterStatus === 'unseen'}
                                    onCheckedChange={() => handleFilterChange('unseen')}
                                    >
                                    Unseen
                                    </DropdownMenuCheckboxItem>
                                    <DropdownMenuCheckboxItem
                                    checked={filterStatus === 'seen'}
                                    onCheckedChange={() => handleFilterChange('seen')}
                                    >
                                    Seen
                                    </DropdownMenuCheckboxItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
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
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Received</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Replied</TableHead> {/* Added Replied column */}
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMessages.length > 0 ? filteredMessages.map((msg) => (
                                    <TableRow key={msg.id} className={`hover:bg-muted/50 ${msg.status === 'unseen' ? 'font-semibold' : ''}`}>
                                        <TableCell>{msg.name}</TableCell>
                                        <TableCell>{msg.email}</TableCell>
                                        <TableCell>{msg.subject}</TableCell>
                                        <TableCell>{formatTimestamp(msg.timestamp)}</TableCell>
                                        <TableCell>
                                            <Badge variant={msg.status === 'seen' ? 'outline' : 'secondary'} className="capitalize">
                                                {msg.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                             {msg.has_admin_reply ? (
                                                <Badge variant="default" className="bg-green-100 text-green-800 border-green-300">
                                                     <CheckCheck className="mr-1 h-3 w-3"/> Replied
                                                </Badge>
                                             ) : (
                                                 <Badge variant="outline">No</Badge>
                                             )}
                                        </TableCell>
                                        <TableCell className="text-right space-x-1">
                                            <Dialog onOpenChange={(open) => { if (!open) { setSelectedMessage(null); setReplyContent(''); } }}>
                                                <DialogTrigger asChild>
                                                     <Button variant="ghost" size="icon" title="View & Reply" onClick={() => handleViewMessage(msg)}>
                                                        <Eye className="h-4 w-4 text-primary" />
                                                     </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-2xl">
                                                    <DialogHeader>
                                                        <DialogTitle>Message from: {selectedMessage?.name}</DialogTitle>
                                                        <DialogDescription>
                                                           Subject: {selectedMessage?.subject} | Received: {formatTimestamp(selectedMessage?.timestamp)}
                                                           {selectedMessage?.userId && <span className="text-xs italic"> (From User ID: {selectedMessage.userId})</span>}
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="py-4 space-y-4">
                                                        <div>
                                                             <Label className="text-xs font-semibold text-muted-foreground">Original Message:</Label>
                                                            <div className="mt-1 p-3 border rounded-md bg-muted/50 max-h-40 overflow-y-auto text-sm whitespace-pre-wrap">
                                                                {selectedMessage?.message}
                                                            </div>
                                                        </div>
                                                        <form onSubmit={handleReplySubmit} className="space-y-2">
                                                             <Label htmlFor={`reply-${selectedMessage?.id}`}>Your Reply</Label>
                                                             <Textarea
                                                                id={`reply-${selectedMessage?.id}`}
                                                                placeholder={`Reply to ${selectedMessage?.email}...`}
                                                                rows={4}
                                                                value={replyContent}
                                                                onChange={(e) => setReplyContent(e.target.value)}
                                                                required
                                                                className="bg-background"
                                                                disabled={isReplying}
                                                            />
                                                             <DialogFooter className="mt-4">
                                                                <DialogClose asChild>
                                                                     <Button id={`close-view-dialog-${selectedMessage?.id}`} type="button" variant="outline" onClick={() => {setSelectedMessage(null); setReplyContent('');}} disabled={isReplying}>Cancel</Button>
                                                                 </DialogClose>
                                                                 <Button type="submit" variant="default" disabled={isReplying || !replyContent}>
                                                                    {isReplying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                                                    {isReplying ? 'Sending...' : (selectedMessage?.has_admin_reply ? 'Update Reply' : 'Send Reply')}
                                                                </Button>
                                                             </DialogFooter>
                                                        </form>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" title="Delete Message" className="text-destructive hover:bg-destructive/10" disabled={isPending}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete the message from <span className="font-semibold">{msg.name}</span> regarding "{msg.subject}".
                                                    </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                    <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteMessage(msg.id)} className="bg-destructive hover:bg-destructive/90" disabled={isPending}>
                                                        {isPending ? <Loader2 className='mr-2 h-4 w-4 animate-spin'/> : null} Yes, Delete Message
                                                    </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                            No messages found matching criteria.
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
    