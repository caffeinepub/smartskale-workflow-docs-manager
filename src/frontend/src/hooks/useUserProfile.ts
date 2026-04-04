import type { Principal } from "@icp-sdk/core/principal";
import { useCallback, useEffect, useState } from "react";
import type { UserProfile, UserRole } from "../backend";
import { useActor } from "./useActor";
import type { CredentialUser } from "./useAuth";
import { useAuth } from "./useAuth";

function toUserRole(r: string): UserRole {
  if (r === "Admin") return { ADMIN: null };
  if (r === "Manager") return { MANAGER: null };
  return { EMPLOYEE: null };
}

function buildSyntheticProfile(user: CredentialUser): UserProfile {
  const fakePrincipal = {
    toString: () => user.username,
  } as unknown as Principal;
  return {
    id: fakePrincipal,
    name: user.profile.name,
    role: user.profile.jobTitle,
    department: user.profile.department,
    email: user.profile.email,
    phone: user.profile.phone,
    userRole: toUserRole(user.profile.userRole),
    createdAt: BigInt(Date.now()) * BigInt(1_000_000),
    updatedAt: BigInt(Date.now()) * BigInt(1_000_000),
  };
}

export function useUserProfile() {
  const { isFetching } = useActor();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setProfile(buildSyntheticProfile(user));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (isFetching) return;
    fetchProfile();
  }, [isFetching, fetchProfile]);

  return { profile, loading, refetch: fetchProfile };
}
