## Purpose

Lets a student find relevant published courses by describing what they want to learn in natural language, instead of only browsing the full catalog listing.

## ADDED Requirements

### Requirement: Semantic search over published courses
The system SHALL accept a free-text query and return published courses ranked by semantic similarity to that query. Draft courses SHALL NOT be returned, regardless of similarity score. An empty or whitespace-only query SHALL return no results without making an embedding request.

#### Scenario: Query matches a published course by topic
- **WHEN** a visitor searches for a topic covered by a published course's title, description, or lesson content
- **THEN** that course appears in the results, ranked among the most similar matches

#### Scenario: Draft courses are excluded
- **WHEN** a search query is semantically similar to a course that is still in `draft` status
- **THEN** that draft course SHALL NOT appear in the results

#### Scenario: Empty query
- **WHEN** a visitor submits an empty or whitespace-only search query
- **THEN** the system SHALL return an empty result list

### Requirement: Low-relevance results are excluded
The system SHALL discard candidate matches whose similarity to the query falls below a minimum relevance threshold, so an unrelated query returns no results rather than the full catalog re-ranked by noise.

#### Scenario: Query unrelated to any course content
- **WHEN** a visitor searches for a topic no published course covers
- **THEN** the system SHALL return no results rather than low-relevance courses

### Requirement: Search result fields
Each search result SHALL expose only the same publicly readable course fields available on the catalog: title, slug, description, and price. Search SHALL NOT expose draft-only or enrollment-gated content (lesson bodies, videos) through result data.

#### Scenario: Result shape matches public course fields
- **WHEN** a search returns a matching course
- **THEN** the result includes the course's title, slug, description, and price, and no lesson content

### Requirement: Course embeddings stay current with publishing
The system SHALL (re)compute a course's search embedding whenever the course is created or transitions into `published` status, using the course's title, description, and the titles of its modules and lessons. A course SHALL become eligible to appear in search results only after its embedding has been computed following a publish.

#### Scenario: New course is created
- **WHEN** a course is created, in any status
- **THEN** the system SHALL compute its search embedding from its current title and description

#### Scenario: Course is published
- **WHEN** a `draft` course transitions to `published` status
- **THEN** the system SHALL recompute its search embedding from its current title, description, and module/lesson titles

#### Scenario: Unrelated edit to an already-published course
- **WHEN** a `published` course is edited in a way that does not change its status (e.g. price update)
- **THEN** the system is not required to recompute its embedding as part of that edit
