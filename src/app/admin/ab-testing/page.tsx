import { Metadata } from "next";
import { ABTestDashboard } from "./ABTestDashboard";

export const metadata: Metadata = {
  title: "AB Test Dashboard | Admin | Ace That Interview",
  description: "Monitor AB test performance and statistical significance",
};

export default function ABTestDashboardPage() {
  return <ABTestDashboard />;
}
