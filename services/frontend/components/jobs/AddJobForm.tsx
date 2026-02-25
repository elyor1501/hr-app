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

type JobForm = {
  id:string;
  title: string;
  status:string;
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

  const form = useForm<JobForm>({
    defaultValues: {
      title: "",
      status:"open",
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
      application_posted: "",
    },
  });

  const onSubmit = async (values: JobForm) => {
    try {
      setLoading(true);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/jobs/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );

      if (!res.ok) throw new Error("Failed to create job");

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
          name="title"
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Job Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Job Description</FormLabel>
              <FormControl>
                <textarea
                  className="border rounded-md p-2 min-h-[100px]"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="responsibilities"
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Responsibilities</FormLabel>
              <FormControl>
                <textarea
                  className="border rounded-md p-2 min-h-[100px]"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="department"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department</FormLabel>
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
          name="employment_type"
          render={({ field }) => (
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
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="work_mode"
          render={({ field }) => (
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
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="experience_required"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Experience Required (Years)</FormLabel>
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
          name="salary_range"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Salary Range</FormLabel>
              <FormControl>
                <Input placeholder="5LPA - 10LPA" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="openings"
          render={({ field }) => (
            <FormItem>
              <FormLabel>No. of Openings</FormLabel>
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
          name="hiring_manager"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hiring Manager</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="application_posted"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Posted Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="application_deadline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Application Deadline</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="education"
          render={() => (
            <FormItem className="col-span-2">
              <FormLabel>Educational Qualification</FormLabel>

              <div className="grid grid-cols-3 gap-2">
                {EDUCATION_OPTIONS.map((item) => (
                  <FormField
                    key={item}
                    control={form.control}
                    name="education"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={item}
                          className="flex flex-row items-center space-x-2"
                        >
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value?.includes(item)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                return checked
                                  ? field.onChange([
                                      ...(field.value || []),
                                      item,
                                    ])
                                  : field.onChange(
                                      field.value?.filter((v) => v !== item),
                                    );
                              }}
                            />
                          </FormControl>

                          <FormLabel className="font-normal">{item}</FormLabel>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="required_skills"
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Required Skills</FormLabel>
              <FormControl>
                <Input placeholder="React, Next.js, SQL..." {...field} />
              </FormControl>
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
