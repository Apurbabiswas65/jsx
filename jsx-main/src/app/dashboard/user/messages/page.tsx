// src/app/dashboard/user/messages/page.tsx
'use client';

import React, { useState, useEffect, useTransition, useMemo } from 'react'; // Import React hooks
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Bell, Inbox, Loader2, Check, ExternalLink, CornerDownRight } from 'lucide-react'; // Icons
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getUserNotifications, markNotificationAsRead, getUserContactMessages } from '@/actions/userActions'; // Added getUserContactMessages
import { useToast } from '@/hooks/use-toast';
import type { Notification } from '@/types/notification'; // Import Notification type
import type { ContactMessage } from '@/types/message'; // Import ContactMessage type
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs
import Link from 'next/link'; // Import Link
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"; // Import Accordion


// Placeholder for session check (use your actual implementation)
async function getCurrentUserUidFromSession(): Promise<string | null> {
   if (typeof window !== 'undefined') {
       return localStorage.getItem('simulated_user_uid');
   }
   return null;
}

export default function UserMessagesPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]); // State for contact messages
    const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(true); // Loading state for messages
    const [isUpdating, startUpdateTransition] = useTransition();
    const [activeTab, setActiveTab] = useState<'notifications' | 'enquiries'>('notifications'); // Default to notifications
    const [userId, setUserId] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const fetchUid = async () => {
            const uid = await getCurrentUserUidFromSession();
            setUserId(uid);
            if (!uid) { // Clear loading states if no user
                setIsLoadingNotifications(false);
                setIsLoadingMessages(false);
            }
        };
        fetchUid();
    }, []);

    // Fetch notifications when userId is available
    useEffect(() => {
        const fetchNotifications = async () => {
            setIsLoadingNotifications(true);
            try {
                const fetchedData = await getUserNotifications(userId, 'all');
                setNotifications(fetchedData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
            } catch (error) {
                console.error('Error fetching notifications:', error);
                setNotifications([]);
            } finally {
                setIsLoadingNotifications(false);
            }
        };

        if (userId) {
            fetchNotifications();
        }
    }, [userId]);

     // Fetch contact messages when userId is available
     useEffect(() => {
        if (!userId) return;

        const fetchContactMessages = async () => {
            setIsLoadingMessages(true);
            try {
                const fetchedData = await getUserContactMessages(userId);
                if (fetchedData) {
                     // Sort by timestamp descending
                    fetchedData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                    setContactMessages(fetchedData);
                } else {
                    setContactMessages([]);
                     // Don't show toast error if notifications already failed
                     if (!isLoadingNotifications) {
                        toast({ title: "Error", description: "Could not load your contact messages.", variant: "destructive" });
                     }
                }
            } catch (error) {
                console.error("Error fetching user contact messages:", error);
                toast({ title: "Error", description: "Failed to fetch your contact messages.", variant: "destructive" });
            } finally {
                setIsLoadingMessages(false);
            }
        };

        fetchContactMessages();
    }, [userId, toast, isLoadingNotifications]); // Depend on userId


    const handleMarkAsRead = (notificationId: number | string) => {
        if (!userId || !notificationId) return; // Ensure userId and notificationId are valid
        startUpdateTransition(async () => {
            const result = await markNotificationAsRead(notificationId, userId);
            if (result.success) {
                setNotifications(prev =>
                    prev.map(n => (n.id === notificationId ? { ...n, status: 'read' } : n))
                );
            } else {
                toast({ title: "Error", description: result.message, variant: "destructive" });
            }
        });
    };

    // Format timestamp utility
    const formatTimestamp = (timestampString: string | null | undefined): string => {
        if (!timestampString) return 'N/A';
        try {
            const dateObj = new Date(timestampString);
            return isNaN(dateObj.getTime()) ? 'Invalid Date' : format(dateObj, 'PPpp'); // E.g., Aug 23, 2024, 4:30:15 PM
        } catch (e) {
            console.error("Error formatting timestamp:", e);
            return 'Invalid Date';
        }
    };

    // Function to determine the link for a notification
    const getRelatedLink = (notification: Notification): string | null => {
        if (!notification.relatedId && notification.type !== 'role_request_status' && notification.type !== 'role_change' && notification.type !== 'contact_reply') return null;

        switch (notification.type) {
            case 'booking_status':
                return `/dashboard/user/bookings`; // Link to booking list for now
            case 'role_request_status':
            case 'role_change':
                return `/dashboard/user/settings`; // Link role updates to settings
            case 'contact_reply':
                 // Link to the enquiries tab, potentially highlighting the specific message (future enhancement)
                 // For now, just switch the tab
                return `#enquiries`; // Fragment identifier to potentially scroll/filter later
            default:
                return null; // No specific link for other types
        }
    }

    const unreadCount = useMemo(() => notifications.filter(n => n.status === 'unread').length, [notifications]);
    const hasUnreadReplies = useMemo(() => contactMessages.some(m => m.has_admin_reply), [contactMessages]); // Check if any message has a reply

    const handleNotificationLinkClick = (link: string | null, notificationId: number | string) => {
        if (link === '#enquiries') {
            setActiveTab('enquiries');
            // Mark as read immediately when attempting to view the reply
             handleMarkAsRead(notificationId);
        } else if (link) {
             // Mark as read when navigating away
             handleMarkAsRead(notificationId);
            router.push(link); // Use Next.js router for other links
        } else {
             // If no specific link, just mark as read
             handleMarkAsRead(notificationId);
        }
    };

    const isLoading = isLoadingNotifications || isLoadingMessages;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <h1 className="text-3xl font-bold text-secondary-foreground">Messages & Notifications</h1>
            <p className="text-muted-foreground">View important updates, replies to your enquiries, and system notifications.</p>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
                 <TabsList className="grid w-full grid-cols-2">
                     <TabsTrigger value="notifications">
                         <Bell className="mr-2 h-4 w-4" /> Notifications {unreadCount > 0 && <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">{unreadCount}</Badge>}
                     </TabsTrigger>
                     <TabsTrigger value="enquiries">
                         <MessageSquare className="mr-2 h-4 w-4" /> My Enquiries {hasUnreadReplies && <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">Reply</Badge>}
                    </TabsTrigger>
                 </TabsList>

                {/* Notifications Tab */}
                <TabsContent value="notifications">
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-xl text-secondary-foreground flex items-center gap-2">
                                <Bell className="h-5 w-5" /> System Notifications
                            </CardTitle>
                            <CardDescription>Updates related to your account, bookings, and requests.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoadingNotifications ? (
                                <div className="flex justify-center items-center h-40">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8">
                                    <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    You have no notifications.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-muted">
                                        <thead className="bg-muted">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-sm font-semibold text-secondary-foreground">Title</th>
                                                <th className="px-4 py-2 text-left text-sm font-semibold text-secondary-foreground">Message</th>
                                                <th className="px-4 py-2 text-left text-sm font-semibold text-secondary-foreground">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-muted">
                                            {notifications.map((notification) => (
                                                <tr key={notification.id} className="hover:bg-muted/50 transition-colors">
                                                    <td className="px-4 py-3 text-sm font-medium text-secondary-foreground whitespace-nowrap">{notification.title}</td>
                                                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{notification.message}</td>
                                                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{new Date(notification.created_at).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Enquiries Tab */}
                <TabsContent value="enquiries">
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-xl text-secondary-foreground flex items-center gap-2">
                                <MessageSquare className="h-5 w-5" /> My Contact Messages
                            </CardTitle>
                            <CardDescription>Messages you've sent via the Contact Us form and admin replies.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           {isLoadingMessages ? (
                                <div className="flex justify-center items-center h-40">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                           ) : contactMessages.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8">
                                    <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    You haven't sent any messages yet.
                                     <Button asChild variant="link" className="block mx-auto mt-2">
                                        <Link href="/contact">Contact Us</Link>
                                     </Button>
                                </div>
                            ) : (
                                 <Accordion type="multiple" className="w-full space-y-2">
                                    {contactMessages.map((msg) => (
                                    <AccordionItem value={`msg-${msg.id}`} key={`msg-${msg.id}`} className="border rounded-md px-4 data-[state=open]:bg-muted/30 transition-colors">
                                        <AccordionTrigger className="hover:no-underline py-3">
                                            <div className="flex justify-between items-center w-full">
                                                <span className={`text-sm font-medium ${msg.has_admin_reply ? 'text-primary' : 'text-secondary-foreground'}`}>
                                                   Subject: {msg.subject}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                     {msg.has_admin_reply && (
                                                        <Badge variant="default" className="bg-primary/10 text-primary border-primary/30">Admin Replied</Badge>
                                                    )}
                                                    <span className="text-xs text-muted-foreground">{format(new Date(msg.timestamp), 'PP')}</span>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-2 pb-4 space-y-4">
                                            <div>
                                                <p className="text-xs font-semibold text-muted-foreground mb-1">Your Message:</p>
                                                <p className="text-sm whitespace-pre-wrap bg-background p-3 rounded border">{msg.message}</p>
                                            </div>
                                            {msg.has_admin_reply && msg.reply_text && (
                                                <div className="pl-4 border-l-4 border-primary ml-4">
                                                    <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1">
                                                         <CornerDownRight className="h-3.5 w-3.5" /> Admin Reply <span className="text-muted-foreground font-normal">({formatTimestamp(msg.reply_timestamp)})</span>:
                                                    </p>
                                                    <p className="text-sm whitespace-pre-wrap bg-primary/5 p-3 rounded border border-primary/20">{msg.reply_text}</p>
                                                </div>
                                            )}
                                             {!msg.has_admin_reply && (
                                                 <p className="text-sm italic text-muted-foreground text-center pt-2">No admin reply yet.</p>
                                             )}
                                        </AccordionContent>
                                    </AccordionItem>
                                    ))}
                                </Accordion>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}