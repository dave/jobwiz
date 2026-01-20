import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Ace That Interview",
  description: "Learn how Ace That Interview collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16 sm:py-24">
        <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-8">
          Privacy Policy
        </h1>

        <div className="prose prose-gray max-w-none">
          <p className="text-lg text-gray-600 mb-8">
            Last updated: January 2026
          </p>

          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Information We Collect
            </h2>
            <p className="text-gray-600 mb-4">
              When you use Ace That Interview, we collect information you provide directly, such as your email address when creating an account, and information about your usage of our service to improve your experience.
            </p>
            <p className="text-gray-600">
              We may also collect technical information like your browser type, device information, and IP address to ensure our service works correctly and to protect against abuse.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              How We Use Your Information
            </h2>
            <p className="text-gray-600 mb-4">
              We use your information to provide and improve our interview preparation services, process payments, send important updates about your account, and personalize your learning experience.
            </p>
            <p className="text-gray-600">
              We do not sell your personal information to third parties. We may share anonymized, aggregated data for analytics purposes.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Data Security
            </h2>
            <p className="text-gray-600">
              We implement industry-standard security measures to protect your personal information. All data is encrypted in transit and at rest. Payment information is processed securely through Stripe and is never stored on our servers.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Your Rights
            </h2>
            <p className="text-gray-600">
              You can access, update, or delete your personal information at any time through your account settings. If you have questions about your data or wish to exercise your privacy rights, contact us at privacy@acethatinterview.com.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Cookies
            </h2>
            <p className="text-gray-600">
              We use essential cookies to keep you logged in and remember your preferences. We also use analytics cookies to understand how people use our service so we can make it better. You can manage cookie preferences in your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Changes to This Policy
            </h2>
            <p className="text-gray-600">
              We may update this privacy policy from time to time. We will notify you of any significant changes by email or through a notice on our website.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
