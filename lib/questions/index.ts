// lib/questions/index.ts
//
// 👉 Edit ONLY this file to change the survey.
// Add / remove / reorder questions here — the form component automatically
// loops over this array and renders the right input for each question.
//
// type "yes_no"         -> two buttons: Yes / No
// type "single_select"  -> radio buttons (one answer)
// type "multi_select"   -> checkboxes (multiple answers)
// type "text"           -> free text input
// type "rating"         -> N buttons (uses "options" as the scale, e.g. 1-10)

import { Question } from "@/types/questions";

export const questions: Question[] = [
  {
    id: "noticed_problem",
    label: "Is this a problem you have noticed?",
    type: "yes_no",
    required: true,
  },
  {
    id: "trust_no_storage",
    label:
      "How likely are you to trust this if we assure that your pictures are not being stored in any way?",
    type: "yes_no",
    required: true,
  },
  {
    id: "trust_big_llms",
    label:
      "In this AI era, would you trust LLMs of big companies like Google, Anthropic, etc.?",
    type: "yes_no",
    required: true,
  },
  {
    id: "prefer_own_llm",
    label:
      "Would you feel more comfortable if we used our own LLM and assured that as soon as you are done trying the fit, the picture is discarded as soon as you walk out?",
    type: "yes_no",
    required: true,
  },
  {
    id: "extra_features_useful",
    label:
      "If we added different features — like trying on different hairstyles or accessories — would that be useful?",
    type: "yes_no",
    required: true,
  },
  {
    id: "overall_rating",
    label: "Finally, how much would you rate this service out of 10?",
    type: "rating",
    required: true,
    options: Array.from({ length: 10 }, (_, i) => ({
      id: String(i + 1),
      label: String(i + 1),
    })),
  },
];
