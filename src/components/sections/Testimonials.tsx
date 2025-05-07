
'use client'; // Required for Carousel interaction

import React from 'react'; // Ensure React is imported
import Autoplay from "embla-carousel-autoplay"; // Ensure correct import path
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from 'lucide-react'; // For ratings

const testimonials = [
  {
    name: "Alice Johnson",
    role: "Frequent Traveler",
    quote: "Booking through OwnsBroker was seamless! The property exceeded my expectations, and the host was fantastic. Highly recommend!",
    avatar: "https://picsum.photos/seed/avatar1/100/100",
    rating: 5,
  },
  {
    name: "Bob Smith",
    role: "Family Vacationer",
    quote: "Found the perfect villa for our family getaway. The process was simple, secure, and the support team was helpful. We'll be back!",
    avatar: "https://picsum.photos/seed/avatar2/100/100",
    rating: 5,
  },
  {
    name: "Charlie Davis",
    role: "Business Renter",
    quote: "Needed a place for a short business trip. OwnsBroker had great options, easy booking, and clear communication. Very professional.",
    avatar: "https://picsum.photos/seed/avatar3/100/100",
    rating: 4,
  },
   {
    name: "Diana Miller",
    role: "Property Owner",
    quote: "Listing my property was easy, and I started getting bookings quickly. The platform is user-friendly and manages everything efficiently.",
    avatar: "https://picsum.photos/seed/avatar4/100/100",
    rating: 5,
  },
  {
    name: "Ethan Hunt",
    role: "Adventure Seeker",
    quote: "Used OwnsBroker to find a remote cabin. The platform made it easy to find exactly what I needed for my trip.",
    avatar: "https://picsum.photos/seed/avatar5/100/100",
    rating: 5,
  },
];

export function Testimonials() {
    // Define the plugin ref *inside* the component body
    const plugin = React.useRef(
        Autoplay({ delay: 5000, stopOnInteraction: true })
    );

    // Ensure the component returns JSX correctly
    return (
        <section className="py-20 bg-secondary rounded-lg"> {/* Use secondary background */}
            <div className="container mx-auto px-4">
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-foreground">
                    What Our Users Say
                </h2>
                <Carousel
                    plugins={[plugin.current]} // Pass the current value of the ref
                    className="w-full max-w-5xl mx-auto"
                    onMouseEnter={plugin.current.stop}
                    onMouseLeave={plugin.current.reset}
                    opts={{
                        align: "start",
                        loop: true,
                    }}
                >
                    <CarouselContent className="-ml-4">
                        {testimonials.map((testimonial, index) => (
                            <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3">
                                <div className="p-1 h-full">
                                    <Card className="flex flex-col h-full justify-between shadow-lg bg-card border border-border/50 rounded-xl transition-all duration-300 hover:shadow-xl hover:border-accent/50"> {/* Use card bg, subtle border, rounded-xl */}
                                        <CardContent className="flex flex-col items-center p-6 text-center flex-grow">
                                            <Avatar className="w-20 h-20 mb-5 border-2 border-primary/20">
                                                <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                                                <AvatarFallback>{testimonial.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex justify-center mb-3">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    // Use primary color for stars
                                                    <Star key={i} className={`h-5 w-5 ${i < testimonial.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`} />
                                                ))}
                                            </div>
                                            <p className="text-muted-foreground italic mb-5 text-base">
                                                &quot;{testimonial.quote}&quot;
                                            </p>
                                            <p className="font-semibold text-lg text-card-foreground">{testimonial.name}</p>
                                            <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious className="absolute left-[-20px] sm:left-[-50px] top-1/2 -translate-y-1/2 text-foreground bg-background/80 hover:bg-background shadow-md border border-border/50" />
                    <CarouselNext className="absolute right-[-20px] sm:right-[-50px] top-1/2 -translate-y-1/2 text-foreground bg-background/80 hover:bg-background shadow-md border border-border/50" />
                </Carousel>
            </div>
        </section>
    ); // Closing parenthesis for the return statement
}
