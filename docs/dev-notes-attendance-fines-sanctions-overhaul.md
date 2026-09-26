# [Dev Notes] Attendance, Fines & Sanctions System Overhaul

**Release date:** 2026-09-25  
**Release version:** v2026.09.25  
**Area:** Attendance Management, Fines, Sanctions, Student Profiles, and Admin Reporting

## Overview

This release completes a major architectural and user-interface overhaul of the attendance, monetary-fine, and disciplinary-sanction workflows.

The system now automatically persists inferred absences after student onboarding and event completion, while preserving retroactive historical processing and administrator override capabilities. Monetary fines and disciplinary sanctions are also fully decoupled so school policies can be changed independently from term to term.

The admin attendees view and student profile view have been updated to present attendance, monetary, and disciplinary states more accurately and consistently.

---

## Database & Persistence Layer

### Automated fine persistence

The persistence workflow now automatically materializes inferred absences and their associated persistent records through database functions and triggers.

Automatic processing occurs when:

- A student profile is created with a valid program.
- A student's program changes.
- An event is created after its event date.
- An event changes status, including closure or completion.
- An event date, program, or session configuration changes.

Once an event is eligible for processing, the system creates the required `attendance_scans` rows for enrolled students who do not have an existing record. The normal attendance fine lifecycle then determines whether a persistent monetary fine should be created.

### Event closure and completion processing

Previously, persistence was primarily triggered during student signup or profile updates. That created a gap for events scheduled after a student had already registered.

The new event-level reconciliation trigger closes that gap by processing enrolled students when an event becomes eligible. This ensures that:

- Students who sign up before an event are processed after the event finishes.
- Missing attendance sessions become explicit absent records.
- Persistent fines can be created without requiring another profile update.
- Admin clearance and excuse workflows can reference real database rows.

### Idempotent processing

The materialization functions are conflict-safe and can be executed repeatedly without creating duplicate attendance records.

The existing uniqueness rule on:

```text
(event_id, student_id, session_label)
```

ensures that each student receives at most one attendance record per event session.

### Retroactive historical event processing

Retroactive processing remains enabled for new student profiles.

When a new student completes onboarding, historical eligible events in the student's program can be materialized automatically. This preserves the established school policy that historical events may be processed after registration.

Administrators retain the ability to manually edit or overwrite attendance records when a student was physically present before registering in the system. This allows legitimate historical corrections without weakening automatic persistence.

### Existing-data repair

The reconciliation script also performs a one-time repair for:

- Existing students with completed onboarding profiles.
- Existing events that are already past their event date and are not upcoming.

The operation is safe to rerun because all inserts are conflict-safe.

---

## Decoupled Policy Architecture

### Independent monetary-fine control

The global `finesEnabled` setting controls whether monetary fine records are created for new late or absent attendance records.

When monetary fines are disabled:

- New attendance records may still be persisted.
- New monetary fine rows are not created.
- Existing historical fine rows are preserved.
- Existing persistent fines remain available for administrative clearance.
- Client-side inferred monetary amounts are not displayed as owed fees.

### Independent disciplinary-sanction control

The event-level `sanctions_enabled` setting controls disciplinary sanction status independently of monetary fines.

This supports multiple school policy configurations, including:

| Monetary fines | Disciplinary sanctions | Supported behavior |
|---:|---:|---|
| Enabled | Enabled | Late/absent records may show both a fine and a sanction indicator. |
| Enabled | Disabled | Monetary fines may exist without a sanction badge. |
| Disabled | Enabled | Students may be sanctioned without receiving a monetary fine. |
| Disabled | Disabled | Attendance status is recorded without a monetary or disciplinary policy indicator. |

The two settings can therefore be changed independently without breaking attendance persistence, reporting, or UI state.

### Policy snapshot and historical consistency

Attendance and fine persistence continue to use the database fine lifecycle and policy snapshot behavior. This preserves the policy context under which a monetary fine was originally created while allowing future policy changes to apply to new attendance records.

---

## Attendees View & UI Refinements

### Dedicated attendance tabs

The admin attendees view now separates attendance records into four dedicated tabs:

1. **Present**
   - Includes `present` and `confirmed` attendance records.

2. **Late**
   - Includes only records with `late` status.
   - Late students are no longer incorrectly grouped into the Absent tab.

3. **Absent**
   - Includes explicit persisted `absent` attendance records.
   - Also includes eligible students with no attendance record for the selected event/session.

4. **Duplicates**
   - Includes duplicate scan records.
   - Duplicate records can still be removed through the existing cleanup action.

### Identity-key standardization

Student matching in the attendees view now uses the internal `profiles.id` value as the canonical identity key.

The public student ID remains available for display and search, but it is no longer used as the primary relationship key between:

- the student roster;
- attendance scans;
- event attendees;
- persistent fines; and
- sanction indicators.

This prevents students from appearing in the wrong tab when a public student ID and internal profile UUID differ or when a profile join is incomplete.

### Explicit absent-record handling

The Absent tab now builds its rows from two sources:

1. Persisted attendance records with an explicit `absent` status.
2. Roster-gap records for eligible students without a persisted scan.

This preserves visibility for students who have not yet been scanned while allowing persisted absent rows to retain their database identifiers, fine relationships, and sanction state.

### Dynamic policy columns

The previous hardcoded `Fee` table header has been replaced with policy-aware display logic.

The absent view now shows:

- **Fee** when monetary fines are active.
- **Sanction** for sanction-only events.
- No policy column when neither monetary fines nor sanctions are active.

When both policies are active, the monetary fee remains visible and the sanction badge is shown independently.

This prevents sanction-only events from displaying a misleading monetary fee column.

### Sanction badges

Late and absent attendee rows now display sanction indicators whenever the selected event has sanctions enabled.

Examples include:

- `Sanctioned — Late`
- `Sanctioned — Absent`

Sanction badges are independent of whether monetary fines are enabled.

---

## Admin Student Profile Enhancements

### Event-level sanction status

When an administrator selects an event and session in the student profile, the profile now displays a sanction status indicator based on the selected event's policy and the student's attendance record.

Supported states include:

- **Sanctioned — Late**
- **Sanctioned — Absent**
- **No Sanction**

The status is displayed alongside attendance management controls and clearly communicates that sanction status is independent of monetary fines.

### Adaptive Fine Clearance panel

The Fine Clearance panel now appears when the student has persistent monetary fine rows, including historical rows.

This preserves the ability to:

- review unpaid fines;
- review paid or cleared history;
- clear selected fines; and
- clear all pending fines.

Disabling new monetary fines does not delete or hide existing persistent fine records.

### Sanction Status panel

When a student has no persistent monetary fine rows but the selected event enables sanctions, the profile displays a dedicated **Sanction Status** panel instead of an empty monetary clearance panel.

The panel explains that:

- no monetary fine records exist for the student; and
- sanctions are managed independently from monetary fines.

This avoids presenting an irrelevant payment-clearance interface during sanction-only policy periods.

### Historical and manual override support

The profile continues to support administrator attendance management, including manual attendance entry and overwriting of inferred absent records.

This is especially important for retroactively materialized historical events, where administrators may need to correct a record after confirming that a student was physically present before registering.

---

## Behavioral Examples

### Monetary-fine event

Configuration:

```text
finesEnabled = true
sanctions_enabled = false
```

Expected behavior:

- Late or absent attendance can create persistent monetary fines.
- The attendee view shows the Fee column.
- No sanction badge is displayed.
- The student profile shows Fine Clearance when persistent rows exist.

### Sanction-only event

Configuration:

```text
finesEnabled = false
sanctions_enabled = true
```

Expected behavior:

- Attendance rows are still persisted.
- Late or absent students receive sanction indicators.
- No new monetary fine rows are created.
- The attendee view shows the Sanction column instead of Fee.
- The student profile shows Sanction Status when no persistent fine rows exist.

### Combined policy event

Configuration:

```text
finesEnabled = true
sanctions_enabled = true
```

Expected behavior:

- Late or absent attendance can create persistent fines.
- The attendee view shows monetary fee information.
- Sanction badges also appear for late and absent records.
- The student profile preserves Fine Clearance and shows event-level sanction status.

### Policy-free event

Configuration:

```text
finesEnabled = false
sanctions_enabled = false
```

Expected behavior:

- Attendance status remains visible.
- No new monetary fine is created.
- No sanction badge is shown.
- No misleading Fee or Sanction policy column is displayed.

---

## Operational Notes

- The persistence SQL must be installed once in the Supabase SQL Editor.
- The materialization functions are designed to be idempotent.
- Existing persistent monetary fines are not automatically deleted when `finesEnabled` is disabled.
- Administrators should continue using attendance overwrite tools to correct legitimate historical attendance exceptions.
- Official monetary totals should use persistent `fines` rows rather than client-side inferred amounts.
- Sanction counts and sanction badges should be interpreted independently from monetary fee totals.

---

## Verification Checklist

### Database

- [ ] Student signup with a completed program materializes eligible historical sessions.
- [ ] Closing a future event materializes missing absent sessions.
- [ ] Repeating the event update does not create duplicates.
- [ ] Fine rows are created only when monetary fines are enabled and the configured amount is positive.
- [ ] Sanction-only events create attendance/sanction state without monetary fine rows.

### Attendees view

- [ ] Present students appear only in Present.
- [ ] Late students appear only in Late.
- [ ] Explicit absent rows and roster-gap students appear in Absent.
- [ ] Duplicate scans appear in Duplicates.
- [ ] Student matching remains correct when public student IDs differ from internal profile UUIDs.
- [ ] Fee, Sanction, or no policy column appears according to event settings.
- [ ] Sanction badges appear for late and absent students when enabled.

### Student profile

- [ ] Sanctioned — Late appears for late attendance on sanction-enabled events.
- [ ] Sanctioned — Absent appears for absent attendance on sanction-enabled events.
- [ ] No Sanction appears when sanctions are enabled but the student is not late or absent.
- [ ] Fine Clearance appears when persistent monetary rows exist.
- [ ] Sanction Status appears when no monetary rows exist and sanctions are active.
- [ ] Historical fine rows remain available after disabling new monetary fines.

---

## Summary

This release closes the gap between inferred attendance state and persistent database state, removes the dependency on repeated manual SQL execution for normal event completion, and makes monetary-fine and disciplinary-sanction policies independently configurable.

The resulting system now provides:

- automatic attendance and fine persistence;
- retroactive historical processing with administrator correction support;
- independent monetary and disciplinary policies;
- accurate Present, Late, Absent, and Duplicates attendee views;
- stable internal profile-based identity matching;
- policy-aware Fee and Sanction presentation; and
- adaptive student-profile clearance and sanction interfaces.

## Event Archiving UI Notes

The admin Events page uses the **Archive** control beside **New event** as the archived-events view switch and as the drag-and-drop archive target. Clicking **Archive** lazy-loads archived events and shows the archived card grid. Dragging an active event card archives it only when the card directly overlaps the Archive control; releasing elsewhere returns it to its original position. The archived view uses a three-card shimmer skeleton while the archived query is loading. Archived cards support version-checked **Restore** and confirmation-gated **Delete permanently** actions. The active event menu uses **Move to archive** instead of permanent Delete.
