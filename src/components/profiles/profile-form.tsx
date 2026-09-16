"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { ResumeUploader } from "@/components/resume-uploader";
import type { CandidateProfile } from "@/lib/types";

export type ProfileFormValues = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  dob: string;
  ssnLast4: string;
  linkedinUrl: string;
  resumeUrl: string;
  resumeName: string;
  notes: string;
};

function toDateInputValue(dob: string | null | undefined) {
  if (!dob) return "";
  return dob.slice(0, 10);
}

export function ProfileForm({
  initial,
  submitLabel = "Save profile",
  onSubmit,
}: {
  initial?: Partial<CandidateProfile>;
  submitLabel?: string;
  onSubmit: (values: ProfileFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<ProfileFormValues>({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    address: initial?.address ?? "",
    city: initial?.city ?? "",
    state: initial?.state ?? "",
    zip: initial?.zip ?? "",
    dob: toDateInputValue(initial?.dob),
    ssnLast4: initial?.ssnLast4 ?? "",
    linkedinUrl: initial?.linkedinUrl ?? "",
    resumeUrl: initial?.resumeUrl ?? "",
    resumeName: initial?.resumeName ?? "",
    notes: initial?.notes ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ProfileFormValues>(key: K, val: ProfileFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="p-name">Full name *</Label>
        <Input
          id="p-name"
          required
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Candidate name"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="p-email">Email</Label>
          <Input
            id="p-email"
            type="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="candidate@email.com"
          />
        </div>
        <div>
          <Label htmlFor="p-phone">Phone</Label>
          <Input
            id="p-phone"
            value={values.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+1 555 000 0000"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="p-address">Street address</Label>
        <Input
          id="p-address"
          value={values.address}
          onChange={(e) => set("address", e.target.value)}
          placeholder="123 Main St"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="p-city">City</Label>
          <Input
            id="p-city"
            value={values.city}
            onChange={(e) => set("city", e.target.value)}
            placeholder="Austin"
          />
        </div>
        <div>
          <Label htmlFor="p-state">State</Label>
          <Input
            id="p-state"
            value={values.state}
            onChange={(e) => set("state", e.target.value)}
            placeholder="TX"
          />
        </div>
        <div>
          <Label htmlFor="p-zip">ZIP</Label>
          <Input
            id="p-zip"
            value={values.zip}
            onChange={(e) => set("zip", e.target.value)}
            placeholder="78701"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="p-dob">Date of birth</Label>
          <Input
            id="p-dob"
            type="date"
            value={values.dob}
            onChange={(e) => set("dob", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="p-ssn">SSN (last 4 digits)</Label>
          <Input
            id="p-ssn"
            inputMode="numeric"
            maxLength={4}
            value={values.ssnLast4}
            onChange={(e) => set("ssnLast4", e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="1234"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="p-linkedin">LinkedIn profile</Label>
        <Input
          id="p-linkedin"
          value={values.linkedinUrl}
          onChange={(e) => set("linkedinUrl", e.target.value)}
          placeholder="https://linkedin.com/in/..."
        />
      </div>

      <div>
        <Label>Resume</Label>
        <ResumeUploader
          resumeUrl={values.resumeUrl}
          resumeName={values.resumeName}
          onChange={(val) => {
            set("resumeUrl", val?.resumeUrl ?? "");
            set("resumeName", val?.resumeName ?? "");
          }}
        />
      </div>

      <div>
        <Label htmlFor="p-notes">Notes</Label>
        <Textarea
          id="p-notes"
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Optional internal notes"
        />
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger/10 rounded-md px-3 py-2">{error}</p>
      )}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}
