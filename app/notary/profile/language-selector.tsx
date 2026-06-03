"use client";

import { useState } from "react";

const languages = [
  "English",
  "Spanish",
  "American Sign Language",
  "Arabic",
  "Armenian",
  "Bengali",
  "Chinese",
  "French",
  "German",
  "Greek",
  "Gujarati",
  "Hebrew",
  "Hindi",
  "Italian",
  "Japanese",
  "Korean",
  "Persian",
  "Polish",
  "Portuguese",
  "Punjabi",
  "Russian",
  "Tagalog",
  "Thai",
  "Turkish",
  "Ukrainian",
  "Urdu",
  "Vietnamese",
];

export default function LanguageSelector({
  defaultValue,
}: {
  defaultValue?: string | null;
}) {
  const startingLanguages = defaultValue
    ? defaultValue.split(",").map((item) => item.trim()).filter(Boolean)
    : ["English"];

  const [selected, setSelected] = useState<string[]>(startingLanguages);

  function addLanguage(language: string) {
    if (!language || selected.includes(language)) return;
    setSelected([...selected, language]);
  }

  function removeLanguage(language: string) {
    setSelected(selected.filter((item) => item !== language));
  }

  return (
    <div className="rounded-lg border bg-white p-2">
      <input type="hidden" name="languages_spoken" value={selected.join(", ")} />

      <div className="mb-2 flex flex-wrap gap-2">
        {selected.map((language) => (
          <span
            key={language}
            className="inline-flex items-center gap-2 rounded bg-slate-100 px-2 py-1 text-sm"
          >
            {language}
            <button
              type="button"
              onClick={() => removeLanguage(language)}
              className="font-bold text-slate-500 hover:text-red-600"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <select
        className="w-full rounded border p-2"
        defaultValue=""
        onChange={(event) => {
          addLanguage(event.target.value);
          event.target.value = "";
        }}
      >
        <option value="">Add language...</option>
        {languages.map((language) => (
          <option key={language} value={language}>
            {language}
          </option>
        ))}
      </select>
    </div>
  );
}