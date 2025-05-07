'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, DollarSign, Building2, Search } from 'lucide-react';

export function SearchBar() {
  const [location, setLocation] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [propertyType, setPropertyType] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search logic (e.g., navigate to browse page with query params)
    console.log('Searching for:', { location, priceRange, propertyType });
    // Example: router.push(`/browse?location=${location}&price=${priceRange}&type=${propertyType}`);
  };

  return (
    <div className="container mx-auto px-4 -mt-12 relative z-30"> {/* Negative margin to overlap hero slightly */}
      <form
        onSubmit={handleSearch}
        className="bg-card p-4 sm:p-6 rounded-lg shadow-xl border border-border/50 flex flex-col md:flex-row items-center gap-3 md:gap-4"
      >
        {/* Location Input */}
        <div className="relative w-full md:w-1/3 flex items-center">
           <MapPin className="absolute left-3 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Location (e.g., City, Area)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="pl-10 pr-3 h-12 text-base bg-background border-input"
          />
        </div>

        {/* Price Range Select */}
        <div className="relative w-full md:w-1/4 flex items-center">
          <DollarSign className="absolute left-3 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
          <Select value={priceRange} onValueChange={setPriceRange}>
            <SelectTrigger className="pl-10 pr-3 h-12 text-base bg-background border-input text-muted-foreground data-[placeholder]:text-muted-foreground">
              <SelectValue placeholder="Price Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0-1000">₹0 - ₹1,000</SelectItem>
              <SelectItem value="1000-2500">₹1,000 - ₹2,500</SelectItem>
              <SelectItem value="2500-5000">₹2,500 - ₹5,000</SelectItem>
              <SelectItem value="5000+">₹5,000+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Property Type Select */}
        <div className="relative w-full md:w-1/4 flex items-center">
          <Building2 className="absolute left-3 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
           <Select value={propertyType} onValueChange={setPropertyType}>
             <SelectTrigger className="pl-10 pr-3 h-12 text-base bg-background border-input text-muted-foreground data-[placeholder]:text-muted-foreground">
               <SelectValue placeholder="Property Type" />
             </SelectTrigger>
            <SelectContent>
              <SelectItem value="apartment">Apartment</SelectItem>
              <SelectItem value="house">House</SelectItem>
              <SelectItem value="villa">Villa</SelectItem>
              <SelectItem value="pg">PG</SelectItem>
               <SelectItem value="land">Land</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search Button */}
        <Button type="submit" size="lg" className="w-full md:w-auto h-12 text-base bg-primary text-primary-foreground hover:bg-primary/90">
          <Search className="mr-2 h-5 w-5" /> Search
        </Button>
      </form>
    </div>
  );
}
