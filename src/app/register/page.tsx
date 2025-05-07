
'use client';

import { useEffect, useActionState } from 'react'; // Import useEffect, useState, useActionState from React
import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { registerUser, type RegisterFormState } from '@/actions/authActions';

// Submit Button using useFormStatus
function RegisterSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" variant="default" disabled={pending}>
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <UserPlus className="mr-2 h-4 w-4" />
      )}
      {pending ? 'Registering...' : 'Create Account'}
    </Button>
  );
}

export default function RegisterPage() {
  const initialState: RegisterFormState = { message: '', success: false };
  // Correct usage of useActionState
  const [state, formAction] = useActionState(registerUser, initialState);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast({
          title: 'Registration Successful',
          description: state.message,
        });
        // Redirect to login page after a short delay
        setTimeout(() => {
          router.push('/login');
        }, 1500);
      } else {
         // Display specific errors if available
        const errorDetail = state.errors ? state.errors.map(e => e.message).join(', ') : state.message;
        toast({
          title: 'Registration Failed',
          description: errorDetail,
          variant: 'destructive',
        });
      }
    }
  }, [state, toast, router]);

  return (
    <div className="container mx-auto px-4 py-8"> {/* Added container classes */}
        <div className="flex justify-center items-center min-h-[calc(100vh-200px)] py-12">
        <Card className="w-full max-w-lg shadow-lg border-border">
            <CardHeader className="text-center">
            <CardTitle className="text-2xl text-secondary-foreground">Register</CardTitle>
            <CardDescription className="text-muted-foreground">Create your OwnBroker account</CardDescription>
            </CardHeader>
            <CardContent>
            <form action={formAction} className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name-reg" className="text-secondary-foreground">Full Name</Label>
                    <Input
                    id="name-reg"
                    name="name" // Add name attribute
                    type="text"
                    placeholder="John Doe"
                    required
                    className="bg-background border-input focus:ring-primary"
                    />
                    {state.errors?.filter(e => e.path.includes('name')).map(e => (
                        <p key={e.message} className="text-sm text-destructive mt-1">{e.message}</p>
                    ))}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email-reg" className="text-secondary-foreground">Email Address</Label>
                    <Input
                    id="email-reg"
                    name="email" // Add name attribute
                    type="email"
                    placeholder="you@example.com"
                    required
                    className="bg-background border-input focus:ring-primary"
                    />
                    {state.errors?.filter(e => e.path.includes('email')).map(e => (
                        <p key={e.message} className="text-sm text-destructive mt-1">{e.message}</p>
                    ))}
                </div>
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="mobile-reg" className="text-secondary-foreground">Mobile Number</Label>
                    <Input
                    id="mobile-reg"
                    name="mobile" // Add name attribute
                    type="tel"
                    placeholder="+1 123 456 7890"
                    required
                    className="bg-background border-input focus:ring-primary"
                    />
                    {state.errors?.filter(e => e.path.includes('mobile')).map(e => (
                        <p key={e.message} className="text-sm text-destructive mt-1">{e.message}</p>
                    ))}
                </div>
                </div>

                {/* Password Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="password-register" className="text-secondary-foreground">Password</Label>
                    <Input
                    id="password-register" // Unique ID
                    name="password" // Add name attribute
                    type="password"
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                    className="bg-background border-input focus:ring-primary"
                    />
                    {state.errors?.filter(e => e.path.includes('password') && !e.path.includes('confirmPassword')).map(e => (
                        <p key={e.message} className="text-sm text-destructive mt-1">{e.message}</p>
                    ))}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirmPassword-register" className="text-secondary-foreground">Confirm Password</Label>
                    <Input
                    id="confirmPassword-register" // Unique ID
                    name="confirmPassword" // Add name attribute
                    type="password"
                    placeholder="••••••••"
                    required
                    className="bg-background border-input focus:ring-primary"
                    />
                    {state.errors?.filter(e => e.path.includes('confirmPassword')).map(e => (
                        <p key={e.message} className="text-sm text-destructive mt-1">{e.message}</p>
                    ))}
                </div>
                </div>

                {/* Terms & Conditions */}
                <div className="flex items-start space-x-2 pt-2">
                <Checkbox
                    id="terms"
                    name="terms" // Add name attribute
                    className="mt-1 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground border-primary"
                    // required attribute handled by Zod schema now
                />
                <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground">
                    I accept the{' '}
                    <Link href="/terms" className="font-semibold text-primary hover:underline" target="_blank">
                    Terms & Conditions
                    </Link>
                    .
                </Label>
                {/* Ensure error message is displayed correctly if terms are not accepted */}
                    {state.errors?.filter(e => e.path.includes('termsAccepted')).map(e => (
                    <p key={e.message} className="text-sm text-destructive mt-1">{e.message}</p>
                ))}
                </div>


                {/* Submit Button */}
                <RegisterSubmitButton />
            </form>
            </CardContent>
            <CardFooter className="text-center text-sm">
            <p className="text-muted-foreground w-full">
                Already have an account?{' '}
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
