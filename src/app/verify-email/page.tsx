
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, MailCheck } from 'lucide-react';

export default function VerifyEmailPage() {
    const { user, loading, refreshData } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isSending, setIsSending] = useState(false);

    // This effect sets up polling to check for verification status changes
    useEffect(() => {
        if (loading || !user || user.emailVerified) {
            return;
        }

        const interval = setInterval(async () => {
            if (auth.currentUser) {
                await auth.currentUser.reload();
                if (auth.currentUser.emailVerified) {
                    clearInterval(interval);
                    await refreshData(); // Ensure profile data is fresh upon redirect
                    toast({ title: "Email Verified!", description: "Welcome! Redirecting you now..." });
                    router.push('/');
                }
            }
        }, 3000); // Check every 3 seconds

        return () => clearInterval(interval); // Cleanup on unmount
    }, [user, loading, router, toast, refreshData]);

    // This effect handles cases where the user is ALREADY verified when they land here
    useEffect(() => {
        if (!loading && user?.emailVerified) {
            router.push('/');
        }
    }, [user, loading, router]);


    const handleResendVerification = async () => {
        if (!user) return;
        setIsSending(true);
        try {
            await sendEmailVerification(user);
            toast({ title: "Verification Email Sent", description: "Please check your inbox." });
        } catch (error: any) {
            toast({ title: "Error", description: "Failed to send verification email. Please try again later.", variant: "destructive" });
        } finally {
            setIsSending(false);
        }
    };

    const handleLogout = async () => {
        if (auth) {
            await signOut(auth);
            router.push('/login');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!user) {
        // This case is unlikely if redirection is set up correctly, but good for robustness
        useEffect(() => {
            router.push('/login');
        }, [router]);
        return (
             <div className="flex justify-center items-center h-full min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // Render this only if the user is unverified. Verified users are redirected by the effects above.
    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
            <Card className="w-full max-w-md text-center">
                <CardHeader className="items-center">
                    <MailCheck className="w-12 h-12 text-primary mb-4" />
                    <CardTitle>Verify Your Email</CardTitle>
                    <CardDescription>
                        A verification link has been sent to <br />
                        <span className="font-semibold text-foreground">{user.email}</span>.
                        <br />
                        Please check your inbox (and spam folder) to continue.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Haven't received it?
                    </p>
                    <Button onClick={handleResendVerification} disabled={isSending} className="w-full">
                        {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isSending ? 'Sending...' : 'Resend Verification Email'}
                    </Button>
                </CardContent>
                <CardFooter className="flex-col gap-4">
                    <p className="text-xs text-muted-foreground">
                       This page will refresh automatically once you've verified.
                    </p>
                    <Button variant="link" onClick={handleLogout}>
                        Log out
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
