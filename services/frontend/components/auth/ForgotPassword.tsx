"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Mail, Loader2, ArrowLeft, CheckCircle } from "lucide-react";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Something went wrong");
        return;
      }

      setSent(true);
    } catch (err) {
      setError("Cannot connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Card className="w-full max-w-sm shadow-2xl">
        <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#429ABD20' }}>
            <CheckCircle className="w-8 h-8" style={{ color: '#429ABD' }} />
          </div>
          <h2 className="text-xl font-bold text-center" style={{ color: '#429ABD' }}>Check your email</h2>
          <p className="text-sm text-muted-foreground text-center">
            If <strong>{email}</strong> is registered, you will receive a password reset link shortly.
          </p>
          <p className="text-xs text-muted-foreground text-center">
            The link expires in 30 minutes.
          </p>
          <Button
            className="w-full mt-2"
            style={{ backgroundColor: '#429ABD' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5A623'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#429ABD'}
            onClick={() => router.push("/login")}
          >
            Back to Login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm shadow-2xl">
      <CardHeader>
        <CardTitle className="text-center text-2xl" style={{ color: '#429ABD' }}>Forgot Password</CardTitle>
        <CardDescription className="text-center">
          Enter your email and we will send you a reset link
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: '#429ABD' }}>Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#429ABD' }} />
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 focus-visible:ring-[#429ABD] focus-visible:border-[#429ABD]"
                required
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading || !email}
            className="w-full h-11"
            style={{ backgroundColor: '#429ABD' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5A623'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#429ABD'}
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
            ) : (
              "Send Reset Link"
            )}
          </Button>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full text-sm flex items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Login
          </button>
        </form>
      </CardContent>
    </Card>
  );
}