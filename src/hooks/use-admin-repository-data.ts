"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { defaultCmsSettings } from "@/lib/cms-defaults";
import type {
  BusinessListingApplication,
  CateringQuote,
  CmsSettings,
  DemoOrder,
  MenuItem,
  Offer,
  Restaurant,
  RestaurantBranch,
  SocialPost,
  StaffMember,
} from "@/lib/types";
import type { AdminResource } from "@/repositories/admin-repository";
import type { PlanDefinition } from "@/lib/access-control";
import type { MarketingSettings } from "@/features/marketing/messageTemplates";

type AdminData = {
  restaurants: Restaurant[];
  staffMembers: StaffMember[];
  orders: DemoOrder[];
  offers: Offer[];
  menuItems: MenuItem[];
  businessApplications: BusinessListingApplication[];
  branches: RestaurantBranch[];
  socialPosts: SocialPost[];
  cateringInquiries: CateringQuote[];
  plans: Array<PlanDefinition & { enabled: boolean }>;
  campaignSettings: Array<MarketingSettings & { id: string }>;
};

const empty: AdminData = {
  restaurants: [],
  staffMembers: [],
  orders: [],
  offers: [],
  menuItems: [],
  businessApplications: [],
  branches: [],
  socialPosts: [],
  cateringInquiries: [],
  plans: [],
  campaignSettings: [],
};

export function useAdminRepositoryData() {
  const [data, setData] = useState<AdminData>(empty);
  const [cmsSettings, setCmsSettings] = useState<CmsSettings>(defaultCmsSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const [dataResponse, cmsResponse] = await Promise.all([
      fetch("/api/admin/data", { cache: "no-store" }),
      fetch("/api/admin/cms", { cache: "no-store" }),
    ]);
    const payload = await dataResponse.json().catch(() => ({})) as { data?: AdminData; error?: string };
    const cmsPayload = await cmsResponse.json().catch(() => ({})) as { data?: CmsSettings };
    if (dataResponse.ok && payload.data) {
      setData(payload.data);
      setError("");
    } else {
      setError(payload.error || "Unable to load admin data.");
    }
    if (cmsResponse.ok && cmsPayload.data) setCmsSettings(cmsPayload.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => void refresh());
  }, [refresh]);

  const mutate = useCallback(async (method: "POST" | "PATCH" | "DELETE", resource: AdminResource, id: string | undefined, value?: Record<string, unknown>) => {
    const response = await fetch("/api/admin/data", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ resource, id, data: value }),
    });
    const payload = await response.json().catch(() => ({})) as { data?: Record<string, unknown>; error?: string };
    if (!response.ok) throw new Error(payload.error || "Admin update failed.");
    await refresh();
    return payload.data;
  }, [refresh]);

  const updateCmsSettings = useCallback(async (settings: CmsSettings) => {
    const response = await fetch("/api/admin/cms", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ settings }) });
    if (!response.ok) throw new Error("CMS update failed.");
    setCmsSettings(settings);
  }, []);

  return useMemo(() => ({
    ...data,
    cmsSettings,
    loading,
    error,
    refresh,
    updateRestaurantAdminState: (id: string, value: Partial<Restaurant>) => mutate("PATCH", "restaurants", id, value as Record<string, unknown>),
    submitBusinessApplication: (value: Omit<BusinessListingApplication, "id" | "status" | "submittedAt" | "updatedAt">) => mutate("POST", "businessApplications", undefined, { ...value, status: "pending", submittedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).then((result) => result as unknown as BusinessListingApplication),
    reviewBusinessApplication: (id: string, status: string) => mutate("PATCH", "businessApplications", id, { status, updatedAt: new Date().toISOString() }),
    updateMenuItem: (value: MenuItem) => mutate("PATCH", "menuItems", value.id, value as unknown as Record<string, unknown>),
    reviewSocialPost: (id: string, status: string, reviewNote: string) => mutate("PATCH", "socialPosts", id, { status, reviewNote, reviewedAt: new Date().toISOString() }),
    createStaffMember: (value: Omit<StaffMember, "id" | "lastActivity">) => mutate("POST", "staffMembers", undefined, { ...value, lastActivity: "Created by admin" }),
    updateStaffMember: (value: StaffMember) => mutate("PATCH", "staffMembers", value.id, value as unknown as Record<string, unknown>),
    setAdminDisabled: (id: string, disabled: boolean) => mutate("PATCH", "staffMembers", id, { action: disabled ? "disable" : "enable" }),
    resetAdminPassword: (id: string) => mutate("PATCH", "staffMembers", id, { action: "reset-password" }),
    savePlan: (value: PlanDefinition & { enabled: boolean }) => mutate("PATCH", "plans", value.key, value as unknown as Record<string, unknown>),
    saveCampaignSettings: (value: MarketingSettings) => mutate("PATCH", "campaignSettings", "platform", value as unknown as Record<string, unknown>),
    updateCmsSettings,
  }), [cmsSettings, data, error, loading, mutate, refresh, updateCmsSettings]);
}
