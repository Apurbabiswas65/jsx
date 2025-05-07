'use client'; // Needed for filters and interaction

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation'; // For reading/updating URL params
import { PropertyGrid } from '@/components/property/PropertyGrid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import type { Property } from '@/types/property';
import { formatCurrency } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Wifi, Thermometer, Waves, ParkingCircle, Utensils, Search, MapPin, Loader2, AlertTriangle } from 'lucide-react'; // Added Loader2, AlertTriangle
import { getPublicProperties, type PropertyFilter } from '@/actions/propertyActions'; // Import fetching action and filter type
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

const availableAmenities = [
  { id: 'wifi', label: 'WiFi', icon: Wifi },
  { id: 'ac', label: 'Air Conditioning', icon: Thermometer },
  { id: 'pool', label: 'Pool', icon: Waves },
  { id: 'parking', label: 'Parking', icon: ParkingCircle },
  { id: 'kitchen', label: 'Kitchen', icon: Utensils },
  { id: 'beachfront', label: 'Beachfront', icon: Waves },
];

export default function BrowsePropertiesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL search params or defaults
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [locationFilter, setLocationFilter] = useState(searchParams.get('city') || '');
  const [priceRange, setPriceRange] = useState<[number, number]>(() => {
    const min = parseInt(searchParams.get('minPrice') || '0', 10);
    const max = parseInt(searchParams.get('maxPrice') || '5000', 10);
    return [min, max];
  });
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(() => {
    const amenitiesParam = searchParams.get('amenities');
    return amenitiesParam ? amenitiesParam.split(',') : [];
  });

  // Function to fetch properties based on current filters
  const fetchProperties = async () => {
    setIsLoading(true);
    setError(null);
    const filters: PropertyFilter = {
      status: 'verified', // Default to only showing verified properties
      limit: 20, // Add a limit for pagination later
      ...(searchTerm && { search: searchTerm }),
      ...(locationFilter && { city: locationFilter }),
      ...(priceRange[0] > 0 && { minPrice: priceRange[0] }),
      ...(priceRange[1] < 5000 && { maxPrice: priceRange[1] }),
      ...(selectedAmenities.length > 0 && { amenities: selectedAmenities }),
    };

    console.log("Fetching properties with filters:", filters);

    try {
      const fetchedProperties = await getPublicProperties(filters);
      if (fetchedProperties) {
        setProperties(fetchedProperties);
      } else {
        setProperties([]);
      }
    } catch (err: any) {
      console.error("Error fetching properties:", err);
      setError("Failed to load properties. Please try again later.");
      setProperties([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch properties on initial load and whenever filters change
  useEffect(() => {
    fetchProperties();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, locationFilter, priceRange, selectedAmenities]); // Depend on filter states

  // Update URL when filters change (optional but good UX)
  const updateURLParams = () => {
     const params = new URLSearchParams();
     if (searchTerm) params.set('q', searchTerm);
     if (locationFilter) params.set('city', locationFilter);
     if (priceRange[0] > 0) params.set('minPrice', priceRange[0].toString());
     if (priceRange[1] < 5000) params.set('maxPrice', priceRange[1].toString());
     if (selectedAmenities.length > 0) params.set('amenities', selectedAmenities.join(','));

     const queryString = params.toString();
     // Replace the URL without causing a full page reload
     router.replace(`/browse${queryString ? `?${queryString}` : ''}`, { scroll: false });
  };

  // Debounce URL update slightly to avoid rapid changes
   useEffect(() => {
     const handler = setTimeout(() => {
       updateURLParams();
     }, 500); // Adjust debounce time as needed

     return () => {
       clearTimeout(handler);
     };
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [searchTerm, locationFilter, priceRange, selectedAmenities]);


  const handlePriceChange = (value: number[]) => {
    setPriceRange([value[0], value[1]]);
  };

 const handleAmenityChange = (amenityId: string, checked: boolean | string) => {
    setSelectedAmenities(prev =>
      checked
        ? [...prev, amenityId]
        : prev.filter(id => id !== amenityId)
    );
  };

  const renderPropertyGrid = () => {
     if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => ( // Show 6 skeletons
                    <div key={i} className="space-y-2">
                    <Skeleton className="h-48 w-full rounded-lg" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-8 w-full" />
                    </div>
                ))}
            </div>
        );
    }

     if (error) {
         return (
            <div className="text-center text-destructive py-8 flex flex-col items-center">
                <AlertTriangle className="h-10 w-10 mb-4" />
                <p>{error}</p>
             </div>
         );
    }

     return <PropertyGrid properties={properties} />; // properties state already holds filtered data from fetch
   };


  return (
    <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="w-full md:w-1/4 lg:w-1/5">
            <Card className="sticky top-24 shadow-lg"> {/* Sticky positioning */}
            <CardHeader>
                <CardTitle className="text-xl text-secondary-foreground">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Location Filter */}
                <div>
                    <Label htmlFor="location" className="text-secondary-foreground">Location</Label>
                    <div className="relative mt-1">
                        <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="location"
                            type="text"
                            placeholder="e.g., Los Angeles"
                            value={locationFilter}
                            onChange={(e) => setLocationFilter(e.target.value)}
                            className="pl-8 bg-background border-input focus:ring-primary"
                        />
                    </div>
                </div>

                <Separator />

                {/* Search Filter */}
                <div>
                <Label htmlFor="search" className="text-secondary-foreground">Search by Name/Desc</Label>
                <div className="relative mt-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="search"
                        type="text"
                        placeholder="e.g., Cozy Apartment"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 bg-background border-input focus:ring-primary"
                    />
                </div>
                </div>

                <Separator />

                {/* Price Range Filter */}
                <div>
                <Label className="text-secondary-foreground">Price Range</Label>
                <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                    <span>{formatCurrency(priceRange[0])}</span>
                    <span>{formatCurrency(priceRange[1])}</span>
                </div>
                <Slider
                    min={0}
                    max={5000} // Adjust max price if needed
                    step={100}
                    value={[priceRange[0], priceRange[1]]}
                    onValueChange={handlePriceChange}
                    className="mt-2 [&>span:first-child>span]:bg-primary [&>span:last-child]:bg-primary [&>span:last-child]:border-primary"
                />
                </div>

                <Separator />

                {/* Amenities Filter */}
                <div>
                <Label className="text-secondary-foreground">Amenities</Label>
                <div className="mt-2 space-y-2">
                    {availableAmenities.map(amenity => (
                    <div key={amenity.id} className="flex items-center space-x-2">
                        <Checkbox
                        id={amenity.id}
                        checked={selectedAmenities.includes(amenity.id)}
                        onCheckedChange={(checked) => handleAmenityChange(amenity.id, checked)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground border-primary"
                        />
                        <amenity.icon className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor={amenity.id} className="text-sm font-normal text-muted-foreground cursor-pointer">
                        {amenity.label}
                        </Label>
                    </div>
                    ))}
                </div>
                </div>

                {/* Apply filters button removed - filters apply automatically via useEffect */}
                 {/* <Button className="w-full mt-4" variant="default" onClick={fetchProperties} disabled={isLoading}>
                    {isLoading ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Search className='mr-2 h-4 w-4' />}
                    Apply Filters
                 </Button> */}
            </CardContent>
            </Card>
        </aside>

        {/* Property Grid */}
        <section className="w-full md:w-3/4 lg:w-4/5">
            <h1 className="text-3xl font-bold mb-6 text-secondary-foreground">Browse Properties</h1>
            {renderPropertyGrid()}
             {/* TODO: Add Pagination component here */}
        </section>
        </div>
    </div>
  );
}
