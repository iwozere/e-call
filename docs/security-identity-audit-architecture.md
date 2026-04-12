# Security, Identity, and Audit Architecture Guidance

This document defines security and solution architecture decisions for the video calling application. It is intended for a programming agent that will continue implementation of the system.

The application already supports guest-style room access by shared link for 1-to-1 calling. This document defines how audit logging, optional authentication, and room ownership concepts should be introduced without damaging the core low-friction product flow.

The strategic conclusion is:

- audit and logging are mandatory;
- authentication should be optional, not required for guest users;
- guest users must not receive fixed personal rooms;
- fixed personal rooms may be introduced later only for authenticated users with additional controls.

These decisions align with secure logging guidance from OWASP and with risk-based identity design principles used in digital identity and federation guidance [cite:50][cite:53][cite:56][cite:59].

## 1. Architectural position

The product has two distinct usage modes and they must remain separate in the architecture.

### Guest mode

Guest mode is designed for fast room creation and fast join by link. It is intentionally low-friction. A guest user should be able to create a temporary room and invite another participant without registration or persistent account state.

### Authenticated mode

Authenticated mode is optional and should be added only to support advanced features such as room ownership, room history, administration, abuse controls, and permanent personal rooms. It must not replace or block the guest flow.

This separation is important because forcing identity for every user would increase user friction without proportional benefit for the MVP invite-by-link scenario [cite:56][cite:59].

## 2. Mandatory audit and logging subsystem

The application must implement structured logging from the beginning. Logging is not optional because the system handles room creation, join attempts, session establishment, access failures, and potentially abuse events. OWASP logging guidance explicitly recommends logging security-relevant events and ensuring enough context exists to support incident investigation and operational response [cite:50][cite:53][cite:57].

The logging subsystem must be split into three logical categories:

| Log category | Purpose | Typical consumers |
|---|---|---|
| Application logs | Functional behavior, requests, errors, performance | Developers, support |
| Audit/security logs | User actions, access outcomes, abuse investigation | Security, incident response |
| Infrastructure logs | Reverse proxy, service health, container/process events | Operations |

## 3. Logging goals

The logging system must support these goals:

- detect operational failures;
- detect security-relevant events;
- support abuse investigation;
- support incident response and root cause analysis;
- avoid collection of unnecessary sensitive data;
- remain compatible with future centralized log aggregation.

The logging approach must prefer structured JSON events over plain text logs because structured logs are easier to filter, correlate, and alert on.

## 4. Events that must be logged

The application must log the following event families.

### Room lifecycle

- room created;
- room expired;
- room deleted;
- room full;
- room rejected;
- room ownership change, if ownership exists later.

### Participant lifecycle

- join attempt;
- join success;
- join failure;
- disconnect;
- voluntary leave;
- forced removal, if moderation is added later.

### Security and access events

- invalid room access;
- invalid join token;
- expired token;
- rate limit hit;
- access denied;
- authentication success;
- authentication failure;
- logout;
- suspicious repeated join attempts.

### System and integration failures

- LiveKit token generation failure;
- signaling connection failure;
- backend exception;
- reverse proxy error;
- TURN/connection negotiation failure where observable.

These event types are consistent with OWASP guidance to log authentication outcomes, authorization failures, suspicious activity, and application errors relevant to security and operations [cite:50][cite:53][cite:57].

## 5. Data that must not be logged

The application must avoid logging secrets or communication content.

Do not log:

- SDP offers and answers in full;
- ICE candidates in full;
- access tokens;
- JWT contents unless explicitly sanitized;
- media content;
- full message bodies used for invites;
- raw phone numbers or email addresses unless required and protected;
- highly granular personal data that is not needed for investigation.

Sensitive identifiers should be masked, truncated, or hashed where feasible. Source IP addresses should ideally be normalized or hashed for audit correlation unless full IP storage is explicitly required by policy.

## 6. Required audit event schema

The programming agent must implement a reusable audit event schema.

Recommended minimum fields:

```ts
interface AuditEvent {
  eventId: string;
  timestamp: string;
  eventType: string;
  outcome: 'success' | 'failure' | 'denied' | 'error';
  actorType: 'guest' | 'user' | 'system' | 'admin';
  actorId?: string;
  roomId?: string;
  roomMode?: 'p2p' | 'sfu';
  requestId?: string;
  sessionId?: string;
  sourceIpHash?: string;
  userAgent?: string;
  reasonCode?: string;
  metadata?: Record<string, string | number | boolean>;
}
```

### Schema rules

- `eventId` must be unique.
- `timestamp` must be ISO-8601.
- `requestId` must correlate API and logging layers.
- `actorId` must be absent for anonymous guest actions unless a temporary participant ID exists.
- `metadata` must never contain raw secrets.

## 7. Logging implementation guidance

The programming agent should implement:

- JSON logging in backend services;
- separate logger methods for `info`, `warn`, `error`, and `audit`;
- per-request correlation ID middleware;
- consistent event naming convention;
- configurable log level by environment;
- rotation or shipping strategy for production logs.

### Recommended event naming examples

- `room.created`
- `room.join.attempt`
- `room.join.success`
- `room.join.denied`
- `room.participant.left`
- `auth.login.success`
- `auth.login.failure`
- `security.rate_limit.triggered`
- `token.validation.failed`

## 8. Alerting and monitoring

The MVP does not need a full SIEM, but the architecture must keep a path open for it. The system should support future alerting on repeated failures, rate-limit triggers, invalid token patterns, and infrastructure instability. OWASP identifies logging and alerting failures as a real security category, so logs should not exist only for storage; they should be usable for detection [cite:52][cite:57].

The architecture should support future integration with:

- Loki / Grafana;
- ELK / OpenSearch;
- cloud log sinks;
- alert rules on suspicious event counts.

## 9. Authentication decision

Authentication must **not** be required for guest room creation or guest room join in the MVP. The guest flow is a core product requirement and should remain the default interaction model.

However, the architecture should support **optional authentication** as an enhancement layer. Optional authentication becomes useful when the system introduces user-owned resources or account-specific features.

### Authentication is justified for these future features

- personal dashboard;
- room history;
- ownership and moderation;
- fixed personal room;
- abuse reporting and enforcement;
- cross-device continuity;
- saved preferences.

This follows a risk-based architecture approach: do not add identity friction where it is not needed, but do not block future federation support either [cite:56][cite:59].

## 10. Recommended authentication model

If authentication is added, it should use standards-based federation, ideally OIDC. Google is an acceptable first provider for optional sign-in because Google Identity Services support OpenID Connect-based sign-in flows for web applications [cite:55][cite:58].

### Authentication policy

- guest access remains available for temporary rooms;
- authenticated users get additional features;
- login must not be required just to join a guest invite link;
- session handling must be separated from room invitation tokens;
- auth tokens and room tokens must not be mixed.

### Product model

| Capability | Guest user | Authenticated user |
|---|---|---|
| Create temporary room | Yes | Yes |
| Join temporary room by link | Yes | Yes |
| Mandatory login | No | No |
| Personal dashboard | No | Yes |
| Personal room | No | Yes, later |
| Room history | No | Yes |
| Ownership controls | Minimal | Yes |

## 11. Personal fixed room policy

A fixed personal room must **not** be created for guest users. This is a firm architecture decision.

### Reasoning

Guest mode is anonymous and low-friction. A fixed room for anonymous users would create a semi-permanent attack surface without meaningful identity binding. It would encourage:

- room enumeration;
- repeated unwanted access attempts;
- abuse through reused URLs;
- stalking or spam behavior;
- easier meeting bombing if a link leaks.

Therefore, guest rooms must remain ephemeral.

### Guest room rules

- random room ID;
- short lifetime or cleanup TTL;
- no permanent alias;
- no guaranteed persistence across restart;
- no reusable public personal address.

## 12. Personal room policy for authenticated users

A fixed personal room may be introduced later for authenticated users only. When that feature is added, it must include stronger security controls.

### Required protections for personal rooms

- authenticated owner identity;
- ownership check before administrative actions;
- ability to rotate invite link;
- optional waiting room;
- optional passcode;
- optional “host must be present” rule;
- access audit trail;
- rate limiting for repeated join attempts.

A permanent room is not just a convenience feature. It is a standing resource that must be treated as a protected asset.

## 13. Room model guidance

The architecture should explicitly support more than one room type.

Recommended model:

```ts
type RoomType = 'ephemeral' | 'personal';

interface RoomMeta {
  roomId: string;
  roomType: RoomType;
  mode: 'p2p' | 'sfu';
  ownerUserId?: string;
  createdAt: number;
  expiresAt?: number;
  participants: Map<string, ParticipantMeta>;
}
```

### Initial implementation rule

For MVP, implement only `ephemeral` rooms. Do not implement `personal` rooms yet. The data model should allow the feature later, but the feature itself must remain disabled.

## 14. Abuse prevention and basic security controls

Even in guest mode, the system must implement baseline abuse protections.

### Required baseline protections

- rate limiting for room creation;
- rate limiting for join attempts;
- validation of room IDs;
- validation of join tokens;
- room size enforcement;
- backend input validation;
- safe error messages that do not expose internals;
- audit events for denied or suspicious requests.

### Recommended controls for later

- IP- or device-based abuse scoring;
- temporary challenge after repeated failures;
- join throttling per room;
- host admission control for sensitive rooms.

## 15. Token and identity separation

The architecture must keep these concepts separate:

- room invitation URL;
- room join token;
- user authentication session;
- provider identity token.

These must not be conflated.

### Rules

- invitation links identify rooms, not authenticated users;
- room join tokens authorize room access and should be short-lived;
- authentication sessions represent user identity;
- external provider tokens must be validated and converted into internal session state rather than reused directly everywhere.

## 16. Retention and privacy guidance

The implementation must keep retention minimal for MVP.

### Recommended retention model

- application logs: short operational retention;
- audit logs: longer retention than app logs;
- guest room data: delete quickly after room end or TTL;
- personal data: collect only what is necessary.

The system should support configurable retention policies so deployment operators can align behavior with legal and business requirements.

## 17. Implementation checklist for the programming agent

The programming agent must implement the following now:

1. structured JSON logging in backend services;
2. request correlation IDs;
3. separate audit event logger;
4. audit event schema;
5. log events for room create/join/leave/fail;
6. rate limiting for create and join endpoints;
7. safe handling of secrets in logs;
8. ephemeral room-only mode for guest users;
9. room model extensible for future authenticated ownership.

The programming agent must **not** implement the following yet:

- mandatory login;
- fixed personal room for guests;
- account dashboard;
- permanent room aliases;
- provider-specific auth as a required dependency.

## 18. Future implementation path

When the product is ready for identity-based features, the next security architecture step should be:

1. add optional OIDC-based authentication;
2. add internal user model and session management;
3. introduce `personal` room type behind a feature flag;
4. add owner controls and access policies;
5. extend audit logs for authenticated actions;
6. add stronger abuse monitoring.

This path preserves the simplicity of the guest invite-by-link experience while enabling more controlled, persistent collaboration features later.

## 19. Final directive for implementation

The programming agent must follow these decisions strictly:

- guest room access remains anonymous and low-friction;
- guest users receive temporary rooms only;
- audit logging is mandatory from the first implementation;
- optional authentication is allowed only as an additive feature;
- fixed personal rooms are reserved for authenticated users and must not be implemented for guests.

These decisions should be treated as architecture constraints, not optional preferences.
