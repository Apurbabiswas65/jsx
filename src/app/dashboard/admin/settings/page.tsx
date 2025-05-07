// src/app/dashboard/admin/settings/page.tsx
'use client';

import React, { useState, useEffect, useTransition } from 'react'; // Import React hooks
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Save, Palette, BellRing, ShieldQuestion, Mail, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import type { PlatformSettings } from '@/types/settings';
import { DEFAULT_LOGO_URL } from '@/lib/constants';
// Import Server Actions
import { getPlatformSettings, updatePlatformSettings } from '@/actions/adminActions';

export default function AdminSettingsPage() {
    // State for settings data fetched from server
    const [settings, setSettings] = useState<PlatformSettings | null>(null);
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);

    // Local state for unsaved changes (form inputs)
    const [platformName, setPlatformName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [allowNewRegistrations, setAllowNewRegistrations] = useState(true);
    const [defaultBookingFee, setDefaultBookingFee] = useState(0);
    const [termsAndConditions, setTermsAndConditions] = useState('');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null); // Use for displaying current/new logo

    const [isSaving, startSaveTransition] = useTransition(); // Transition hook for saving
    const { toast } = useToast();

    // Fetch initial settings on component mount
    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoadingSettings(true);
            try {
                const fetchedSettings = await getPlatformSettings();
                setSettings(fetchedSettings);
                // Initialize local form state with fetched values
                setPlatformName(fetchedSettings.platformName);
                setAdminEmail(fetchedSettings.adminEmail);
                setMaintenanceMode(fetchedSettings.maintenanceMode);
                setAllowNewRegistrations(fetchedSettings.allowNewRegistrations);
                setDefaultBookingFee(fetchedSettings.defaultBookingFee);
                setTermsAndConditions(fetchedSettings.termsAndConditions);
                setLogoPreview(fetchedSettings.logoUrl || DEFAULT_LOGO_URL); // Set initial logo preview
            } catch (error) {
                console.error("Error fetching platform settings:", error);
                toast({ title: "Error", description: "Could not load platform settings.", variant: "destructive" });
            } finally {
                setIsLoadingSettings(false);
            }
        };
        fetchSettings();
    }, [toast]);


     const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoFile(file);
            // Create a preview URL
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setLogoFile(null);
            setLogoPreview(settings?.logoUrl || DEFAULT_LOGO_URL); // Revert to saved logo if file removed
        }
    };

    // --- Form Submit Handler using Server Action ---
    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settings) return;

        let newLogoUrl = settings.logoUrl;
        if (logoFile) {
            try {
                const { uploadLogo } = await import('@/lib/storage');
                const uploadedUrl = await uploadLogo(logoFile);
                if (uploadedUrl) {
                    newLogoUrl = uploadedUrl;
                    toast({ 
                        title: "Logo Uploaded", 
                        description: `New logo has been uploaded successfully.` 
                    });
                } else {
                    throw new Error('Failed to get upload URL');
                }
            } catch (error: any) {
                toast({ 
                    title: "Upload Failed", 
                    description: error.message || 'Failed to upload logo.', 
                    variant: "destructive" 
                });
                return;
            }
        }

        const settingsToUpdate: Partial<PlatformSettings> = {
            platformName,
            adminEmail,
            maintenanceMode,
            allowNewRegistrations,
            defaultBookingFee,
            termsAndConditions,
             logoUrl: newLogoUrl, // Use the new URL if uploaded, otherwise keep existing
        };

        // Remove unchanged settings to optimize update (optional)
         const changedSettings: Partial<PlatformSettings> = {};
         for (const [key, value] of Object.entries(settingsToUpdate)) {
             const typedKey = key as keyof PlatformSettings;
             if (value !== settings[typedKey]) {
                 changedSettings[typedKey] = value;
             }
         }
        // Ensure logoUrl is included if a new file was selected, even if the string is the same temporarily
        if (logoFile && !changedSettings.logoUrl) {
             changedSettings.logoUrl = newLogoUrl;
        }

        if (Object.keys(changedSettings).length === 0) {
             toast({ title: "No Changes", description: "No settings were modified." });
             return;
        }

        console.log("Attempting to save settings:", changedSettings);

        startSaveTransition(async () => {
            const result = await updatePlatformSettings(changedSettings);
            if (result.success) {
                toast({ title: "Settings Saved", description: result.message });
                // Update the main settings state and logo preview to reflect saved changes
                 setSettings(prev => prev ? { ...prev, ...changedSettings } : null);
                 setLogoFile(null); // Clear file input after successful save
                 setLogoPreview(changedSettings.logoUrl || settings.logoUrl); // Update preview to saved URL
            } else {
                toast({ title: "Save Failed", description: result.message, variant: "destructive" });
                 // Revert preview if save failed? Optional, depends on UX preference.
                 // setLogoPreview(settings.logoUrl);
            }
        });
    };

    if (isLoadingSettings) {
         return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (!settings) {
        return <div className="text-center text-destructive">Failed to load settings.</div>;
    }


    return (
        <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-500">
            <h1 className="text-3xl font-bold text-secondary-foreground">Platform Settings</h1>
            <p className="text-muted-foreground">Configure core settings and behaviors of the OwnBroker platform.</p>

            <form onSubmit={handleSaveSettings}>
                 <Card className="shadow-lg transition-shadow hover:shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-xl text-secondary-foreground flex items-center gap-2">
                            <Settings className="h-5 w-5" /> General Settings
                        </CardTitle>
                         <CardDescription>Basic platform configuration.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="space-y-1">
                                <Label htmlFor="platformName">Platform Name</Label>
                                <Input
                                    id="platformName"
                                    name="platformName"
                                    value={platformName}
                                    onChange={(e) => setPlatformName(e.target.value)}
                                    className="bg-background"
                                />
                            </div>
                             <div className="space-y-1">
                                <Label htmlFor="adminEmail">Admin Contact Email</Label>
                                <Input
                                    id="adminEmail"
                                    name="adminEmail"
                                    type="email"
                                    value={adminEmail}
                                    onChange={(e) => setAdminEmail(e.target.value)}
                                    className="bg-background"
                                />
                            </div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="maintenanceMode"
                                    checked={maintenanceMode}
                                    onCheckedChange={setMaintenanceMode}
                                />
                                <Label htmlFor="maintenanceMode">Enable Maintenance Mode</Label>
                            </div>
                             <div className="flex items-center space-x-2">
                                <Switch
                                    id="allowNewRegistrations"
                                    checked={allowNewRegistrations}
                                    onCheckedChange={setAllowNewRegistrations}
                                />
                                <Label htmlFor="allowNewRegistrations">Allow New User Registrations</Label>
                            </div>
                        </div>
                         <div className="space-y-1 pt-4">
                             <Label htmlFor="defaultBookingFee">Default Booking Fee (%)</Label>
                             <Input
                                id="defaultBookingFee"
                                name="defaultBookingFee"
                                type="number"
                                step="0.1"
                                value={defaultBookingFee}
                                onChange={(e) => setDefaultBookingFee(parseFloat(e.target.value))}
                                className="bg-background w-32"
                            />
                            <p className="text-xs text-muted-foreground">Service fee applied to bookings.</p>
                        </div>

                    </CardContent>
                </Card>

                <Separator className="my-6" />

                 <Card className="shadow-lg transition-shadow hover:shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-xl text-secondary-foreground flex items-center gap-2">
                            <ImageIcon className="h-5 w-5" /> Logo & Branding
                        </CardTitle>
                         <CardDescription>Manage the platform's logo.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="flex items-center gap-6">
                             <div>
                                <Label>Current Logo</Label>
                                <div className="mt-2 w-24 h-24 relative border rounded-md flex items-center justify-center bg-muted overflow-hidden">
                                    {logoPreview ? (
                                        <Image src={logoPreview} alt="Logo Preview" layout="fill" objectFit="contain" onError={() => setLogoPreview(DEFAULT_LOGO_URL)} /> // Added onError handler
                                    ) : (
                                        <span className="text-xs text-muted-foreground">No Logo</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex-grow space-y-1">
                                <Label htmlFor="logoFile">Upload New Logo</Label>
                                <Input
                                    id="logoFile"
                                    name="logoFile"
                                    type="file"
                                    accept="image/png, image/jpeg, image/svg+xml, image/webp"
                                    onChange={handleLogoChange}
                                    className="bg-background border-input file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-accent-foreground hover:file:bg-accent/90"
                                />
                                <p className="text-xs text-muted-foreground">Recommended: PNG or SVG format, max 1MB.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>


                 <Separator className="my-6" />

                 <Card className="shadow-lg transition-shadow hover:shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-xl text-secondary-foreground flex items-center gap-2">
                            <Mail className="h-5 w-5" /> Email Notifications (Placeholder)
                        </CardTitle>
                         <CardDescription>Configure email templates and triggers (future feature).</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <p className="text-muted-foreground text-sm">Settings for welcome emails, booking confirmations, etc.</p>
                         {/* Placeholder for future email settings UI */}
                         <div className="aspect-video bg-muted rounded-md flex items-center justify-center text-muted-foreground border border-dashed border-border mt-4">
                            Email Settings UI Placeholder
                        </div>
                    </CardContent>
                </Card>

                 <Separator className="my-6" />

                 <Card className="shadow-lg transition-shadow hover:shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-xl text-secondary-foreground flex items-center gap-2">
                            <ShieldQuestion className="h-5 w-5" /> Legal & Content
                        </CardTitle>
                         <CardDescription>Manage terms, privacy policy content.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="space-y-1">
                            <Label htmlFor="termsAndConditions">Terms & Conditions Content</Label>
                            <Textarea
                                id="termsAndConditions"
                                name="termsAndConditions"
                                value={termsAndConditions}
                                onChange={(e) => setTermsAndConditions(e.target.value)}
                                rows={8}
                                className="bg-background"
                                placeholder="Enter or update the terms and conditions..."
                            />
                             <p className="text-xs text-muted-foreground">This content will be displayed on the /terms page. Use Markdown if supported.</p>
                        </div>
                        {/* Add similar Textarea for Privacy Policy */}
                    </CardContent>
                </Card>


                 <div className="flex justify-end mt-8">
                    <Button type="submit" disabled={isSaving} variant="default">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {isSaving ? 'Saving...' : 'Save All Settings'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
