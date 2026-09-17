export type Role = "SUPER_ADMIN" | "MANAGER" | "CALLER";

export type StepKind = "ACTIVE" | "CANCELLED" | "NO_SHOW";

export type StatusStep = {
  id: string;
  managerId: string;
  order: number;
  label: string;
  kind: StepKind;
  createdAt: string;
  updatedAt: string;
};

export type UserRef = { id: string; name: string; email: string };

export type CandidateProfile = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  dob: string | null;
  ssnLast4: string | null;
  linkedinUrl: string | null;
  resumeUrl: string | null;
  resumeName: string | null;
  notes: string | null;
  managerId: string;
  manager?: UserRef;
  createdAt: string;
  updatedAt: string;
  _count?: { interviews: number };
};

export type Caller = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  telegramUsername?: string | null;
  telegramLinked?: boolean;
  managerId?: string | null;
  createdAt: string;
  manager?: UserRef;
  _count?: { interviewsAssigned: number };
};

export type Manager = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  _count?: { callers: number; profilesAdded: number; interviewsCreated: number };
};

export type Interview = {
  id: string;
  eventName: string | null;
  jobDescription: string;
  companyName: string;
  companyWebsite: string | null;
  meetingLink: string | null;
  meetingPlatform: string | null;
  interviewTime: string;
  durationMinutes: number;
  timezone: string;
  resumeUrl: string | null;
  resumeName: string | null;
  notes: string | null;
  feedback: string | null;
  createdAt: string;
  updatedAt: string;
  profileId: string;
  profile: CandidateProfile;
  managerId: string;
  manager: UserRef;
  callerId: string | null;
  caller: UserRef | null;
  statusStepId: string;
  statusStep: StatusStep;
};

export type BlockedSlot = {
  id: string;
  callerId: string;
  caller?: { id: string; name: string } | null;
  startTime: string;
  endTime: string;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DashboardStats = {
  totalProfiles: number;
  totalCallers: number;
  totalManagers: number;
  todayInterviews: number;
  upcomingInterviews: number;
  completedInterviews: number;
};
