"use client";

import { useState } from "react";
import { questions } from "@/lib/questions";
import { supabase } from "@/lib/supabaseClient";

type QuestionCounts = Record<string, Record<string, number>>;

export default function SurveyForm() {
  const [peopleCount, setPeopleCount] = useState<number>(1);
  const [answers, setAnswers] = useState<QuestionCounts>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --------------------------------------------------
  // Change number of people
  // --------------------------------------------------

  function handlePeopleCountChange(value: number) {
    const count = Math.max(1, Math.min(1000, value || 1));

    setPeopleCount(count);
    setError(null);
  }

  // --------------------------------------------------
  // Set count for an option
  // --------------------------------------------------

  function setCount(
    questionId: string,
    optionId: string,
    value: number
  ) {
    const safeValue = Math.max(
      0,
      Math.min(peopleCount, value || 0)
    );

    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || {}),
        [optionId]: safeValue,
      },
    }));

    setError(null);
  }

  // --------------------------------------------------
  // Submit aggregate survey
  // --------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate every question
    for (const q of questions) {
      if (q.type === "yes_no") {
        const yes = answers[q.id]?.yes ?? 0;
        const no = answers[q.id]?.no ?? 0;

        if (yes + no !== peopleCount) {
          setError(
            `"${q.label}" must have ${peopleCount} total responses. You currently have ${yes + no
            }.`
          );
          return;
        }
      }

      if (q.type === "single_select" || q.type === "rating") {
        const total = (q.options || []).reduce(
          (sum, option) =>
            sum + (answers[q.id]?.[option.id] ?? 0),
          0
        );

        if (total !== peopleCount) {
          setError(
            `"${q.label}" must have ${peopleCount} total responses. You currently have ${total}.`
          );
          return;
        }
      }

      if (q.type === "multi_select") {
        const counts = answers[q.id] || {};

        for (const option of q.options || []) {
          const count = counts[option.id] ?? 0;

          if (count > peopleCount) {
            setError(
              `"${option.label}" cannot have more than ${peopleCount} people.`
            );
            return;
          }
        }
      }
    }

    setSubmitting(true);

    /*
      Store ONE row for the entire group.

      Example:

      {
        "noticed_problem": {
          "yes": 14,
          "no": 6
        },
        "trust_no_storage": {
          "yes": 17,
          "no": 3
        },
        "overall_rating": {
          "1": 0,
          "2": 1,
          "3": 2,
          ...
          "10": 4
        }
      }
    */

    const { error: insertError } = await supabase
      .from("survey_responses")
      .insert({
        group_size: peopleCount,
        answers: answers,
      });

    setSubmitting(false);

    if (insertError) {
      setError(
        "Something went wrong: " + insertError.message
      );
      return;
    }

    setDone(true);
  }

  // --------------------------------------------------
  // Reset and go back to survey
  // --------------------------------------------------

  function handleBack() {
    setDone(false);
    setPeopleCount(1);
    setAnswers({});
    setError(null);
  }

  // --------------------------------------------------
  // Submitted screen
  // --------------------------------------------------

  if (done) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <div className="mb-4 text-5xl">✓</div>

          <h2 className="text-2xl font-bold">
            Survey Submitted
          </h2>

          <p className="mt-3 text-gray-600">
            Responses from {peopleCount}{" "}
            {peopleCount === 1 ? "person" : "people"} have
            been recorded successfully.
          </p>

          <button
            type="button"
            onClick={handleBack}
            className="mt-6 w-full rounded-lg bg-black px-6 py-3 font-medium text-white transition hover:bg-gray-800"
          >
            Back to Survey
          </button>
        </div>
      </main>
    );
  }

  // --------------------------------------------------
  // Survey UI
  // --------------------------------------------------

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-2xl space-y-8 p-4"
    >
      {/* Header */}

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">
          Group Survey
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          Enter the total number of people and then record
          how many people selected each answer.
        </p>

        {/* Number of people */}

        <div className="mt-6">
          <label className="mb-2 block font-semibold">
            Number of people
          </label>

          <input
            type="number"
            min={1}
            max={1000}
            value={peopleCount}
            onChange={(e) =>
              handlePeopleCountChange(
                parseInt(e.target.value, 10)
              )
            }
            className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-black"
          />
        </div>
      </div>

      {/* Questions */}

      {questions.map((q, index) => {
        const questionAnswers = answers[q.id] || {};

        return (
          <div
            key={q.id}
            className="rounded-2xl border bg-white p-6 shadow-sm"
          >
            {/* Question number */}

            <div className="mb-5">
              <p className="mb-2 text-sm font-medium text-gray-500">
                Question {index + 1} of {questions.length}
              </p>

              <h3 className="text-lg font-semibold">
                {q.label}

                {q.required && (
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                )}
              </h3>
            </div>

            {/* ------------------------------------------ */}
            {/* YES / NO                                   */}
            {/* ------------------------------------------ */}

            {q.type === "yes_no" && (
              <div className="space-y-4">
                {/* YES */}

                <div className="flex items-center justify-between rounded-xl border p-4">
                  <div>
                    <p className="font-medium">Yes</p>
                    <p className="text-sm text-gray-500">
                      People who answered Yes
                    </p>
                  </div>

                  <input
                    type="number"
                    min={0}
                    max={peopleCount}
                    value={questionAnswers.yes ?? ""}
                    onChange={(e) =>
                      setCount(
                        q.id,
                        "yes",
                        parseInt(e.target.value, 10)
                      )
                    }
                    className="w-24 rounded-lg border px-3 py-2 text-center"
                  />
                </div>

                {/* NO */}

                <div className="flex items-center justify-between rounded-xl border p-4">
                  <div>
                    <p className="font-medium">No</p>
                    <p className="text-sm text-gray-500">
                      People who answered No
                    </p>
                  </div>

                  <input
                    type="number"
                    min={0}
                    max={peopleCount}
                    value={questionAnswers.no ?? ""}
                    onChange={(e) =>
                      setCount(
                        q.id,
                        "no",
                        parseInt(e.target.value, 10)
                      )
                    }
                    className="w-24 rounded-lg border px-3 py-2 text-center"
                  />
                </div>

                {/* Counter */}

                <ResponseCounter
                  current={
                    (questionAnswers.yes ?? 0) +
                    (questionAnswers.no ?? 0)
                  }
                  total={peopleCount}
                />
              </div>
            )}

            {/* ------------------------------------------ */}
            {/* SINGLE SELECT                              */}
            {/* ------------------------------------------ */}

            {q.type === "single_select" && (
              <div className="space-y-3">
                {q.options?.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center justify-between rounded-xl border p-4"
                  >
                    <span className="font-medium">
                      {option.label}
                    </span>

                    <input
                      type="number"
                      min={0}
                      max={peopleCount}
                      value={
                        questionAnswers[option.id] ?? ""
                      }
                      onChange={(e) =>
                        setCount(
                          q.id,
                          option.id,
                          parseInt(e.target.value, 10)
                        )
                      }
                      className="w-24 rounded-lg border px-3 py-2 text-center"
                    />
                  </div>
                ))}

                <ResponseCounter
                  current={
                    q.options?.reduce(
                      (sum, option) =>
                        sum +
                        (questionAnswers[option.id] ?? 0),
                      0
                    ) ?? 0
                  }
                  total={peopleCount}
                />
              </div>
            )}

            {/* ------------------------------------------ */}
            {/* RATING                                     */}
            {/* ------------------------------------------ */}

            {q.type === "rating" && (
              <div className="space-y-3">
                {q.options?.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center justify-between rounded-xl border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 font-bold">
                        {option.label}
                      </div>

                      <span className="text-sm text-gray-600">
                        {option.label === "1"
                          ? "Very poor"
                          : option.label === "10"
                            ? "Excellent"
                            : ""}
                      </span>
                    </div>

                    <input
                      type="number"
                      min={0}
                      max={peopleCount}
                      value={
                        questionAnswers[option.id] ?? ""
                      }
                      onChange={(e) =>
                        setCount(
                          q.id,
                          option.id,
                          parseInt(e.target.value, 10)
                        )
                      }
                      className="w-24 rounded-lg border px-3 py-2 text-center"
                    />
                  </div>
                ))}

                <ResponseCounter
                  current={
                    q.options?.reduce(
                      (sum, option) =>
                        sum +
                        (questionAnswers[option.id] ?? 0),
                      0
                    ) ?? 0
                  }
                  total={peopleCount}
                />
              </div>
            )}

            {/* ------------------------------------------ */}
            {/* MULTI SELECT                               */}
            {/* ------------------------------------------ */}

            {q.type === "multi_select" && (
              <div className="space-y-3">
                <p className="mb-4 text-sm text-gray-500">
                  Enter how many people selected each option.
                  A person may be counted in multiple options.
                </p>

                {q.options?.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center justify-between rounded-xl border p-4"
                  >
                    <span className="font-medium">
                      {option.label}
                    </span>

                    <input
                      type="number"
                      min={0}
                      max={peopleCount}
                      value={
                        questionAnswers[option.id] ?? ""
                      }
                      onChange={(e) =>
                        setCount(
                          q.id,
                          option.id,
                          parseInt(e.target.value, 10)
                        )
                      }
                      className="w-24 rounded-lg border px-3 py-2 text-center"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* ------------------------------------------ */}
            {/* TEXT                                       */}
            {/* ------------------------------------------ */}

            {q.type === "text" && (
              <div>
                <p className="mb-3 text-sm text-gray-500">
                  Text responses are not aggregated. If you
                  need text responses from each person, we
                  should handle this question differently.
                </p>

                <textarea
                  placeholder={q.placeholder}
                  className="min-h-24 w-full rounded-lg border p-3"
                  disabled
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Error */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Submit */}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-black px-6 py-4 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting
          ? "Submitting..."
          : `Submit ${peopleCount} Responses`}
      </button>
    </form>
  );
}

// --------------------------------------------------
// Response counter
// --------------------------------------------------

function ResponseCounter({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const complete = current === total;

  return (
    <div
      className={`rounded-lg p-3 text-center text-sm font-medium ${complete
          ? "bg-green-50 text-green-700"
          : "bg-gray-50 text-gray-600"
        }`}
    >
      {current} / {total} responses recorded
      {complete && " ✓"}
    </div>
  );
}