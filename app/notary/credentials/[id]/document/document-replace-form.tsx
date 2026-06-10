"use client";

import Link from "next/link";
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

    const { data: oldDocuments, error: oldDocumentsError } =
      await supabase
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="text-sm font-bold text-slate-700">
          New Document
        </label>

        <input
          name="document"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          required
          disabled={uploading}
          className="
            mt-2 w-full rounded-xl border border-slate-300 bg-white p-3
            text-sm font-medium text-slate-900 shadow-sm
            file:mr-4 file:rounded-lg file:border-0
            file:bg-[#0B1F4D] file:px-4 file:py-2
            file:text-sm file:font-bold file:text-white
            hover:file:bg-blue-950
            disabled:cursor-not-allowed disabled:opacity-70
          "
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={uploading}
          className="
            inline-flex items-center justify-center gap-2
            rounded-xl bg-[#0B1F4D] px-5 py-3
            text-sm font-bold text-white shadow-sm
            transition hover:bg-blue-950
            disabled:cursor-not-allowed disabled:opacity-70
          "
        >
          {uploading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              <span>Replacing document...</span>
            </>
          ) : (
            "Replace Document"
          )}
        </button>

        <Link
          href="/notary/credentials"
          className="
            rounded-xl bg-slate-200 px-5 py-3
            text-center text-sm font-bold text-slate-900
            transition hover:bg-slate-300
          "
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}