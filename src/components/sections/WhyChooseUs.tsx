import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ShieldCheck, MapPin, Home } from 'lucide-react'; // Using relevant icons

const features = [
  {
    icon: CheckCircle,
    title: 'Verified Properties',
    description: 'Every property is carefully checked to ensure quality and accuracy.',
    color: 'text-primary' // Use primary color for icons
  },
  {
    icon: ShieldCheck,
    title: 'Secure Booking',
    description: 'Your payments and personal information are protected with top-tier security.',
     color: 'text-primary' // Use primary color for icons
  },
  {
    icon: Home, // Changed icon
    title: 'Wide Selection', // Updated title
    description: 'Access a diverse range of properties from apartments to villas.',
     color: 'text-primary' // Use primary color for icons
  },
];

export function WhyChooseUs() {
  return (
    <section className="py-20 bg-secondary rounded-lg shadow-inner"> {/* Use secondary background */}
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-foreground">Why Choose OwnsBroker?</h2> {/* Use main foreground color */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
             // Add subtle animation delay for each card
            <div key={index} className={`animate-in fade-in duration-500 delay-${index * 150} slide-in-from-bottom-5`}>
                <Card className="text-center bg-card shadow-lg transition-transform duration-300 hover:-translate-y-2 h-full flex flex-col border border-border/30 rounded-xl"> {/* Use card bg, subtle border, rounded-xl */}
                <CardHeader className="pb-4 pt-8"> {/* Adjusted padding */}
                    {/* Icon uses primary color */}
                    <div className="mx-auto mb-5 flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 shadow-md"> {/* Lighter primary bg for icon */}
                    <feature.icon className={`h-8 w-8 ${feature.color}`} /> {/* Use primary color */}
                    </div>
                    <CardTitle className="text-xl font-semibold text-card-foreground">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow px-6 pb-8"> {/* Allow content to grow, added padding */}
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
                </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
