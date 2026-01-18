import { Metadata } from "next";
import { ForgotPasswordContent } from "./ForgotPasswordContent";

export const metadata: Metadata = {
  title: "Reset Password | Ace That Interview",
  description: "Reset your Ace That Interview account password.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Reset your password
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        <ForgotPasswordContent />
      </div>
    </div>
  );
}
