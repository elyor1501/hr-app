"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { useRouter } from "next/navigation";

type CandidateForm = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  current_title?: string;
  current_company?: string;
  years_of_experience?: number;
  location?: string;
  linkedin_url?: string;
  status?: "active" | "inactive";
  skills?: string;
  resume?: File | null;
};

type Props = {
  setOpenAction: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function CreateCandidateForm({ setOpenAction }: Props) {
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  const form = useForm<CandidateForm>({
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      current_title: "",
      current_company: "",
      years_of_experience: 0,
      location: "",
      linkedin_url: "",
      status: "active",
      skills: "",
      resume: null,
    },
  });

  const onSubmit = async (values: CandidateForm) => {
    try {
      setLoading(true);

      const formData = new FormData();

      Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === "resume") {
            formData.append("resume", value as File);
          }

          else if (key === "skills") {
            const skillsArray = String(value)
              .split(",")
              .map((s) => s.trim());

            skillsArray.forEach((skill) => {
              formData.append("skills", skill);
            });
          } else {
            formData.append(key, String(value));
          }
        }
      });

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/candidates/`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!res.ok) throw new Error("Failed to create candidate");

      const data = await res.json();

      form.reset();
      setOpenAction(false);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid grid-cols-2 gap-4 py-4"
      >
        <FormField
          control={form.control}
          name="first_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="last_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="current_company"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="current_title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Designation/Title</FormLabel>
              <FormControl>
                <Input {...field} placeholder="React Developer" />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="years_of_experience"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Experience (Years)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <FormControl>
                <select
                  className="w-full border rounded-md h-10 px-3"
                  {...field}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="resume"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Upload Resume</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => field.onChange(e.target.files?.[0] || null)}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="skills"
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Skills</FormLabel>
              <FormControl>
                <Input placeholder="React, Next.js, SQL..." {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="linkedin_url"
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>LinkedIn URL</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="col-span-2 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => setOpenAction(false)}
          >
            Cancel
          </Button>

          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Employee"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
