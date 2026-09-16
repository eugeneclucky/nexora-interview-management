import { UserX } from "lucide-react";
import { Card } from "@/components/ui/card";

export function UnassignedNotice() {
  return (
    <Card className="p-8 text-center space-y-2">
      <UserX className="h-8 w-8 mx-auto text-muted-foreground" />
      <p className="font-medium">You haven&apos;t been added to a team yet</p>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        A manager or admin needs to add you to their team before you&apos;ll see any interviews
        here. Let them know you&apos;ve signed up.
      </p>
    </Card>
  );
}
