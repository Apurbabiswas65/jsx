
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    // Simulate API call to send reset link
    console.log('Sending password reset link to:', email);
    await new Promise(resolve => setTimeout(resolve, 1500));
    // TODO: Replace with actual API call
    const success = email.includes('@'); // Mock success/failure

    setIsLoading(false);

    if (success) {
      toast({
        title: 'Password Reset Email Sent',
        description: 'If an account exists for this email, you will receive instructions to reset your password shortly.',
      });
      setEmail(''); // Clear email field
    } else {
      toast({
        title: 'Error Sending Email',
        description: 'Could not send password reset email. Please check the address and try again.',
        variant: 'destructive',
      });
    }
  };

  return (
     <div className="container mx-auto px-4 py-8"> {/* Added container classes */}
        <div className="flex justify-center items-center min-h-[calc(100vh-200px)] py-12">
        <Card className="w-full max-w-md shadow-lg border-border">
            <CardHeader className="text-center">
            <CardTitle className="text-2xl text-secondary-foreground">Forgot Password</CardTitle>
            <CardDescription className="text-muted-foreground">Enter your email to receive a password reset link.</CardDescription>
            </CardHeader>
            <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                <Label htmlFor="email-forgot" className="text-secondary-foreground">Email</Label>
                <Input
                    id="email-forgot"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-background border-input focus:ring-primary"
                />
                </div>
                <Button type="submit" className="w-full" variant="default" disabled={isLoading}>
                {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Mail className="mr-2 h-4 w-4" />
                )}
                {isLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>
            </form>
            </CardContent>
            <CardFooter className="text-center text-sm">
            <p className="text-muted-foreground w-full">
                Remember your password?{' '}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                Login here
                </Link>
            </p>
            </CardFooter>
        </Card>
        </div>
    </div>
  );
}
