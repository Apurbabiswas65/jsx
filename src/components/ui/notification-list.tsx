"use client";

import React, { useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface Notification {
  id: number;
  title: string;
  message: string;
  created_at: string;
  status: 'unread' | 'read';
}

interface NotificationListProps {
  role: 'admin' | 'owner' | 'user';
}

export const NotificationList: React.FC<NotificationListProps> = ({ role }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch(`/api/notifications?role=${role}`);
        const data = await response.json();
        setNotifications(data);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, [role]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-64">
      {notifications.length > 0 ? (
        notifications.map((notification) => {
          if (!notification) {
            console.error('Error: Notification is null or undefined');
            return null;
          }

          return (
            <Card key={notification.id} className="mb-2">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-primary">
                  {notification.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {notification.message}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(notification.created_at).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          );
        })
      ) : (
        <p className="text-center text-sm text-muted-foreground">No notifications available.</p>
      )}
    </ScrollArea>
  );
};