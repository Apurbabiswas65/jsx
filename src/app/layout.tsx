import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Using Inter font
import './globals.css';
import { Footer } from '@/components/layout/Footer';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import NavbarWrapper from '@/components/layout/NavbarWrapper'; // Import the client component wrapper

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter', // Define variable for Inter font
});

export const metadata: Metadata = {
  title: 'OwnsBroker Simplified', // Updated Title
  description: 'Find, book, or list your property with ease.', // Updated Description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={cn(
        `${inter.variable} font-sans antialiased`, // Use Inter font variable
        'flex flex-col min-h-full overflow-x-hidden bg-background' // Use theme background color
      )}>
        <NavbarWrapper /> {/* Use the client component wrapper */}
        {/* Remove container classes to allow full-width sections */}
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}
