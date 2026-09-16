import { Role } from "@/generated/prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  managerId?: string | null;
};

export function isSuperAdmin(user: SessionUser) {
  return user.role === "SUPER_ADMIN";
}

export function isManager(user: SessionUser) {
  return user.role === "MANAGER";
}

export function isCaller(user: SessionUser) {
  return user.role === "CALLER";
}

export type ManagerScope =
  | { type: "all" } // super admin: no restriction
  | { type: "one"; managerId: string } // manager, or caller assigned to one
  | { type: "none" }; // unassigned caller: must see nothing

/** What manager-scoped data a given user is allowed to see. */
export function managerScope(user: SessionUser): ManagerScope {
  if (isSuperAdmin(user)) return { type: "all" };
  if (isManager(user)) return { type: "one", managerId: user.id };
  if (user.managerId) return { type: "one", managerId: user.managerId };
  return { type: "none" };
}
