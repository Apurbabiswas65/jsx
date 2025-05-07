
// src/components/auth/RequestOwnerRoleDialog.tsx
'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Send, Building } from 'lucide-react';

interface RequestOwnerRoleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message?: string) => void; // Optional message
  isSubmitting: boolean;
}

export function RequestOwnerRoleDialog({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: RequestOwnerRoleDialogProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    // Pass the message to the onSubmit handler
    // Note: The current server action might not use this message yet.
    onSubmit(message || undefined);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" /> Request Owner Role
          </DialogTitle>
          <DialogDescription>
            Submit a request to become a Property Owner. You'll be able to list properties once approved by an admin.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
           {/* Optional message field - Can be removed if not used by the action */}
           {/* <div className="space-y-2">
                <Label htmlFor="request-message">Message for Admin (Optional)</Label>
                <Textarea
                    id="request-message"
                    placeholder="You can add a brief note for the admin reviewing your request..."
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="bg-background"
                    disabled={isSubmitting}
                />
            </div> */}
            <p className="text-sm text-muted-foreground">
                Clicking 'Submit Request' will notify the administrators for approval.
            </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
