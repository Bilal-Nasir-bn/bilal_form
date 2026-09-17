// types/questions.ts

export type QuestionType = "single_select" | "multi_select" | "text" | "rating" | "yes_no";

export interface QuestionOption {
  id: string;    // stored value in DB (keep stable, don't rename later)
  label: string; // shown to user
}

export interface Question {
  id: string;           // used as the DB column / JSON key
  label: string;        // the question text shown to the user
  type: QuestionType;
  options?: QuestionOption[]; // required for single_select / multi_select
  required?: boolean;
  placeholder?: string;  // used for "text" type
}
