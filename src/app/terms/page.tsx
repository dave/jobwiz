import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Ace That Interview",
  description: "Terms and conditions for using Ace That Interview's interview preparation platform.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16 sm:py-24">
        <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 mb-8">
          Terms of Service
        </h1>

        <div className="prose prose-gray max-w-none">
          <p className="text-lg text-gray-600 mb-8">
            Last updated: January 2026
          </p>

          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Welcome to Ace That Interview
            </h2>
            <p className="text-gray-600">
              By using our service, you agree to these terms. Please read them carefully. Ace That Interview provides interview preparation content and tools to help you succeed in your job search.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Using Our Service
            </h2>
            <p className="text-gray-600 mb-4">
              You must be at least 16 years old to use Ace That Interview. You are responsible for maintaining the security of your account and password. You agree not to share your account credentials with others.
            </p>
            <p className="text-gray-600">
              You may use our content for personal, non-commercial purposes only. You may not copy, distribute, or republish our interview preparation materials without permission.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Purchases and Refunds
            </h2>
            <p className="text-gray-600 mb-4">
              When you purchase access to premium content, you receive immediate access to the materials. All purchases are final.
            </p>
            <p className="text-gray-600">
              Prices are subject to change, but any price changes will not affect purchases you have already made.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Content Disclaimer
            </h2>
            <p className="text-gray-600 mb-4">
              Our interview preparation content is designed to help you prepare, but we cannot guarantee any specific outcomes. Interview success depends on many factors beyond our control.
            </p>
            <p className="text-gray-600">
              Company names, logos, and trademarks mentioned in our content belong to their respective owners. Ace That Interview is not affiliated with or endorsed by any of the companies featured in our preparation materials.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Acceptable Use
            </h2>
            <p className="text-gray-600">
              You agree not to misuse our service. This includes attempting to access accounts that aren&apos;t yours, interfering with our systems, or using automated tools to access our content. We reserve the right to suspend or terminate accounts that violate these terms.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Limitation of Liability
            </h2>
            <p className="text-gray-600">
              Ace That Interview is provided &quot;as is&quot; without warranties of any kind. To the maximum extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from your use of our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Contact Us
            </h2>
            <p className="text-gray-600">
              If you have questions about these terms, please contact us at john@johnbrophy.net.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
