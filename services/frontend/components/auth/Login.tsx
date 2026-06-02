"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Eye, EyeOff, Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { LoginSchemaType, loginSchema } from "@/schemas/loginSchema";
import { getApiUrl } from "@/lib/api-config";
import { useUser } from "@/app/contexts/UserContext";

export function LoginForm() {
  const router = useRouter();
  const { setUser } = useUser();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginSchemaType>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: LoginSchemaType) => {
    setError(null);

    try {
      const formData = new URLSearchParams();
      formData.append("username", values.email);
      formData.append("password", values.password);

      const apiUrl = getApiUrl();
      const loginUrl = apiUrl ? `${apiUrl}/api/v1/auth/login` : '/api/v1/auth/login';

      const res = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Invalid email or password");
        return;
      }

      localStorage.setItem("access_token", data.access_token);
      if (data.refresh_token) {
        localStorage.setItem("refresh_token", data.refresh_token);
      }
      const expiresAt = Date.now() + 25 * 60 * 1000;
      localStorage.setItem("token_expires_at", String(expiresAt));

      setUser({ id: "", email: values.email });
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <Card className="w-full max-w-sm shadow-2xl">
      <CardHeader>
        <CardTitle className="text-center text-2xl" style={{ color: '#429ABD' }}>Welcome Back</CardTitle>
        <CardDescription className="text-center">
          Sign in to continue
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
                {error}
              </div>
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel style={{ color: '#429ABD' }}>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#429ABD' }} />
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        className="pl-10 focus-visible:ring-[#429ABD] focus-visible:border-[#429ABD]"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel style={{ color: '#429ABD' }}>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#429ABD' }} />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        className="pl-10 pr-10 focus-visible:ring-[#429ABD] focus-visible:border-[#429ABD]"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" style={{ color: '#429ABD' }} />
                        ) : (
                          <Eye className="h-4 w-4" style={{ color: '#429ABD' }} />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11"
              style={{ backgroundColor: '#429ABD' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F5A623'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#429ABD'}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </Form>

        <div className="mt-4 text-center text-sm">
          <span
            onClick={() => router.push("/forgot-password")}
            className="cursor-pointer font-medium"
            style={{ color: '#429ABD' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#F5A623'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#429ABD'}
          >
            Forgot Password?
          </span>
        </div>
      </CardContent>
    </Card>
  );
}