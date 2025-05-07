'use client';

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

// Mock blog data (replace with actual data fetch)
const blogPosts = [
  {
    id: '1',
    title: '5 Tips for Choosing the Perfect Rental Property',
    excerpt: 'Navigating the rental market can be tricky. Here are five key tips to help you find the ideal home...',
    imageUrl: 'https://picsum.photos/seed/blog1/400/300',
    slug: '/blog/choosing-rental', // Example slug
    date: 'Oct 26, 2024',
    category: 'Renting Tips',
  },
  {
    id: '2',
    title: 'Maximizing Your Rental Income as an Owner',
    excerpt: 'Learn strategies to optimize your property listing, pricing, and management to boost your rental income...',
    imageUrl: 'https://picsum.photos/seed/blog2/400/300',
    slug: '/blog/maximizing-income',
    date: 'Oct 24, 2024',
    category: 'Owner Advice',
  },
  {
    id: '3',
    title: 'Understanding Local Real Estate Trends',
    excerpt: 'Stay informed about the latest market trends in your area to make smarter buying, selling, or renting decisions...',
    imageUrl: 'https://picsum.photos/seed/blog3/400/300',
    slug: '/blog/local-trends',
    date: 'Oct 20, 2024',
    category: 'Market Insights',
  },
];

export function BlogPreview() {
  return (
    <section className="py-20 bg-background"> {/* Use main background */}
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center md:text-left text-foreground">
            Insights & Tips
          </h2>
          <Link href="/blog" passHref>
            <Button variant="outline" size="lg" className="shadow-sm hover:shadow-md transition-shadow border-border text-foreground hover:bg-accent hover:text-accent-foreground">
              View All Posts <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {blogPosts.map((post) => (
            <Card key={post.id} className="overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl border border-border/50 rounded-xl flex flex-col h-full bg-card">
              <CardHeader className="p-0">
                <Image
                  src={post.imageUrl}
                  alt={post.title}
                  width={400}
                  height={300}
                  className="object-cover w-full h-48"
                  data-ai-hint="real estate blog article image"
                />
              </CardHeader>
              <CardContent className="p-6 flex-grow">
                <p className="text-xs text-primary font-semibold uppercase mb-1">{post.category}</p>
                <CardTitle className="text-xl font-semibold mb-2 text-card-foreground line-clamp-2 h-[3.5rem]">{post.title}</CardTitle>
                <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
              </CardContent>
              <CardFooter className="p-6 pt-0 flex justify-between items-center text-xs text-muted-foreground border-t border-border/30 mt-auto">
                 <span>{post.date}</span>
                 <Link href={post.slug} className="text-primary hover:underline font-medium">
                     Read More <ArrowRight className="inline h-3 w-3"/>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
