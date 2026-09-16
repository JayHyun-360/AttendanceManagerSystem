"use client";

// ─── Types ────────────────────────────────────────────────────────────────────

// attendance settings

// fine settings

// optimistic concurrency version for multi-admin conflict detection

// ─── Data ─────────────────────────────────────────────────────────────────────

// ─── Icons ────────────────────────────────────────────────────────────────────

// ─── Toggle ───────────────────────────────────────────────────────────────────

// ─── Shared primitives ────────────────────────────────────────────────────────

// ─── Avatar / ProfileIcon ─────────────────────────────────────────────────────

// ─── Layout ───────────────────────────────────────────────────────────────────

// ─── Adesse Logomark ───────────────────────────────────────────────────────────

// ─── QR Code ──────────────────────────────────────────────────────────────────

// ─── Top Bar ──────────────────────────────────────────────────────────────────
/* Left — hamburger + brand */ /* Right — user actions */ /* Three-dot menu */

// ─── Sidebar (desktop + mobile drawer) ───────────────────────────────────────
/* Mobile header inside drawer */ /* Nav items */ /* Sidebar footer */ /* ── Desktop: persistent sidebar ── */ /* ── Mobile: fade overlay ── */

// ─── LANDING CAROUSEL ─────────────────────────────────────────────────────────

// trackIdx can go 0…n (n = clone of slide 0)

// items: real slides + clone of first

// advance one step forward

// manual jump (dots/arrows) — always jumps to real slide

// after sliding onto the clone (trackIdx === n), silently snap to real slide 0
/* Slide strip */ /* Arrow controls */ /* Dot indicators — keyed to realIdx */

// ─── LANDING ──────────────────────────────────────────────────────────────────

// clone-trick state for hero
/* ── Hero ──────────────────────────────────────────────────── */ /* Background images — sliding clone-loop track */ /* Dot indicators */ /* Fallback radial glow when no image */ /* Hero content */ /* ── Feature cards ─────────────────────────────────────────── */ /* ── Event carousel ────────────────────────────────────────── */

// ─── LOGIN ────────────────────────────────────────────────────────────────────

// ─── ONBOARDING ───────────────────────────────────────────────────────────────

// Cleanup: revoke blob URL when component unmounts

// ─── EXCUSE MODAL ─────────────────────────────────────────────────────────────

// ─── Shared Form Modal ────────────────────────────────────────────────────────

// ─── Student Profile Modal (Moderator view, with QR) ─────────────────────────

// ─── Upcoming Event Card (adaptive: photo or green fallback) ──────────────────

/* Shared text content */ /* ── Mobile ── */

/* Photo full-bleed */

/* Green fallback */ /* ── Desktop ── */

/* Split card: green left + concave photo right */ /* SVG clip definition — concave left boundary for photo pane */ /* left edge bows leftward at midpoint creating a crescent notch */ /* Green background full-bleed */ /* Green content pane — left 62% */ /* Photo pane — right 45%, clipped with concave left arc */ /* Subtle left-edge blend into green */

/* Green fallback */

// ─── STUDENT: Dashboard ───────────────────────────────────────────────────────

// ─── STUDENT: Events ──────────────────────────────────────────────────────────

// ─── STUDENT: Event Detail ────────────────────────────────────────────────────
/* Gradient overlay */ /* Badge — top-left */ /* Bottom content — pinned with explicit bottom padding */ /* Lightbox */

// ─── STUDENT: My QR ───────────────────────────────────────────────────────────

// ─── STUDENT: Announcements ───────────────────────────────────────────────────

// ─── STUDENT: Attendance ──────────────────────────────────────────────────────

// ─── STUDENT: My Fines ────────────────────────────────────────────────────────

// ─── Profile (shared: student + moderator) ────────────────────────────────────

// Cleanup: revoke blob URLs when component unmounts or editing is cancelled

// Revoke blob URL if present before resetting

// ─── MODERATOR: Dashboard ─────────────────────────────────────────────────────

// ─── MODERATOR: Events ────────────────────────────────────────────────────────

// Map UI camelCase to database snake_case

// Map returned database row back to EventData shape

// multi-admin conflict check: compare version in current state

// Map to database snake_case
/* ── Create event modal ── */ /* Multi-session toggle */ /* Single-session time OR multi-session blocks */ /* Highlight photo */ /* ── Edit event modal ── */ /* Multi-session toggle */

// ─── MODERATOR: QR Scanner ────────────────────────────────────────────────────

/* not supported */ /* Scanner header */ /* Camera viewport */ /* Live video */ /* Hidden canvas for jsQR frame decoding */ /* Dark vignette overlay */ /* Scan frame */ /* Scanline — static when idle, single sweep on QR detect */ /* Corner marks */ /* Camera error state */ /* Result overlay */ /* Bottom hint */ /* Event selection */ /* Open scanner CTA */ /* Recent scans this session */

// ─── MODERATOR: Attendees ─────────────────────────────────────────────────────

// ─── MODERATOR: Students ──────────────────────────────────────────────────────

// ─── MODERATOR: Announcements ─────────────────────────────────────────────────

// ─── MODERATOR: Excuse Requests ───────────────────────────────────────────────

// ─── MODERATOR: Reports ───────────────────────────────────────────────────────

// estimate height

// ── Header bar

// generated date

// ── Attendance by program

// ── Fees summary

// ── By event

// ── Footer

// Open as PDF-like image

// ─── MODERATOR: Management & Settings ────────────────────────────────────────
/* Fee Visibility */ /* Attendance & Requests */ /* Academic Information */ /* Landing Page */ /* Hero images */ /* Carousel slides */ /* Thumbnail */ /* Fields */ /* Controls */ /* System Info */

import { useState, useRef, useEffect, Fragment } from "react";

import Link from "next/link";

import { usePathname, useRouter } from "next/navigation";

import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import { z } from "zod";

import { format } from "date-fns";

import { ArrowLeft, ChevronDown, ChevronUp, LogOut } from "lucide-react";

import { AnimatePresence, motion } from "framer-motion";

import {
  Bar,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import jsQR from "jsqr";

import QRCode from "qrcode";

import { toast } from "sonner";

import { supabase } from "@/lib/supabase";

import { recordAttendance } from "@/lib/attendance";

/*
import { deleteImages, uploadImage } from "@/lib/uploadImage";

import { Skeleton } from "@/components/ui/skeleton";
      <div className="space-y-6">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-1">
          <BackButton
            onClick={onBack}
            label={isMod ? "Back to Overview" : "Back to Home"}
          />
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button
                  onClick={() => {
                    if (draft.photoUrl && draft.photoUrl.startsWith("blob:")) {
                      URL.revokeObjectURL(draft.photoUrl);
                    }

                    setDraft({ ...user });
                    setEditing(false);
                  }}
                  className="h-9 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-500 hover:bg-slate-50"
                >
                  Discard
                </button>
                <button
                  onClick={() => {
                    onSave({ ...user, ...draft });
                    setEditing(false);
                  }}
                  disabled={saving}
                  className="h-9 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              >
                <Icons.Edit />
                Edit profile
              </button>
            )}
          </div>
        </div>

        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-5">
            <p className="text-2xl font-bold tracking-tight text-slate-900">
              {fullName(profile) || "Your name"}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[profile.program, profile.yearLevel, profile.section]
                .filter(Boolean)
                .map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200"
                  >
                    {tag}
                  </span>
                ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <aside className="space-y-4 lg:col-span-4">
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white pt-1 shadow-sm">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-700" />
                <div className="p-5 text-center">
                  <div className="relative mx-auto w-fit">
                    {editing && photoUploadState === "uploading" ? (
                      <Skeleton className="h-24 w-24 rounded-full" />
                    ) : (
                      <ProfileIcon photoUrl={profile.photoUrl} size="lg" />
                    )}
                    {editing && photoUploadState === "error" && (
                      <p className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-red-600">
                        Upload failed, try again
                      </p>
                    )}
                    {editing && (
                      <>
                        <input
                          ref={photoRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePhotoChange}
                        />
                        <button
                          onClick={() => photoRef.current?.click()}
                          className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md transition-colors hover:bg-emerald-600"
                          aria-label="Change profile photo"
                        >
                          <Icons.Camera />
                        </button>
                      </>
                    )}
                  </div>
                  {editing && (
                    <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                      <Icons.Camera />
                      Tap the camera button to change your photo
                    </p>
                  )}
                  <p className="mt-4 text-lg font-bold text-slate-900">
                    {fullName(profile) || "Your name"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {profile.studentId || (isMod ? "Admin" : "No ID")}
                  </p>
                  {!isMod && (
                    <div className="mt-5 rounded-xl bg-slate-50 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Student QR
                      </p>
                      <div className="mt-3 flex justify-center rounded-xl bg-white p-3">
                        <StudentQR studentId={profile.studentId} size={170} />
                      </div>
                      <p className="mt-3 text-center text-xs font-medium text-slate-500">
                        ADESSE:{profile.studentId}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Contact & info
                </p>
                <div className="mt-4 divide-y divide-slate-100">
                  {[
                    { label: "Phone", value: profile.phone || "Not provided" },
                    {
                      label: "Email",
                      value: profile.contactEmail || "Not provided",
                    },
                  ].map((item) => (
                    <div key={item.label} className="py-3 first:pt-0 last:pb-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        {item.label}
                      </p>
                      <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            <main className="space-y-4 lg:col-span-8">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-5">
                <p className="text-base font-semibold text-slate-800">
                  Profile information
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {editing
                    ? "Keep your Adesse profile details up to date."
                    : "Your current account and enrollment details."}
                </p>

                {!editing ? (
                  <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {[
                      { label: "First name", value: user.firstName },
                      {
                        label: "Middle initial",
                        value: user.middleInitial
                          ? `${user.middleInitial}.`
                          : "—",
                      },
                      { label: "Surname", value: user.surname },
                      ...(!isMod
                        ? [{ label: "Student ID", value: user.studentId }]
                        : []),
                      { label: "Program", value: user.program },
                      ...(!isMod
                        ? [
                            { label: "Year level", value: user.yearLevel },
                            {
                              label: "Section",
                              value: user.section || "—",
                            },
                          ]
                        : []),
                    ].map((item, index, items) => (
                      <div
                        key={item.label}
                        className={`flex items-center justify-between gap-4 bg-white px-4 py-3 ${
                          index < items.length - 1
                            ? "border-b border-slate-100"
                            : ""
                        }`}
                      >
                        <span className="text-xs font-semibold text-slate-400">
                          {item.label}
                        </span>
                        <span className="text-right text-sm font-semibold text-slate-900">
                          {item.value || "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <SectionLabel>Name</SectionLabel>
                    </div>
                    <div className="space-y-3 px-4 py-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <FieldInput
                            label="First Name"
                            value={draft.firstName}
                            onChange={setF("firstName")}
                          />
                        </div>
                        <FieldInput
                          label="M.I."
                          value={draft.middleInitial}
                          maxLength={2}
                          onChange={setF("middleInitial")}
                        />
                      </div>
                      <FieldInput
                        label="Surname"
                        value={draft.surname}
                        onChange={setF("surname")}
                      />
                    </div>
                    <div className="border-y border-slate-100 px-4 py-3">
                      <SectionLabel>Contact</SectionLabel>
                    </div>
                    <div className="space-y-3 px-4 py-4">
                      <FieldInput
                        label="Phone"
                        type="tel"
                        placeholder="09XX XXX XXXX"
                        value={draft.phone}
                        onChange={setF("phone")}
                      />
                      <FieldInput
                        label="Email"
                        type="email"
                        value={draft.contactEmail}
                        onChange={setF("contactEmail")}
                      />
                    </div>
                    {!isMod && (
                      <>
                        <div className="border-y border-slate-100 px-4 py-3">
                          <SectionLabel>Enrollment</SectionLabel>
                        </div>
                        <div className="space-y-3 px-4 py-4">
                          <FieldInput
                            label="Student ID (7 digits)"
                            value={draft.studentId}
                            onChange={setF("studentId")}
                          />
                          <FieldSelect
                            label="Program"
                            value={draft.program}
                            onChange={setF("program")}
                          >
                            <option value="">Select program</option>
                            <option>BSIT - Information Technology</option>
                            <option>BSCS - Computer Science</option>
                            <option>BSBA - Business Administration</option>
                            <option>BSEd - Secondary Education</option>
                            <option>BSHM - Hospitality Management</option>
                          </FieldSelect>
                          <FieldSelect
                            label="Year Level"
                            value={draft.yearLevel}
                            onChange={setF("yearLevel")}
                          >
                            <option value="">Select year level</option>
                            <option>1st Year</option>
                            <option>2nd Year</option>
                            <option>3rd Year</option>
                            <option>4th Year</option>
                          </FieldSelect>
                          <FieldInput
                            label="Section"
                            placeholder="e.g. IT-2A"
                            value={draft.section}
                            onChange={setF("section")}
                          />
                        </div>
                        <div className="flex items-start gap-2.5 border-t border-amber-100 bg-amber-50 px-4 py-3.5">
                          <span className="mt-0.5 shrink-0 text-amber-500">
                            <Icons.AlertCircle />
                          </span>
                          <p className="text-xs leading-relaxed text-amber-700">
                            Saving changes will regenerate your QR code.
                            Previously downloaded images will be invalidated.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {!isMod && (
                <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      School ID photo
                    </p>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                      Verification
                    </span>
                  </div>
                  <div className="mt-4 overflow-hidden rounded-xl bg-slate-100">
                    {profile.idPhotoUrl ? (
                      <img
                        src={profile.idPhotoUrl}
                        alt="School ID"
                        className="h-[260px] w-full object-contain md:h-[360px]"
                      />
                    ) : (
                      <div className="flex min-h-[260px] items-center justify-center border border-dashed border-amber-200 bg-amber-50 p-6 text-center md:min-h-[360px]">
                        </div>
                  import { deleteImages, uploadImage } from "@/lib/uploadImage";

                  import { Skeleton } from "@/components/ui/skeleton";

                  const adesseLogoSrc = "/adesse-logo.svg";

                  const dashboardDateLabel = format(new Date(), "MMM d, yyyy · EEEE");

                  function toMinutes(value?: string | null) {
                    if (!value) return null;
                    const cleaned = value.trim();
                    const spanMatch = cleaned.match(
                      /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?\s*(AM|PM)?$/i,
                    );
                    if (!spanMatch) return null;
                    let hour = Number(spanMatch[1]);
                    const minute = Number(spanMatch[2]);
                    const meridiem = spanMatch[3]?.toUpperCase();
                    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
                    if (meridiem === "AM" && hour === 12) hour = 0;
                    if (meridiem === "PM" && hour !== 12) hour += 12;
                    return hour * 60 + minute;
                  }

                  function getEventSessionMeta(event: EventData | null | undefined) {
                    if (!event) {
                      return {
                        sessionLabel: null as "morning" | "afternoon" | null,
                        strict: false,
                        hasActiveSession: false,
                      };
                    }
                    if (!event.multiSession) {
                      return {
                        sessionLabel: "morning" as const,
                        strict: !!event.strictMorning,
                        hasActiveSession: true,
                      };
                    }
                    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
                    const morningStart = toMinutes(event.morningStart);
                    const morningEnd = toMinutes(event.morningEnd);
                    const afternoonStart = toMinutes(event.afternoonStart);
                    const afternoonEnd = toMinutes(event.afternoonEnd);
                    if (
                      morningStart !== null &&
                      morningEnd !== null &&
                      nowMinutes >= morningStart &&
                      nowMinutes <= morningEnd
                    ) {
                      return {
                        sessionLabel: "morning" as const,
                        strict: !!event.strictMorning,
                        hasActiveSession: true,
                      };
                    }
                    if (
                      afternoonStart !== null &&
                      afternoonEnd !== null &&
                      nowMinutes >= afternoonStart &&
                      nowMinutes <= afternoonEnd
                    ) {
                      return {
                        sessionLabel: "afternoon" as const,
                        strict: !!event.strictAfternoon,
                        hasActiveSession: true,
                      };
                    }
                    return { sessionLabel: null, strict: false, hasActiveSession: false };
                  }

                  function getSelectedSessionMeta(
                    event: EventData | null | undefined,
                    manualSessionLabel: "morning" | "afternoon" | null,
                  ) {
                    if (!event) {
                      return {
                        sessionLabel: null as "morning" | "afternoon" | null,
                        strict: false,
                      };
                    }
                    if (!event.multiSession) {
                      return { sessionLabel: "morning" as const, strict: !!event.strictMorning };
                    }
                    if (manualSessionLabel === "morning" || manualSessionLabel === "afternoon") {
                      return {
                        sessionLabel: manualSessionLabel,
                        strict:
                          manualSessionLabel === "morning"
                            ? !!event.strictMorning
                            : !!event.strictAfternoon,
                      };
                    }
                    return getEventSessionMeta(event);
                  }

                  export type Page = string;
                  export type Role = "student" | "admin" | null;
                  export type FineStatus = "unpaid" | "paid" | "excused";
                  export type EventStatus = "active" | "upcoming" | "closed";

                  export interface User {
                    firstName: string;
                    middleInitial: string;
                    surname: string;
                    studentId: string;
                    program: string;
                    yearLevel: string;
                    section: string;
                    phone: string;
                    contactEmail: string;
                    role: Role;
                    photoUrl?: string;
                    coverPhotoUrl?: string;
                    idPhotoUrl?: string;
                  }

                  export interface EventData {
                    id: string;
                    title: string;
                    date: string;
                    time: string;
                    location: string;
                    status: EventStatus;
                    attendees: number;
                    description: string;
                    program: string;
                    fineAmount: number;
                    mediaUrls?: string[];
                    highlightUrl?: string;
                    multiSession?: boolean;
                    strictMorning?: boolean;
                    strictAfternoon?: boolean;
                    morningStart?: string;
                    morningEnd?: string;
                    morningLateCutoff?: string;
                    afternoonStart?: string;
                    afternoonEnd?: string;
                    afternoonLateCutoff?: string;
                    absentFine?: number;
                    lateFine?: number;
                    morningAbsentFine?: number;
                    morningLateFine?: number;
                    afternoonAbsentFine?: number;
                    afternoonLateFine?: number;
                    version?: number;
                  }

                  interface ScanRecord {
                    name: string;
                    id: string;
                    program: string;
                    section: string;
                    photoUrl?: string;
                    time: string;
                    status: "confirmed" | "late" | "duplicate";
                    action?: "time_in" | "time_out" | "time_out_rejected" | "duplicate";
                    dbId: string | number;
                  }

                  export interface ExcuseRequest {
                    id: string;
                    studentName: string;
                    studentId: string;
                    photoUrl?: string;
                    event: string;
                    date: string;
                    reason: string;
                    proofName: string | null;
                    status: "pending" | "approved" | "denied";
                    submittedDate: string;
                  }

                  export interface FineRecord {
                    id: string;
                    eventId: string;
                    eventTitle: string;
                    eventDate: string;
                    amount: number;
                    status: FineStatus;
                  }

                  export interface StudentProfile {
                    profileId?: string;
                    name: string;
                    id: string;
                    program: string;
                    yearLevel: string;
                    section: string;
                    phone: string;
                    email: string;
                    photoUrl?: string;
                    idPhotoUrl?: string;
                    joinedDate: string;
                  }

                            No ID photo uploaded
                          </p>
                          <p className="mt-1 text-xs text-amber-700">
                            Upload a school ID photo from Edit profile.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="mt-2.5 text-center text-[11px] text-slate-400">
                    Used for identity verification by moderators
                  </p>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
*/
import { deleteImages, uploadImage } from "@/lib/uploadImage";

import { Skeleton } from "@/components/ui/skeleton";

const adesseLogoSrc = "/adesse-logo.svg";

const dashboardDateLabel = format(new Date(), "MMM d, yyyy · EEEE");

function toMinutes(value?: string | null) {
  if (!value) return null;
  const match = value
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (hour > 23 || minute > 59) return null;
  if (meridiem === "AM" && hour === 12) hour = 0;
  if (meridiem === "PM" && hour !== 12) hour += 12;
  return hour * 60 + minute;
}

function getEventSessionMeta(event: EventData | null | undefined) {
  if (!event) {
    return {
      sessionLabel: null as "morning" | "afternoon" | null,
      strict: false,
      hasActiveSession: false,
    };
  }
  if (!event.multiSession) {
    return {
      sessionLabel: "morning" as const,
      strict: !!event.strictMorning,
      hasActiveSession: true,
    };
  }
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const morningStart = toMinutes(event.morningStart);
  const morningEnd = toMinutes(event.morningEnd);
  const afternoonStart = toMinutes(event.afternoonStart);
  const afternoonEnd = toMinutes(event.afternoonEnd);
  if (
    morningStart !== null &&
    morningEnd !== null &&
    nowMinutes >= morningStart &&
    nowMinutes <= morningEnd
  ) {
    return {
      sessionLabel: "morning" as const,
      strict: !!event.strictMorning,
      hasActiveSession: true,
    };
  }
  if (
    afternoonStart !== null &&
    afternoonEnd !== null &&
    nowMinutes >= afternoonStart &&
    nowMinutes <= afternoonEnd
  ) {
    return {
      sessionLabel: "afternoon" as const,
      strict: !!event.strictAfternoon,
      hasActiveSession: true,
    };
  }
  return { sessionLabel: null, strict: false, hasActiveSession: false };
}

function getSelectedSessionMeta(
  event: EventData | null | undefined,
  manualSessionLabel: "morning" | "afternoon" | null,
) {
  if (!event) {
    return {
      sessionLabel: null as "morning" | "afternoon" | null,
      strict: false,
    };
  }
  if (!event.multiSession) {
    return { sessionLabel: "morning" as const, strict: !!event.strictMorning };
  }
  if (manualSessionLabel === "morning" || manualSessionLabel === "afternoon") {
    return {
      sessionLabel: manualSessionLabel,
      strict:
        manualSessionLabel === "morning"
          ? !!event.strictMorning
          : !!event.strictAfternoon,
    };
  }
  return getEventSessionMeta(event);
}

export type Page = string;
export type Role = "student" | "admin" | null;
export type FineStatus = "unpaid" | "paid" | "excused";
export type EventStatus = "active" | "upcoming" | "closed";

export interface User {
  firstName: string;
  middleInitial: string;
  surname: string;
  studentId: string;
  program: string;
  yearLevel: string;
  section: string;
  phone: string;
  contactEmail: string;
  role: Role;
  photoUrl?: string;
  coverPhotoUrl?: string;
  idPhotoUrl?: string;
  qrVersion?: number;
}

export interface EventData {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  status: EventStatus;
  attendees: number;
  description: string;
  program: string;
  fineAmount: number;
  mediaUrls?: string[];
  highlightUrl?: string;
  multiSession?: boolean;
  strictMorning?: boolean;
  strictAfternoon?: boolean;
  morningStart?: string;
  morningEnd?: string;
  morningLateCutoff?: string;
  afternoonStart?: string;
  afternoonEnd?: string;
  afternoonLateCutoff?: string;
  absentFine?: number;
  lateFine?: number;
  morningAbsentFine?: number;
  morningLateFine?: number;
  afternoonAbsentFine?: number;
  afternoonLateFine?: number;
  version?: number;
}

interface ScanRecord {
  name: string;
  id: string;
  program: string;
  section: string;
  photoUrl?: string;
  time: string;
  status: "present" | "confirmed" | "late" | "duplicate";
  action?: "time_in" | "time_out" | "time_out_rejected" | "duplicate";
  dbId: string | number;
}

export interface ExcuseRequest {
  id: string;
  studentName: string;
  studentId: string;
  photoUrl?: string;
  event: string;
  eventId?: string;
  fineId?: string;
  date: string;
  reason: string;
  proofName: string | null;
  status: "pending" | "approved" | "denied";
  submittedDate: string;
}

export interface FineRecord {
  id: string;
  eventId: string;
  attendanceScanId?: string;
  sessionLabel?: string;
  eventTitle: string;
  eventDate: string;
  amount: number;
  status: FineStatus;
}

export interface StudentProfile {
  profileId?: string;
  name: string;
  id: string;
  program: string;
  yearLevel: string;
  section: string;
  phone: string;
  email: string;
  photoUrl?: string;
  idPhotoUrl?: string;
  joinedDate: string;
}

function fullName(u: Pick<User, "firstName" | "middleInitial" | "surname">) {
  const mid = u.middleInitial ? ` ${u.middleInitial}.` : "";

  return `${u.firstName}${mid} ${u.surname}`.trim();
}

function normalizeEventTime(value: string): string | null {
  const normalized = value.trim().replace(/;/g, ":").toUpperCase();

  const twelveHour = normalized.match(
    /^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/,
  );

  if (twelveHour) {
    let hour = Number(twelveHour[1]);

    const minute = Number(twelveHour[2]);

    if (hour < 1 || hour > 12 || minute > 59) return null;

    if (twelveHour[3] === "AM" && hour === 12) hour = 0;

    if (twelveHour[3] === "PM" && hour !== 12) hour += 12;

    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  const twentyFourHour = normalized.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);

  if (twentyFourHour) {
    const hour = Number(twentyFourHour[1]);

    const minute = Number(twentyFourHour[2]);

    if (hour > 23 || minute > 59) return null;

    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  return null;
}

function parseEventTimeRange(value: string): {
  start: string;

  end: string | null;
} | null {
  const parts = value.trim().split(/\s*[-–—]\s*/);

  const start = normalizeEventTime(parts[0] ?? "");

  const end = parts[1] ? normalizeEventTime(parts[1]) : null;

  if (!start || (parts[1] && !end)) return null;

  return { start, end };
}

export const INITIAL_EVENTS: EventData[] = [
  {
    id: "1",

    title: "Adesse Foundation Day Celebration",

    date: "Aug 29, 2026",

    time: "8:00 AM – 5:00 PM",

    location: "Main Gymnasium",

    status: "upcoming",

    attendees: 0,

    program: "All Programs",

    fineAmount: 150,

    description:
      "Annual Foundation Day celebration featuring cultural shows, sports competitions, and academic exhibits. Attendance is required for all enrolled students.",
  },

  {
    id: "2",

    title: "SSG General Assembly — 1st Semester",

    date: "Aug 22, 2026",

    time: "1:00 PM – 4:00 PM",

    location: "Audio-Visual Room 2",

    status: "active",

    attendees: 6,

    program: "All Programs",

    fineAmount: 100,

    description:
      "Supreme Student Government general assembly for the first semester. Agenda includes budget presentation, committee reports, and open forum.",
  },

  {
    id: "3",

    title: "Tech Talk: AI in Education",

    date: "Aug 15, 2026",

    time: "2:00 PM – 5:00 PM",

    location: "ICT Laboratory",

    status: "closed",

    attendees: 8,

    program: "BSIT / BSCS",

    fineAmount: 50,

    description:
      "Integration of artificial intelligence tools in modern education. Guest speaker from the Department of Information Technology.",
  },

  {
    id: "4",

    title: "Intramural Opening Ceremony",

    date: "Sep 5, 2026",

    time: "7:30 AM – 12:00 PM",

    location: "Covered Court",

    status: "upcoming",

    attendees: 0,

    program: "All Programs",

    fineAmount: 200,

    description:
      "Opening ceremony for the annual intramural sports festival. Parade of athletes, oath-taking, and opening of games.",
  },
];

const EVENT_SCANS: Record<string, ScanRecord[]> = {
  "2": [
    {
      name: "Maria Luisa Santos",

      id: "2440014",

      program: "BSIT",

      section: "IT-2A",

      time: "1:14 PM",

      status: "confirmed",

      dbId: 0,
    },

    {
      name: "Juan Carlos Dela Cruz",

      id: "2440042",

      program: "BSCS",

      section: "CS-1B",

      time: "1:15 PM",

      status: "confirmed",

      dbId: 1,
    },

    {
      name: "Alyssa Mae Reyes",

      id: "2430087",

      program: "BSIT",

      section: "IT-3A",

      time: "1:16 PM",

      status: "confirmed",

      dbId: 2,
    },

    {
      name: "Carlo Miguel Mendoza",

      id: "2440103",

      program: "BSCS",

      section: "CS-2A",

      time: "1:17 PM",

      status: "duplicate",

      dbId: 3,
    },

    {
      name: "Jessa Rose Flores",

      id: "2430211",

      program: "BSIT",

      section: "IT-2B",

      time: "1:18 PM",

      status: "confirmed",

      dbId: 4,
    },

    {
      name: "Rafael Antonio Lim",

      id: "2440178",

      program: "BSBA",

      section: "BA-1A",

      time: "1:19 PM",

      status: "confirmed",

      dbId: 5,
    },
  ],

  "3": [
    {
      name: "Maria Luisa Santos",

      id: "2440014",

      program: "BSIT",

      section: "IT-2A",

      time: "2:03 PM",

      status: "confirmed",

      dbId: 0,
    },

    {
      name: "Patricia Nicole Torres",

      id: "2430055",

      program: "BSIT",

      section: "IT-3B",

      time: "2:05 PM",

      status: "confirmed",

      dbId: 1,
    },

    {
      name: "Emmanuel Jay Bautista",

      id: "2440290",

      program: "BSCS",

      section: "CS-1A",

      time: "2:07 PM",

      status: "confirmed",

      dbId: 2,
    },

    {
      name: "Juan Carlos Dela Cruz",

      id: "2440042",

      program: "BSCS",

      section: "CS-1B",

      time: "2:09 PM",

      status: "confirmed",

      dbId: 3,
    },

    {
      name: "Alyssa Mae Reyes",

      id: "2430087",

      program: "BSIT",

      section: "IT-3A",

      time: "2:10 PM",

      status: "confirmed",

      dbId: 4,
    },

    {
      name: "Kevin Roy Castillo",

      id: "2440067",

      program: "BSIT",

      section: "IT-1B",

      time: "2:12 PM",

      status: "confirmed",

      dbId: 5,
    },

    {
      name: "Francesca Dizon",

      id: "2430144",

      program: "BSBA",

      section: "BA-2A",

      time: "2:14 PM",

      status: "confirmed",

      dbId: 6,
    },

    {
      name: "Jessa Rose Flores",

      id: "2430211",

      program: "BSIT",

      section: "IT-2B",

      time: "2:16 PM",

      status: "confirmed",

      dbId: 7,
    },
  ],
};

const ALL_STUDENTS: StudentProfile[] = [
  {
    name: "Maria Luisa Santos",

    id: "2440014",

    program: "BSIT",

    yearLevel: "2nd Year",

    section: "IT-2A",

    phone: "09171234567",

    email: "mls.santos@adesse.edu",

    joinedDate: "Aug 12, 2026",
  },

  {
    name: "Juan Carlos Dela Cruz",

    id: "2440042",

    program: "BSCS",

    yearLevel: "1st Year",

    section: "CS-1B",

    phone: "09281234568",

    email: "jc.delacruz@adesse.edu",

    joinedDate: "Aug 13, 2026",
  },

  {
    name: "Alyssa Mae Reyes",

    id: "2430087",

    program: "BSIT",

    yearLevel: "3rd Year",

    section: "IT-3A",

    phone: "09391234569",

    email: "am.reyes@adesse.edu",

    joinedDate: "Aug 10, 2026",
  },

  {
    name: "Carlo Miguel Mendoza",

    id: "2440103",

    program: "BSCS",

    yearLevel: "2nd Year",

    section: "CS-2A",

    phone: "09501234570",

    email: "cm.mendoza@adesse.edu",

    joinedDate: "Aug 14, 2026",
  },

  {
    name: "Jessa Rose Flores",

    id: "2430211",

    program: "BSIT",

    yearLevel: "2nd Year",

    section: "IT-2B",

    phone: "09611234571",

    email: "jr.flores@adesse.edu",

    joinedDate: "Aug 11, 2026",
  },

  {
    name: "Rafael Antonio Lim",

    id: "2440178",

    program: "BSBA",

    yearLevel: "1st Year",

    section: "BA-1A",

    phone: "09721234572",

    email: "ra.lim@adesse.edu",

    joinedDate: "Aug 15, 2026",
  },

  {
    name: "Patricia Nicole Torres",

    id: "2430055",

    program: "BSIT",

    yearLevel: "3rd Year",

    section: "IT-3B",

    phone: "09831234573",

    email: "pn.torres@adesse.edu",

    joinedDate: "Aug 10, 2026",
  },

  {
    name: "Emmanuel Jay Bautista",

    id: "2440290",

    program: "BSCS",

    yearLevel: "1st Year",

    section: "CS-1A",

    phone: "09941234574",

    email: "ej.bautista@adesse.edu",

    joinedDate: "Aug 16, 2026",
  },

  {
    name: "Francesca Dizon",

    id: "2430144",

    program: "BSBA",

    yearLevel: "2nd Year",

    section: "BA-2A",

    phone: "09051234575",

    email: "f.dizon@adesse.edu",

    joinedDate: "Aug 12, 2026",
  },

  {
    name: "Kevin Roy Castillo",

    id: "2440067",

    program: "BSIT",

    yearLevel: "1st Year",

    section: "IT-1B",

    phone: "09161234576",

    email: "kr.castillo@adesse.edu",

    joinedDate: "Aug 17, 2026",
  },
];

export const INITIAL_ANNOUNCEMENTS = [
  {
    id: "1",

    title: "Enrollment for 2nd Semester Now Open",

    body: "Online enrollment for the second semester of AY 2026-2027 is now open. Complete enrollment on or before September 15, 2026. Late enrollees are subject to a P200 surcharge.",

    date: "Aug 20, 2026",

    author: "Registrar's Office",

    badge: "Academic",

    photoUrl: "",
  },

  {
    id: "2",

    title: "Afternoon Classes Suspended — Aug 22",

    body: "Due to the SSG General Assembly on August 22, all afternoon classes from 1:00 PM onward are suspended. Morning classes proceed as scheduled.",

    date: "Aug 19, 2026",

    author: "Office of the Principal",

    badge: "Schedule",

    photoUrl: "",
  },

  {
    id: "3",

    title: "Library Hours Extended During Finals Week",

    body: "The library will be open 7:00 AM to 7:00 PM starting August 25 until September 6. Laptops allowed; food and drinks are not permitted.",

    date: "Aug 18, 2026",

    author: "Library Services",

    badge: "Facilities",

    photoUrl: "",
  },

  {
    id: "4",

    title: "Scholarship Application Deadline — Aug 28",

    body: "All scholarship applicants must submit complete documentary requirements to the Scholarship Office by August 28, 2026.",

    date: "Aug 17, 2026",

    author: "Scholarship Office",

    badge: "Financial",

    photoUrl: "",
  },
];

export const ATTENDANCE_RECORDS = [
  {
    id: "a1",

    eventId: "2",

    event: "SSG General Assembly — 1st Semester",

    date: "Aug 22, 2026",

    time: "1:14 PM",

    status: "present",
  },

  {
    id: "a2",

    eventId: "3",

    event: "Tech Talk: AI in Education",

    date: "Aug 15, 2026",

    time: "2:03 PM",

    status: "present",
  },

  {
    id: "a3",

    eventId: "5",

    event: "College Orientation 2026",

    date: "Aug 5, 2026",

    time: "—",

    status: "absent",
  },

  {
    id: "a4",

    eventId: "6",

    event: "Leadership & Values Seminar",

    date: "Jul 28, 2026",

    time: "—",

    status: "absent",
  },
];

const STUDENT_FINES: FineRecord[] = [
  {
    id: "f1",

    eventId: "5",

    eventTitle: "College Orientation 2026",

    eventDate: "Aug 5, 2026",

    amount: 150,

    status: "unpaid",
  },

  {
    id: "f2",

    eventId: "6",

    eventTitle: "Leadership & Values Seminar",

    eventDate: "Jul 28, 2026",

    amount: 100,

    status: "unpaid",
  },
];

const sv = {
  fill: "none",

  stroke: "currentColor",

  strokeWidth: 2,

  strokeLinecap: "round" as const,

  strokeLinejoin: "round" as const,
};

const ic = "w-[18px] h-[18px] shrink-0";

const Icons = {
  Home: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),

  Calendar: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),

  Bell: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),

  QrCode: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="3" height="3" />
      <path d="M17 17h4v4h-4z" />
    </svg>
  ),

  User: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),

  Shield: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),

  CheckCircle: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),

  Check: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),

  XCircle: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),

  Clock: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),

  MapPin: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),

  ChevronRight: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),

  ChevronLeft: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),

  Scan: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <path d="M3 7V5a2 2 0 012-2h2" />
      <path d="M17 3h2a2 2 0 012 2v2" />
      <path d="M21 17v2a2 2 0 01-2 2h-2" />
      <path d="M7 21H5a2 2 0 01-2-2v-2" />
      <rect x="7" y="7" width="10" height="10" rx="1" />
    </svg>
  ),

  Users: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),

  BarChart: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  ),

  FileText: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),

  LogOut: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),

  Download: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),

  Plus: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),

  AlertCircle: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),

  Edit: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),

  MoreHorizontal: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="19" cy="12" r="1" fill="currentColor" />
    </svg>
  ),

  Trash: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  ),

  Paperclip: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
    </svg>
  ),

  Mail: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),

  Activity: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),

  Send: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),

  X: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),

  Image: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),

  Video: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  ),

  Search: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),

  Radio: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <circle cx="12" cy="12" r="2" />
      <path d="M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49m11.31-2.82a10 10 0 010 14.14m-14.14 0a10 10 0 010-14.14" />
    </svg>
  ),

  Settings: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle
        cx="8"
        cy="6"
        r="2"
        fill="white"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="16"
        cy="12"
        r="2"
        fill="white"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="10"
        cy="18"
        r="2"
        fill="white"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  ),

  Camera: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),

  Peso: () => (
    <svg viewBox="0 0 24 24" className={ic} fill="currentColor">
      <text x="3" y="19" fontSize="17" fontWeight="700" fontFamily="sans-serif">
        &#8369;
      </text>
    </svg>
  ),

  Google: () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  ),

  Menu: () => (
    <svg viewBox="0 0 24 24" className={ic} {...sv}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
};

function Toggle({
  on,

  onToggle,

  label,

  desc,
}: {
  on: boolean;

  onToggle: () => void;

  label: string;

  desc?: string;
}) {
  return (
    <div className="flex items-center justify-between py-4 gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        {desc && (
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{desc}</p>
        )}
      </div>
      <button
        onClick={onToggle}
        role="switch"
        aria-checked={on}
        className={`relative w-11 h-6 rounded-full transition-all duration-200 shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          on
            ? "bg-emerald-500 focus:ring-emerald-500"
            : "bg-slate-200 focus:ring-slate-400"
        }`}
      >
        <span
          className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] bg-white rounded-full shadow-md transition-transform duration-200 ${
            on ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function FieldInput({
  label,

  error,

  ...p
}: {
  label: string;

  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
        {label}
      </label>
      <input
        className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 font-medium placeholder:text-slate-300 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
        {...p}
      />
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  );
}

function FieldSelect({
  label,

  children,

  error,

  ...p
}: {
  label: string;

  children: React.ReactNode;

  error?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
        {label}
      </label>
      <select
        className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all appearance-none"
        {...p}
      >
        {children}
      </select>
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  );
}

function FieldTextarea({
  label,

  error,

  ...p
}: {
  label: string;

  error?: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
        {label}
      </label>
      <textarea
        className="px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 font-medium placeholder:text-slate-300 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 resize-none transition-all"
        {...p}
      />
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const cfg: Record<string, { cls: string; label: string; dot?: boolean }> = {
    active: {
      cls: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200",

      label: "Live",

      dot: true,
    },

    upcoming: {
      cls: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",

      label: "Upcoming",
    },

    closed: {
      cls: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",

      label: "Closed",
    },

    present: {
      cls: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200",

      label: "Present",
    },

    late: {
      cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",

      label: "Late",
    },

    absent: {
      cls: "bg-red-50 text-red-600 ring-1 ring-red-200",

      label: "Absent",
    },

    excused: {
      cls: "bg-violet-50 text-violet-600 ring-1 ring-violet-200",

      label: "Excused",
    },

    pending: {
      cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",

      label: "Pending Review",
    },

    confirmed: {
      cls: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200",

      label: "Confirmed",
    },

    time_in: {
      cls: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200",

      label: "Time-in",
    },

    time_out: {
      cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",

      label: "Time-out",
    },

    duplicate: {
      cls: "bg-red-50 text-red-600 ring-1 ring-red-200",

      label: "Duplicate",
    },

    approved: {
      cls: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200",

      label: "Approved",
    },

    denied: {
      cls: "bg-red-50 text-red-600 ring-1 ring-red-200",

      label: "Denied",
    },

    unpaid: {
      cls: "bg-red-50 text-red-600 ring-1 ring-red-200",

      label: "Unpaid",
    },

    paid: {
      cls: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200",

      label: "Paid",
    },
  };

  const c = cfg[status] ?? {
    cls: "bg-slate-100 text-slate-500",

    label: status,
  };

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${c.cls}`}
    >
      {c.dot && (
        <span
          className="w-1.5 h-1.5 rounded-full bg-emerald-500"
          style={{ animation: "pulse 2s infinite" }}
        />
      )}
      {c.label}
    </span>
  );
}

function InlineToggle({
  on,

  onToggle,

  label,
}: {
  on: boolean;

  onToggle: () => void;

  label: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      <button
        onClick={onToggle}
        role="switch"
        aria-checked={on}
        className={`relative w-9 h-5 rounded-full transition-all duration-200 shrink-0 focus:outline-none ${
          on ? "bg-emerald-500" : "bg-slate-200"
        }`}
      >
        <span
          className={`absolute top-[3px] left-[3px] w-[14px] h-[14px] bg-white rounded-full shadow-md transition-transform duration-200 ${
            on ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function SessionFields({
  prefix,

  label,

  start,

  onStart,

  end,

  onEnd,

  cutoff,

  onCutoff,

  strict,

  onStrict,
}: {
  prefix: string;

  label: string;

  start: string;

  onStart: (v: string) => void;

  end: string;

  onEnd: (v: string) => void;

  cutoff: string;

  onCutoff: (v: string) => void;

  strict: boolean;

  onStrict: () => void;
}) {
  return (
    <div className="border border-slate-100 rounded-xl p-3 space-y-2.5">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        {label} Session
      </p>
      <div className="grid grid-cols-2 gap-2">
        <FieldInput
          label="Start time"
          type="time"
          value={start}
          onChange={(e) => onStart(e.target.value)}
        />
        <FieldInput
          label="End time"
          type="time"
          value={end}
          onChange={(e) => onEnd(e.target.value)}
        />
      </div>
      <FieldInput
        label="Late cutoff time"
        type="time"
        value={cutoff}
        onChange={(e) => onCutoff(e.target.value)}
      />
      <InlineToggle
        on={strict}
        onToggle={onStrict}
        label="Strict attendance (require time-out scan)"
      />
    </div>
  );
}

function FineFields({
  multi,

  values,

  onChange,
}: {
  multi: boolean;

  values: {
    absentFine: string;

    lateFine: string;

    morningAbsentFine: string;

    morningLateFine: string;

    afternoonAbsentFine: string;

    afternoonLateFine: string;
  };

  onChange: (k: string, v: string) => void;
}) {
  return (
    <div className="space-y-2.5">
      <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block">
        Fines (₱)
      </label>
      {!multi ? (
        <div className="grid grid-cols-2 gap-2">
          <FieldInput
            label="Absent fine"
            type="number"
            min="0"
            value={values.absentFine}
            onChange={(e) => onChange("absentFine", e.target.value)}
          />
          <FieldInput
            label="Late fine"
            type="number"
            min="0"
            value={values.lateFine}
            onChange={(e) => onChange("lateFine", e.target.value)}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <FieldInput
              label="Morning absent"
              type="number"
              min="0"
              value={values.morningAbsentFine}
              onChange={(e) => onChange("morningAbsentFine", e.target.value)}
            />
            <FieldInput
              label="Morning late"
              type="number"
              min="0"
              value={values.morningLateFine}
              onChange={(e) => onChange("morningLateFine", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FieldInput
              label="Afternoon absent"
              type="number"
              min="0"
              value={values.afternoonAbsentFine}
              onChange={(e) => onChange("afternoonAbsentFine", e.target.value)}
            />
            <FieldInput
              label="Afternoon late"
              type="number"
              min="0"
              value={values.afternoonLateFine}
              onChange={(e) => onChange("afternoonLateFine", e.target.value)}
            />
          </div>
        </>
      )}
    </div>
  );
}

function Avatar({
  name,

  photoUrl,

  size = "md",
}: {
  name: string;

  photoUrl?: string;

  size?: "xs" | "sm" | "md" | "lg";
}) {
  const sz = { xs: "w-6 h-6", sm: "w-7 h-7", md: "w-9 h-9", lg: "w-14 h-14" }[
    size
  ];

  if (photoUrl)
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`${sz} rounded-full object-cover shrink-0 ring-1 ring-slate-200`}
      />
    );

  const letters = name

    .split(" ")

    .filter(Boolean)

    .map((w) => w[0])

    .slice(0, 2)

    .join("")

    .toUpperCase();

  if (letters) {
    const textSz = {
      xs: "text-[9px]",

      sm: "text-xs",

      md: "text-sm",

      lg: "text-lg",
    }[size];

    return (
      <div
        className={`${sz} rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-bold ${textSz} flex items-center justify-center shrink-0 select-none`}
      >
        {letters}
      </div>
    );
  }

  return (
    <div
      className={`${sz} rounded-full bg-[#b0b3b8] flex items-end justify-center overflow-hidden shrink-0`}
    >
      <svg viewBox="0 0 36 40" className="w-[70%] h-[70%]" fill="white">
        <ellipse cx="18" cy="13" rx="9" ry="10" />
        <ellipse cx="18" cy="42" rx="18" ry="15" />
      </svg>
    </div>
  );
}

function isGoogleProfilePhotoUrl(photoUrl?: string) {
  if (!photoUrl) return false;

  try {
    const hostname = new URL(photoUrl).hostname.toLowerCase();

    return (
      hostname === "googleusercontent.com" ||
      hostname.endsWith(".googleusercontent.com") ||
      hostname === "google.com" ||
      hostname.endsWith(".google.com")
    );
  } catch {
    return false;
  }
}

export function ProfileIcon({
  photoUrl,

  size = "sm",

  previewable = true,
}: {
  photoUrl?: string;

  size?: "xs" | "sm" | "md" | "lg";

  previewable?: boolean;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);

  const sz = {
    xs: "w-7 h-7",
    sm: "w-9 h-9",
    md: "w-11 h-11",
    lg: "w-16 h-16",
  }[size];

  const content = photoUrl ? (
    <img
      src={photoUrl}
      alt="Profile"
      className={`${sz} rounded-full object-cover shrink-0 ring-1 ring-slate-200 transition-transform duration-200 group-hover:scale-[1.02]`}
    />
  ) : (
    <div
      className={`${sz} rounded-full bg-[#b0b3b8] flex items-end justify-center overflow-hidden shrink-0`}
    >
      <svg viewBox="0 0 36 40" className="w-[70%] h-[70%]" fill="white">
        <ellipse cx="18" cy="13" rx="9" ry="10" />
        <ellipse cx="18" cy="42" rx="18" ry="15" />
      </svg>
    </div>
  );

  if (!photoUrl || !previewable || isGoogleProfilePhotoUrl(photoUrl)) {
    return content;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className="group inline-flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        aria-label="View profile photo"
      >
        {content}
      </button>

      {previewOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 p-6 backdrop-blur-sm"
          onClick={() => setPreviewOpen(false)}
        >
          <div className="relative max-h-[80vh] max-w-[80vw]">
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="absolute -right-3 -top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-slate-900/90 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800"
              aria-label="Close profile preview"
            >
              ×
            </button>
            <img
              src={photoUrl}
              alt="Profile preview"
              className="max-h-[80vh] max-w-[80vw] rounded-2xl border border-white/20 object-contain bg-white/5 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}

export function Toast({
  message,

  variant = "success",
}: {
  message: string;

  variant?: "success" | "error";
}) {
  return (
    <div
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 ${
        variant === "error" ? "bg-red-600" : "bg-slate-900"
      }`}
      style={{ animation: "slideUp .25s ease" }}
    >
      <span className={variant === "error" ? "text-red-300" : "text-emerald-400"}>
        {variant === "error" ? <Icons.X /> : <Icons.Check />}
      </span>
      {message}
    </div>
  );
}

export function DotMenu({
  items,
}: {
  items: {
    label: string;

    icon?: React.ReactNode;

    danger?: boolean;

    onClick: () => void;
  }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();

          setOpen((o) => !o);
        }}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
      >
        <Icons.MoreHorizontal />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[180px]">
            {items.map((it) => (
              <button
                key={it.label}
                onClick={() => {
                  it.onClick();

                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium hover:bg-slate-50 transition-colors text-left ${
                  it.danger ? "text-red-500" : "text-slate-700"
                }`}
              >
                {it.icon && (
                  <span
                    className={it.danger ? "text-red-400" : "text-slate-400"}
                  >
                    {it.icon}
                  </span>
                )}
                {it.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function BackButton({
  label = "Back",

  onClick,
}: {
  label?: string;

  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-sm font-semibold text-slate-400 hover:text-slate-700 transition-colors mb-5 group"
    >
      <span className="group-hover:-translate-x-0.5 transition-transform">
        <Icons.ChevronLeft />
      </span>
      {label}
    </button>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full px-2.5 pt-2 pb-12 md:max-w-6xl md:mx-auto md:px-6 md:pt-4 md:pb-16 lg:max-w-7xl">
      {children}
    </div>
  );
}

export function PageHeader({
  title,

  subtitle,

  action,
}: {
  title: string;

  subtitle?: string;

  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <p className="text-xl font-bold text-slate-900">{title}</p>
        {subtitle && (
          <p className="text-sm text-slate-400 font-medium mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
      {children}
    </p>
  );
}

export function AdesseMark({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <img
      src={adesseLogoSrc}
      alt="Adesse"
      className={`${className} shrink-0 rounded-lg object-cover`}
    />
  );
}

export function StudentQR({
  studentId,
  qrVersion = 1,

  size,
}: {
  studentId: string;
  qrVersion?: number;

  size: number;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(`ADESSE:${studentId}:v${qrVersion}`, {
      width: size * 2,

      margin: 1,

      color: { dark: "#111827", light: "#ffffff" },

      errorCorrectionLevel: "H",
    })

      .then(setDataUrl)

      .catch(() => setDataUrl(null));
  }, [qrVersion, studentId, size]);

  if (!dataUrl)
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-slate-100 rounded animate-pulse"
      />
    );

  return (
    <img
      src={dataUrl}
      width={size}
      height={size}
      alt="Student QR Code"
      style={{ display: "block", imageRendering: "pixelated" }}
    />
  );
}

export function TopBar({
  user,

  onNav,

  onMenuOpen,
}: {
  user: User | null;

  onNav: (p: Page) => void;

  onMenuOpen: () => void;
}) {
  const router = useRouter();

  const pathname = usePathname();

  const hideAuthButton =
    pathname === "/login" ||
    pathname.startsWith("/login") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding");

  const dest =
    user?.role === "admin" ? "/admin-dashboard" : user ? "/dashboard" : "/";

  const isMod = user?.role === "admin";

  const [dotOpen, setDotOpen] = useState(false);

  const go = (target: string) => router.push(target);

  return (
    <header
      className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-100 shrink-0"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}
    >
      <div
        className="flex items-center justify-between px-4 lg:px-5 gap-3"
        style={{ height: "56px" }}
      >
        {}
        <div className="flex items-center gap-2 min-w-0">
          {user && (
            <button
              onClick={onMenuOpen}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors shrink-0"
              aria-label="Open menu"
            >
              <Icons.Menu />
            </button>
          )}
          <button
            className="flex items-center gap-1.5 min-w-0"
            onClick={() => go(dest)}
          >
            <AdesseMark className="w-8 h-8 shrink-0" />
            <div className="flex flex-col leading-none min-w-0">
              <span className="adesse-display text-[17px] text-slate-900 leading-none">
                Adesse
              </span>
              <span className="text-[10px] text-slate-400 font-medium hidden sm:block leading-tight truncate">
                {isMod ? "Moderator Portal" : "Student Attendance"}
              </span>
            </div>
          </button>
        </div>

        {}
        <div className="flex items-center gap-1 shrink-0">
          {user ? (
            <>
              <button
                onClick={() => go("/profile")}
                className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-full hover:bg-slate-100 transition-colors group"
                aria-label="View profile"
              >
                <ProfileIcon
                  photoUrl={user.photoUrl}
                  size="sm"
                  previewable={false}
                />
                <span className="hidden sm:block text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors truncate max-w-[120px]">
                  {user.firstName || (isMod ? "Admin" : "My Profile")}
                </span>
              </button>
              {}
              <div className="relative">
                <button
                  onClick={() => setDotOpen((o) => !o)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  aria-label="More options"
                >
                  <svg
                    viewBox="0 0 18 18"
                    fill="currentColor"
                    className="w-[18px] h-[18px]"
                  >
                    <circle cx="9" cy="3.5" r="1.5" />
                    <circle cx="9" cy="9" r="1.5" />
                    <circle cx="9" cy="14.5" r="1.5" />
                  </svg>
                </button>
                {dotOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setDotOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1.5 z-50 w-56 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-50">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                          Help & Feedback
                        </p>
                      </div>
                      <button className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left group">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5 group-hover:bg-emerald-100 transition-colors">
                          <svg
                            viewBox="0 0 18 18"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.8}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-[15px] h-[15px]"
                          >
                            <path d="M9 1C4.58 1 1 4.13 1 8c0 1.74.68 3.33 1.8 4.56L2 17l4.67-1.4A8.27 8.27 0 0 0 9 16c4.42 0 8-3.13 8-7s-3.58-7-8-7Z" />
                            <path d="M6 8h6M6 11h4" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            Send helpful feedback
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                            Help us improve Adesse for everyone
                          </p>
                        </div>
                      </button>
                      <button className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left group border-t border-slate-50">
                        <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 shrink-0 mt-0.5 group-hover:bg-slate-100 transition-colors">
                          <svg
                            viewBox="0 0 18 18"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.8}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-[15px] h-[15px]"
                          >
                            <circle cx="9" cy="9" r="8" />
                            <path d="M9 8v4M9 6h.01" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            Help & Support
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                            Browse guides and FAQs
                          </p>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : hideAuthButton ? null : (
            <button
              onClick={() => go("/login")}
              className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export function Sidebar({
  page,

  user,

  open,

  onNav,

  onClose,

  onLogout,

  badges,
}: {
  page: Page;

  user: User | null;

  open: boolean;

  onNav: (p: Page) => void;

  onClose: () => void;

  onLogout: () => void;

  badges?: Partial<Record<Page, number>>;
}) {
  const router = useRouter();

  if (!user) return null;

  const isMod = user.role === "admin";

  const nav = isMod
    ? [
        { p: "admin-dashboard" as Page, l: "Overview", I: Icons.Home },

        { p: "admin-events" as Page, l: "Events", I: Icons.Calendar },

        { p: "admin-scanner" as Page, l: "QR Scanner", I: Icons.Scan },

        { p: "admin-attendees" as Page, l: "Attendees", I: Icons.Users },

        { p: "admin-students" as Page, l: "Students", I: Icons.User },

        { p: "admin-announcements" as Page, l: "Announcements", I: Icons.Bell },

        {
          p: "admin-excuse-requests" as Page,

          l: "Excuse Requests",

          I: Icons.FileText,
        },

        { p: "admin-reports" as Page, l: "Reports", I: Icons.BarChart },

        { p: "admin-settings" as Page, l: "Settings", I: Icons.Settings },
      ]
    : [
        { p: "dashboard" as Page, l: "Home", I: Icons.Home },

        { p: "events" as Page, l: "Events", I: Icons.Calendar },

        { p: "my-qr" as Page, l: "My QR Code", I: Icons.QrCode },

        { p: "announcements" as Page, l: "Announcements", I: Icons.Bell },

        {
          p: "attendance-history" as Page,

          l: "Attendance",

          I: Icons.CheckCircle,
        },

        { p: "my-fines" as Page, l: "My Fines", I: Icons.Peso },

        { p: "profile" as Page, l: "Profile", I: Icons.User },
      ];

  const routeFromPage: Record<Page, string> = {
    landing: "/",

    login: "/login",

    onboarding: "/onboarding",

    dashboard: "/dashboard",

    "my-qr": "/my-qr",

    events: "/events",

    "event-detail": "/events",

    announcements: "/announcements",

    "attendance-history": "/attendance-history",

    "my-fines": "/my-fines",

    profile: "/profile",

    "admin-dashboard": "/admin-dashboard",

    "admin-events": "/admin-events",

    "admin-scanner": "/admin-scanner",

    "admin-attendees": "/admin-attendees",

    "admin-students": "/admin-students",

    "admin-announcements": "/admin-announcements",

    "admin-reports": "/admin-reports",

    "admin-excuse-requests": "/admin-excuse-requests",

    "admin-settings": "/admin-settings",
  };

  const handleNav = (p: Page) => {
    const target = routeFromPage[p] ?? "/dashboard";

    router.push(target);

    onClose();
  };

  const prefetchRoute = (p: Page) => {
    const target = routeFromPage[p] ?? "/dashboard";

    void router.prefetch(target);
  };

  const inner = (
    <div className="flex flex-col h-full bg-white">
      {}
      <div className="flex items-center justify-between px-4 h-[52px] border-b border-slate-100 lg:hidden shrink-0">
        <div className="flex items-center gap-2.5">
          <AdesseMark />
          <span className="text-sm font-bold text-slate-900 tracking-tight">
            Adesse
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          aria-label="Close menu"
        >
          <Icons.X />
        </button>
      </div>

      {}
      <nav className="flex-1 px-2 pt-3 pb-2 space-y-0.5 overflow-y-auto">
        {nav.map(({ p, l, I }) => {
          const active = page === p;

          const count = badges?.[p] ?? 0;

          const badgeLabel =
            count > 9 ? "9+" : count > 0 ? String(count) : null;

          const target = routeFromPage[p] ?? "/dashboard";

          return (
            <Link
              key={p}
              href={target}
              prefetch
              onMouseEnter={() => prefetchRoute(p)}
              onFocus={() => prefetchRoute(p)}
              onClick={onClose}
              className={`w-full flex items-center gap-3 border-l-[3px] px-3 h-10 rounded-lg text-sm transition-colors duration-150 ease-in-out ${
                active
                  ? "border-emerald-500 bg-emerald-50/70 text-emerald-700 font-medium"
                  : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-normal"
              }`}
            >
              <span
                className={`relative shrink-0 ${
                  active ? "text-emerald-500" : "text-slate-400"
                }`}
              >
                <I />
                {badgeLabel && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-[3px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                    {badgeLabel}
                  </span>
                )}
              </span>
              <span className="truncate">{l}</span>
            </Link>
          );
        })}
      </nav>

      {}
      <div className="mt-auto border-t border-slate-200/70 px-2 py-4 shrink-0">
        <div className="space-y-2">
          <button
            onClick={() => onNav("landing")}
            className="w-full flex items-center gap-3 border-l-[3px] border-transparent px-3 h-10 rounded-lg text-sm font-normal text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors duration-150 ease-in-out"
          >
            <span className="shrink-0 text-slate-400">
              <ArrowLeft className="w-[18px] h-[18px]" />
            </span>
            Back to Home
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 border-l-[3px] border-transparent px-3 h-10 rounded-lg text-sm font-normal text-slate-500 hover:text-red-600 hover:bg-red-50/70 transition-colors duration-150 ease-in-out"
          >
            <span className="text-slate-300 shrink-0">
              <LogOut className="w-[18px] h-[18px]" />
            </span>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-slate-100 sticky top-[56px] h-[calc(100vh-56px)] self-start overflow-hidden bg-white">
        {inner}
      </aside>

      {}
      {open && (
        <div className="lg:hidden">
          <div
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            aria-hidden="true"
          />
          <aside
            className="fixed top-0 left-0 z-50 h-full w-72 shadow-2xl"
            aria-label="Navigation menu"
          >
            {inner}
          </aside>
        </div>
      )}
    </>
  );
}

function LandingCarousel({ slides }: { slides: CarouselSlide[] }) {
  const n = slides.length;

  const [trackIdx, setTrackIdx] = useState(0);

  const [animated, setAnimated] = useState(true);

  const [paused, setPaused] = useState(false);

  const [visibilityStamp, setVisibilityStamp] = useState(0);

  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const realIdx = trackIdx % n;

  const items = n > 1 ? [...slides, slides[0]] : slides;

  const total = items.length;

  const advance = () => {
    setAnimated(true);

    setTrackIdx((i) => i + 1);
  };

  const go = (next: number) => {
    const target = ((next % n) + n) % n;

    setAnimated(true);

    setTrackIdx(target);

    setPaused(true);

    if (pauseTimer.current) clearTimeout(pauseTimer.current);

    pauseTimer.current = setTimeout(() => setPaused(false), 8000);
  };

  const handleTransitionEnd = () => {
    if (trackIdx === n) {
      setAnimated(false);

      setTrackIdx(0);
    }
  };

  useEffect(() => {
    if (paused || n <= 1) return;

    const t = setInterval(advance, 5000);

    return () => clearInterval(t);
  }, [paused, n]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setTrackIdx(0);

        setAnimated(false);

        setPaused(false);

        setVisibilityStamp((v) => v + 1);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  if (n === 0) return null;

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl select-none"
      style={{ aspectRatio: "16/7" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {}
      <div
        className="flex h-full"
        style={{
          width: `${total * 100}%`,

          transform: `translateX(-${(trackIdx / total) * 100}%)`,

          transition: animated
            ? "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
            : "none",
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {items.map((s, i) => (
          <div
            key={`${visibilityStamp}-${i}-${s.imageUrl}`}
            className="relative h-full flex-shrink-0"
            style={{
              width: `${100 / total}%`,
            }}
          >
            {/\.mp4($|\?)/i.test(s.imageUrl) ? (
              <video
                key={`${visibilityStamp}-video-${i}-${s.imageUrl}`}
                src={s.imageUrl}
                aria-label={s.caption}
                className="w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                controls
              />
            ) : (
              <img
                key={`${visibilityStamp}-img-${i}-${s.imageUrl}`}
                src={s.imageUrl}
                alt={s.caption}
                loading="eager"
                decoding="sync"
                fetchPriority="high"
                className="w-full h-full object-cover"
              />
            )}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(0,0,0,.72) 0%, rgba(0,0,0,.18) 55%, transparent 100%)",
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 px-6 py-5">
              <p className="text-white font-bold text-lg leading-tight drop-shadow">
                {s.caption}
              </p>
              {s.date && <p className="text-white/65 text-sm mt-1">{s.date}</p>}
            </div>
          </div>
        ))}
      </div>

      {}
      {n > 1 && (
        <>
          <button
            onClick={() => go(realIdx - 1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
          >
            <Icons.ChevronLeft />
          </button>
          <button
            onClick={() => go(realIdx + 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
          >
            <Icons.ChevronRight />
          </button>
        </>
      )}

      {}
      {n > 1 && (
        <div className="absolute bottom-3 right-5 z-10 flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              className={`rounded-full transition-all ${
                i === realIdx
                  ? "w-5 h-2 bg-white"
                  : "w-2 h-2 bg-white/45 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LandingPage({
  onNav,

  settings,

  user,
}: {
  onNav: (p: Page) => void;

  settings: SystemSettings;

  user: User | null;
}) {
  const heroUrls = settings.heroImageUrls.filter(
    (url) => !!url && !url.startsWith("blob:"),
  );

  const carouselSlides = settings.carouselSlides.filter(
    (slide) => !!slide.imageUrl && !slide.imageUrl.startsWith("blob:"),
  );

  const hasHero = heroUrls.length > 0;

  const hn = heroUrls.length;

  const [heroTrack, setHeroTrack] = useState(0);

  const [heroAnim, setHeroAnim] = useState(true);

  const [heroVisibilityStamp, setHeroVisibilityStamp] = useState(0);

  const heroRealIdx = heroTrack % (hn || 1);

  const heroItems = hn > 1 ? [...heroUrls, heroUrls[0]] : heroUrls;

  const heroTotal = heroItems.length;

  const heroAdvance = () => {
    setHeroAnim(true);

    setHeroTrack((i) => i + 1);
  };

  const heroTransitionEnd = () => {
    if (heroTrack === hn) {
      setHeroAnim(false);

      setHeroTrack(0);
    }
  };

  useEffect(() => {
    if (hn <= 1) return;

    const t = setInterval(heroAdvance, 5000);

    return () => clearInterval(t);
  }, [hn]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setHeroTrack(0);

        setHeroAnim(false);

        setHeroVisibilityStamp((v) => v + 1);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [hn]);

  useEffect(() => {
    setHeroTrack(0);

    setHeroAnim(false);
  }, [hn]);

  return (
    <div className="min-h-screen bg-white">
      {}
      <div
        className={`relative overflow-hidden ${
          hasHero ? "min-h-[520px] lg:min-h-[580px]" : ""
        }`}
      >
        {}
        {hasHero && (
          <div
            className="absolute inset-y-0 left-0 flex"
            style={{
              width: `${heroTotal * 100}%`,

              transform: `translateX(-${(heroTrack / heroTotal) * 100}%)`,

              transition: heroAnim
                ? "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
                : "none",
            }}
            onTransitionEnd={heroTransitionEnd}
          >
            {heroItems.map((url, i) => (
              <div
                key={`${heroVisibilityStamp}-${i}-${url}`}
                className="relative h-full flex-shrink-0"
                style={{
                  width: `${100 / heroTotal}%`,
                }}
              >
                <img
                  key={`${heroVisibilityStamp}-hero-${i}-${url}`}
                  src={url}
                  alt=""
                  aria-hidden
                  loading="eager"
                  decoding="sync"
                  fetchPriority="high"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
        {hasHero && (
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(0,0,0,.58) 0%, rgba(0,0,0,.35) 60%, rgba(0,0,0,.18) 100%)",
            }}
          />
        )}
        {}
        {hn > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
            {heroUrls.map((_, i) => (
              <span
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === heroRealIdx ? "w-4 h-2 bg-white" : "w-2 h-2 bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
        {}
        {!hasHero && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-emerald-50 to-transparent rounded-full blur-3xl opacity-60 pointer-events-none" />
        )}

        {user && (
          <button
            onClick={() => onNav("profile")}
            className={`absolute top-5 right-6 z-20 flex items-center justify-center rounded-full p-1.5 transition-colors duration-150 ${
              hasHero
                ? "bg-black/20 text-white shadow-sm backdrop-blur-sm hover:bg-black/30"
                : "bg-slate-900/5 text-slate-700 hover:bg-slate-900/10"
            }`}
            aria-label="Open profile"
          >
            <ProfileIcon
              photoUrl={user.photoUrl}
              size="sm"
              previewable={false}
            />
          </button>
        )}

        {}
        <div
          className={`relative w-full mx-auto px-3.5 flex flex-col md:max-w-6xl md:px-6 ${
            hasHero
              ? "items-start text-left pt-6 pb-6 md:pt-10 md:pb-12"
              : "items-center text-center pt-6 pb-6 md:pt-10 md:pb-12"
          }`}
        >
          <div
            className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-8 ${
              hasHero
                ? "text-emerald-200 bg-white/10 border border-white/25 backdrop-blur-sm"
                : "text-emerald-700 bg-emerald-50 border border-emerald-200"
            }`}
          >
            <span
              className="w-1.5 h-1.5 bg-emerald-400 rounded-full"
              style={{ animation: "pulse 2s infinite" }}
            />
            AY 2026-2027 · 1st Semester
          </div>
          <div
            className={`flex items-center gap-3 mb-4 ${
              hasHero ? "" : "justify-center"
            }`}
          >
            <AdesseMark className="w-14 h-14" />
          </div>
          <h1
            className={`text-5xl font-extrabold tracking-tight leading-tight mb-2 ${
              hasHero ? "text-white" : "text-slate-900"
            }`}
          >
            Adesse
          </h1>
          <p
            className={`text-base font-semibold mb-6 ${
              hasHero ? "text-white/70" : "text-slate-400"
            }`}
          >
            Student Event Attendance &amp; Fee Tracking System
          </p>
          <p
            className={`text-lg mb-10 leading-relaxed ${
              hasHero ? "text-white/80 max-w-md" : "text-slate-500 max-w-lg"
            }`}
          >
            One QR code per student. Real-time attendance logging. Automatic fee
            tracking.
          </p>
          <div
            className={`flex items-center gap-3 ${
              hasHero ? "" : "justify-center"
            }`}
          >
            <button
              onClick={() => {
                if (user) {
                  onNav(
                    user.role === "admin" ? "admin-dashboard" : "dashboard",
                  );

                  return;
                }

                if (typeof window !== "undefined") {
                  window.location.assign("/login");
                } else {
                  onNav("login");
                }
              }}
              className="h-11 px-6 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-px"
            >
              {user ? "Go to Dashboard" : "Get Started"}
            </button>
            <button
              onClick={() => onNav("events")}
              className={`h-11 px-6 text-sm font-semibold rounded-xl transition-all ${
                hasHero
                  ? "bg-white/15 text-white border border-white/30 hover:bg-white/25 backdrop-blur-sm"
                  : "border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Browse Events
            </button>
          </div>
        </div>
      </div>

      {}
      <div className="w-full mx-auto px-3.5 py-6 md:max-w-6xl md:px-6 md:py-10">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              I: Icons.QrCode,

              t: "Personal QR Code",

              d: "Each student gets a unique QR code tied to their profile. Present it at any event entrance for instant logging.",
            },

            {
              I: Icons.Scan,

              t: "Instant scan & confirm",

              d: "Moderators scan student QR codes in real time with automatic duplicate detection and confirmation.",
            },

            {
              I: Icons.Peso,

              t: "Automatic fee tracking",

              d: "Absent students are fined per event policy. Students can view, track, and clear fees from their personal dashboard.",
            },
          ].map((f) => (
            <div
              key={f.t}
              className="bg-white border border-slate-100 rounded-2xl p-3.5 hover:border-slate-200 hover:shadow-sm transition-all md:p-6"
            >
              <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
                <f.I />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm mb-1.5">
                {f.t}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.d}</p>
            </div>
          ))}
        </div>
      </div>

      {}
      {carouselSlides.length > 0 && (
        <div className="max-w-5xl mx-auto px-6 pb-20">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Upcoming Highlights
            </p>
          </div>
          <LandingCarousel slides={carouselSlides} />
        </div>
      )}
    </div>
  );
}

export function LoginPage({ onBack }: { onBack: () => void }) {
  const router = useRouter();

  const [showEmailFlow, setShowEmailFlow] = useState(false);

  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState<"google" | "submit" | null>(null);

  const routeAfterAuth = async () => {
    const {
      data: { user },

      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/login");

      return;
    }

    const { data: profile, error: profileError } = await supabase

      .from("profiles")

      .select("*")

      .eq("id", user.id)

      .maybeSingle();

    if (profileError && profileError.code !== "PGRST116") {
      console.error(profileError);
    }

    const incomplete =
      !profile ||
      !profile.first_name ||
      !profile.surname ||
      (profile.role !== "admin" &&
        (!profile.student_id ||
          !profile.program ||
          !profile.year_level ||
          !profile.section));

    if (incomplete) {
      router.push("/onboarding?freshLogin=1");

      return;
    }

    router.push(
      profile.role === "admin"
        ? "/admin-dashboard?freshLogin=1"
        : "/dashboard?freshLogin=1",
    );
  };

  const handleGoogleLogin = async () => {
    setLoading("google");

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",

        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error(error);

        toast.error(error.message || "Google sign-in failed.");
      }
    } catch (error) {
      console.error(error);

      toast.error("Google sign-in failed.");
    } finally {
      setLoading(null);
    }
  };

  const handleEmailSubmit = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      toast.error("Please enter both your email and password.");

      return;
    }

    if (mode === "signup") {
      if (!confirmPassword) {
        toast.error("Please confirm your password.");

        return;
      }

      if (password !== confirmPassword) {
        toast.error("Passwords do not match.");

        return;
      }
    }

    setLoading("submit");

    try {
      let result;

      if (mode === "signin") {
        result = await supabase.auth.signInWithPassword({
          email: trimmedEmail,

          password,
        });
      } else {
        result = await supabase.auth.signUp({
          email: trimmedEmail,

          password,
        });
      }

      if (result.error) {
        const message = result.error.message.toLowerCase();

        if (
          message.includes("invalid login") ||
          message.includes("wrong password") ||
          message.includes("invalid credentials")
        ) {
          toast.error("Invalid email or password.");
        } else if (
          message.includes("already registered") ||
          message.includes("user already registered") ||
          message.includes("email already")
        ) {
          toast.error(
            "This email is already registered. Please sign in instead.",
          );
        } else if (message.includes("password") && message.includes("match")) {
          toast.error("Passwords do not match.");
        } else if (message.includes("password") && message.includes("least")) {
          toast.error("Password must be at least 6 characters long.");
        } else {
          toast.error(result.error.message || "Authentication failed.");
        }

        return;
      }

      if (mode === "signup") {
        if (result.data.session) {
          await routeAfterAuth();
        } else {
          toast.success(
            "Account created. Please check your inbox and confirm your email before signing in.",
          );

          setMode("signin");

          setPassword("");

          setConfirmPassword("");

          setShowPassword(false);

          setShowConfirmPassword(false);
        }

        return;
      }

      await routeAfterAuth();
    } catch (error) {
      console.error(error);

      toast.error("Authentication failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3.5 bg-[#f8faf9] md:p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <AdesseMark className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Welcome to Adesse
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Student Event Attendance &amp; Fee Tracking System
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm md:p-6">
          <div className="space-y-3 md:space-y-4">
            <button
              type="button"
              onClick={() => void handleGoogleLogin()}
              disabled={!!loading}
              className="w-full h-12 flex items-center justify-center gap-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
            >
              {loading === "google" ? (
                <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              ) : (
                <Icons.Google />
              )}
              Continue with Google
            </button>

            <button
              type="button"
              onClick={() => {
                setShowEmailFlow(true);
              }}
              disabled={!!loading}
              className="w-full h-12 flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-sm font-semibold text-white transition-all shadow-sm disabled:opacity-50"
            >
              <Icons.Mail />
              Continue with Email
            </button>

            <motion.div
              initial={false}
              animate={{
                height: showEmailFlow ? "auto" : 0,

                opacity: showEmailFlow ? 1 : 0,
              }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="pt-3">
                <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 mb-5">
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-all ${
                      mode === "signin"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-all ${
                      mode === "signup"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    Sign Up
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="block">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                      Email
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full h-11 border border-slate-200 rounded-xl px-3 text-sm text-slate-900 placeholder:text-slate-300 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                      Password
                    </span>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Your password"
                        className="w-full h-11 border border-slate-200 rounded-xl px-3 pr-10 text-sm text-slate-900 placeholder:text-slate-300 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </label>

                  {mode === "signup" && (
                    <label className="block">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                        Confirm Password
                      </span>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm your password"
                          className="w-full h-11 border border-slate-200 rounded-xl px-3 pr-10 text-sm text-slate-900 placeholder:text-slate-300 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword((value) => !value)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600"
                        >
                          {showConfirmPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                    </label>
                  )}

                  <button
                    type="button"
                    onClick={() => void handleEmailSubmit()}
                    disabled={!!loading}
                    className="w-full h-12 flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-sm font-semibold text-white transition-all shadow-sm disabled:opacity-50"
                  >
                    {loading === "submit" ? (
                      <div className="w-4 h-4 border-2 border-slate-600 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Icons.Mail />
                    )}
                    {mode === "signin" ? "Sign In" : "Create account"}
                  </button>
                </div>

                <p className="text-xs text-slate-400 text-center pt-3">
                  {mode === "signin"
                    ? "Don't have an account?"
                    : "Already have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === "signin" ? "signup" : "signin");

                      setPassword("");

                      setConfirmPassword("");
                    }}
                    className="text-emerald-500 font-semibold hover:text-emerald-600"
                  >
                    {mode === "signin" ? "Sign up" : "Sign in"}
                  </button>
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setShowEmailFlow(false);

                    setPassword("");

                    setConfirmPassword("");

                    setShowPassword(false);

                    setShowConfirmPassword(false);
                  }}
                  className="w-full text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-1 pt-3"
                >
                  <Icons.ChevronLeft />
                  Back
                </button>
              </div>
            </motion.div>

            {!showEmailFlow && (
              <button
                type="button"
                onClick={onBack}
                className="w-full text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-1 pt-1"
              >
                <Icons.ChevronLeft />
                Back to home
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export interface OBForm {
  firstName: string;

  middleInitial: string;

  surname: string;

  phone: string;

  contactEmail: string;

  studentId: string;

  program: string;

  yearLevel: string;

  section: string;

  idPhotoUrl?: string;

  agreedToTerms?: boolean;
}

export function OnboardingPage({
  onComplete,
}: {
  onComplete: (d: OBForm) => void;
}) {
  const [step, setStep] = useState(1);

  const [idPhotoUploadState, setIdPhotoUploadState] = useState<
    "idle" | "uploading" | "error"
  >("idle");

  const [f, setF] = useState<OBForm>({
    firstName: "",

    middleInitial: "",

    surname: "",

    phone: "",

    contactEmail: "",

    studentId: "",

    program: "",

    yearLevel: "",

    section: "",
  });

  const [agreed, setAgreed] = useState(false);

  const idPhotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (f.idPhotoUrl) {
        URL.revokeObjectURL(f.idPhotoUrl);
      }
    };
  }, []);

  const set =
    (k: keyof OBForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setF((p) => ({ ...p, [k]: e.target.value }));

  const TOTAL = 6;

  const steps = [
    {
      t: "Your name",

      d: "Enter your full name as it appears on your school ID.",
    },

    { t: "Contact information", d: "Used for important notices and updates." },

    { t: "Student ID", d: "Your 7-digit school-issued ID number." },

    {
      t: "Enrollment details",

      d: "Used to group attendance records by program and section.",
    },

    {
      t: "School ID photo",

      d: "Take or upload a clear photo of your school-issued ID.",
    },

    { t: "Terms & Privacy", d: "Please read and agree to continue." },
  ];

  const canContinue = () => {
    if (step === 1) {
      return f.firstName.trim().length > 0 && f.surname.trim().length > 0;
    }

    if (step === 2) {
      return f.phone.trim().length > 0 && f.contactEmail.trim().length > 0;
    }

    if (step === 3) {
      return /^\d{7,}$/.test(f.studentId.trim());
    }

    if (step === 4) {
      return (
        f.program.trim().length > 0 &&
        f.yearLevel.trim().length > 0 &&
        f.section.trim().length > 0
      );
    }

    if (step === 5) {
      return !!f.idPhotoUrl;
    }

    if (step === 6) {
      return agreed;
    }

    return false;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3.5 bg-[#f8faf9] md:p-6">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <div className="flex gap-1 mb-3">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all ${
                  i < step ? "bg-emerald-500" : "bg-slate-200"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Step {step} of {TOTAL}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-3.5 py-3.5 border-b border-slate-100 md:px-6 md:py-5">
            <h2 className="font-bold text-slate-900 text-lg">
              {steps[step - 1].t}
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">{steps[step - 1].d}</p>
          </div>
          <div className="px-3.5 py-3.5 space-y-3 md:px-6 md:py-5 md:space-y-4">
            {step === 1 && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <FieldInput
                      label="First Name"
                      placeholder="e.g. Maria Luisa"
                      value={f.firstName}
                      onChange={set("firstName")}
                    />
                  </div>
                  <FieldInput
                    label="M.I."
                    placeholder="A"
                    maxLength={2}
                    value={f.middleInitial}
                    onChange={set("middleInitial")}
                  />
                </div>
                <FieldInput
                  label="Surname"
                  placeholder="e.g. Santos"
                  value={f.surname}
                  onChange={set("surname")}
                />
              </>
            )}
            {step === 2 && (
              <>
                <FieldInput
                  label="Phone"
                  type="tel"
                  placeholder="e.g. 09XX XXX XXXX"
                  value={f.phone}
                  onChange={set("phone")}
                />
                <FieldInput
                  label="Email"
                  type="email"
                  placeholder="e.g. student@email.com"
                  value={f.contactEmail}
                  onChange={set("contactEmail")}
                />
              </>
            )}
            {step === 3 && (
              <FieldInput
                label="Student ID (7 digits, starts with 244...)"
                placeholder="e.g. 2440001"
                value={f.studentId}
                onChange={set("studentId")}
              />
            )}
            {step === 4 && (
              <>
                <FieldSelect
                  label="Program"
                  value={f.program}
                  onChange={set("program")}
                >
                  <option value="">Select program</option>
                  <option>BSIT - Information Technology</option>
                  <option>BSCS - Computer Science</option>
                  <option>BSBA - Business Administration</option>
                  <option>BSEd - Secondary Education</option>
                  <option>BSHM - Hospitality Management</option>
                </FieldSelect>
                <FieldSelect
                  label="Year Level"
                  value={f.yearLevel}
                  onChange={set("yearLevel")}
                >
                  <option value="">Select year level</option>
                  <option>1st Year</option>
                  <option>2nd Year</option>
                  <option>3rd Year</option>
                  <option>4th Year</option>
                </FieldSelect>
                <FieldInput
                  label="Section"
                  placeholder="e.g. IT-2A"
                  value={f.section}
                  onChange={set("section")}
                />
              </>
            )}
            {step === 5 && (
              <div className="flex flex-col items-center gap-4">
                <input
                  ref={idPhotoRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];

                    if (!file) return;

                    setIdPhotoUploadState("uploading");

                    const result = await uploadImage(file);

                    if ("error" in result) {
                      setIdPhotoUploadState("error");

                      toast.error(result.error);

                      return;
                    }

                    setIdPhotoUploadState("idle");

                    setF((p) => ({
                      ...p,

                      idPhotoUrl: result.url,
                    }));
                  }}
                />
                {idPhotoUploadState === "uploading" ? (
                  <Skeleton
                    className="w-full rounded-xl"
                    style={{ aspectRatio: "16/10" }}
                  />
                ) : idPhotoUploadState === "error" ? (
                  <div
                    className="w-full rounded-xl border border-red-200 bg-red-50 flex flex-col items-center justify-center gap-2 py-10 text-center"
                    style={{ aspectRatio: "16/10" }}
                  >
                    <p className="text-sm font-semibold text-red-600">
                      Upload failed
                    </p>
                    <button
                      onClick={() => idPhotoRef.current?.click()}
                      className="text-xs font-semibold text-red-700 underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : f.idPhotoUrl ? (
                  <div
                    className="relative w-full rounded-xl overflow-hidden border-2 border-emerald-400"
                    style={{ aspectRatio: "16/10" }}
                  >
                    <img
                      src={f.idPhotoUrl}
                      alt="School ID"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => {
                        if (f.idPhotoUrl) {
                          URL.revokeObjectURL(f.idPhotoUrl);
                        }

                        setF((p) => ({ ...p, idPhotoUrl: undefined }));
                      }}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                    >
                      <Icons.X />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => idPhotoRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-3 py-10 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all text-slate-400 hover:text-emerald-500"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                      <Icons.Camera />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold">
                        Take or upload ID photo
                      </p>
                      <p className="text-xs mt-0.5">
                        Position your school ID clearly in frame
                      </p>
                    </div>
                  </button>
                )}
                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  Make sure all text on your ID is visible and legible. This is
                  used to verify your identity.
                </p>
              </div>
            )}
            {step === 6 && (
              <div className="flex flex-col gap-4">
                <div className="h-52 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 leading-relaxed space-y-3">
                  <p className="font-semibold text-slate-700">Terms of Use</p>
                  <p>
                    By creating an account on Adesse, you agree to use this
                    system solely for legitimate attendance tracking purposes.
                    You must not share your QR code with others or attempt to
                    record attendance on behalf of another student. Any misuse
                    may result in disciplinary action.
                  </p>
                  <p className="font-semibold text-slate-700">Privacy Policy</p>
                  <p>
                    Adesse collects your name, student ID, contact information,
                    and attendance records to facilitate event attendance and
                    fee management within your institution. Your data is stored
                    securely and is accessible only to authorized moderators and
                    system administrators within your school.
                  </p>
                  <p>
                    We do not sell or share your personal information with third
                    parties. Attendance records and fine statuses are visible
                    only to moderators of your institution. Your ID photo is
                    used solely for identity verification during account review.
                  </p>
                  <p className="font-semibold text-slate-700">Data Retention</p>
                  <p>
                    Your records are retained for the duration of your
                    enrollment and may be archived thereafter per institutional
                    policy. You may request data correction or deletion by
                    contacting your school's SSG office.
                  </p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div
                    className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                      agreed
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-slate-300 group-hover:border-emerald-400"
                    }`}
                    onClick={() => setAgreed((v) => !v)}
                  >
                    {agreed && (
                      <svg
                        viewBox="0 0 24 24"
                        className="w-3 h-3"
                        fill="none"
                        stroke="white"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span
                    className="text-sm text-slate-600 leading-snug"
                    onClick={() => setAgreed((v) => !v)}
                  >
                    I have read and agree to the{" "}
                    <span className="font-semibold text-slate-800">
                      Terms of Use
                    </span>{" "}
                    and{" "}
                    <span className="font-semibold text-slate-800">
                      Privacy Policy
                    </span>
                    .
                  </span>
                </label>
              </div>
            )}
          </div>
          <div className="px-6 pb-5 flex gap-2.5">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="h-10 px-4 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-1.5"
              >
                <Icons.ChevronLeft />
                Back
              </button>
            )}
            <button
              disabled={!canContinue()}
              onClick={() =>
                step < TOTAL
                  ? setStep((s) => s + 1)
                  : onComplete({ ...f, agreedToTerms: agreed })
              }
              className={`flex-1 h-10 text-white text-sm font-semibold rounded-lg transition-all shadow-sm ${
                canContinue()
                  ? "bg-emerald-500 hover:bg-emerald-600"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
              }`}
            >
              {step === TOTAL ? "Complete setup" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExcuseModal({
  record,

  onClose,

  onSubmit,
}: {
  record: (typeof ATTENDANCE_RECORDS)[0];

  onClose: () => void;

  onSubmit: (r: ExcuseRequest) => void;
}) {
  const [reason, setReason] = useState("");

  const [file, setFile] = useState<File | null>(null);

  const ref = useRef<HTMLInputElement>(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <p className="font-bold text-slate-900 text-base">Request Excuse</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[240px]">
              {record.event}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <Icons.X />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-red-400 shrink-0">
              <Icons.XCircle />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Marked Absent
              </p>
              <p className="text-xs text-slate-400">{record.date}</p>
            </div>
          </div>
          <FieldTextarea
            label="Reason"
            placeholder="Describe why you were unable to attend..."
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">
              Document (optional)
            </label>
            <input
              ref={ref}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <button
              onClick={() => ref.current?.click()}
              className="w-full h-10 border-2 border-dashed border-slate-200 rounded-xl text-sm font-medium text-slate-400 hover:border-emerald-400 hover:text-emerald-500 transition-all flex items-center justify-center gap-2"
            >
              <Icons.Paperclip />
              {file ? file.name : "Attach photo or PDF"}
            </button>
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2.5">
          <button
            onClick={onClose}
            className="h-10 px-4 border border-slate-200 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!reason.trim()) return;

              onSubmit({
                id: Date.now().toString(),

                studentName: "Maria Luisa Santos",

                studentId: "2440014",

                event: record.event,

                date: record.date,

                reason,

                proofName: file ? file.name : null,

                status: "pending",

                submittedDate: "Aug 22, 2026",
              });

              onClose();
            }}
            disabled={!reason.trim()}
            className="flex-1 h-10 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Icons.Send />
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

function FormModal({
  title,

  onClose,

  sidebar,

  footer,

  children,
}: {
  title: string;

  onClose: () => void;

  sidebar?: React.ReactNode;

  footer?: React.ReactNode;

  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl w-full shadow-2xl flex flex-col overflow-hidden ${
          sidebar ? "max-w-4xl h-[85vh]" : "max-w-lg"
        }`}
        style={sidebar ? undefined : { maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <p className="text-base font-bold text-slate-900">{title}</p>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <Icons.X />
          </button>
        </div>
        {sidebar ? (
          <div className="flex min-h-0 flex-1">
            <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-slate-50 p-3 md:block">
              {sidebar}
            </aside>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="border-b border-slate-100 bg-slate-50 p-2 md:hidden">
                {sidebar}
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 md:p-6">
                <div className="space-y-3">{children}</div>
              </div>
              {footer && (
                <div className="flex shrink-0 gap-2.5 border-t border-slate-100 px-5 pb-5 pt-3">
                  {footer}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1">
              {children}
            </div>
            {footer && (
              <div className="px-5 pt-3 pb-5 flex gap-2.5 shrink-0 border-t border-slate-100">
                {footer}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function UpcomingEventCard({
  event: ev,

  onClick,
}: {
  event: EventData;

  onClick: () => void;
}) {
  const cover = ev.mediaUrls?.[0] ?? null;

  const greenText = (dim?: boolean) => (
    <>
      <div className="flex items-center justify-between mb-3">
        <Badge status={ev.status} />
        <span
          className={`text-xs font-medium ${
            dim ? "text-white/70" : "text-emerald-300"
          }`}
        >
          Up next
        </span>
      </div>
      <h2
        className={`font-semibold text-base leading-snug mb-3 ${
          dim ? "text-white" : "text-white"
        }`}
      >
        {ev.title}
      </h2>
      <div
        className={`flex flex-wrap gap-3 text-sm font-medium ${
          dim ? "text-white/75" : "text-emerald-200"
        }`}
      >
        <span className="flex items-center gap-1.5">
          <Icons.Calendar />
          {ev.date}
        </span>
        <span className="flex items-center gap-1.5">
          <Icons.MapPin />
          {ev.location}
        </span>
      </div>
    </>
  );

  return (
    <button onClick={onClick} className="w-full text-left mb-5 block group">
      {}
      {cover ? (
        <div
          className="relative md:hidden overflow-hidden rounded-xl"
          style={{ height: 152 }}
        >
          <img
            src={cover}
            alt={ev.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,.68) 0%, rgba(0,0,0,.22) 55%, transparent 100%)",
            }}
          />
          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge status={ev.status} />
              <span className="text-white/70 text-xs font-medium">Up next</span>
            </div>
            <h2 className="font-semibold text-base leading-snug text-white mb-1.5 line-clamp-1">
              {ev.title}
            </h2>
            <div className="flex gap-3 text-xs text-white/70 font-medium">
              <span className="flex items-center gap-1">
                <Icons.Calendar />
                {ev.date}
              </span>
              <span className="flex items-center gap-1">
                <Icons.MapPin />
                {ev.location}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="md:hidden bg-emerald-500 group-hover:bg-emerald-600 rounded-xl p-5 text-white transition-colors shadow-sm">
          {greenText()}
        </div>
      )}

      {}
      {cover ? (
        <div
          className="relative hidden md:block overflow-hidden rounded-xl shadow-sm group-hover:shadow-md transition-shadow"
          style={{ height: 160 }}
        >
          {}
          <svg width="0" height="0" style={{ position: "absolute" }}>
            <defs>
              <clipPath id="ec-photo-clip" clipPathUnits="objectBoundingBox">
                {}
                <path d="M 0.2,0 C 0,0.28 0,0.72 0.2,1 L 1,1 L 1,0 Z" />
              </clipPath>
            </defs>
          </svg>

          {}
          <div className="absolute inset-0 bg-emerald-500 group-hover:bg-emerald-600 transition-colors" />

          {}
          <div
            className="absolute inset-y-0 left-0 z-10 flex flex-col justify-between px-5 py-5 text-white"
            style={{ width: "62%" }}
          >
            {greenText()}
          </div>

          {}
          <div
            className="absolute inset-y-0 right-0"
            style={{ width: "45%", clipPath: "url(#ec-photo-clip)" }}
          >
            <img
              src={cover}
              alt={ev.title}
              className="w-full h-full object-cover"
            />
            {}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to right, rgba(22,101,52,.55) 0%, transparent 35%)",
              }}
            />
          </div>
        </div>
      ) : (
        <div className="hidden md:block bg-emerald-500 group-hover:bg-emerald-600 rounded-xl p-5 text-white transition-colors shadow-sm">
          {greenText()}
        </div>
      )}
    </button>
  );
}

export function DashboardPage({
  user,

  onNav,

  fines,

  showFees,

  announcements,

  nextEvent,

  attendanceStats,
}: {
  user: User;

  onNav: (p: Page) => void;

  fines: FineRecord[];

  showFees: boolean;

  announcements: typeof INITIAL_ANNOUNCEMENTS;

  nextEvent?: EventData;

  attendanceStats?: {
    present: number;

    absent: number;

    upcoming: number;

    rate: number;
  };
}) {
  const unpaidFines = fines.filter((f) => f.status === "unpaid");

  const total = unpaidFines.reduce((s, f) => s + Number(f.amount || 0), 0);

  const latestAnnouncements = announcements.slice(0, 2);

  const statValues = attendanceStats ?? {
    present: 0,

    absent: 0,

    upcoming: 0,

    rate: 0,
  };

  const attendanceData = [
    { name: "Present", value: statValues.present, fill: "#10b981" },

    { name: "Absent", value: statValues.absent, fill: "#94a3b8" },

    { name: "Upcoming", value: statValues.upcoming, fill: "#a7f3d0" },
  ];

  return (
    <>
      <div className="mb-7">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
          {new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            weekday: "long",
          })}
        </p>
        <h1 className="text-2xl font-bold text-slate-900">
          Good morning, {user.firstName || "there"}.
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-3 mb-5 sm:grid-cols-3">
        <motion.div
          className="bg-white border border-slate-100 rounded-xl px-4 py-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.02 }}
        >
          <p className="text-2xl font-bold text-slate-900">
            {statValues.present}
          </p>
          <p className="text-[11px] text-slate-400 font-semibold mt-1 leading-tight">
            Present
          </p>
        </motion.div>

        <motion.div
          className="bg-white border border-slate-100 rounded-xl px-4 py-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.08 }}
        >
          <p className="text-2xl font-bold text-slate-900">
            {statValues.absent}
          </p>
          <p className="text-[11px] text-slate-400 font-semibold mt-1 leading-tight">
            Absent
          </p>
        </motion.div>

        <motion.div
          className="bg-white border border-slate-100 rounded-xl px-4 py-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.14 }}
        >
          <p className="text-2xl font-bold text-slate-900">
            {statValues.upcoming}
          </p>
          <p className="text-[11px] text-slate-400 font-semibold mt-1 leading-tight">
            Upcoming
          </p>
        </motion.div>
      </div>

      <motion.div
        className="bg-white border border-slate-100 rounded-xl px-4 py-3 mb-5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.2 }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            Attendance rate
          </span>
          <span className="text-[11px] font-semibold text-emerald-600">
            {statValues.rate}%
          </span>
        </div>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={attendanceData}
                dataKey="value"
                nameKey="name"
                innerRadius={16}
                outerRadius={34}
                paddingAngle={2}
                strokeWidth={0}
              >
                {attendanceData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {showFees && unpaidFines.length > 0 && (
        <button
          onClick={() => onNav("my-fines")}
          className="w-full bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between mb-5 hover:bg-red-100 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center text-red-500 shrink-0">
              <Icons.Peso />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-red-700">
                Unpaid fines — ₱{total.toLocaleString()}
              </p>
              <p className="text-xs text-red-500 mt-0.5">
                {unpaidFines.length} outstanding fine
                {unpaidFines.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <span className="text-red-400 group-hover:text-red-600">
            <Icons.ChevronRight />
          </span>
        </button>
      )}
      {nextEvent && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.24 }}
        >
          <UpcomingEventCard
            event={nextEvent}
            onClick={() => onNav("events")}
          />
        </motion.div>
      )}
      <motion.button
        type="button"
        onClick={() => onNav("my-qr")}
        className="w-full bg-white border border-slate-100 rounded-xl px-5 py-4 flex items-center justify-between hover:border-slate-200 hover:shadow-sm transition-all mb-5 group"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-500">
            <Icons.QrCode />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-900">My QR Code</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Show or download your attendance code
            </p>
          </div>
        </div>
        <span className="text-slate-300 group-hover:text-slate-500">
          <Icons.ChevronRight />
        </span>
      </motion.button>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-900">
          Latest announcements
        </p>
        <button
          onClick={() => onNav("announcements")}
          className="text-xs text-emerald-500 font-semibold hover:text-emerald-600 flex items-center gap-0.5"
        >
          View all
          <Icons.ChevronRight />
        </button>
      </div>
      <div className="space-y-2">
        {latestAnnouncements.map((a) => (
          <motion.div
            key={a.id}
            className="bg-white border border-slate-100 rounded-xl px-4 py-3.5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.2,
              delay: 0.02 * Number(a.id),
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wide">
                {a.badge}
              </span>
              <span className="text-[11px] text-slate-400">{a.date}</span>
            </div>
            <p className="text-sm font-semibold text-slate-900">{a.title}</p>
          </motion.div>
        ))}
      </div>
    </>
  );
}

export function EventsPage({
  onNav,

  user,

  showFees,

  events,
}: {
  onNav: (p: Page) => void;

  user: User | null;

  showFees: boolean;

  events: EventData[];
}) {
  const [filter, setFilter] = useState("all");

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const items =
    filter === "all" ? events : events.filter((e) => e.status === filter);

  const canSeeFees = user?.role === "student" && showFees;

  if (selectedEventId) {
    return (
      <EventDetailPageView
        event={items.find((event) => event.id === selectedEventId) ?? null}
        user={user}
        showFees={showFees}
        onClose={() => setSelectedEventId(null)}
        onPrimaryAction={() => {
          setSelectedEventId(null);
          onNav("my-qr");
        }}
      />
    );
  }

  return (
    <>
      <PageHeader title="Events" subtitle="AY 2026-2027, 1st Semester" />
      <div className="flex gap-2 sm:gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
        {[
          { k: "all", l: "All" },

          { k: "active", l: "Live" },

          { k: "upcoming", l: "Upcoming" },

          { k: "closed", l: "Closed" },
        ].map((f) => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k)}
            className={`shrink-0 h-8 px-3.5 rounded-lg text-xs font-semibold transition-all ${
              filter === f.k
                ? "bg-slate-900 text-white"
                : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            {f.l}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {items.map((e) => (
          <div
            key={e.id}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden h-full cursor-pointer"
            onClick={() => setSelectedEventId(e.id)}
          >
            <div className="relative w-full aspect-[4/3] bg-slate-50 overflow-hidden">
              {(() => {
                const cover = e.highlightUrl;

                if (!cover) {
                  return (
                    <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                      <span className="text-sm font-semibold text-slate-400">
                        No media
                      </span>
                    </div>
                  );
                }

                return /\.mp4($|\?)/i.test(cover) ? (
                  <video
                    src={cover}
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={cover}
                    alt={e.title}
                    className="w-full h-full object-cover"
                  />
                );
              })()}

              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/25 via-transparent to-slate-900/10" />

              <div className="absolute top-3 left-3 z-10">
                <Badge status={e.status} />
              </div>

              <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                {e.attendees > 0 && (
                  <span className="rounded-full border border-white/30 bg-slate-900/25 px-2 py-1 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm">
                    {e.attendees} attended
                  </span>
                )}
                {canSeeFees && e.fineAmount > 0 && (
                  <span className="rounded-full border border-red-200 bg-red-500/90 px-2 py-1 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm">
                    ₱{e.fineAmount} fine
                  </span>
                )}
              </div>
            </div>

            <div className="p-5 flex flex-col flex-1 justify-between gap-3">
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-base line-clamp-1">
                  {e.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                  {e.description}
                </p>
              </div>

              <div className="text-xs text-slate-500 flex flex-col gap-1 pt-3 border-t border-slate-50">
                <span className="flex items-center gap-1.5">
                  <Icons.Calendar />
                  {e.date}
                </span>
                <span className="flex items-center gap-1.5">
                  <Icons.Clock />
                  {e.time}
                </span>
                <span className="flex items-center gap-1.5">
                  <Icons.MapPin />
                  {e.location}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function EventDetailPage({
  eventId,

  user,

  showFees,

  onBack,

  events,
}: {
  eventId: string;

  user: User | null;

  showFees: boolean;

  onBack: () => void;

  events: EventData[];
}) {
  const ev = events.find((e) => e.id === eventId) ?? events[0];

  const canSeeFees = user?.role === "student" && showFees;

  const [lightbox, setLightbox] = useState<string | null>(null);

  const primaryMedia = ev.highlightUrl ?? ev.mediaUrls?.[0];

  return (
    <>
      <BackButton onClick={onBack} label="Back to Events" />
      <div className="relative rounded-xl overflow-hidden mb-4 shadow-sm">
        {primaryMedia ? (
          /\.mp4($|\?)/i.test(primaryMedia) ? (
            <video
              src={primaryMedia}
              controls
              playsInline
              className="w-full h-64 object-cover"
            />
          ) : (
            <img
              src={primaryMedia}
              alt={ev.title}
              className="w-full h-64 object-cover"
            />
          )
        ) : (
          <div className="w-full h-64 bg-emerald-500" />
        )}
        {}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
        {}
        <div className="absolute top-4 left-4">
          <Badge status={ev.status} />
        </div>
        {}
        <div className="absolute left-0 right-0 bottom-0 px-4 pb-4">
          <h1 className="font-bold text-lg text-white mb-2.5 leading-snug drop-shadow">
            {ev.title}
          </h1>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { l: "DATE", v: ev.date },

              { l: "TIME", v: ev.time },
            ].map((d) => (
              <div
                key={d.l}
                className="bg-white/15 backdrop-blur-sm rounded-lg px-2.5 py-2"
              >
                <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest mb-0.5">
                  {d.l}
                </p>
                <p className="text-xs font-semibold text-white leading-tight">
                  {d.v}
                </p>
              </div>
            ))}
            <div className="bg-white/15 backdrop-blur-sm rounded-lg px-2.5 py-2 col-span-2">
              <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest mb-0.5">
                LOCATION
              </p>
              <p className="text-xs font-semibold text-white leading-tight">
                {ev.location}
              </p>
            </div>
            {canSeeFees && ev.fineAmount > 0 && (
              <div className="bg-white/15 backdrop-blur-sm rounded-lg px-2.5 py-2 col-span-2">
                <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest mb-0.5">
                  ABSENCE FEE
                </p>
                <p className="text-xs font-semibold text-white leading-tight">
                  ₱{ev.fineAmount}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="bg-white border border-slate-100 rounded-xl p-5 mb-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
          About
        </p>
        <p className="text-sm text-slate-600 leading-relaxed">
          {ev.description}
        </p>
        <p className="text-xs text-slate-400 mt-3">For: {ev.program}</p>
      </div>
      {ev.mediaUrls && ev.mediaUrls.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-xl p-5 mb-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
            Media
          </p>
          <div className="grid grid-cols-2 gap-2">
            {ev.mediaUrls.map((url, i) =>
              /\.mp4($|\?)/i.test(url) ? (
                <div
                  key={i}
                  className="relative w-full aspect-video rounded-lg overflow-hidden"
                >
                  <video
                    src={url}
                    controls
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <button
                  key={i}
                  onClick={() => setLightbox(url)}
                  className="relative w-full aspect-video rounded-lg overflow-hidden group focus:outline-none"
                >
                  <img
                    src={url}
                    alt={`Event photo ${i + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-white/0 group-hover:bg-white/80 flex items-center justify-center transition-all duration-200 scale-75 group-hover:scale-100">
                      <svg
                        viewBox="0 0 18 18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-4 h-4 text-slate-800"
                      >
                        <circle cx="8" cy="8" r="5" />
                        <path d="M15 15l-3.5-3.5M10 8H6M8 6v4" />
                      </svg>
                    </div>
                  </div>
                </button>
              ),
            )}
          </div>
        </div>
      )}
      {}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            onClick={() => setLightbox(null)}
          >
            <Icons.X />
          </button>
          <img
            src={lightbox}
            alt=""
            className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      {user && ev.status === "active" && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3.5 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-500 shrink-0">
            <Icons.QrCode />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Ready to attend?
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Show your QR code at the entrance to log attendance.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function EventDetailPageView({
  event,
  user,
  viewerRole,
  showFees,
  onClose,
  onPrimaryAction,
}: {
  event: EventData | null;
  user: User | null;
  viewerRole?: Role;
  showFees: boolean;
  onClose: () => void;
  onPrimaryAction: () => void;
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileSection, setMobileSection] = useState<"details" | "gallery">(
    "details",
  );

  useEffect(() => {
    setIsLoading(true);
    const frame = requestAnimationFrame(() => setIsLoading(false));

    return () => cancelAnimationFrame(frame);
  }, [event?.id]);

  if (isLoading || !event) {
    return (
      <div className="min-h-screen bg-slate-50/60">
        <div className="mx-auto max-w-7xl px-2.5 pb-12 pt-2 md:p-6">
          <Skeleton className="mb-6 h-5 w-32" />
          <div className="grid grid-cols-1 gap-5 md:gap-8 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-7">
              <Skeleton className="aspect-video w-full rounded-2xl" />
              <Skeleton className="h-80 w-full rounded-2xl" />
            </div>
            <div className="lg:col-span-5">
              <Skeleton className="mb-4 h-8 w-48" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[0, 1, 2, 3].map((item) => (
                  <Skeleton
                    key={item}
                    className="aspect-video w-full rounded-xl"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const role = user?.role ?? viewerRole;
  const canSeeFees = role === "student" && showFees;

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="mx-auto max-w-7xl px-2.5 pb-12 pt-2 md:p-6">
        <button
          type="button"
          onClick={onClose}
          className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900 md:mb-6"
        >
          <Icons.ChevronLeft />
          Back to Events
        </button>

        <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1 md:hidden">
          {[
            ["details", "Event details"],
            ["gallery", "Gallery"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMobileSection(value as "details" | "gallery")}
              className={`h-9 rounded-lg text-xs font-semibold transition-colors ${
                mobileSection === value
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 md:gap-8 lg:grid-cols-12">
          <div
            className={`space-y-5 lg:col-span-7 lg:sticky lg:top-6 lg:self-start ${
              mobileSection === "details" ? "" : "hidden md:block"
            }`}
          >
            <div className="aspect-video overflow-hidden rounded-2xl bg-slate-50 shadow-sm">
              {event.highlightUrl ? (
                <img
                  src={event.highlightUrl}
                  alt={event.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-400">
                  No highlight photo
                </div>
              )}
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
              <div className="flex items-start justify-between gap-3 pr-10">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {event.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    For: {event.program}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-emerald-100 bg-emerald-50/90 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {event.status === "active"
                    ? "Live"
                    : event.status === "closed"
                      ? "Closed"
                      : "Upcoming"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Date
                  </p>
                  <p className="mt-1 font-semibold text-slate-700">
                    {event.date || "TBA"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Time
                  </p>
                  <p className="mt-1 font-semibold text-slate-700">
                    {event.time || "TBA"}
                  </p>
                </div>
                <div className="col-span-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Location / Workspace
                  </p>
                  <p className="mt-1 font-semibold text-slate-700">
                    {event.location || "TBA"}
                  </p>
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-slate-100 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Session & fines
                </p>
                <p className="text-sm text-slate-600">
                  {event.multiSession
                    ? `Morning ${event.morningStart || "TBA"}-${event.morningEnd || "TBA"} · Afternoon ${event.afternoonStart || "TBA"}-${event.afternoonEnd || "TBA"}`
                    : "Single session"}
                </p>
                {(canSeeFees || role === "admin") && event.fineAmount > 0 && (
                  <p className="text-sm font-semibold text-slate-700">
                    Absence fine: ₱{event.fineAmount}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Description
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {event.description || "No description provided."}
                </p>
              </div>

              {role && event.status === "active" && (
                <button
                  type="button"
                  onClick={onPrimaryAction}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                >
                  {role === "admin" ? "View attendees" : "Open My QR Code"}
                </button>
              )}
            </div>
          </div>

          <div
            className={`lg:col-span-5 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto lg:pr-2 ${
              mobileSection === "gallery" ? "" : "hidden md:block"
            }`}
          >
            <div className="mb-3 flex items-center justify-between pr-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Secondary gallery
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Photos and event videos
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                {event.mediaUrls?.length ?? 0} assets
              </span>
            </div>
            {event.mediaUrls && event.mediaUrls.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {event.mediaUrls.map((url, index) =>
                  /\.mp4($|\?)/i.test(url) ? (
                    <div
                      key={url}
                      className="relative aspect-video overflow-hidden rounded-xl border border-slate-100 bg-slate-900"
                    >
                      <video
                        src={url}
                        controls
                        playsInline
                        className="h-full w-full object-cover"
                      />
                      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-slate-900/70 px-2 py-1 text-[10px] font-semibold text-white">
                        Video
                      </span>
                    </div>
                  ) : (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setLightbox(url)}
                      className="group relative aspect-video overflow-hidden rounded-xl border border-slate-100 bg-slate-50 text-left"
                    >
                      <img
                        src={url}
                        alt={`Event photo ${index + 1}`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/0 transition-colors group-hover:bg-slate-950/20">
                        <span className="rounded-full bg-white/0 px-3 py-2 text-xs font-semibold opacity-0 shadow-sm transition-all group-hover:bg-white/90 group-hover:text-slate-800 group-hover:opacity-100">
                          View photo
                        </span>
                      </span>
                    </button>
                  ),
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-8 text-center text-sm text-slate-400">
                No secondary gallery assets yet.
              </div>
            )}
          </div>
        </div>
      </div>
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label="Close photo preview"
          >
            <Icons.X />
          </button>
          <img
            src={lightbox}
            alt="Event gallery preview"
            className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export function MyQRPage({
  user,

  qrVersion,

  onBack,
}: {
  user: User;

  qrVersion: number;

  onBack: () => void;
}) {
  const name = fullName(user);

  const handleDownload = async () => {
    const size = 240,
      pad = 24,
      footH = 72,
      dpr = 2;

    const canvas = document.createElement("canvas");

    canvas.width = (size + pad * 2) * dpr;

    canvas.height = (size + pad * 2 + footH) * dpr;

    const ctx = canvas.getContext("2d")!;

    ctx.scale(dpr, dpr);

    const W = size + pad * 2;

    ctx.fillStyle = "#fff";

    ctx.beginPath();

    ctx.roundRect(0, 0, W, size + pad * 2 + footH, 16);

    ctx.fill();

    const qrDataUrl = await QRCode.toDataURL(
      `ADESSE:${user.studentId}:v${qrVersion}`,
      {
      width: size,

      margin: 0,

      color: { dark: "#111827", light: "#ffffff" },

      errorCorrectionLevel: "H",
      },
    );

    const img = new Image();

    await new Promise((r) => {
      img.onload = r;
    });

    ctx.drawImage(img, pad, pad, size, size);

    ctx.strokeStyle = "#f1f5f9";

    ctx.lineWidth = 1;

    ctx.beginPath();

    ctx.moveTo(pad, size + pad + 12);

    ctx.lineTo(W - pad, size + pad + 12);

    ctx.stroke();

    ctx.fillStyle = "#111827";

    ctx.font = "bold 13px sans-serif";

    ctx.textAlign = "center";

    ctx.fillText(name, W / 2, size + pad + 32);

    ctx.fillStyle = "#94a3b8";

    ctx.font = "11px sans-serif";

    ctx.fillText(
      `${user.studentId} · ${user.program} ${user.yearLevel}`,

      W / 2,

      size + pad + 50,
    );

    ctx.fillStyle = "#10b981";

    ctx.font = "bold 10px sans-serif";

    ctx.fillText(
      "Adesse · Student Attendance & Fee Tracking System",

      W / 2,

      size + pad + 66,
    );

    const a = document.createElement("a");

    a.download = `adesse-qr-${user.studentId}-v${qrVersion}.png`;

    a.href = canvas.toDataURL("image/png");

    a.click();
  };

  return (
    <>
      <BackButton onClick={onBack} label="Back to Home" />
      <PageHeader
        title="My QR Code"
        subtitle="Present at event entrances to log attendance."
      />
      <div className="max-w-xs mx-auto">
        <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center shadow-sm relative">
          {qrVersion > 1 && (
            <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Renewed
            </div>
          )}
          <div className="flex justify-center mb-5">
            <StudentQR
              studentId={user.studentId}
              qrVersion={qrVersion}
              size={192}
            />
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="font-bold text-slate-900">{name || "Your name"}</p>
            <p className="text-sm text-slate-400 mt-0.5">
              {user.studentId || "No ID set"}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2.5">
              {[user.program, user.yearLevel, user.section]

                .filter(Boolean)

                .map((t) => (
                  <span
                    key={t}
                    className="text-[11px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded"
                  >
                    {t}
                  </span>
                ))}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <button
            onClick={handleDownload}
            className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Icons.Download />
            Download QR as PNG
          </button>
        </div>
        <div className="mt-4 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 flex items-start gap-3">
          <span className="text-slate-400 shrink-0 mt-0.5">
            <Icons.AlertCircle />
          </span>
          <p className="text-xs text-slate-500 leading-relaxed">
            Updating your profile regenerates this QR.{" "}
            <span className="font-semibold text-slate-700">
              Previously downloaded images will no longer be valid.
            </span>
          </p>
        </div>
      </div>
    </>
  );
}

export function AnnouncementsPage({
  onBack,

  announcements,
}: {
  onBack: () => void;

  announcements: typeof INITIAL_ANNOUNCEMENTS;
}) {
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<
    string | null
  >(null);

  if (selectedAnnouncementId) {
    return (
      <AnnouncementDetailPageView
        announcement={
          announcements.find((item) => item.id === selectedAnnouncementId) ??
          null
        }
        onBack={() => setSelectedAnnouncementId(null)}
      />
    );
  }

  return (
    <>
      <BackButton onClick={onBack} label="Back" />
      <PageHeader title="Announcements" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {announcements.map((a) => (
          <div
            key={a.id}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden h-full"
            onClick={() => setSelectedAnnouncementId(a.id)}
          >
            <div className="relative w-full aspect-[4/3] bg-slate-50 overflow-hidden">
              {a.photoUrl ? (
                <img
                  src={a.photoUrl}
                  alt={a.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                  <span className="text-sm font-semibold text-slate-400">
                    No image
                  </span>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/25 via-transparent to-slate-900/10" />

              <div className="absolute top-3 left-3 z-10">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50/90 border border-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wide shadow-sm backdrop-blur-sm">
                  {a.badge}
                </span>
              </div>

              <div className="absolute top-3 right-3 z-10">
                <span className="rounded-full border border-white/30 bg-slate-900/25 px-2 py-1 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm">
                  {a.date}
                </span>
              </div>
            </div>

            <div className="p-5 flex flex-col flex-1 justify-between gap-3">
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-base line-clamp-1">
                  {a.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">
                  {a.body}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-50">
                <p className="text-[11px] text-slate-400">
                  Posted by {a.author}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function AnnouncementDetailPageView({
  announcement,
  onBack,
  onEdit,
  onDelete,
}: {
  announcement: (typeof INITIAL_ANNOUNCEMENTS)[0] | null;
  onBack: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!announcement) return null;

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="mx-auto max-w-5xl px-2.5 pb-12 pt-2 md:p-6">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900 md:mb-6"
        >
          <Icons.ChevronLeft />
          Back to Announcements
        </button>

        <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {announcement.photoUrl ? (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="group block aspect-video w-full overflow-hidden bg-slate-50"
              aria-label="View announcement image"
            >
              <img
                src={announcement.photoUrl}
                alt={announcement.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </button>
          ) : (
            <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-sm font-semibold text-slate-400">
              No image
            </div>
          )}

          <div className="space-y-5 p-5 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <span className="inline-flex rounded-full border border-emerald-100 bg-emerald-50/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  {announcement.badge}
                </span>
                <h1 className="text-2xl font-bold leading-tight text-slate-900 md:text-3xl">
                  {announcement.title}
                </h1>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                {announcement.date}
              </span>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600 md:text-base">
                {announcement.body}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <p className="text-xs text-slate-400">
                Posted by {announcement.author}
              </p>
              {(onEdit || onDelete) && (
                <div className="flex gap-2">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={onEdit}
                      className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={onDelete}
                      className="h-9 rounded-xl bg-red-50 px-3 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </article>
      </div>

      {lightboxOpen && announcement.photoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label="Close announcement image preview"
          >
            <Icons.X />
          </button>
          <img
            src={announcement.photoUrl}
            alt={`${announcement.title} preview`}
            className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export function AttendanceHistoryPage({
  excuseRequests,

  fines,

  showFees,

  onSubmitExcuse,

  onBack,

  attendanceRecords = ATTENDANCE_RECORDS,
}: {
  excuseRequests: ExcuseRequest[];

  fines: FineRecord[];

  showFees: boolean;

  onSubmitExcuse: (r: ExcuseRequest) => void;

  onBack: () => void;

  attendanceRecords?: typeof ATTENDANCE_RECORDS;
}) {
  const [modal, setModal] = useState<(typeof ATTENDANCE_RECORDS)[0] | null>(
    null,
  );

  return (
    <>
      <BackButton onClick={onBack} label="Back to Home" />
      <PageHeader title="My Attendance" subtitle="AY 2026-2027, 1st Semester" />
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden mb-5">
        {attendanceRecords.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-semibold text-slate-900">
              No attendance records yet
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Your event attendance will appear here after a session is recorded.
            </p>
          </div>
        ) : attendanceRecords.map((r, i) => {
          const req = excuseRequests.find(
            (x) =>
              (x.eventId && x.eventId === r.eventId) || x.event === r.event,
          );

          const eff =
            req?.status === "approved"
              ? "excused"
              : req?.status === "pending"
                ? "pending"
                : r.status;

          const fine = fines.find(
            (f) =>
              f.attendanceScanId === r.id ||
              f.eventId === r.eventId,
          );

          return (
            <div
              key={r.id}
              className={`flex items-center gap-4 px-5 py-4 ${
                i < ATTENDANCE_RECORDS.length - 1
                  ? "border-b border-slate-50"
                  : ""
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    eff === "present" || eff === "late"
                    ? "bg-emerald-50 text-emerald-500"
                    : eff === "absent"
                      ? "bg-red-50 text-red-400"
                      : eff === "excused"
                        ? "bg-violet-50 text-violet-500"
                        : "bg-amber-50 text-amber-500"
                }`}
              >
                {eff === "present" || eff === "late" ? (
                  <Icons.Check />
                ) : eff === "excused" ? (
                  <Icons.CheckCircle />
                ) : (
                  <Icons.XCircle />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {r.event}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {r.date}
                  {r.time !== "—" ? ` · ${r.time}` : ""}
                </p>
                {showFees && fine && (eff === "absent" || eff === "late") && (
                  <p className="text-xs text-red-500 font-semibold mt-0.5">
                    Fee: ₱{fine.amount}
                  </p>
                )}
              </div>
              {eff === "absent" ? (
                <button
                  onClick={() => setModal(r)}
                  className="shrink-0 h-8 px-3 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold rounded-lg flex items-center gap-1.5"
                >
                  <Icons.Send />
                  Excuse
                </button>
              ) : (
                <Badge status={eff} />
              )}
            </div>
          );
        })}
      </div>
      {excuseRequests.length > 0 && (
        <>
          <SectionLabel>My excuse requests</SectionLabel>
          <div className="space-y-2.5">
            {excuseRequests.map((r) => (
              <div
                key={r.id}
                className="bg-white border border-slate-100 rounded-xl px-5 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {r.event}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Submitted {r.submittedDate}
                    </p>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                      {r.reason}
                    </p>
                  </div>
                  <Badge status={r.status} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {modal && (
        <ExcuseModal
          record={modal}
          onClose={() => setModal(null)}
          onSubmit={(r) => {
            onSubmitExcuse(r);

            setModal(null);
          }}
        />
      )}
    </>
  );
}

export function MyFinesPage({
  fines,

  showFees,

  onBack,
}: {
  fines: FineRecord[];

  showFees: boolean;

  onBack: () => void;
}) {
  const unpaid = fines.filter((f) => f.status === "unpaid");

  const total = unpaid.reduce((s, f) => s + f.amount, 0);

  if (!showFees) {
    return (
      <>
        <BackButton onClick={onBack} label="Back to Home" />
        <PageHeader title="My Fines" />
        <div className="bg-white border border-slate-100 rounded-xl px-5 py-12 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Icons.Peso />
          </div>
          <p className="font-semibold text-slate-900 text-sm">
            Fee information not yet available
          </p>
          <p className="text-xs text-slate-400 mt-1.5 max-w-[220px] mx-auto leading-relaxed">
            Fee details will be shown when the payment period opens. Check back
            soon.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <BackButton onClick={onBack} label="Back to Home" />
      <PageHeader
        title="My Fines"
        subtitle="Outstanding fees from missed events."
      />
      {unpaid.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-xl px-5 py-12 text-center">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-3 text-emerald-500">
            <Icons.Check />
          </div>
          <p className="font-semibold text-slate-900 text-sm">
            No outstanding fines
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Your attendance record is clean.
          </p>
        </div>
      ) : (
        <>
          {unpaid.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 mb-5 flex items-center justify-between">
              <div>
                <p className="font-bold text-red-800">Total outstanding</p>
                <p className="text-xs text-red-600 mt-0.5">
                  {unpaid.length} unpaid fine
                  {unpaid.length > 1 ? "s" : ""}
                </p>
              </div>
              <p className="text-2xl font-extrabold text-red-700">
                ₱{total.toLocaleString()}
              </p>
            </div>
          )}
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
            {fines.map((fine, i) => (
              <div
                key={fine.id}
                className={`flex items-center gap-4 px-5 py-4 ${
                  i < fines.length - 1 ? "border-b border-slate-50" : ""
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    fine.status === "unpaid"
                      ? "bg-red-50 text-red-400"
                      : fine.status === "excused"
                        ? "bg-violet-50 text-violet-500"
                        : "bg-emerald-50 text-emerald-500"
                  }`}
                >
                  <Icons.Peso />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {fine.eventTitle}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {fine.eventDate}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`text-sm font-bold ${
                      fine.status === "unpaid"
                        ? "text-red-600"
                        : fine.status === "excused"
                          ? "text-violet-600"
                          : "text-emerald-500"
                    }`}
                  >
                    ₱{fine.amount}
                  </p>
                  <Badge status={fine.status} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 flex items-start gap-3">
            <span className="text-slate-400 shrink-0 mt-0.5">
              <Icons.AlertCircle />
            </span>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pay fines at the SSG office or Accounting window. Bring your
              student ID. Approved excuse requests automatically waive the
              corresponding fee.
            </p>
          </div>
        </>
      )}
    </>
  );
}

export function ProfilePage({
  user,

  onSave,

  onBack,

  saving,
}: {
  user: User;

  onSave: (u: User) => Promise<boolean>;

  onBack: () => void;

  saving?: boolean;
}) {
  const [editing, setEditing] = useState(false);

  const [photoUploadState, setPhotoUploadState] = useState<
    "idle" | "uploading" | "error"
  >("idle");

  const [coverPhotoUploadState, setCoverPhotoUploadState] = useState<
    "idle" | "uploading" | "error"
  >("idle");

  const [draft, setDraft] = useState({ ...user });

  const photoRef = useRef<HTMLInputElement>(null);

  const coverPhotoRef = useRef<HTMLInputElement>(null);

  const setF =
    (k: keyof User) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDraft((d) => ({ ...d, [k]: e.target.value }));

  const isMod = user.role === "admin";

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (draft.photoUrl && draft.photoUrl.startsWith("blob:")) {
      URL.revokeObjectURL(draft.photoUrl);
    }

    setPhotoUploadState("uploading");

    const result = await uploadImage(file);

    if ("error" in result) {
      setPhotoUploadState("error");

      toast.error(result.error);

      return;
    }

    setPhotoUploadState("idle");

    setDraft((d) => ({ ...d, photoUrl: result.url }));
  };

  const handleCoverPhotoChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (draft.coverPhotoUrl && draft.coverPhotoUrl.startsWith("blob:")) {
      URL.revokeObjectURL(draft.coverPhotoUrl);
    }

    setCoverPhotoUploadState("uploading");

    const result = await uploadImage(file);

    if ("error" in result) {
      setCoverPhotoUploadState("error");

      toast.error(result.error);

      return;
    }

    setCoverPhotoUploadState("idle");

    setDraft((d) => ({ ...d, coverPhotoUrl: result.url }));
  };

  useEffect(() => {
    return () => {
      if (draft.photoUrl && draft.photoUrl.startsWith("blob:")) {
        URL.revokeObjectURL(draft.photoUrl);
      }

      if (draft.coverPhotoUrl && draft.coverPhotoUrl.startsWith("blob:")) {
        URL.revokeObjectURL(draft.coverPhotoUrl);
      }
    };
  }, []);

  const profile = editing ? draft : user;

  return (
    <>
      <BackButton
        onClick={onBack}
        label={isMod ? "Back to Overview" : "Back to Home"}
      />
      <PageHeader
        title="Profile"
        action={
          editing ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (draft.photoUrl && draft.photoUrl.startsWith("blob:")) {
                    URL.revokeObjectURL(draft.photoUrl);
                  }

                  setDraft({ ...user });

                  setEditing(false);
                }}
                className="h-9 px-4 border border-slate-200 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-50"
              >
                Discard
              </button>
              <button
                onClick={async () => {
                  if (await onSave({ ...user, ...draft })) {
                    setEditing(false);
                  }
                }}
                disabled={saving}
                className="h-9 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="h-9 px-4 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 flex items-center gap-1.5"
            >
              <Icons.Edit />
              Edit
            </button>
          )
        }
      />
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 lg:grid-cols-[1.05fr_1.4fr]">
        <aside className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="relative h-36 w-full overflow-hidden rounded-t-2xl md:h-40">
              {(editing ? draft.coverPhotoUrl : user.coverPhotoUrl) ? (
                <img
                  src={editing ? draft.coverPhotoUrl : user.coverPhotoUrl}
                  alt="Profile cover"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-emerald-50 to-slate-200" />
                  <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/50 blur-3xl" />
                  <div className="absolute bottom-0 left-1/3 h-24 w-56 rounded-full bg-emerald-100/40 blur-3xl" />
                </>
              )}
              {editing && (
                <div className="absolute right-3 top-3 flex gap-2">
                  <input
                    ref={coverPhotoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverPhotoChange}
                  />
                  <button
                    onClick={() => coverPhotoRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1.5 text-[10px] font-semibold text-slate-700 shadow-sm transition hover:bg-white"
                  >
                    <Icons.Camera />
                    {coverPhotoUploadState === "uploading"
                      ? "Uploading..."
                      : "Change cover"}
                  </button>
                  {(draft.coverPhotoUrl || user.coverPhotoUrl) && (
                    <button
                      onClick={() =>
                        setDraft((d) => ({ ...d, coverPhotoUrl: undefined }))
                      }
                      className="rounded-full bg-slate-900/80 px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-sm transition hover:bg-slate-900"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="relative px-5 pb-5 md:px-6">
              <div className="relative z-10 -mt-10 ml-6">
                {editing && photoUploadState === "uploading" ? (
                  <Skeleton className="h-20 w-20 rounded-full" />
                ) : (
                  <ProfileIcon
                    photoUrl={(editing ? draft : user).photoUrl}
                    size="lg"
                  />
                )}
                {editing && photoUploadState === "error" && (
                  <p className="absolute -bottom-8 left-0 text-[10px] font-semibold text-red-600 whitespace-nowrap">
                    Upload failed, try again
                  </p>
                )}
                {editing && (
                  <>
                    <input
                      ref={photoRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                    <button
                      onClick={() => photoRef.current?.click()}
                      className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md transition-colors hover:bg-emerald-700"
                    >
                      <Icons.Camera />
                    </button>
                  </>
                )}
              </div>
              <div className="mt-4">
                <p className="text-xl font-bold text-slate-900">
                  {fullName(editing ? draft : user) || "Your name"}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {(editing ? draft : user).studentId ||
                    (isMod ? "Admin" : "No ID")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    (editing ? draft : user).program,
                    (editing ? draft : user).yearLevel,
                    (editing ? draft : user).section,
                  ]
                    .filter(Boolean)
                    .map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-emerald-100 bg-emerald-50/90 px-3 py-1 text-xs font-medium text-emerald-700"
                      >
                        {t}
                      </span>
                    ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 border-t border-slate-100 bg-slate-50/60 p-4 text-center">
              {[
                ["Profile", "Status"],
                [isMod ? "Admin" : "Student", "Role"],
                [profile.contactEmail ? "Verified" : "Pending", "Contact"],
              ].map(([value, label]) => (
                <div key={label}>
                  <p className="text-lg font-bold text-slate-900">{value}</p>
                  <p className="text-[11px] text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </section>

          {editing && (
            <p className="-mt-1 mb-0 text-[11px] text-slate-400 flex items-center gap-1.5">
              <Icons.Camera />
              Tap the camera icon to update your profile photo
            </p>
          )}

          {!isMod && (
            <section className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5 shadow-sm md:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Student QR
              </p>
              <div className="mt-3 flex justify-center rounded-xl border border-slate-100 bg-white p-4">
                <StudentQR studentId={profile.studentId} size={170} />
              </div>
              <p className="mt-3 text-center text-xs font-medium text-slate-500">
                ADESSE:{profile.studentId}
              </p>
            </section>
          )}

          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Contact & info
            </p>
            <div className="mt-4 divide-y divide-slate-100">
              {[
                { label: "Phone", value: profile.phone || "Not provided" },
                {
                  label: "Email",
                  value: profile.contactEmail || "Not provided",
                },
              ].map((item) => (
                <div key={item.label} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <main className="space-y-6">
          {!editing ? (
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    Personal details
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Account information tied to your Adesse profile.
                  </p>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  { l: "First name", v: user.firstName },
                  {
                    l: "Middle initial",
                    v: user.middleInitial ? user.middleInitial + "." : "—",
                  },
                  { l: "Surname", v: user.surname },
                  ...(!isMod ? [{ l: "Student ID", v: user.studentId }] : []),
                  { l: "Program", v: user.program },
                  ...(!isMod
                    ? [
                        { l: "Year level", v: user.yearLevel },
                        { l: "Section", v: user.section || "—" },
                      ]
                    : []),
                  { l: "Phone", v: user.phone || "—" },
                  { l: "Email", v: user.contactEmail || "—" },
                ].map((f, i, arr) => (
                  <div
                    key={f.l}
                    className={`flex items-center justify-between gap-4 py-3 ${
                      i < arr.length - 1 ? "border-b border-slate-50" : ""
                    }`}
                  >
                    <span className="text-xs font-semibold text-slate-400">
                      {f.l}
                    </span>
                    <span className="text-right text-sm font-semibold text-slate-900">
                      {f.v}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-3.5 md:px-6">
                <SectionLabel>Profile details</SectionLabel>
              </div>
              <div className="space-y-4 p-5 md:p-6">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <FieldInput
                      label="First Name"
                      value={draft.firstName}
                      onChange={setF("firstName")}
                    />
                  </div>
                  <FieldInput
                    label="M.I."
                    value={draft.middleInitial}
                    maxLength={2}
                    onChange={setF("middleInitial")}
                  />
                </div>
                <FieldInput
                  label="Surname"
                  value={draft.surname}
                  onChange={setF("surname")}
                />
              </div>

              <div className="border-y border-slate-100 px-5 py-3.5 md:px-6">
                <SectionLabel>Contact</SectionLabel>
              </div>
              <div className="space-y-4 p-5 md:p-6">
                <FieldInput
                  label="Phone"
                  type="tel"
                  placeholder="09XX XXX XXXX"
                  value={draft.phone}
                  onChange={setF("phone")}
                />
                <FieldInput
                  label="Email"
                  type="email"
                  value={draft.contactEmail}
                  onChange={setF("contactEmail")}
                />
              </div>

              {!isMod && (
                <>
                  <div className="border-y border-slate-100 px-5 py-3.5 md:px-6">
                    <SectionLabel>Enrollment</SectionLabel>
                  </div>
                  <div className="space-y-4 p-5 md:p-6">
                    <FieldInput
                      label="Student ID (7 digits)"
                      value={draft.studentId}
                      onChange={setF("studentId")}
                    />
                    <FieldSelect
                      label="Program"
                      value={draft.program}
                      onChange={setF("program")}
                    >
                      <option value="">Select program</option>
                      <option>BSIT - Information Technology</option>
                      <option>BSCS - Computer Science</option>
                      <option>BSBA - Business Administration</option>
                      <option>BSEd - Secondary Education</option>
                      <option>BSHM - Hospitality Management</option>
                    </FieldSelect>
                    <FieldSelect
                      label="Year Level"
                      value={draft.yearLevel}
                      onChange={setF("yearLevel")}
                    >
                      <option value="">Select year level</option>
                      <option>1st Year</option>
                      <option>2nd Year</option>
                      <option>3rd Year</option>
                      <option>4th Year</option>
                    </FieldSelect>
                    <FieldInput
                      label="Section"
                      placeholder="e.g. IT-2A"
                      value={draft.section}
                      onChange={setF("section")}
                    />
                  </div>
                  <div className="px-5 pb-5 md:px-6 md:pb-6">
                    <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3.5">
                      <span className="mt-0.5 shrink-0 text-amber-500">
                        <Icons.AlertCircle />
                      </span>
                      <p className="text-xs text-amber-700 leading-relaxed">
                        Saving changes will regenerate your QR code. Previously
                        downloaded images will be invalidated.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}

          {!isMod && profile.idPhotoUrl && (
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-base font-semibold text-slate-900">
                  School ID
                </p>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Verification
                </span>
              </div>
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-slate-100 bg-slate-50/80">
                <img
                  src={profile.idPhotoUrl}
                  alt="School ID"
                  className="h-full w-full object-contain"
                />
              </div>
              <p className="mt-3 text-center text-[11px] text-slate-400">
                Used for identity verification by moderators
              </p>
            </section>
          )}
        </main>
      </div>
    </>
  );
}

export function AdminDashboard({
  onNav,

  excuseRequests,

  stats,

  recentScans,

  featuredEventTitle,

  featuredEventStatus,
}: {
  onNav: (p: Page) => void;

  excuseRequests: ExcuseRequest[];

  stats?: {
    scannedToday: number;

    duplicates: number;

    activeEvents: number;

    students: number;
  };

  recentScans?: Array<{
    name: string;

    id: string;

    program: string;

    section: string;

    photoUrl?: string;

    time: string;

    status: "confirmed" | "duplicate";
  }>;

  featuredEventTitle?: string;

  featuredEventStatus?: EventStatus;
}) {
  const pending = excuseRequests.filter((r) => r.status === "pending").length;

  const liveStats = stats ?? {
    scannedToday: 0,

    duplicates: 0,

    activeEvents: 0,

    students: 0,
  };

  const liveRecentScans = recentScans ?? [];

  const statusConfig: Record<
    EventStatus,
    {
      label: string;
      message: string;
      classes: string;
      dotClass: string;
    }
  > = {
    active: {
      label: "Live",

      message: "is live now",

      classes: "text-emerald-600 bg-emerald-50 border border-emerald-200",

      dotClass: "bg-emerald-500",
    },

    upcoming: {
      label: "Upcoming",

      message: "is coming up",

      classes: "text-sky-700 bg-sky-50 border border-sky-200",

      dotClass: "bg-sky-500",
    },

    closed: {
      label: "Closed",

      message: "is closed",

      classes: "text-slate-600 bg-slate-100 border border-slate-200",

      dotClass: "bg-slate-500",
    },
  };

  const currentStatus = featuredEventStatus ?? "upcoming";

  const currentStatusMeta = statusConfig[currentStatus];

  return (
    <>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
            {dashboardDateLabel}
          </p>
          <h1 className="text-xl font-bold text-slate-900">Admin Overview</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {featuredEventTitle || "Adesse overview"} {currentStatusMeta.message}
          </p>
        </div>
        <span
          className={`flex items-center gap-1.5 shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${currentStatusMeta.classes}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${currentStatusMeta.dotClass}`}
            style={{ animation: "pulse 2s infinite" }}
          />
          {currentStatusMeta.label}
        </span>
      </div>
      <div className="grid w-full grid-cols-1 gap-4 mb-5 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            l: "Scanned today",

            v: String(liveStats.scannedToday),

            sub: "Scanned today",

            c: "text-emerald-500",
          },

          {
            l: "Duplicates",

            v: String(liveStats.duplicates),

            sub: "Rejected",

            c: "text-red-500",
          },

          {
            l: "Active events",

            v: String(liveStats.activeEvents),

            sub: "Live now",

            c: "text-sky-600",
          },

          {
            l: "Students on Adesse",

            v: String(liveStats.students),

            sub: "Registered",

            c: "text-slate-700",
          },
        ].map((s) => (
          <div
            key={s.l}
            className="bg-white border border-slate-100 rounded-xl px-4 py-4"
          >
            <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
            <p className="text-xs font-semibold text-slate-600 mt-1">{s.l}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 mb-5 sm:grid-cols-2">
        <button
          onClick={() => onNav("admin-scanner")}
          className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl p-5 text-left transition-all shadow-sm hover:shadow-md"
        >
          <Icons.Scan />
          <p className="font-semibold text-sm mt-3 mb-0.5">Open Scanner</p>
          <p className="text-emerald-300 text-xs">Camera-based QR scan</p>
        </button>
        <button
          onClick={() => onNav("admin-excuse-requests")}
          className={`border rounded-xl p-5 text-left transition-all relative ${
            pending > 0
              ? "bg-amber-50 border-amber-200"
              : "bg-white border-slate-100"
          }`}
        >
          <Icons.FileText />
          <p
            className={`font-semibold text-sm mt-3 mb-0.5 ${
              pending > 0 ? "text-amber-800" : "text-slate-900"
            }`}
          >
            Excuse Requests
          </p>
          <p
            className={`text-xs ${
              pending > 0 ? "text-amber-600" : "text-slate-400"
            }`}
          >
            {pending > 0 ? `${pending} pending review` : "No pending"}
          </p>
          {pending > 0 && (
            <span className="absolute top-3 right-3 w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {pending}
            </span>
          )}
        </button>
      </div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-900">
          Recent scans — {featuredEventTitle || "Adesse overview"}
        </p>
        <button
          onClick={() => onNav("admin-attendees")}
          className="text-xs text-emerald-500 font-semibold hover:text-emerald-600 flex items-center gap-0.5"
        >
          View all
          <Icons.ChevronRight />
        </button>
      </div>
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
        {liveRecentScans.map((s, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-5 py-3.5 ${
              i < 4 ? "border-b border-slate-50" : ""
            }`}
          >
            {s.photoUrl ? (
              <img
                src={s.photoUrl}
                alt=""
                className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
              />
            ) : (
              <Avatar name={s.name} size="sm" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {s.name}
              </p>
              <p className="text-[11px] text-slate-400">
                {s.id} · {s.program}
                {s.program && s.section ? " · " : ""}
                {s.section}
              </p>
            </div>
            <span className="text-[11px] text-slate-400 shrink-0">
              {s.time}
            </span>
            <Badge status={s.status} />
          </div>
        ))}
      </div>
    </>
  );
}

interface NewEventDraft {
  title: string;

  date: string;

  time: string;

  location: string;

  description: string;

  program: string;

  fineAmount: string;

  photos: File[];

  videos: File[];

  multiSession: boolean;

  strictMorning: boolean;

  strictAfternoon: boolean;

  morningStart: string;

  morningEnd: string;

  morningLateCutoff: string;

  afternoonStart: string;

  afternoonEnd: string;

  afternoonLateCutoff: string;

  absentFine: string;

  lateFine: string;

  morningAbsentFine: string;

  morningLateFine: string;

  afternoonAbsentFine: string;

  afternoonLateFine: string;
}

type CreateEventTab = "basic" | "session" | "fines" | "media";

export function AdminEventsPage({
  onNav,

  events,

  setEvents,
}: {
  onNav: (p: Page) => void;

  events: EventData[];

  setEvents: React.Dispatch<React.SetStateAction<EventData[]>>;
}) {
  const EMPTY_DRAFT: NewEventDraft = {
    title: "",

    date: "",

    time: "",

    location: "",

    description: "",

    program: "All Programs",

    fineAmount: "0",

    photos: [],

    videos: [],

    multiSession: false,

    strictMorning: false,

    strictAfternoon: false,

    morningStart: "",

    morningEnd: "",

    morningLateCutoff: "",

    afternoonStart: "",

    afternoonEnd: "",

    afternoonLateCutoff: "",

    absentFine: "0",

    lateFine: "0",

    morningAbsentFine: "0",

    morningLateFine: "0",

    afternoonAbsentFine: "0",

    afternoonLateFine: "0",
  };

  const [showForm, setShowForm] = useState(false);

  const [activeTab, setActiveTab] = useState<CreateEventTab>("basic");

  const [editEventTab, setEditEventTab] = useState<CreateEventTab>("basic");

  const [editId, setEditId] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const [editDraft, setEditDraft] = useState<EventData | null>(null);

  const [editOriginal, setEditOriginal] = useState<EventData | null>(null);

  const [editFineValues, setEditFineValues] = useState({
    absentFine: "0",

    lateFine: "0",

    morningAbsentFine: "0",

    morningLateFine: "0",

    afternoonAbsentFine: "0",

    afternoonLateFine: "0",
  });

  const [showSensitiveWarning, setShowSensitiveWarning] = useState(false);

  const [eventHasScans, setEventHasScans] = useState(false);

  const photoRef = useRef<HTMLInputElement>(null);

  const videoRef = useRef<HTMLInputElement>(null);

  const editPhotoRef = useRef<HTMLInputElement>(null);

  const highlightRef = useRef<HTMLInputElement>(null);

  const editHighlightRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<NewEventDraft>(EMPTY_DRAFT);

  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  const [videoNames, setVideoNames] = useState<string[]>([]);

  const [highlightUrl, setHighlightUrl] = useState<string | null>(null);

  const [highlightUploadState, setHighlightUploadState] = useState<
    "idle" | "uploading" | "error"
  >("idle");

  const [mediaUploadState, setMediaUploadState] = useState<
    "idle" | "uploading" | "error"
  >("idle");

  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);

  const [editHighlightUploadState, setEditHighlightUploadState] = useState<
    "idle" | "uploading" | "error"
  >("idle");

  const setD =
    (k: keyof NewEventDraft) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setDraft((d) => ({ ...d, [k]: e.target.value }));

  const toggleD = (k: keyof NewEventDraft) => () =>
    setDraft((d) => ({ ...d, [k]: !d[k] }));

  const uploadEventMedia = async (files: File[]) => {
    if (!files.length) return;

    setMediaUploadState("uploading");

    setMediaUploadError(null);

    const results = await Promise.all(files.map((file) => uploadImage(file)));

    const failed = results.find((result) => "error" in result);

    if (failed && "error" in failed) {
      setMediaUploadState("error");

      setMediaUploadError(failed.error);

      toast.error(failed.error);

      return;
    }

    const urls = results

      .filter(
        (result): result is { url: string; path: string } => "url" in result,
      )

      .map((result) => result.url);

    setMediaUploadState("idle");

    setPhotoUrls((current) => [
      ...current,

      ...urls.filter((url) => !/\.mp4($|\?)/i.test(url)),
    ]);

    setVideoNames((current) => [
      ...current,

      ...urls.filter((url) => /\.mp4($|\?)/i.test(url)),
    ]);
  };

  const discardCreateMedia = () => {
    const mediaToDelete = [
      ...photoUrls,

      ...videoNames,

      ...(highlightUrl && !highlightUrl.startsWith("blob:")
        ? [highlightUrl]
        : []),
    ];

    setPhotoUrls([]);

    setVideoNames([]);

    setHighlightUrl(null);

    void deleteImages(mediaToDelete);
  };

  const discardEditMedia = () => {
    const uploadedReplacement =
      editDraft?.highlightUrl &&
      editDraft.highlightUrl !== editOriginal?.highlightUrl &&
      !editDraft.highlightUrl.startsWith("blob:")
        ? [editDraft.highlightUrl]
        : [];

    void deleteImages(uploadedReplacement);

    setEditId(null);

    setEditDraft(null);

    setEditOriginal(null);

    setShowSensitiveWarning(false);
  };

  const handleCreate = async () => {
    if (!draft.title || !draft.date) return;

    if (isCreating) return;

    setIsCreating(true);

    try {
      const timeRange = draft.multiSession
        ? null
        : parseEventTimeRange(draft.time);

      if (!draft.multiSession && !timeRange) {
        toast.error("Enter time like 3:35 AM - 5:20 AM.");

        return;
      }

      const persistedHighlightUrl =
        highlightUrl && !highlightUrl.startsWith("blob:") ? highlightUrl : null;

      const payload = {
        title: draft.title,

        event_date: draft.date,

        start_time: timeRange?.start ?? null,

        end_time: timeRange?.end ?? null,

        location: draft.location,

        description: draft.description,

        program: draft.program,

        image_url: persistedHighlightUrl,

        media_urls: [...photoUrls, ...videoNames],

        status: "upcoming",

        multi_session: draft.multiSession,

        strict_morning: draft.strictMorning,

        strict_afternoon: draft.strictAfternoon,

        morning_start: draft.multiSession
          ? draft.morningStart || null
          : (timeRange?.start ?? null),

        morning_end: draft.multiSession
          ? draft.morningEnd || null
          : (timeRange?.end ?? null),

        morning_late_cutoff: draft.morningLateCutoff || null,

        afternoon_start: draft.afternoonStart || null,

        afternoon_end: draft.afternoonEnd || null,

        afternoon_late_cutoff: draft.afternoonLateCutoff || null,

        absent_fine: Number(draft.absentFine) || 0,

        late_fine: Number(draft.lateFine) || 0,

        morning_absent_fine: draft.multiSession
          ? Number(draft.morningAbsentFine) || 0
          : null,

        morning_late_fine: draft.multiSession
          ? Number(draft.morningLateFine) || 0
          : null,

        afternoon_absent_fine: draft.multiSession
          ? Number(draft.afternoonAbsentFine) || 0
          : null,

        afternoon_late_fine: draft.multiSession
          ? Number(draft.afternoonLateFine) || 0
          : null,
      };

      const { data, error } = await supabase

        .from("events")

        .insert([payload])

        .select();

      if (error) {
        await deleteImages([
          ...photoUrls,

          ...videoNames,

          ...(persistedHighlightUrl ? [persistedHighlightUrl] : []),
        ]);

        setPhotoUrls([]);

        setVideoNames([]);

        setHighlightUrl(null);

        toast.error(`Failed to create event: ${error.message}`);

        console.error(error);

        return;
      }

      if (data && data.length > 0) {
        const row = data[0];

        const newEvent: EventData = {
          id: row.id,

          title: row.title,

          date: row.event_date,

          time:
            row.start_time && row.end_time
              ? `${row.start_time}–${row.end_time}`
              : "",

          location: row.location,

          description: row.description,

          program: row.program || "All Programs",

          status: (row.status as any) || "upcoming",

          attendees: 0,

          version: 1,

          fineAmount: draft.multiSession
            ? (parseInt(draft.morningAbsentFine) || 0) +
              (parseInt(draft.afternoonAbsentFine) || 0)
            : parseInt(draft.absentFine) || 0,

          mediaUrls: [
            ...(persistedHighlightUrl ? [persistedHighlightUrl] : []),

            ...photoUrls,

            ...videoNames,
          ],

          highlightUrl: persistedHighlightUrl || undefined,

          multiSession: draft.multiSession,

          strictMorning: draft.strictMorning,

          strictAfternoon: draft.strictAfternoon,

          morningStart: draft.morningStart,

          morningEnd: draft.morningEnd,

          morningLateCutoff: draft.morningLateCutoff,

          afternoonStart: draft.afternoonStart,

          afternoonEnd: draft.afternoonEnd,

          afternoonLateCutoff: draft.afternoonLateCutoff,

          absentFine: parseInt(draft.absentFine) || 0,

          lateFine: parseInt(draft.lateFine) || 0,

          morningAbsentFine: parseInt(draft.morningAbsentFine) || 0,

          morningLateFine: parseInt(draft.morningLateFine) || 0,

          afternoonAbsentFine: parseInt(draft.afternoonAbsentFine) || 0,

          afternoonLateFine: parseInt(draft.afternoonLateFine) || 0,
        };

        setEvents((ev) => [newEvent, ...ev]);

        setDraft(EMPTY_DRAFT);

        setPhotoUrls([]);

        setVideoNames([]);

        setHighlightUrl(null);

        setMediaUploadState("idle");

        setMediaUploadError(null);

        setShowForm(false);

        toast.success("Event created successfully");
      }
    } catch (caughtError) {
      await deleteImages([
        ...photoUrls,

        ...videoNames,

        ...(highlightUrl && !highlightUrl.startsWith("blob:")
          ? [highlightUrl]
          : []),
      ]);

      setPhotoUrls([]);

      setVideoNames([]);

      setHighlightUrl(null);

      console.error(caughtError);

      toast.error("An error occurred while creating the event");
    } finally {
      setIsCreating(false);
    }
  };

  const startEdit = async (e: EventData) => {
    const { count, error } = await supabase

      .from("attendance_scans")

      .select("*", { count: "exact", head: true })

      .eq("event_id", e.id);

    setEventHasScans(!error && (count ?? 0) > 0);

    setEditId(e.id);

    setEditEventTab("basic");

    setEditDraft({ ...e });

    setEditOriginal({ ...e });

    setEditFineValues({
      absentFine: String(e.absentFine ?? e.fineAmount ?? 0),

      lateFine: String(e.lateFine ?? 0),

      morningAbsentFine: String(e.morningAbsentFine ?? 0),

      morningLateFine: String(e.morningLateFine ?? 0),

      afternoonAbsentFine: String(e.afternoonAbsentFine ?? 0),

      afternoonLateFine: String(e.afternoonLateFine ?? 0),
    });

    setShowSensitiveWarning(false);

    setShowForm(false);
  };

  const SENSITIVE_KEYS: (keyof EventData)[] = [
    "time",

    "fineAmount",

    "morningStart",

    "morningEnd",

    "morningLateCutoff",

    "strictMorning",

    "afternoonStart",

    "afternoonEnd",

    "afternoonLateCutoff",

    "strictAfternoon",

    "absentFine",

    "lateFine",

    "morningAbsentFine",

    "morningLateFine",

    "afternoonAbsentFine",

    "afternoonLateFine",
  ];

  const hasSensitiveChanges = () => {
    if (!editDraft || !editOriginal) return false;

    const eventFieldChanged = SENSITIVE_KEYS.some(
      (k) => String(editDraft[k] ?? "") !== String(editOriginal[k] ?? ""),
    );

    const fineChanged =
      editFineValues.absentFine !==
        String(editOriginal.absentFine ?? editOriginal.fineAmount ?? 0) ||
      editFineValues.lateFine !== String(editOriginal.lateFine ?? 0) ||
      editFineValues.morningAbsentFine !==
        String(editOriginal.morningAbsentFine ?? 0) ||
      editFineValues.morningLateFine !==
        String(editOriginal.morningLateFine ?? 0) ||
      editFineValues.afternoonAbsentFine !==
        String(editOriginal.afternoonAbsentFine ?? 0) ||
      editFineValues.afternoonLateFine !==
        String(editOriginal.afternoonLateFine ?? 0);

    return eventFieldChanged || fineChanged;
  };

  const commitSave = async () => {
    if (!editDraft) return;

    setShowSensitiveWarning(false);

    try {
      const timeRange = editDraft.multiSession
        ? null
        : parseEventTimeRange(editDraft.time);

      if (!editDraft.multiSession && !timeRange) {
        toast.error("Enter time like 3:35 AM - 5:20 AM.");

        return;
      }

      const persistedHighlightUrl =
        editDraft.highlightUrl && !editDraft.highlightUrl.startsWith("blob:")
          ? editDraft.highlightUrl
          : null;

      const nextGalleryUrls = (editDraft.mediaUrls ?? []).filter(
        (url) =>
          url !== editDraft.highlightUrl && url !== editOriginal?.highlightUrl,
      );

      const previousMediaUrls = [
        ...(editOriginal?.mediaUrls ?? []),

        ...(editOriginal?.highlightUrl ? [editOriginal.highlightUrl] : []),
      ];

      const current = events.find((e) => e.id === editDraft.id);

      if (
        current &&
        editOriginal &&
        (current.version ?? 1) !== (editOriginal.version ?? 1)
      ) {
        toast.error(
          "Another admin modified this event — please review and try again.",
        );

        setEditId(null);

        setEditDraft(null);

        setEditOriginal(null);

        setShowSensitiveWarning(false);

        return;
      }

      const payload = {
        title: editDraft.title,

        event_date: editDraft.date,

        start_time: timeRange?.start ?? null,

        end_time: timeRange?.end ?? null,

        location: editDraft.location,

        description: editDraft.description,

        program: editDraft.program,

        image_url: persistedHighlightUrl,

        media_urls: nextGalleryUrls,

        status: editDraft.status,

        multi_session: editDraft.multiSession,

        strict_morning: editDraft.strictMorning,

        strict_afternoon: editDraft.strictAfternoon,

        morning_start: editDraft.multiSession
          ? editDraft.morningStart || null
          : (timeRange?.start ?? null),

        morning_end: editDraft.multiSession
          ? editDraft.morningEnd || null
          : (timeRange?.end ?? null),

        morning_late_cutoff: editDraft.morningLateCutoff || null,

        afternoon_start: editDraft.afternoonStart || null,

        afternoon_end: editDraft.afternoonEnd || null,

        afternoon_late_cutoff: editDraft.afternoonLateCutoff || null,

        absent_fine: Number(editFineValues.absentFine) || 0,

        late_fine: Number(editFineValues.lateFine) || 0,

        morning_absent_fine: Number(editFineValues.morningAbsentFine) || 0,

        morning_late_fine: Number(editFineValues.morningLateFine) || 0,

        afternoon_absent_fine: Number(editFineValues.afternoonAbsentFine) || 0,

        afternoon_late_fine: Number(editFineValues.afternoonLateFine) || 0,

        version: (editOriginal?.version ?? 1) + 1,
      };

      const { error } = await supabase

        .from("events")

        .update(payload)

        .eq("id", editDraft.id);

      if (error) {
        toast.error(`Failed to update event: ${error.message}`);

        console.error(error);

        return;
      }

      await deleteImages(
        previousMediaUrls.filter(
          (url) =>
            url !== persistedHighlightUrl && !nextGalleryUrls.includes(url),
        ),
      );

      const saved: EventData = {
        ...editDraft,

        highlightUrl: persistedHighlightUrl || undefined,

        mediaUrls: [
          ...(persistedHighlightUrl ? [persistedHighlightUrl] : []),

          ...nextGalleryUrls,
        ],

        version: (editOriginal?.version ?? 1) + 1,

        fineAmount: editDraft.multiSession
          ? (Number(editFineValues.morningAbsentFine) || 0) +
            (Number(editFineValues.afternoonAbsentFine) || 0)
          : Number(editFineValues.absentFine) || 0,

        absentFine: Number(editFineValues.absentFine) || 0,

        lateFine: Number(editFineValues.lateFine) || 0,

        morningAbsentFine: Number(editFineValues.morningAbsentFine) || 0,

        morningLateFine: Number(editFineValues.morningLateFine) || 0,

        afternoonAbsentFine: Number(editFineValues.afternoonAbsentFine) || 0,

        afternoonLateFine: Number(editFineValues.afternoonLateFine) || 0,
      };

      setEvents((ev) => ev.map((e) => (e.id === saved.id ? saved : e)));

      setEditId(null);

      setEditDraft(null);

      setEditOriginal(null);

      setShowSensitiveWarning(false);

      toast.success("Event updated successfully");
    } catch (caughtError) {
      console.error(caughtError);

      toast.error("An error occurred while updating the event");
    }
  };

  const handleSaveEdit = () => {
    if (hasSensitiveChanges()) {
      setShowSensitiveWarning(true);

      return;
    }

    commitSave();
  };

  const deleteEvent = async (id: string) => {
    try {
      const event = events.find((item) => item.id === id);

      const mediaUrls = [
        ...(event?.mediaUrls ?? []),

        ...(event?.highlightUrl ? [event.highlightUrl] : []),
      ];

      const { error } = await supabase.from("events").delete().eq("id", id);

      if (error) {
        toast.error(`Failed to delete event: ${error.message}`);

        console.error(error);

        return;
      }

      setEvents((ev) => ev.filter((e) => e.id !== id));

      const cleanupResults = await deleteImages(mediaUrls);

      cleanupResults

        .filter((result) => !result.success)

        .forEach((result) =>
          console.error("Failed to delete event media", result.error),
        );

      toast.success("Event deleted successfully");
    } catch (caughtError) {
      console.error(caughtError);

      toast.error("An error occurred while deleting the event");
    }
  };

  const setStatus = async (id: string, status: EventStatus) => {
    try {
      const current = events.find((e) => e.id === id);

      if (!current) {
        toast.error("Event not found");

        return;
      }

      const payload = {
        status,

        version: (current.version ?? 1) + 1,
      };

      const { error } = await supabase

        .from("events")

        .update(payload)

        .eq("id", id);

      if (error) {
        toast.error(`Failed to update event status: ${error.message}`);

        console.error(error);

        return;
      }

      setEvents((ev) =>
        ev.map((e) =>
          e.id === id
            ? {
                ...e,
                status,
                version: (e.version ?? 1) + 1,
              }
            : e,
        ),
      );

      toast.success(`Event marked as ${status}`);
    } catch (caughtError) {
      console.error(caughtError);

      toast.error("An error occurred while updating event status");
    }
  };

  const statusOptions = (
    current: EventStatus,
  ): {
    status: EventStatus;
    label: string;
    icon: React.ReactNode;
  }[] =>
    [
      {
        status: "active" as EventStatus,

        label: "Mark as Live",

        icon: <Icons.Radio />,
      },

      {
        status: "upcoming" as EventStatus,

        label: "Mark as Upcoming",

        icon: <Icons.Calendar />,
      },

      {
        status: "closed" as EventStatus,

        label: "Mark as Closed",

        icon: <Icons.Check />,
      },
    ].filter((o) => o.status !== current);

  if (selectedEventId) {
    return (
      <EventDetailPageView
        event={events.find((event) => event.id === selectedEventId) ?? null}
        user={null}
        viewerRole="admin"
        showFees
        onClose={() => setSelectedEventId(null)}
        onPrimaryAction={() => {
          setSelectedEventId(null);
          onNav("admin-attendees");
        }}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Events"
        subtitle="AY 2026-2027, 1st Semester"
        action={
          <button
            onClick={() => {
              setShowForm(true);

              setActiveTab("basic");

              setEditId(null);

              setEditDraft(null);
            }}
            className="h-9 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <Icons.Plus />
            New event
          </button>
        }
      />

      {}
      {showForm && (
        <FormModal
          title="Create New Event"
          sidebar={
            <nav className="space-y-1" aria-label="Create event sections">
              {[
                [
                  "basic",
                  "Basic Details",
                  "Title, date, program, location, description",
                ],
                ["session", "Session & Timing", "Session mode, times, cutoffs"],
                ["fines", "Fines & Rules", "Attendance fine settings"],
                ["media", "Media & Assets", "Photos and event media"],
              ].map(([value, label, description]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActiveTab(value as CreateEventTab)}
                  className={`w-full rounded-xl px-3 py-3 text-left transition-colors ${
                    activeTab === value
                      ? "bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                  }`}
                >
                  <span className="block text-xs font-bold">{label}</span>
                  <span className="mt-1 block text-[10px] leading-relaxed text-slate-400">
                    {description}
                  </span>
                </button>
              ))}
            </nav>
          }
          onClose={() => {
            discardCreateMedia();

            setShowForm(false);
          }}
          footer={
            <>
              <button
                onClick={handleCreate}
                disabled={!draft.title || !draft.date || isCreating}
                className="flex-1 h-10 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-40"
              >
                {isCreating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Creating...
                  </span>
                ) : (
                  "Create event"
                )}
              </button>
              <button
                onClick={() => {
                  discardCreateMedia();

                  setShowForm(false);
                }}
                className="h-10 px-4 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
            </>
          }
        >
          {activeTab === "basic" && (
            <>
              <FieldInput
                label="Event title *"
                placeholder="e.g. Foundation Day Celebration"
                value={draft.title}
                onChange={setD("title")}
              />
              <div className="grid grid-cols-2 gap-3">
                <FieldInput
                  label="Date *"
                  type="date"
                  value={draft.date}
                  onChange={setD("date")}
                />
                <FieldSelect
                  label="Program"
                  value={draft.program}
                  onChange={setD("program")}
                >
                  <option>All Programs</option>
                  <option>BSIT / BSCS</option>
                  <option>BSIT</option>
                  <option>BSCS</option>
                  <option>BSBA</option>
                </FieldSelect>
              </div>
              <FieldInput
                label="Location"
                placeholder="e.g. Main Gymnasium"
                value={draft.location}
                onChange={setD("location")}
              />
              <FieldTextarea
                label="Description"
                placeholder="What is this event about?"
                rows={5}
                value={draft.description}
                onChange={setD("description")}
              />
            </>
          )}

          {}
          {activeTab === "session" && (
            <>
              <div className="border border-slate-100 rounded-xl px-3 divide-y divide-slate-50">
                <div className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      Multi-Session
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Split into Morning &amp; Afternoon sessions
                    </p>
                  </div>
                  <button
                    onClick={toggleD("multiSession")}
                    role="switch"
                    aria-checked={draft.multiSession}
                    className={`relative w-9 h-5 rounded-full transition-all duration-200 shrink-0 ${
                      draft.multiSession ? "bg-emerald-500" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`absolute top-[3px] left-[3px] w-[14px] h-[14px] bg-white rounded-full shadow-md transition-transform duration-200 ${
                        draft.multiSession ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {}
              {!draft.multiSession ? (
                <div className="space-y-2.5">
                  <FieldInput
                    label="Time"
                    placeholder="e.g. 8:00 AM – 5:00 PM"
                    value={draft.time}
                    onChange={setD("time")}
                  />
                  <FieldInput
                    label="Late cutoff time"
                    type="time"
                    value={draft.morningLateCutoff}
                    onChange={setD("morningLateCutoff")}
                  />
                  <InlineToggle
                    on={draft.strictMorning}
                    onToggle={toggleD("strictMorning")}
                    label="Strict attendance (require time-out scan)"
                  />
                </div>
              ) : (
                <div className="space-y-2.5">
                  <SessionFields
                    prefix="morning"
                    label="Morning"
                    start={draft.morningStart}
                    onStart={(v) =>
                      setDraft((d) => ({ ...d, morningStart: v }))
                    }
                    end={draft.morningEnd}
                    onEnd={(v) => setDraft((d) => ({ ...d, morningEnd: v }))}
                    cutoff={draft.morningLateCutoff}
                    onCutoff={(v) =>
                      setDraft((d) => ({ ...d, morningLateCutoff: v }))
                    }
                    strict={draft.strictMorning}
                    onStrict={toggleD("strictMorning")}
                  />
                  <SessionFields
                    prefix="afternoon"
                    label="Afternoon"
                    start={draft.afternoonStart}
                    onStart={(v) =>
                      setDraft((d) => ({ ...d, afternoonStart: v }))
                    }
                    end={draft.afternoonEnd}
                    onEnd={(v) => setDraft((d) => ({ ...d, afternoonEnd: v }))}
                    cutoff={draft.afternoonLateCutoff}
                    onCutoff={(v) =>
                      setDraft((d) => ({ ...d, afternoonLateCutoff: v }))
                    }
                    strict={draft.strictAfternoon}
                    onStrict={toggleD("strictAfternoon")}
                  />
                </div>
              )}
            </>
          )}

          {activeTab === "fines" && (
            <FineFields
              multi={draft.multiSession}
              values={draft}
              onChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))}
            />
          )}

          {}
          {activeTab === "media" && (
            <>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">
                  Highlight Photo
                </label>
                <input
                  ref={highlightRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];

                    if (!f) return;

                    setHighlightUploadState("uploading");

                    const result = await uploadImage(f);

                    if ("error" in result) {
                      setHighlightUploadState("error");

                      toast.error(result.error);

                      return;
                    }

                    setHighlightUploadState("idle");

                    setHighlightUrl(result.url);
                  }}
                />
                {highlightUploadState === "uploading" ? (
                  <Skeleton className="w-full h-36 rounded-xl" />
                ) : highlightUploadState === "error" ? (
                  <div className="w-full h-36 rounded-xl border border-red-200 bg-red-50 flex flex-col items-center justify-center gap-2">
                    <p className="text-sm font-semibold text-red-600">
                      Upload failed
                    </p>
                    <button
                      onClick={() => highlightRef.current?.click()}
                      className="text-xs font-semibold text-red-700 underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : highlightUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200">
                    <img
                      src={highlightUrl}
                      alt=""
                      className="w-full h-36 object-cover"
                    />
                    <button
                      onClick={() => {
                        if (highlightUrl) {
                          URL.revokeObjectURL(highlightUrl);
                        }

                        setHighlightUrl(null);
                      }}
                      className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"
                    >
                      <Icons.X />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => highlightRef.current?.click()}
                    className="w-full h-10 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-emerald-400 hover:text-emerald-500 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Icons.Image />
                    Upload highlight photo
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block">
                  Event media
                </label>
                <input
                  ref={photoRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    await uploadEventMedia(Array.from(e.target.files ?? []));

                    e.target.value = "";
                  }}
                />
                <input
                  ref={videoRef}
                  type="file"
                  accept="video/mp4,video/*"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    await uploadEventMedia(Array.from(e.target.files ?? []));

                    e.target.value = "";
                  }}
                />
                {mediaUploadState === "uploading" ? (
                  <Skeleton className="h-20 w-full rounded-xl" />
                ) : mediaUploadState === "error" ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-red-600 truncate">
                      {mediaUploadError || "Media upload failed."}
                    </p>
                    <button
                      onClick={() => photoRef.current?.click()}
                      className="text-xs font-semibold text-red-700 underline shrink-0"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => photoRef.current?.click()}
                      className="flex-1 h-10 border-2 border-dashed border-slate-200 rounded-xl text-xs font-semibold text-slate-400 hover:border-emerald-400 hover:text-emerald-500"
                    >
                      Add images
                    </button>
                    <button
                      onClick={() => videoRef.current?.click()}
                      className="flex-1 h-10 border-2 border-dashed border-slate-200 rounded-xl text-xs font-semibold text-slate-400 hover:border-emerald-400 hover:text-emerald-500"
                    >
                      Add MP4 video
                    </button>
                  </div>
                )}
                {(photoUrls.length > 0 || videoNames.length > 0) && (
                  <div className="space-y-1 text-xs text-slate-500">
                    {photoUrls.map((url) => (
                      <div key={url} className="flex items-center gap-2">
                        <img
                          src={url}
                          alt=""
                          className="h-10 w-14 rounded object-cover"
                        />
                        <span className="truncate">Uploaded image</span>
                      </div>
                    ))}
                    {videoNames.map((url) => (
                      <div key={url} className="flex items-center gap-2">
                        <video
                          src={url}
                          controls
                          className="h-10 w-14 rounded object-cover"
                        />
                        <span className="truncate">Uploaded MP4 video</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </FormModal>
      )}

      {}
      {editId && editDraft && (
        <FormModal
          title="Edit Event"
          sidebar={
            <nav className="space-y-1" aria-label="Edit event sections">
              {[
                [
                  "basic",
                  "Basic Details",
                  "Title, date, program, location, description",
                ],
                ["session", "Session & Timing", "Session mode, times, cutoffs"],
                ["fines", "Fines & Rules", "Attendance fine settings"],
                ["media", "Media & Assets", "Photos and event media"],
              ].map(([value, label, description]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setEditEventTab(value as CreateEventTab)}
                  className={`w-full rounded-xl px-3 py-3 text-left transition-colors ${
                    editEventTab === value
                      ? "bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                  }`}
                >
                  <span className="block text-xs font-bold">{label}</span>
                  <span className="mt-1 block text-[10px] leading-relaxed text-slate-400">
                    {description}
                  </span>
                </button>
              ))}
            </nav>
          }
          onClose={discardEditMedia}
          footer={
            showSensitiveWarning ? (
              <>
                <button
                  onClick={() => {
                    setShowSensitiveWarning(false);

                    void commitSave();
                  }}
                  className="flex-1 h-10 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg shadow-sm"
                >
                  Confirm &amp; save
                </button>
                <button
                  onClick={() => setShowSensitiveWarning(false)}
                  className="h-10 px-4 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50"
                >
                  Go back
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 h-10 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg shadow-sm"
                >
                  Save changes
                </button>
                <button
                  onClick={discardEditMedia}
                  className="h-10 px-4 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
              </>
            )
          }
        >
          {showSensitiveWarning && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 mb-1">
              <span className="text-amber-500 shrink-0 mt-0.5">
                <Icons.AlertCircle />
              </span>
              <p className="text-xs text-amber-800 leading-relaxed">
                You changed session times, late cutoffs, or fine amounts. These
                affect existing attendance records. Confirm to proceed.
              </p>
            </div>
          )}

          {editEventTab === "basic" && (
            <>
              <FieldInput
                label="Title"
                value={editDraft.title}
                onChange={(e) =>
                  setEditDraft((d) => (d ? { ...d, title: e.target.value } : d))
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <FieldInput
                  label="Date"
                  type="date"
                  value={editDraft.date}
                  onChange={(e) =>
                    setEditDraft((d) =>
                      d ? { ...d, date: e.target.value } : d,
                    )
                  }
                />
                <FieldSelect
                  label="Program"
                  value={editDraft.program}
                  onChange={(e) =>
                    setEditDraft((d) =>
                      d ? { ...d, program: e.target.value } : d,
                    )
                  }
                >
                  <option>All Programs</option>
                  <option>BSIT / BSCS</option>
                  <option>BSIT</option>
                  <option>BSCS</option>
                  <option>BSBA</option>
                </FieldSelect>
              </div>
              <FieldInput
                label="Location"
                value={editDraft.location}
                onChange={(e) =>
                  setEditDraft((d) =>
                    d ? { ...d, location: e.target.value } : d,
                  )
                }
              />
              <FieldTextarea
                label="Description"
                rows={4}
                value={editDraft.description}
                onChange={(e) =>
                  setEditDraft((d) =>
                    d ? { ...d, description: e.target.value } : d,
                  )
                }
              />
            </>
          )}

          {editEventTab === "session" && (
            <>
              <div className="border border-slate-100 rounded-xl px-3 divide-y divide-slate-50">
                <div className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      Multi-Session
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Split into Morning &amp; Afternoon sessions
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (eventHasScans) return;

                      setEditDraft((d) =>
                        d ? { ...d, multiSession: !d.multiSession } : d,
                      );
                    }}
                    role="switch"
                    aria-checked={!!editDraft.multiSession}
                    disabled={eventHasScans}
                    className={`relative w-9 h-5 rounded-full transition-all duration-200 shrink-0 ${
                      eventHasScans ? "cursor-not-allowed opacity-50" : ""
                    } ${editDraft.multiSession ? "bg-emerald-500" : "bg-slate-200"}`}
                  >
                    <span
                      className={`absolute top-[3px] left-[3px] w-[14px] h-[14px] bg-white rounded-full shadow-md transition-transform duration-200 ${
                        editDraft.multiSession
                          ? "translate-x-4"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                {eventHasScans && (
                  <p className="px-1 pb-2 text-[10px] text-amber-700">
                    Can't change session mode — this event already has recorded
                    attendance.
                  </p>
                )}
              </div>

              {!editDraft.multiSession ? (
                <div className="space-y-2.5">
                  <FieldInput
                    label="Time"
                    value={editDraft.time}
                    onChange={(e) =>
                      setEditDraft((d) =>
                        d ? { ...d, time: e.target.value } : d,
                      )
                    }
                  />
                  <FieldInput
                    label="Late cutoff time"
                    type="time"
                    value={editDraft.morningLateCutoff ?? ""}
                    onChange={(e) =>
                      setEditDraft((d) =>
                        d ? { ...d, morningLateCutoff: e.target.value } : d,
                      )
                    }
                  />
                  <InlineToggle
                    on={!!editDraft.strictMorning}
                    onToggle={() =>
                      setEditDraft((d) =>
                        d ? { ...d, strictMorning: !d.strictMorning } : d,
                      )
                    }
                    label="Strict attendance (require time-out scan)"
                  />
                </div>
              ) : (
                <div className="space-y-2.5">
                  <SessionFields
                    prefix="em"
                    label="Morning"
                    start={editDraft.morningStart ?? ""}
                    onStart={(v) =>
                      setEditDraft((d) => (d ? { ...d, morningStart: v } : d))
                    }
                    end={editDraft.morningEnd ?? ""}
                    onEnd={(v) =>
                      setEditDraft((d) => (d ? { ...d, morningEnd: v } : d))
                    }
                    cutoff={editDraft.morningLateCutoff ?? ""}
                    onCutoff={(v) =>
                      setEditDraft((d) =>
                        d ? { ...d, morningLateCutoff: v } : d,
                      )
                    }
                    strict={!!editDraft.strictMorning}
                    onStrict={() =>
                      setEditDraft((d) =>
                        d ? { ...d, strictMorning: !d.strictMorning } : d,
                      )
                    }
                  />
                  <SessionFields
                    prefix="ea"
                    label="Afternoon"
                    start={editDraft.afternoonStart ?? ""}
                    onStart={(v) =>
                      setEditDraft((d) => (d ? { ...d, afternoonStart: v } : d))
                    }
                    end={editDraft.afternoonEnd ?? ""}
                    onEnd={(v) =>
                      setEditDraft((d) => (d ? { ...d, afternoonEnd: v } : d))
                    }
                    cutoff={editDraft.afternoonLateCutoff ?? ""}
                    onCutoff={(v) =>
                      setEditDraft((d) =>
                        d ? { ...d, afternoonLateCutoff: v } : d,
                      )
                    }
                    strict={!!editDraft.strictAfternoon}
                    onStrict={() =>
                      setEditDraft((d) =>
                        d ? { ...d, strictAfternoon: !d.strictAfternoon } : d,
                      )
                    }
                  />
                </div>
              )}
            </>
          )}

          {editEventTab === "fines" && (
            <FineFields
              multi={!!editDraft.multiSession}
              values={editFineValues}
              onChange={(key, value) =>
                setEditFineValues((current) => ({
                  ...current,

                  [key]: value,
                }))
              }
            />
          )}

          {editEventTab === "media" && (
            <>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">
                  Highlight Photo
                </label>
                <input
                  ref={editHighlightRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];

                    if (!f) return;

                    setEditHighlightUploadState("uploading");

                    const result = await uploadImage(f);

                    if ("error" in result) {
                      setEditHighlightUploadState("error");

                      toast.error(result.error);

                      return;
                    }

                    setEditHighlightUploadState("idle");

                    setEditDraft((d) =>
                      d ? { ...d, highlightUrl: result.url } : d,
                    );
                  }}
                />
                {editHighlightUploadState === "uploading" ? (
                  <Skeleton className="w-full h-36 rounded-xl" />
                ) : editHighlightUploadState === "error" ? (
                  <div className="w-full h-36 rounded-xl border border-red-200 bg-red-50 flex flex-col items-center justify-center gap-2">
                    <p className="text-sm font-semibold text-red-600">
                      Upload failed
                    </p>
                    <button
                      onClick={() => editHighlightRef.current?.click()}
                      className="text-xs font-semibold text-red-700 underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : editDraft.highlightUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200">
                    <img
                      src={editDraft.highlightUrl}
                      alt=""
                      className="w-full h-36 object-cover"
                    />
                    <button
                      onClick={() =>
                        setEditDraft((d) =>
                          d ? { ...d, highlightUrl: undefined } : d,
                        )
                      }
                      className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"
                    >
                      <Icons.X />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => editHighlightRef.current?.click()}
                    className="w-full h-10 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-emerald-400 hover:text-emerald-500 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Icons.Image />
                    Upload highlight photo
                  </button>
                )}
              </div>
            </>
          )}
        </FormModal>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {events.map((e) => (
          <div
            key={e.id}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden h-full"
            onClick={() => setSelectedEventId(e.id)}
          >
            <div className="relative w-full aspect-[4/3] bg-slate-50 overflow-hidden">
              {e.highlightUrl ? (
                <img
                  src={e.highlightUrl}
                  alt={e.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                  <span className="text-sm font-semibold text-slate-400">
                    No media
                  </span>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/25 via-transparent to-slate-900/10" />

              <div className="absolute top-3 left-3 z-10">
                <Badge status={e.status} />
              </div>

              <div className="absolute top-3 right-3 z-10 flex items-center gap-2 max-w-[72%] justify-end">
                <div className="flex items-center gap-1.5 rounded-full border border-white/30 bg-slate-900/25 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm shadow-sm">
                  <span>{e.date}</span>
                </div>
                {e.fineAmount > 0 && (
                  <span className="rounded-full border border-red-200 bg-red-500/90 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm shadow-sm">
                    ₱{e.fineAmount} fine
                  </span>
                )}
                {e.multiSession && (
                  <span className="rounded-full border border-violet-200 bg-violet-500/90 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm shadow-sm">
                    2 sessions
                  </span>
                )}
                <div
                  className="rounded-full border border-white/30 bg-slate-900/25 p-1 text-white backdrop-blur-sm shadow-sm"
                  onClick={(event) => event.stopPropagation()}
                >
                  <DotMenu
                    items={[
                      ...statusOptions(e.status).map((o) => ({
                        label: o.label,

                        icon: o.icon,

                        onClick: () => setStatus(e.id, o.status),
                      })),

                      {
                        label: "Edit",

                        icon: <Icons.Edit />,

                        onClick: () => startEdit(e),
                      },

                      {
                        label: "Delete",

                        icon: <Icons.Trash />,

                        danger: true,

                        onClick: () => deleteEvent(e.id),
                      },
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="p-5 flex flex-col flex-1 justify-between gap-3">
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-base line-clamp-1">
                  {e.title}
                </h3>
                <div className="text-xs text-slate-500 flex flex-col gap-1">
                  <span className="flex items-center gap-1.5">
                    <Icons.MapPin />
                    {e.location || "TBA"}
                  </span>
                  {e.multiSession ? (
                    <>
                      <span className="flex items-center gap-1.5">
                        <Icons.Clock />
                        {e.morningStart && e.morningEnd
                          ? `${e.morningStart}–${e.morningEnd}`
                          : "Morning TBA"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Icons.Clock />
                        {e.afternoonStart && e.afternoonEnd
                          ? `${e.afternoonStart}–${e.afternoonEnd}`
                          : "Afternoon TBA"}
                      </span>
                    </>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Icons.Clock />
                      {e.time || "TBA"}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-50 flex items-center justify-between gap-2">
                {e.status === "active" && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onNav("admin-scanner");
                    }}
                    className="flex-1 h-9 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Icons.Scan />
                    Scanner
                  </button>
                )}
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onNav("admin-attendees");
                  }}
                  className={`h-9 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 hover:border-slate-300 flex items-center justify-center gap-1.5 ${
                    e.status === "active" ? "flex-1" : "w-full"
                  }`}
                >
                  <Icons.Users />
                  Attendees
                  {e.attendees > 0 ? ` (${e.attendees})` : ""}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function CameraScanner({
  event,

  scannerId,

  onResult,

  onClose,

  manualSessionLabel,
}: {
  event: EventData;

  scannerId: string | null;

  onResult: (r: ScanRecord) => void;

  onClose: () => void;

  manualSessionLabel: "morning" | "afternoon" | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const streamRef = useRef<MediaStream | null>(null);

  const animRef = useRef<number>(0);

  const scannedRef = useRef<boolean>(false);

  const [camError, setCamError] = useState<string | null>(null);

  const [scanError, setScanError] = useState<string | null>(null);

  const [result, setResult] = useState<ScanRecord | null>(null);

  const [torch, setTorch] = useState(false);

  const determineSessionLabel = () =>
    event.multiSession ? manualSessionLabel : "morning";

  const resolveQr = async (raw: string) => {
    if (scannedRef.current) return;

    scannedRef.current = true;

    setScanError(null);

    try {
      const qrMatch = raw.match(/^ADESSE:([^:]+)(?::v(\d+))?$/i);
      const studentId = qrMatch?.[1]?.trim() ?? "";
      const qrVersion = qrMatch?.[2] ? Number(qrMatch[2]) : null;

      if (!studentId || !scannerId) {
        throw new Error("This QR code is not a valid Adesse student code.");
      }

      const sessionMeta = event.multiSession
        ? {
            sessionLabel: manualSessionLabel,

            strict:
              manualSessionLabel === "morning"
                ? !!event.strictMorning
                : manualSessionLabel === "afternoon"
                  ? !!event.strictAfternoon
                  : false,
          }
        : getEventSessionMeta(event);

      const sessionLabel = sessionMeta.sessionLabel;

      if (!sessionLabel) {
        throw new Error("Please select a session before scanning.");
      }

      const { data: profile, error: profileError } = await supabase

        .from("profiles")

        .select(
          "id, student_id, qr_version, first_name, surname, program, section",
        )

        .eq("student_id", studentId)

        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        throw new Error(
          "Student profile not found. Ask the student to renew their QR code.",
        );
      }

      if (
        qrVersion !== null &&
        qrVersion !== Number(profile.qr_version ?? 1)
      ) {
        throw new Error("This QR code has expired. Ask the student to renew it.");
      }

      const now = new Date();

      const strictSession = sessionMeta.strict;

      const cutoffValue =
        sessionLabel === "morning"
          ? event.morningLateCutoff
          : event.afternoonLateCutoff;

      const cutoffMinutes = cutoffValue ? toMinutes(cutoffValue) : null;

      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      const isLateScan = cutoffMinutes !== null && nowMinutes > cutoffMinutes;

      const sessionEndValue =
        sessionLabel === "morning" ? event.morningEnd : event.afternoonEnd;
      const sessionEndMinutes = sessionEndValue
        ? toMinutes(sessionEndValue)
        : null;
      const canTimeOut =
        sessionEndMinutes !== null &&
        now.getHours() * 60 + now.getMinutes() >= sessionEndMinutes;
      const attendance = await recordAttendance({
        eventId: event.id,
        studentId: profile.id,
        sessionLabel,
        status: isLateScan ? "late" : "present",
        scannedBy: scannerId,
        strictSession,
        canTimeOut,
        now,
      });

      if (attendance.outcome === "error") {
        throw attendance.error;
      }

      if (
        attendance.outcome === "duplicate" &&
        attendance.reason === "unique_violation"
      ) {
        setScanError(
          "Attendance already recorded for this student and session.",
        );
        scannedRef.current = false;
        return;
      }
      const rec: ScanRecord = {
        name:
          `${profile.first_name ?? ""} ${profile.surname ?? ""}`.trim() ||
          "Student",
        id: profile.student_id,

        program: profile.program ?? "",

        section: profile.section ?? "",

        time: new Date(attendance.scannedAt).toLocaleTimeString("en-US", {
          hour: "2-digit",

          minute: "2-digit",
        }),

        status:
          attendance.status === "absent" ? "duplicate" : attendance.status,

        action: attendance.action,

        dbId: attendance.recordId,
      };

      setSweeping(true);

      setTimeout(() => {
        setResult(rec);

        onResult(rec);
      }, 700);
    } catch (caughtError) {
      console.error("Failed to record QR attendance", caughtError);

      setScanError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to record attendance. Please try again.",
      );

      scannedRef.current = false;
    }
  };

  useEffect(() => {
    let active = true;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },

            width: { ideal: 1280 },

            height: { ideal: 720 },
          },
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());

          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          await videoRef.current.play();
        }

        tickRef.current = () => {
          if (!active || scannedRef.current) return;

          const video = videoRef.current;

          const canvas = canvasRef.current;

          if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
            const { videoWidth: w, videoHeight: h } = video;

            canvas.width = w;

            canvas.height = h;

            const ctx = canvas.getContext("2d", { willReadFrequently: true });

            if (ctx) {
              ctx.drawImage(video, 0, 0, w, h);

              const imageData = ctx.getImageData(0, 0, w, h);

              const code = jsQR(imageData.data, w, h, {
                inversionAttempts: "dontInvert",
              });

              if (code?.data) {
                resolveQr(code.data);

                return;
              }
            }
          }

          animRef.current = requestAnimationFrame(tickRef.current);
        };

        animRef.current = requestAnimationFrame(tickRef.current);
      } catch {
        if (active)
          setCamError(
            "Camera access denied. Please allow camera permission and try again.",
          );
      }
    }

    start();

    return () => {
      active = false;

      cancelAnimationFrame(animRef.current);

      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];

    if (!track) return;

    try {
      await (
        track as MediaStreamTrack & {
          applyConstraints: (c: object) => Promise<void>;
        }
      ).applyConstraints({
        advanced: [{ torch: !torch } as MediaTrackConstraintSet],
      });

      setTorch((t) => !t);
    } catch {}
  };

  const [sweeping, setSweeping] = useState(false);

  const tickRef = useRef<() => void>(() => {});

  const scanAgain = () => {
    scannedRef.current = false;

    setSweeping(false);

    setResult(null);

    setScanError(null);

    animRef.current = requestAnimationFrame(tickRef.current);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {}
      <div
        className="relative z-10 flex items-center justify-between px-4 pt-safe"
        style={{
          paddingTop: "max(16px, env(safe-area-inset-top))",

          paddingBottom: "16px",

          background:
            "linear-gradient(to bottom, rgba(0,0,0,.7) 0%, transparent 100%)",
        }}
      >
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
        >
          <Icons.ChevronLeft />
          <span className="text-sm font-semibold">Back</span>
        </button>
        <div className="text-center">
          <p className="text-white text-sm font-semibold leading-tight truncate max-w-[180px]">
            {event.title}
          </p>
          <p className="text-white/50 text-xs mt-0.5">{event.date}</p>
        </div>
        <button
          onClick={toggleTorch}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
            torch ? "bg-yellow-400 text-slate-900" : "bg-white/15 text-white"
          }`}
          title="Toggle flash"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-[18px] h-[18px]"
            fill="currentColor"
          >
            <path d="M7 2v11h3v9l7-12h-4l4-8z" />
          </svg>
        </button>
      </div>

      {}
      <div className="flex-1 relative overflow-hidden">
        {}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        {}
        <canvas ref={canvasRef} className="hidden" />

        {}
        {!result && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 60% 60% at 50% 50%, transparent 0%, rgba(0,0,0,.55) 100%)",
              }}
            />
            {}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72">
              {}
              <div
                className={`absolute inset-x-0 h-[2px] rounded-full ${
                  sweeping ? "scan-sweep" : ""
                }`}
                style={{
                  top: sweeping ? "8%" : "50%",

                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(74,222,128,0.9) 20%, #34d399 50%, rgba(74,222,128,0.9) 80%, transparent 100%)",

                  boxShadow: "0 0 10px 2px rgba(74,222,128,0.55)",

                  opacity: sweeping ? 1 : 0.6,

                  transition: sweeping ? "none" : "opacity 0.3s",
                }}
              />
              {}
              {[
                "top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-lg",

                "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-lg",

                "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-lg",

                "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-lg",
              ].map((cls, i) => (
                <div
                  key={i}
                  className={`absolute w-8 h-8 border-emerald-400 ${cls}`}
                />
              ))}
            </div>
            {!camError && (
              <p className="absolute bottom-12 text-white/60 text-xs font-medium tracking-wide">
                Point camera at student's QR code
              </p>
            )}
          </div>
        )}

        {}
        {(camError || scanError) && !result && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/90 text-center px-8">
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white/50">
              <Icons.AlertCircle />
            </div>
            <p className="text-white font-semibold">{camError ?? scanError}</p>
            <p className="text-white/50 text-sm">
              {camError
                ? "Ensure camera permissions are allowed in your browser settings."
                : "Check the student QR code and try again."}
            </p>
            {scanError && !camError && (
              <button
                onClick={scanAgain}
                className="h-10 px-4 bg-white text-slate-900 text-sm font-semibold rounded-xl"
              >
                Scan again
              </button>
            )}
          </div>
        )}

        {}
        {result && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 px-8 gap-4">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl ${
                result.action === "time_out"
                  ? "bg-blue-500"
                  : result.status === "duplicate"
                    ? "bg-slate-500"
                    : result.status === "late"
                      ? "bg-amber-500"
                      : "bg-emerald-500"
              }`}
            >
              {result.action === "time_out" ? (
                <svg
                  viewBox="0 0 24 24"
                  className="w-9 h-9"
                  fill="none"
                  stroke="white"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 12h12" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              ) : result.status === "duplicate" ? (
                <svg
                  viewBox="0 0 24 24"
                  className="w-9 h-9"
                  fill="none"
                  stroke="white"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : result.status === "late" ? (
                <svg
                  viewBox="0 0 24 24"
                  className="w-9 h-9"
                  fill="none"
                  stroke="white"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 8v4l3 2" />
                  <circle cx="12" cy="12" r="8" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="w-9 h-9"
                  fill="none"
                  stroke="white"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <div className="text-center">
              <p
                className={`text-lg font-bold ${
                  result.action === "time_out"
                    ? "text-blue-400"
                    : result.status === "duplicate"
                      ? "text-slate-300"
                      : result.status === "late"
                        ? "text-amber-400"
                        : "text-emerald-400"
                }`}
              >
                {result.action === "time_in" && result.status === "late"
                  ? "Time-in Recorded — Late"
                  : result.action === "time_in"
                    ? "Time-in Recorded"
                    : result.action === "time_out_rejected"
                      ? "Rejected: QR already scanned, wait for time-out."
                      : result.action === "time_out"
                        ? "Time-out Recorded"
                        : "Already Scanned for This Session"}
              </p>
              <p className="text-white text-base font-semibold mt-1">
                {result.name}
              </p>
              <p className="text-white/60 text-sm mt-0.5">
                {result.id} · {result.program} · {result.section}
              </p>
            </div>
            <div className="flex gap-3 mt-2">
              <button
                onClick={scanAgain}
                className="h-11 px-6 bg-white text-slate-900 text-sm font-semibold rounded-xl hover:bg-slate-100 transition-colors"
              >
                Scan next
              </button>
              <button
                onClick={onClose}
                className="h-11 px-6 bg-white/15 text-white text-sm font-semibold rounded-xl hover:bg-white/25 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {}
      {!result && !camError && (
        <div
          className="relative z-10 px-6 flex flex-col gap-2 items-center"
          style={{
            paddingBottom: "max(24px, env(safe-area-inset-bottom))",

            paddingTop: "16px",

            background:
              "linear-gradient(to top, rgba(0,0,0,.75) 0%, transparent 100%)",
          }}
        >
          <p className="text-white/50 text-xs text-center">
            Camera active · Scanning automatically
          </p>
        </div>
      )}
    </div>
  );
}

export function AdminScannerPage({
  events = [],

  scannerId,
}: {
  events?: EventData[];

  scannerId: string | null;
}) {
  const [selectedEventId, setSelectedEventId] = useState<string>(
    events[0]?.id ?? "",
  );

  const [scannerOpen, setScannerOpen] = useState(false);

  const [scanned, setScanned] = useState<ScanRecord[]>([]);

  const [manualSessionLabel, setManualSessionLabel] = useState<
    "morning" | "afternoon" | null
  >(null);

  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    if (!events.some((event) => event.id === selectedEventId) && events[0]) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  useEffect(() => {
    const nextEvent = events.find((event) => event.id === selectedEventId);

    if (!nextEvent) {
      setManualSessionLabel(null);

      return;
    }

    if (!nextEvent.multiSession) {
      setManualSessionLabel(null);

      return;
    }

    const defaultSession =
      getEventSessionMeta(nextEvent).sessionLabel ?? "morning";

    setManualSessionLabel(defaultSession);
  }, [selectedEventId, events]);

  const activeEvents = events.filter(
    (e) => e.status === "active" || e.status === "upcoming",
  );

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  const primaryMedia =
    selectedEvent?.highlightUrl ?? selectedEvent?.mediaUrls?.[0];

  useEffect(() => {
    setImageLoading(Boolean(primaryMedia));
  }, [selectedEventId, primaryMedia]);

  const canScanSelectedEvent = selectedEvent?.status === "active";

  const selectedSessionMeta = getSelectedSessionMeta(
    selectedEvent,

    manualSessionLabel,
  );

  const handleResult = (r: ScanRecord) => {
    setScanned((prev) => [
      {
        ...r,

        time: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",

          minute: "2-digit",
        }),
      },

      ...prev,
    ]);
  };

  if (scannerOpen && selectedEvent) {
    return (
      <CameraScanner
        event={selectedEvent}
        scannerId={scannerId}
        onResult={handleResult}
        onClose={() => setScannerOpen(false)}
        manualSessionLabel={manualSessionLabel}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="QR Scanner"
        subtitle="Select an event to begin scanning."
      />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full max-w-7xl mx-auto">
        {}
        <div className="lg:col-span-3 bg-white border border-slate-100 rounded-2xl overflow-hidden max-h-[80vh] overflow-y-auto">
          <div className="px-5 py-3.5 border-b border-slate-50 sticky top-0 bg-white z-10">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Select event
            </p>
          </div>
          <div className="p-3 space-y-1">
            {activeEvents.length === 0 && (
              <p className="px-3 py-4 text-sm text-slate-400 text-center">
                No active or upcoming events.
              </p>
            )}
            {activeEvents.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelectedEventId(e.id)}
                className={`w-full text-left px-4 py-3.5 rounded-xl transition-all flex items-center gap-4 ${
                  selectedEventId === e.id
                    ? "bg-emerald-50 ring-1 ring-emerald-200"
                    : "hover:bg-slate-50"
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    e.status === "active" ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                  style={
                    e.status === "active"
                      ? { animation: "pulse 2s infinite" }
                      : {}
                  }
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold truncate ${
                      selectedEventId === e.id
                        ? "text-emerald-800"
                        : "text-slate-900"
                    }`}
                  >
                    {e.title}
                  </p>
                  <p
                    className={`text-xs mt-0.5 ${
                      selectedEventId === e.id
                        ? "text-emerald-500"
                        : "text-slate-400"
                    }`}
                  >
                    {e.date} · {e.location}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {e.status === "active" && <Badge status="active" />}
                  {selectedEventId === e.id && (
                    <span className="text-emerald-500">
                      <Icons.Check />
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5">
          {selectedEvent ? (
            <div className="space-y-4">
              <div className="relative w-full aspect-[16/9] sm:aspect-[4/3] rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 shadow-sm">
                {primaryMedia ? (
                  <>
                    {imageLoading && (
                      <Skeleton className="absolute inset-0 w-full h-full rounded-2xl" />
                    )}
                    <img
                      src={primaryMedia}
                      alt={`${selectedEvent.title} cover`}
                      className={`w-full h-full object-cover transition-opacity duration-300 ${
                        imageLoading ? "opacity-0" : "opacity-100"
                      }`}
                      onLoad={() => setImageLoading(false)}
                      onError={() => setImageLoading(false)}
                    />
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-400 text-xs font-medium">
                    No cover media
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl px-5 py-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-500 shrink-0">
                    <Icons.Scan />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-bold text-slate-900">
                      {selectedEvent.title}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      {selectedEvent.date} · {selectedEvent.location}
                    </p>
                  </div>
                </div>
              </div>

              {selectedEvent.multiSession && (
                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Session
                  </p>
                  <div className="mt-2 flex gap-2">
                    {(["morning", "afternoon"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setManualSessionLabel(option)}
                        className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-all ${
                          manualSessionLabel === option
                            ? "bg-emerald-500 text-white shadow-sm"
                            : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {option === "morning" ? "Morning" : "Afternoon"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                {selectedEvent.multiSession &&
                selectedSessionMeta.sessionLabel ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {selectedSessionMeta.sessionLabel === "morning"
                      ? "Morning Session Selected"
                      : "Afternoon Session Selected"}
                  </span>
                ) : !selectedEvent.multiSession ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Morning Session Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                    No active session right now for this event
                  </span>
                )}

                {selectedSessionMeta.sessionLabel &&
                  selectedSessionMeta.strict && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200">
                      Strict Mode: Time-in + Time-out required
                    </span>
                  )}
              </div>

              {!canScanSelectedEvent && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left">
                  <p className="text-[11px] font-semibold text-amber-800">
                    Scanning is only available while this event is live.
                  </p>
                </div>
              )}

              <button
                onClick={() => canScanSelectedEvent && setScannerOpen(true)}
                disabled={!canScanSelectedEvent}
                className={`w-full h-14 text-white text-base font-bold rounded-2xl flex items-center justify-center gap-3 transition-all shadow-md ${
                  canScanSelectedEvent
                    ? "bg-emerald-500 hover:bg-emerald-600 active:scale-[.99] shadow-emerald-800/20"
                    : "bg-slate-300 cursor-not-allowed shadow-slate-300/20"
                }`}
              >
                <Icons.Scan />
                Open QR Scanner
              </button>
            </div>
          ) : (
            <div className="bg-slate-100 rounded-2xl px-5 py-10 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-slate-300">
                <Icons.Scan />
              </div>
              <p className="text-slate-500 text-sm font-medium">
                Select an event above to open the scanner
              </p>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-4">
          {selectedEvent && (
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-50">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Event info & rules
                </p>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {selectedEvent.title}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedEvent.status === "active"
                      ? "Live now"
                      : "Upcoming"}
                  </p>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-slate-400">Date</span>
                    <span className="font-semibold text-slate-700 text-right">
                      {selectedEvent.date}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-slate-400">Location</span>
                    <span className="font-semibold text-slate-700 text-right">
                      {selectedEvent.location}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-slate-400">Schedule</span>
                    <span className="font-semibold text-slate-700 text-right">
                      {selectedEvent.time}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-slate-400">Attendance rule</span>
                    <span className="font-semibold text-slate-700 text-right">
                      {selectedSessionMeta.strict
                        ? "Time-in + Time-out"
                        : "Standard scan"}
                    </span>
                  </div>
                  {selectedEvent.fineAmount > 0 && (
                    <div className="flex items-start justify-between gap-4 border-t border-slate-100 pt-3">
                      <span className="text-slate-400">Late/absence fine</span>
                      <span className="font-bold text-red-500">
                        ₱{selectedEvent.fineAmount}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-50 flex items-center justify-between">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                Scanned this session
              </p>
              <span className="text-[11px] font-bold text-emerald-500">
                {scanned.length}
              </span>
            </div>
            {scanned.length > 0 ? (
              scanned.slice(0, 8).map((s, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-5 py-3.5 ${
                    i < Math.min(scanned.length, 8) - 1
                      ? "border-b border-slate-50"
                      : ""
                  }`}
                >
                  <Avatar name={s.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {s.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {s.id} · {s.time}
                    </p>
                  </div>
                  <Badge status={s.status} />
                </div>
              ))
            ) : (
              <p className="px-5 py-6 text-sm text-slate-400 text-center">
                No scans recorded yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export function AdminAttendeesPage({
  onNav,

  events = [],

  students = [],

  scanState: initialScanState,

  onDeleteAttendance,
}: {
  onNav: (p: Page) => void;

  events?: EventData[];

  students?: StudentProfile[];

  scanState?: Record<string, ScanRecord[]>;

  onDeleteAttendance?: (dbId: string | number) => Promise<boolean>;
}) {
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? "");

  const [scanState, setScanState] = useState<Record<string, ScanRecord[]>>(
    initialScanState ?? {},
  );

  const [tab, setTab] = useState<"present" | "absent">("present");

  useEffect(() => {
    if (initialScanState) {
      setScanState(initialScanState);
    }
  }, [initialScanState]);

  useEffect(() => {
    if (!events.some((event) => event.id === selectedEventId) && events[0]) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  const selectedEvent =
    events.find((e) => e.id === selectedEventId) ?? events[0] ?? null;

  const scans = selectedEvent ? (scanState[selectedEvent.id] ?? []) : [];

  const confirmed = scans.filter(
    (s) =>
      s.status === "present" || s.status === "confirmed" || s.status === "late",
  );

  const duplicates = scans.filter((s) => s.status === "duplicate");

  const attendedIds = new Set(confirmed.map((s) => s.id));

  const eligibleStudents = students.filter(
    (student) =>
      !selectedEvent?.program ||
      selectedEvent.program === "All Programs" ||
      student.program === selectedEvent.program,
  );
  const absentees = eligibleStudents.filter((s) => !attendedIds.has(s.id));

  const deleteRecord = async (dbId: string | number) => {
    if (onDeleteAttendance && !(await onDeleteAttendance(dbId))) {
      return;
    }

    setScanState((st) => ({
      ...st,

      [selectedEventId]: (st[selectedEventId] ?? []).filter(
        (r) => r.dbId !== dbId,
      ),
    }));
  };

  const exportAttendance = () => {
    if (!selectedEvent) return;

    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;

    const rows = scans.map((scan) =>
      [scan.name, scan.id, scan.program, scan.section, scan.time, scan.status]

        .map((value) => escapeCsv(String(value ?? "")))

        .join(","),
    );

    const csv = [
      ["Student", "Student ID", "Program", "Section", "Time", "Status"]

        .map(escapeCsv)

        .join(","),

      ...rows,
    ].join("\n");

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );

    const link = document.createElement("a");

    link.href = url;

    link.download = `${selectedEvent.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-attendees.csv`;

    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <>
      <BackButton
        onClick={() => onNav("admin-events")}
        label="Back to Events"
      />
      <PageHeader
        title="Attendees"
        action={
          <button
            onClick={exportAttendance}
            disabled={!selectedEvent || scans.length === 0}
            className="h-9 px-3.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Icons.Download />
            Export
          </button>
        }
      />
      <div className="mb-5">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
          Event
        </label>
        <select
          value={selectedEventId}
          onChange={(e) => {
            setSelectedEventId(e.target.value);

            setTab("present");
          }}
          className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 font-medium outline-none focus:border-emerald-500 appearance-none"
        >
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title} · {e.date}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-slate-400 font-medium mb-4">
        {selectedEvent
          ? `${selectedEvent.location} · ${selectedEvent.time}`
          : "No event selected"}
      </p>
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => setTab("present")}
          className={`flex-1 h-9 rounded-lg text-xs font-semibold transition-all ${
            tab === "present"
              ? "bg-white shadow-sm text-slate-900"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Present ({confirmed.length})
        </button>
        <button
          onClick={() => setTab("absent")}
          className={`flex-1 h-9 rounded-lg text-xs font-semibold transition-all ${
            tab === "absent"
              ? "bg-white shadow-sm text-slate-900"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Absent ({absentees.length})
          {selectedEvent && selectedEvent.fineAmount > 0 && (
            <span className="text-red-500 ml-1">
              · P{selectedEvent.fineAmount}
            </span>
          )}
        </button>
      </div>
      {!selectedEvent ? (
        <div className="bg-white border border-slate-100 rounded-xl px-5 py-10 text-center">
          <p className="text-slate-400 text-sm font-medium">
            No events available yet.
          </p>
        </div>
      ) : tab === "present" ? (
        <>
          {confirmed.length === 0 ? (
            <div className="w-full bg-white border border-slate-100 rounded-xl px-3.5 py-10 text-center md:px-6">
              <p className="text-slate-400 text-sm font-medium">
                No scans recorded for this event yet.
              </p>
            </div>
          ) : (
            <div className="mb-4 w-full overflow-hidden rounded-xl border border-slate-100 bg-white">
              <div className="hidden md:grid px-5 py-3 bg-slate-50 border-b border-slate-100 grid-cols-12 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span className="col-span-5">Student</span>
                <span className="col-span-3">Program</span>
                <span className="col-span-2">Time</span>
                <span className="col-span-2 text-right">Status</span>
              </div>
              {confirmed.map((s, i) => (
                <div
                  key={s.dbId}
                  className={`${
                    i < confirmed.length - 1 ? "border-b border-slate-50" : ""
                  }`}
                >
                  <div className="block w-full px-3.5 py-3 md:hidden">
                    <div className="flex items-center justify-between gap-3">
                      <Avatar name={s.name} photoUrl={s.photoUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {s.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {s.id} • {s.program} • {s.time}
                        </p>
                      </div>
                      <div className="flex shrink-0">
                        <Badge status={s.status} />
                      </div>
                    </div>
                  </div>
                  <div className="hidden md:grid px-5 py-3.5 md:grid-cols-12 md:items-center">
                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                      <Avatar name={s.name} photoUrl={s.photoUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {s.name}
                        </p>
                        <p className="text-[11px] text-slate-400">{s.id}</p>
                      </div>
                    </div>
                    <span className="col-span-3 text-xs text-slate-500">
                      {s.program}
                    </span>
                    <span className="col-span-2 text-xs text-slate-500">
                      {s.time}
                    </span>
                    <div className="col-span-2 flex justify-end">
                      <Badge status={s.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {duplicates.length > 0 && (
            <>
              <SectionLabel>Duplicate scans — tap trash to remove</SectionLabel>
              <div className="w-full overflow-hidden rounded-xl border border-red-100 bg-white">
                {duplicates.map((s, i) => (
                  <div
                    key={s.dbId}
                    className={`${
                      i < duplicates.length - 1
                        ? "border-b border-slate-50"
                        : ""
                    }`}
                  >
                    <div className="block px-3.5 py-3 md:hidden">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.name} photoUrl={s.photoUrl} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {s.name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            {s.id} · scanned {s.time}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge status={s.status} />
                          <button
                            onClick={() => void deleteRecord(s.dbId)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <Icons.Trash />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="hidden items-center gap-3 px-5 py-3.5 md:flex">
                      <Avatar name={s.name} photoUrl={s.photoUrl} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {s.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {s.id} · scanned {s.time}
                        </p>
                      </div>
                      <Badge status={s.status} />
                      <button
                        onClick={() => void deleteRecord(s.dbId)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Icons.Trash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {selectedEvent.fineAmount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
              <Icons.AlertCircle />
              <p className="text-sm text-red-700">
                Each absentee is automatically fined{" "}
                <span className="font-bold">₱{selectedEvent.fineAmount}</span>.
              </p>
            </div>
          )}
          {absentees.length === 0 ? (
            <div className="w-full bg-white border border-slate-100 rounded-xl px-3.5 py-10 text-center md:px-6">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-3 text-emerald-500">
                <Icons.CheckCircle />
              </div>
              <p className="font-semibold text-slate-900 text-sm">
                Full attendance
              </p>
              <p className="text-xs text-slate-400 mt-1">
                All enrolled students have been scanned.
              </p>
            </div>
          ) : (
            <div className="w-full overflow-hidden rounded-xl border border-slate-100 bg-white">
              <div className="hidden md:grid px-5 py-3 bg-slate-50 border-b border-slate-100 grid-cols-12 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span className="col-span-5">Student</span>
                <span className="col-span-4">Program</span>
                <span className="col-span-3 text-right">Fee</span>
              </div>
              {absentees.map((s, i) => (
                <div
                  key={s.id}
                  className={`${
                    i < absentees.length - 1 ? "border-b border-slate-50" : ""
                  }`}
                >
                  <div className="block w-full px-3.5 py-3 md:hidden">
                    <div className="flex items-center justify-between gap-3">
                      <Avatar name={s.name} photoUrl={s.photoUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {s.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {s.id} • {s.program} • {s.section}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        {selectedEvent.fineAmount > 0 ? (
                          <span className="text-sm font-bold text-red-600">
                            ₱{selectedEvent.fineAmount}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="hidden md:grid px-5 py-3.5 md:grid-cols-12 md:items-center">
                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                      <Avatar name={s.name} photoUrl={s.photoUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {s.name}
                        </p>
                        <p className="text-[11px] text-slate-400">{s.id}</p>
                      </div>
                    </div>
                    <span className="col-span-4 text-xs text-slate-500">
                      {s.program} · {s.section}
                    </span>
                    <div className="col-span-3 flex justify-end">
                      {selectedEvent.fineAmount > 0 ? (
                        <span className="text-sm font-bold text-red-600">
                          ₱{selectedEvent.fineAmount}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

export function AdminStudentsPage({
  students = [],
  events = [],
  authUserId,
}: {
  students?: StudentProfile[];
  events?: EventData[];
  authUserId?: string | null;
}) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [bulkSelectionEnabled, setBulkSelectionEnabled] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id ?? "");
  const [sessionLabel, setSessionLabel] = useState<"morning" | "afternoon">(
    "morning",
  );
  const [existingStudentIds, setExistingStudentIds] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isMarking, setIsMarking] = useState(false);

  const filtered = students.filter((s) => {
    const q = query.toLowerCase();

    return (
      s.name.toLowerCase().includes(q) ||
      s.id.includes(q) ||
      s.program.toLowerCase().includes(q) ||
      s.section.toLowerCase().includes(q)
    );
  });

  const selectedEvent = events.find((event) => event.id === selectedEventId);
  const visibleIds = filtered.map((student) => student.profileId ?? student.id);
  const allVisibleSelected =
    visibleIds.length > 0 &&
    visibleIds.every((id) => selectedStudentIds.has(id));
  const suggestedSessionLabel = selectedEvent
    ? getEventSessionMeta(selectedEvent).sessionLabel
    : null;
  const sessionMismatch =
    selectedEvent?.multiSession &&
    suggestedSessionLabel !== null &&
    suggestedSessionLabel !== sessionLabel;

  const openStudent = (student: StudentProfile) => {
    const targetId = student.profileId ?? student.id;

    router.push(`/admin-students/${encodeURIComponent(targetId)}`);
  };

  useEffect(() => {
    if (!events.some((event) => event.id === selectedEventId) && events[0]) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  useEffect(() => {
    if (!selectedEvent) return;
    setSessionLabel(
      selectedEvent.multiSession
        ? (getEventSessionMeta(selectedEvent).sessionLabel ?? "morning")
        : "morning",
    );
  }, [selectedEvent]);

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds((current) => {
      const next = new Set(current);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const toggleVisibleStudents = () => {
    setSelectedStudentIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedStudentIds(new Set());
    setExistingStudentIds([]);
  };

  const disableBulkSelection = () => {
    setBulkSelectionEnabled(false);
    clearSelection();
  };

  const markSelected = async (overwriteExisting: boolean) => {
    if (!selectedEventId || !selectedEvent || !authUserId) {
      toast.error("Select an event before marking attendance.");
      return;
    }

    const studentIds = Array.from(selectedStudentIds);
    setIsMarking(true);
    const results = await Promise.all(
      studentIds.map((studentId) =>
        recordAttendance({
          eventId: selectedEventId,
          studentId,
          sessionLabel,
          status: "present",
          scannedBy: authUserId,
          strictSession: false,
          canTimeOut: false,
          method: "manual",
          overwrite:
            overwriteExisting || !existingStudentIds.includes(studentId),
        }),
      ),
    );
    setIsMarking(false);

    const marked = results.filter(
      (result) => result.outcome === "success",
    ).length;
    const failed = results.filter(
      (result) => result.outcome === "error",
    ).length;
    const skipped = results.filter(
      (result) =>
        result.outcome === "duplicate" || result.outcome === "rejected",
    ).length;

    toast.success(
      `${marked} marked present, ${skipped} skipped, ${failed} failed.`,
    );
    clearSelection();
  };

  const preflightAndMark = async () => {
    if (!selectedEventId || !selectedEvent || !authUserId) {
      toast.error("Select an event before marking attendance.");
      return;
    }

    const studentIds = Array.from(selectedStudentIds);
    setIsChecking(true);
    const { data, error } = await supabase
      .from("attendance_scans")
      .select("student_id")
      .eq("event_id", selectedEventId)
      .eq("session_label", sessionLabel)
      .in("student_id", studentIds);
    setIsChecking(false);

    if (error) {
      console.error(error);
      toast.error("Could not check existing attendance.");
      return;
    }

    const existingIds = Array.from(
      new Set((data ?? []).map((row) => String(row.student_id))),
    );
    setExistingStudentIds(existingIds);
    if (existingIds.length > 0) return;
    await markSelected(false);
  };

  return (
    <>
      <PageHeader
        title="Students"
        subtitle={`${students.length} students registered on Adesse`}
      />
      <div className="mb-5 w-full px-3.5 md:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icons.Search />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, ID, program, or section..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-300 outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 transition-colors hover:text-slate-500"
                aria-label="Clear student search"
              >
                <Icons.X />
              </button>
            )}
          </div>
          <label className="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700">
            <input
              type="checkbox"
              checked={bulkSelectionEnabled}
              onChange={(event) =>
                event.target.checked
                  ? setBulkSelectionEnabled(true)
                  : disableBulkSelection()
              }
              className="h-4 w-4 accent-emerald-600"
            />
            Enable bulk selection
          </label>
        </div>
      </div>
      {bulkSelectionEnabled && selectedStudentIds.size > 0 && (
        <div className="mb-5 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 md:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-emerald-900">
              {selectedStudentIds.size} selected
            </span>
            <label className="min-w-[220px] flex-1">
              <span className="sr-only">Event</span>
              <select
                value={selectedEventId}
                onChange={(event) => setSelectedEventId(event.target.value)}
                className="h-9 w-full rounded-lg border border-emerald-200 bg-white px-3 text-sm text-slate-800"
              >
                <option value="">Select event</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title} · {event.date}
                  </option>
                ))}
              </select>
            </label>
            {selectedEvent?.multiSession && (
              <div className="flex gap-1 rounded-lg bg-white p-1">
                {(["morning", "afternoon"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSessionLabel(option)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold ${sessionLabel === option ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    {option === "morning" ? "Morning" : "Afternoon"}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              disabled={isChecking || isMarking || !selectedEventId}
              onClick={() => void preflightAndMark()}
              className="h-9 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isChecking || isMarking
                ? "Marking..."
                : "Mark selected as Present"}
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="h-9 rounded-lg border border-emerald-300 bg-white px-3 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              Clear selection
            </button>
          </div>
          {sessionMismatch && (
            <p className="mt-3 text-xs font-semibold text-amber-800">
              The selected session does not match the event session suggested by
              the current time. You can continue manually.
            </p>
          )}
          {existingStudentIds.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-semibold">
                {existingStudentIds.length} students already have records for
                this event and session.
              </p>
              <p className="mt-1">
                Choose whether to skip them or overwrite all selected records.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={isMarking}
                  onClick={() => void markSelected(false)}
                  className="h-8 rounded-md border border-amber-300 bg-white px-3 font-semibold hover:bg-amber-100 disabled:opacity-50"
                >
                  Skip existing
                </button>
                <button
                  type="button"
                  disabled={isMarking}
                  onClick={() => void markSelected(true)}
                  className="h-8 rounded-md bg-amber-600 px-3 font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  Overwrite all
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {filtered.length === 0 ? (
        <div className="w-full bg-white border border-slate-100 rounded-xl px-3.5 py-10 text-center md:px-6">
          <p className="text-slate-400 text-sm">No students match "{query}"</p>
        </div>
      ) : (
        <div className="w-full overflow-hidden rounded-xl border border-slate-100 bg-white">
          <div className="hidden md:grid px-5 py-3 bg-slate-50 border-b border-slate-100 grid-cols-12 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {bulkSelectionEnabled && (
              <label className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleVisibleStudents}
                  aria-label="Select all visible students"
                  className="h-4 w-4 accent-emerald-600"
                />
              </label>
            )}
            <span
              className={bulkSelectionEnabled ? "col-span-4" : "col-span-5"}
            >
              Student
            </span>
            <span className="col-span-3">Program</span>
            <span className="col-span-3">Section</span>
            <span className="col-span-1"></span>
          </div>
          {filtered.map((s, i) => (
            <Fragment key={s.profileId ?? s.id}>
              <div
                className={`flex w-full items-center gap-3 px-3.5 py-3.5 transition-colors hover:bg-slate-50/80 active:bg-slate-100 md:hidden ${
                  i < filtered.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                {bulkSelectionEnabled && (
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.has(s.profileId ?? s.id)}
                    onChange={() => toggleStudent(s.profileId ?? s.id)}
                    aria-label={`Select ${s.name}`}
                    className="h-4 w-4 shrink-0 accent-emerald-600"
                  />
                )}
                <button
                  type="button"
                  onClick={() => openStudent(s)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div className="shrink-0">
                    <Avatar name={s.name} photoUrl={s.photoUrl} size="sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {s.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                      {s.id}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {[s.program, s.section].filter(Boolean).map((item) => (
                        <span
                          key={`${s.id}-${item}`}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-medium text-slate-600"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="flex shrink-0 text-slate-300">
                    <Icons.ChevronRight />
                  </span>
                </button>
              </div>
              <div
                className={`hidden w-full px-5 py-3.5 md:grid md:grid-cols-12 md:items-center md:text-left md:hover:bg-slate-50 md:transition-colors ${
                  i < filtered.length - 1 ? "border-b border-slate-50" : ""
                }`}
              >
                {bulkSelectionEnabled && (
                  <div className="col-span-1">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.has(s.profileId ?? s.id)}
                      onChange={() => toggleStudent(s.profileId ?? s.id)}
                      aria-label={`Select ${s.name}`}
                      className="h-4 w-4 accent-emerald-600"
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => openStudent(s)}
                  className={`${bulkSelectionEnabled ? "col-span-4" : "col-span-5"} flex min-w-0 items-center gap-3 text-left`}
                >
                  <Avatar name={s.name} photoUrl={s.photoUrl} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {s.name}
                    </p>
                    <p className="text-[11px] text-slate-400">{s.id}</p>
                  </div>
                </button>
                <span className="col-span-3 text-xs text-slate-500 font-medium">
                  {s.program}
                </span>
                <span className="col-span-3 text-xs text-slate-500 font-medium">
                  {s.section}
                </span>
                <span className="col-span-1 flex justify-end text-slate-300">
                  <Icons.ChevronRight />
                </span>
              </div>
            </Fragment>
          ))}
        </div>
      )}
    </>
  );
}

export function AdminAnnouncementsPage({
  posts,

  setPosts,

  onCreate,

  onUpdate,

  onDelete,
}: {
  posts: typeof INITIAL_ANNOUNCEMENTS;

  setPosts: React.Dispatch<React.SetStateAction<typeof INITIAL_ANNOUNCEMENTS>>;

  onCreate?: (payload: {
    title: string;

    body: string;

    badge: string;

    photoUrl: string | null;
  }) => Promise<void>;

  onUpdate?: (payload: {
    id: string;

    title: string;

    body: string;

    badge: string;

    photoUrl: string | null;

    previousPhotoUrl?: string;
  }) => Promise<void>;

  onDelete?: (id: string, photoUrl?: string) => Promise<void>;
}) {
  type NewPostTab = "details" | "media";

  const [showForm, setShowForm] = useState(false);

  const [newPostTab, setNewPostTab] = useState<NewPostTab>("details");

  const [editAnnouncementTab, setEditAnnouncementTab] =
    useState<NewPostTab>("details");

  const [editId, setEditId] = useState<string | null>(null);

  const [isPublishing, setIsPublishing] = useState(false);

  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<
    string | null
  >(null);

  const [editDraft, setEditDraft] = useState<
    (typeof INITIAL_ANNOUNCEMENTS)[0] | null
  >(null);

  const [newPhoto, setNewPhoto] = useState<string | null>(null);

  const [newPhotoUploadState, setNewPhotoUploadState] = useState<
    "idle" | "uploading" | "error"
  >("idle");

  const [editPhotoUploadState, setEditPhotoUploadState] = useState<
    "idle" | "uploading" | "error"
  >("idle");

  const photoRef = useRef<HTMLInputElement>(null);

  const editPhotoRef = useRef<HTMLInputElement>(null);

  const announcementFormSchema = z.object({
    title: z.string().trim().min(1, "Title is required"),

    body: z.string().trim().min(10, "Body must be at least 10 characters"),

    badge: z.string().trim().min(1, "Category is required"),
  });

  type AnnouncementFormValues = z.infer<typeof announcementFormSchema>;

  const {
    register,

    handleSubmit,

    reset,

    formState: { errors },
  } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementFormSchema),

    defaultValues: {
      title: "",

      body: "",

      badge: "General",
    },
  });

  const uploadSelectedPhoto = async (file: File) => {
    try {
      const result = await uploadImage(file, "public-images");

      if ("error" in result) {
        toast.error(result.error);

        return null;
      }

      return result.url;
    } catch {
      toast.error("Image upload failed.");

      return null;
    }
  };

  const uploadNewPhoto = async (file: File) => {
    setNewPhotoUploadState("uploading");

    const uploaded = await uploadSelectedPhoto(file);

    setNewPhotoUploadState(uploaded ? "idle" : "error");

    if (uploaded) setNewPhoto(uploaded);
  };

  const uploadEditPhoto = async (file: File) => {
    setEditPhotoUploadState("uploading");

    const uploaded = await uploadSelectedPhoto(file);

    setEditPhotoUploadState(uploaded ? "idle" : "error");

    if (uploaded) setEditDraft((d) => (d ? { ...d, photoUrl: uploaded } : d));
  };

  const handlePublish = handleSubmit(async (values) => {
    if (isPublishing) return;

    setIsPublishing(true);

    const payload = {
      title: values.title.trim(),

      body: values.body.trim(),

      badge: values.badge,

      photoUrl: newPhoto ?? null,
    };

    try {
      if (onCreate) {
        await onCreate(payload);
      } else {
        setPosts((p) => [
          {
            id: Date.now().toString(),

            title: payload.title,

            body: payload.body,

            date: "Aug 22, 2026",

            author: "Admin",

            badge: payload.badge,

            photoUrl: payload.photoUrl ?? "",
          },

          ...p,
        ]);
      }

      reset({ title: "", body: "", badge: "General" });

      setNewPhoto(null);

      setNewPhotoUploadState("idle");

      setShowForm(false);
    } finally {
      setIsPublishing(false);
    }
  });

  const startEdit = (a: (typeof INITIAL_ANNOUNCEMENTS)[0]) => {
    setEditId(a.id);

    setEditAnnouncementTab("details");

    setEditDraft({ ...a });

    setShowForm(false);
  };

  const saveEdit = async () => {
    if (!editDraft) return;

    const currentPost = posts.find((post) => post.id === editDraft.id);

    const payload = {
      id: editDraft.id,

      title: editDraft.title.trim(),

      body: editDraft.body.trim(),

      badge: editDraft.badge,

      photoUrl: editDraft.photoUrl || null,

      previousPhotoUrl: currentPost?.photoUrl || undefined,
    };

    if (onUpdate) {
      await onUpdate(payload);
    } else {
      setPosts((p) =>
        p.map((a) =>
          a.id === editDraft.id
            ? {
                ...a,

                title: payload.title,

                body: payload.body,

                badge: payload.badge,

                photoUrl: payload.photoUrl ?? "",
              }
            : a,
        ),
      );
    }

    setEditId(null);

    setEditDraft(null);
  };

  const deletePost = async (id: string) => {
    const currentPost = posts.find((post) => post.id === id);

    if (onDelete) {
      await onDelete(id, currentPost?.photoUrl || undefined);

      return;
    }

    setPosts((p) => p.filter((a) => a.id !== id));
  };

  if (selectedAnnouncementId) {
    return (
      <AnnouncementDetailPageView
        announcement={
          posts.find((post) => post.id === selectedAnnouncementId) ?? null
        }
        onBack={() => setSelectedAnnouncementId(null)}
        onEdit={() => {
          const post = posts.find((item) => item.id === selectedAnnouncementId);

          if (post) startEdit(post);

          setSelectedAnnouncementId(null);
        }}
        onDelete={() => {
          const id = selectedAnnouncementId;

          setSelectedAnnouncementId(null);
          void deletePost(id);
        }}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Announcements"
        action={
          <button
            onClick={() => {
              setShowForm(true);

              setNewPostTab("details");

              setEditId(null);

              setEditDraft(null);
            }}
            className="h-9 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <Icons.Plus />
            New post
          </button>
        }
      />

      {showForm && (
        <FormModal
          title="New Announcement"
          sidebar={
            <nav className="space-y-1" aria-label="New post sections">
              {[
                [
                  "details",
                  "Post Details",
                  "Title, category, and announcement body",
                ],
                ["media", "Media", "Optional announcement photo"],
              ].map(([value, label, description]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setNewPostTab(value as NewPostTab)}
                  className={`w-full rounded-xl px-3 py-3 text-left transition-colors ${
                    newPostTab === value
                      ? "bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                  }`}
                >
                  <span className="block text-xs font-bold">{label}</span>
                  <span className="mt-1 block text-[10px] leading-relaxed text-slate-400">
                    {description}
                  </span>
                </button>
              ))}
            </nav>
          }
          onClose={() => setShowForm(false)}
          footer={
            <>
              <button
                onClick={handlePublish}
                disabled={isPublishing}
                className="flex-1 h-10 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-40"
              >
                {isPublishing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Publishing...
                  </span>
                ) : (
                  "Publish"
                )}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="h-10 px-4 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
            </>
          }
        >
          {newPostTab === "details" && (
            <>
              <FieldInput
                label="Title"
                placeholder="e.g. Enrollment Now Open"
                {...register("title")}
                error={errors.title?.message}
              />
              <FieldSelect
                label="Category"
                {...register("badge")}
                error={errors.badge?.message}
              >
                <option>General</option>
                <option>Academic</option>
                <option>Schedule</option>
                <option>Financial</option>
                <option>Facilities</option>
                <option>Events</option>
              </FieldSelect>
              <FieldTextarea
                label="Body"
                placeholder="Write your announcement..."
                rows={8}
                {...register("body")}
                error={errors.body?.message}
              />
            </>
          )}
          {newPostTab === "media" && (
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">
                Photo (optional)
              </label>
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];

                  if (!f) return;

                  await uploadNewPhoto(f);
                }}
              />
              {newPhotoUploadState === "uploading" ? (
                <Skeleton className="w-full h-40 rounded-xl" />
              ) : newPhotoUploadState === "error" ? (
                <div className="w-full h-40 rounded-xl border border-red-200 bg-red-50 flex flex-col items-center justify-center gap-2">
                  <p className="text-sm font-semibold text-red-600">
                    Upload failed
                  </p>
                  <button
                    onClick={() => photoRef.current?.click()}
                    className="text-xs font-semibold text-red-700 underline"
                  >
                    Try again
                  </button>
                </div>
              ) : newPhoto ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200">
                  <img
                    src={newPhoto}
                    alt=""
                    className="w-full h-40 object-cover"
                  />
                  <button
                    onClick={() => setNewPhoto(null)}
                    className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"
                  >
                    <Icons.X />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => photoRef.current?.click()}
                  className="w-full h-10 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-emerald-400 hover:text-emerald-500 flex items-center justify-center gap-2"
                >
                  <Icons.Image />
                  Attach photo
                </button>
              )}
            </div>
          )}
        </FormModal>
      )}

      {editId && editDraft && (
        <FormModal
          title="Edit Announcement"
          sidebar={
            <nav className="space-y-1" aria-label="Edit announcement sections">
              {[
                [
                  "details",
                  "Post Details",
                  "Title, category, and announcement body",
                ],
                ["media", "Media", "Optional announcement photo"],
              ].map(([value, label, description]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setEditAnnouncementTab(value as NewPostTab)}
                  className={`w-full rounded-xl px-3 py-3 text-left transition-colors ${
                    editAnnouncementTab === value
                      ? "bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                  }`}
                >
                  <span className="block text-xs font-bold">{label}</span>
                  <span className="mt-1 block text-[10px] leading-relaxed text-slate-400">
                    {description}
                  </span>
                </button>
              ))}
            </nav>
          }
          onClose={() => {
            setEditId(null);

            setEditDraft(null);
          }}
          footer={
            <>
              <button
                onClick={saveEdit}
                className="flex-1 h-10 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg shadow-sm"
              >
                Save changes
              </button>
              <button
                onClick={() => {
                  setEditId(null);

                  setEditDraft(null);
                }}
                className="h-10 px-4 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
            </>
          }
        >
          {editAnnouncementTab === "details" && (
            <>
              <FieldInput
                label="Title"
                value={editDraft.title}
                onChange={(e) =>
                  setEditDraft((d) => (d ? { ...d, title: e.target.value } : d))
                }
              />
              <FieldSelect
                label="Category"
                value={editDraft.badge}
                onChange={(e) =>
                  setEditDraft((d) => (d ? { ...d, badge: e.target.value } : d))
                }
              >
                <option>General</option>
                <option>Academic</option>
                <option>Schedule</option>
                <option>Financial</option>
                <option>Facilities</option>
                <option>Events</option>
              </FieldSelect>
              <FieldTextarea
                label="Body"
                rows={8}
                value={editDraft.body}
                onChange={(e) =>
                  setEditDraft((d) => (d ? { ...d, body: e.target.value } : d))
                }
              />
            </>
          )}
          {editAnnouncementTab === "media" && (
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">
                Photo
              </label>
              <input
                ref={editPhotoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];

                  if (!f) return;

                  await uploadEditPhoto(f);
                }}
              />
              {editPhotoUploadState === "uploading" ? (
                <Skeleton className="w-full h-40 rounded-xl" />
              ) : editPhotoUploadState === "error" ? (
                <div className="w-full h-40 rounded-xl border border-red-200 bg-red-50 flex flex-col items-center justify-center gap-2">
                  <p className="text-sm font-semibold text-red-600">
                    Upload failed
                  </p>
                  <button
                    onClick={() => editPhotoRef.current?.click()}
                    className="text-xs font-semibold text-red-700 underline"
                  >
                    Try again
                  </button>
                </div>
              ) : editDraft.photoUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200">
                  <img
                    src={editDraft.photoUrl}
                    alt=""
                    className="w-full h-40 object-cover"
                  />
                  <button
                    onClick={() =>
                      setEditDraft((d) => (d ? { ...d, photoUrl: "" } : d))
                    }
                    className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"
                  >
                    <Icons.X />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => editPhotoRef.current?.click()}
                  className="w-full h-10 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-emerald-400 hover:text-emerald-500 flex items-center justify-center gap-2"
                >
                  <Icons.Image />
                  Attach photo
                </button>
              )}
            </div>
          )}
        </FormModal>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {posts.map((a) => (
          <div
            key={a.id}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden h-full"
            onClick={() => setSelectedAnnouncementId(a.id)}
          >
            <div className="relative w-full aspect-[4/3] bg-slate-50 overflow-hidden">
              {a.photoUrl ? (
                <img
                  src={a.photoUrl}
                  alt={a.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                  <span className="text-sm font-semibold text-slate-400">
                    No image
                  </span>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/25 via-transparent to-slate-900/10" />

              <div className="absolute top-3 left-3 z-10">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50/90 border border-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wide shadow-sm backdrop-blur-sm">
                  {a.badge}
                </span>
              </div>

              <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                <span className="rounded-full border border-white/30 bg-slate-900/25 px-2 py-1 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm">
                  {a.date}
                </span>
                <div
                  className="rounded-full border border-white/30 bg-slate-900/25 p-1 text-white shadow-sm backdrop-blur-sm"
                  onClick={(event) => event.stopPropagation()}
                >
                  <DotMenu
                    items={[
                      {
                        label: "Edit",

                        icon: <Icons.Edit />,

                        onClick: () => startEdit(a),
                      },

                      {
                        label: "Delete",

                        icon: <Icons.Trash />,

                        danger: true,

                        onClick: () => deletePost(a.id),
                      },
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="p-5 flex flex-col flex-1 justify-between gap-3">
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-base line-clamp-1">
                  {a.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">
                  {a.body}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-50">
                <p className="text-[11px] text-slate-400">
                  Posted by {a.author}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function AdminExcuseRequestsPage({
  requests,

  onAction,

  onBack,
}: {
  requests: ExcuseRequest[];

  onAction: (id: string, a: "approved" | "denied") => void;

  onBack: () => void;
}) {
  const pending = requests.filter((r) => r.status === "pending");

  const reviewed = requests.filter((r) => r.status !== "pending");

  return (
    <>
      <BackButton onClick={onBack} label="Back to Overview" />
      <PageHeader
        title="Excuse Requests"
        subtitle={`${pending.length} pending review`}
      />
      {requests.length === 0 && (
        <div className="bg-white border border-slate-100 rounded-xl px-5 py-12 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Icons.FileText />
          </div>
          <p className="font-semibold text-slate-900 text-sm">
            No excuse requests
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Student requests will appear here.
          </p>
        </div>
      )}
      {pending.length > 0 && (
        <>
          <SectionLabel>Pending review</SectionLabel>
          <div className="space-y-3 mb-6">
            {pending.map((r) => (
              <div
                key={r.id}
                className="bg-white border border-amber-100 rounded-xl p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={r.studentName}
                      photoUrl={r.photoUrl}
                      size="sm"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {r.studentName}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {r.studentId}
                      </p>
                    </div>
                  </div>
                  <Badge status={r.status} />
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5 mb-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Event
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {r.event}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{r.date}</p>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                  {r.reason}
                </p>
                {r.proofName && (
                  <p className="text-[11px] text-slate-400 mb-3 flex items-center gap-1">
                    <Icons.Paperclip />
                    {r.proofName}
                  </p>
                )}
                <p className="text-[11px] text-slate-400 mb-4">
                  Submitted {r.submittedDate}
                </p>
                <div className="flex gap-2 pt-4 border-t border-slate-50">
                  <button
                    onClick={() => onAction(r.id, "approved")}
                    className="flex-1 h-9 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Icons.Check />
                    Approve &amp; waive fee
                  </button>
                  <button
                    onClick={() => onAction(r.id, "denied")}
                    className="flex-1 h-9 border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 flex items-center justify-center gap-1.5"
                  >
                    <Icons.X />
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {reviewed.length > 0 && (
        <>
          <SectionLabel>Reviewed</SectionLabel>
          <div className="space-y-2.5">
            {reviewed.map((r) => (
              <div
                key={r.id}
                className="bg-white border border-slate-100 rounded-xl px-5 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      name={r.studentName}
                      photoUrl={r.photoUrl}
                      size="xs"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {r.studentName}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {r.event}
                      </p>
                    </div>
                  </div>
                  <Badge status={r.status} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export function AdminReportsPage({
  events = [],

  reportData,
}: {
  events?: EventData[];

  reportData?: {
    events?: EventData[];

    programStats?: Array<{
      label: string;

      present: number;

      total: number;

      rate: number;
    }>;

    feeSummary?: Array<{
      label: string;

      value: string;

      color: string;
    }>;
  };
}) {
  const liveEvents = reportData?.events ?? events ?? [];

  const programRows = reportData?.programStats ?? [];

  const fees = reportData?.feeSummary ?? [];

  const eventRows = liveEvents.filter((e) => e.status !== "upcoming");

  const exportPDF = () => {
    const W = 794,
      pad = 48,
      dpr = 2;

    const H =
      80 +
      32 +
      20 +
      24 +
      (programRows.length * 26 + 16) +
      20 +
      24 +
      (fees.length * 26 + 16) +
      20 +
      24 +
      (eventRows.length * 26 + 16) +
      48;

    const canvas = document.createElement("canvas");

    canvas.width = W * dpr;

    canvas.height = H * dpr;

    const ctx = canvas.getContext("2d")!;

    ctx.scale(dpr, dpr);

    ctx.fillStyle = "#fff";

    ctx.fillRect(0, 0, W, H);

    let y = 0;

    ctx.fillStyle = "#10b981";

    ctx.fillRect(0, 0, W, 60);

    ctx.fillStyle = "#fff";

    ctx.font = "bold 18px system-ui, sans-serif";

    ctx.textAlign = "left";

    ctx.fillText("Adesse — Attendance & Fees Report", pad, 38);

    ctx.font = "12px system-ui, sans-serif";

    ctx.textAlign = "right";

    ctx.fillText(`AY 2026-2027 · 1st Semester`, W - pad, 38);

    y = 60;

    ctx.fillStyle = "#94a3b8";

    ctx.font = "10px system-ui, sans-serif";

    ctx.textAlign = "left";

    ctx.fillText(`Generated ${new Date().toLocaleString()}`, pad, y + 18);

    y += 32;

    const sectionTitle = (title: string) => {
      ctx.fillStyle = "#f1f5f9";

      ctx.fillRect(pad, y, W - pad * 2, 22);

      ctx.fillStyle = "#334155";

      ctx.font = "bold 11px system-ui, sans-serif";

      ctx.fillText(title.toUpperCase(), pad + 8, y + 15);

      y += 22;
    };

    const tableHeader = (
      cols: { t: string; x: number; align?: CanvasTextAlign }[],
    ) => {
      ctx.fillStyle = "#f8fafc";

      ctx.fillRect(pad, y, W - pad * 2, 22);

      ctx.strokeStyle = "#e2e8f0";

      ctx.lineWidth = 0.5;

      ctx.strokeRect(pad, y, W - pad * 2, 22);

      cols.forEach((c) => {
        ctx.fillStyle = "#64748b";

        ctx.font = "bold 10px system-ui, sans-serif";

        ctx.textAlign = c.align ?? "left";

        ctx.fillText(c.t, c.x, y + 15);
      });

      y += 22;
    };

    const tableRow = (
      cols: {
        t: string;
        x: number;
        align?: CanvasTextAlign;
        color?: string;
      }[],

      shade: boolean,
    ) => {
      if (shade) {
        ctx.fillStyle = "#fafafa";

        ctx.fillRect(pad, y, W - pad * 2, 24);
      }

      ctx.strokeStyle = "#f1f5f9";

      ctx.lineWidth = 0.5;

      ctx.beginPath();

      ctx.moveTo(pad, y + 24);

      ctx.lineTo(W - pad, y + 24);

      ctx.stroke();

      cols.forEach((c) => {
        ctx.fillStyle = c.color ?? "#1e293b";

        ctx.font = "11px system-ui, sans-serif";

        ctx.textAlign = c.align ?? "left";

        ctx.fillText(c.t, c.x, y + 16);
      });

      y += 24;
    };

    y += 14;

    sectionTitle("Attendance by Program");

    tableHeader([
      {
        t: "Program",
        x: pad + 8,
      },

      { t: "Present", x: W - pad - 200, align: "right" },

      { t: "Total", x: W - pad - 120, align: "right" },

      { t: "Rate", x: W - pad - 8, align: "right" },
    ]);

    programRows.forEach((r, i) =>
      tableRow(
        [
          {
            t: r.label,
            x: pad + 8,
          },

          { t: r.present.toString(), x: W - pad - 200, align: "right" },

          { t: r.total.toString(), x: W - pad - 120, align: "right" },

          {
            t: `${r.rate}%`,

            x: W - pad - 8,

            align: "right",

            color:
              r.rate >= 70 ? "#10b981" : r.rate >= 50 ? "#d97706" : "#dc2626",
          },
        ],

        i % 2 === 1,
      ),
    );

    y += 14;

    sectionTitle("Fees Summary");

    tableHeader([
      {
        t: "Category",
        x: pad + 8,
      },

      { t: "Amount", x: W - pad - 8, align: "right" },
    ]);

    const feeColors: Record<string, string> = {
      "Total fees issued": "#dc2626",

      Collected: "#10b981",

      Pending: "#d97706",
    };

    fees.forEach((f, i) =>
      tableRow(
        [
          {
            t: f.label,
            x: pad + 8,
          },

          {
            t: f.value,

            x: W - pad - 8,

            align: "right",

            color: feeColors[f.label] ?? "#1e293b",
          },
        ],

        i % 2 === 1,
      ),
    );

    y += 14;

    sectionTitle("By Event");

    tableHeader([
      {
        t: "Event",
        x: pad + 8,
      },

      { t: "Date", x: W - pad - 200 },

      { t: "Fee", x: W - pad - 100, align: "right" },

      { t: "Attended", x: W - pad - 8, align: "right" },
    ]);

    eventRows.forEach((e, i) =>
      tableRow(
        [
          {
            t: e.title.length > 38 ? e.title.slice(0, 36) + "…" : e.title,

            x: pad + 8,
          },

          { t: e.date, x: W - pad - 200 },

          { t: `₱${e.fineAmount}`, x: W - pad - 100, align: "right" },

          {
            t: e.attendees.toString(),

            x: W - pad - 8,

            align: "right",

            color: "#10b981",
          },
        ],

        i % 2 === 1,
      ),
    );

    y += 20;

    ctx.fillStyle = "#e2e8f0";

    ctx.fillRect(pad, y, W - pad * 2, 1);

    ctx.fillStyle = "#94a3b8";

    ctx.font = "10px system-ui, sans-serif";

    ctx.textAlign = "center";

    ctx.fillText(
      "Adesse · Student Event Attendance & Fee Tracking System",

      W / 2,

      y + 18,
    );

    canvas.toBlob((blob) => {
      if (!blob) return;

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");

      a.href = url;

      a.download = `adesse-report-${new Date().toISOString().slice(0, 10)}.png`;

      a.click();

      URL.revokeObjectURL(url);
    }, "image/png");
  };

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="AY 2026-2027, 1st Semester"
        action={
          <button
            onClick={exportPDF}
            className="h-9 px-3.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 flex items-center gap-1.5"
          >
            <Icons.Download />
            Export PDF
          </button>
        }
      />
      <SectionLabel>Attendance by program</SectionLabel>
      <div className="grid md:grid-cols-2 gap-3 mb-6">
        {programRows.map((r, index) => {
          const colors = [
            "bg-emerald-500",

            "bg-sky-500",

            "bg-violet-400",

            "bg-amber-400",
          ];

          return (
            <div
              key={r.label}
              className="bg-white border border-slate-100 rounded-xl px-5 py-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-slate-900 text-sm">
                  {r.label}
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  {r.present} / {r.total}
                </span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full ${
                    colors[index % colors.length]
                  } rounded-full`}
                  style={{ width: `${r.rate}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 font-semibold">
                {r.rate}% attendance rate
              </p>
            </div>
          );
        })}
      </div>
      <SectionLabel>Fees summary</SectionLabel>
      <div className="grid grid-cols-1 gap-3 mb-6 sm:grid-cols-2 lg:grid-cols-3">
        {fees.map((s, i) => (
          <div
            key={s.label}
            className={`bg-white border border-slate-100 rounded-xl px-4 py-4 ${
              i === 0 ? "sm:col-span-1" : ""
            }`}
          >
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-slate-400 font-semibold mt-1 leading-tight">
              {s.label}
            </p>
          </div>
        ))}
      </div>
      <SectionLabel>By event</SectionLabel>
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
        {eventRows.map((e, i, arr) => (
          <div
            key={e.id}
            className={`flex items-center justify-between px-5 py-4 ${
              i < arr.length - 1 ? "border-b border-slate-50" : ""
            }`}
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">{e.title}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {e.date} · ₱{e.fineAmount} fee
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-emerald-500 text-lg">{e.attendees}</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
                attended
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export interface CarouselSlide {
  imageUrl: string;

  caption: string;

  date: string;
}

export interface SystemSettings {
  showFees: boolean;

  allowExcuseRequests: boolean;

  requirePhotoId: boolean;

  academicYear: string;

  semester: string;

  institution: string;

  heroImageUrls: string[];

  carouselSlides: CarouselSlide[];
}

export function AdminSettingsPage({
  settings,

  onSave,
}: {
  settings: SystemSettings;

  onSave: (s: SystemSettings) => void;
}) {
  const isBlobUrl = (value?: string) => !!value && value.startsWith("blob:");

  const heroImageUrls = settings.heroImageUrls.filter((url) => !isBlobUrl(url));

  const carouselSlides = settings.carouselSlides.map((slide) => ({
    ...slide,

    imageUrl: isBlobUrl(slide.imageUrl) ? "" : slide.imageUrl,
  }));

  type UploadSlot = {
    file: File;

    status: "uploading" | "error";

    error?: string;
  };

  const [heroUploadSlots, setHeroUploadSlots] = useState<
    Record<string, UploadSlot>
  >({});

  const [slideUploadSlots, setSlideUploadSlots] = useState<
    Record<number, UploadSlot>
  >({});

  const isPublicMediaUrl = (value?: string) =>
    !!value && value.startsWith("https://") && !value.startsWith("blob:");

  const handleHeroImageUpload = async (files: File[]) => {
    if (!files.length) return;

    const slots = files.map((file, index) => ({
      id: `hero-${Date.now()}-${index}`,

      file,
    }));

    setHeroUploadSlots((current) => ({
      ...current,

      ...Object.fromEntries(
        slots.map(({ id, file }) => [id, { file, status: "uploading" }]),
      ),
    }));

    const uploaded = await Promise.all(
      slots.map(async ({ id, file }) => {
        const result = await uploadImage(file);

        if ("error" in result || !isPublicMediaUrl(result.url)) {
          const error =
            "error" in result
              ? result.error
              : "Upload did not return a valid public image URL.";

          setHeroUploadSlots((current) => ({
            ...current,

            [id]: { file, status: "error", error },
          }));

          return null;
        }

        return { id, url: result.url };
      }),
    );

    const validUploads = uploaded.filter(
      (upload): upload is { id: string; url: string } => !!upload,
    );

    if (validUploads.length) {
      update({
        heroImageUrls: [
          ...settings.heroImageUrls,

          ...validUploads.map((upload) => upload.url),
        ],
      });

      setHeroUploadSlots((current) => {
        const next = { ...current };

        validUploads.forEach(({ id }) => delete next[id]);

        return next;
      });
    }
  };

  const handleSlideImageUpload = async (i: number, file: File) => {
    setSlideUploadSlots((current) => ({
      ...current,

      [i]: { file, status: "uploading" },
    }));

    const result = await uploadImage(file);

    if ("error" in result || !isPublicMediaUrl(result.url)) {
      const error =
        "error" in result
          ? result.error
          : "Upload did not return a valid public image URL.";

      setSlideUploadSlots((current) => ({
        ...current,

        [i]: { file, status: "error", error },
      }));

      return;
    }

    patchSlide(i, { imageUrl: result.url });

    setSlideUploadSlots((current) => {
      const next = { ...current };

      delete next[i];

      return next;
    });
  };

  const update = (patch: Partial<SystemSettings>) =>
    onSave({ ...settings, ...patch });

  const toggle = (k: "showFees" | "allowExcuseRequests" | "requirePhotoId") =>
    onSave({ ...settings, [k]: !settings[k] });

  const heroRef = useRef<HTMLInputElement>(null);

  const addHero = () => heroRef.current?.click();

  const removeHero = (i: number) =>
    update({ heroImageUrls: settings.heroImageUrls.filter((_, j) => j !== i) });

  const slideRefs = useRef<(HTMLInputElement | null)[]>([]);

  const addSlide = () => {
    if (settings.carouselSlides.length >= 10) return;

    update({
      carouselSlides: [
        ...settings.carouselSlides,

        { imageUrl: "", caption: "", date: "" },
      ],
    });
  };

  const removeSlide = (i: number) =>
    update({
      carouselSlides: settings.carouselSlides.filter((_, j) => j !== i),
    });

  const moveSlide = (i: number, dir: -1 | 1) => {
    const arr = [...settings.carouselSlides];

    const t = i + dir;

    if (t < 0 || t >= arr.length) return;
    [arr[i], arr[t]] = [arr[t], arr[i]];

    update({ carouselSlides: arr });
  };

  const patchSlide = (i: number, patch: Partial<CarouselSlide>) => {
    const arr = settings.carouselSlides.map((s, j) =>
      j === i ? { ...s, ...patch } : s,
    );

    update({ carouselSlides: arr });
  };

  return (
    <>
      <PageHeader
        title="Management & Settings"
        subtitle="Changes are saved automatically"
      />

      {}
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
        Fee Visibility
      </p>
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden mb-5">
        <div className="px-5 divide-y divide-slate-50">
          <Toggle
            on={settings.showFees}
            onToggle={() => toggle("showFees")}
            label="Show fees to students"
            desc="Enable during fee-paying week so students can see absence fine amounts across events, attendance history, and their Fines page."
          />
        </div>
        <div
          className={`mx-5 mb-4 rounded-lg px-3.5 py-2.5 flex items-center gap-2.5 transition-colors ${
            settings.showFees
              ? "bg-emerald-50 border border-emerald-200"
              : "bg-slate-50 border border-slate-200"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              settings.showFees ? "bg-emerald-500" : "bg-slate-400"
            }`}
            style={settings.showFees ? { animation: "pulse 2s infinite" } : {}}
          />
          <p
            className={`text-xs font-medium leading-relaxed ${
              settings.showFees ? "text-emerald-700" : "text-slate-500"
            }`}
          >
            Fees are{" "}
            <span className="font-bold">
              {settings.showFees ? "visible" : "hidden"}
            </span>{" "}
            to students
            {!settings.showFees && " — enable when the payment period opens"}
          </p>
        </div>
      </div>

      {}
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
        Attendance &amp; Requests
      </p>
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden mb-5">
        <div className="px-5 divide-y divide-slate-50">
          <Toggle
            on={settings.allowExcuseRequests}
            onToggle={() => toggle("allowExcuseRequests")}
            label="Accept excuse requests"
            desc="Absent students can submit a reason and supporting document for review."
          />
          <Toggle
            on={settings.requirePhotoId}
            onToggle={() => toggle("requirePhotoId")}
            label="Require photo ID on scan"
            desc="Moderators must verify a photo ID alongside the QR code during check-in."
          />
        </div>
      </div>

      {}
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
        Academic Information
      </p>
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden mb-5">
        <div className="px-5 py-4 space-y-3">
          <FieldInput
            label="Institution name"
            value={settings.institution}
            onChange={(e) => update({ institution: e.target.value })}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldInput
              label="Academic year"
              placeholder="e.g. 2026-2027"
              value={settings.academicYear}
              onChange={(e) => update({ academicYear: e.target.value })}
            />
            <FieldSelect
              label="Semester"
              value={settings.semester}
              onChange={(e) => update({ semester: e.target.value })}
            >
              <option>1st Semester</option>
              <option>2nd Semester</option>
              <option>Summer</option>
            </FieldSelect>
          </div>
        </div>
      </div>

      {}
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
        Landing Page
      </p>

      {}
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden mb-3">
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-sm font-semibold text-slate-900">Hero images</p>
            <span className="text-[11px] text-slate-400 font-medium">
              {settings.heroImageUrls.length}/6
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Each image shows for 4 seconds before crossfading to the next. A
            gradient keeps text readable.
          </p>
          <input
            ref={heroRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? []);

              const remaining = 6 - settings.heroImageUrls.length;

              const toAdd = files.slice(0, remaining);

              if (toAdd.length) {
                await handleHeroImageUpload(toAdd);
              }

              e.target.value = "";
            }}
          />
          {heroImageUrls.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-2">
              {heroImageUrls.map((url, i) => (
                <div
                  key={i}
                  className="relative rounded-xl overflow-hidden border border-slate-200 aspect-video"
                >
                  <img
                    src={url}
                    alt={`Hero ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/25" />
                  <span className="absolute top-2 left-2 text-[10px] font-bold text-white/80 bg-black/30 px-1.5 py-0.5 rounded">
                    {i + 1}
                  </span>
                  <button
                    onClick={() => removeHero(i)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow transition-colors"
                  >
                    <Icons.X />
                  </button>
                </div>
              ))}
              {Object.entries(heroUploadSlots).map(([slotId, slot]) =>
                slot.status === "uploading" ? (
                  <Skeleton key={slotId} className="aspect-video rounded-xl" />
                ) : (
                  <div
                    key={slotId}
                    className="aspect-video rounded-xl border border-red-200 bg-red-50 flex flex-col items-center justify-center gap-2 px-3 text-center"
                  >
                    <p className="text-[11px] font-semibold text-red-600">
                      Upload failed
                    </p>
                    <button
                      onClick={() => {
                        setHeroUploadSlots((current) => {
                          const next = { ...current };

                          delete next[slotId];

                          return next;
                        });

                        void handleHeroImageUpload([slot.file]);
                      }}
                      className="h-7 px-2.5 rounded-lg border border-red-200 bg-white text-[11px] font-semibold text-red-600 hover:bg-red-100 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                ),
              )}
            </div>
          )}
          {heroImageUrls.length === 0 &&
            Object.entries(heroUploadSlots).length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-2">
                {Object.entries(heroUploadSlots).map(([slotId, slot]) =>
                  slot.status === "uploading" ? (
                    <Skeleton
                      key={slotId}
                      className="aspect-video rounded-xl"
                    />
                  ) : (
                    <div
                      key={slotId}
                      className="aspect-video rounded-xl border border-red-200 bg-red-50 flex flex-col items-center justify-center gap-2 px-3 text-center"
                    >
                      <p className="text-[11px] font-semibold text-red-600">
                        Upload failed
                      </p>
                      <button
                        onClick={() => {
                          setHeroUploadSlots((current) => {
                            const next = { ...current };

                            delete next[slotId];

                            return next;
                          });

                          void handleHeroImageUpload([slot.file]);
                        }}
                        className="h-7 px-2.5 rounded-lg border border-red-200 bg-white text-[11px] font-semibold text-red-600 hover:bg-red-100 transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  ),
                )}
              </div>
            )}
          {heroImageUrls.length < 6 && (
            <button
              onClick={addHero}
              className="w-full h-10 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-emerald-400 hover:text-emerald-500 flex items-center justify-center gap-2 transition-colors"
            >
              <Icons.Image />
              Add hero photo{heroImageUrls.length > 0 ? "s" : ""}
            </button>
          )}
        </div>
      </div>

      {}
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden mb-5">
        <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Event carousel
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Up to 10 slides shown below the feature cards on the landing page.
            </p>
          </div>
          {settings.carouselSlides.length < 10 && (
            <button
              onClick={addSlide}
              className="h-8 px-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0"
            >
              <Icons.Plus />
              Add slide
            </button>
          )}
        </div>
        {settings.carouselSlides.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-slate-400">
              No slides yet — add one above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {carouselSlides.map((slide, i) => {
              const ref = (el: HTMLInputElement | null) => {
                slideRefs.current[i] = el;
              };

              return (
                <div key={i} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    {}
                    <div className="shrink-0">
                      <input
                        ref={ref}
                        type="file"
                        accept="image/*,video/mp4"
                        className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];

                          if (f) {
                            await handleSlideImageUpload(i, f);
                          }
                        }}
                      />
                      {slideUploadSlots[i]?.status === "uploading" ? (
                        <Skeleton className="w-20 h-14 rounded-lg" />
                      ) : slideUploadSlots[i]?.status === "error" ? (
                        <div className="w-20 h-14 rounded-lg border border-red-200 bg-red-50 flex flex-col items-center justify-center gap-0.5 px-1 text-center">
                          <span className="text-[9px] font-semibold text-red-600">
                            Failed
                          </span>
                          <button
                            onClick={() => {
                              const slot = slideUploadSlots[i];

                              if (slot) {
                                void handleSlideImageUpload(i, slot.file);
                              }
                            }}
                            className="text-[9px] font-bold text-red-700 underline"
                          >
                            Retry
                          </button>
                        </div>
                      ) : slide.imageUrl && isPublicMediaUrl(slide.imageUrl) ? (
                        <div
                          className="relative w-20 h-14 rounded-lg overflow-hidden border border-slate-200 cursor-pointer"
                          onClick={() => slideRefs.current[i]?.click()}
                        >
                          {/\.mp4($|\?)/i.test(slide.imageUrl) ? (
                            <video
                              src={slide.imageUrl}
                              muted
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              src={slide.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          )}
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <Icons.Camera />
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => slideRefs.current[i]?.click()}
                          className="w-20 h-14 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 hover:border-emerald-400 hover:text-emerald-500 flex items-center justify-center transition-colors"
                        >
                          <Icons.Image />
                        </button>
                      )}
                    </div>
                    {}
                    <div className="flex-1 space-y-2 min-w-0">
                      <FieldInput
                        label="Caption"
                        placeholder="e.g. Foundation Day Celebration"
                        value={slide.caption}
                        onChange={(e) =>
                          patchSlide(i, { caption: e.target.value })
                        }
                      />
                      <FieldInput
                        label="Date (optional)"
                        placeholder="e.g. Aug 29, 2026"
                        value={slide.date}
                        onChange={(e) =>
                          patchSlide(i, { date: e.target.value })
                        }
                      />
                    </div>
                    {}
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => moveSlide(i, -1)}
                        disabled={i === 0}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveSlide(i, 1)}
                        disabled={i === settings.carouselSlides.length - 1}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeSlide(i)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors"
                      >
                        <Icons.Trash />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {}
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
        System
      </p>
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
        {[
          { l: "System name", v: "Adesse" },

          { l: "Version", v: "1.0.0" },

          { l: "Environment", v: "Production" },
        ].map((r, i, arr) => (
          <div
            key={r.l}
            className={`flex items-center justify-between px-5 py-3.5 ${
              i < arr.length - 1 ? "border-b border-slate-50" : ""
            }`}
          >
            <span className="text-sm text-slate-500">{r.l}</span>
            <span className="text-sm font-semibold text-slate-900">{r.v}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export default function LandingExperienceClient({
  settings,
}: {
  settings: SystemSettings;
}) {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);

  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowLoader(false);
    }, 180);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAuthenticatedUser() {
      try {
        const {
          data: { session },

          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Failed to load landing session", sessionError);
        }

        if (!session?.user) {
          if (!cancelled) {
            setUser(null);
          }

          return;
        }

        const { data: profile, error: profileError } = await supabase

          .from("profiles")

          .select("*")

          .eq("id", session.user.id)

          .maybeSingle();

        if (profileError && profileError.code !== "PGRST116") {
          console.error("Failed to load landing profile", profileError);
        }

        if (!profile) {
          if (!cancelled) {
            setUser(null);
          }

          return;
        }

        const profileIsComplete =
          !!profile.first_name &&
          !!profile.surname &&
          !!profile.student_id &&
          !!profile.program &&
          !!profile.year_level &&
          !!profile.section;

        if (!profileIsComplete) {
          if (!cancelled) {
            setUser(null);
          }

          return;
        }

        if (!cancelled) {
          setUser({
            firstName: profile.first_name ?? "",

            middleInitial: profile.middle_initial ?? "",

            surname: profile.surname ?? "",

            studentId: profile.student_id ?? "",

            program: profile.program ?? "",

            yearLevel: profile.year_level ?? "",

            section: profile.section ?? "",

            phone: profile.phone ?? "",

            contactEmail: profile.contact_email ?? profile.email ?? "",

            role: profile.role ?? "student",

            photoUrl: profile.photo_url ?? undefined,

            idPhotoUrl: profile.id_photo_url ?? undefined,
          });
        }
      } catch (caughtError) {
        console.error(caughtError);

        if (!cancelled) {
          setUser(null);
        }
      }
    }

    void loadAuthenticatedUser();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLandingNav = (page: Page) => {
    const routeFromPage: Record<Page, string> = {
      landing: "/",

      login: "/login",

      onboarding: "/onboarding",

      dashboard: "/dashboard",

      "my-qr": "/my-qr",

      events: "/events",

      "event-detail": "/events",

      announcements: "/announcements",

      "attendance-history": "/attendance-history",

      "my-fines": "/my-fines",

      profile: "/profile",

      "admin-dashboard": "/admin-dashboard",

      "admin-events": "/admin-events",

      "admin-scanner": "/admin-scanner",

      "admin-attendees": "/admin-attendees",

      "admin-students": "/admin-students",

      "admin-announcements": "/admin-announcements",

      "admin-reports": "/admin-reports",

      "admin-excuse-requests": "/admin-excuse-requests",

      "admin-settings": "/admin-settings",
    };

    router.push(routeFromPage[page] ?? "/");
  };

  return (
    <AnimatePresence mode="wait">
      {showLoader ? (
        <motion.div
          key="landing-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-white"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0.7 }}
            animate={{
              scale: [0.94, 1, 0.96],

              opacity: [0.72, 1, 0.8],

              filter: [
                "drop-shadow(0 0 0 rgba(16,185,129,0))",

                "drop-shadow(0 0 18px rgba(16,185,129,0.2))",

                "drop-shadow(0 0 0 rgba(16,185,129,0))",
              ],
            }}
            transition={{
              duration: 1.8,

              ease: "easeInOut",

              repeat: Number.POSITIVE_INFINITY,
            }}
            className="flex flex-col items-center justify-center"
          >
            <img
              src={adesseLogoSrc}
              alt="Adesse logo"
              className="h-16 w-16 md:h-20 md:w-20 object-contain"
            />
            <motion.div
              initial={{ opacity: 0.7 }}
              animate={{ opacity: [0.6, 1, 0.7] }}
              transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY }}
              className="mt-4 text-xs font-semibold uppercase tracking-[0.32em] text-emerald-600"
            >
              Loading
            </motion.div>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="landing-page"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          <LandingPage
            onNav={handleLandingNav}
            settings={settings}
            user={user}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
