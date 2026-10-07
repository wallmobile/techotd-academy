import { HeroSection } from "@/components/home/HeroSection";
import { ImpactCreated } from "@/components/home/ImpactCreated";
import { PopularCourses } from "@/components/home/PopularCourses";
import { LearningModes } from "@/components/home/LearningModes";
import { WhyTechOTD } from "@/components/home/WhyTechOTD";
import { LearningJourney } from "@/components/home/LearningJourney";
import { PracticalProjects } from "@/components/home/PracticalProjects";
import { UpcomingBatches } from "@/components/home/UpcomingBatches";
import { LiveClasses } from "@/components/home/LiveClasses";
import { CareerJourney } from "@/components/home/CareerJourney";
import { CareerSupport } from "@/components/home/CareerSupport";
import { HiringPartners } from "@/components/home/HiringPartners";
import { TrainersSection } from "@/components/home/TrainersSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { CampusExperience } from "@/components/home/CampusExperience";
import { LearningResources } from "@/components/home/LearningResources";
import { FAQSection } from "@/components/home/FAQSection";
import { FinalCTA } from "@/components/home/FinalCTA";

export const metadata = {
  title: "TechOTD Academy | Learn. Build. Grow.",
  description:
    "Learn industry-ready technology skills through expert-led online and classroom training, practical projects and career-focused learning.",
};

export default function Home() {
  return (
    <>
      <HeroSection />
      <ImpactCreated />
      {/* Learning Paths section hidden: <LearningCategories /> */}
      <PopularCourses />
      <WhyTechOTD />
      <LearningModes />
      <LearningJourney />
      <PracticalProjects />
      <LiveClasses />
      <UpcomingBatches />
      <TrainersSection />
      <CareerJourney />
      <CareerSupport />
      <HiringPartners />
      <TestimonialsSection />
      <CampusExperience />
      <LearningResources />
      <FAQSection />
      <FinalCTA />
    </>
  );
}
