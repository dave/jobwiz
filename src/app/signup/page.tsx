import { Metadata } from "next";
import { SignupContent } from "./SignupContent";

export const metadata: Metadata = {
  title: "Create Account | JobWiz",
  description: "Create your JobWiz account to start your personalized interview prep journey.",
};

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Start your personalized interview prep journey
          </p>
        </div>

        <SignupContent />
      </div>
    </div>
  );
}
