## ADDED Requirements

### Requirement: Catalog text and price filtering

The system SHALL let a visitor narrow the public catalog by a free-text query matched against course title or description, and by a price tier (`gratis` = price equals 0, `de pago` = price greater than 0, or no filter = all). Text and price filters SHALL be combinable. Filtering SHALL only ever narrow the set of courses already visible under the "Public catalog of published courses" requirement — it SHALL NOT be the mechanism that hides draft courses; that visibility guarantee is enforced independently of the filter, for every visitor, regardless of which filters are applied or omitted.

#### Scenario: Text query matches title or description

- **WHEN** a visitor searches with text that matches the title or description of some published courses and not others
- **THEN** only the matching courses are shown

#### Scenario: Free price filter

- **WHEN** a visitor applies the "gratis" price filter
- **THEN** only courses with price equal to 0 are shown

#### Scenario: Paid price filter

- **WHEN** a visitor applies the "de pago" price filter
- **THEN** only courses with price greater than 0 are shown

#### Scenario: No courses match the applied filters

- **WHEN** the combination of text query and price filter matches no published course
- **THEN** the catalog shows an empty result list, not an error

#### Scenario: Draft course never appears regardless of filters

- **WHEN** any visitor queries the public catalog, with or without a text query or price filter applied
- **THEN** a course in `draft` status never appears in the results, because catalog row visibility is enforced independently of which filters the request carries
