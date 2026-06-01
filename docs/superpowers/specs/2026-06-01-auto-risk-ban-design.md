# Auto Risk Ban Design

## Summary

Add an optional automatic user ban workflow for upstream `sub2api` content-risk audit responses. When an upstream response is HTTP 403 and matches a known content-policy violation shape, new-api records the event in a dedicated audit database, counts recent events for that user within a configured time window, and disables the user in the main new-api database when the threshold is reached.

The feature must keep the core relay flow easy to merge with upstream. The relay path should only call a small hook after an upstream error is normalized. Storage, matching, extraction, counting, and admin APIs live in an isolated package/module.

## Goals

- Detect risk audit blocks returned by upstream `sub2api`.
- Record the user, request time, endpoint/format, channel/token context, upstream error fields, and the relevant user input that triggered the event.
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
- `risk/service`: record events, count recent events, and disable users when needed.
- `controller/riskban.go`: expose management APIs for the external frontend.

The relay integration should be a single call after an upstream error is available:

```go
riskban.ObserveRelayError(c, relayInfo, newAPIError)
```

That hook should return quickly and must never change the client-facing response. If the audit database is unavailable, it logs the issue and skips the feature instead of failing user relay traffic.

## Detection Rules

Only count a risk event when:

- Upstream status code is `403`.
- The normalized or raw upstream error matches one of these signatures:
  - Anthropic / Claude Messages: top-level `type = "error"` and `error.type = "content_policy_violation"`.
  - OpenAI Chat / Images / generic OpenAI: `error.type = "content_policy_violation"`.
  - OpenAI Responses: `error.code = "content_policy_violation"`.
  - Gemini: `error.code = 403` and `error.status = "PERMISSION_DENIED"`.

The message should be stored as text. If the message contains a trailing hash suffix such as `(hash: ...)`, store both the full message and the parsed hash when parsing is reliable. If parsing is not reliable, keep the full message and leave hash empty.

The hook should prefer raw upstream response fields if available. If only `types.NewAPIError` is available, it can match:

- `newAPIError.StatusCode == http.StatusForbidden`
- `newAPIError.GetErrorCode() == "content_policy_violation"` or `newAPIError.ToOpenAIError().Type == "content_policy_violation"`
- Gemini-specific fields captured in raw error metadata if added later

If raw body access is added, do it centrally in `service.RelayErrorHandler` by attaching compact metadata to `types.NewAPIError`, not by parsing separately in every channel adaptor.

## User Input Extraction

Extract from the original client request, not from the converted upstream request. This avoids losing user intent after format conversion.

Input rules:

- OpenAI Chat: inspect `messages` and use the last message with `role == "user"`. For string content, store the string. For array content, concatenate text parts and include image/file/audio markers without storing large binary data.
- Anthropic Messages: inspect `messages` and use the last message with `role == "user"`. For array content, concatenate text blocks and include media markers.
- Gemini: inspect `contents` and use the last content with `role == "user"` or the last content if roles are absent. Concatenate text parts and include media markers.
- OpenAI Responses: inspect `input`. If it is a string, store it. If it is an array, use the last item with role `user` or type `message` and role `user`; concatenate text/media input content.
- Images: store `prompt` and add image-input markers for `image`, `images`, or multipart edit inputs. Do not persist raw uploaded image bytes.

Stored input should have a configurable maximum length, defaulting to a conservative size such as 8 KiB. Truncated records should mark `input_truncated = true`.

## Audit Database

Use a dedicated database connection separate from `model.DB` and `model.LOG_DB`.

Recommended deployment:

- Default: independent SQLite file for simple deployment.
- Production: PostgreSQL through `RISK_AUDIT_SQL_DSN`.
- Optional: MySQL if the existing database helper supports it with the same GORM model.

PostgreSQL is recommended for production because this feature does frequent `user_id + created_at` range counts, pagination, and cleanup. Keep table fields portable and avoid JSONB-specific logic.

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
- `input_max_chars = 8192`
- `admin_api_enabled = true`

### `risk_ban_events`

- `id`
- `user_id`
- `username`
- `user_email`
- `token_id`
- `token_name`
- `channel_id`
- `channel_name`
- `channel_type`
- `request_id`
- `relay_format`
- `relay_mode`
- `model`
- `request_path`
- `input_text`
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
- `window_start`
- `window_end`
- `event_count`
- `created_at`

Actions include `auto_ban`, `clear_user_events`, `clear_all_events`, and `clear_ban_records`. Clearing audit records must not re-enable or otherwise modify the actual new-api user.

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

## Management API

Expose APIs under a new admin/root-protected group, for example:

- `GET /api/risk_ban/settings`
- `PUT /api/risk_ban/settings`
- `GET /api/risk_ban/events`
- `GET /api/risk_ban/users/:id/events`
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

These are future extensions, not required for the first implementation.

## Merge-Friendly Implementation Strategy

Keep upstream conflict risk low:

- Add one small hook in `controller.Relay` or `processChannelError`.
- Avoid edits inside provider-specific adaptors.
- Avoid frontend changes.
- Keep new files grouped in a risk-ban package and one controller/router addition.
- Use GORM models and common JSON wrappers.
- Keep SQL portable across SQLite, MySQL, and PostgreSQL.

## Testing Plan

Unit tests:

- Match all four supported error shapes.
- Reject non-403 responses.
- Reject unrelated 403 errors.
- Extract last user input from OpenAI Chat, Claude Messages, Gemini, Responses, and Images.
- Verify truncation behavior.
- Verify threshold counting within and outside the time window.

Integration tests:

- Simulate a relay error that matches content policy violation.
- Confirm an event is written to the audit DB.
- Confirm user is disabled when threshold is reached.
- Confirm root user is not disabled.
- Confirm audit DB failure does not change relay response.

Manual verification:

- Configure SQLite audit DB and trigger test events.
- Configure PostgreSQL audit DB and verify pagination/counting.
- Use external API calls to update settings, list events, and clear records.

## Open Decisions

- Whether admin users should be auto-disabled or only root users are exempt.
- Whether management reads use `AdminAuth` or `RootAuth`.
- Whether the first version should parse raw upstream Gemini fields by attaching raw error metadata to `NewAPIError`, or rely on normalized error fields where possible.
- Whether retention cleanup is included in the first implementation or deferred.

## Recommended Defaults

- Audit DB: SQLite by default, PostgreSQL via `RISK_AUDIT_SQL_DSN` in production.
- Feature enabled: false.
- Window: 24 hours.
- Threshold: 3 events.
- Input max length: 8192 characters.
- Settings writes and destructive clears: root only.
- Event/action reads: admin or root.
