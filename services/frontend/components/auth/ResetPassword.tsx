"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from "lucide-react";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link. Please request a new one.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Failed to reset password");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      setError("Cannot connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-sm shadow-2xl">
        <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#429ABD20' }}>
            <CheckCircle className="w-8 h-8" style={{ color: '#429ABD' }} />
          </div>
          <h2 className="text-xl font-bold text-center" style={{ color: '#429ABD' }}>Password Reset!</h2>
          <p className="text-sm text-muted-foreground text-center">
            Your password has been reset successfully.
          </p>
          <p className="text-xs text-muted-foreground text-center">
            Redirecting to login in 3 seconds...
          </p>
          <Button
            className="w-full mt-2"
            style={{ backgroundColor: '#429ABD' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5A623'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#429ABD'}
            onClick={() => router.push("/login")}
          >
            Go to Login
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!token) {
    return (
      <Card className="w-full max-w-sm shadow-2xl">
        <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-destructive/10">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-center text-destructive">Invalid Link</h2>
          <p className="text-sm text-muted-foreground text-center">
            This reset link is invalid or has expired.
          </p>
          <Button
            className="w-full mt-2"
            style={{ backgroundColor: '#429ABD' }}
            onClick={() => router.push("/forgot-password")}
          >
            Request New Link
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm shadow-2xl">
      <CardHeader>
        <CardTitle className="text-center text-2xl" style={{ color: '#429ABD' }}>Reset Password</CardTitle>
        <CardDescription className="text-center">
          Enter your new password below
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
            <label className="text-sm font-medium" style={{ color: '#429ABD' }}>New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#429ABD' }} />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 focus-visible:ring-[#429ABD] focus-visible:border-[#429ABD]"
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2">
                {showPassword
                  ? <EyeOff className="h-4 w-4" style={{ color: '#429ABD' }} />
                  : <Eye className="h-4 w-4" style={{ color: '#429ABD' }} />
                }
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: '#429ABD' }}>Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#429ABD' }} />
              <Input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 pr-10 focus-visible:ring-[#429ABD] focus-visible:border-[#429ABD]"
                required
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2">
                {showConfirm
                  ? <EyeOff className="h-4 w-4" style={{ color: '#429ABD' }} />
                  : <Eye className="h-4 w-4" style={{ color: '#429ABD' }} />
                }
              </button>
            </div>
            {password && confirmPassword && (
              <p className={`text-xs ${password === confirmPassword ? "text-green-500" : "text-destructive"}`}>
                {password === confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
              </p>
            )}
          </div>
          <Button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="w-full h-11"
            style={{ backgroundColor: '#429ABD' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5A623'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#429ABD'}
          >
            {loading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Resetting...</>
              : "Reset Password"
            }
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#429ABD] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}