"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DocumentReplaceForm({
  credentialId,
  userId,
}: {
  credentialId: string;
  userId: string;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setUploading(true);

    const formData = new FormData(event.currentTarget);
    const file = formData.get("document") as File | null;

    if (!file) {
      setError("Choose a document first.");
      setUploading(false);
      return;
    }

    const fileExt = file.name.split(".").pop() || "pdf";
    const filePath = `${userId}/${credentialId}/${Date.now()}.${fileExt}`;

    const { data: oldDocuments, error: oldDocumentsError } = await supabase
      .from("credential_documents")
      .select("id, file_url")
      .eq("credential_id", credentialId)
      .eq("user_id", userId);

    if (oldDocumentsError) {
      setError(oldDocumentsError.message);
      setUploading(false);
      return;
    }

    if (oldDocuments && oldDocuments.length > 0) {
      const oldFilePaths = oldDocuments.map((doc) => doc.file_url);

      const { error: storageDeleteError } = await supabase.storage
        .from("notary-documents")
        .remove(oldFilePaths);

      if (storageDeleteError) {
        setError(storageDeleteError.message);
        setUploading(false);
        return;
      }

      const { error: documentDeleteError } = await supabase
        .from("credential_documents")
        .delete()
        .eq("credential_id", credentialId)
        .eq("user_id", userId);

      if (documentDeleteError) {
        setError(documentDeleteError.message);
        setUploading(false);
        return;
      }
    }

    const { error: uploadError } = await supabase.storage
      .from("notary-documents")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("credential_documents")
      .insert({
        credential_id: credentialId,
        user_id: userId,
        file_name: file.name,
        file_url: filePath,
        file_type: file.type,
      });

    if (insertError) {
      setError(insertError.message);
      setUploading(false);
      return;
    }

    const { error: credentialUpdateError } = await supabase
      .from("notary_credentials")
      .update({
        status: "pending_review",
        updated_at: new Date().toISOString(),
      })
      .eq("id", credentialId)
      .eq("user_id", userId);

    if (credentialUpdateError) {
      setError(credentialUpdateError.message);
      setUploading(false);
      return;
    }

    router.push("/notary/credentials");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow p-6 space-y-4"
    >
      <label className="block space-y-1">
        <span className="text-sm font-medium">New Document</span>
        <input
          name="document"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          required
          className="w-full border rounded-lg p-2"
        />
      </label>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={uploading}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Replace Document"}
        </button>

        <a
          href="/notary/credentials"
          className="bg-slate-200 px-4 py-2 rounded-lg"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}