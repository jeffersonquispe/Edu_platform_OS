## Purpose

Gives every page a floating conversational tutor, backed by the external Edy microservice, so a student can ask a question in text or voice without leaving the platform or searching the catalog manually.

## ADDED Requirements

### Requirement: Floating assistant widget available platform-wide
The system SHALL render a floating Edy assistant launcher on every page, collapsed by default, that opens into a panel with a text chat and a voice call mode.

#### Scenario: Widget is present on any page
- **WHEN** a visitor loads any page of the platform
- **THEN** the Edy launcher is visible and clicking it opens the assistant panel

#### Scenario: First open shows a welcome state
- **WHEN** the assistant panel is opened before any message has been sent
- **THEN** it SHALL show a welcome message and a set of suggested questions the visitor can pick instead of typing

### Requirement: Text messages are proxied server-side, never sent directly to Edy from the browser
The system SHALL relay text chat messages to the Edy microservice through a server-side Route Handler. The browser SHALL NOT hold or call the Edy microservice's base URL directly.

#### Scenario: Sending a text message
- **WHEN** a visitor submits a text message in the assistant panel
- **THEN** the browser calls this app's own `/api/edy/chat` endpoint, which forwards the message to the Edy microservice and returns its reply

#### Scenario: Edy is unreachable or times out
- **WHEN** the Edy microservice does not respond, responds with an error, or exceeds the proxy's timeout budget
- **THEN** the widget SHALL display an error message to the visitor instead of hanging indefinitely or silently failing

#### Scenario: No conversation history is persisted server-side
- **WHEN** a visitor reloads the page after exchanging messages with Edy
- **THEN** the previous conversation SHALL NOT be recovered — each text exchange begins a fresh conversation from Edy's perspective, and history exists only in the browser's in-memory widget state for the session

### Requirement: Voice calls connect the browser directly to a LiveKit room
The system SHALL issue a signed, short-lived LiveKit access token via a server-side Route Handler so the browser can join a voice room directly, without routing call audio through this app's own servers.

#### Scenario: Starting a voice call
- **WHEN** a visitor toggles the assistant into voice/call mode
- **THEN** the browser requests a token from this app's `/api/edy/voice-token` endpoint and joins the returned LiveKit room directly with the LiveKit client SDK

#### Scenario: Each call uses an isolated room
- **WHEN** a voice call is started
- **THEN** the system SHALL mint a new, distinct room for that call rather than reusing a room from a previous call or another concurrent visitor

#### Scenario: Ending a call
- **WHEN** a visitor toggles voice/call mode off, or closes the assistant panel while a call is active
- **THEN** the browser SHALL disconnect from the LiveKit room and release the microphone

### Requirement: Voice and text modes are mutually exclusive within the panel
The system SHALL present text chat and voice call as a single toggle within the same assistant panel, showing one mode's interface at a time.

#### Scenario: Switching to voice mode
- **WHEN** a visitor toggles "Llamada" while viewing the text chat
- **THEN** the panel SHALL replace the chat view with the call view; the chat history SHALL be retained and reappear when voice mode is toggled off

### Requirement: Assistant credentials and service location stay server-only
The system SHALL keep the Edy microservice's base URL and all LiveKit API credentials in server-only environment variables. Neither SHALL be embedded in client-side code or exposed through a `NEXT_PUBLIC_*` variable.

#### Scenario: Inspecting client-side network activity
- **WHEN** a visitor inspects network requests made by their browser while using the assistant
- **THEN** requests target only this app's own `/api/edy/*` endpoints (and, once a voice call is active, the LiveKit `wss://` room endpoint returned by the token endpoint) — never the Edy microservice's base URL directly, and no request carries a LiveKit API secret
