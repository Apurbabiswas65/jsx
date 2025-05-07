// src/app/dashboard/user/my-room/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BedDouble, Home, Users, Edit, MessageCircle, Trash2, PlusCircle, Loader2, ShieldQuestion, MapPin } from 'lucide-react'; // Icons
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
// Import necessary user profile types and actions if needed
import type { UserProfileData } from '@/types/user';
import { getUserProfile } from '@/actions/userActions'; // Assuming you might need profile data

// Placeholder for session check
async function getCurrentUserUidFromSession(): Promise<string | null> {
   if (typeof window !== 'undefined') {
       return localStorage.getItem('simulated_user_uid');
   }
   return null;
}

// Mock Data - Replace with actual data fetching
interface RoomDetails {
    id: string;
    propertyName: string;
    address: string;
    rent: number;
    amenities: string[];
    status: 'occupied' | 'vacant';
}

interface Roommate {
    id: string;
    name: string;
    avatarUrl?: string;
    email: string;
}

const mockRoomDetails: RoomDetails | null = {
    id: 'room123',
    propertyName: 'Cozy Downtown Apartment - Room B',
    address: '123 Main St, Apt 4B, Anytown, USA 12345',
    rent: 800,
    amenities: ['wifi', 'kitchen_access', 'shared_bathroom', 'furnished'],
    status: 'occupied',
};

const mockRoommates: Roommate[] = [
    { id: 'rm1', name: 'Alex Smith', avatarUrl: 'https://picsum.photos/seed/alex/100/100', email: 'alex.s@example.com' },
    { id: 'rm2', name: 'Maria Garcia', avatarUrl: 'https://picsum.photos/seed/maria/100/100', email: 'maria.g@example.com' },
];

export default function MyRoomPage() {
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [roomDetails, setRoomDetails] = useState<RoomDetails | null>(null); // Fetch from DB based on user
  const [roommates, setRoommates] = useState<Roommate[]>([]); // Fetch from DB based on user/room
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch user profile and related room/roommate data
  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        const uid = await getCurrentUserUidFromSession();
        if (uid) {
            try {
                const profile = await getUserProfile(uid);
                setUserProfile(profile);
                // TODO: Fetch actual room details and roommates associated with this user
                // Example:
                // const roomData = await getRoomDetailsForUser(uid);
                // const roommateData = await getRoommatesForUser(uid);
                // setRoomDetails(roomData);
                // setRoommates(roommateData);
                setRoomDetails(mockRoomDetails); // Using mock data for now
                setRoommates(mockRoommates); // Using mock data for now

            } catch (error) {
                console.error("Error fetching user/room data:", error);
                toast({ title: "Error", description: "Could not load your room information.", variant: "destructive" });
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

  const handleEditRoomDetails = () => {
    // TODO: Implement logic to open an edit modal or navigate to an edit page
    toast({ title: "Action Needed", description: "Edit room details functionality not yet implemented." });
  };

  const handleAddRoommate = () => {
    // TODO: Implement logic to add a roommate (e.g., invite via email, search user)
    toast({ title: "Action Needed", description: "Add roommate functionality not yet implemented." });
  };

   const handleRemoveRoommate = (roommateId: string) => {
    // TODO: Implement logic to remove a roommate (with confirmation)
    console.log("Removing roommate:", roommateId);
    toast({ title: "Action Needed", description: `Remove roommate ${roommateId} functionality not yet implemented.`, variant: "destructive" });
    // Update state after successful removal:
    // setRoommates(prev => prev.filter(rm => rm.id !== roommateId));
   };

    const handleSendMessage = (roommateId: string) => {
        // TODO: Integrate with messaging system or redirect to a chat page
        toast({ title: "Action Needed", description: `Messaging roommate ${roommateId} not yet implemented.` });
    };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold text-secondary-foreground">My Room & Roommates</h1>

      {/* Room Details Section */}
      {roomDetails ? (
        <Card className="shadow-lg border-border">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl text-secondary-foreground flex items-center gap-2">
                <Home className="h-5 w-5" /> Room Details
              </CardTitle>
              <CardDescription>{roomDetails.propertyName}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleEditRoomDetails}>
              <Edit className="mr-2 h-4 w-4" /> Edit Details
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center text-sm">
                <MapPin className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0"/>
                <span className="text-muted-foreground">{roomDetails.address}</span>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <p className="text-muted-foreground font-medium mb-1">Rent</p>
                    <p className="text-secondary-foreground font-semibold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(roomDetails.rent)} / month</p>
                </div>
                 <div>
                    <p className="text-muted-foreground font-medium mb-1">Status</p>
                    <Badge variant={roomDetails.status === 'occupied' ? 'default' : 'secondary'} className="capitalize">
                      {roomDetails.status}
                    </Badge>
                 </div>
            </div>
             <div>
                <p className="text-muted-foreground font-medium mb-2">Amenities</p>
                <div className="flex flex-wrap gap-2">
                    {roomDetails.amenities.map(amenity => (
                        <Badge key={amenity} variant="outline" className="capitalize">{amenity.replace('_', ' ')}</Badge>
                    ))}
                </div>
             </div>
          </CardContent>
        </Card>
      ) : (
        <Alert variant="default" className="bg-blue-50 border border-blue-200 text-blue-800">
            <ShieldQuestion className="h-5 w-5 text-blue-600"/>
            <AlertTitle className="font-semibold">No Room Information</AlertTitle>
            <AlertDescription>
               It seems you don't have any room details associated with your account yet. This could be because you haven't booked a room or your landlord hasn't added the details.
            </AlertDescription>
        </Alert>
      )}

      {/* Roommates Section */}
      {roomDetails && ( // Only show roommates if there are room details
          <Card className="shadow-lg border-border">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                    <CardTitle className="text-xl text-secondary-foreground flex items-center gap-2">
                        <Users className="h-5 w-5" /> Roommates ({roommates.length})
                    </CardTitle>
                    <CardDescription>Manage and connect with your roommates.</CardDescription>
                </div>
                <Button variant="default" size="sm" onClick={handleAddRoommate}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Roommate
                </Button>
            </CardHeader>
            <CardContent>
            {roommates.length > 0 ? (
                <ul className="space-y-4">
                {roommates.map((roommate) => (
                    <li key={roommate.id} className="flex items-center justify-between p-3 border rounded-md bg-background hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                        <AvatarImage src={roommate.avatarUrl} alt={roommate.name} />
                        <AvatarFallback>{roommate.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                        <p className="font-medium text-secondary-foreground">{roommate.name}</p>
                        <p className="text-xs text-muted-foreground">{roommate.email}</p>
                        </div>
                    </div>
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" title="Send Message" onClick={() => handleSendMessage(roommate.id)}>
                            <MessageCircle className="h-4 w-4 text-primary" />
                        </Button>
                         {/* Add confirmation before removal */}
                         <Button variant="ghost" size="icon" title="Remove Roommate" className="text-destructive hover:bg-destructive/10" onClick={() => handleRemoveRoommate(roommate.id)}>
                             <Trash2 className="h-4 w-4" />
                         </Button>
                    </div>
                    </li>
                ))}
                </ul>
            ) : (
                <p className="text-center text-muted-foreground py-4">You haven't added any roommates yet.</p>
            )}
            </CardContent>
        </Card>
      )}
    </div>
  );
}
