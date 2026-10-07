/**
 * Training mode catalog for /training/[mode]. `relatedCourses` stores
 * course slugs only — full course data is derived from courses.js at
 * render time so nothing is duplicated.
 */

const onlineSupport = [
  "Live doubt resolution during sessions",
  "Recorded session access for revision",
  "Digital learning resource library",
  "Remote project code reviews",
  "Career-oriented learning guidance",
];

const onlineLearningExperience = [
  { step: "01", title: "Understand", description: "Build a clear foundation through live video sessions." },
  { step: "02", title: "Practice", description: "Apply concepts through screen-shared guided exercises." },
  { step: "03", title: "Build", description: "Work on practical projects with remote trainer support." },
  { step: "04", title: "Review", description: "Get feedback in live sessions and recorded walkthroughs." },
  { step: "05", title: "Apply", description: "Carry the skills into real, remote-ready applied work." },
];

const offlineSupport = [
  "In-person mentor availability",
  "On-site lab and equipment access",
  "Face-to-face doubt resolution",
  "Peer study groups on location",
  "Career-oriented learning guidance",
];

const offlineLearningExperience = [
  { step: "01", title: "Understand", description: "Build a clear foundation through in-person lectures." },
  { step: "02", title: "Practice", description: "Apply concepts through hands-on lab exercises." },
  { step: "03", title: "Build", description: "Work on practical projects with a trainer physically present." },
  { step: "04", title: "Review", description: "Get direct, face-to-face feedback from trainers and peers." },
  { step: "05", title: "Apply", description: "Carry the skills into real, applied work with mentor sign-off." },
];

const classroomSupport = [
  "Scheduled trainer office hours",
  "Peer study groups",
  "In-person project reviews",
  "Doubt resolution during sessions",
  "Career-oriented learning guidance",
];

const classroomLearningExperience = [
  { step: "01", title: "Understand", description: "Build a clear foundation through structured classroom lectures." },
  { step: "02", title: "Practice", description: "Apply concepts through in-class guided exercises." },
  { step: "03", title: "Build", description: "Work through scheduled, milestone-based project work." },
  { step: "04", title: "Review", description: "Get feedback from trainers and your peer group each session." },
  { step: "05", title: "Apply", description: "Carry the skills forward into a capstone application." },
];

const corporateSupport = [
  "Dedicated program coordinator",
  "Custom learning path support",
  "Team progress reporting",
  "Workshop facilitation",
  "Career-oriented upskilling guidance",
];

const corporateLearningExperience = [
  { step: "01", title: "Understand", description: "Build a foundation mapped to your team's actual roles." },
  { step: "02", title: "Practice", description: "Apply concepts through workshop exercises tied to real use cases." },
  { step: "03", title: "Build", description: "Work on team-based projects relevant to your organization." },
  { step: "04", title: "Review", description: "Track progress with reporting shared back to your L&D team." },
  { step: "05", title: "Apply", description: "Roll the skills directly into your team's existing workflows." },
];

export const trainingModes = [
  {
    slug: "online",
    title: "Online Training",
    shortTitle: "Online",
    shortDescription: "Live, instructor-led classes you can attend from anywhere.",
    description:
      "Online Training delivers live, instructor-led sessions over video, paired with digital learning resources and practical projects — so you can learn on a flexible schedule without giving up direct access to a trainer.",
    mode: "Online",
    icon: "ON",
    accent: "primary",
    suitableFor:
      "Suitable for learners who want live trainer access and structured sessions without needing to travel to a physical location.",
    features: [
      "Live instructor-led learning",
      "Remote access from anywhere",
      "Digital learning resources",
      "Flexible participation",
      "Practical projects",
    ],
    benefits: [
      "Learn from anywhere with a stable internet connection",
      "Attend live sessions without commuting",
      "Access recorded material and resources digitally",
      "Ask questions directly during live sessions",
    ],
    learningExperience: onlineLearningExperience,
    support: onlineSupport,
    idealFor: ["Working Professionals", "Career Switchers", "Remote Learners", "Self-Paced Learners"],
    faqs: [
      { question: "Do I need to attend at fixed times?", answer: "Yes, online training is live and instructor-led, so sessions follow a set schedule." },
      { question: "What do I need to join?", answer: "A stable internet connection and a computer are enough to join live sessions." },
      { question: "Is this different from a pre-recorded course?", answer: "Yes, this is live and interactive rather than a self-paced video course." },
    ],
    relatedCourses: ["react-development", "nextjs-development", "ai-generative-ai", "cloud-devops"],
  },
  {
    slug: "offline",
    title: "Offline Training",
    shortTitle: "Offline",
    shortDescription: "In-person learning with direct trainer interaction.",
    description:
      "Offline Training takes place in person, giving you direct, face-to-face access to trainers and hands-on guidance through practical sessions in a physical learning environment.",
    mode: "Offline",
    icon: "OF",
    accent: "secondary",
    suitableFor:
      "Suitable for learners who prefer in-person guidance and a physical space dedicated to focused, hands-on learning.",
    features: [
      "In-person learning",
      "Direct trainer interaction",
      "Practical sessions",
      "Classroom environment",
      "Guided learning",
    ],
    benefits: [
      "Get immediate, in-person feedback from trainers",
      "Learn alongside peers in the same room",
      "Work through problems with direct guidance",
      "A dedicated space for focused learning",
    ],
    learningExperience: offlineLearningExperience,
    support: offlineSupport,
    idealFor: ["Students", "Fresh Graduates", "Hands-On Learners"],
    faqs: [
      { question: "Where do offline sessions take place?", answer: "At a physical training location — exact location details are shared during enrollment." },
      { question: "Is this the same as Classroom Training?", answer: "It's closely related — Offline Training emphasizes in-person interaction, while Classroom Training emphasizes the structured schedule and journey." },
      { question: "Can I get help outside session hours?", answer: "Doubt resolution and trainer guidance are part of the learning support for this mode." },
    ],
    relatedCourses: ["full-stack-development", "mern-stack-development", "python-development", "data-analytics"],
  },
  {
    slug: "classroom",
    title: "Classroom Training",
    shortTitle: "Classroom",
    shortDescription: "A structured, scheduled classroom journey with peer learning.",
    description:
      "Classroom Training follows a structured schedule of trainer-led sessions, hands-on exercises and peer learning, giving you a clear, guided path from one topic to the next.",
    mode: "Classroom",
    icon: "CR",
    accent: "primary",
    suitableFor:
      "Suitable for learners who benefit from a fixed schedule, structured pacing, and learning alongside a peer group.",
    features: [
      "Structured classroom schedule",
      "Trainer-led sessions",
      "Hands-on exercises",
      "Peer learning",
      "Practical projects",
    ],
    benefits: [
      "Follow a clear, structured curriculum path",
      "Stay accountable with a fixed schedule",
      "Learn collaboratively with a peer group",
      "Build skills progressively, session by session",
    ],
    learningExperience: classroomLearningExperience,
    support: classroomSupport,
    idealFor: ["Students", "Fresh Graduates", "Structured Learners"],
    faqs: [
      { question: "How is the schedule structured?", answer: "Sessions follow a fixed, sequential schedule moving from foundational to advanced topics." },
      { question: "Will I learn with other students?", answer: "Yes, classroom training includes a peer group learning together." },
      { question: "Are there hands-on exercises?", answer: "Yes, each session pairs concepts with hands-on practice." },
    ],
    relatedCourses: ["full-stack-development", "python-development", "data-analytics", "mern-stack-development"],
  },
  {
    slug: "corporate",
    title: "Corporate Training",
    shortTitle: "Corporate",
    shortDescription: "Customized technology training for teams and organizations.",
    description:
      "Corporate Training is designed around a team or organization's specific needs — combining role-oriented curriculum, practical workshops and flexible delivery formats to help teams build relevant technology skills together.",
    mode: "Corporate",
    icon: "CT",
    accent: "secondary",
    suitableFor:
      "Suitable for organizations and L&D teams looking to upskill a group around specific roles or technology needs.",
    features: [
      "Organization-focused training",
      "Custom learning requirements",
      "Role-oriented curriculum",
      "Practical workshops",
      "Flexible delivery formats",
    ],
    benefits: [
      "Curriculum shaped around your team's actual needs",
      "Flexible delivery — online, offline or hybrid",
      "Role-oriented content for different functions",
      "Workshops built around practical, applied work",
    ],
    learningExperience: corporateLearningExperience,
    support: corporateSupport,
    idealFor: ["Teams & Organizations", "L&D Teams", "Enterprise Upskilling Programs"],
    faqs: [
      { question: "Can the curriculum be customized?", answer: "Yes, corporate training is designed around a team or organization's specific requirements." },
      { question: "What delivery formats are available?", answer: "Corporate training can be delivered online, offline or in a hybrid format depending on the team's needs." },
      { question: "Is this only for large companies?", answer: "No, this format is intended for any team or organization looking to upskill together, regardless of size." },
    ],
    relatedCourses: ["full-stack-development", "cloud-devops", "data-analytics", "ai-generative-ai"],
  },
];

export function getTrainingModeBySlug(slug) {
  return trainingModes.find((mode) => mode.slug === slug);
}
