import { redirect } from "next/navigation";

export default function OwnerOnboardingPage() {
  redirect("/owner/settings?tab=profile");
}
