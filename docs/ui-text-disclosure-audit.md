# UI Long-Text and Heavy-Component Disclosure Audit

**Project:** Attendance Manager System (Adesse)  
**Audit date:** 2026-09-26  
**Audit type:** Static source audit of all application routes and shared rendered components  
**Scope:** Places where long text, raw messages, or heavy content can make screens feel cluttered, with recommendations for `See more`, `View details`, or equivalent progressive disclosure.  
**Code changes:** None

## Executive summary

The system already has a good disclosure foundation in several high-traffic areas:

- Event cards and announcement cards use `line-clamp` and open dedicated detail views.
- Event detail pages already separate details from the media gallery on mobile.
- Admin student detail already uses a native `<details>` disclosure for attendance history.
- Tables and identity lists generally truncate names and event titles appropriately.

The largest remaining opportunities are:

1. **Admin excuse requests — High priority:** student-submitted reasons render in full inside every pending card, so one long message can make the review queue very tall.
2. **Admin reports — High priority:** event and program summaries concatenate many metrics into dense, multi-clause lines that are difficult to scan, especially on mobile.
3. **Admin event cards — Medium priority:** event metadata and policy badges can become crowded; the card already opens a detail view, but the compact card should expose fewer secondary policy values.
4. **Admin scanner — Medium priority:** the selected event's rules panel duplicates information available in the main selected-event panel and can be collapsed or summarized.
5. **Profile and admin student detail — Medium/low priority:** contact, verification, fine, and identity sections are all visible at once on narrow screens. These are not raw-message problems, but selective disclosure would reduce scroll length.

## Priority scale

| Priority | Meaning |
| --- | --- |
| **High** | Long user-generated or data-generated content can dominate a queue/report and materially slow scanning. Add a collapsed preview and an explicit details action. |
| **Medium** | Content is structured and bounded, but repeated metadata or policy information creates visual density. Simplify the summary and move secondary information behind details. |
| **Low** | The content is intentionally visible or already has a suitable disclosure pattern. Consider only if future data volume or mobile testing shows a problem. |

## Findings by route and component

### 1. `/admin-excuse-requests` — raw student reasons in pending review cards

**Priority: High**  
**Source:** `app/shared-page.tsx:12534-12655` (`AdminExcuseRequestsPage`)  
**Field:** `r.reason`  
**Current behavior:** Each pending request renders the complete reason in a normal paragraph:

```tsx
<p className="text-sm text-slate-600 leading-relaxed mb-3">
  {r.reason}
</p>
```

**Why it clutters the UI:** `reason` is user-generated and has no length cap in the rendered card. A multi-paragraph explanation can push the approve/deny controls far below the fold, and several long requests compound the problem in the queue.

**Recommendation:**

- Show a two- or three-line preview in the queue using `line-clamp-3`.
- Add a text button such as **View details** / **Read full reason** when the content exceeds the preview.
- Open the full reason in an inline expansion, a side panel, or a focused modal while retaining the request's event, student, proof, and action controls.
- Preserve whitespace for the expanded view if students can submit multi-paragraph explanations.
- Keep the proof filename visible in the summary; it is a useful triage signal and is already short.

**Suggested summary fields:** student, event/date, short reason preview, proof indicator, status, approve/deny.  **Expanded fields:** full reason, proof details, submission timestamp, and action controls.

---

### 2. `/admin-reports` — dense event metrics in one-line summaries

**Priority: High**  
**Source:** `app/shared-page.tsx:13248-13275` (`AdminReportsPage`)  
**Fields:** event date/time, fine rates, assessed fees, unique attendees, present/late sessions, absent sessions, late sessions, sanctioned sessions  
**Current behavior:** Each event row places most metrics into one long secondary line and another long tertiary line:

```tsx
{e.date} · ... · Fine rates: Absent ... · Late ...
Fees assessed ... · Students attended ... · Sessions: ...
```

**Why it clutters the UI:** The event title, two lines of metrics, and the right-side attendee count compete within a compact row. On mobile, the line can wrap into several lines and make the report feel like a wall of text. The information is structured, not narrative, so a text toggle alone is less effective than a compact summary plus a details disclosure.

**Recommendation:**

- Keep the first line to date/time and a short primary status summary.
- Replace the long metric strings with a compact set of 2–3 key values, for example: `Attended 42 · Absent 8 · Fees ₱1,200`.
- Add **View details** to reveal a small metric grid containing attendance sessions, late count, sanctioned sessions, fine rates, and assessed fees.
- On desktop, the details could expand beneath the row; on mobile, use a disclosure row or modal.
- Keep the export/print output complete even if the interactive screen is condensed.

**Related density:** Program cards at `app/shared-page.tsx:13170-13200` also combine attendance, absence, late, fees, and sanctions in a single paragraph. Use the same compact-summary/expanded-metrics pattern for consistency.

---

### 3. `/admin-events` — event cards show too many policy badges and metadata

**Priority: Medium**  
**Source:** `app/shared-page.tsx:9480-9605` (`AdminEventsPage`)  
**Fields:** date, absence fine, late fine, session count, location, single/multi-session schedule, status, actions  
**Current behavior:** The card's image area can contain date, fine rates, `2 sessions`, status, and the overflow menu. The body then repeats location and schedule information. The card opens `EventDetailPageView` when clicked, and the detail view already exposes the full description and gallery.

**Why it clutters the UI:** The summary card duplicates policy information and can create a crowded badge cluster, while the actual description is not shown at all in the list. The user must open the detail view for context, but the card still spends space on several secondary values.

**Recommendation:**

- Keep the card summary to status, title, date, location, and one compact policy indicator.
- Move fine rates, session-specific cutoffs, and sanction details behind **View details** or into the existing event detail view.
- If the current card click behavior remains, add a visible **View details** affordance or make the title/summary clearly actionable for discoverability.
- Do not add a second full description to the card; the existing event detail page is the appropriate expanded state.

**Note:** The student-facing event cards at `app/shared-page.tsx:5535-5540` already use `line-clamp-2`, so this finding is primarily about admin policy metadata, not unbounded descriptions.

---

### 4. `/admin-scanner` — duplicated event information and rules panel

**Priority: Medium**  
**Source:** `app/shared-page.tsx:10323-10630` (`AdminScannerPage`)  
**Fields:** selected event title/date/location, session selection, strict-mode rule, fine policy, event status  
**Current behavior:** The center panel shows the selected event and scan controls, while the right panel repeats title, status, date, location, schedule, attendance rule, and fine values under **Event info & rules**.

**Why it clutters the UI:** The scanner is an action-oriented workflow. Repeated context consumes vertical space around the primary **Open QR Scanner** action, especially on smaller laptop/tablet widths.

**Recommendation:**

- Keep the selected event title, status, and current session near the scanner action.
- Collapse **Event info & rules** by default on narrow screens with a **View event rules** toggle.
- On desktop, retain a compact panel but group secondary values under a disclosure titled **View full rules**.
- Keep the live warning that scanning is unavailable for non-active events always visible because it changes the action state.

---

### 5. `/admin-dashboard` — recent scan list is bounded, but the event context can be shortened

**Priority: Low/Medium**  
**Source:** `app/shared-page.tsx:7360-7525` (`AdminDashboard`)  
**Fields:** featured event title, student ID, program, section, scan time, status  
**Current behavior:** Recent scans are already limited by the data loader and each name is truncated. The section heading includes the full featured event title, and every row includes ID, program, and section.

**Why it may clutter:** Long event titles make the section heading wrap. Long program/section combinations also make row metadata visually dense, although they are bounded and not raw messages.

**Recommendation:**

- Keep the heading to **Recent scans** and move the featured event title into a small subtitle or tooltip when it is long.
- On mobile, show ID plus program only; expose section through **View details** or a row-level accessible label if needed.
- No urgent toggle is required for the current scan rows.

---

### 6. `/attendance-history` — excuse-request reason previews are already partially handled

**Priority: Low/Medium**  
**Source:** `app/shared-page.tsx:6575-6600` (`AttendanceHistoryPage`)  
**Field:** `r.reason`  
**Current behavior:** The request list uses `line-clamp-2`:

```tsx
<p className="text-xs text-slate-500 mt-2 line-clamp-2">
  {r.reason}
</p>
```

**Assessment:** This is a good compact treatment, and the full reason is available at submission time in the excuse modal. The list still has no explicit way to read a previously submitted full reason, so a **View details** affordance would be useful only if preserving historical full-text access is a product requirement.

**Recommendation:** Keep the current two-line preview. Consider adding a row expansion or detail modal only if students need to reread their full submitted explanation after submission.

---

### 7. `/my-fines` — fine reason is compact but can overflow semantically

**Priority: Low**  
**Source:** `app/shared-page.tsx:6708-6722` (`MyFinesPage`)  
**Field:** `fine.reason`  
**Current behavior:** The reason is appended to the date/session line with separators:

```tsx
{fine.reason && ` · ${fine.reason}`}
```

The current generated reasons are short (`Late attendance`, `Absent attendance`), so there is no immediate visual issue.

**Recommendation:** Keep as-is for current values. If fine reasons become administrator-entered or more descriptive, move the reason into a second line with `line-clamp-1` and add **View details** for the full explanation.

---

### 8. `/events` and event detail — already good progressive disclosure

**Priority: Low / no immediate change**  
**Sources:** `app/shared-page.tsx:5535-5540`, `app/shared-page.tsx:5830-5960`  
**Current behavior:**

- Event list cards use a one-line title and two-line description clamp.
- Clicking a card opens `EventDetailPageView`.
- The detail view gives the full description and separates details/gallery on mobile.

**Assessment:** This is the desired pattern for long event descriptions. No additional `See more` control is needed on the card unless users fail to discover that the card is clickable.

**Optional improvement:** Add a visible **View details** text affordance or button treatment for accessibility/discoverability instead of relying only on the card's click target.

---

### 9. `/announcements` and `/admin-announcements` — already good progressive disclosure

**Priority: Low / no immediate change**  
**Sources:** `app/shared-page.tsx:6300-6305`, `app/shared-page.tsx:6375-6387`, `app/shared-page.tsx:12510-12520`  
**Current behavior:**

- Announcement cards clamp the body to three lines.
- Clicking a card opens `AnnouncementDetailPageView` with the full `whitespace-pre-wrap` body.
- Admin cards retain the same compact preview and provide edit/delete actions through `DotMenu`.

**Assessment:** This is an appropriate card/detail split. The main consideration is affordance clarity: cards are clickable but do not visibly say **View details**.

**Optional improvement:** Add a subtle **View details** link or make the entire card a semantic button/link while preserving admin menu interaction.

---

### 10. `/admin-students/[id]` — dense profile, fines, attendance, and verification sections

**Priority: Medium on mobile; Low on desktop**  
**Source:** `app/(protected)/admin-students/[id]/page.tsx:541-940`  
**Current behavior:** The page presents profile identity, contact information, metrics, fine clearance, sanction status, attendance management, QR, school ID, and contact details in one long two-column page. It already uses a native `<details>` for **View Attendance History** around lines 857-887.

**Why it may clutter:** This page is intentionally a detail view, so hiding everything would be counterproductive. The issue is the amount of secondary verification and operational content visible at once on narrow screens.

**Recommendation:**

- Keep identity header, metrics, and attendance management visible.
- Consider collapsible sections for **Fine clearance**, **Sanction status**, **Student Pass QR**, **School ID**, and **Contact details** on mobile.
- Keep any pending/exception state summary visible even when the rest of that section is collapsed.
- Reuse the existing attendance-history disclosure pattern for consistency.

**Do not hide:** the currently selected event, existing-attendance warning, or overwrite/cancel controls; these are immediate workflow state and should remain visible.

---

### 11. `/profile` — intentionally detailed but long on mobile

**Priority: Low/Medium**  
**Source:** `app/shared-page.tsx:6755-7250` (`ProfilePage`)  
**Current behavior:** The profile page exposes identity card, QR, contact information, personal details, enrollment details, and school ID. Edit mode exposes all editable fields in grouped sections.

**Why it may clutter:** The page is a destination for reviewing account data, so full visibility is reasonable. On mobile, however, the QR, contact card, personal details, and ID image create a long scroll.

**Recommendation:**

- Keep the identity summary and edit action visible.
- Consider collapsing **Contact & info** and **School ID** when not editing.
- Leave **Personal details** visible because it is the primary purpose of the page.
- In edit mode, keep the current grouped sections; the form is already a deliberate full-detail workflow.

---

### 12. Onboarding terms/privacy — already bounded by an internal scroll region

**Priority: Low / no immediate change**  
**Source:** `app/shared-page.tsx:4684`  
**Current behavior:** The terms content is presented in a fixed-height `overflow-y-auto` region.

**Assessment:** This is appropriate for long legal text. Do not add a `See more` toggle that could obscure required consent content. Keep the internal scroll and ensure the consent action remains clear.

## Existing disclosure and truncation inventory

| Area | Existing protection | Audit result |
| --- | --- | --- |
| Event list descriptions | `line-clamp-2` | Good; full detail view exists |
| Announcement list bodies | `line-clamp-3` | Good; full detail view exists |
| Event detail gallery | Mobile details/gallery tabs; desktop bounded gallery scroll | Good |
| Attendance history request reasons | `line-clamp-2` | Good preview; full-history access optional |
| Student/admin list names | `truncate` and bounded metadata | Good |
| Admin student attendance history | Native `<details>` | Good pattern to reuse |
| Terms/privacy text | Fixed-height internal scroll | Appropriate; do not collapse required consent text |
| Admin excuse reasons | No clamp or disclosure | **Primary gap** |
| Admin report metric summaries | Long concatenated lines | **Primary gap** |
| Admin event policy badges | Multiple repeated summary values | Simplify or disclose |
| Admin scanner rules | Repeated context panel | Collapse on narrow screens |

## Recommended implementation order

1. **Admin excuse requests:** add a reason preview plus full-reason disclosure. This directly addresses raw user-generated text and protects the review workflow.
2. **Admin reports:** redesign event/program summaries into compact metrics with expandable detail rows. This produces the largest improvement in report scanability.
3. **Admin event cards:** reduce policy badge density and route secondary policy information through the existing event detail view.
4. **Admin scanner:** collapse or summarize the duplicated rules panel on smaller screens.
5. **Admin student detail/profile:** introduce mobile-only collapsible secondary sections after validating actual scroll depth with representative records.
6. **Optional affordance pass:** add visible `View details` text to clickable event and announcement cards so the existing detail views are discoverable without relying on card-click conventions.

## Consistency and accessibility guidance

- Use one vocabulary consistently: **View details** for structured records and **See more** for narrative text previews.
- Only show the toggle when content actually exceeds the preview; do not add redundant controls to short text.
- Expanded content should be keyboard accessible, have an explicit expanded/collapsed state, and preserve focus.
- Avoid hiding urgent workflow state, warnings, approval controls, or current selection context.
- Use `aria-expanded` and `aria-controls` for custom toggles, or prefer native `<details>/<summary>` where its interaction model fits.
- Preserve full text in print/export/report-download flows even when the interactive UI is condensed.
- Keep card summaries deterministic and short; move secondary metrics into labeled rows or a small grid rather than another prose sentence.

## Final assessment

The system does **not** need a broad, indiscriminate `See more` pass. Most public-facing narrative content already follows a sound preview-to-detail pattern. The focused work should target the admin operational screens where raw reasons and concatenated metrics are currently presented without enough structure. A small number of intentional disclosures—especially in excuse review and reports—will improve scanability without making the application feel hidden or fragmented.
