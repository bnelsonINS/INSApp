import { supabase } from "../../src/lib/supabase";

export default async function TestSupabasePage() {
  const { data, error } = await supabase.from("profiles").select("*").limit(5);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Supabase Test</h1>

      {error ? (
        <pre className="mt-4 text-red-600">{JSON.stringify(error, null, 2)}</pre>
      ) : (
        <pre className="mt-4 bg-gray-100 p-4 rounded">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </main>
  );
}