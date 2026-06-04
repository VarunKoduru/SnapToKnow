import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2, Mail, Lock } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function Login() {
  const { signInWithGoogle, signInWithEmail } = useAuth();
  const [, setLocation] = useLocation();
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleGoogleLogin = async () => {
    try {
      setLoadingGoogle(true);
      setError(null);
      await signInWithGoogle();
      setLocation("/");
    } catch (err: any) {
      console.error(err);
      setError("Failed to sign in with Google.");
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setError("Please fill in both fields");
    try {
      setLoadingEmail(true);
      setError(null);
      await signInWithEmail(email, password);
      setLocation("/");
    } catch (err: any) {
      console.error(err);
      setError("Failed to sign in. Please check your credentials.");
    } finally {
      setLoadingEmail(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background md:bg-muted/30">
      <div className="w-full max-w-md p-4">
        <Card className="border-0 md:border shadow-sm">
          <CardHeader className="space-y-3 pb-6 text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <span className="text-3xl">🥗</span>
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-balance text-muted-foreground/80">
              Sign in to your Snap to Know account to continue tracking your meals.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loadingEmail || loadingGoogle}>
                {loadingEmail && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Sign In
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              className="w-full relative overflow-hidden transition-all hover:scale-[1.02]"
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={loadingGoogle || loadingEmail}
            >
              {loadingGoogle ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  <path d="M1 1h22v22H1z" fill="none" />
                </svg>
              )}
              Google
            </Button>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Don't have an account?{" "}
              <Link href="/signup" className="text-primary font-medium hover:underline">
                Sign up here
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

