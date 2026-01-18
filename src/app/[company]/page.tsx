interface CompanyPageProps {
  params: Promise<{
    company: string;
  }>;
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { company } = await params;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">Interview Prep</h1>
      <p className="text-lg text-gray-600">
        Company: <span className="font-semibold">{company}</span>
      </p>
    </main>
  );
}
