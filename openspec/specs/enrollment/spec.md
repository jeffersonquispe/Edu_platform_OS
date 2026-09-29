## Purpose

Handles a user joining a published course for free and the access to lesson content that enrollment grants.

## Requirements

### Requirement: Free enrollment in a published course

The system SHALL allow an authenticated user to enroll in a `published` course with a single action, at no cost. Enrollment SHALL create one enrollment record linking the user and the course with status `active`. A user SHALL NOT be able to enroll in the same course twice, nor enroll in a `draft` course.

#### Scenario: Successful enrollment

- **WHEN** an authenticated user who is not yet enrolled chooses to enroll in a published course
- **THEN** an `active` enrollment record is created and the user gains access to the course's lessons

#### Scenario: Duplicate enrollment prevented

- **WHEN** an already-enrolled user attempts to enroll in the same course again
- **THEN** no second record is created and the user is shown as already enrolled

#### Scenario: Enrollment requires sign-in

- **WHEN** an unauthenticated visitor attempts to enroll
- **THEN** they are prompted to sign in or register, and no enrollment is created

#### Scenario: Cannot enroll in a draft

- **WHEN** a request attempts to enroll a user in a course that is in `draft` status
- **THEN** the enrollment is rejected

### Requirement: Enrolled access to lesson content

The system SHALL grant a user read access to every lesson's body text and video in a course if and only if that user is enrolled in the course or is the course owner. Non-enrolled users SHALL see only the lesson outline.

#### Scenario: Enrolled user reads a lesson

- **WHEN** an enrolled user opens a lesson in that course
- **THEN** the lesson's Markdown body and embedded YouTube video are shown

#### Scenario: Non-enrolled user blocked from lesson content

- **WHEN** a signed-in user who is not enrolled requests a lesson's content in that course
- **THEN** the content is not returned and the user is directed to the enrollment control

#### Scenario: Owner previews own course content

- **WHEN** a course owner opens a lesson in their own course without an enrollment record
- **THEN** the lesson content is shown

### Requirement: Learner's enrolled courses

The system SHALL let a signed-in user see the list of courses they are enrolled in, separate from courses they author.

#### Scenario: User views their learning list

- **WHEN** a signed-in user opens their learning dashboard
- **THEN** every course they have an `active` enrollment in is listed, and courses they only authored are not

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
