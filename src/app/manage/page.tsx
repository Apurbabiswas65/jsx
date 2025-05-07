
// src/app/manage/page.tsx
// This page is now deprecated as functionality is in /dashboard/owner

'use client'
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';


export default function ManagePropertiesRedirect() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to the new owner dashboard
        router.replace('/dashboard/owner');
    }, [router]);

    return (
        <div className="container mx-auto px-4 py-8"> {/* Added container classes */}
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Redirecting to your Owner Dashboard...</p>
            </div>
        </div>
    );
}
