## Purpose

Presents the public listing of published courses and the course detail page that visitors and prospective students use to discover and evaluate a course before enrolling.

## Requirements

### Requirement: Public catalog of published courses

The system SHALL show a catalog listing every course in `published` status to all visitors, signed in or not. Courses in `draft` status SHALL NOT appear. Each catalog entry SHALL show the course title, cover image, author display name, and aggregate rating.

#### Scenario: Visitor browses catalog

- **WHEN** any visitor opens the catalog
- **THEN** all published courses are listed and no draft courses appear

#### Scenario: Newly published course appears

- **WHEN** an author publishes a course
- **THEN** it appears in the catalog without further action

#### Scenario: Empty catalog

- **WHEN** no courses are published
- **THEN** the catalog renders an empty state rather than an error

### Requirement: Course detail page

The system SHALL provide a detail page for a published course showing its title, description, cover image, author profile summary, module and lesson outline (titles only), aggregate rating, review list, and an enrollment control. Lesson bodies and videos SHALL NOT be shown on this page to users who are not enrolled and are not the owner.

#### Scenario: Visitor views published course detail

- **WHEN** any visitor opens a published course's detail page
- **THEN** the description, author, lesson outline, and reviews are visible, and lesson content is not

#### Scenario: Enrolled user sees enrolled state

- **WHEN** a user who is already enrolled opens the course detail page
- **THEN** the enrollment control shows an enrolled state and links into the lesson content

#### Scenario: Draft course detail hidden

- **WHEN** a non-owner opens the detail URL of a draft course
- **THEN** the system responds as if the course does not exist

### Requirement: Course detail page metadata, structured data, and accessibility

The system SHALL generate page metadata (title, description, canonical URL, Open Graph, and Twitter card) for the course detail page from the course's own data, and SHALL emit `schema.org` `Course` JSON-LD including name, description, url, image, provider, author, and aggregate rating when reviews exist. The page SHALL expose a single `h1` (course title), a locked lesson's status SHALL be conveyed to assistive technology as text rather than through an emoji alone, and the cover image SHALL have a descriptive `alt`.

#### Scenario: Metadata reflects the course

- **WHEN** a course detail page is requested for a published course
- **THEN** the response's `<title>` and description meta tag are derived from that course's title and description, not a generic placeholder

#### Scenario: Structured data present for a rated course

- **WHEN** a course has at least one review
- **THEN** the page's `Course` JSON-LD includes an `aggregateRating` with the course's average rating and review count

#### Scenario: Locked lesson announced to screen readers

- **WHEN** a visitor who is neither enrolled nor the owner views the lesson outline
- **THEN** each locked lesson communicates its locked state through text available to assistive technology, not only through an emoji icon

#### Scenario: Course not found metadata does not conflict with 404 handling

- **WHEN** a course slug does not resolve to a visible course
- **THEN** `generateMetadata` defers to the route's `not-found` handling rather than asserting its own title

### Requirement: Aggregate rating display

The system SHALL compute and display each course's average rating and review count from its reviews. A course with no reviews SHALL display as unrated rather than as zero.

#### Scenario: Course with reviews

- **WHEN** a course has three reviews with ratings 4, 5, and 3
- **THEN** the course shows an average of 4.0 and a count of 3

#### Scenario: Course with no reviews

- **WHEN** a course has no reviews
- **THEN** the course shows "no ratings yet" and is not treated as rating 0
