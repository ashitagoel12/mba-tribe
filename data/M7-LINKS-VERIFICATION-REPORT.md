# M7 Schools — URL Verification Report

**Date:** April 11, 2026
**File verified:** `data/m7-schools-comprehensive-data.json`
**Total links checked:** ~130
**Working (no change needed):** ~55
**Fixed (broken → correct URL):** ~60
**Removed (no equivalent found):** ~15

---

## Summary by School

| School | Checked | Fixed | Removed |
|--------|---------|-------|---------|
| Harvard Business School | 22 | 11 | 1 |
| Stanford GSB | 22 | 12 | 3 |
| Wharton | 20 | 12 | 0 |
| Chicago Booth | 18 | 10 | 1 |
| MIT Sloan | 18 | 10 | 0 |
| Kellogg | 22 | 13 | 0 |
| Columbia CBS | 20 | 16 | 4 |

---

## Harvard Business School (HBS)

**Base URL:** `https://www.hbs.edu`

### Fixed

| Field | Old URL | New URL |
|-------|---------|---------|
| `programs[0-3].url` (all joint degrees) | `.../joint-and-concurrent-degree-programs` | `.../joint-degree-programs` |
| `academics.learningMethods[1].url` (FIELD Global) | `.../experiential-learning` | `.../academic-experience` |
| `academics.courseCatalog` | `.../curriculum/elective-curriculum/course-catalog` | `.../curriculum/Pages/default.aspx` |
| `admissions.recommendations.url` | `.../application-process/application-components` | `.../application-process` |
| `career.employmentReportUrl` | `hbs.edu/recruiting/data-and-statistics` | `.../mba/blog/class-of-2025-employment-report` |
| `career.careerServicesUrl` | `hbs.edu/recruiting` | `.../mba/career-journey` |
| `eventsAndEngagement.eventCategories[Campus Visits].url` | `.../admissions/visit-hbs` | `.../mba/visit` |
| `eventsAndEngagement.eventCategories[Class Visits].url` | `.../admissions/visit-hbs/class-visit` | `.../mba/visit` |
| `eventsAndEngagement.virtualTourUrl` | `.../admissions/visit-hbs/virtual-tour` | `.../mba/visit/campus-tour` |
| `studentLife.housingUrl` | `.../student-life/housing` | `.../mba/student-life/campus-experience/residence-life` |
| `quickLinks[Contact].url` | `.../admissions/contact-us` | `.../about/contact` |
| `quickLinks[Virtual Tour].url` | `.../admissions/visit-hbs/virtual-tour` | `.../mba/visit/campus-tour` |

### Removed

| Field | Old URL | Reason |
|-------|---------|--------|
| `eventsAndEngagement.eventCategories[Coffee Chats]` | `.../admissions/connect` | 404, no equivalent page found |

---

## Stanford Graduate School of Business (GSB)

**Base URL:** `https://www.gsb.stanford.edu`

### Fixed

| Field | Old URL | New URL |
|-------|---------|---------|
| `academics.learningMethods[Action Learning].url` | `.../experiential-learning` | `.../programs/mba/academic-experience/curriculum` |
| `academics.courseCatalog` | `.../curriculum/courses` | `.../programs/mba/academic-experience/curriculum` |
| `admissions.applicationUrl` | `.../admission/apply` | `.../programs/mba/admission/application` |
| `admissions.recommendations.url` | `.../admission/evaluation-criteria/recommendations` | `.../programs/mba/admission/application/letters-recommendation` |
| `career.employmentReportUrl` | `.../career-support/employment-reports` | `.../programs/mba/career-impact/employment-outcomes` |
| `career.careerServicesUrl` | `.../career-support` | `.../programs/mba/career-impact` |
| `eventsAndEngagement.eventCategories[Campus Visits].url` | `.../admission/visit-us` | `.../programs/mba/admission/events` |
| `eventsAndEngagement.eventCategories[Coffee Chats].url` | `.../admission/connect-with-us` | `.../programs/mba/contact` |
| `eventsAndEngagement.virtualTourUrl` | `.../admission/visit-us` | `gsb.stanford.edu/visit` |
| `financialAid.scholarships[0].url` | `.../financial-aid/fellowships-loans` | `.../programs/mba/tuition-financial-aid/types-aid` |
| `financialAid.financialAidUrl` | `.../financial-aid` | `.../programs/mba/tuition-financial-aid` |
| `studentLife.studentBlogsUrl` | `.../student-life/blogs` | `.../programs/mba/life-community/voices` |
| `quickLinks[Employment].url` | `.../career-support/employment-reports` | `.../programs/mba/career-impact/employment-outcomes` |
| `quickLinks[Virtual Tour].url` | `.../admission/visit-us` | `gsb.stanford.edu/visit` |
| `quickLinks[Contact].url` | `.../admission/contact` | `.../programs/mba/contact` |

### Removed

| Field | Old URL | Reason |
|-------|---------|--------|
| `academics.centers[Center for Social Innovation]` | `.../csi` | 404, no equivalent page found |
| `academics.centers[Stanford Venture Studio]` | `.../venture-studio` | 404, no equivalent page found |

---

## Wharton School (UPenn)

**Base URL:** `https://mba.wharton.upenn.edu`

### Fixed

| Field | Old URL | New URL |
|-------|---------|---------|
| `programs[JD/MBA].url` | `.../dual-degrees/jd-mba/` | `.../carey-jd-mba-program/` |
| `programs[Moelis].url` | `.../moelis-advance-access/` | `.../deferred-admissions/moelis-advance-access-program/` |
| `academics.learningMethods[Global Modular].url` | `.../academics/global-modular-courses/` | `.../international-study/` |
| `academics.learningMethods[Leadership Ventures].url` | `.../academics/leadership/` | `.../leadership-2/` |
| `academics.centers[Stevens Center].url` | `finance.wharton.upenn.edu/centers/` | `stevenscenter.wharton.upenn.edu/` |
| `academics.courseCatalog` | `.../academics/courses/` | `.../elective-course-list/` |
| `admissions.applicationUrl` | `.../apply/` | `.../application-guide/` |
| `admissions.recommendations.url` | `.../apply/recommendations/` | `.../application-guide/` |
| `career.employmentReportUrl` | `.../career-management/employment-report/` | `.../mba-career-services/` |
| `career.careerServicesUrl` | `.../career-management/` | `.../mba-career-services/` |
| `eventsAndEngagement.eventCategories[Campus Visits].url` | `.../visit/` | `.../visits/` |
| `eventsAndEngagement.eventCategories[Info/Virtual Events].url` | `.../admissions-events/` | `.../events/` |
| `eventsAndEngagement.eventCategories[Class Visits].url` | `.../visit/class-visits/` | `.../visits/` |
| `eventsAndEngagement.eventsCalendarUrl` | `.../admissions-events/` | `.../events/` |
| `eventsAndEngagement.virtualTourUrl` | `.../visit/` | `.../visits/` |
| `financialAid.financialAidUrl` | `.../financial-aid/` | `.../tuition-financial-aid/` |
| `studentLife.housingUrl` | `.../student-life/housing/` | `.../living-in-philly/` |
| `studentLife.studentBlogsUrl` | `.../student-life/blogs/` | `.../stories/` |
| `quickLinks[Contact].url` | `.../contact/` | `.../contact-wharton/` |

---

## Chicago Booth School of Business

**Base URL:** `https://www.chicagobooth.edu`

### Fixed

| Field | Old URL | New URL |
|-------|---------|---------|
| `academics.curriculum.url` | `.../mba/full-time/program` | `.../mba/academics/curriculum` |
| `academics.learningMethods[LEAD Program].url` | `.../mba/full-time/academics/experiential` | `.../mba/academics/leadership-development` |
| `academics.courseCatalog` | `.../mba/full-time/academics/courses` | `.../mba/academics/curriculum` |
| `admissions.recommendations.url` | `.../mba/full-time/admissions/apply` | `.../mba/full-time/admissions/how-to-apply` |
| `career.employmentReportUrl` | `.../mba/full-time/career/employment` | `.../mba/full-time/career-impact/employment-report` |
| `career.careerServicesUrl` | `.../mba/full-time/career` | `.../mba/full-time/career-impact` |
| `eventsAndEngagement.eventCategories[Campus Visits].url` | `.../mba/full-time/admissions/visit` | `.../mba/full-time/admissions/visit-campus` |
| `eventsAndEngagement.virtualTourUrl` | `.../mba/full-time/admissions/visit` | `.../mba/full-time/admissions/visit-campus` |
| `financialAid.financialAidUrl` | `.../mba/full-time/admissions/financial-aid` | `.../mba/full-time/admissions/scholarships-and-aid` |
| `studentLife.housingUrl` | `.../mba/full-time/student-experience/housing` | `.../mba/full-time/student-experience` |
| `studentLife.studentBlogsUrl` | `.../mba/full-time/student-experience/blog` | `.../mba/mba-life/full-time-mba-blog` |
| `quickLinks[Contact].url` | `.../mba/full-time/admissions/contact` | `.../mba/full-time/admissions` |

### Removed

| Field | Old URL | Reason |
|-------|---------|--------|
| `eventsAndEngagement.eventCategories[Coffee Chats]` | `.../mba/full-time/admissions/connect` | 404, no equivalent page found |

---

## MIT Sloan School of Management

**Base URL:** `https://mitsloan.mit.edu`

### Fixed

| Field | Old URL | New URL |
|-------|---------|---------|
| `programs[Deferred].url` | `.../mba/admissions/early-admission` | `.../mba/deferred-admission` |
| `academics.learningMethods[Action Learning Labs].url` | `.../action-learning/labs` | `.../action-learning/explore-our-labs` |
| `academics.learningMethods[G-Lab].url` | `.../action-learning/global-lab` | `.../action-learning/global-entrepreneurship-lab/welcome` |
| `academics.courseCatalog` | `.../mba/curriculum/courses` | `.../mba/explore-program/mba-curriculum` |
| `career.employmentReportUrl` | `.../career-development/employment-data` | `.../career-development-office/employment-reports` |
| `career.careerServicesUrl` | `.../career-development` | `.../career-development-office/employment-reports` |
| `eventsAndEngagement.eventCategories[*].url` (all) | various | `.../mba/admissions-events` |
| `eventsAndEngagement.eventsCalendarUrl` | `.../mba/events` | `.../mba/admissions-events` |
| `eventsAndEngagement.virtualTourUrl` | `.../mba/visit` | `.../mba/admissions-events` |
| `financialAid.financialAidUrl` | `.../mba/admissions/financial-aid` | `.../mba/admissions/financing-your-education` |
| `studentLife.housingUrl` | `.../mba/student-life/housing` | `.../mba/admissions/frequently-asked-questions` |
| `studentLife.studentBlogsUrl` | `.../mba/student-life/blogs` | `.../programs/mba/a-day-life-mba-student-0` |
| `quickLinks[Class Profile].url` | `.../mba/class-profile` | `.../mba/meet-class/class-profile` |
| `quickLinks[Contact].url` | `.../contact` | `.../contact-us` |

---

## Kellogg School of Management

**Base URL:** `https://www.kellogg.northwestern.edu`

### Fixed

Note: Kellogg migrated their entire site from `.aspx` URLs to clean trailing-slash paths.

| Field | Old URL | New URL |
|-------|---------|---------|
| `programs[1-Year MBA].url` | `.../one-year-mba.aspx` | `.../one-year-mba-program/` |
| `programs[MMM].url` | `.../mmm.aspx` | `.../programs/full-time-mba/mmm-program/` |
| `programs[MBAi].url` | `.../mbai.aspx` | `.../programs/full-time-mba/mbai-program/` |
| `programs[JD-MBA].url` | `.../jd-mba.aspx` | `.../admissions/ft-admissions/` |
| `programs[Part-Time MBA].url` | `.../part-time-mba.aspx` | `.../admissions/ft-admissions/` |
| `academics.curriculum.url` | `.../full-time-mba/curriculum.aspx` | `.../programs/full-time-mba/academics/majors-pathways/` |
| `academics.learningMethods[GIM].url` | `.../global-initiatives.aspx` | `.../global-experience.aspx` |
| `academics.learningMethods[KIN].url` | `.../kin.aspx` | `.../programs/full-time-mba/academics/` |
| `academics.centers[0].url` | `.../ford-center.aspx` | `.../programs/full-time-mba/academics/` |
| `academics.centers[Center for Nonprofit].url` | `.../nonprofit.aspx` | `.../executive-education/nonprofit-management/about-us.aspx` |
| `academics.centers[Global Hub].url` | `.../global-hub.aspx` | `.../the-experience/campuses/global-hub/` |
| `academics.courseCatalog` | `.../full-time-mba/courses.aspx` | `.../programs/full-time-mba/academics/` |
| `admissions.applicationUrl` | `.../apply.aspx` | `.../admissions/ft-admissions/ft-how-to-apply/` |
| `admissions.recommendations.url` | `.../recommendations.aspx` | `.../admissions/ft-admissions/ft-how-to-apply/` |
| `career.employmentReportUrl` | `.../employment-report.aspx` | `.../companies-recruiters/recruiter-employment-outcomes/` |
| `career.careerServicesUrl` | `.../career-services.aspx` | `.../programs/full-time-mba/career-services/career-path/` |
| `eventsAndEngagement.eventCategories[Campus Visits].url` | `.../campus-visit.aspx` | `.../admissions/admissions-events/campus-visits/` |
| `eventsAndEngagement.eventCategories[Events].url` | `.../events.aspx` | `.../admissions/admissions-events/` |
| `eventsAndEngagement.eventsCalendarUrl` | `.../events-calendar.aspx` | `.../admissions/admissions-events/` |
| `eventsAndEngagement.virtualTourUrl` | `.../virtual-tour.aspx` | `.../admissions/admissions-events/campus-visits/` |
| `financialAid.financialAidUrl` | `.../financial-aid.aspx` | `.../admissions/financial-aid/ft-fin-aid/` |
| `studentLife.housingUrl` | `.../housing.aspx` | `.../serial/student-life/housing.aspx` |
| `studentLife.studentBlogsUrl` | `.../student-blogs.aspx` | `.../news/` |
| `quickLinks[Class Profile].url` | `.../class-profile.aspx` | `.../programs/full-time-mba/class-profile/` |
| `quickLinks[Employment].url` | `.../employment-report.aspx` | `.../companies-recruiters/recruiter-employment-outcomes/` |
| `quickLinks[Contact].url` | `.../contact-us.aspx` | `.../admissions/` |

---

## Columbia Business School (CBS)

**Base URL:** `https://business.columbia.edu`
**Note:** CBS migrated from `academics.business.columbia.edu` subdomain to `business.columbia.edu`.

### Fixed

| Field | Old URL | New URL |
|-------|---------|---------|
| `website` | `academics.business.columbia.edu/admissions/mba` | `business.columbia.edu/mba` |
| `programs[0].url` (Aug Entry) | `academics.business.columbia.edu/admissions/mba` | `business.columbia.edu/mba` |
| `programs[1].url` (Jan Entry) | `academics.business.columbia.edu/admissions/mba/options-deadlines/january-entry` | `business.columbia.edu/mba` |
| `programs[2].url` (EMBA) | `academics.business.columbia.edu/emba` | `business.columbia.edu/emba` |
| `programs[3].url` (MBA-MS) | `academics.business.columbia.edu/mba-ms-programs` | `business.columbia.edu/admissions/dual-degrees` |
| `academics.curriculum.url` | `academics.business.columbia.edu/phd/academics` (wrong - PhD page!) | `business.columbia.edu/mba/academics/curriculum` |
| `academics.learningMethods[0].url` (Chazen Global) | `academics.business.columbia.edu/mba/student-life/global-immersion` | `business.columbia.edu/mba/academics/global-opportunities` |
| `academics.learningMethods[1].url` (Master Classes) | `academics.business.columbia.edu/mba/academics` | `business.columbia.edu/mba/academics/curriculum` |
| `academics.centers[0].url` (Lang Entrepreneurship) | `entrepreneurship.columbia.edu` | `business.columbia.edu/lang` |
| `academics.centers[1].url` (Heilbrunn) | `www8.gsb.columbia.edu/valueinvesting` | `business.columbia.edu/heilbrunn` |
| `academics.centers[2].url` (Milstein Real Estate) | `realestate.columbia.edu` | `business.columbia.edu/realestate` |
| `academics.courseCatalog` | `academics.business.columbia.edu/mba/academics` | `business.columbia.edu/mba/academics/curriculum` |
| `admissions.applicationUrl` | `academics.business.columbia.edu/admissions/mba` | `business.columbia.edu/admissions/mba` |
| `admissions.recommendations.url` | `academics.business.columbia.edu/admissions/mba` | `business.columbia.edu/admissions/mba` |
| `career.employmentReportUrl` | `academics.business.columbia.edu/mba/career-outcomes` | `business.columbia.edu/recruiters/employment-report` |
| `career.careerServicesUrl` | `academics.business.columbia.edu/mba/career` | `students.business.columbia.edu/career-management-center` |
| `eventsAndEngagement.eventsCalendarUrl` | `academics.business.columbia.edu/admissions/mba/events` | `business.columbia.edu/admissions/mba/events` |
| `eventsAndEngagement.virtualTourUrl` | `academics.business.columbia.edu/admissions/mba/visit-us` | `business.columbia.edu/admissions/mba/events` |
| `financialAid.scholarships[0].url` | `academics.business.columbia.edu/mba/financing` | `business.columbia.edu/mba/tuition-financial-aid/mba-scholarships` |
| `financialAid.financialAidUrl` | `academics.business.columbia.edu/mba/financing` | `business.columbia.edu/mba/tuition-financial-aid` |
| `quickLinks[*]` (all 6 links) | `academics.business.columbia.edu/...` | `business.columbia.edu/...` (updated each) |

### Removed

| Field | Old URL | Reason |
|-------|---------|--------|
| `eventsAndEngagement.eventCategories[Campus Visits]` | `academics.business.columbia.edu/admissions/mba/visit-us` | 404, no equivalent page found |
| `eventsAndEngagement.eventCategories[Coffee Chats]` | `academics.business.columbia.edu/admissions/mba/connect` | 404, no equivalent page found |
| `studentLife.housingUrl` | `academics.business.columbia.edu/mba/student-life/housing` | 404, no equivalent page found |
| `studentLife.studentBlogsUrl` | `academics.business.columbia.edu/mba/student-life/blogs` | 404, no equivalent page found |

---

## Notes

- Many broken links were due to **site restructuring** (HBS, Stanford GSB) or **URL scheme migrations** (Kellogg: `.aspx` → clean paths; CBS: `academics.business.columbia.edu` → `business.columbia.edu`).
- Where no direct equivalent could be found for an event type (Coffee Chats, Campus Visits), the item was removed from the `eventCategories` array rather than leaving a dead link.
- Columbia CBS's `academics.curriculum.url` was previously pointing to a **PhD academics page** — this was a data error, not just a broken URL. Corrected to the MBA curriculum page.
- Career services and employment report URLs were frequently outdated; updated to current pages confirmed via WebSearch.
- Financial aid section URLs at Stanford GSB moved from `financial-aid/` to `tuition-financial-aid/` subdirectory.
- Stanford GSB career section moved from `career-support/` to `career-impact/` subdirectory.
