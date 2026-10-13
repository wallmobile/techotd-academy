"use server";

// AI Server Actions (Phase 10.9). They only translate form fields into the
// guarded domain functions (src/lib/ai/*), which derive the student from the
// session. Results are plain data rendered as text — no AI output is ever
// passed to a function that changes business records.

import { askAssistant } from "@/lib/ai/assistant";
import { recommendCourses } from "@/lib/ai/recommend";

// (not exported: a "use server" module may only export async functions)
const AI_MESSAGES = {
  forbidden: "The learning assistant is available to signed-in students.",
  question_invalid: "Please enter a question between 2 and 1000 characters.",
  interests_invalid: "Please describe your interests in 3 to 300 characters.",
  course_not_enrolled: "Please choose one of your own enrolled courses, or leave it on “No course”.",
  not_configured: "The AI assistant isn't available right now. You can still browse courses and ask your trainer.",
  daily_limit: "You've reached today's AI usage limit. Please try again tomorrow.",
  rate_limited: "You're sending requests too quickly. Please wait a few minutes and try again.",
  busy: "Your previous request is still being processed. Please wait a moment.",
  provider_unavailable: "The AI assistant couldn't answer right now. Please try again later.",
};

function field(formData, name) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function askAssistantAction(_prev, formData) {
  const result = await askAssistant({ question: field(formData, "question"), courseSlug: field(formData, "courseSlug") });
  if (!result.ok) {
    return { status: "error", message: AI_MESSAGES[result.reason] || AI_MESSAGES.provider_unavailable, question: field(formData, "question") };
  }
  return { status: "success", answer: result.answer, groundedInCourse: result.groundedInCourse, question: field(formData, "question") };
}

export async function recommendCoursesAction(_prev, formData) {
  const result = await recommendCourses({ interests: field(formData, "interests") });
  if (!result.ok) {
    return { status: "error", message: AI_MESSAGES[result.reason] || AI_MESSAGES.provider_unavailable, interests: field(formData, "interests") };
  }
  return { status: "success", source: result.source, picks: result.picks, note: result.note, aiAvailable: result.aiAvailable, interests: field(formData, "interests") };
}
