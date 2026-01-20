import { getAllCompanies } from "@/lib/routing";
import { InterviewSelector } from "@/components/home/InterviewSelector";

export default function Home() {
  const companies = getAllCompanies();

  return (
    <div className="bg-white">
      <section className="px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-semibold text-gray-900 tracking-tight leading-[1.1] mb-6">
            Ace That Interview
          </h1>

          <p className="text-xl text-gray-600 leading-relaxed mb-10 mx-auto max-w-xl">
            Interview prep tailored to your target company and role
          </p>

          <InterviewSelector companies={companies} />
        </div>
      </section>
    </div>
  );
}
