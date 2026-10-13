import { getCurrentUser } from "@/lib/auth/currentUser";
import { getMyCourseEnrollments } from "@/lib/student/courses";
import { isAiConfigured } from "@/lib/ai/provider";
import { StudentShell } from "@/components/student/StudentShell";
import { AskAssistantPanel, RecommendPanel } from "@/components/student/AiAssistant";

export const metadata = {
  title: "Learning Assistant",
  robots: { index: false, follow: false },
};

export default async function StudentAssistantPage() {
  // The enrolled-course list comes from the session; the AI configuration is
  // only a boolean here — keys and model names never reach the browser.
  const [enrollments, user] = await Promise.all([getMyCourseEnrollments(), getCurrentUser()]);
  const courses = enrollments.map((e) => ({ slug: e.course.slug, title: e.course.title }));

  return (
    <StudentShell user={user} title="Learning Assistant">
      <div className="flex max-w-3xl flex-col gap-6">
        <p className="text-sm text-muted">
          Get study help and course ideas. The assistant sees only your question and, if you choose, the outline of one of your courses — never your
          grades, fees or personal data — and its answers don&apos;t change any of your records.
        </p>
        <AskAssistantPanel aiConfigured={isAiConfigured()} courses={courses} />
        <RecommendPanel aiConfigured={isAiConfigured()} />
      </div>
    </StudentShell>
  );
}
