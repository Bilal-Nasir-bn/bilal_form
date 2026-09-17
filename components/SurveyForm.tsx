
"use client";

import { useState } from "react";
import { questions } from "@/lib/questions";
import { supabase } from "@/lib/supabaseClient";

type QuestionCounts = Record<string, Record<string, number>>;

export default function SurveyForm() {
  const [peopleCount, setPeopleCount] = useState(1);
  const [answers, setAnswers] = useState<QuestionCounts>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------

  function getQuestionTotal(questionId: string) {
    const question = questions.find((q) => q.id === questionId);

    if (!question) return 0;

    const questionAnswers = answers[questionId] || {};

    if (question.type === "yes_no") {
      return (
        (questionAnswers.yes ?? 0) +
        (questionAnswers.no ?? 0)
      );
    }

    if (
      question.type === "single_select" ||
      question.type === "rating"
    ) {
      return (
        question.options?.reduce(
          (sum, option) =>
            sum + (questionAnswers[option.id] ?? 0),
          0
        ) ?? 0
      );
    }

    return 0;
  }

  function isQuestionComplete(questionId: string) {
    const question = questions.find((q) => q.id === questionId);

    if (!question) return false;

    if (question.type === "multi_select") {
      return true;
    }

    return getQuestionTotal(questionId) === peopleCount;
  }

  // --------------------------------------------------
  // People count
  // --------------------------------------------------

  function handlePeopleCountChange(value: number) {
    if (Number.isNaN(value)) return;

    const count = Math.max(
      1,
      Math.min(1000, Math.floor(value))
    );

    setPeopleCount(count);

    // Clamp existing answers to new people count
    setAnswers((previous) => {
      const updated: QuestionCounts = {};

      for (const [questionId, questionAnswers] of Object.entries(
        previous
      )) {
        updated[questionId] = {};

        for (const [optionId, optionValue] of Object.entries(
          questionAnswers
        )) {
          updated[questionId][optionId] = Math.min(
            optionValue,
            count
          );
        }
      }

      return updated;
    });

    setError(null);
  }

  // --------------------------------------------------
  // Set count
  // --------------------------------------------------

  function setCount(
    questionId: string,
    optionId: string,
    value: number
  ) {
    if (Number.isNaN(value)) {
      value = 0;
    }

    const safeValue = Math.max(
      0,
      Math.min(peopleCount, Math.floor(value))
    );

    setAnswers((previous) => ({
      ...previous,
      [questionId]: {
        ...(previous[questionId] || {}),
        [optionId]: safeValue,
      },
    }));

    setError(null);
  }

  // --------------------------------------------------
  // Increment / decrement
  // --------------------------------------------------

  function changeCount(
    questionId: string,
    optionId: string,
    amount: number
  ) {
    const current =
      answers[questionId]?.[optionId] ?? 0;

    setCount(
      questionId,
      optionId,
      current + amount
    );
  }

  // --------------------------------------------------
  // Validation
  // --------------------------------------------------

  function validateSurvey() {
    for (const q of questions) {
      if (q.type === "yes_no") {
        const yes = answers[q.id]?.yes ?? 0;
        const no = answers[q.id]?.no ?? 0;

        if (yes + no !== peopleCount) {
          return `"${q.label}" must have exactly ${peopleCount} responses. You currently have ${yes + no}.`;
        }
      }

      if (
        q.type === "single_select" ||
        q.type === "rating"
      ) {
        const total =
          q.options?.reduce(
            (sum, option) =>
              sum +
              (answers[q.id]?.[option.id] ?? 0),
            0
          ) ?? 0;

        if (total !== peopleCount) {
          return `"${q.label}" must have exactly ${peopleCount} responses. You currently have ${total}.`;
        }
      }

      if (q.type === "multi_select") {
        for (const option of q.options || []) {
          const count =
            answers[q.id]?.[option.id] ?? 0;

          if (count > peopleCount) {
            return `"${option.label}" cannot have more than ${peopleCount} people.`;
          }
        }
      }
    }

    return null;
  }

  // --------------------------------------------------
  // Submit
  // --------------------------------------------------

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setError(null);

    const validationError = validateSurvey();

    if (validationError) {
      setError(validationError);

      // Scroll to error
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    setSubmitting(true);

    const { error: insertError } = await supabase
      .from("survey_responses")
      .insert({
        group_size: peopleCount,
        answers,
      });

    setSubmitting(false);

    if (insertError) {
      setError(
        "Something went wrong: " +
        insertError.message
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    setDone(true);
  }

  // --------------------------------------------------
  // Reset
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
      <main className="min-h-screen bg-gray-50 px-4 py-8 flex items-center justify-center">
        <div className="w-full max-w-md rounded-3xl border bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700">
            ✓
          </div>

          <h2 className="text-2xl font-bold text-gray-900">
            Survey Submitted
          </h2>

          <p className="mt-3 text-gray-600">
            Responses from{" "}
            <strong>{peopleCount}</strong>{" "}
            {peopleCount === 1 ? "person" : "people"}{" "}
            have been recorded successfully.
          </p>

          <button
            type="button"
            onClick={handleBack}
            className="mt-7 w-full rounded-xl bg-black px-6 py-3.5 font-semibold text-white transition active:scale-[0.98] hover:bg-gray-800"
          >
            Back to Survey
          </button>
        </div>
      </main>
    );
  }

  // --------------------------------------------------
  // Progress
  // --------------------------------------------------

  const completedQuestions = questions.filter(
    (q) => isQuestionComplete(q.id)
  ).length;

  const progress = Math.round(
    (completedQuestions / questions.length) * 100
  );

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="mx-auto w-full max-w-2xl px-3 py-4 sm:px-6 sm:py-8"
      >
        {/* Header */}

        <div className="rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
          <h1 className="text-2xl font-bold text-gray-900">
            Group Survey
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            Enter the number of people, then record how
            many people selected each answer.
          </p>

          {/* People count */}

          <div className="mt-6">
            <label
              htmlFor="people-count"
              className="mb-2 block text-sm font-semibold text-gray-800"
            >
              Number of people
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handlePeopleCountChange(
                    peopleCount - 1
                  )
                }
                disabled={peopleCount <= 1}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-white text-xl font-bold disabled:opacity-40"
              >
                −
              </button>

              <input
                id="people-count"
                type="number"
                inputMode="numeric"
                min={1}
                max={1000}
                value={peopleCount}
                onChange={(e) =>
                  handlePeopleCountChange(
                    Number(e.target.value)
                  )
                }
                className="h-12 min-w-0 flex-1 rounded-xl border px-4 text-center text-lg font-semibold outline-none focus:border-black focus:ring-2 focus:ring-black/10"
              />

              <button
                type="button"
                onClick={() =>
                  handlePeopleCountChange(
                    peopleCount + 1
                  )
                }
                disabled={peopleCount >= 1000}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-white text-xl font-bold disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          {/* Progress */}

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-gray-500">
              <span>
                {completedQuestions} of{" "}
                {questions.length} questions complete
              </span>

              <span>{progress}%</span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-black transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Error */}

        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
            <strong>Please check:</strong>{" "}
            {error}
          </div>
        )}

        {/* Questions */}

        <div className="mt-5 space-y-4">
          {questions.map((q, index) => {
            const questionAnswers =
              answers[q.id] || {};

            const currentTotal =
              getQuestionTotal(q.id);

            const complete =
              isQuestionComplete(q.id);

            return (
              <section
                key={q.id}
                className={`rounded-3xl border bg-white p-4 shadow-sm sm:p-6 ${!complete &&
                    q.type !== "multi_select"
                    ? "border-gray-200"
                    : "border-gray-200"
                  }`}
              >
                {/* Question header */}

                <div className="mb-5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Question {index + 1} /{" "}
                      {questions.length}
                    </span>

                    {q.type !== "multi_select" && (
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${complete
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                          }`}
                      >
                        {complete
                          ? "Complete"
                          : `${currentTotal}/${peopleCount}`}
                      </span>
                    )}
                  </div>

                  <h2 className="text-base font-semibold leading-6 text-gray-900 sm:text-lg">
                    {q.label}

                    {q.required && (
                      <span className="ml-1 text-red-500">
                        *
                      </span>
                    )}
                  </h2>
                </div>

                {/* YES / NO */}

                {q.type === "yes_no" && (
                  <div className="space-y-3">
                    <CountRow
                      label="Yes"
                      description="People who answered Yes"
                      value={
                        questionAnswers.yes ?? 0
                      }
                      max={peopleCount}
                      onDecrease={() =>
                        changeCount(
                          q.id,
                          "yes",
                          -1
                        )
                      }
                      onIncrease={() =>
                        changeCount(
                          q.id,
                          "yes",
                          1
                        )
                      }
                      onChange={(value) =>
                        setCount(
                          q.id,
                          "yes",
                          value
                        )
                      }
                    />

                    <CountRow
                      label="No"
                      description="People who answered No"
                      value={
                        questionAnswers.no ?? 0
                      }
                      max={peopleCount}
                      onDecrease={() =>
                        changeCount(
                          q.id,
                          "no",
                          -1
                        )
                      }
                      onIncrease={() =>
                        changeCount(
                          q.id,
                          "no",
                          1
                        )
                      }
                      onChange={(value) =>
                        setCount(
                          q.id,
                          "no",
                          value
                        )
                      }
                    />

                    <ResponseCounter
                      current={currentTotal}
                      total={peopleCount}
                    />
                  </div>
                )}

                {/* SINGLE SELECT */}

                {q.type === "single_select" && (
                  <div className="space-y-3">
                    {q.options?.map((option) => (
                      <CountRow
                        key={option.id}
                        label={option.label}
                        value={
                          questionAnswers[
                          option.id
                          ] ?? 0
                        }
                        max={peopleCount}
                        onDecrease={() =>
                          changeCount(
                            q.id,
                            option.id,
                            -1
                          )
                        }
                        onIncrease={() =>
                          changeCount(
                            q.id,
                            option.id,
                            1
                          )
                        }
                        onChange={(value) =>
                          setCount(
                            q.id,
                            option.id,
                            value
                          )
                        }
                      />
                    ))}

                    <ResponseCounter
                      current={currentTotal}
                      total={peopleCount}
                    />
                  </div>
                )}

                {/* RATING */}

                {q.type === "rating" && (
                  <div className="space-y-3">
                    {q.options?.map((option) => (
                      <CountRow
                        key={option.id}
                        label={`Rating ${option.label}`}
                        description={
                          option.label === "1"
                            ? "Very poor"
                            : option.label === "10"
                              ? "Excellent"
                              : undefined
                        }
                        value={
                          questionAnswers[
                          option.id
                          ] ?? 0
                        }
                        max={peopleCount}
                        onDecrease={() =>
                          changeCount(
                            q.id,
                            option.id,
                            -1
                          )
                        }
                        onIncrease={() =>
                          changeCount(
                            q.id,
                            option.id,
                            1
                          )
                        }
                        onChange={(value) =>
                          setCount(
                            q.id,
                            option.id,
                            value
                          )
                        }
                      />
                    ))}

                    <ResponseCounter
                      current={currentTotal}
                      total={peopleCount}
                    />
                  </div>
                )}

                {/* MULTI SELECT */}

                {q.type === "multi_select" && (
                  <div>
                    <div className="mb-4 rounded-xl bg-blue-50 p-3 text-sm leading-5 text-blue-700">
                      A person can select multiple
                      options, so each option is
                      counted independently.
                    </div>

                    <div className="space-y-3">
                      {q.options?.map((option) => (
                        <CountRow
                          key={option.id}
                          label={option.label}
                          value={
                            questionAnswers[
                            option.id
                            ] ?? 0
                          }
                          max={peopleCount}
                          onDecrease={() =>
                            changeCount(
                              q.id,
                              option.id,
                              -1
                            )
                          }
                          onIncrease={() =>
                            changeCount(
                              q.id,
                              option.id,
                              1
                            )
                          }
                          onChange={(value) =>
                            setCount(
                              q.id,
                              option.id,
                              value
                            )
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* TEXT */}

                {q.type === "text" && (
                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-sm leading-6 text-gray-600">
                      Text responses are not aggregated
                      in this version of the survey.
                    </p>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* Submit */}

        <div className="sticky bottom-0 mt-6 bg-gray-50/95 py-3 backdrop-blur sm:static sm:bg-transparent sm:py-0">
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-black px-6 py-4 text-base font-semibold text-white shadow-lg transition active:scale-[0.99] hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? "Submitting..."
              : `Submit ${peopleCount} ${peopleCount === 1
                ? "Response"
                : "Responses"
              }`}
          </button>
        </div>
      </form>
    </main>
  );
}

// ==================================================
// Count Row
// ==================================================

function CountRow({
  label,
  description,
  value,
  max,
  onDecrease,
  onIncrease,
  onChange,
}: {
  label: string;
  description?: string;
  value: number;
  max: number;
  onDecrease: () => void;
  onIncrease: () => void;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-2xl border p-3 sm:p-4">
      <div className="flex items-center gap-3">
        {/* Label */}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900 sm:text-base">
            {label}
          </p>

          {description && (
            <p className="mt-0.5 text-xs leading-5 text-gray-500 sm:text-sm">
              {description}
            </p>
          )}
        </div>

        {/* Counter */}

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onDecrease}
            disabled={value <= 0}
            aria-label={`Decrease ${label}`}
            className="flex h-10 w-10 items-center justify-center rounded-xl border bg-white text-lg font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          >
            −
          </button>

          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={max}
            value={value}
            onChange={(e) => {
              const raw = e.target.value;

              if (raw === "") {
                onChange(0);
                return;
              }

              const parsed = Number(raw);

              if (!Number.isNaN(parsed)) {
                onChange(parsed);
              }
            }}
            className="h-10 w-14 rounded-xl border text-center text-sm font-bold outline-none focus:border-black focus:ring-2 focus:ring-black/10 sm:w-16"
            aria-label={`${label} count`}
          />

          <button
            type="button"
            onClick={onIncrease}
            disabled={value >= max}
            aria-label={`Increase ${label}`}
            className="flex h-10 w-10 items-center justify-center rounded-xl border bg-white text-lg font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================================================
// Response Counter
// ==================================================

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
      className={`mt-3 rounded-xl px-3 py-3 text-center text-sm font-semibold ${complete
          ? "bg-green-50 text-green-700"
          : current > total
            ? "bg-red-50 text-red-700"
            : "bg-gray-50 text-gray-600"
        }`}
    >
      {current} / {total} responses recorded
      {complete && " ✓"}
    </div>
  );
}
