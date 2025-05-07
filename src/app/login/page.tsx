
'use client';

import { useEffect, useState, useActionState } from 'react'; // Import useEffect, useState, useActionState from React
import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { loginUser, type LoginFormState } from '@/actions/authActions';

// Submit Button using useFormStatus
function LoginSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" variant="default" disabled={pending}>
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <LogIn className="mr-2 h-4 w-4" />
      )}
      {pending ? 'Logging in...' : 'Login'}
    </Button>
  );
}

export default function LoginPage() {
  const initialState: LoginFormState = { message: '', success: false };
  // Ensure correct usage of useActionState
  const [state, formAction] = useActionState(loginUser, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    console.log("[Login Page useEffect] State changed:", JSON.stringify(state, null, 2)); // Log state change DETAILED

    // Only proceed if a message exists (indicates action completion)
    if (state.message) {
        console.log(`[Login Page useEffect] Action completed with message: "${state.message}", Success: ${state.success}`);
        if (state.success) {
            console.log("[Login Page useEffect] Login SUCCESS branch.");
            toast({
                title: 'Login Successful',
                description: state.message,
            });

            // --- Simulate saving session info (UID) ---
            if (state.uid) {
                try {
                    localStorage.setItem('simulated_user_uid', state.uid);
                    console.log("[Login Page useEffect] Simulated session: UID saved to localStorage:", state.uid);

                    // Redirect on success
                    if (state.redirectTo) {
                        console.log("[Login Page useEffect] Success: Redirecting to:", state.redirectTo);
                        router.push(state.redirectTo);
                        // Optionally force reload if state doesn't update navbar reliably
                        // setTimeout(() => window.location.reload(), 50);
                    } else {
                        console.warn("[Login Page useEffect] Success but no redirect path provided, defaulting to /dashboard/user");
                        router.push('/dashboard/user'); // Fallback redirect
                    }

                } catch (e) {
                    console.error("[Login Page useEffect] Error saving simulated UID to localStorage:", e);
                    toast({
                        title: 'Session Error',
                        description: 'Could not save session information locally.',
                        variant: 'destructive',
                    });
                }
            } else {
                 console.error("[Login Page useEffect] Login success but no UID returned from action.");
                 toast({
                    title: 'Login Error',
                    description: 'User ID missing after successful login. Cannot proceed.',
                    variant: 'destructive',
                 });
            }
            // --- End Simulation ---

        } else {
            console.log("[Login Page useEffect] Login FAILED branch.");
            // Determine the error detail more specifically
            let errorDetail = state.message; // Default to message

            // Check for specific error types based on message content
            if (state.message?.includes('Database schema error')) {
                errorDetail = 'Database schema error. Please contact support or reset the database.'; // Specific user-friendly message
                console.error("[Login Page useEffect] Database Schema Error Detected.");
            } else if (state.errors && state.errors.length > 0) {
                // Format Zod errors if they exist and it's not a schema error
                errorDetail = state.errors.map(e => `${e.path.join('.') || 'Form'}: ${e.message}`).join('; ');
                console.error("[Login Page useEffect] Validation Errors present:", state.errors);
            } else {
                 // Log generic failure message if not schema or validation error
                 console.error("[Login Page useEffect] No specific Zod errors, using state message:", state.message);
            }

            console.error("[Login Page useEffect] Login Failed Reason:", errorDetail); // Log the determined error detail
            toast({
                title: 'Login Failed',
                description: errorDetail || "An unknown error occurred.", // Provide fallback
                variant: 'destructive',
            });
        }
    } else {
         console.log("[Login Page useEffect] State changed, but no message present (likely initial state or intermediate render).");
    }
  }, [state, toast, router]); // Dependencies


  return (
     <div className="container mx-auto px-4 py-8"> {/* Added container classes */}
        <div className="flex justify-center items-center min-h-[calc(100vh-200px)] py-12">
        <Card className="w-full max-w-md shadow-lg border-border">
            <CardHeader className="text-center">
            <CardTitle className="text-2xl text-secondary-foreground">Login</CardTitle>
            <CardDescription className="text-muted-foreground">Access your OwnBroker account</CardDescription>
            </CardHeader>
            <CardContent>
            <form action={formAction} className="space-y-6">

                {/* Email Input */}
                <div className="space-y-2">
                <Label htmlFor="email-login" className="text-secondary-foreground">Email</Label>
                <Input
                    id="email-login"
                    name="email" // Add name attribute
                    type="email"
                    placeholder="you@example.com"
                    required
                    className="bg-background border-input focus:ring-primary"
                     // defaultValue="user@ownbroker.com" // Optional: Pre-fill for testing
                     defaultValue="admin@ownbroker.com" // Optional: Pre-fill for testing
                     // defaultValue="owner@ownbroker.com" // Optional: Pre-fill for testing
                />
                {state.errors?.filter(e => e.path.includes('email')).map(e => (
                    <p key={e.message} className="text-sm text-destructive mt-1">{e.message}</p>
                ))}
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                <Label htmlFor="password-login">Password</Label>
                <div className="relative">
                    <Input
                    id="password-login"
                    name="password" // Add name attribute
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    required
                    className="bg-background border-input focus:ring-primary pr-10" // Add padding for icon
                     // defaultValue="User@123" // Optional: Pre-fill for testing
                     defaultValue="Admin@123" // Optional: Pre-fill for testing
                     // defaultValue="Owner@123" // Optional: Pre-fill for testing
                    />
                    <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                </div>
                {state.errors?.filter(e => e.path.includes('password')).map(e => (
                    <p key={e.message} className="text-sm text-destructive mt-1">{e.message}</p>
                ))}
                </div>

                {/* Forgot Password */}
                <div className="flex items-center justify-end">
                <div className="text-sm">
                    <Link href="/forgot-password" className="text-muted-foreground hover:text-primary underline">
                    Forgot password?
                    </Link>
                </div>
                </div>

                {/* Submit Button */}
                <LoginSubmitButton />
            </form>
            </CardContent>
            <CardFooter className="text-center text-sm">
            <p className="text-muted-foreground w-full">
                Don't have an account?{' '}
                <Link href="/register" className="font-semibold text-primary hover:underline">
                Register here
                </Link>
            </p>
            </CardFooter>
        </Card>
        </div>
    </div>
  );
}

