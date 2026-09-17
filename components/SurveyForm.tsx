"use client";

import { useState } from "react";
import { questions } from "@/lib/questions";
import { supabase } from "@/lib/supabaseClient";

// answers for ONE person: { question_id: value }
// value is string for single_select/text/rating, string[] for multi_select
type Answers = Record<string, string | string[]>;

export default function SurveyForm() {
  const [peopleCount, setPeopleCount] = useState<number>(1);
  const [peopleAnswers, setPeopleAnswers] = useState<Answers[]>([{}]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // when people count changes, resize the answers array
  function handlePeopleCountChange(value: number) {
    const count = Math.max(1, Math.min(20, value || 1)); // cap at 20 for sanity
    setPeopleCount(count);
    setPeopleAnswers((prev) => {
      const next = [...prev];
      while (next.length < count) next.push({});
      next.length = count;
      return next;
    });
  }

  function setAnswer(personIndex: number, questionId: string, value: string | string[]) {
    setPeopleAnswers((prev) => {
      const next = [...prev];
      next[personIndex] = { ...next[personIndex], [questionId]: value };
      return next;
    });
  }

  function toggleMultiSelect(personIndex: number, questionId: string, optionId: string) {
    setPeopleAnswers((prev) => {
      const next = [...prev];
      const current = (next[personIndex][questionId] as string[]) || [];
      const updated = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      next[personIndex] = { ...next[personIndex], [questionId]: updated };
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // basic required-field check
    for (let i = 0; i < peopleAnswers.length; i++) {
      for (const q of questions) {
        if (q.required && !peopleAnswers[i][q.id]) {
          setError(`Person ${i + 1}: "${q.label}" is required.`);
          return;
        }
      }
    }

    setSubmitting(true);

    // one row per person, each row's answers stored as JSON in "answers" column
    const rows = peopleAnswers.map((answers) => ({
      group_size: peopleCount,
      answers,
    }));

    const { error: insertError } = await supabase.from("survey_responses").insert(rows);

    setSubmitting(false);

    if (insertError) {
      setError("Something went wrong: " + insertError.message);
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <p className="text-xl font-semibold">Submitted</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4 space-y-8">
      <div>
        <label className="block font-medium mb-1">
          How many people are at this table?
        </label>
        <input
          type="number"
          min={1}
          max={20}
          value={peopleCount}
          onChange={(e) => handlePeopleCountChange(parseInt(e.target.value, 10))}
          className="border rounded px-3 py-2 w-24"
        />
      </div>

      {peopleAnswers.map((answers, personIndex) => (
        <div key={personIndex} className="border rounded-lg p-4 space-y-5">
          <h3 className="font-semibold text-lg">Person {personIndex + 1}</h3>

          {/* 👇 loop over questions/index.ts — this is the only place that
              needs to change when you edit the questions file */}
          {questions.map((q) => (
            <div key={q.id}>
              <label className="block font-medium mb-2">
                {q.label}
                {q.required && <span className="text-red-500"> *</span>}
              </label>

              {q.type === "text" && (
                <input
                  type="text"
                  placeholder={q.placeholder}
                  value={(answers[q.id] as string) || ""}
                  onChange={(e) => setAnswer(personIndex, q.id, e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                />
              )}

              {q.type === "yes_no" && (
                <div className="flex gap-3">
                  {["yes", "no"].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAnswer(personIndex, q.id, val)}
                      className={`px-5 py-2 rounded border capitalize ${
                        answers[q.id] === val
                          ? "bg-black text-white"
                          : "bg-white text-black"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              )}

              {q.type === "single_select" &&
                q.options?.map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2 mb-1">
                    <input
                      type="radio"
                      name={`person${personIndex}_${q.id}`}
                      checked={answers[q.id] === opt.id}
                      onChange={() => setAnswer(personIndex, q.id, opt.id)}
                    />
                    {opt.label}
                  </label>
                ))}

              {q.type === "multi_select" &&
                q.options?.map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2 mb-1">
                    <input
                      type="checkbox"
                      checked={((answers[q.id] as string[]) || []).includes(opt.id)}
                      onChange={() => toggleMultiSelect(personIndex, q.id, opt.id)}
                    />
                    {opt.label}
                  </label>
                ))}

              {q.type === "rating" && (
                <div className="flex gap-2">
                  {q.options?.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAnswer(personIndex, q.id, opt.id)}
                      className={`w-10 h-10 rounded border ${
                        answers[q.id] === opt.id
                          ? "bg-black text-white"
                          : "bg-white text-black"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="bg-black text-white px-6 py-2 rounded w-full"
      >
        {submitting ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}
