import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email"),

  password: z.string().min(1, "Password is required").min(6, "Wrong password"),
});

export type LoginSchemaType = z.infer<typeof loginSchema>;

export const signUpSchema = z
  .object({
    full_name: z
      .string()
      .min(3, "Full name is required")
      .regex(/^[A-Za-z ]+$/, "Only letters are allowed"),

    email: z.string().min(1, "Email is required").email("Enter a valid email"),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must include at least 1 uppercase letter")
      .regex(/[0-9]/, "Must include at least 1 number")
      .regex(/[^A-Za-z0-9]/, "Must include 1 special character"),

    confirmPassword: z.string().min(1, "Confirm password is required"),

    role: z
      .string()
      .min(1, "Role is required")
      .refine((val) => ["admin", "recruiter"].includes(val), {
        message: "Invalid role selected",
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignUpSchemaType = z.infer<typeof signUpSchema>;
