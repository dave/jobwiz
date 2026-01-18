import { Metadata } from "next";
import { ProfileContent } from "./ProfileContent";

export const metadata: Metadata = {
  title: "Profile | Ace That Interview",
  description: "View and manage your Ace That Interview profile",
};

export default function ProfilePage() {
  return <ProfileContent />;
}
