# Auto Risk Ban Design

## Summary

Add an optional automatic user ban workflow for upstream `sub2api` content-risk audit responses. When the feature is enabled and an upstream response is HTTP 403 with a normalized error message that starts with a configured block-message prefix, new-api records the event in a dedicated audit database, counts recent events for that user within a configured time window, and disables the user in the main new-api database when the threshold is reached.

The feature must keep the core relay flow easy to merge with upstream. The relay path should only call a small hook after an upstream error is normalized. Storage, matching, extraction, counting, and admin APIs live in an isolated package/module.

## Goals

- Detect risk audit blocks returned by upstream `sub2api`.
- Record a minimal audit event: stable user/token/channel IDs, request time, endpoint/format, the matched block message, and the relevant user input that triggered the event.
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
- Do not cover task-style relay paths such as Midjourney/task/video async submissions in the first implementation. The first scope is OpenAI Chat/Images/Responses, Anthropic Messages, and Gemini message-style requests.

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

- `risk/config`: read/write feature settings from the audit database and maintain an atomic in-memory settings snapshot for the relay hook.
- `risk/store`: initialize and query the dedicated audit database.
- `risk/detect`: match normalized upstream errors by status code and configured block-message prefix.
- `risk/input`: extract the current/last user input from the cached original request.
- `risk/service`: record minimal events, count recent events, and disable users when needed.
- `controller/riskban.go`: expose management APIs for the external frontend.

The relay integration should be a small call after an upstream error is available and after the existing channel-error handling has run, but before the retry decision is made:

```go
riskResult := riskban.ObserveRelayError(c, relayInfo, newAPIError)
```

That hook should return quickly and must never change the client-facing response. It should separate detection from persistence: a response can be a matched risk block even when the audit database write fails.

The hook should first read the in-memory settings snapshot. If `enabled = false` or `block_message_prefix` is empty, it should return immediately without extracting request input, parsing hashes, querying the audit database, or touching user state. If the snapshot is missing because configuration has not loaded successfully, it should log that state and return without matching. This keeps the disabled feature to a single cheap in-memory check on relay errors.

The hook may be called inside the retry loop, but it must be idempotent by request id. When `riskResult.Matched` is true, the relay loop should stop retrying so one user request cannot be retried onto another channel after a policy block. `riskResult.Recorded` only describes whether a new audit event was persisted. Duplicate observes for the same request id should return the existing event and must not run threshold counting or auto-ban again.

## Detection Rules

Only count a risk event when:

- The cached settings snapshot has `enabled = true`.
- The observed relay error status code is `403`.
- `block_message_prefix` is configured and non-empty.
- The normalized upstream error message starts with `block_message_prefix`.

The normalized message should come from the current `types.NewAPIError` before the final response wrapper appends the request id. Prefer `newAPIError.Error()` because it is closest to the upstream message captured by `service.RelayErrorHandler`; only fall back to `newAPIError.ToOpenAIError().Message` when the direct error message is empty.

The message should be stored as text. If the message contains a trailing hash suffix such as `(hash: ...)`, store both the full message and the parsed hash. A strict suffix parser is enough for the first version, for example matching only a final `"(hash: ...)"` segment and leaving `risk_hash` empty when the suffix is absent or malformed.

This design intentionally does not parse or match provider-specific `error.type`, `error.code`, or `error.status` fields. The configured block-message prefix is the single risk signature across Anthropic / Claude Messages, OpenAI Chat / Images, OpenAI Responses, and Gemini responses.

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
- Detection evidence: observed 403 status code, matched block-message prefix, upstream message, and parsed hash if present.
- Decision fields: created time and whether the event triggered a ban.

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
- MySQL must remain supported by the GORM models and migrations for project compatibility, even if PostgreSQL is the recommended production deployment.

PostgreSQL is the recommended default because this feature does frequent `user_id + created_at` range counts, pagination, and cleanup. Keep table fields portable and avoid JSONB-specific logic so the code remains compatible with SQLite, MySQL, and PostgreSQL.

The audit database opener must not reuse `model.chooseDB` directly if that helper mutates global database type flags. The risk audit store needs its own opener or a refactored helper that returns a GORM connection without changing `common.UsingPostgreSQL`, `common.UsingSQLite`, `common.UsingMySQL`, or log DB type globals.

Settings should be loaded into an atomic in-memory snapshot at startup, refreshed after every successful settings update, and optionally refreshed on a short background interval. The relay hook should use this snapshot for detection rather than querying the audit database on every blocked response. If the audit database is unavailable but a previous snapshot exists, detection can still match and stop retry handling; persistence, counting, and user disabling are skipped until the audit database is available again. If no snapshot exists, the risk feature should fail closed as unavailable, log the configuration load failure, and avoid matching.

Suggested tables:

### `risk_ban_settings`

- `id`
- `enabled`
- `window_seconds`
- `threshold`
- `block_message_prefix`
- `input_max_chars`
- `admin_api_enabled`
- `created_at`
- `updated_at`

There should be one active settings row. Defaults:

- `enabled = false`
- `window_seconds = 86400`
- `threshold = 3`
- `block_message_prefix = ""`
- `input_max_chars = 12000`
- `admin_api_enabled = true`

The feature should not record or count any event while `block_message_prefix` is empty, even if `enabled = true`. The external management frontend should require or warn for a non-empty prefix before enabling automatic bans. Settings updates should validate `threshold >= 1`, `window_seconds > 0`, `input_max_chars > 0`, and trimmed `block_message_prefix != ""` when enabling the feature.

`admin_api_enabled` controls whether non-root admins can read settings, audit events/actions, and auto-banned-user rows through `AdminAuth`. It must not disable root access to settings or destructive maintenance APIs, otherwise a misconfiguration could lock out management.

### `risk_ban_events`

- `id`
- `user_id`
- `token_id`
- `channel_id`
- `channel_type`
- `request_id`
- `dedupe_key`
- `relay_format`
- `relay_mode`
- `model`
- `request_path`
- `input_text`
- `input_char_count`
- `input_truncated`
- `status_code`
- `matched_prefix`
- `error_message`
- `risk_hash`
- `created_at`
- `ban_triggered`

Indexes:

- Unique `(user_id, dedupe_key)`
- `(user_id, created_at)`
- `(created_at)`
- `(risk_hash)`
- `(ban_triggered, created_at)`

Set `dedupe_key` to the request id when it is present. If request id is empty, generate a unique event-local value so the unique index does not collapse unrelated events. In normal relay traffic, request id should be present and repeated observes for the same `(user_id, dedupe_key)` should update or return the existing event rather than creating duplicates. This avoids partial unique indexes and remains portable across SQLite, MySQL, and PostgreSQL.

Use bounded string sizes for indexed or frequently filtered fields so migrations remain portable, especially on MySQL with `utf8mb4`: `request_id` and `dedupe_key` should be at most 128 characters, `relay_format` and `relay_mode` at most 64 characters, `risk_hash` at most 191 characters, and `action` / `operator_type` at most 64 characters. `model` may use 191 or 255 characters depending on whether it is indexed. Large free-text fields such as `input_text` and `error_message` should remain text fields rather than indexed strings.

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

1. Read the current settings snapshot.
2. If the feature is disabled or the prefix is empty, return before any database work.
3. Insert a `risk_ban_events` row with the request id based `dedupe_key`.
4. If the insert finds an existing `(user_id, dedupe_key)` row, return without counting or disabling again.
5. Count persisted risk events for the same `user_id` where `created_at >= now - window_seconds`.
6. If count is greater than or equal to `threshold`, disable the user in main new-api DB.
7. Invalidate both the user cache and all token caches for that user so the ban takes effect promptly.
8. Insert a `risk_ban_actions` row with action `auto_ban`.

Root users must not be auto-disabled. Admin users should either be excluded by default or controlled by a setting. The first implementation should exclude root users at minimum and log an action with a skipped reason if the threshold is met.

The disable operation should reuse the model layer rather than calling the HTTP admin endpoint from inside the process. A small helper such as `model.DisableUserById(id, reason)` can centralize DB update and cache invalidation.

The disable operation must be idempotent. Update the main user row only when the user is currently enabled, and avoid writing duplicate `auto_ban` action rows for the same user and threshold window. The implementation can use a transaction, a user-level lock, or a uniqueness strategy keyed by user and active window to avoid duplicate auto-ban records under concurrent requests.

The risk-ban feature should not actively modify, suppress, or take ownership of new-api's existing channel auto-disable behavior. Keep the current `processChannelError` path in place, then run risk detection before the retry decision. If `riskResult.Matched` is true, record/count the event when possible and stop retrying. This avoids repeated risk counts across channels while leaving channel auto-disable behavior governed only by existing new-api settings.

Status-code mapping does not need a new core behavior change if operators avoid mapping upstream 403 policy blocks to another code in new-api. This minimal design matches the observed `NewAPIError.StatusCode`; if channel status-code mapping changes 403 to another code before the risk hook runs, detection can be missed. Treat unmapped 403 as an enablement prerequisite: the risk management frontend should warn and refuse to mark the setup healthy when a channel maps `403` away.

Similarly, new-api's channel auto-disable settings do not need a core restriction if operators keep `403` out of `AutomaticDisableStatusCodes`. The external risk management frontend should warn that adding `403` to channel auto-disable status codes can disable channels for user policy violations. The risk-ban hook itself should not override that setting.

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

Authentication should use existing `RootAuth` or `AdminAuth`. Use `RootAuth` for settings changes and destructive global clear actions. Use `AdminAuth` for read-only event/action/banned-user pages when `admin_api_enabled` is true; root users can always read them.

`GET /api/risk_ban/settings` is also a read-only API: root users can always read it, and non-root admins can read it when `admin_api_enabled = true`. `PUT /api/risk_ban/settings` remains root-only.

`GET /api/risk_ban/banned_users` should return users who were auto-banned by this feature according to `risk_ban_actions.action = "auto_ban"`, enriched with the current main-database user status at read time. It should not be treated as a list of every disabled new-api user. If ban action records are cleared, this endpoint no longer has historical auto-ban rows to display, but clearing records must not re-enable the actual user.

The API returns data only for the external frontend. No routes or menu entries should be added to the built-in React frontend.

## Error Handling

The audit hook must not affect normal relay behavior:

- Audit DB unavailable after a settings snapshot has already been loaded: use the cached snapshot for detection, log the persistence failure, skip event counting and user auto-ban for that request, but still treat the response as `riskResult.Matched` for retry control.
- Audit DB unavailable before any settings snapshot has been loaded: log the configuration failure and return `riskResult.Matched = false` because there is no trusted prefix to match.
- Input extraction fails: record the event with empty input and extraction error in internal logs.
- User disable fails: record the event and log the failure.
- Settings missing: create or use defaults.

Audit DB failure must not change the relay response and must not cause matched policy blocks to be retried. The client should still receive the original upstream-derived 403 response.

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

- Add one small hook in `controller.Relay` after the existing `processChannelError` call and before retry handling.
- Avoid edits inside provider-specific adaptors.
- Avoid frontend changes.
- Keep new files grouped in a risk-ban package and one controller/router addition.
- Use GORM models and common JSON wrappers.
- Keep SQL portable across PostgreSQL, SQLite, and MySQL.

## Testing Plan

Unit tests:

- Verify disabled settings and empty prefix return before input extraction or audit DB writes.
- Match HTTP 403 errors whose normalized message starts with the configured prefix.
- Verify the same prefix works for normalized Anthropic / Claude Messages, OpenAI Chat / Images, OpenAI Responses, and Gemini error messages.
- Reject non-403 responses.
- Reject 403 responses with a missing, empty, or non-matching prefix.
- Parse a trailing `(hash: ...)` suffix from the message.
- Verify a matched risk error is not retried and creates at most one event per request id.
- Verify duplicate request id observes do not rerun threshold counting or auto-ban.
- Verify a matched risk error is not retried even when the audit DB write fails.
- Verify matched risk errors do not change existing channel auto-disable settings or bypass `processChannelError`.
- Extract last user input from OpenAI Chat, Claude Messages, Gemini, Responses, and Images.
- Verify truncation behavior.
- Verify threshold counting within and outside the time window.
- Verify concurrent threshold hits produce only one effective auto-ban action.

Integration tests:

- Simulate a relay error whose 403 message starts with the configured block-message prefix.
- Confirm an event is written to the audit DB.
- Confirm user is disabled when threshold is reached.
- Confirm root user is not disabled.
- Confirm audit DB failure does not change relay response.
- Confirm audit DB failure still stops retry for a matched risk block.
- Confirm unavailable settings with no cached snapshot disables risk matching and logs the configuration failure.
- Confirm management clear actions record operator identity.

Manual verification:

- Configure PostgreSQL audit DB and verify pagination/counting.
- Configure explicit SQLite development fallback and trigger test events.
- Use external API calls to update settings, list events, and clear records.

## Open Decisions

- Whether admin users should be auto-disabled or only root users are exempt.
- Whether retention cleanup is included in the first implementation or deferred.

## Recommended Defaults

- Audit DB: PostgreSQL via `RISK_AUDIT_SQL_DSN` by default recommendation; SQLite only as an explicit development fallback.
- Feature enabled: false.
- Window: 24 hours.
- Threshold: 3 events.
- Input max length: 12000 Unicode characters.
- Settings writes and destructive clears: root only.
- Settings/event/action/auto-banned-user reads: root always; admins when `admin_api_enabled = true`.
