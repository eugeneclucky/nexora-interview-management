import { z } from "zod";

export const profileOptionalFields = {
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  zip: z.string().trim().optional(),
  dob: z.string().trim().optional().or(z.literal("")),
  ssnLast4: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Enter exactly 4 digits")
    .optional()
    .or(z.literal("")),
  linkedinUrl: z.string().trim().url().optional().or(z.literal("")),
  resumeUrl: z.string().optional(),
  resumeName: z.string().optional(),
  notes: z.string().optional(),
};

export const createProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  ...profileOptionalFields,
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).optional(),
  ...profileOptionalFields,
});

export type ProfileInput = z.infer<typeof createProfileSchema>;

export function parseDob(dob: string | undefined) {
  if (!dob) return null;
  const date = new Date(`${dob}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}
