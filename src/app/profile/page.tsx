import { Metadata } from "next";
import { ProfileContent } from "./ProfileContent";

export const metadata: Metadata = {
  title: "Profile | JobWiz",
  description: "View and manage your JobWiz profile",
};

export default function ProfilePage() {
  return <ProfileContent />;
}
