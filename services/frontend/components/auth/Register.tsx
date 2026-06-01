"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import {
  Eye,
  EyeOff,
  Lock,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  User,
  Mail,
} from "lucide-react";
import { registerViaInviteSchema, RegisterViaInviteSchemaType } from "@/schemas/loginSchema";
import { toast } from "sonner";

type Props = {
  token: string;
};

export function RegisterForm({ token }: Props) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [validating, setValidating] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    if (!token) {
      setTokenError("No invite token found.");
      setValidating(false);
      return;
    }

    fetch(`${apiUrl}/api/v1/auth/invite/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.email) {
          setInvitedEmail(data.email);
        } else {
          setTokenError(data?.detail || "Invalid or expired invite link.");
        }
      })
      .catch(() => setTokenError("Failed to validate invite link."))
      .finally(() => setValidating(false));
  }, [token]);

  const form = useForm<RegisterViaInviteSchemaType>({
    resolver: zodResolver(registerViaInviteSchema),
    defaultValues: {
      full_name: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = async (values: RegisterViaInviteSchemaType) => {
    setIsLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/v1/auth/register-via-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          full_name: values.full_name,
          password: values.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (typeof errorData.detail === "string") {
          toast.error(errorData.detail);
        } else {
          toast.error("Registration failed. Please try again.");
        }
        return;
      }

      toast.success("Account created successfully!");
      router.replace("/login");
    } catch {
      toast.error("Cannot connect to server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (validating) {
    return (
      <Card className="w-full max-w-md shadow-2xl m-2">
        <CardContent className="pt-10 pb-10 flex flex-col items-center gap-4">
          <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-64 rounded bg-muted animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (tokenError) {
    return (
      <Card className="w-full max-w-md shadow-2xl m-2">
        <CardContent className="pt-10 pb-10 flex flex-col items-center gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-center text-lg font-semibold text-destructive">
            Invalid Invite Link
          </p>
          <p className="text-center text-sm text-muted-foreground">{tokenError}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-2xl m-2">
      <CardHeader>
        <CardTitle className="text-center text-2xl" style={{ color: "#429ABD" }}>
          Create Account
        </CardTitle>
        <CardDescription className="text-center">
          You have been invited to join VASPP HR Management System.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="mb-4">
          <div className="flex items-center gap-2 rounded-lg border border-[#429ABD]/30 bg-[#429ABD]/5 px-3 py-2">
            <Mail className="h-4 w-4 shrink-0" style={{ color: "#429ABD" }} />
            <span className="text-sm text-muted-foreground">
              Registering as{" "}
              <span className="font-medium" style={{ color: "#429ABD" }}>
                {invitedEmail}
              </span>
            </span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel style={{ color: "#429ABD" }}>Full Name</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User
                        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                        style={{ color: "#429ABD" }}
                      />
                      <Input
                        placeholder="Enter your full name"
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
                  <FormLabel style={{ color: "#429ABD" }}>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock
                        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                        style={{ color: "#429ABD" }}
                      />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Create password"
                        className="pl-10 pr-10 focus-visible:ring-[#429ABD] focus-visible:border-[#429ABD]"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" style={{ color: "#429ABD" }} />
                        ) : (
                          <Eye className="h-4 w-4" style={{ color: "#429ABD" }} />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel style={{ color: "#429ABD" }}>Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock
                        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                        style={{ color: "#429ABD" }}
                      />
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm password"
                        className="pl-10 pr-10 focus-visible:ring-[#429ABD] focus-visible:border-[#429ABD]"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" style={{ color: "#429ABD" }} />
                        ) : (
                          <Eye className="h-4 w-4" style={{ color: "#429ABD" }} />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />

                  {field.value && form.watch("password") && (
                    <div className="flex items-center gap-2 text-xs">
                      {form.watch("password") === field.value ? (
                        <>
                          <CheckCircle className="h-3 w-3" style={{ color: "#429ABD" }} />
                          <span style={{ color: "#429ABD" }}>Passwords match</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3 text-destructive" />
                          <span className="text-destructive">Passwords do not match</span>
                        </>
                      )}
                    </div>
                  )}
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
              style={{ backgroundColor: "#429ABD" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#F5A623")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#429ABD")
              }
            >
              {isLoading ? "Creating..." : "Create Account"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}