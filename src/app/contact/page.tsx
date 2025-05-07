
// src/app/contact/page.tsx
'use client';

import { useEffect, useActionState, useState } from 'react'; // Import useEffect, useActionState, useState
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Mail, Phone, MapPin } from 'lucide-react';
import { saveContactMessage, type ContactFormState } from '@/actions/contactActions';

// Placeholder for session check
async function getCurrentUserUidFromSession(): Promise<string | null> {
   if (typeof window !== 'undefined') {
       return localStorage.getItem('simulated_user_uid');
   }
   return null;
}

// Separate Submit Button component to use useFormStatus hook
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" variant="default" disabled={pending}>
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Send className="mr-2 h-4 w-4" />
      )}
      {pending ? 'Sending...' : 'Send Message'}
    </Button>
  );
}

export default function ContactUsPage() {
  const initialState: ContactFormState = { message: '', success: false };
  const [state, formAction] = useActionState(saveContactMessage, initialState); // Use useActionState
  const [userId, setUserId] = useState<string | null>(null); // State to hold user ID
  const { toast } = useToast();

  // Fetch userId on mount
   useEffect(() => {
        const fetchUid = async () => {
            const uid = await getCurrentUserUidFromSession();
            setUserId(uid);
            console.log("[Contact Page] Fetched User ID:", uid);
        };
        fetchUid();
    }, []);

  // Show toast message on form submission result
  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast({
          title: 'Message Sent Successfully!',
          description: state.message,
        });
        // Optionally clear form fields here if needed, though useActionState doesn't automatically do this
        // Consider using react-hook-form with server actions for better form handling
        // Example: Resetting the form would require access to the form element or a form library state.
         const form = document.getElementById('contact-form') as HTMLFormElement | null;
         form?.reset();

      } else {
        // Log specific validation errors for debugging
        if (state.errors) {
          console.error("Validation Errors:", state.errors);
          // Basic error message - could be enhanced to show specific field errors
           const errorDesc = state.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
           toast({
              title: 'Error Sending Message',
              description: `${state.message} (${errorDesc})` || 'Please check the form fields.',
              variant: 'destructive',
            });
        } else {
             toast({
                title: 'Error Sending Message',
                description: state.message || 'Could not send your message. Please try again later.',
                variant: 'destructive',
            });
        }

      }
    }
  }, [state, toast]);

  return (
     <div className="container mx-auto px-4 py-8"> {/* Added container classes */}
        <div className="space-y-8 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        {/* Contact Form */}
        <Card className="shadow-lg border-border">
            <CardHeader>
            <CardTitle className="text-2xl text-secondary-foreground">Send us a Message</CardTitle>
            <CardDescription className="text-muted-foreground">Fill out the form below and we'll get back to you.</CardDescription>
            </CardHeader>
            <CardContent>
            {/* Use formAction with the form */}
            <form action={formAction} id="contact-form" className="space-y-4">
                {/* Hidden input for userId if logged in */}
                 {userId && (
                    <input type="hidden" name="userId" value={userId} />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name-contact" className="text-secondary-foreground">Full Name</Label>
                    <Input
                    id="name-contact"
                    name="name" // Add name attribute for FormData
                    type="text"
                    placeholder="Your Name"
                    required
                    className="bg-background border-input focus:ring-primary"
                    />
                    {/* Optional: Display specific field error */}
                    {/* {state.errors?.name && <p className="text-sm text-destructive mt-1">{state.errors.name[0]}</p>} */}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email-contact" className="text-secondary-foreground">Email Address</Label>
                    <Input
                    id="email-contact"
                    name="email" // Add name attribute
                    type="email"
                    placeholder="you@example.com"
                    required
                    className="bg-background border-input focus:ring-primary"
                    />
                    {/* Optional: Display specific field error */}
                    {/* {state.errors?.email && <p className="text-sm text-destructive mt-1">{state.errors.email[0]}</p>} */}
                </div>
                </div>

                <div className="space-y-2">
                <Label htmlFor="subject-contact" className="text-secondary-foreground">Subject</Label>
                <Input
                    id="subject-contact"
                    name="subject" // Add name attribute
                    type="text"
                    placeholder="e.g., Booking Inquiry"
                    required
                    className="bg-background border-input focus:ring-primary"
                />
                {/* Optional: Display specific field error */}
                {/* {state.errors?.subject && <p className="text-sm text-destructive mt-1">{state.errors.subject[0]}</p>} */}
                </div>

                <div className="space-y-2">
                <Label htmlFor="message-contact" className="text-secondary-foreground">Message</Label>
                <Textarea
                    id="message-contact"
                    name="message" // Add name attribute
                    placeholder="Write your message here..."
                    rows={5}
                    required
                    className="bg-background border-input focus:ring-primary"
                />
                {/* Optional: Display specific field error */}
                {/* {state.errors?.message && <p className="text-sm text-destructive mt-1">{state.errors.message[0]}</p>} */}
                </div>

                {/* Use the separate SubmitButton component */}
                <SubmitButton />
            </form>
            </CardContent>
        </Card>

        {/* Contact Information */}
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-secondary-foreground">Contact Information</h2>
            <p className="text-muted-foreground">
            Alternatively, you can reach us using the details below or visit our headquarters.
            </p>
            <Card className="shadow-lg border-border bg-card">
            <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-4">
                <Mail className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                    <h3 className="font-semibold text-card-foreground">Email</h3>
                    <a href="mailto:info@ownbroker.com" className="text-muted-foreground hover:text-primary hover:underline">
                    info@ownbroker.com
                    </a>
                </div>
                </div>
                <div className="flex items-start gap-4">
                <Phone className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                    <h3 className="font-semibold text-card-foreground">Phone</h3>
                    <a href="tel:+1234567890" className="text-muted-foreground hover:text-primary hover:underline">
                    +1 (234) 567-890
                    </a>
                </div>
                </div>
                <div className="flex items-start gap-4">
                <MapPin className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                    <h3 className="font-semibold text-card-foreground">Address</h3>
                    <p className="text-muted-foreground">
                    OwnBroker HQ,<br/>
                    Gosani Nuagam,<br/>
                    Brahmapur, Odisha 760002
                    </p>
                </div>
                </div>
            </CardContent>
            </Card>
            {/* Google Map Embed */}
            <div className="mt-6">
            <h3 className="text-xl font-semibold text-secondary-foreground mb-3">Our Location</h3>
            <div className="aspect-video w-full rounded-lg overflow-hidden shadow-md border border-border">
                <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d364.4354168091922!2d84.78255617465487!3d19.295950102698214!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a3d500ef1cb60ad%3A0x5b75778874294ff!2sBrahmapur%2C%20Odisha!5e1!3m2!1sen!2sin!4v1746023705167!5m2!1sen!2sin"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen={true}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade">
                </iframe>
            </div>
            </div>
        </div>
        </div>
    </div>
  );
}