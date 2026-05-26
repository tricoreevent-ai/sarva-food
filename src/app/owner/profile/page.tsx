import { redirect } from "next/navigation";

export default function OwnerProfilePage() {
  redirect("/owner/settings?tab=profile");
}
