// src/app/dashboard/user/saved-properties/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Heart, Search, Trash2, Loader2, AlertTriangle, Eye } from 'lucide-react'; // Icons
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
// Import necessary user profile types and actions if needed
import type { UserProfileData } from '@/types/user';
import { getUserProfile } from '@/actions/userActions'; // Assuming you might need profile data
import { PropertyCard } from '@/components/property/PropertyCard'; // Reuse PropertyCard component
import type { Property } from '@/types/property'; // Import Property type

// Placeholder for session check
async function getCurrentUserUidFromSession(): Promise<string | null> {
   if (typeof window !== 'undefined') {
       return localStorage.getItem('simulated_user_uid');
   }
   return null;
}

// Mock Saved Properties Data - Replace with actual data fetching based on user ID
const mockSavedProperties: Property[] = [
  {
    id: '2',
    title: 'Spacious Villa with Pool',
    description: 'Luxury 4-bedroom villa with a private pool and stunning views.',
    price: 4500,
    location: { lat: 34.1522, lng: -118.3437 },
    imageUrl: 'https://picsum.photos/seed/prop2/600/400',
    amenities: ['wifi', 'ac', 'pool', 'parking'],
    city: 'Beverly Hills',
    status: 'verified',
  },
  {
    id: '4',
    title: 'Charming Beach House',
    description: 'Relaxing 2-bedroom house right on the beach.',
    price: 3000,
    location: { lat: 33.9922, lng: -118.4537 },
    imageUrl: 'https://picsum.photos/seed/prop4/600/400',
    amenities: ['wifi', 'ac', 'parking', 'beachfront'],
     city: 'Malibu',
     status: 'verified',
  },
];

export default function SavedPropertiesPage() {
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [savedProperties, setSavedProperties] = useState<Property[]>([]); // Fetch from DB based on user
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch user profile and their saved properties
  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        const uid = await getCurrentUserUidFromSession();
        if (uid) {
            try {
                const profile = await getUserProfile(uid);
                setUserProfile(profile);
                // TODO: Fetch actual saved properties for this user
                // Example:
                // const savedData = await getSavedPropertiesForUser(uid);
                // setSavedProperties(savedData || []);
                setSavedProperties(mockSavedProperties); // Using mock data for now
            } catch (error) {
                console.error("Error fetching user/saved properties data:", error);
                toast({ title: "Error", description: "Could not load your saved properties.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        } else {
            setIsLoading(false);
            // Handle not logged in case? Redirect?
        }
    };
    fetchData();
  }, [toast]);

  const handleRemoveSaved = (propertyId: string) => {
    // TODO: Implement logic to remove property from saved list (update DB)
    console.log("Removing saved property:", propertyId);
    toast({ title: "Property Removed", description: "Property removed from your saved list." });
    // Update state after successful removal:
    setSavedProperties(prev => prev.filter(p => p.id !== propertyId));
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold text-secondary-foreground">Saved Properties</h1>

      <Card className="shadow-lg border-border">
        <CardHeader>
          <CardTitle className="text-xl text-secondary-foreground flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" /> Your Wishlist
          </CardTitle>
          <CardDescription>
            Properties you've saved for later consideration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {savedProperties.length > 0 ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
               {savedProperties.map((property) => (
                 // Wrap PropertyCard with div for additional actions
                 <div key={property.id} className="relative group">
                   <PropertyCard property={property} />
                   {/* Remove Button Overlay */}
                   <Button
                     variant="destructive"
                     size="icon"
                     className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 shadow-md"
                     title="Remove from Saved"
                     onClick={() => handleRemoveSaved(property.id)}
                   >
                     <Trash2 className="h-4 w-4" />
                   </Button>
                 </div>
               ))}
             </div>
          ) : (
             <div className="text-center text-muted-foreground py-8">
                <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
                 <p className="mb-4">You haven't saved any properties yet.</p>
                 <Link href="/browse" passHref>
                    <Button variant="default">
                        <Search className="mr-2 h-4 w-4" /> Browse Properties
                    </Button>
                </Link>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
