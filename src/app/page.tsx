'use client'; // Keep 'use client' if SearchBar or other interactive elements remain

import React, { useState, useEffect } from 'react'; // Import useState and useEffect
import { HeroSection } from '@/components/sections/HeroSection';
import { SearchBar } from '@/components/sections/SearchBar';
import { PropertyGrid } from '@/components/property/PropertyGrid';
import { WhyChooseUs } from '@/components/sections/WhyChooseUs';
import { Testimonials } from '@/components/sections/Testimonials';
import { BlogPreview } from '@/components/sections/BlogPreview';
import { BecomeOwnerSection } from '@/components/sections/BecomeOwnerSection';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Eye, Loader2, AlertTriangle } from 'lucide-react'; // Added Loader2, AlertTriangle
import { getPublicProperties } from '@/actions/propertyActions'; // Import the new action
import type { Property } from '@/types/property';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

export default function Home() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperties = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch only verified properties, limit to 4 for the homepage
        const fetchedProperties = await getPublicProperties({ status: 'verified', limit: 4 });
        if (fetchedProperties) {
          setProperties(fetchedProperties);
        } else {
          setProperties([]);
          // Consider if an error message is needed here or just show "No properties"
        }
      } catch (err: any) {
        console.error("Error fetching properties for homepage:", err);
        setError("Failed to load featured properties. Please try again later.");
        setProperties([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperties();
  }, []); // Fetch only on initial mount

  const renderPropertyGrid = () => {
    if (isLoading) {
      // Show skeleton loading state
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
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

    if (properties.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-8">
                <p>No featured properties available at the moment.</p>
            </div>
        );
    }

    return <PropertyGrid properties={properties} />;
  };


  return (
    // Main container remains full width for Hero section
    <div className="flex flex-col animate-in fade-in duration-500">
      {/* Hero Section (Full Width) */}
      <HeroSection />

      {/* Search Bar (Overlaps Hero) */}
      <SearchBar />

       {/* Add vertical spacing */}
       <div className="mt-16 md:mt-24"></div>

      {/* Featured Properties Section (Inside Container) */}
      <section className="container mx-auto px-4 section-animate">
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 md:mb-12 gap-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center md:text-left text-foreground">Featured Properties</h2>
             <Link href="/browse" passHref>
               <Button variant="outline" size="lg" className="shadow-sm hover:shadow-md transition-shadow border-border text-foreground hover:bg-accent hover:text-accent-foreground">
                   <Eye className="mr-2 h-5 w-5" /> View All Properties
               </Button>
            </Link>
        </div>
        {/* Render Property Grid or Loading/Error State */}
        {renderPropertyGrid()}
        {/* Optional: Trusted by Badge */}
         <div className="text-center mt-12">
            <p className="text-sm font-medium text-muted-foreground bg-secondary py-2 px-4 rounded-full inline-block shadow-sm">
              Trusted by 10,000+ Property Owners
            </p>
        </div>
      </section>

      {/* Add vertical spacing */}
       <div className="mt-20 md:mt-32"></div>

      {/* Become an Owner Section */}
       <div className="section-animate">
          <BecomeOwnerSection />
       </div>

        {/* Add vertical spacing */}
       <div className="mt-20 md:mt-32"></div>

      {/* Why Choose Us Section (Inside Container) */}
      <div className="container mx-auto px-4 section-animate">
        <WhyChooseUs />
      </div>

       {/* Add vertical spacing */}
       <div className="mt-20 md:mt-32"></div>

      {/* Testimonials Section */}
      <div className="section-animate">
        <Testimonials />
      </div>

       {/* Add vertical spacing */}
       <div className="mt-20 md:mt-32"></div>

      {/* Blog Preview Section */}
       <div className="section-animate">
          <BlogPreview />
       </div>

        {/* Add vertical spacing before footer */}
       <div className="mt-20 md:mt-32"></div>

    </div>
  );
}
