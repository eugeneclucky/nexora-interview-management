"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { InterviewForm } from "@/components/interviews/interview-form";
import { useProfiles } from "@/hooks/use-profiles";
import { useCallers } from "@/hooks/use-callers";
import { useToast } from "@/components/providers/toast-provider";
import { apiFetch } from "@/lib/api";

export default function AddInterviewPage() {
  return (
    <Suspense fallback={null}>
      <AddInterviewPageInner />
    </Suspense>
  );
}

function AddInterviewPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedProfileId = searchParams.get("profileId") ?? undefined;
  const { profiles, loading: profilesLoading } = useProfiles({ mine: true });
  const { callers, loading: callersLoading } = useCallers({ mine: true });
  const pushToast = useToast();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-semibold">Schedule Interview</h2>
        <p className="text-sm text-muted-foreground">
          Set up an interview with the job description, meeting details, and time.
        </p>
      </div>

      <Card className="p-6">
        {profilesLoading || callersLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : profiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add a candidate profile first before scheduling an interview.
          </p>
        ) : (
          <InterviewForm
            profiles={profiles}
            callers={callers}
            initial={preselectedProfileId ? { profileId: preselectedProfileId } : undefined}
            onSubmit={async (payload) => {
              await apiFetch("/api/interviews", {
                method: "POST",
                body: JSON.stringify(payload),
              });
              pushToast("success", "Interview scheduled.");
              router.push("/manager/calendar");
            }}
          />
        )}
      </Card>
    </div>
  );
}
