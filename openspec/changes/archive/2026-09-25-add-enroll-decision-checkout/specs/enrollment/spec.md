## ADDED Requirements

### Requirement: Enroll decision by price

The system SHALL decide, based solely on a course's price, whether enrolling an authenticated user creates an enrollment record directly or returns a simulated checkout instead. A price of 0 SHALL result in direct enrollment. A price greater than 0 SHALL result in a simulated checkout being returned, and SHALL NOT create an enrollment record.

#### Scenario: Free course enrolls directly

- **WHEN** an authenticated user requests to enroll in a course with price 0
- **THEN** an enrollment record is created and the response confirms enrollment, with no checkout involved

#### Scenario: Paid course returns simulated checkout

- **WHEN** an authenticated user requests to enroll in a course with price greater than 0
- **THEN** no enrollment record is created and the response contains a simulated `checkoutUrl` instead

### Requirement: Enroll endpoint resolves course by slug

The system SHALL expose `POST /api/courses/[slug]/enroll` that resolves the target course by its slug, requires an authenticated caller, and applies the enroll decision (see "Enroll decision by price"). Retrying enrollment in an already-enrolled free course SHALL NOT create a second enrollment record.

Note: the dynamic route segment's *folder name* in this Next.js App Router codebase is `[courseId]` (Next.js requires every route under the shared `/api/courses/*` prefix at this depth to use the same segment name, and this route replaces what was a courseId-keyed handler at that same path) — the *value* the endpoint expects and resolves against `courses.slug` is a slug either way, and the externally observable path shape (`/api/courses/{value}/enroll`) is unchanged.

#### Scenario: Successful free enrollment via slug endpoint

- **WHEN** an authenticated, not-yet-enrolled user calls `POST /api/courses/[slug]/enroll` for a published, free course
- **THEN** an enrollment record linking that user and course is created

#### Scenario: Paid course via slug endpoint never writes an enrollment

- **WHEN** an authenticated user calls `POST /api/courses/[slug]/enroll` for a published, paid course
- **THEN** no enrollment record is created for that user and course, and the response includes a simulated `checkoutUrl`

#### Scenario: Retry does not duplicate enrollment

- **WHEN** an authenticated user who is already enrolled in a free course calls `POST /api/courses/[slug]/enroll` again for that same course
- **THEN** no second enrollment record is created
