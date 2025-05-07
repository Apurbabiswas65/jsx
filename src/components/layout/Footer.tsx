import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Facebook, Twitter, Instagram } from 'lucide-react';

export function Footer() {
  return (
    // Use secondary background, main foreground for headings, muted for text
    <footer className="bg-secondary text-foreground mt-16 py-12 border-t border-border/50">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* About/Contact */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-foreground">OwnsBroker</h3>
          <p className="text-sm text-muted-foreground mb-2">
            123 Property Lane, Real Estate City, 12345
          </p>
          <p className="text-sm text-muted-foreground mb-2">
            Email: <a href="mailto:info@ownsbroker.com" className="hover:text-primary transition-colors">info@ownsbroker.com</a>
          </p>
          <p className="text-sm text-muted-foreground">
            Phone: <a href="tel:+1234567890" className="hover:text-primary transition-colors">+1 (234) 567-890</a>
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-foreground">Quick Links</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/browse" className="text-muted-foreground hover:text-primary transition-colors">Browse Properties</Link></li>
            <li><Link href="/dashboard/owner" className="text-muted-foreground hover:text-primary transition-colors">List Your Property</Link></li>
            <li><Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">About Us</Link></li>
            {/*<li><Link href="/faq" className="text-muted-foreground hover:text-primary transition-colors">FAQ</Link></li>*/}
            <li><Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link></li>
             <li><Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">Contact Us</Link></li>
          </ul>
        </div>

        {/* Newsletter */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-foreground">Newsletter</h3>
          <p className="text-sm text-muted-foreground mb-3">Stay updated with our latest properties and offers.</p>
          <form className="flex gap-2">
            <Input type="email" placeholder="Enter your email" className="bg-background border-border focus:ring-primary" />
             {/* Use default button style (primary color) */}
            <Button type="submit" size="icon" variant="default" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>

        {/* Social Media */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-foreground">Follow Us</h3>
          <div className="flex space-x-4">
            <a href="#" aria-label="Facebook" className="text-muted-foreground hover:text-primary transition-colors"><Facebook size={20} /></a>
            <a href="#" aria-label="Twitter" className="text-muted-foreground hover:text-primary transition-colors"><Twitter size={20} /></a>
            <a href="#" aria-label="Instagram" className="text-muted-foreground hover:text-primary transition-colors"><Instagram size={20} /></a>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 mt-10 pt-6 border-t border-border/50 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} OwnsBroker. All rights reserved.
      </div>
    </footer>
  );
}
