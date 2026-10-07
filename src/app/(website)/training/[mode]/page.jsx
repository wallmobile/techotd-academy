import { notFound } from "next/navigation";
import { trainingModes, getTrainingModeBySlug } from "@/data/trainingModes";
import { TrainingHero } from "@/components/training/TrainingHero";
import { TrainingJourney } from "@/components/training/TrainingJourney";
import { TrainingWhy } from "@/components/training/TrainingWhy";
import { TrainingSupport } from "@/components/training/TrainingSupport";
import { RelatedTrainingCourses } from "@/components/training/RelatedTrainingCourses";
import { TrainingFAQ } from "@/components/training/TrainingFAQ";
import { TrainingCTA } from "@/components/training/TrainingCTA";

export function generateStaticParams() {
  return trainingModes.map((mode) => ({ mode: mode.slug }));
}

export async function generateMetadata({ params }) {
  const { mode: slug } = await params;
  const trainingMode = getTrainingModeBySlug(slug);

  if (!trainingMode) {
    return { title: "Training Mode Not Found" };
  }

  // The root layout's title template appends " | TechOTD Academy" —
  // keep this plain so it doesn't get duplicated.
  const title = `${trainingMode.title}`;

  return {
    title,
    description: trainingMode.shortDescription,
    alternates: { canonical: `/training/${trainingMode.slug}` },
    openGraph: {
      title,
      description: trainingMode.shortDescription,
      url: `/training/${trainingMode.slug}`,
    },
  };
}

export default async function TrainingModePage({ params }) {
  const { mode: slug } = await params;
  const trainingMode = getTrainingModeBySlug(slug);

  if (!trainingMode) {
    notFound();
  }

  return (
    <>
      <TrainingHero trainingMode={trainingMode} />
      <TrainingJourney trainingMode={trainingMode} />
      <TrainingWhy trainingMode={trainingMode} />
      <TrainingSupport trainingMode={trainingMode} />
      <RelatedTrainingCourses trainingMode={trainingMode} />
      <TrainingFAQ trainingMode={trainingMode} />
      <TrainingCTA trainingMode={trainingMode} />
    </>
  );
}
