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
import { toast } from "sonner";

type JobForm = {
  id: string;
  title: string;
  status: string;
  department: string;
  employment_type: string;
  work_mode: string;
  location: string;
  application_posted?: string;
  description: string;
  responsibilities: string;
  required_skills: string;
  preferred_skills?: string;
  experience_required: number;
  education?: string[];
  salary_range?: string;
  openings?: number;
  hiring_manager?: string;
  application_deadline?: string;
};

const EDUCATION_OPTIONS = [
  "B.E / B.Tech",
  "M.E / M.Tech",
  "BCA",
  "MCA",
  "B.Sc",
  "M.Sc",
  "MBA",
  "Diploma",
];

type Props = {
  setOpenAction: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function CreateJobForm({ setOpenAction }: Props) {
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  const today = new Date().toISOString().split("T")[0];

  const form = useForm<JobForm>({
    defaultValues: {
      title: "",
      status: "open",
      department: "",
      employment_type: "",
      work_mode: "",
      location: "",
      description: "",
      responsibilities: "",
      required_skills: "",
      preferred_skills: "",
      experience_required: 0,
      education: [],
      salary_range: "",
      openings: 1,
      hiring_manager: "",
      application_deadline: "",
      application_posted: today,
    },
  });

  const onSubmit = async (values: JobForm) => {
    try {
      setLoading(true);

      const token = localStorage.getItem("access_token");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/jobs/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
          },
          body: JSON.stringify(values),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error("Failed to create job");
      }

      form.reset();
      setOpenAction(false);
      router.refresh();
      toast.success("Job created successfully");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to create job");
    } finally {
      setLoading(false);
    }
  };

  const renderError = (error?: any) =>
    error && <p className="text-red-500 text-sm">{error.message}</p>;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid grid-cols-2 gap-4 py-4"
      >
        <FormField
          control={form.control}
          name="title"
          rules={{ required: "Job title is required" }}
          render={({ field, fieldState }) => (
            <FormItem className="col-span-2">
              <FormLabel>Job Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              {renderError(fieldState.error)}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          rules={{
            required: "Description is required",
            minLength: {
              value: 10,
              message: "Description must be at least 10 characters",
            },
          }}
          render={({ field, fieldState }) => (
            <FormItem className="col-span-2">
              <FormLabel>Job Description</FormLabel>
              <FormControl>
                <textarea
                  className="border rounded-md p-2 min-h-[100px]"
                  {...field}
                />
              </FormControl>
              {renderError(fieldState.error)}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="responsibilities"
          rules={{
            required: "Responsibilities are required",
            minLength: {
              value: 10,
              message: "Responsibilities must be at least 10 characters",
            },
          }}
          render={({ field, fieldState }) => (
            <FormItem className="col-span-2">
              <FormLabel>Responsibilities</FormLabel>
              <FormControl>
                <textarea
                  className="border rounded-md p-2 min-h-[100px]"
                  {...field}
                />
              </FormControl>
              {renderError(fieldState.error)}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="department"
          rules={{ required: "Department is required" }}
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Department</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              {renderError(fieldState.error)}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          rules={{ required: "Location is required" }}
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              {renderError(fieldState.error)}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="employment_type"
          rules={{ required: "Employment type is required" }}
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Employment Type</FormLabel>
              <FormControl>
                <select
                  className="w-full border rounded-md h-10 px-3"
                  {...field}
                >
                  <option value="">Select</option>
                  <option value="Full Time">Full-time</option>
                  <option value="Part Time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                </select>
              </FormControl>
              {renderError(fieldState.error)}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="work_mode"
          rules={{ required: "Work mode is required" }}
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Work Mode</FormLabel>
              <FormControl>
                <select
                  className="w-full border rounded-md h-10 px-3"
                  {...field}
                >
                  <option value="">Select</option>
                  <option value="Onsite">Onsite</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Remote">Remote</option>
                </select>
              </FormControl>
              {renderError(fieldState.error)}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="experience_required"
          rules={{
            required: "Experience is required",
            min: { value: 0, message: "Experience cannot be negative" },
          }}
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Experience Required</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              {renderError(fieldState.error)}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="salary_range"
          rules={{ required: "Salary range is required" }}
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Salary Range</FormLabel>
              <FormControl>
                <Input placeholder="5LPA - 10LPA" {...field} />
              </FormControl>
              {renderError(fieldState.error)}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="openings"
          rules={{
            required: "Openings required",
            min: { value: 1, message: "At least 1 opening required" },
          }}
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>No. of Openings</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              {renderError(fieldState.error)}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="hiring_manager"
          rules={{ required: "Hiring manager required" }}
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Hiring Manager</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              {renderError(fieldState.error)}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="education"
          rules={{ required: "Education is required" }}
          render={({ field, fieldState }) => (
            <FormItem className="col-span-2">
              <FormLabel>Educational Qualification</FormLabel>

              <div className="grid grid-cols-3 gap-2">
                {EDUCATION_OPTIONS.map((item) => (
                  <label key={item} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={field.value?.includes(item)}
                      onChange={(e) => {
                        const checked = e.target.checked;

                        if (checked) {
                          field.onChange([...(field.value || []), item]);
                        } else {
                          field.onChange(
                            field.value?.filter((value) => value !== item),
                          );
                        }
                      }}
                    />
                    {item}
                  </label>
                ))}
              </div>

              {renderError(fieldState.error)}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="application_posted"
          rules={{ required: "Posted date required" }}
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Posted Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} min={today} />
              </FormControl>
              {renderError(fieldState.error)}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="application_deadline"
          rules={{
            required: "Deadline required",
            validate: (value) =>
              !value || value >= today || "Deadline cannot be before today",
          }}
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Application Deadline</FormLabel>
              <FormControl>
                <Input type="date" {...field} min={today} />
              </FormControl>
              {renderError(fieldState.error)}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="required_skills"
          rules={{
            required: "Required skills are mandatory",
            minLength: {
              value: 10,
              message: "Required skills must be at least 10 characters",
            },
          }}
          render={({ field, fieldState }) => (
            <FormItem className="col-span-2">
              <FormLabel>Required Skills</FormLabel>
              <FormControl>
                <Input placeholder="React, Next.js, SQL..." {...field} />
              </FormControl>
              {fieldState.error && (
                <p className="text-red-500 text-sm">
                  {fieldState.error.message}
                </p>
              )}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="preferred_skills"
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Preferred Skills</FormLabel>
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
            {loading ? "Creating..." : "Create Job"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
