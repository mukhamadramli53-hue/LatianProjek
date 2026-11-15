import { redirect } from "next/navigation";

export default function ProfileSettingsPage() {
  redirect("/profil?tab=keamanan");
}
