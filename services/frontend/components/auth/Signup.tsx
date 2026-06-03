"use client";

import { useState } from "react";
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
import { Mail, ArrowRight, CheckCircle, ArrowLeft } from "lucide-react";
import { inviteSchema, InviteSchemaType } from "@/schemas/loginSchema";
import { toast } from "sonner";

export function SignUpForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  const form = useForm<InviteSchemaType>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
    },
  });

  const handleSubmit = async (values: InviteSchemaType) => {
    setIsLoading(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const token = localStorage.getItem("access_token");

    try {
      const response = await fetch(`${apiUrl}/api/v1/auth/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: values.email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (typeof errorData.detail === "string") {
          toast.error(errorData.detail);
        } else {
          toast.error("Failed to send invite");
        }
        return;
      }

      setSent(true);
      toast.success("Invite sent successfully!");
    } catch {
      toast.error("Cannot connect to server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <Card className="w-full max-w-md shadow-2xl m-2">
        <CardContent className="pt-10 pb-10 flex flex-col items-center gap-4">
          <CheckCircle className="h-12 w-12" style={{ color: "#429ABD" }} />
          <p className="text-center text-lg font-semibold" style={{ color: "#429ABD" }}>
            Invite sent!
          </p>
          <p className="text-center text-sm text-muted-foreground">
            The invite link has been sent to the email address. It is valid for 5 minutes.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSent(false);
              form.reset();
            }}
            style={{ borderColor: "#429ABD", color: "#429ABD" }}
          >
            Send another invite
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => router.back()}
        className="absolute top-6 left-6 p-2 rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
        style={{ color: "#429ABD" }}
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      <Card className="w-full max-w-md shadow-2xl m-2">
        <CardHeader>
          <CardTitle className="text-center text-2xl" style={{ color: "#429ABD" }}>
            Invite User
          </CardTitle>
          <CardDescription className="text-center">
            Enter the email address of the person you want to invite.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel style={{ color: "#429ABD" }}>Email Address</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail
                          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                          style={{ color: "#429ABD" }}
                        />
                        <Input
                          type="email"
                          placeholder="Enter email to invite"
                          className="pl-10 focus-visible:ring-[#429ABD] focus-visible:border-[#429ABD]"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
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
                {isLoading ? "Sending..." : "Send Invite"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}