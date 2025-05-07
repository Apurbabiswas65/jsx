import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Property } from '@/types/property'; // Assuming types are defined here
import { formatCurrency } from '@/lib/utils'; // Assuming a utility for formatting currency
import { Wifi, Thermometer, BedDouble, Bath, ParkingCircle, Waves, Utensils, Eye } from 'lucide-react'; // Added Eye icon
import { cn } from '@/lib/utils';
import { DEFAULT_LOGO_URL } from '@/lib/constants'; // Import default logo if needed for fallback

// Helper to map amenity strings to icons
const amenityIcons: { [key: string]: React.ElementType } = {
  wifi: Wifi,
  ac: Thermometer,
  pool: Waves,
  parking: ParkingCircle,
  kitchen: Utensils,
  bedrooms: BedDouble, // Example: could map '2 bedrooms' to this
  bathrooms: Bath, // Example
  beachfront: Waves,
};

// Function to get icon component based on amenity string
const getAmenityIcon = (amenity: string) => {
  const Icon = amenityIcons[amenity.toLowerCase()];
  // Icons inside badges should contrast with the accent background (soft blue-grey) -> use accent-foreground
  return Icon ? <Icon className="h-4 w-4 text-accent-foreground" /> : null;
};

export function PropertyCard({ property }: { property: Property }) {
    // Define a reliable default image URL (using picsum for consistency)
    const seed = property.id || 'default_property_seed'; // Use a fixed seed if id is missing
    const defaultImageUrl = `https://picsum.photos/seed/${seed}/600/400`;

    // Stricter check for valid image URL (absolute or root-relative starting with /)
    const isValidImageUrl = (url: string | null | undefined): url is string => {
        return typeof url === 'string' && url.trim() !== '' && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/'));
    };

    // Determine the final image URL
    let imageUrl = defaultImageUrl; // Start with the default
    if (isValidImageUrl(property.imageUrl)) {
        // If property.imageUrl is a valid absolute or root-relative URL, use it
        imageUrl = property.imageUrl;
    } else if (property.imageUrl) {
         // If property.imageUrl exists but isn't valid, log a warning and use default.
         // This handles cases like relative paths without a leading slash.
         console.warn(`[PropertyCard] Invalid image URL format for property ${property.id}: "${property.imageUrl}". Falling back to default.`);
         // Keep imageUrl as defaultImageUrl
    }
    // If property.imageUrl is null/undefined, imageUrl remains defaultImageUrl

  return (
    <Card className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out group", // Added group class for hover effects within card
        "bg-card text-card-foreground border border-border/50 rounded-lg", // Use theme border, rounded corners
        "shadow-md hover:shadow-xl hover:scale-[1.02] hover:border-accent/50", // Use accent color for hover border, slightly reduced scale
        "flex flex-col h-full" // Ensure card takes full height if in grid
        )}>
      <CardHeader className="p-0 relative overflow-hidden rounded-t-lg"> {/* Ensure top corners are rounded */}
        <Image
          // Use the determined imageUrl (either property's or default)
          src={imageUrl}
          alt={property.title}
          width={600}
          height={400}
          className="object-cover w-full h-48 transition-transform duration-500 group-hover:scale-105" // Keep zoom effect
          data-ai-hint="property photo house exterior" // Added AI hint
          // Add error handling for the image itself
           onError={(e) => {
             // Attempt to load the default image if the primary one fails
             const target = e.target as HTMLImageElement;
             if (target.src !== defaultImageUrl) {
                console.warn(`[PropertyCard] Failed to load image: ${imageUrl}, falling back to default: ${defaultImageUrl}.`);
                target.src = defaultImageUrl;
             } else {
                 console.error(`[PropertyCard] Failed to load default image: ${defaultImageUrl}`);
                 // Optionally hide the image or show a placeholder icon/text
                 target.style.display = 'none'; // Hide broken image element
             }
           }}
        />
         {/* Optional: Add a subtle gradient overlay */}
         <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-lg font-semibold mb-1 text-card-foreground group-hover:text-primary transition-colors duration-200">{property.title}</CardTitle> {/* Primary color on hover */}
        <CardDescription className="text-sm text-muted-foreground mb-3 line-clamp-2 h-10">{property.description}</CardDescription> {/* Fixed height for description */}
         <div className="flex flex-wrap gap-1 mb-3 min-h-[24px]"> {/* Min height for amenity row */}
          {(property.amenities || []).slice(0, 3).map((amenity) => { // Show max 3 amenities initially
             const Icon = getAmenityIcon(amenity);
             return Icon ? (
                // Use accent background for badges (soft blue-grey)
                <Badge key={amenity} variant="secondary" className="flex items-center gap-1 capitalize bg-accent text-accent-foreground border-none px-2 py-0.5">
                   {Icon} {amenity}
                </Badge>
             ) : null; // Hide badge if no icon found
          })}
          {(property.amenities || []).length > 3 && (
             <Badge variant="outline" className="px-1.5 py-0.5 text-xs">+{(property.amenities || []).length - 3}</Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-4 flex justify-between items-center border-t border-border/50"> {/* Use theme border */}
        {/* Price uses primary color */}
        <p className="text-lg font-bold text-primary">{formatCurrency(property.price)} <span className="text-sm font-normal text-muted-foreground">/ night</span></p>
        {/* Ensure the link correctly points to the dynamic property page */}
        <Link href={`/properties/${property.id}`} passHref>
           {/* Use default button variant (Primary color) */}
          <Button variant="default" size="sm" className="shadow-sm hover:shadow-md transition-all duration-200 bg-primary text-primary-foreground hover:bg-primary/90">
              <Eye className="mr-1.5 h-4 w-4"/> View Details
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
