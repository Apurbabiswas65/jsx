// src/app/dashboard/user/kyc/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileCheck, Upload, Clock, Loader2, AlertTriangle, Info } from 'lucide-react'; // Icons
import { useToast } from '@/hooks/use-toast';
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

// Mock KYC status - replace with actual data fetching
type KycStatus = 'not_submitted' | 'pending' | 'verified' | 'rejected';

export default function UserKycPage() {
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [kycStatus, setKycStatus] = useState<KycStatus>('not_submitted'); // Default or fetch from user profile
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null); // Store rejection reason if applicable
  const { toast } = useToast();

  // Fetch user profile to potentially get existing KYC status
  useEffect(() => {
    const fetchProfileAndKyc = async () => {
        setIsLoading(true);
        const uid = await getCurrentUserUidFromSession();
        if (uid) {
            try {
                const profile = await getUserProfile(uid);
                setUserProfile(profile);
                 // Replace this logic with actual KYC status fetching from profile or a separate KYC collection
                if (profile?.kyc) { // Example: Assuming kyc field holds status
                    setKycStatus(profile.kyc as KycStatus); // Make sure type matches
                    // Fetch rejection reason if status is 'rejected' (from DB)
                    if (profile.kyc === 'rejected') {
                         setRejectionReason("Document blurry or invalid."); // Example reason
                    }
                } else {
                    setKycStatus('not_submitted');
                }
            } catch (error) {
                console.error("Error fetching user profile:", error);
                toast({ title: "Error", description: "Could not load profile data.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        } else {
            setIsLoading(false);
             // Handle not logged in case? Redirect?
        }
    };
    fetchProfileAndKyc();
  }, [toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast({ title: "No File Selected", description: "Please select a document to upload.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    // TODO: Implement actual file upload logic here
    // 1. Upload `selectedFile` to secure storage (e.g., Firebase Storage, S3)
    // 2. Get the file URL or reference
    // 3. Call a server action/API endpoint to update user's KYC status to 'pending' and store file reference
    console.log("Uploading file:", selectedFile.name);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate upload
    const uploadSuccess = true; // Simulate success

    setIsUploading(false);
    if (uploadSuccess) {
      toast({ title: "Document Submitted", description: "Your KYC document has been submitted for verification." });
      setKycStatus('pending'); // Update status locally
      setSelectedFile(null); // Clear file input
       // Optionally update profile in DB via action
    } else {
      toast({ title: "Upload Failed", description: "Could not upload your document. Please try again.", variant: "destructive" });
    }
  };

  const renderKycStatus = () => {
    switch (kycStatus) {
      case 'verified':
        return (
          <Alert variant="default" className="bg-green-50 border border-green-200 text-green-800">
            <FileCheck className="h-5 w-5 text-green-600" />
            <AlertTitle className="font-semibold">KYC Verified</AlertTitle>
            <AlertDescription>Your identity has been successfully verified. You have full access to platform features.</AlertDescription>
          </Alert>
        );
      case 'pending':
        return (
          <Alert variant="default" className="bg-yellow-50 border border-yellow-200 text-yellow-800">
            <Clock className="h-5 w-5 text-yellow-600" />
            <AlertTitle className="font-semibold">KYC Pending Review</AlertTitle>
            <AlertDescription>Your submitted document is currently under review by our team. This usually takes 1-2 business days.</AlertDescription>
          </Alert>
        );
      case 'rejected':
        return (
          <Alert variant="destructive">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="font-semibold">KYC Rejected</AlertTitle>
            <AlertDescription>
              Your KYC verification was unsuccessful. {rejectionReason && `Reason: ${rejectionReason}`} Please upload a valid document again.
            </AlertDescription>
             {/* Add upload form again */}
             {renderUploadForm()}
          </Alert>
        );
      case 'not_submitted':
      default:
        return (
           <>
            <Alert variant="default" className="bg-blue-50 border border-blue-200 text-blue-800 mb-4">
                <Info className="h-5 w-5 text-blue-600" />
                <AlertTitle className="font-semibold">KYC Verification Required</AlertTitle>
                <AlertDescription>
                    Please upload a valid government-issued ID (e.g., Aadhaar, PAN, Driver's License) for verification to ensure platform security and enable certain features.
                </AlertDescription>
             </Alert>
             {renderUploadForm()}
           </>
        );
    }
  };

  const renderUploadForm = () => (
     <form onSubmit={handleKycSubmit} className="space-y-4 mt-6">
        <div className="space-y-2">
            <Label htmlFor="kyc-document">Upload Document</Label>
            <Input
                id="kyc-document"
                type="file"
                accept="image/jpeg, image/png, application/pdf" // Specify allowed file types
                onChange={handleFileChange}
                required
                className="bg-background border-input file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-accent-foreground hover:file:bg-accent/90"
            />
            {selectedFile && <p className="text-xs text-muted-foreground">Selected: {selectedFile.name}</p>}
            <p className="text-xs text-muted-foreground">Accepted formats: JPG, PNG, PDF. Max size: 5MB.</p>
        </div>
        <Button type="submit" disabled={isUploading || !selectedFile} className="w-full sm:w-auto">
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {isUploading ? 'Uploading...' : 'Submit for Verification'}
        </Button>
    </form>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold text-secondary-foreground">KYC Verification</h1>

      <Card className="shadow-lg border-border">
        <CardHeader>
          <CardTitle className="text-xl text-secondary-foreground flex items-center gap-2">
            <FileCheck className="h-5 w-5" /> Verification Status
          </CardTitle>
          <CardDescription>
            Verify your identity to enhance account security and access all features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
          ) : (
             renderKycStatus()
          )}
        </CardContent>
        {/* Optionally add a footer for help links */}
         <CardFooter className="text-xs text-muted-foreground border-t pt-4">
             Need help? <a href="/contact" className="text-primary hover:underline ml-1">Contact Support</a>
         </CardFooter>
      </Card>
    </div>
  );
}
