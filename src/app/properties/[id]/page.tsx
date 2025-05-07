'use client'; // Required for date picker, form handling, auth check

import React, { useState, useEffect } from 'react'; // Import React
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation'; // Added useRouter
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Wifi, Thermometer, BedDouble, Bath, ParkingCircle, Waves, Utensils, MapPin, CalendarIcon, User, View, Loader2, MessageSquare, Lock, LogIn, AlertTriangle } from 'lucide-react'; // Add Lock, LogIn, AlertTriangle
import type { Property, BookingDetails } from '@/types/property';
import { formatCurrency } from '@/lib/utils';
import { cn } from "@/lib/utils";
import { format, differenceInCalendarDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { useToast } from "@/hooks/use-toast"; // Corrected import path for useToast
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
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { getPropertyById } from '@/actions/propertyActions'; // Import the action to fetch property

// Helper to map amenity strings to icons and labels
const amenityDetails: { [key: string]: { icon: React.ElementType, label: string } } = {
  wifi: { icon: Wifi, label: 'WiFi' },
  ac: { icon: Thermometer, label: 'Air Conditioning' },
  pool: { icon: Waves, label: 'Pool' },
  parking: { icon: ParkingCircle, label: 'Parking' },
  kitchen: { icon: Utensils, label: 'Kitchen' },
  bedrooms: { icon: BedDouble, label: 'Bedrooms' },
  bathrooms: { icon: Bath, label: 'Bathrooms' },
  beachfront: { icon: Waves, label: 'Beachfront' },
};

// Placeholder for session/token check (consistent with other components)
async function checkLoginStatus(): Promise<boolean> {
   if (typeof window !== 'undefined') {
       const simulatedUid = localStorage.getItem('simulated_user_uid');
       console.log("[Property Page] Checking login status, simulated UID:", simulatedUid);
       return !!simulatedUid; // Return true if UID exists in localStorage
   }
   return false; // Assume not logged in if window is not defined (SSR pass)
}


export default function PropertyDetailPage() {
  const params = useParams();
  const propertyId = params.id as string;
  const { toast } = useToast();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false); // Track component mount

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Property Data State
  const [property, setProperty] = useState<Property | null>(null); // Start as null
  const [isLoadingProperty, setIsLoadingProperty] = useState(true); // Loading state for property data
  const [fetchError, setFetchError] = useState<string | null>(null); // State for fetch errors

  // Form States
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
  const [isEnquirySubmitting, setIsEnquirySubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Report States
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');

  // Set mounted state
   useEffect(() => {
    setIsMounted(true);
  }, []);


  // Fetch Property Data using Server Action
  useEffect(() => {
    if (!propertyId) return; // Don't fetch if ID is missing

    const fetchPropertyData = async () => {
        setIsLoadingProperty(true);
        setFetchError(null); // Reset error state
        console.log(`[Property Page] Fetching property data for ID: ${propertyId}`);
        try {
            const fetchedProperty = await getPropertyById(propertyId);
            if (fetchedProperty) {
                 console.log("[Property Page] Property data fetched successfully:", fetchedProperty);
                 setProperty(fetchedProperty);
            } else {
                console.warn(`[Property Page] Property with ID ${propertyId} not found.`);
                setProperty(null);
                setFetchError("Property not found."); // Set specific error message
            }
        } catch (error) {
            console.error(`[Property Page] Error fetching property ${propertyId}:`, error);
            setProperty(null);
             setFetchError("Failed to load property details. Please try again later."); // Generic error
        } finally {
            setIsLoadingProperty(false);
        }
    };

    fetchPropertyData();
  }, [propertyId]); // Re-fetch if propertyId changes

   // Check Authentication State using simulated session
   useEffect(() => {
     // Only run check on the client after mount
     if (!isMounted) return;

     const verifyLogin = async () => {
         setIsLoadingAuth(true);
         const loggedInStatus = await checkLoginStatus();
         setIsLoggedIn(loggedInStatus);
         setIsLoadingAuth(false);
          console.log("[Property Page] Login status verified:", loggedInStatus);
     };
     verifyLogin();
  }, [isMounted]); // Run only once after mount

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/current-user'); // Replace with actual endpoint
        const user = await response.json();
        setCurrentUser(user);
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };

    fetchCurrentUser();
  }, []);

   const handleBookingSubmit = async (event: React.FormEvent) => {
      event.preventDefault();
      if (!isLoggedIn) { // Check local isLoggedIn state derived from session
          toast({ title: "Login Required", description: "Please log in to request a booking.", variant: "destructive" });
          router.push('/login'); // Redirect to login
          return;
      }
       if (!date?.from || !date?.to || !contactName || !contactEmail) {
         toast({
            title: "Missing Information",
            description: "Please select dates and provide contact details.",
            variant: "destructive",
          });
        return;
      }
       if (date.from >= date.to) {
           toast({
            title: "Invalid Dates",
            description: "Check-out date must be after check-in date.",
            variant: "destructive",
          });
          return;
      }
      setIsBookingSubmitting(true);
      const bookingDetails: BookingDetails = {
          startDate: date.from,
          endDate: date.to,
          contact: `${contactName} (${contactEmail})`,
      };
      console.log('Booking Submitted:', { propertyId, bookingDetails });
      // TODO: Replace with actual API call to save booking request
      await new Promise(resolve => setTimeout(resolve, 1500));
      const success = true; // Simulate success
      setIsBookingSubmitting(false);
      if (success) {
          toast({
            title: "Booking Request Sent!",
            description: "The property owner has been notified. You'll receive an update soon.",
          });
          setDate(undefined);
          setContactName('');
          setContactEmail('');
      } else {
           toast({
            title: "Booking Failed",
            description: "Could not send booking request. Please try again later.",
            variant: "destructive",
          });
      }
   };

    const handleEnquirySubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!isLoggedIn) { // Check local isLoggedIn state derived from session
            toast({ title: "Login Required", description: "Please log in to send an enquiry.", variant: "destructive" });
            router.push('/login'); // Redirect to login
            return;
        }
         if (!inquiryMessage || !contactName || !contactEmail) {
            toast({
                title: "Missing Information",
                description: "Please enter your message and ensure contact details are filled.",
                variant: "destructive" // Use destructive variant
            });
            return;
        }
        setIsEnquirySubmitting(true);
        console.log('Enquiry Submitted:', {
            propertyId,
            propertyName: property?.title,
            userName: contactName,
            userEmail: contactEmail,
            message: inquiryMessage,
        });
         // TODO: Replace with actual API call to save enquiry
        await new Promise(resolve => setTimeout(resolve, 1500));
        const success = true; // Simulate success
        setIsEnquirySubmitting(false);
        if (success) {
            toast({
                title: "Enquiry Sent!",
                description: "Your message has been sent to the property owner.",
            });
            setInquiryMessage('');
             // Find the close button and click it programmatically
            const closeButton = document.getElementById('close-enquiry-dialog');
            if (closeButton) {
                closeButton.click();
            }
        } else {
            toast({
                title: "Enquiry Failed",
                description: "Could not send your message. Please try again later.",
                variant: "destructive",
            });
        }
    };

   const handleMakeEnquiry = async () => {
      if (!property || !currentUser) {
        console.error('Error: Property or current user is null');
        toast({
          title: 'Error',
          description: 'Unable to make an enquiry. Please try again later.',
          variant: 'destructive',
        });
        return;
      }

      try {
        const response = await fetch('/api/enquiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertyId: property.id,
            userId: currentUser.id,
            ownerId: property.ownerId,
            propertyDetails: {
              title: property.title,
              ownerName: property.ownerName,
              rentTerms: property.rentTerms,
              extraCharges: property.extraCharges,
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`API error: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Invalid response format');
        }

        const data = await response.json();
        console.log('Enquiry successful:', data);
        toast({
          title: 'Success',
          description: 'Your enquiry has been sent successfully.',
        });
      } catch (error) {
        console.error('Error sending enquiry:', error);
        toast({
          title: 'Error',
          description: 'Failed to send enquiry. Please try again later.',
          variant: 'destructive',
        });
      }
   };

   const handleReportSubmit = async () => {
      if (!isLoggedIn) {
        toast({
          title: 'Login Required',
          description: 'Please log in to report this property.',
          variant: 'destructive',
        });
        router.push('/login');
        return;
      }

      if (!reportReason) {
        toast({
          title: 'Error',
          description: 'Please select a reason for reporting.',
          variant: 'destructive',
        });
        return;
      }

      if (!property || !currentUser) {
        toast({
          title: 'Error',
          description: 'Unable to submit report. Please try again later.',
          variant: 'destructive',
        });
        return;
      }

      try {
        const response = await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertyId: property.id,
            userId: currentUser.id,
            ownerId: property.ownerId,
            reason: reportReason,
            timestamp: new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`API error: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Invalid response format');
        }

        const data = await response.json();
        console.log('Report submitted successfully:', data);
        toast({
          title: 'Success',
          description: 'Your report has been submitted successfully.',
        });
        setIsReportDialogOpen(false);
        setReportReason('');
      } catch (error) {
        console.error('Error submitting report:', error);
        toast({
          title: 'Error',
          description: 'Failed to submit your report. Please try again later.',
          variant: 'destructive',
        });
      }
   };

   const calculateNights = (from: Date | undefined, to: Date | undefined): number => {
       if (!from || !to || from >= to) return 0;
       return differenceInCalendarDays(to, from);
   };

   const numberOfNights = calculateNights(date?.from, date?.to);
   const basePrice = property ? property.price * numberOfNights : 0;
   const serviceFee = basePrice > 0 ? 50 : 0; // Example service fee logic
   const totalPrice = basePrice + serviceFee;

   // Function to truncate description
   const getShortDescription = (desc: string | undefined, maxLength = 150) => {
     if (!desc) return '';
     if (desc.length <= maxLength) return desc;
     return desc.substring(0, maxLength) + '...';
   };

   // Determine correct image URL with fallback
   const getImageUrl = (url: string | null | undefined, fallbackSeed: string): string => {
       const defaultUrl = `https://picsum.photos/seed/${fallbackSeed || 'default_prop_img'}/800/600`;
       const isValidImageUrl = (u: string | null | undefined): u is string =>
           typeof u === 'string' && u.trim() !== '' && (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('/'));

        if (isValidImageUrl(url)) {
            return url;
        } else if (url) {
            console.warn(`[Property Detail] Invalid image URL format: "${url}". Falling back to default.`);
        }
        return defaultUrl;
   };


  // --- Loading States ---
  if (isLoadingProperty || (isMounted && isLoadingAuth)) {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Skeleton className="h-[500px] w-full rounded-lg" />
                    <Skeleton className="h-32 w-full rounded-lg" />
                    <Skeleton className="h-40 w-full rounded-lg" />
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <Skeleton className="h-96 w-full rounded-lg sticky top-24" />
                </div>
            </div>
        </div>
    );
  }

  // --- Error State ---
  if (fetchError) {
    return (
        <div className="container mx-auto px-4 py-16 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading Property</h2>
            <p className="text-muted-foreground">{fetchError}</p>
            <Button onClick={() => router.back()} variant="outline" className="mt-6">Go Back</Button>
        </div>
    );
  }

  // --- Property Not Found State (after loading) ---
  if (!property) {
    // This state should be covered by fetchError, but keep as fallback
    return <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">Property details could not be loaded.</div>;
  }

  // --- Render Property Details ---
  const shortDescription = getShortDescription(property.description);
  const finalImageUrl = getImageUrl(property.imageUrl, property.id);


  return (
    <div className="container mx-auto px-4 py-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Property Details Column */}
        <div className="lg:col-span-2 space-y-6">
            {/* Image */}
            <Card className="overflow-hidden shadow-lg">
                <div className="relative w-full h-auto max-h-[500px] aspect-video">
                    <Image
                        src={finalImageUrl} // Use processed image URL
                        alt={property.title}
                        fill
                        className="object-cover"
                        priority
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 800px"
                        data-ai-hint="real estate property exterior photo" // AI hint
                         onError={(e) => { // Basic error handling for image load
                             const target = e.target as HTMLImageElement;
                             console.error(`Failed to load property image: ${target.src}`);
                             target.src = `https://picsum.photos/seed/${property.id || 'error'}/800/600`; // Fallback to default seed
                         }}
                    />
                </div>
            </Card>

            {/* Title, Price, Location (Visible to All) */}
            <Card className="shadow-lg">
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex-1">
                            <CardTitle className="text-3xl font-bold text-secondary-foreground mb-1">{property.title}</CardTitle>
                            <div className="flex items-center text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                                <span>{property.city || 'Location Available'}</span>
                                {property.propertyType && <span className="mx-2">|</span>}
                                {property.propertyType && <span>{property.propertyType}</span>}
                            </div>
                            {property.ownerInfo && (
                                <p className="text-xs text-muted-foreground mt-1">Posted by: {property.ownerInfo}</p>
                            )}
                        </div>
                        <div className="text-right flex-shrink-0">
                            <p className="text-2xl font-bold text-primary whitespace-nowrap">
                                {formatCurrency(property.price)}
                            </p>
                            <span className="text-sm font-normal text-muted-foreground"> / night</span>
                        </div>
                    </div>
            </CardHeader>
                <CardContent>
                    {/* Description: Short for guests, Full for logged-in */}
                    <p className="text-base leading-relaxed text-foreground">
                        {/* Use isLoggedIn state for conditional rendering */}
                        {isLoggedIn ? property.description : shortDescription}
                        {!isLoggedIn && property.description && property.description.length > shortDescription.length && (
                         <span className="text-primary font-semibold ml-1">(Login to read more)</span>
                        )}
                    </p>
                    {/* Display Owner Contact only if logged in */}
                    {isLoggedIn && property.ownerContact && (
                        <div className="mt-4 pt-4 border-t">
                            <h4 className="font-semibold text-secondary-foreground mb-1">Contact Owner</h4>
                            <p className="text-sm text-muted-foreground">{property.ownerContact}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Restricted Content Block */}
            {/* Check isLoggedIn derived from session */}
            {isLoggedIn ? (
                <>
                    {/* 360 View Section (Conditional & Logged-in only) */}
                    {property.panoImageUrl && (
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-xl text-secondary-foreground flex items-center gap-2">
                                <View className="h-5 w-5" /> 360° Virtual Tour
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="aspect-video bg-muted rounded-md flex items-center justify-center text-muted-foreground border border-dashed border-border">
                                <span>360° Viewer Placeholder</span>
                                {/* Integrate 360 viewer library here using property.panoImageUrl */}
                            </div>
                        </CardContent>
                        </Card>
                    )}

                    {/* Image Gallery (Logged-in only) */}
                    {property.gallery && property.gallery.length > 0 && (
                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle className="text-xl text-secondary-foreground">Image Gallery</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {property.gallery.map((imgUrl, index) => (
                                    <div key={index} className="relative aspect-square rounded-md overflow-hidden shadow-sm border border-border/30">
                                         <Image
                                             src={getImageUrl(imgUrl, `${property.id}-gallery-${index}`)} // Use helper for gallery images too
                                             alt={`${property.title} - Gallery Image ${index + 1}`}
                                             layout="fill"
                                             objectFit="cover"
                                             className="hover:scale-105 transition-transform duration-300"
                                             onError={(e) => {
                                                 const target = e.target as HTMLImageElement;
                                                 console.error(`Failed to load gallery image: ${target.src}`);
                                                 target.src = `https://picsum.photos/seed/${property.id}-gallery-${index}/400/400`; // Fallback
                                             }}
                                        />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Amenities (Logged-in only) */}
                    <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-xl text-secondary-foreground">What this place offers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4">
                        {(property.amenities || []).map((amenityKey) => {
                            const details = amenityDetails[amenityKey.toLowerCase()];
                            return details ? (
                            <div key={amenityKey} className="flex items-center space-x-2">
                                <details.icon className="h-5 w-5 text-primary flex-shrink-0" />
                                <span className="text-sm text-foreground">{details.label}</span>
                            </div>
                            ) : null;
                        })}
                        {(!property.amenities || property.amenities.length === 0) && (
                            <p className="text-sm text-muted-foreground col-span-full">No specific amenities listed.</p>
                        )}
                        </div>
                    </CardContent>
                    </Card>

                    {/* Map Placeholder (Logged-in only) */}
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-xl text-secondary-foreground">Where you'll be</CardTitle>
                            <CardDescription className="text-muted-foreground">Exact address provided after booking confirmation.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="aspect-video bg-muted rounded-md flex items-center justify-center text-muted-foreground border border-dashed border-border">
                                <MapPin className="h-8 w-8 mr-2" /> Map Placeholder (Visible to logged-in users)
                                {/* Integrate Google Maps API here using property.location */}
                            </div>
                        </CardContent>
                    </Card>
                </>
            ) : (
                // --- Placeholder for logged-out users ---
                <Card className="shadow-lg border-dashed border-primary/50 bg-primary/5">
                    <CardContent className="p-6 text-center">
                        <Lock className="h-8 w-8 mx-auto mb-3 text-primary" />
                        <p className="font-semibold text-secondary-foreground">Full Details Available After Login</p>
                        <p className="text-sm text-muted-foreground mt-1 mb-4">Login or register to view the image gallery, 360° tour, exact map location, amenities, and owner contact details.</p>
                        <Button variant="default" onClick={() => router.push('/login')}>
                            <LogIn className="mr-2 h-4 w-4" /> Login / Register
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>

        {/* Action Column (Booking & Enquiry) */}
        <div className="lg:col-span-1 space-y-6">
            {/* Booking Card */}
            <Card className="sticky top-24 shadow-lg border border-border">
            <CardHeader>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-primary">{formatCurrency(property.price)}</span>
                    <span className="text-base font-normal text-muted-foreground"> night</span>
                </div>
            </CardHeader>
            <CardContent>
                {/* Check isLoggedIn derived from session */}
                {isLoggedIn ? (
                    // --- Booking Form for Logged-in Users ---
                    <form onSubmit={handleBookingSubmit} className="space-y-4">
                    {/* Date Range Picker */}
                        <div className="border rounded-md border-input">
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"ghost"}
                                    className={cn(
                                    "w-full justify-start text-left font-normal h-auto py-3",
                                    !date && "text-muted-foreground"
                                    )}
                                >
                                <div className="flex flex-col w-full">
                                    <Label htmlFor="date" className="text-xs font-semibold uppercase text-muted-foreground mb-1">Check-in / Check-out</Label>
                                    <div className="flex items-center">
                                            <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                                            {date?.from ? (
                                            date.to ? (
                                                <span className="text-sm text-foreground">
                                                    {format(date.from, "LLL dd, y")} -{" "}
                                                    {format(date.to, "LLL dd, y")}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-foreground">{format(date.from, "LLL dd, y")}</span>
                                            )
                                            ) : (
                                            <span className="text-sm text-muted-foreground">Select your dates</span>
                                            )}
                                    </div>
                                </div>
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={date?.from}
                                    selected={date}
                                    onSelect={setDate}
                                    numberOfMonths={1}
                                    disabled={(day) => day < new Date(new Date().setHours(0,0,0,0))}
                                />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-2">
                            <div>
                                <Label htmlFor="name-booking" className="text-xs font-semibold uppercase text-muted-foreground">Full Name</Label>
                                <div className="relative mt-1">
                                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="name-booking"
                                        type="text"
                                        placeholder="Your Name"
                                        value={contactName}
                                        onChange={(e) => setContactName(e.target.value)}
                                        required
                                        className="pl-8 bg-background border-input h-10"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="email-booking" className="text-xs font-semibold uppercase text-muted-foreground">Email Address</Label>
                                <Input
                                    id="email-booking"
                                    type="email"
                                    placeholder="your.email@example.com"
                                    value={contactEmail}
                                    onChange={(e) => setContactEmail(e.target.value)}
                                    required
                                    className="mt-1 bg-background border-input h-10"
                                    />
                            </div>
                        </div>

                        {/* Calculated Price */}
                        {numberOfNights > 0 && (
                            <>
                            <Separator className="my-3" />
                            <div className="space-y-1.5 text-sm">
                                <p className="text-center font-semibold mb-2 text-foreground">Booking Summary</p>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground underline decoration-dotted cursor-help" title={`${formatCurrency(property.price)} x ${numberOfNights} nights`}>
                                        {formatCurrency(property.price)} x {numberOfNights} nights
                                    </span>
                                    <span className="text-foreground">{formatCurrency(basePrice)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Service fee</span>
                                    <span className="text-foreground">{formatCurrency(serviceFee)}</span>
                                </div>
                                <Separator className="my-2"/>
                                <div className="flex justify-between font-semibold text-base">
                                    <span className="text-foreground">Total</span>
                                    <span className="text-foreground">{formatCurrency(totalPrice)}</span>
                                </div>
                            </div>
                            <Separator className="my-3" />
                            </>
                        )}

                        <Button type="submit" className="w-full h-11 text-base" variant="default" disabled={isBookingSubmitting || numberOfNights <= 0}>
                            {isBookingSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                            {isBookingSubmitting ? 'Sending Request...' : (numberOfNights <= 0 ? 'Select Dates to Book' : 'Request to Book')}
                        </Button>
                    </form>
                ) : (
                    // --- Login Prompt for Logged-out Users ---
                    <div className="text-center py-6">
                        <Lock className="h-8 w-8 mx-auto mb-3 text-primary" />
                        <p className="font-semibold text-secondary-foreground mb-2">Login to Book or Enquire</p>
                        <p className="text-sm text-muted-foreground mb-4">Access booking features and full property details by logging in.</p>
                        <Button variant="default" onClick={() => router.push('/login')} className="w-full">
                            <LogIn className="mr-2 h-4 w-4" /> Login / Register
                        </Button>
                    </div>
                )}
            </CardContent>
            {/* Show footer only if logged in */}
            {isLoggedIn && (
                <CardFooter>
                    <p className="text-xs text-muted-foreground text-center w-full">You won't be charged until the owner approves the booking.</p>
                </CardFooter>
                )}
            </Card>

            {/* Enquiry Button (Visible only if logged in) */}
            {isLoggedIn && (
                <Button onClick={handleMakeEnquiry} variant="primary" className="w-full h-11 text-base">
                    <MessageSquare className="mr-2 h-5 w-5" /> Make Enquiry
                </Button>
            )}

            {/* Report Property Button */}
            <Button 
                variant="outline" 
                className="w-full text-destructive hover:bg-destructive/10"
                onClick={() => setIsReportDialogOpen(true)}
            >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Report Property
            </Button>

            {/* Report Property Dialog */}
            <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Report Property</DialogTitle>
                        <DialogDescription>
                            Please select a reason for reporting this property. Your report will be reviewed by our team.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="report-reason">Reason for Report</Label>
                            <select
                                id="report-reason"
                                value={reportReason}
                                onChange={(e) => setReportReason(e.target.value)}
                                className="w-full p-2 border rounded-md"
                            >
                                <option value="">Select a reason...</option>
                                <option value="inaccurate_info">Inaccurate Information</option>
                                <option value="inappropriate_content">Inappropriate Content</option>
                                <option value="scam">Potential Scam</option>
                                <option value="unavailable">Property Unavailable</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleReportSubmit}>Submit Report</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
        </div>
    </div>
  );
}

// Keep types as before - removed BookingDetails as it's not used externally
// interface Property { // Already defined globally }
// interface BookingDetails { // Already defined globally }
