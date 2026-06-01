# Auto Risk Ban Design

## Summary

Add an optional automatic user ban workflow for upstream `sub2api` content-risk audit responses. When an upstream response is HTTP 403 and matches a known content-policy violation shape, new-api records the event in a dedicated audit database, counts recent events for that user within a configured time window, and disables the user in the main new-api database when the threshold is reached.

The feature must keep the core relay flow easy to merge with upstream. The relay path should only call a small hook after an upstream error is normalized. Storage, matching, extraction, counting, and admin APIs live in an isolated package/module.

## Goals

- Detect risk audit blocks returned by upstream `sub2api`.
- Record a minimal audit event: stable user/token/channel IDs, request time, endpoint/format, upstream error fields needed for verification, and the relevant user input that triggered the event.
- Use an independent audit database for all risk records and feature configuration.
- Disable the actual new-api user only when the configured threshold is met.
- Provide backend APIs for an external management frontend to view settings, events, banned users, and clear audit records.
- Keep the built-in new-api frontend unchanged.
- Minimize changes to relay code so future upstream merges stay simple.

## Non-Goals

- Do not build the management UI inside `web/default` or `web/classic`.
- Do not replace new-api's existing user status model.
- Do not store audit records in the main new-api database tables.
- Do not remove or rename protected project or organization identifiers.
- Do not treat every HTTP 403 as a risk event; only matched policy responses count.

## Existing Project Fit

The project already has the required core pieces:

- Users are disabled through `common.UserStatusDisabled`, and token auth rejects disabled users.
- Admin user management already supports a `disable` action.
- Relay requests flow through `controller.Relay`, where upstream errors are normalized to `types.NewAPIError`.
- `service.RelayErrorHandler` parses upstream error bodies into OpenAI-compatible errors when possible.
- Request bodies are cached through `common.BodyStorage`, so the post-error hook can inspect the original request without consuming the stream.

The new feature should add one relay hook near the existing upstream-error handling path, then delegate everything else to an isolated risk audit service.

## Recommended Architecture

Use an internal package named `risk` or `service/riskban` with these responsibilities:

- `risk/config`: read/write feature settings from the audit database.
- `risk/store`: initialize and query the dedicated audit database.
- `risk/detect`: match normalized upstream errors against supported policy violation signatures.
- `risk/input`: extract the current/last user input from the cached original request.
- `risk/service`: record minimal events, count recent events, and disable users when needed.
- `controller/riskban.go`: expose management APIs for the external frontend.

The relay integration should be a small call after an upstream error is available and before retry/channel-auto-ban decisions are made:

```go
riskban.ObserveRelayError(c, relayInfo, newAPIError)
```

That hook should return quickly and must never change the client-facing response. If the audit database is unavailable, it logs the issue and skips the feature instead of failing user relay traffic.

The hook may be called inside the retry loop, but it must be idempotent by request id. A matched risk error must mark the request as non-retryable so one user request cannot be counted multiple times and cannot be retried onto another channel after a policy block.

## Detection Rules

Only count a risk event when:

- Upstream status code is `403`.
- The normalized or raw upstream error matches one of these signatures:
  - Anthropic / Claude Messages: top-level `type = "error"` and `error.type = "content_policy_violation"`.
  - OpenAI Chat / Images / generic OpenAI: `error.type = "content_policy_violation"`.
  - OpenAI Responses: `error.code = "content_policy_violation"`.
  - Gemini: `error.code = 403` and `error.status = "PERMISSION_DENIED"`.

The message should be stored as text. If the message contains a trailing hash suffix such as `(hash: ...)`, store both the full message and the parsed hash when parsing is reliable. If parsing is not reliable, keep the full message and leave hash empty.

The hook should prefer compact raw upstream response fields captured on `types.NewAPIError`. If only the current normalized fields are available, it can match:

- `newAPIError.StatusCode == http.StatusForbidden`
- `newAPIError.GetErrorCode() == "content_policy_violation"` or `newAPIError.ToOpenAIError().Type == "content_policy_violation"`
- Gemini-specific fields captured in raw error metadata if added later

Raw error metadata is required for reliable Gemini detection because the existing OpenAI-compatible normalization does not preserve Gemini's `error.status = "PERMISSION_DENIED"` field. Add this centrally in `service.RelayErrorHandler` by attaching compact fields to `types.NewAPIError`, not by parsing separately in every channel adaptor.

Required small changes to existing new-api files:

- `types/error.go`: add fields or metadata accessors for original upstream status code and compact upstream error details, for example type/code/status/message.
- `service/error.go`: while reading the upstream error body, extract compact raw error fields and attach them to `NewAPIError`; also preserve the upstream HTTP status before any status-code mapping.
- `dto/error.go` or a new risk parser helper: optionally add a small struct/helper for extracting `error.type`, `error.code`, `error.status`, and `error.message`.

These changes are intentionally central and should avoid edits in provider-specific adaptor files.

## User Input Extraction

Extract from the original client request, not from the converted upstream request. This avoids losing user intent after format conversion.

Input rules:

- OpenAI Chat: inspect `messages` and use the last message with `role == "user"`. For string content, store the string. For array content, concatenate text parts and include image/file/audio markers without storing large binary data.
- Anthropic Messages: inspect `messages` and use the last message with `role == "user"`. For array content, concatenate text blocks and include media markers.
- Gemini: inspect `contents` and use the last content with `role == "user"` or the last content if roles are absent. Concatenate text parts and include media markers.
- OpenAI Responses: inspect `input`. If it is a string, store it. If it is an array, use the last item with role `user` or type `message` and role `user`; concatenate text/media input content.
- Images: store `prompt` and add image-input markers for `image`, `images`, or multipart edit inputs. Do not persist raw uploaded image bytes.

Stored input should have a configurable maximum length, defaulting to 12000 Unicode characters. Truncation must count Unicode code points, not bytes, and must preserve valid UTF-8. Truncated records should mark `input_truncated = true`.

## Data Minimization

The audit database should store only what is needed to prove and manage the auto-ban decision. It should not become a duplicate request log.

Default stored data:

- Stable identifiers: `user_id`, `token_id`, `channel_id`, and `channel_type`.
- Request classification: request id, relay format/mode, model, and path.
- Trigger evidence: extracted current/last user input, truncated to `input_max_chars`.
- Detection evidence: upstream status code, matched error type/code/status, message, and parsed hash if present.
- Decision fields: created time, whether the event counted, and whether it triggered a ban.

Default omitted data:

- Usernames, display names, emails, and OAuth identifiers.
- Token names and token keys.
- Channel names, upstream API keys, base URLs, and request headers.
- Full raw request bodies, full raw upstream response bodies, uploaded image/audio/file bytes, and converted upstream requests.

The management API can enrich responses with current user/channel/token display names from the main database when needed. That enrichment should be computed at read time and should not be copied into the audit database.

## Audit Database

Use a dedicated database connection separate from `model.DB` and `model.LOG_DB`.

Recommended deployment:

- Default recommendation: PostgreSQL through `RISK_AUDIT_SQL_DSN`.
- Development fallback: independent SQLite file only when explicitly configured.
- Optional: MySQL if the existing database helper supports it with the same GORM model.

PostgreSQL is the recommended default because this feature does frequent `user_id + created_at` range counts, pagination, and cleanup. Keep table fields portable and avoid JSONB-specific logic so the code remains easier to test against SQLite and possible to run on MySQL if needed.

The audit database opener must not reuse `model.chooseDB` directly if that helper mutates global database type flags. The risk audit store needs its own opener or a refactored helper that returns a GORM connection without changing `common.UsingPostgreSQL`, `common.UsingSQLite`, `common.UsingMySQL`, or log DB type globals.

Suggested tables:

### `risk_ban_settings`

- `id`
- `enabled`
- `window_seconds`
- `threshold`
- `input_max_chars`
- `admin_api_enabled`
- `created_at`
- `updated_at`

There should be one active settings row. Defaults:

- `enabled = false`
- `window_seconds = 86400`
- `threshold = 3`
- `input_max_chars = 12000`
- `admin_api_enabled = true`

### `risk_ban_events`

- `id`
- `user_id`
- `token_id`
- `channel_id`
- `channel_type`
- `request_id`
- `relay_format`
- `relay_mode`
- `model`
- `request_path`
- `input_text`
- `input_char_count`
- `input_truncated`
- `upstream_status_code`
- `error_type`
- `error_code`
- `error_status`
- `error_message`
- `risk_hash`
- `created_at`
- `counted`
- `ban_triggered`

Indexes:

- `(user_id, created_at)`
- `(created_at)`
- `(risk_hash)`
- `(ban_triggered, created_at)`

### `risk_ban_actions`

- `id`
- `user_id`
- `action`
- `reason`
- `operator_user_id`
- `operator_type`
- `window_start`
- `window_end`
- `event_count`
- `created_at`

Actions include `auto_ban`, `clear_user_events`, `clear_all_events`, and `clear_ban_records`. Clearing audit records must not re-enable or otherwise modify the actual new-api user.

For system-created `auto_ban` actions, `operator_type` should be `system` and `operator_user_id` should be empty/zero. For external management API operations, record the authenticated admin/root user's ID and an operator type such as `admin` or `root`.

## Ban Behavior

When a matched event is recorded:

1. Load settings from the audit database.
2. If disabled, return.
3. Insert a `risk_ban_events` row.
4. Count events for the same `user_id` where `created_at >= now - window_seconds`.
5. If count is greater than or equal to `threshold`, disable the user in main new-api DB.
6. Invalidate the user cache so the ban takes effect promptly.
7. Insert a `risk_ban_actions` row with action `auto_ban`.

Root users must not be auto-disabled. Admin users should either be excluded by default or controlled by a setting. The first implementation should exclude root users at minimum and log an action with a skipped reason if the threshold is met.

The disable operation should reuse the model layer rather than calling the HTTP admin endpoint from inside the process. A small helper such as `model.DisableUserById(id, reason)` can centralize DB update and cache invalidation.

The disable operation must be idempotent. Update the main user row only when the user is currently enabled, and avoid writing duplicate `auto_ban` action rows for the same user and threshold window. The implementation can use a transaction, a user-level lock, or a uniqueness strategy keyed by user and active window to avoid duplicate auto-ban records under concurrent requests.

Risk policy blocks should not trigger channel auto-ban. This can be achieved either by marking the matched error as non-channel-disabling before `processChannelError` evaluates it, or by running risk detection before channel auto-ban and skipping the channel disable path for matched content-risk events.

Status-code mapping does not need a new core behavior change if operators avoid mapping upstream 403 policy blocks to another code in new-api. The risk management frontend should warn that mapping `403` away can prevent or confuse risk audit handling. The implementation should store the original upstream status in `upstream_status_code` before mapping so future mappings are safer.

Similarly, new-api's channel auto-disable settings do not need a core restriction if operators keep `403` out of `AutomaticDisableStatusCodes`. The external risk management frontend should warn that adding `403` to channel auto-disable status codes can disable channels for user policy violations.

## Management API

Expose APIs under a new admin/root-protected group, for example:

- `GET /api/risk_ban/settings`
- `PUT /api/risk_ban/settings`
- `GET /api/risk_ban/events`
- `GET /api/risk_ban/users/:id/events`
- `GET /api/risk_ban/banned_users`
- `GET /api/risk_ban/actions`
- `DELETE /api/risk_ban/events`
- `DELETE /api/risk_ban/users/:id/events`
- `DELETE /api/risk_ban/users/:id/actions`

Authentication should use existing `RootAuth` or `AdminAuth`. Use `RootAuth` for settings changes and destructive global clear actions. `AdminAuth` is acceptable for read-only pages if that matches the deployment's trust model.

The API returns data only for the external frontend. No routes or menu entries should be added to the built-in React frontend.

## Error Handling

The audit hook must not affect normal relay behavior:

- Audit DB unavailable: log and skip.
- Input extraction fails: record the event with empty input and extraction error in internal logs.
- User disable fails: record the event and log the failure.
- Settings missing: create or use defaults.

The client should still receive the original upstream-derived 403 response.

## Privacy and Retention

Because this feature stores user prompts and potentially sensitive content, the management API should support cleanup:

- Clear all audit events.
- Clear one user's audit events.
- Clear ban action records.

Recommended future settings:

- retention days
- input redaction patterns
- hash-only mode
- display-name enrichment toggle for management API responses

These are future extensions, not required for the first implementation.

## Merge-Friendly Implementation Strategy

Keep upstream conflict risk low:

- Add one small hook in `controller.Relay` or `processChannelError`.
- Avoid edits inside provider-specific adaptors.
- Avoid frontend changes.
- Keep new files grouped in a risk-ban package and one controller/router addition.
- Use GORM models and common JSON wrappers.
- Keep SQL portable across PostgreSQL, SQLite, and MySQL.

## Testing Plan

Unit tests:

- Match all four supported error shapes.
- Reject non-403 responses.
- Reject unrelated 403 errors.
- Verify original upstream 403 is preserved when status-code mapping changes the client-facing status.
- Verify a matched risk error is not retried and is counted at most once per request id.
- Verify matched risk errors do not auto-disable channels.
- Extract last user input from OpenAI Chat, Claude Messages, Gemini, Responses, and Images.
- Verify truncation behavior.
- Verify threshold counting within and outside the time window.
- Verify concurrent threshold hits produce only one effective auto-ban action.

Integration tests:

- Simulate a relay error that matches content policy violation.
- Confirm an event is written to the audit DB.
- Confirm user is disabled when threshold is reached.
- Confirm root user is not disabled.
- Confirm audit DB failure does not change relay response.
- Confirm management clear actions record operator identity.

Manual verification:

- Configure PostgreSQL audit DB and verify pagination/counting.
- Configure explicit SQLite development fallback and trigger test events.
- Use external API calls to update settings, list events, and clear records.

## Open Decisions

- Whether admin users should be auto-disabled or only root users are exempt.
- Whether management reads use `AdminAuth` or `RootAuth`.
- Whether retention cleanup is included in the first implementation or deferred.

## Recommended Defaults

- Audit DB: PostgreSQL via `RISK_AUDIT_SQL_DSN` by default recommendation; SQLite only as an explicit development fallback.
- Feature enabled: false.
- Window: 24 hours.
- Threshold: 3 events.
- Input max length: 12000 Unicode characters.
- Settings writes and destructive clears: root only.
- Event/action reads: admin or root.
