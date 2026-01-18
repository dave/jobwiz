import { Metadata } from "next";
import { DashboardContent } from "./DashboardContent";

export const metadata: Metadata = {
  title: "Dashboard | JobWiz",
  description: "Your personalized interview prep dashboard",
};

export default function DashboardPage() {
  return <DashboardContent />;
}
