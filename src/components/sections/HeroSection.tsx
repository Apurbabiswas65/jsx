import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function HeroSection() {
  return (
    // Use min-h-screen for full viewport height, ensure overflow is hidden
    <section className="relative min-h-screen flex items-center justify-center text-center overflow-hidden shadow-lg animate-in fade-in duration-700">
      {/* Background Image */}
      <Image
        src="https://picsum.photos/seed/skyline-buildings/1920/1080" // Placeholder for skyline/buildings
        alt="Modern city skyline with contemporary buildings"
        fill
        className="object-cover z-0" // Ensure image covers the section
        quality={90}
        priority // Load image faster
        data-ai-hint="modern city skyline buildings illustration" // AI Hint for image selection
      />
      {/* Enhanced Overlay for better text contrast */}
      {/* Adjusted gradient to be darker at the bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10"></div>

      {/* Content with animation */}
      {/* Adjusted text color to white for maximum contrast */}
      <div className="relative z-20 text-white px-4 max-w-4xl animate-in fade-in-5 duration-1000 slide-in-from-bottom-10">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight tracking-tight text-white" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.7)' }}> {/* Increased shadow & applied text-white */}
          Find Your Dream place with Owns Broker
        </h1>
        <p className="text-lg md:text-xl lg:text-2xl mb-12 max-w-3xl mx-auto font-light text-white" style={{ textShadow: '1px 1px 5px rgba(0,0,0,0.6)' }}> {/* Applied text-white */}
          Discover unique properties and book your next stay with OwnsBroker. Secure, simple, and reliable platform connecting owners and renters.
        </p>
        <Link href="/browse" passHref>
           {/* Button uses primary theme color */}
          <Button size="lg" variant="default" className="text-lg px-8 py-4 shadow-lg hover:shadow-xl transition-all duration-300 group hover:scale-105 active:scale-100 bg-primary text-primary-foreground hover:bg-primary/90">
            Start Browsing
             <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Button>
        </Link>
      </div>
    </section>
  );
}
