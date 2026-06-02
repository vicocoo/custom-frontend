# Risk Ban Admin Enhancements

## Goal

Improve the automatic risk-ban console so it can be used for ongoing operations rather than only low-volume debugging.

## Scope

- Support multiple custom 403 block-message prefixes using the existing `block_message_prefix` setting as a multi-line text field.
- Record the exact prefix that matched an event.
- Add pagination controls for recent events, auto-banned users, and action logs.
- Add user ID filtering for recent events and action logs.
- Keep auto-banned users unfiltered by user ID for now.
- Show long event input text as a short preview in lists.
- Add a detail view for events, banned-user rows, and actions.
- Add deletion controls for risk events and action logs.
- Require a second confirmation before every destructive delete.
- Support optional time-range deletion for risk events and action logs.

## Non-Goals

- No database schema migration.
- No new `banned_users` user ID filter.
- No changes to relay retry behavior.
- No changes to compose or Docker runtime configuration.
- No frontend framework build setup; the isolated static admin page remains a minimal embedded page.

## Backend Design

The existing `risk_ban_settings.block_message_prefix` column remains a `TEXT` field. Multiple prefixes are represented as newline-separated values. Normalization trims whitespace, removes empty lines, and de-duplicates entries while preserving order.

Detection still requires HTTP status `403`. It then checks whether the upstream error message starts with any configured prefix. The returned detection includes the exact prefix that matched, and event persistence writes that value to `matched_prefix`.

List queries keep existing pagination. Events and actions can optionally filter by `user_id`, `start_time`, and `end_time`. Deletion reuses existing root-only endpoints where possible and extends them with `start_time` and `end_time` query parameters. A root-only all-actions deletion endpoint is added for action-log cleanup.

## Frontend Design

The admin page keeps its single-file static implementation. It adds small table state objects for events, banned users, and actions. Each table gets previous/next controls and total counts.

Event and action filters include an optional user ID. Deletion controls include optional start/end datetime inputs. All destructive operations call a double-confirm helper before sending `DELETE`.

Event input text is shown as a short preview in the table. A details dialog shows the full event/action/banned-user JSON with readable timestamps and full input text.

## Testing

- Add tests for multi-prefix matching and matched-prefix recording.
- Add tests for time-range list and delete behavior.
- Run targeted package tests for `service/riskban`, `router`, `controller`, `middleware`, and `model`.
- Run a compile scan with `go test ./... -run TestDoesNotExist -count=1`.
