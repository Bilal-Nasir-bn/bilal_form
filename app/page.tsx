import SurveyForm from "@/components/SurveyForm";

// Prevent static prerendering — the Supabase client needs env vars at runtime
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="min-h-screen py-10">
      <h1 className="text-2xl font-bold text-center mb-6">
        AI Try-On Survey
      </h1>
      <SurveyForm />
    </main>
  );
}
