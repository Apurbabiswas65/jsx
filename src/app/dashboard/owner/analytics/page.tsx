// src/app/dashboard/owner/analytics/page.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { BarChart as RechartsBarChart, Bar, CartesianGrid, XAxis, YAxis } from "recharts";
import { BarChart, CalendarDays, TrendingUp } from 'lucide-react'; // Icons for sections

// Mock Revenue Data
const mockRevenueData = [
  { month: "Jan", revenue: Math.floor(Math.random() * 5000) + 1000 },
  { month: "Feb", revenue: Math.floor(Math.random() * 5000) + 1000 },
  { month: "Mar", revenue: Math.floor(Math.random() * 5000) + 1000 },
  { month: "Apr", revenue: Math.floor(Math.random() * 5000) + 1000 },
  { month: "May", revenue: Math.floor(Math.random() * 5000) + 1000 },
  { month: "Jun", revenue: Math.floor(Math.random() * 5000) + 1000 },
  { month: "Jul", revenue: Math.floor(Math.random() * 5000) + 1000 },
  { month: "Aug", revenue: Math.floor(Math.random() * 5000) + 1000 },
];

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--primary))", // Use theme's primary color (Teal)
  },
} satisfies ChartConfig;

export default function OwnerAnalyticsPage() {
  // TODO: Fetch actual analytics data from the backend

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-secondary-foreground">Property Analytics</h1>
      <p className="text-muted-foreground">View performance metrics for your listings.</p>

       {/* Revenue Overview Section */}
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-xl text-secondary-foreground flex items-center gap-2">
                    <BarChart className="h-5 w-5"/> Revenue Overview
                </CardTitle>
                <CardDescription>Monthly booking revenue summary.</CardDescription>
            </CardHeader>
            <CardContent>
                 <ChartContainer config={chartConfig} className="h-[300px] w-full"> {/* Increased height */}
                    <RechartsBarChart accessibilityLayer data={mockRevenueData}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                            dataKey="month"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tickFormatter={(value) => value.slice(0, 3)}
                            className="text-xs text-muted-foreground"
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `$${value/1000}k`}
                            className="text-xs text-muted-foreground"
                         />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel className="bg-background shadow-lg rounded-md border" />}
                         />
                        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                    </RechartsBarChart>
                </ChartContainer>
                {/* TODO: Add date filters and download button later */}
                 <div className="text-center text-muted-foreground pt-4 text-sm">
                    Displaying revenue for the last 8 months. More filtering options coming soon.
                </div>
            </CardContent>
        </Card>

        {/* Other Analytics Placeholders */}
         <div className="grid md:grid-cols-2 gap-6">
             <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-lg text-secondary-foreground flex items-center gap-2">
                        <TrendingUp className="h-5 w-5"/> Booking Trends
                    </CardTitle>
                     <CardDescription>Analyze booking patterns over time.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">Booking trend charts and property occupancy rates coming soon.</p>
                     {/* Placeholder for line chart or other visualizations */}
                     <div className="aspect-video bg-muted rounded-md flex items-center justify-center text-muted-foreground border border-dashed border-border mt-4">
                        Chart Placeholder
                    </div>
                </CardContent>
            </Card>
             <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-lg text-secondary-foreground flex items-center gap-2">
                        <CalendarDays className="h-5 w-5"/> Occupancy Calendar
                    </CardTitle>
                    <CardDescription>Visualize booked dates across your properties.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">A combined calendar view for all property bookings is planned.</p>
                    {/* Placeholder for calendar component */}
                     <div className="aspect-video bg-muted rounded-md flex items-center justify-center text-muted-foreground border border-dashed border-border mt-4">
                        Calendar Placeholder
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
