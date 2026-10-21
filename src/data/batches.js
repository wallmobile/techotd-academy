/**
 * Sample/demo batch schedule. Each batch references a course by
 * `courseSlug` only — title, category, level and duration are derived
 * from courses.js at render time rather than duplicated here.
 *
 * `startsOn` is an ISO date (YYYY-MM-DD) used by UI that needs to break the
 * date apart; `startDate` is the human-readable form shown everywhere else.
 * The dates and timings below are design-phase placeholders, NOT confirmed
 * schedules. While `datesTba` is true the catalog shows "Dates to be announced"
 * and "Timing to be announced" instead of them (src/lib/catalog.js); an admin
 * setting a real start date / schedule for the batch replaces both.
 * `status` uses only states the data honestly supports — no seat counts or
 * urgency claims ("Filling Fast") are made since no live inventory exists yet.
 */

export const batches = [
  {
    id: "full-stack-development-01",
    courseSlug: "full-stack-development",
    mode: "Live Online",
    schedule: "Mon – Fri • 7:00 PM",
    startsOn: "2026-10-19",
    startDate: "19 Oct 2026",
    status: "Upcoming",
    datesTba: true,
    location: "Online",
  },
  {
    id: "mern-stack-development-01",
    courseSlug: "mern-stack-development",
    mode: "Classroom",
    schedule: "Sat – Sun • 10:00 AM",
    startsOn: "2026-10-24",
    startDate: "24 Oct 2026",
    status: "Upcoming",
    datesTba: true,
    location: "Classroom — location shared on enrollment",
  },
  {
    id: "react-development-01",
    courseSlug: "react-development",
    mode: "Live Online",
    schedule: "Mon – Fri • 8:00 PM",
    startsOn: "2026-10-26",
    startDate: "26 Oct 2026",
    status: "Upcoming",
    datesTba: true,
    location: "Online",
  },
  {
    id: "python-development-01",
    courseSlug: "python-development",
    mode: "Classroom",
    schedule: "Sat – Sun • 11:00 AM",
    startsOn: "2026-10-31",
    startDate: "31 Oct 2026",
    status: "Upcoming",
    datesTba: true,
    location: "Classroom — location shared on enrollment",
  },
  {
    id: "cloud-devops-01",
    courseSlug: "cloud-devops",
    mode: "Live Online",
    schedule: "Tue – Thu • 8:00 PM",
    startsOn: "2026-10-27",
    startDate: "27 Oct 2026",
    status: "Upcoming",
    datesTba: true,
    location: "Online",
  },
  {
    id: "nextjs-development-01",
    courseSlug: "nextjs-development",
    mode: "Live Online",
    schedule: "Sat – Sun • 6:00 PM",
    startsOn: "2026-11-07",
    startDate: "07 Nov 2026",
    status: "Upcoming",
    datesTba: true,
    location: "Online",
  },
  {
    id: "ai-generative-ai-01",
    courseSlug: "ai-generative-ai",
    mode: "Live Online",
    schedule: "Tue – Thu • 7:30 PM",
    startsOn: "2026-11-10",
    startDate: "10 Nov 2026",
    status: "Upcoming",
    datesTba: true,
    location: "Online",
  },
  {
    id: "data-analytics-01",
    courseSlug: "data-analytics",
    mode: "Live Online",
    schedule: "Mon – Fri • 6:00 PM",
    startsOn: "2026-11-02",
    startDate: "02 Nov 2026",
    status: "Upcoming",
    datesTba: true,
    location: "Online",
  },
];

export function getBatchById(id) {
  return batches.find((batch) => batch.id === id) || null;
}
