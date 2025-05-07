
// src/app/about/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from 'lucide-react';

export default function AboutUsPage() {
  return (
    <div className="container mx-auto px-4 py-8"> {/* Added container classes */}
        <div className="space-y-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-secondary-foreground text-center">About OwnBroker</h1>

        <Card className="shadow-lg">
            <CardHeader>
            <CardTitle className="text-xl text-secondary-foreground flex items-center gap-2">
                <Info className="h-5 w-5" /> Our Mission
            </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
            <p>
                OwnBroker Simplified aims to provide a seamless and trustworthy platform for finding and booking properties.
                We connect property owners with users looking for their ideal stay, whether it's for a vacation, business trip, or longer-term rental.
            </p>
            <p>
                Our focus is on simplicity, security, and reliability, ensuring a positive experience for both renters and owners.
            </p>
            </CardContent>
        </Card>

        <Card className="shadow-lg">
            <CardHeader>
            <CardTitle className="text-xl text-secondary-foreground">Our Values</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
            <ul className="list-disc list-inside space-y-2 pl-4">
                <li><strong>Trust:</strong> Building a secure platform where users feel confident transacting.</li>
                <li><strong>Simplicity:</strong> Making the process of listing, browsing, and booking straightforward.</li>
                <li><strong>Quality:</strong> Striving for high standards in property listings and user support.</li>
                <li><strong>Reliability:</strong> Ensuring the platform is stable and dependable for all users.</li>
            </ul>
            </CardContent>
        </Card>

        <Card className="shadow-lg">
            <CardHeader>
            <CardTitle className="text-xl text-secondary-foreground">Contact Us</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
            <p>
                Have questions or feedback? Reach out to us!
            </p>
            <p>Email: <a href="mailto:info@ownbroker.com" className="text-primary hover:underline">info@ownbroker.com</a></p>
            <p>Phone: <a href="tel:+1234567890" className="text-primary hover:underline">+1 (234) 567-890</a></p>
            <p>Address: 123 Property Lane, Real Estate City, 12345</p>
            </CardContent>
        </Card>
        </div>
    </div>
  );
}
