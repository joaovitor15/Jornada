'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AuthError,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function AuthPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    router.replace('/dashboard');
    return null;
  }

  const handleAuthError = (err: AuthError) => {
    console.error(err);
    switch (err.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Invalid email or password.';
      case 'auth/email-already-in-use':
        return 'This email is already in use.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (err) {
      const errorMessage = handleAuthError(err as AuthError);
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Sign Up Failed',
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (err) {
      const errorMessage = handleAuthError(err as AuthError);
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const AuthForm = ({
    isSignUp = false,
  }: {
    isSignUp?: boolean;
  }) => (
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={isSignUp ? 'signup-email' : 'login-email'}>Email</Label>
        <Input
          id={isSignUp ? 'signup-email' : 'login-email'}
          type="email"
          placeholder="m@example.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={isSignUp ? 'signup-password' : 'login-password'}>Password</Label>
        <Input
          id={isSignUp ? 'signup-password' : 'login-password'}
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
      </div>
    </CardContent>
  );

  return (
    <div className="w-full max-w-md">
      <Tabs defaultValue="login" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>Welcome Back</CardTitle>
              <CardDescription>
                Log in to your account to continue your journey.
              </CardDescription>
            </CardHeader>
            <AuthForm />
            <CardFooter>
              <Button onClick={handleLogin} className="w-full" disabled={loading} style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Login
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle>Start Your Journey</CardTitle>
              <CardDescription>
                Create an account to start tracking your expenses.
              </CardDescription>
            </CardHeader>
            <AuthForm isSignUp />
            <CardFooter>
              <Button onClick={handleSignUp} className="w-full" disabled={loading} style={{ backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' }}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sign Up
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
