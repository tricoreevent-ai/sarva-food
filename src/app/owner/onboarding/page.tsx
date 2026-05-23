import { redirect } from "next/navigation";

export default function OwnerOnboardingPage() {
  redirect("/owner/profile?tab=onboarding");
}
