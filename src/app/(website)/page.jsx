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
import { JsonLd } from "@/components/seo/JsonLd";
import { faqs } from "@/data/faqs";
import { faqSchema, pageMetadata, webPageSchema } from "@/lib/seo";

const TITLE = "TechOTD Academy | IT Training Institute in Noida";
const DESCRIPTION =
  "TechOTD Academy is an IT training institute in Noida with live online, classroom and hybrid courses in full stack, React, Python and AI, plus career support.";

export const metadata = pageMetadata({
  // absolute: the layout's "%s | TechOTD Academy" template would repeat the name
  absoluteTitle: TITLE,
  openGraphTitle: "TechOTD Academy — IT Training Institute in Noida | Learn. Build. Grow.",
  description: DESCRIPTION,
  path: "/",
});

export default function Home() {
  return (
    <>
      <JsonLd
        data={[
          webPageSchema({ name: TITLE, description: DESCRIPTION, path: "/", aboutOrganization: true }),
          faqSchema(faqs),
        ]}
      />
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
