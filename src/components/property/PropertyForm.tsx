'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, XCircle, BedDouble, Bath, Building, Square, Hash, ArrowUpDown, Sun, Tv, Utensils, Wifi, Snowflake, ParkingCircle, ShowerHead, Refrigerator, WashingMachine, Bell, Video, ShieldCheck, PlugZap, Volume2, FireExtinguisher, LampDesk, Box, Wind, Leaf, CircleHelp, Image as ImageIcon } from 'lucide-react'; // Added ImageIcon
import type { Property } from '@/types/property';
import crypto from 'crypto';
import { Separator } from '@/components/ui/separator';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Define available amenities (extended list)
const allAmenities = [
    { id: 'ac', label: 'Air Conditioning', icon: Snowflake },
    { id: 'tv', label: 'Television', icon: Tv },
    { id: 'wifi', label: 'WiFi', icon: Wifi },
    { id: 'kitchen', label: 'Kitchen Access', icon: Utensils },
    { id: 'parking', label: 'Parking', icon: ParkingCircle },
    { id: 'geyser', label: 'Geyser / Water Heater', icon: ShowerHead },
    { id: 'refrigerator', label: 'Refrigerator', icon: Refrigerator },
    { id: 'washingMachine', label: 'Washing Machine', icon: WashingMachine },
    { id: 'powerBackup', label: 'Power Backup', icon: PlugZap },
    { id: 'intercom', label: 'Intercom', icon: Bell },
    { id: 'cctv', label: 'CCTV', icon: Video },
    { id: 'securityGuard', label: 'Security Guard', icon: ShieldCheck },
    { id: 'fireExtinguisher', label: 'Fire Extinguisher', icon: FireExtinguisher },
    { id: 'lift', label: 'Lift/Elevator', icon: ArrowUpDown },
    { id: 'bed', label: 'Bed Provided', icon: BedDouble },
    { id: 'wardrobe', label: 'Wardrobe', icon: Box },
    { id: 'studyTable', label: 'Study Table', icon: LampDesk },
    { id: 'sofa', label: 'Sofa', icon: CircleHelp }, // Placeholder icon
    { id: 'diningTable', label: 'Dining Table', icon: CircleHelp }, // Placeholder icon
    { id: 'microwave', label: 'Microwave', icon: CircleHelp }, // Placeholder icon
    { id: 'waterPurifier', label: 'Water Purifier', icon: CircleHelp }, // Placeholder icon
    { id: 'inverter', label: 'Inverter', icon: CircleHelp }, // Placeholder icon
    { id: 'garden', label: 'Garden/Lawn', icon: Leaf },
    { id: 'gym', label: 'Gymnasium', icon: CircleHelp }, // Placeholder icon
    { id: 'swimmingPool', label: 'Swimming Pool', icon: CircleHelp }, // Placeholder icon
    { id: 'library', label: 'Library', icon: CircleHelp }, // Placeholder icon
    { id: 'mosquitoNet', label: 'Mosquito Net', icon: CircleHelp }, // Placeholder icon
    { id: 'fan', label: 'Fan', icon: Wind },
    { id: 'attachedBathroom', label: 'Attached Bathroom', icon: Bath },
    // Add more as needed...
];

// Zod schema for validation including new fields
const propertySchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  price: z.coerce.number().min(1, { message: "Price must be a positive number." }),
  city: z.string().optional().nullable(),
  propertyType: z.string().optional().nullable(),
  bedrooms: z.coerce.number().int().min(0, "Cannot be negative").optional().nullable(),
  bathrooms: z.coerce.number().int().min(0, "Cannot be negative").optional().nullable(),
  balconies: z.coerce.number().int().min(0, "Cannot be negative").optional().nullable(),
  kitchenAvailable: z.boolean().optional(),
  hallAvailable: z.boolean().optional(),
  size: z.coerce.number().positive("Must be positive").optional().nullable(),
  floorNumber: z.coerce.number().int().optional().nullable(),
  totalFloors: z.coerce.number().int().min(0, "Total floors cannot be negative").optional().nullable(),
  // Allow special value 'none' for 'facing' to represent "Not selected" and handle it during submission
  facing: z.enum(['East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West', 'none', '']).optional().nullable(), // Added 'none'
  amenities: z.array(z.string()).optional(),
  // URLs can be empty strings or valid URLs, or null
  imageUrl: z.string().url({ message: "Invalid image URL format" }).optional().or(z.literal('')).nullable(),
  panoImageUrl: z.string().url({ message: "Invalid 360° image URL format" }).optional().or(z.literal('')).nullable(),
  galleryImages: z.array(z.string().url({ message: "Invalid gallery URL format" })).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
});


type PropertyFormData = z.infer<typeof propertySchema>;

interface PropertyFormProps {
  initialData?: Property | null;
  onSubmit: (data: PropertyFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean; // Receive isSubmitting state from parent
}

// Helper function to extract default values safely
const getDefaultValues = (data: Property | null | undefined): PropertyFormData => ({
  title: data?.title || '',
  description: data?.description || '',
  price: data?.price || 0,
  city: data?.city || '',
  propertyType: data?.propertyType || '',
  bedrooms: data?.bedrooms ?? 0, // Use nullish coalescing for numbers
  bathrooms: data?.bathrooms ?? 0,
  balconies: data?.balconies ?? 0,
  kitchenAvailable: data?.kitchenAvailable ?? false, // Use nullish coalescing for booleans
  hallAvailable: data?.hallAvailable ?? false,
  size: data?.size ?? undefined,
  floorNumber: data?.floorNumber ?? undefined,
  totalFloors: data?.totalFloors ?? undefined,
  facing: data?.facing || 'none', // Default to 'none' if falsy or null/undefined
  amenities: data?.amenities || [],
  imageUrl: data?.imageUrl || '',
  panoImageUrl: data?.panoImageUrl || '',
  galleryImages: data?.galleryImages || [],
  tags: data?.tags || [],
});


export function PropertyForm({ initialData, onSubmit, onCancel, isSubmitting = false }: PropertyFormProps) {
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [panoImageFile, setPanoImageFile] = useState<File | null>(null);
  // const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  // const [currentTags, setCurrentTags] = useState<string[]>(initialData?.tags || []);

  const { register, handleSubmit, control, reset, formState: { errors }, watch } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: getDefaultValues(initialData), // Use helper function
  });

  // Watch form values to debug
  // const watchedValues = watch();
  // useEffect(() => {
  //   console.log("Form values watched:", watchedValues);
  //   console.log("Initial data:", initialData);
  // }, [watchedValues, initialData]);

  useEffect(() => {
    // Reset form when initialData changes or form is opened/closed
    // console.log("Resetting form with initialData:", initialData);
    reset(getDefaultValues(initialData)); // Use helper function for reset
    setMainImageFile(null);
    setPanoImageFile(null);
     // Reset galleryFiles and currentTags state here if implementing
  }, [initialData, reset]);

  const handleMainImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setMainImageFile(event.target.files[0]);
    } else {
      setMainImageFile(null);
    }
  };

  const handlePanoImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
     if (event.target.files && event.target.files[0]) {
       setPanoImageFile(event.target.files[0]);
     } else {
        setPanoImageFile(null);
     }
  };

  // --- Handlers for Gallery & Tags (if implemented) ---
  // const handleGalleryFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => { ... }
  // const handleRemoveGalleryFile = (index: number) => { ... }
  // const handleAddTag = (tag: string) => { ... }
  // const handleRemoveTag = (index: number) => { ... }
  // --- ---

  const processSubmit = async (data: PropertyFormData) => {
    console.log("[PropertyForm processSubmit] Raw form data received:", data);

    // --- Image URL Handling (Simulation) ---
    // In a real app, upload files here *before* calling onSubmit
    // and get back the final URLs.

    let finalImageUrl = data.imageUrl; // Start with potentially provided URL
    if (mainImageFile) {
      // Simulate upload and get URL
      console.log("[PropertyForm processSubmit] Simulating main image upload for:", mainImageFile.name);
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
      const seed = mainImageFile.name.replace(/[^a-zA-Z0-9]/g, '') || crypto.randomUUID();
      finalImageUrl = `https://picsum.photos/seed/${seed}/600/400`; // Use placeholder
      console.log("[PropertyForm processSubmit] Simulated new main image URL:", finalImageUrl);
    } else if (!finalImageUrl && !initialData?.imageUrl) {
      // If no URL provided and no initial data URL, generate a placeholder for add form
      finalImageUrl = `https://picsum.photos/seed/${crypto.randomUUID()}/600/400`;
      console.log("[PropertyForm processSubmit] Generated default main image URL:", finalImageUrl);
    }

    let finalPanoUrl = data.panoImageUrl; // Start with potentially provided URL
    if (panoImageFile) {
       // Simulate upload and get URL
      console.log("[PropertyForm processSubmit] Simulating pano image upload for:", panoImageFile.name);
       await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
       const seed = panoImageFile.name.replace(/[^a-zA-Z0-9]/g, '') || crypto.randomUUID();
       finalPanoUrl = `https://picsum.photos/seed/${seed}/1000/500`; // Use placeholder
       console.log("[PropertyForm processSubmit] Simulated new pano image URL:", finalPanoUrl);
    } else if (!finalPanoUrl && !initialData?.panoImageUrl) {
        // If no URL provided and no initial data URL, explicitly set to null for add form
        finalPanoUrl = null;
         console.log("[PropertyForm processSubmit] Setting pano image URL to null (no file/URL provided).");
    }

    // TODO: Handle Gallery uploads similarly

    const submitData: PropertyFormData = {
        ...data,
        // Ensure booleans are handled (default to false if undefined/null)
        kitchenAvailable: data.kitchenAvailable ?? false,
        hallAvailable: data.hallAvailable ?? false,
        // Use the processed image URLs
        imageUrl: finalImageUrl || null, // Ensure null if empty
        panoImageUrl: finalPanoUrl || null, // Ensure null if empty
        // galleryImages: finalGalleryUrls,
        // tags: finalTags,
        // Handle 'facing': if it's 'none' or empty, submit null
        facing: (data.facing === '' || data.facing === 'none') ? null : data.facing,
    };

    console.log("[PropertyForm processSubmit] Submitting processed data to parent:", JSON.stringify(submitData, null, 2));
    onSubmit(submitData); // Pass the processed data to the parent component's submit handler
  };

  return (
    // Use form animation class
    // Correctly wrap processSubmit with handleSubmit from react-hook-form
    <form onSubmit={handleSubmit(processSubmit)} id="property-form" className="space-y-6 animate-slideInFromBottom">
      <h3 className="text-lg font-semibold text-primary border-b pb-2 mb-4">Basic Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Title */}
          <div className="space-y-1">
            <Label htmlFor="title">Property Title</Label>
            <Input id="title" {...register('title')} placeholder="e.g., Sunny Beachside Condo" className={cn(errors.title ? 'border-destructive' : 'border-input')}/>
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>
           {/* Price */}
           <div className="space-y-1">
            <Label htmlFor="price">Price per night (INR)</Label>
            <Input id="price" type="number" step="1" {...register('price')} placeholder="1500" className={cn(errors.price ? 'border-destructive' : 'border-input')}/>
             {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
          </div>
      </div>
      {/* Description */}
       <div className="space-y-1">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register('description')} placeholder="Describe your property..." rows={4} className={cn(errors.description ? 'border-destructive' : 'border-input')}/>
        {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
      </div>
       {/* Location & Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
                <Label htmlFor="city">City</Label>
                <Input id="city" {...register('city')} placeholder="e.g., Los Angeles" className={cn(errors.city ? 'border-destructive' : 'border-input')}/>
                {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
            </div>
            <div className="space-y-1">
                <Label htmlFor="propertyType">Property Type</Label>
                <Input id="propertyType" {...register('propertyType')} placeholder="e.g., Apartment, Villa" className={cn(errors.propertyType ? 'border-destructive' : 'border-input')}/>
                {errors.propertyType && <p className="text-sm text-destructive">{errors.propertyType.message}</p>}
            </div>
        </div>

      <Separator className="my-6" />

      <h3 className="text-lg font-semibold text-primary border-b pb-2 mb-4">Room Details</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
         {/* Bedrooms */}
          <div className="space-y-1">
            <Label htmlFor="bedrooms" className="flex items-center gap-1"><BedDouble className="h-4 w-4 text-muted-foreground"/> Bedrooms</Label>
            <Input id="bedrooms" type="number" step="1" min="0" {...register('bedrooms')} placeholder="e.g., 3" className={cn(errors.bedrooms ? 'border-destructive' : 'border-input')}/>
            {errors.bedrooms && <p className="text-sm text-destructive">{errors.bedrooms.message}</p>}
          </div>
          {/* Bathrooms */}
          <div className="space-y-1">
            <Label htmlFor="bathrooms" className="flex items-center gap-1"><Bath className="h-4 w-4 text-muted-foreground"/> Bathrooms</Label>
            <Input id="bathrooms" type="number" step="1" min="0" {...register('bathrooms')} placeholder="e.g., 2" className={cn(errors.bathrooms ? 'border-destructive' : 'border-input')}/>
            {errors.bathrooms && <p className="text-sm text-destructive">{errors.bathrooms.message}</p>}
          </div>
          {/* Balconies */}
          <div className="space-y-1">
            <Label htmlFor="balconies" className="flex items-center gap-1"><Building className="h-4 w-4 text-muted-foreground"/> Balconies</Label>
            <Input id="balconies" type="number" step="1" min="0" {...register('balconies')} placeholder="e.g., 1" className={cn(errors.balconies ? 'border-destructive' : 'border-input')}/>
            {errors.balconies && <p className="text-sm text-destructive">{errors.balconies.message}</p>}
          </div>
          {/* Size */}
           <div className="space-y-1">
            <Label htmlFor="size" className="flex items-center gap-1"><Square className="h-4 w-4 text-muted-foreground"/> Size (Sq.Ft)</Label>
            <Input id="size" type="number" step="1" min="0" {...register('size')} placeholder="e.g., 1200" className={cn(errors.size ? 'border-destructive' : 'border-input')}/>
            {errors.size && <p className="text-sm text-destructive">{errors.size.message}</p>}
          </div>
           {/* Floor Number */}
           <div className="space-y-1">
            <Label htmlFor="floorNumber" className="flex items-center gap-1"><Hash className="h-4 w-4 text-muted-foreground"/> Floor No.</Label>
            <Input id="floorNumber" type="number" step="1" {...register('floorNumber')} placeholder="e.g., 5" className={cn(errors.floorNumber ? 'border-destructive' : 'border-input')}/>
            {errors.floorNumber && <p className="text-sm text-destructive">{errors.floorNumber.message}</p>}
          </div>
           {/* Total Floors */}
           <div className="space-y-1">
            <Label htmlFor="totalFloors" className="flex items-center gap-1"><Building className="h-4 w-4 text-muted-foreground"/> Total Floors</Label>
            <Input id="totalFloors" type="number" step="1" min="0" {...register('totalFloors')} placeholder="e.g., 12" className={cn(errors.totalFloors ? 'border-destructive' : 'border-input')}/>
            {errors.totalFloors && <p className="text-sm text-destructive">{errors.totalFloors.message}</p>}
          </div>
           {/* Facing */}
           <div className="space-y-1">
                <Label htmlFor="facing" className="flex items-center gap-1"><Sun className="h-4 w-4 text-muted-foreground"/> Facing</Label>
                 <Controller
                    name="facing"
                    control={control}
                    render={({ field }) => (
                        // Use field.value (which could be 'none', null, or a direction)
                        // Ensure the value passed to Select matches one of the SelectItem values
                        <Select onValueChange={field.onChange} value={field.value ?? 'none'} >
                            <SelectTrigger id="facing" className={cn(errors.facing ? 'border-destructive' : 'border-input')}>
                                <SelectValue placeholder="Select Direction" />
                            </SelectTrigger>
                            <SelectContent>
                                 {/* Use a distinct value for the placeholder item */}
                                 <SelectItem value="none">Not Specified</SelectItem>
                                <SelectItem value="East">East</SelectItem>
                                <SelectItem value="West">West</SelectItem>
                                <SelectItem value="North">North</SelectItem>
                                <SelectItem value="South">South</SelectItem>
                                <SelectItem value="North-East">North-East</SelectItem>
                                <SelectItem value="North-West">North-West</SelectItem>
                                <SelectItem value="South-East">South-East</SelectItem>
                                <SelectItem value="South-West">South-West</SelectItem>
                            </SelectContent>
                        </Select>
                     )}
                />
                {errors.facing && <p className="text-sm text-destructive">{errors.facing.message}</p>}
            </div>
          {/* Kitchen Available */}
          <div className="flex items-center space-x-2 pt-6">
            <Controller
              name="kitchenAvailable"
              control={control}
              render={({ field }) => (
                 // Handle potential undefined value from defaultValues
                <Checkbox
                  id="kitchenAvailable"
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                  className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground border-primary"
                />
              )}
            />
            <Label htmlFor="kitchenAvailable" className="font-normal text-muted-foreground flex items-center gap-1">
               <Utensils className="h-4 w-4"/> Kitchen Available
            </Label>
          </div>
          {/* Hall Available */}
           <div className="flex items-center space-x-2 pt-6">
            <Controller
              name="hallAvailable"
              control={control}
              render={({ field }) => (
                 // Handle potential undefined value from defaultValues
                <Checkbox
                  id="hallAvailable"
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                   className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground border-primary"
                />
              )}
            />
            <Label htmlFor="hallAvailable" className="font-normal text-muted-foreground flex items-center gap-1">
               <Tv className="h-4 w-4"/> Hall/Living Room
            </Label>
          </div>
      </div>

      <Separator className="my-6" />

      <h3 className="text-lg font-semibold text-primary border-b pb-2 mb-4">Amenities</h3>
       <Controller
            name="amenities"
            control={control}
            render={({ field }) => (
               <ScrollArea className="h-72 w-full rounded-md border p-4">
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                     {allAmenities.map((amenity) => (
                         <div key={amenity.id} className="flex items-center space-x-2">
                             <Checkbox
                                id={`amenity-${amenity.id}`}
                                checked={field.value?.includes(amenity.id)}
                                onCheckedChange={(checked) => {
                                    const newValue = checked
                                        ? [...(field.value || []), amenity.id]
                                        : (field.value || []).filter((a) => a !== amenity.id);
                                    field.onChange(newValue);
                                }}
                                className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground border-primary"
                             />
                              <Label htmlFor={`amenity-${amenity.id}`} className="font-normal text-muted-foreground flex items-center gap-1 cursor-pointer text-xs sm:text-sm"> {/* Adjusted text size */}
                                 <amenity.icon className="h-4 w-4 flex-shrink-0"/> {amenity.label}
                              </Label>
                         </div>
                    ))}
                  </div>
                  <ScrollBar orientation="vertical" />
               </ScrollArea>
            )}
          />
          {errors.amenities && <p className="text-sm text-destructive">{errors.amenities.message}</p>}

       <Separator className="my-6" />

       <h3 className="text-lg font-semibold text-primary border-b pb-2 mb-4">Images</h3>
       {/* Main Image Upload */}
       <div className="space-y-1">
            <Label htmlFor="mainImage">Main Property Image</Label>
            <Input
                id="mainImage"
                type="file"
                accept="image/*"
                onChange={handleMainImageChange} // Use separate handler
                 className="bg-background border-input file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-accent-foreground hover:file:bg-accent/90"
            />
            {mainImageFile && <p className="text-xs text-muted-foreground mt-1">New file selected: {mainImageFile.name} (will be uploaded)</p>}
            {!mainImageFile && initialData?.imageUrl && <p className="text-xs text-muted-foreground mt-1">Current image: {initialData.imageUrl.split('/').pop()}</p>}
            {/* Removed direct registration of imageUrl */}
            {errors.imageUrl && <p className="text-sm text-destructive">{errors.imageUrl.message}</p>}
        </div>

       {/* 360 Image Upload */}
       <div className="space-y-1">
            <Label htmlFor="panoImage">360° Panoramic Image (Optional)</Label>
            <Input
                id="panoImage"
                type="file"
                accept="image/*"
                onChange={handlePanoImageChange} // Use separate handler
                 className="bg-background border-input file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-accent-foreground hover:file:bg-accent/90"
            />
             {panoImageFile && <p className="text-xs text-muted-foreground mt-1">New file selected: {panoImageFile.name} (will be uploaded)</p>}
             {!panoImageFile && initialData?.panoImageUrl && <p className="text-xs text-muted-foreground mt-1">Current 360° image: {initialData.panoImageUrl.split('/').pop()}</p>}
             <p className="text-xs text-muted-foreground mt-1">Upload an equirectangular image for the 360° view.</p>
             {/* Removed direct registration of panoImageUrl */}
             {errors.panoImageUrl && <p className="text-sm text-destructive">{errors.panoImageUrl.message}</p>}
        </div>

        {/* TODO: Implement Gallery Upload Section */}
         {/* <div className="space-y-1">
            <Label htmlFor="galleryImages">Gallery Images (Select multiple)</Label>
            <Input id="galleryImages" type="file" multiple accept="image/*" onChange={handleGalleryFilesChange} />
            ... Preview and remove logic ...
         </div> */}

       <Separator className="my-6" />

       {/* TODO: Implement Tags Section */}
        {/* <div className="space-y-1">
            <Label htmlFor="tags">Tags (Optional)</Label>
            ... Tag input component (e.g., comma-separated or using a library) ...
            {errors.tags && <p className="text-sm text-destructive">{errors.tags.message}</p>}
         </div> */}


      {/* Form Actions */}
      <div className="flex justify-end gap-2 pt-4">
         <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            <XCircle className="mr-2 h-4 w-4"/> Cancel
         </Button>
         {/* Ensure this button is type="submit" */}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {isSubmitting ? 'Saving...' : (initialData ? 'Update Property' : 'Add Property')}
        </Button>
      </div>
    </form>
  );
}
