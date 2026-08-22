import { useState, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Page =
  | "landing" | "login" | "onboarding"
  | "dashboard" | "my-qr" | "events" | "event-detail"
  | "announcements" | "attendance-history" | "my-fines" | "profile"
  | "admin-dashboard" | "admin-events" | "admin-scanner"
  | "admin-attendees" | "admin-announcements" | "admin-reports"
  | "admin-excuse-requests" | "admin-students";

type Role = "student" | "admin" | null;
type FineStatus = "unpaid" | "paid" | "excused";
type EventStatus = "active" | "upcoming" | "closed";

interface User {
  firstName: string; middleInitial: string; surname: string;
  studentId: string; program: string; yearLevel: string; section: string;
  phone: string; contactEmail: string; role: Role;
}

interface EventData {
  id: string; title: string; date: string; time: string;
  location: string; status: EventStatus;
  attendees: number; description: string; program: string;
  fineAmount: number; mediaUrls?: string[];
}

interface ScanRecord {
  name: string; id: string; program: string; section: string;
  time: string; status: "confirmed" | "duplicate"; dbId: number;
}

interface ExcuseRequest {
  id: string; studentName: string; studentId: string;
  event: string; date: string; reason: string;
  proofName: string | null; status: "pending" | "approved" | "denied";
  submittedDate: string;
}

interface FineRecord {
  id: string; eventId: string; eventTitle: string;
  eventDate: string; amount: number; status: FineStatus;
}

interface StudentProfile {
  name: string; id: string; program: string; yearLevel: string;
  section: string; phone: string; email: string; joinedDate: string;
}

function fullName(u: Pick<User, "firstName" | "middleInitial" | "surname">) {
  const mid = u.middleInitial ? ` ${u.middleInitial}.` : "";
  return `${u.firstName}${mid} ${u.surname}`.trim();
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const INITIAL_EVENTS: EventData[] = [
  { id: "1", title: "TapIn Foundation Day Celebration",     date: "Aug 29, 2026", time: "8:00 AM – 5:00 PM", location: "Main Gymnasium",      status: "upcoming", attendees: 0,   program: "All Programs", fineAmount: 150, description: "Annual Foundation Day celebration featuring cultural shows, sports competitions, and academic exhibits. Attendance is required for all enrolled students." },
  { id: "2", title: "SSC General Assembly — 1st Semester",  date: "Aug 22, 2026", time: "1:00 PM – 4:00 PM", location: "Audio-Visual Room 2", status: "active",   attendees: 6,   program: "All Programs", fineAmount: 100, description: "Supreme Student Council general assembly for the first semester. Agenda includes budget presentation, committee reports, and open forum." },
  { id: "3", title: "Tech Talk: AI in Education",           date: "Aug 15, 2026", time: "2:00 PM – 5:00 PM", location: "ICT Laboratory",      status: "closed",   attendees: 8,   program: "BSIT / BSCS", fineAmount: 50,  description: "Integration of artificial intelligence tools in modern education. Guest speaker from the Department of Information Technology." },
  { id: "4", title: "Intramural Opening Ceremony",          date: "Sep 5, 2026",  time: "7:30 AM – 12:00 PM",location: "Covered Court",       status: "upcoming", attendees: 0,   program: "All Programs", fineAmount: 200, description: "Opening ceremony for the annual intramural sports festival. Parade of athletes, oath-taking, and opening of games." },
];

// Per-event scan data keyed by event ID
const EVENT_SCANS: Record<string, ScanRecord[]> = {
  "2": [
    { name: "Maria Luisa Santos",    id: "2440014", program: "BSIT", section: "IT-2A", time: "1:14 PM", status: "confirmed", dbId: 0 },
    { name: "Juan Carlos Dela Cruz", id: "2440042", program: "BSCS", section: "CS-1B", time: "1:15 PM", status: "confirmed", dbId: 1 },
    { name: "Alyssa Mae Reyes",      id: "2430087", program: "BSIT", section: "IT-3A", time: "1:16 PM", status: "confirmed", dbId: 2 },
    { name: "Carlo Miguel Mendoza",  id: "2440103", program: "BSCS", section: "CS-2A", time: "1:17 PM", status: "duplicate", dbId: 3 },
    { name: "Jessa Rose Flores",     id: "2430211", program: "BSIT", section: "IT-2B", time: "1:18 PM", status: "confirmed", dbId: 4 },
    { name: "Rafael Antonio Lim",    id: "2440178", program: "BSBA", section: "BA-1A", time: "1:19 PM", status: "confirmed", dbId: 5 },
  ],
  "3": [
    { name: "Maria Luisa Santos",     id: "2440014", program: "BSIT", section: "IT-2A", time: "2:03 PM", status: "confirmed", dbId: 0 },
    { name: "Patricia Nicole Torres", id: "2430055", program: "BSIT", section: "IT-3B", time: "2:05 PM", status: "confirmed", dbId: 1 },
    { name: "Emmanuel Jay Bautista",  id: "2440290", program: "BSCS", section: "CS-1A", time: "2:07 PM", status: "confirmed", dbId: 2 },
    { name: "Juan Carlos Dela Cruz",  id: "2440042", program: "BSCS", section: "CS-1B", time: "2:09 PM", status: "confirmed", dbId: 3 },
    { name: "Alyssa Mae Reyes",       id: "2430087", program: "BSIT", section: "IT-3A", time: "2:10 PM", status: "confirmed", dbId: 4 },
    { name: "Kevin Roy Castillo",     id: "2440067", program: "BSIT", section: "IT-1B", time: "2:12 PM", status: "confirmed", dbId: 5 },
    { name: "Francesca Dizon",        id: "2430144", program: "BSBA", section: "BA-2A", time: "2:14 PM", status: "confirmed", dbId: 6 },
    { name: "Jessa Rose Flores",      id: "2430211", program: "BSIT", section: "IT-2B", time: "2:16 PM", status: "confirmed", dbId: 7 },
  ],
};

const ALL_STUDENTS: StudentProfile[] = [
  { name: "Maria Luisa Santos",     id: "2440014", program: "BSIT", yearLevel: "2nd Year", section: "IT-2A", phone: "09171234567", email: "mls.santos@tapin.edu",  joinedDate: "Aug 12, 2026" },
  { name: "Juan Carlos Dela Cruz",  id: "2440042", program: "BSCS", yearLevel: "1st Year", section: "CS-1B", phone: "09281234568", email: "jc.delacruz@tapin.edu", joinedDate: "Aug 13, 2026" },
  { name: "Alyssa Mae Reyes",       id: "2430087", program: "BSIT", yearLevel: "3rd Year", section: "IT-3A", phone: "09391234569", email: "am.reyes@tapin.edu",     joinedDate: "Aug 10, 2026" },
  { name: "Carlo Miguel Mendoza",   id: "2440103", program: "BSCS", yearLevel: "2nd Year", section: "CS-2A", phone: "09501234570", email: "cm.mendoza@tapin.edu",   joinedDate: "Aug 14, 2026" },
  { name: "Jessa Rose Flores",      id: "2430211", program: "BSIT", yearLevel: "2nd Year", section: "IT-2B", phone: "09611234571", email: "jr.flores@tapin.edu",    joinedDate: "Aug 11, 2026" },
  { name: "Rafael Antonio Lim",     id: "2440178", program: "BSBA", yearLevel: "1st Year", section: "BA-1A", phone: "09721234572", email: "ra.lim@tapin.edu",       joinedDate: "Aug 15, 2026" },
  { name: "Patricia Nicole Torres", id: "2430055", program: "BSIT", yearLevel: "3rd Year", section: "IT-3B", phone: "09831234573", email: "pn.torres@tapin.edu",    joinedDate: "Aug 10, 2026" },
  { name: "Emmanuel Jay Bautista",  id: "2440290", program: "BSCS", yearLevel: "1st Year", section: "CS-1A", phone: "09941234574", email: "ej.bautista@tapin.edu",  joinedDate: "Aug 16, 2026" },
  { name: "Francesca Dizon",        id: "2430144", program: "BSBA", yearLevel: "2nd Year", section: "BA-2A", phone: "09051234575", email: "f.dizon@tapin.edu",      joinedDate: "Aug 12, 2026" },
  { name: "Kevin Roy Castillo",     id: "2440067", program: "BSIT", yearLevel: "1st Year", section: "IT-1B", phone: "09161234576", email: "kr.castillo@tapin.edu",  joinedDate: "Aug 17, 2026" },
];

const INITIAL_ANNOUNCEMENTS = [
  { id: "1", title: "Enrollment for 2nd Semester Now Open", body: "Online enrollment for the second semester of AY 2026–2027 is now open. Complete enrollment on or before September 15, 2026. Late enrollees are subject to a ₱200 surcharge.", date: "Aug 20, 2026", author: "Registrar's Office", badge: "Academic", photoUrl: "" },
  { id: "2", title: "Afternoon Classes Suspended — Aug 22", body: "Due to the SSC General Assembly on August 22, all afternoon classes from 1:00 PM onward are suspended. Morning classes proceed as scheduled.", date: "Aug 19, 2026", author: "Office of the Principal", badge: "Schedule", photoUrl: "" },
  { id: "3", title: "Library Hours Extended During Finals Week", body: "The library will be open 7:00 AM to 7:00 PM starting August 25 until September 6. Laptops allowed; food and drinks are not permitted.", date: "Aug 18, 2026", author: "Library Services", badge: "Facilities", photoUrl: "" },
  { id: "4", title: "Scholarship Application Deadline — Aug 28", body: "All scholarship applicants must submit complete documentary requirements to the Scholarship Office by August 28, 2026.", date: "Aug 17, 2026", author: "Scholarship Office", badge: "Financial", photoUrl: "" },
];

const ATTENDANCE_RECORDS = [
  { id: "a1", eventId: "2", event: "SSC General Assembly — 1st Semester", date: "Aug 22, 2026", time: "1:14 PM", status: "present" },
  { id: "a2", eventId: "3", event: "Tech Talk: AI in Education",           date: "Aug 15, 2026", time: "2:03 PM", status: "present" },
  { id: "a3", eventId: "5", event: "College Orientation 2026",             date: "Aug 5, 2026",  time: "—",       status: "absent" },
  { id: "a4", eventId: "6", event: "Leadership & Values Seminar",          date: "Jul 28, 2026", time: "—",       status: "absent" },
];

const STUDENT_FINES: FineRecord[] = [
  { id: "f1", eventId: "5", eventTitle: "College Orientation 2026",    eventDate: "Aug 5, 2026",  amount: 150, status: "unpaid" },
  { id: "f2", eventId: "6", eventTitle: "Leadership & Values Seminar", eventDate: "Jul 28, 2026", amount: 100, status: "unpaid" },
];

// ─── Icons ────────────────────────────────────────────────────────────────────
const sv = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const ic = "w-[18px] h-[18px] shrink-0";
const Icons = {
  Home:           () => <svg viewBox="0 0 24 24" className={ic} {...sv}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Calendar:       () => <svg viewBox="0 0 24 24" className={ic} {...sv}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Bell:           () => <svg viewBox="0 0 24 24" className={ic} {...sv}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  QrCode:         () => <svg viewBox="0 0 24 24" className={ic} {...sv}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3"/><path d="M17 17h4v4h-4z"/></svg>,
  User:           () => <svg viewBox="0 0 24 24" className={ic} {...sv}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Shield:         () => <svg viewBox="0 0 24 24" className={ic} {...sv}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  CheckCircle:    () => <svg viewBox="0 0 24 24" className={ic} {...sv}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  Check:          () => <svg viewBox="0 0 24 24" className={ic} {...sv}><polyline points="20 6 9 17 4 12"/></svg>,
  XCircle:        () => <svg viewBox="0 0 24 24" className={ic} {...sv}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  Clock:          () => <svg viewBox="0 0 24 24" className={ic} {...sv}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  MapPin:         () => <svg viewBox="0 0 24 24" className={ic} {...sv}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  ChevronRight:   () => <svg viewBox="0 0 24 24" className={ic} {...sv}><polyline points="9 18 15 12 9 6"/></svg>,
  ChevronLeft:    () => <svg viewBox="0 0 24 24" className={ic} {...sv}><polyline points="15 18 9 12 15 6"/></svg>,
  Scan:           () => <svg viewBox="0 0 24 24" className={ic} {...sv}><path d="M3 7V5a2 2 0 012-2h2"/><path d="M17 3h2a2 2 0 012 2v2"/><path d="M21 17v2a2 2 0 01-2 2h-2"/><path d="M7 21H5a2 2 0 01-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>,
  Users:          () => <svg viewBox="0 0 24 24" className={ic} {...sv}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  BarChart:       () => <svg viewBox="0 0 24 24" className={ic} {...sv}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  FileText:       () => <svg viewBox="0 0 24 24" className={ic} {...sv}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  LogOut:         () => <svg viewBox="0 0 24 24" className={ic} {...sv}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Download:       () => <svg viewBox="0 0 24 24" className={ic} {...sv}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Plus:           () => <svg viewBox="0 0 24 24" className={ic} {...sv}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  AlertCircle:    () => <svg viewBox="0 0 24 24" className={ic} {...sv}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  Edit:           () => <svg viewBox="0 0 24 24" className={ic} {...sv}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  MoreHorizontal: () => <svg viewBox="0 0 24 24" className={ic} {...sv}><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></svg>,
  Trash:          () => <svg viewBox="0 0 24 24" className={ic} {...sv}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
  Paperclip:      () => <svg viewBox="0 0 24 24" className={ic} {...sv}><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>,
  Mail:           () => <svg viewBox="0 0 24 24" className={ic} {...sv}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  Activity:       () => <svg viewBox="0 0 24 24" className={ic} {...sv}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Send:           () => <svg viewBox="0 0 24 24" className={ic} {...sv}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  X:              () => <svg viewBox="0 0 24 24" className={ic} {...sv}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Image:          () => <svg viewBox="0 0 24 24" className={ic} {...sv}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  Video:          () => <svg viewBox="0 0 24 24" className={ic} {...sv}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
  Search:         () => <svg viewBox="0 0 24 24" className={ic} {...sv}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Radio:          () => <svg viewBox="0 0 24 24" className={ic} {...sv}><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49m11.31-2.82a10 10 0 010 14.14m-14.14 0a10 10 0 010-14.14"/></svg>,
  Peso:           () => <svg viewBox="0 0 24 24" className={ic} fill="currentColor"><text x="3" y="19" fontSize="17" fontWeight="700" fontFamily="sans-serif">₱</text></svg>,
  Google:         () => <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>,
};

// ─── Shared primitives ────────────────────────────────────────────────────────
function FieldInput({ label, ...p }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{label}</label>
      <input className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 font-medium placeholder:text-slate-300 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all" {...p} />
    </div>
  );
}
function FieldSelect({ label, children, ...p }: { label: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{label}</label>
      <select className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 font-medium outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all appearance-none" {...p}>{children}</select>
    </div>
  );
}
function FieldTextarea({ label, ...p }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{label}</label>
      <textarea className="px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 font-medium placeholder:text-slate-300 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 resize-none transition-all" {...p} />
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const cfg: Record<string, { cls: string; label: string; dot?: boolean }> = {
    active:    { cls: "bg-green-50 text-green-700 ring-1 ring-green-200",    label: "Live",          dot: true },
    upcoming:  { cls: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",          label: "Upcoming" },
    closed:    { cls: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",   label: "Ended" },
    present:   { cls: "bg-green-50 text-green-700 ring-1 ring-green-200",    label: "Present" },
    absent:    { cls: "bg-red-50 text-red-600 ring-1 ring-red-200",          label: "Absent" },
    excused:   { cls: "bg-violet-50 text-violet-600 ring-1 ring-violet-200", label: "Excused" },
    pending:   { cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",    label: "Pending Review" },
    confirmed: { cls: "bg-green-50 text-green-700 ring-1 ring-green-200",    label: "Confirmed" },
    duplicate: { cls: "bg-red-50 text-red-600 ring-1 ring-red-200",          label: "Duplicate" },
    approved:  { cls: "bg-green-50 text-green-700 ring-1 ring-green-200",    label: "Approved" },
    denied:    { cls: "bg-red-50 text-red-600 ring-1 ring-red-200",          label: "Denied" },
    unpaid:    { cls: "bg-red-50 text-red-600 ring-1 ring-red-200",          label: "Unpaid" },
    paid:      { cls: "bg-green-50 text-green-700 ring-1 ring-green-200",    label: "Paid" },
  };
  const c = cfg[status] ?? { cls: "bg-slate-100 text-slate-500", label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md ${c.cls}`}>
      {c.dot && <span className="w-1.5 h-1.5 rounded-full bg-green-500" style={{ animation: "pulse 2s infinite" }} />}
      {c.label}
    </span>
  );
}

function Avatar({ name, size = "md" }: { name: string; size?: "xs" | "sm" | "md" | "lg" }) {
  const sz = { xs: "w-6 h-6", sm: "w-7 h-7", md: "w-9 h-9", lg: "w-14 h-14" }[size];
  const letters = name.split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase();
  if (letters) {
    const textSz = { xs: "text-[9px]", sm: "text-xs", md: "text-sm", lg: "text-lg" }[size];
    return <div className={`${sz} rounded-full bg-gradient-to-br from-green-400 to-green-700 text-white font-bold ${textSz} flex items-center justify-center shrink-0 select-none`}>{letters}</div>;
  }
  return (
    <div className={`${sz} rounded-full bg-[#b0b3b8] flex items-end justify-center overflow-hidden shrink-0`}>
      <svg viewBox="0 0 36 40" className="w-[70%] h-[70%]" fill="white"><ellipse cx="18" cy="13" rx="9" ry="10"/><ellipse cx="18" cy="42" rx="18" ry="15"/></svg>
    </div>
  );
}

function ProfileIcon({ size = "sm" }: { size?: "xs" | "sm" | "md" | "lg" }) {
  const sz = { xs: "w-6 h-6", sm: "w-7 h-7", md: "w-9 h-9", lg: "w-14 h-14" }[size];
  return (
    <div className={`${sz} rounded-full bg-[#b0b3b8] flex items-end justify-center overflow-hidden shrink-0`}>
      <svg viewBox="0 0 36 40" className="w-[70%] h-[70%]" fill="white"><ellipse cx="18" cy="13" rx="9" ry="10"/><ellipse cx="18" cy="42" rx="18" ry="15"/></svg>
    </div>
  );
}

function Toast({ message, variant = "success" }: { message: string; variant?: "success" | "error" }) {
  return (
    <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 ${variant === "error" ? "bg-red-600" : "bg-slate-900"}`} style={{ animation: "slideUp .25s ease" }}>
      <span className={variant === "error" ? "text-red-300" : "text-green-400"}>{variant === "error" ? <Icons.X /> : <Icons.Check />}</span>{message}
    </div>
  );
}

function DotMenu({ items }: { items: { label: string; icon?: React.ReactNode; danger?: boolean; onClick: () => void }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"><Icons.MoreHorizontal /></button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[180px]">
            {items.map(it => (
              <button key={it.label} onClick={() => { it.onClick(); setOpen(false); }} className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium hover:bg-slate-50 transition-colors text-left ${it.danger ? "text-red-500" : "text-slate-700"}`}>
                {it.icon && <span className={it.danger ? "text-red-400" : "text-slate-400"}>{it.icon}</span>}{it.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BackButton({ label = "Back", onClick }: { label?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-sm font-semibold text-slate-400 hover:text-slate-700 transition-colors mb-5 group">
      <span className="group-hover:-translate-x-0.5 transition-transform"><Icons.ChevronLeft /></span>{label}
    </button>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────
function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-6 max-w-3xl mx-auto pb-24 lg:pb-8">{children}</div>;
}
function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div><h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>{subtitle && <p className="text-sm text-slate-400 font-medium mt-0.5">{subtitle}</p>}</div>
      {action}
    </div>
  );
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">{children}</p>;
}

// ─── TapIn Logomark ───────────────────────────────────────────────────────────
function TapInMark({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <div className={`${className} rounded-lg bg-green-600 flex items-center justify-center shadow-sm shrink-0`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-[55%] h-[55%]">
        <path d="M9 12l2 2 4-4"/><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M3 9h18"/>
      </svg>
    </div>
  );
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────
function TopBar({ user, onNav }: { user: User | null; onNav: (p: Page) => void }) {
  const dest = user?.role === "admin" ? "admin-dashboard" : user ? "dashboard" : "landing";
  return (
    <header className="h-12 sticky top-0 z-40 bg-white border-b border-slate-100 flex items-center justify-between px-5 gap-4 shrink-0">
      <button className="flex items-center gap-2.5" onClick={() => onNav(dest)}>
        <TapInMark />
        <div className="flex flex-col leading-none">
          <span className="text-sm font-bold text-slate-900 tracking-tight">TapIn</span>
          <span className="text-[9px] text-slate-400 font-medium hidden sm:block leading-tight">Attendance &amp; Fee Tracking</span>
        </div>
      </button>
      <div>
        {user ? (
          <button onClick={() => onNav("profile")} className="rounded-full ring-2 ring-transparent hover:ring-green-200 transition-all">
            <ProfileIcon size="sm" />
          </button>
        ) : (
          <button onClick={() => onNav("login")} className="text-xs font-semibold text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">Sign in</button>
        )}
      </div>
    </header>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ page, user, onNav, onLogout }: { page: Page; user: User | null; onNav: (p: Page) => void; onLogout: () => void }) {
  if (!user) return null;
  const isAdmin = user.role === "admin";
  const nav = isAdmin ? [
    { p: "admin-dashboard" as Page,       l: "Overview",        I: Icons.Home },
    { p: "admin-events" as Page,          l: "Events",          I: Icons.Calendar },
    { p: "admin-scanner" as Page,         l: "QR Scanner",      I: Icons.Scan },
    { p: "admin-attendees" as Page,       l: "Attendees",       I: Icons.Users },
    { p: "admin-students" as Page,        l: "Students",        I: Icons.User },
    { p: "admin-announcements" as Page,   l: "Announcements",   I: Icons.Bell },
    { p: "admin-excuse-requests" as Page, l: "Excuse Requests", I: Icons.FileText },
    { p: "admin-reports" as Page,         l: "Reports",         I: Icons.BarChart },
  ] : [
    { p: "dashboard" as Page,          l: "Home",          I: Icons.Home },
    { p: "events" as Page,             l: "Events",        I: Icons.Calendar },
    { p: "my-qr" as Page,              l: "My QR Code",    I: Icons.QrCode },
    { p: "announcements" as Page,      l: "Announcements", I: Icons.Bell },
    { p: "attendance-history" as Page, l: "Attendance",    I: Icons.CheckCircle },
    { p: "my-fines" as Page,           l: "My Fines",      I: Icons.Peso },
    { p: "profile" as Page,            l: "Profile",       I: Icons.User },
  ];
  return (
    <aside className="hidden lg:flex flex-col w-52 shrink-0 border-r border-slate-100 bg-white h-full">
      <nav className="flex-1 px-2 pt-4 pb-2 space-y-0.5 overflow-y-auto">
        {nav.map(({ p, l, I }) => {
          const active = page === p;
          return (
            <button key={p + l} onClick={() => onNav(p)} className={`w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm transition-all ${active ? "bg-slate-100 text-slate-900 font-semibold" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium"}`}>
              <span className={active ? "text-green-600" : "text-slate-400"}><I /></span>{l}
            </button>
          );
        })}
      </nav>
      <div className="px-2 py-3 border-t border-slate-100 space-y-0.5">
        <button onClick={() => onNav("profile")} className="w-full flex items-center gap-2.5 px-3 h-10 rounded-lg hover:bg-slate-50 transition-colors">
          <ProfileIcon size="xs" />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-semibold text-slate-800 truncate">{fullName(user) || "Set up profile"}</p>
            <p className="text-[10px] text-slate-400 truncate">{user.studentId || "No ID yet"}</p>
          </div>
        </button>
        <button onClick={onLogout} className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
          <span className="text-slate-300"><Icons.LogOut /></span>Sign out
        </button>
      </div>
    </aside>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────
function BottomNav({ page, user, onNav }: { page: Page; user: User | null; onNav: (p: Page) => void }) {
  if (!user) return null;
  const isAdmin = user.role === "admin";
  const items = isAdmin ? [
    { p: "admin-dashboard" as Page, l: "Home",     I: Icons.Home },
    { p: "admin-events" as Page,    l: "Events",   I: Icons.Calendar },
    { p: "admin-scanner" as Page,   l: "Scan",     I: Icons.Scan },
    { p: "admin-students" as Page,  l: "Students", I: Icons.Users },
    { p: "admin-reports" as Page,   l: "Reports",  I: Icons.BarChart },
  ] : [
    { p: "dashboard" as Page,          l: "Home",    I: Icons.Home },
    { p: "events" as Page,             l: "Events",  I: Icons.Calendar },
    { p: "my-qr" as Page,              l: "QR",      I: Icons.QrCode },
    { p: "my-fines" as Page,           l: "Fines",   I: Icons.Peso },
    { p: "profile" as Page,            l: "Profile", I: Icons.User },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 flex lg:hidden">
      {items.map(({ p, l, I }) => {
        const active = page === p;
        return <button key={p} onClick={() => onNav(p)} className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors ${active ? "text-green-600" : "text-slate-400"}`}><I />{l}</button>;
      })}
    </nav>
  );
}

// ─── QR Matrix ────────────────────────────────────────────────────────────────
const QR_CELLS = [
  [1,1,1,1,1,1,1,0,1,0,0,1,0,0,1,1,1,1,1,1,1],[1,0,0,0,0,0,1,0,0,1,0,0,1,0,1,0,0,0,0,0,1],
  [1,0,1,1,1,0,1,0,1,0,1,1,0,0,1,0,1,1,1,0,1],[1,0,1,1,1,0,1,0,0,0,1,0,1,0,1,0,1,1,1,0,1],
  [1,0,1,1,1,0,1,0,1,1,0,1,0,0,1,0,1,1,1,0,1],[1,0,0,0,0,0,1,0,0,1,1,0,0,0,1,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],[0,0,0,0,0,0,0,0,1,1,0,1,1,0,0,0,0,0,0,0,0],
  [1,0,1,1,0,1,1,1,0,0,1,0,1,1,1,0,1,0,1,1,0],[0,1,0,0,1,0,0,0,1,1,0,1,0,0,0,1,0,1,0,0,1],
  [1,1,1,0,1,1,1,0,0,1,1,0,1,1,1,0,0,1,1,0,1],[0,0,1,0,0,1,0,1,1,0,0,1,0,0,1,1,1,0,0,1,0],
  [1,0,0,1,1,0,1,0,1,1,1,0,1,0,0,0,1,0,1,0,1],[0,0,0,0,0,0,0,0,1,0,0,1,1,0,1,1,0,1,0,1,0],
  [1,1,1,1,1,1,1,0,0,1,1,0,0,0,1,0,1,0,0,1,1],[1,0,0,0,0,0,1,0,1,0,0,1,0,1,1,0,0,1,1,0,0],
  [1,0,1,1,1,0,1,0,0,1,1,0,1,0,0,1,1,0,0,1,0],[1,0,1,1,1,0,1,0,1,0,0,1,0,1,1,0,1,1,0,0,1],
  [1,0,1,1,1,0,1,0,0,1,1,0,1,0,0,1,0,0,1,1,0],[1,0,0,0,0,0,1,0,1,0,0,1,1,0,1,0,1,0,0,1,1],
  [1,1,1,1,1,1,1,0,0,1,0,0,0,1,0,1,0,1,1,0,1],
];
function QRSvg({ size }: { size: number }) {
  const cell = size / 21;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {QR_CELLS.map((row, r) => row.map((v, c) => v ? <rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell} height={cell} fill="#111827" /> : null))}
    </svg>
  );
}

// ─── LANDING ──────────────────────────────────────────────────────────────────
function LandingPage({ onNav }: { onNav: (p: Page) => void }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-green-50 to-transparent rounded-full blur-3xl opacity-60 pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" style={{ animation: "pulse 2s infinite" }} />AY 2026–2027 · 1st Semester
          </div>
          <div className="flex items-center justify-center gap-3 mb-4"><TapInMark className="w-14 h-14" /></div>
          <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-2">TapIn</h1>
          <p className="text-base font-semibold text-slate-400 mb-6">Student Event Attendance &amp; Fee Tracking System</p>
          <p className="text-slate-500 text-lg max-w-lg mx-auto mb-10 leading-relaxed">One QR code per student. Real-time attendance logging. Automatic fee tracking.</p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => onNav("login")} className="h-11 px-6 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-px">Get started</button>
            <button onClick={() => onNav("events")} className="h-11 px-6 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all">Browse events</button>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { I: Icons.QrCode, t: "Personal QR Code",       d: "Each student gets a unique QR code tied to their profile. Present it at any event entrance for instant logging." },
            { I: Icons.Scan,   t: "Instant scan & confirm", d: "Admins scan student QR codes in real time with automatic duplicate detection and confirmation." },
            { I: Icons.Peso,   t: "Automatic fee tracking", d: "Absent students are fined per event policy. Students can view, track, and clear fees from their personal dashboard." },
          ].map(f => (
            <div key={f.t} className="bg-white border border-slate-100 rounded-2xl p-6 hover:border-slate-200 hover:shadow-sm transition-all">
              <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center text-green-600 mb-4"><f.I /></div>
              <h3 className="font-semibold text-slate-900 text-sm mb-1.5">{f.t}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginPage({ onLogin, onBack }: { onLogin: (role: Role) => void; onBack: () => void }) {
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const proceed = (m: string) => { setLoading(m); setTimeout(() => { setLoading(null); onLogin(role); }, 1100); };
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8faf9]">
      <div className="w-full max-w-sm">
        {!role && (
          <>
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4"><TapInMark className="w-12 h-12" /></div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome to TapIn</h1>
              <p className="text-xs text-slate-400 font-medium">Student Event Attendance &amp; Fee Tracking System</p>
            </div>
            <div className="space-y-3">
              <button onClick={() => setRole("student")} className="w-full bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 text-left hover:border-green-300 hover:shadow-sm transition-all group">
                <div className="w-12 h-12 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center text-green-600 shrink-0 group-hover:bg-green-100 transition-colors"><Icons.User /></div>
                <div className="flex-1"><p className="font-semibold text-slate-900 text-sm">Login as Student</p><p className="text-xs text-slate-400 font-medium mt-0.5">View events, show QR code, track attendance</p></div>
                <span className="text-slate-300 group-hover:text-green-500 transition-colors"><Icons.ChevronRight /></span>
              </button>
              <button onClick={() => setRole("admin")} className="w-full bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 text-left hover:border-slate-300 hover:shadow-sm transition-all group">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 group-hover:bg-slate-200 transition-colors"><Icons.Shield /></div>
                <div className="flex-1"><p className="font-semibold text-slate-900 text-sm">Login as Admin</p><p className="text-xs text-slate-400 font-medium mt-0.5">Manage events, scan QR codes, view reports</p></div>
                <span className="text-slate-300 group-hover:text-slate-500 transition-colors"><Icons.ChevronRight /></span>
              </button>
              <p className="text-xs text-slate-400 text-center pt-1">New student? <button onClick={() => setRole("student")} className="text-green-600 font-semibold hover:text-green-700">Create an account</button></p>
              <button onClick={onBack} className="w-full text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-1 pt-1"><Icons.ChevronLeft />Back to home</button>
            </div>
          </>
        )}
        {role && (
          <>
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4"><TapInMark className="w-12 h-12" /></div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">{role === "student" ? "Student login" : "Admin login"}</h1>
              <p className="text-sm text-slate-400">Choose how you would like to sign in</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <button onClick={() => proceed("google")} disabled={!!loading} className="w-full h-12 flex items-center justify-center gap-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50">
                {loading === "google" ? <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /> : <Icons.Google />}Continue with Google
              </button>
              <div className="flex items-center gap-3"><div className="flex-1 h-px bg-slate-100" /><span className="text-[11px] text-slate-400 font-semibold uppercase tracking-widest">or</span><div className="flex-1 h-px bg-slate-100" /></div>
              {role === "student" ? (
                <button onClick={() => proceed("id")} disabled={!!loading} className="w-full h-12 flex items-center justify-center gap-2.5 bg-green-600 hover:bg-green-700 rounded-xl text-sm font-semibold text-white transition-all shadow-sm disabled:opacity-50">
                  {loading === "id" ? <div className="w-4 h-4 border-2 border-green-300 border-t-white rounded-full animate-spin" /> : <Icons.QrCode />}Continue with Student ID
                </button>
              ) : (
                <button onClick={() => proceed("email")} disabled={!!loading} className="w-full h-12 flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-sm font-semibold text-white transition-all shadow-sm disabled:opacity-50">
                  {loading === "email" ? <div className="w-4 h-4 border-2 border-slate-600 border-t-white rounded-full animate-spin" /> : <Icons.Mail />}Continue with Email &amp; Password
                </button>
              )}
              <button onClick={() => setRole(null)} className="w-full text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors pt-1 flex items-center justify-center gap-1"><Icons.ChevronLeft />Back</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
interface OBForm { firstName: string; middleInitial: string; surname: string; phone: string; contactEmail: string; studentId: string; program: string; yearLevel: string; section: string; }

function OnboardingPage({ onComplete }: { onComplete: (d: OBForm) => void }) {
  const [step, setStep] = useState(1);
  const [f, setF] = useState<OBForm>({ firstName: "", middleInitial: "", surname: "", phone: "", contactEmail: "", studentId: "", program: "", yearLevel: "", section: "" });
  const set = (k: keyof OBForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(p => ({ ...p, [k]: e.target.value }));
  const steps = [
    { t: "Your name",           d: "Enter your full name as it appears on your school ID." },
    { t: "Contact information", d: "Used for important notices and updates." },
    { t: "Student ID",          d: "Your 7-digit school-issued ID number." },
    { t: "Enrollment details",  d: "Used to group attendance records by program and section." },
  ];
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8faf9]">
      <div className="w-full max-w-md">
        <div className="mb-6"><div className="flex gap-1 mb-3">{steps.map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < step ? "bg-green-600" : "bg-slate-200"}`} />)}</div><p className="text-xs text-slate-400 font-medium">Step {step} of {steps.length}</p></div>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100"><h2 className="font-bold text-slate-900 text-lg">{steps[step - 1].t}</h2><p className="text-sm text-slate-400 mt-0.5">{steps[step - 1].d}</p></div>
          <div className="px-6 py-5 space-y-4">
            {step === 1 && (<><div className="grid grid-cols-3 gap-3"><div className="col-span-2"><FieldInput label="First Name" placeholder="e.g. Maria Luisa" value={f.firstName} onChange={set("firstName")} /></div><FieldInput label="M.I." placeholder="A" maxLength={2} value={f.middleInitial} onChange={set("middleInitial")} /></div><FieldInput label="Surname" placeholder="e.g. Santos" value={f.surname} onChange={set("surname")} /></>)}
            {step === 2 && (<><FieldInput label="Phone" type="tel" placeholder="e.g. 09XX XXX XXXX" value={f.phone} onChange={set("phone")} /><FieldInput label="Email" type="email" placeholder="e.g. student@email.com" value={f.contactEmail} onChange={set("contactEmail")} /></>)}
            {step === 3 && <FieldInput label="Student ID (7 digits, starts with 244...)" placeholder="e.g. 2440001" value={f.studentId} onChange={set("studentId")} />}
            {step === 4 && (<><FieldSelect label="Program" value={f.program} onChange={set("program")}><option value="">Select program</option><option>BSIT — Information Technology</option><option>BSCS — Computer Science</option><option>BSBA — Business Administration</option><option>BSEd — Secondary Education</option><option>BSHM — Hospitality Management</option></FieldSelect><FieldSelect label="Year Level" value={f.yearLevel} onChange={set("yearLevel")}><option value="">Select year level</option><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option></FieldSelect><FieldInput label="Section" placeholder="e.g. IT-2A" value={f.section} onChange={set("section")} /></>)}
          </div>
          <div className="px-6 pb-5 flex gap-2.5">
            {step > 1 && <button onClick={() => setStep(s => s - 1)} className="h-10 px-4 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-1.5"><Icons.ChevronLeft />Back</button>}
            <button onClick={() => step < steps.length ? setStep(s => s + 1) : onComplete(f)} className="flex-1 h-10 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-all shadow-sm">{step === steps.length ? "Complete setup" : "Continue"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── EXCUSE MODAL ─────────────────────────────────────────────────────────────
function ExcuseModal({ record, onClose, onSubmit }: { record: typeof ATTENDANCE_RECORDS[0]; onClose: () => void; onSubmit: (r: ExcuseRequest) => void }) {
  const [reason, setReason] = useState(""); const [file, setFile] = useState<File | null>(null); const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100"><div><p className="font-bold text-slate-900 text-base">Request Excuse</p><p className="text-xs text-slate-400 mt-0.5 truncate max-w-[240px]">{record.event}</p></div><button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><Icons.X /></button></div>
        <div className="px-5 py-4 space-y-4">
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-3"><span className="text-red-400 shrink-0"><Icons.XCircle /></span><div><p className="text-sm font-semibold text-slate-900">Marked Absent</p><p className="text-xs text-slate-400">{record.date}</p></div></div>
          <FieldTextarea label="Reason" placeholder="Describe why you were unable to attend..." rows={4} value={reason} onChange={e => setReason(e.target.value)} />
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Document <span className="text-slate-300 normal-case tracking-normal">(optional)</span></label>
            <input ref={ref} type="file" accept="image/*,.pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            <button onClick={() => ref.current?.click()} className="w-full h-10 border-2 border-dashed border-slate-200 rounded-xl text-sm font-medium text-slate-400 hover:border-green-400 hover:text-green-600 transition-all flex items-center justify-center gap-2"><Icons.Paperclip />{file ? file.name : "Attach photo or PDF"}</button>
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2.5">
          <button onClick={onClose} className="h-10 px-4 border border-slate-200 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-50">Cancel</button>
          <button onClick={() => { if (!reason.trim()) return; onSubmit({ id: Date.now().toString(), studentName: "Maria Luisa Santos", studentId: "2440014", event: record.event, date: record.date, reason, proofName: file ? file.name : null, status: "pending", submittedDate: "Aug 22, 2026" }); onClose(); }} disabled={!reason.trim()} className="flex-1 h-10 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg disabled:opacity-40 flex items-center justify-center gap-2"><Icons.Send />Submit</button>
        </div>
      </div>
    </div>
  );
}

// ─── Student Profile Modal (for admin) ────────────────────────────────────────
function StudentProfileModal({ student, onClose }: { student: StudentProfile; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100"><p className="font-bold text-slate-900">Student Profile</p><button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><Icons.X /></button></div>
        <div className="px-5 py-5">
          <div className="flex items-center gap-4 mb-5">
            <Avatar name={student.name} size="lg" />
            <div>
              <p className="font-bold text-slate-900 text-lg leading-tight">{student.name}</p>
              <p className="text-sm text-slate-400 font-medium">{student.id}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">{[student.program, student.yearLevel, student.section].filter(Boolean).map(t => <span key={t} className="text-[11px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded">{t}</span>)}</div>
            </div>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
            {[{ l: "Phone", v: student.phone }, { l: "Email", v: student.email }, { l: "Joined TapIn", v: student.joinedDate }].map((f, i, arr) => (
              <div key={f.l} className={`flex items-center justify-between px-4 py-3 ${i < arr.length - 1 ? "border-b border-slate-50" : ""}`}>
                <span className="text-xs font-semibold text-slate-400">{f.l}</span>
                <span className="text-sm font-semibold text-slate-900 text-right max-w-[60%] truncate">{f.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── STUDENT: Dashboard ───────────────────────────────────────────────────────
function DashboardPage({ user, onNav, fines }: { user: User; onNav: (p: Page) => void; fines: FineRecord[] }) {
  const nextEvent = INITIAL_EVENTS.find(e => e.status !== "closed");
  const unpaidFines = fines.filter(f => f.status === "unpaid");
  const total = unpaidFines.reduce((s, f) => s + f.amount, 0);
  return (
    <PageShell>
      <div className="mb-7"><p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Aug 22, 2026 · Friday</p><h1 className="text-2xl font-bold text-slate-900">Good morning, {user.firstName || "there"}.</h1></div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[{ l: "Present", v: "2" }, { l: "Absent", v: "2" }, { l: "Upcoming", v: "2" }].map(s => (<div key={s.l} className="bg-white border border-slate-100 rounded-xl px-4 py-4"><p className="text-2xl font-bold text-slate-900">{s.v}</p><p className="text-[11px] text-slate-400 font-semibold mt-1 leading-tight">{s.l}</p></div>))}
      </div>
      {unpaidFines.length > 0 && (
        <button onClick={() => onNav("my-fines")} className="w-full bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between mb-5 hover:bg-red-100 transition-all group">
          <div className="flex items-center gap-3"><div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center text-red-500 shrink-0"><Icons.Peso /></div><div className="text-left"><p className="text-sm font-bold text-red-700">Unpaid fines — ₱{total.toLocaleString()}</p><p className="text-xs text-red-500 mt-0.5">{unpaidFines.length} outstanding fine{unpaidFines.length > 1 ? "s" : ""}</p></div></div>
          <span className="text-red-400 group-hover:text-red-600"><Icons.ChevronRight /></span>
        </button>
      )}
      {nextEvent && (
        <button onClick={() => onNav("events")} className="w-full bg-green-600 hover:bg-green-700 rounded-xl p-5 text-left text-white transition-all mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-3"><Badge status={nextEvent.status} /><span className="text-green-300 text-xs font-medium">Up next</span></div>
          <h2 className="font-semibold text-base leading-snug mb-3">{nextEvent.title}</h2>
          <div className="flex flex-wrap gap-4 text-sm text-green-200 font-medium"><span className="flex items-center gap-1.5"><Icons.Calendar />{nextEvent.date}</span><span className="flex items-center gap-1.5"><Icons.MapPin />{nextEvent.location}</span></div>
          <p className="text-green-300 text-xs mt-3 font-medium">₱{nextEvent.fineAmount} fine for non-attendance</p>
        </button>
      )}
      <button onClick={() => onNav("my-qr")} className="w-full bg-white border border-slate-100 rounded-xl px-5 py-4 flex items-center justify-between hover:border-slate-200 hover:shadow-sm transition-all mb-5 group">
        <div className="flex items-center gap-4"><div className="w-10 h-10 bg-green-50 border border-green-100 rounded-xl flex items-center justify-center text-green-600"><Icons.QrCode /></div><div className="text-left"><p className="text-sm font-semibold text-slate-900">My QR Code</p><p className="text-xs text-slate-400 mt-0.5">Show or download your attendance code</p></div></div>
        <span className="text-slate-300 group-hover:text-slate-500"><Icons.ChevronRight /></span>
      </button>
      <div className="flex items-center justify-between mb-3"><p className="text-sm font-semibold text-slate-900">Latest announcements</p><button onClick={() => onNav("announcements")} className="text-xs text-green-600 font-semibold hover:text-green-700 flex items-center gap-0.5">View all<Icons.ChevronRight /></button></div>
      <div className="space-y-2">
        {INITIAL_ANNOUNCEMENTS.slice(0, 2).map(a => (
          <div key={a.id} className="bg-white border border-slate-100 rounded-xl px-4 py-3.5">
            <div className="flex items-center justify-between mb-1.5"><span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded uppercase tracking-wide">{a.badge}</span><span className="text-[11px] text-slate-400">{a.date}</span></div>
            <p className="text-sm font-semibold text-slate-900">{a.title}</p>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

// ─── STUDENT: Events (fines hidden for public/unauthenticated) ────────────────
function EventsPage({ onNav, onSelectEvent, user }: { onNav: (p: Page) => void; onSelectEvent: (id: string) => void; user: User | null }) {
  const [filter, setFilter] = useState("all");
  const items = filter === "all" ? INITIAL_EVENTS : INITIAL_EVENTS.filter(e => e.status === filter);
  const showFines = user?.role === "student";
  return (
    <PageShell>
      <PageHeader title="Events" subtitle="AY 2026–2027, 1st Semester" />
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {[{ k: "all", l: "All" }, { k: "active", l: "Live" }, { k: "upcoming", l: "Upcoming" }, { k: "closed", l: "Ended" }].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)} className={`shrink-0 h-8 px-3.5 rounded-lg text-xs font-semibold transition-all ${filter === f.k ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"}`}>{f.l}</button>
        ))}
      </div>
      <div className="space-y-3">
        {items.map(e => (
          <div key={e.id} className="bg-white border border-slate-100 rounded-xl p-5 cursor-pointer hover:border-slate-200 hover:shadow-sm transition-all" onClick={() => { onSelectEvent(e.id); onNav("event-detail"); }}>
            <div className="flex items-start justify-between mb-3"><Badge status={e.status} />{e.attendees > 0 && <span className="text-xs text-slate-400">{e.attendees} attended</span>}</div>
            <h3 className="font-semibold text-slate-900 mb-1.5 leading-snug">{e.title}</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed line-clamp-2">{e.description}</p>
            <div className="flex flex-wrap gap-4 text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1.5"><Icons.Calendar />{e.date}</span>
              <span className="flex items-center gap-1.5"><Icons.Clock />{e.time}</span>
              <span className="flex items-center gap-1.5"><Icons.MapPin />{e.location}</span>
              {showFines && e.fineAmount > 0 && <span className="flex items-center gap-1.5 text-red-400 font-semibold"><Icons.Peso />₱{e.fineAmount} fine</span>}
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

// ─── STUDENT: Event Detail ────────────────────────────────────────────────────
function EventDetailPage({ eventId, user, onBack }: { eventId: string; user: User | null; onBack: () => void }) {
  const ev = INITIAL_EVENTS.find(e => e.id === eventId) ?? INITIAL_EVENTS[0];
  const showFines = user?.role === "student";
  return (
    <PageShell>
      <BackButton onClick={onBack} label="Back to Events" />
      <div className="bg-green-600 rounded-xl p-6 text-white mb-4 shadow-sm">
        <Badge status={ev.status} />
        <h1 className="font-bold text-xl mt-3 mb-4 leading-snug">{ev.title}</h1>
        <div className="grid grid-cols-2 gap-3">
          {[{ l: "DATE", v: ev.date }, { l: "TIME", v: ev.time }].map(d => (<div key={d.l} className="bg-white/10 rounded-lg px-3 py-2.5"><p className="text-green-300 text-[10px] font-bold uppercase tracking-widest mb-1">{d.l}</p><p className="text-sm font-semibold">{d.v}</p></div>))}
          <div className="bg-white/10 rounded-lg px-3 py-2.5 col-span-2"><p className="text-green-300 text-[10px] font-bold uppercase tracking-widest mb-1">LOCATION</p><p className="text-sm font-semibold">{ev.location}</p></div>
          {showFines && ev.fineAmount > 0 && <div className="bg-white/10 rounded-lg px-3 py-2.5 col-span-2"><p className="text-green-300 text-[10px] font-bold uppercase tracking-widest mb-1">ABSENCE FEE</p><p className="text-sm font-semibold">₱{ev.fineAmount}</p></div>}
        </div>
      </div>
      <div className="bg-white border border-slate-100 rounded-xl p-5 mb-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">About</p>
        <p className="text-sm text-slate-600 leading-relaxed">{ev.description}</p>
        <p className="text-xs text-slate-400 mt-3">For: {ev.program}</p>
      </div>
      {user && ev.status === "active" && (
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3.5 flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-600 shrink-0"><Icons.QrCode /></div>
          <div><p className="text-sm font-semibold text-slate-900">Ready to attend?</p><p className="text-xs text-slate-500 mt-0.5">Show your QR code at the entrance to log attendance.</p></div>
        </div>
      )}
    </PageShell>
  );
}

// ─── STUDENT: My QR ───────────────────────────────────────────────────────────
function MyQRPage({ user, qrVersion, onBack }: { user: User; qrVersion: number; onBack: () => void }) {
  const name = fullName(user);
  const handleDownload = () => {
    const size = 240, pad = 24, footH = 72, dpr = 2;
    const canvas = document.createElement("canvas");
    canvas.width = (size + pad * 2) * dpr; canvas.height = (size + pad * 2 + footH) * dpr;
    const ctx = canvas.getContext("2d")!; ctx.scale(dpr, dpr);
    const W = size + pad * 2;
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.roundRect(0, 0, W, size + pad * 2 + footH, 16); ctx.fill();
    const cell = size / 21; ctx.fillStyle = "#111827";
    QR_CELLS.forEach((row, r) => row.forEach((v, c) => { if (v) ctx.fillRect(pad + c * cell, pad + r * cell, cell, cell); }));
    ctx.strokeStyle = "#f1f5f9"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad, size + pad + 12); ctx.lineTo(W - pad, size + pad + 12); ctx.stroke();
    ctx.fillStyle = "#111827"; ctx.font = `bold 13px sans-serif`; ctx.textAlign = "center";
    ctx.fillText(name, W / 2, size + pad + 32);
    ctx.fillStyle = "#94a3b8"; ctx.font = `11px sans-serif`;
    ctx.fillText(`${user.studentId} · ${user.program} ${user.yearLevel}`, W / 2, size + pad + 50);
    ctx.fillStyle = "#16a34a"; ctx.font = `bold 10px sans-serif`;
    ctx.fillText("TapIn · Student Attendance & Fee Tracking System", W / 2, size + pad + 66);
    const a = document.createElement("a"); a.download = `tapin-qr-${user.studentId}-v${qrVersion}.png`; a.href = canvas.toDataURL("image/png"); a.click();
  };
  return (
    <PageShell>
      <BackButton onClick={onBack} label="Back to Home" />
      <PageHeader title="My QR Code" subtitle="Present at event entrances to log attendance." />
      <div className="max-w-xs mx-auto">
        <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center shadow-sm relative">
          {qrVersion > 1 && <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 bg-green-500 rounded-full" />Renewed</div>}
          <div className="flex justify-center mb-5"><QRSvg size={192} /></div>
          <div className="border-t border-slate-100 pt-4">
            <p className="font-bold text-slate-900">{name || "Your name"}</p>
            <p className="text-sm text-slate-400 mt-0.5">{user.studentId || "No ID set"}</p>
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2.5">{[user.program, user.yearLevel, user.section].filter(Boolean).map(t => <span key={t} className="text-[11px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded">{t}</span>)}</div>
          </div>
        </div>
        <div className="mt-3"><button onClick={handleDownload} className="w-full h-10 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"><Icons.Download />Download QR as PNG</button></div>
        <div className="mt-4 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 flex items-start gap-3">
          <span className="text-slate-400 shrink-0 mt-0.5"><Icons.AlertCircle /></span>
          <p className="text-xs text-slate-500 leading-relaxed">Updating your profile regenerates this QR. <span className="font-semibold text-slate-700">Previously downloaded images will no longer be valid.</span></p>
        </div>
      </div>
    </PageShell>
  );
}

// ─── STUDENT: Announcements ───────────────────────────────────────────────────
function AnnouncementsPage({ onBack }: { onBack: () => void }) {
  return (
    <PageShell>
      <BackButton onClick={onBack} label="Back" />
      <PageHeader title="Announcements" />
      <div className="space-y-3">
        {INITIAL_ANNOUNCEMENTS.map(a => (
          <div key={a.id} className="bg-white border border-slate-100 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3"><span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded uppercase tracking-wide">{a.badge}</span><span className="text-[11px] text-slate-400">{a.date}</span></div>
            <h3 className="font-semibold text-slate-900 mb-2">{a.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{a.body}</p>
            <p className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-50">Posted by {a.author}</p>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

// ─── STUDENT: Attendance ──────────────────────────────────────────────────────
function AttendanceHistoryPage({ excuseRequests, fines, onSubmitExcuse, onBack }: { excuseRequests: ExcuseRequest[]; fines: FineRecord[]; onSubmitExcuse: (r: ExcuseRequest) => void; onBack: () => void }) {
  const [modal, setModal] = useState<typeof ATTENDANCE_RECORDS[0] | null>(null);
  return (
    <PageShell>
      <BackButton onClick={onBack} label="Back to Home" />
      <PageHeader title="My Attendance" subtitle="AY 2026–2027, 1st Semester" />
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden mb-5">
        {ATTENDANCE_RECORDS.map((r, i) => {
          const req = excuseRequests.find(x => x.event === r.event);
          const eff = req?.status === "approved" ? "excused" : req ? "pending" : r.status;
          const fine = fines.find(f => f.eventId === r.eventId);
          return (
            <div key={r.id} className={`flex items-center gap-4 px-5 py-4 ${i < ATTENDANCE_RECORDS.length - 1 ? "border-b border-slate-50" : ""}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${eff === "present" ? "bg-green-50 text-green-600" : eff === "absent" ? "bg-red-50 text-red-400" : eff === "excused" ? "bg-violet-50 text-violet-500" : "bg-amber-50 text-amber-500"}`}>{eff === "present" ? <Icons.Check /> : eff === "excused" ? <Icons.CheckCircle /> : <Icons.XCircle />}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{r.event}</p>
                <p className="text-xs text-slate-400 mt-0.5">{r.date}{r.time !== "—" ? ` · ${r.time}` : ""}</p>
                {fine && eff === "absent" && <p className="text-xs text-red-500 font-semibold mt-0.5">Fee: ₱{fine.amount}</p>}
              </div>
              {eff === "absent" ? <button onClick={() => setModal(r)} className="shrink-0 h-8 px-3 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold rounded-lg flex items-center gap-1.5"><Icons.Send />Excuse</button> : <Badge status={eff} />}
            </div>
          );
        })}
      </div>
      {excuseRequests.length > 0 && (<><SectionLabel>My excuse requests</SectionLabel><div className="space-y-2.5">{excuseRequests.map(r => (<div key={r.id} className="bg-white border border-slate-100 rounded-xl px-5 py-4"><div className="flex items-start justify-between gap-3"><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-900 truncate">{r.event}</p><p className="text-xs text-slate-400 mt-0.5">Submitted {r.submittedDate}</p><p className="text-xs text-slate-500 mt-2 line-clamp-2">{r.reason}</p></div><Badge status={r.status} /></div></div>))}</div></>)}
      {modal && <ExcuseModal record={modal} onClose={() => setModal(null)} onSubmit={r => { onSubmitExcuse(r); setModal(null); }} />}
    </PageShell>
  );
}

// ─── STUDENT: My Fines ────────────────────────────────────────────────────────
function MyFinesPage({ fines, onBack }: { fines: FineRecord[]; onBack: () => void }) {
  const unpaid = fines.filter(f => f.status === "unpaid");
  const total = unpaid.reduce((s, f) => s + f.amount, 0);
  return (
    <PageShell>
      <BackButton onClick={onBack} label="Back to Home" />
      <PageHeader title="My Fines" subtitle="Outstanding fees from missed events." />
      {fines.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-xl px-5 py-12 text-center"><div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-3 text-green-500"><Icons.Check /></div><p className="font-semibold text-slate-900 text-sm">No outstanding fines</p><p className="text-xs text-slate-400 mt-1">Your attendance record is clean.</p></div>
      ) : (<>
        {unpaid.length > 0 && <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 mb-5 flex items-center justify-between"><div><p className="font-bold text-red-800">Total outstanding</p><p className="text-xs text-red-600 mt-0.5">{unpaid.length} unpaid fine{unpaid.length > 1 ? "s" : ""}</p></div><p className="text-2xl font-extrabold text-red-700">₱{total.toLocaleString()}</p></div>}
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
          {fines.map((fine, i) => (
            <div key={fine.id} className={`flex items-center gap-4 px-5 py-4 ${i < fines.length - 1 ? "border-b border-slate-50" : ""}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${fine.status === "unpaid" ? "bg-red-50 text-red-400" : fine.status === "excused" ? "bg-violet-50 text-violet-500" : "bg-green-50 text-green-600"}`}><Icons.Peso /></div>
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-900 truncate">{fine.eventTitle}</p><p className="text-xs text-slate-400 mt-0.5">{fine.eventDate}</p></div>
              <div className="text-right shrink-0"><p className={`text-sm font-bold ${fine.status === "unpaid" ? "text-red-600" : fine.status === "excused" ? "text-violet-600" : "text-green-600"}`}>₱{fine.amount}</p><Badge status={fine.status} /></div>
            </div>
          ))}
        </div>
        <div className="mt-4 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 flex items-start gap-3"><span className="text-slate-400 shrink-0 mt-0.5"><Icons.AlertCircle /></span><p className="text-xs text-slate-500 leading-relaxed">Pay fines at the SSC office or Accounting window. Bring your student ID. Approved excuse requests automatically waive the corresponding fee.</p></div>
      </>)}
    </PageShell>
  );
}

// ─── STUDENT: Profile ─────────────────────────────────────────────────────────
function ProfilePage({ user, onSave, onBack }: { user: User; onSave: (u: User) => void; onBack: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ ...user });
  const setF = (k: keyof User) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setDraft(d => ({ ...d, [k]: e.target.value }));
  return (
    <PageShell>
      <BackButton onClick={onBack} label={user.role === "admin" ? "Back to Overview" : "Back to Home"} />
      <PageHeader title="Profile" action={
        editing ? (
          <div className="flex items-center gap-2">
            <button onClick={() => { setDraft({ ...user }); setEditing(false); }} className="h-9 px-4 border border-slate-200 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-50">Discard</button>
            <button onClick={() => { onSave({ ...user, ...draft }); setEditing(false); }} className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg shadow-sm">Save</button>
          </div>
        ) : <button onClick={() => setEditing(true)} className="h-9 px-4 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 flex items-center gap-1.5"><Icons.Edit />Edit</button>
      } />
      <div className="max-w-sm">
        <div className="bg-white border border-slate-100 rounded-xl p-5 flex items-center gap-4 mb-4">
          <ProfileIcon size="lg" />
          <div><p className="font-bold text-slate-900">{fullName(editing ? draft : user) || "Your name"}</p><p className="text-sm text-slate-400 mt-0.5">{(editing ? draft : user).studentId || "No ID"}</p><div className="flex flex-wrap gap-1.5 mt-2">{[(editing ? draft : user).program, (editing ? draft : user).yearLevel, (editing ? draft : user).section].filter(Boolean).map(t => <span key={t} className="text-[11px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded">{t}</span>)}</div></div>
        </div>
        {!editing ? (
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
            {[{ l: "First name", v: user.firstName }, { l: "Middle initial", v: user.middleInitial ? user.middleInitial + "." : "—" }, { l: "Surname", v: user.surname }, { l: "Student ID", v: user.studentId }, { l: "Program", v: user.program }, { l: "Year level", v: user.yearLevel }, { l: "Section", v: user.section || "—" }, { l: "Phone", v: user.phone || "—" }, { l: "Email", v: user.contactEmail || "—" }].map((f, i, arr) => (
              <div key={f.l} className={`flex items-center justify-between px-5 py-3 ${i < arr.length - 1 ? "border-b border-slate-50" : ""}`}><span className="text-xs font-semibold text-slate-400">{f.l}</span><span className="text-sm font-semibold text-slate-900">{f.v}</span></div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100"><SectionLabel>Name</SectionLabel></div>
            <div className="px-5 py-4 space-y-3"><div className="grid grid-cols-3 gap-3"><div className="col-span-2"><FieldInput label="First Name" value={draft.firstName} onChange={setF("firstName")} /></div><FieldInput label="M.I." value={draft.middleInitial} maxLength={2} onChange={setF("middleInitial")} /></div><FieldInput label="Surname" value={draft.surname} onChange={setF("surname")} /></div>
            <div className="px-5 py-3.5 border-t border-slate-100 border-b border-slate-100"><SectionLabel>Contact</SectionLabel></div>
            <div className="px-5 py-4 space-y-3"><FieldInput label="Phone" type="tel" placeholder="09XX XXX XXXX" value={draft.phone} onChange={setF("phone")} /><FieldInput label="Email" type="email" value={draft.contactEmail} onChange={setF("contactEmail")} /></div>
            <div className="px-5 py-3.5 border-t border-slate-100 border-b border-slate-100"><SectionLabel>Enrollment</SectionLabel></div>
            <div className="px-5 py-4 space-y-3">
              <FieldInput label="Student ID (7 digits)" value={draft.studentId} onChange={setF("studentId")} />
              <FieldSelect label="Program" value={draft.program} onChange={setF("program")}><option value="">Select program</option><option>BSIT — Information Technology</option><option>BSCS — Computer Science</option><option>BSBA — Business Administration</option><option>BSEd — Secondary Education</option><option>BSHM — Hospitality Management</option></FieldSelect>
              <FieldSelect label="Year Level" value={draft.yearLevel} onChange={setF("yearLevel")}><option value="">Select year level</option><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option></FieldSelect>
              <FieldInput label="Section" placeholder="e.g. IT-2A" value={draft.section} onChange={setF("section")} />
            </div>
            <div className="px-5 py-3.5 bg-amber-50 border-t border-amber-100 flex items-start gap-2.5"><span className="text-amber-500 shrink-0 mt-0.5"><Icons.AlertCircle /></span><p className="text-xs text-amber-700 leading-relaxed">Saving changes will regenerate your QR code. Previously downloaded images will be invalidated.</p></div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

// ─── ADMIN: Dashboard ─────────────────────────────────────────────────────────
function AdminDashboard({ onNav, excuseRequests }: { onNav: (p: Page) => void; excuseRequests: ExcuseRequest[] }) {
  const pending = excuseRequests.filter(r => r.status === "pending").length;
  return (
    <PageShell>
      <div className="flex items-start justify-between mb-6">
        <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Aug 22, 2026 · Friday</p><h1 className="text-xl font-bold text-slate-900">Admin Overview</h1><p className="text-sm text-slate-400 mt-0.5">SSC General Assembly is live now</p></div>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full shrink-0"><span className="w-1.5 h-1.5 bg-green-500 rounded-full" style={{ animation: "pulse 2s infinite" }} />Live</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[{ l: "Scanned today", v: "6", sub: "SSC Assembly", c: "text-green-600" }, { l: "Duplicates", v: "1", sub: "Rejected", c: "text-red-500" }, { l: "Active events", v: "1", sub: "Live now", c: "text-sky-600" }, { l: "Students on TapIn", v: String(ALL_STUDENTS.length), sub: "Registered", c: "text-slate-700" }].map(s => (
          <div key={s.l} className="bg-white border border-slate-100 rounded-xl px-4 py-4"><p className={`text-2xl font-bold ${s.c}`}>{s.v}</p><p className="text-xs font-semibold text-slate-600 mt-1">{s.l}</p><p className="text-[10px] text-slate-400 mt-0.5">{s.sub}</p></div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <button onClick={() => onNav("admin-scanner")} className="bg-green-600 hover:bg-green-700 text-white rounded-xl p-5 text-left transition-all shadow-sm hover:shadow-md"><Icons.Scan /><p className="font-semibold text-sm mt-3 mb-0.5">Open Scanner</p><p className="text-green-300 text-xs">Camera-based QR scan</p></button>
        <button onClick={() => onNav("admin-excuse-requests")} className={`border rounded-xl p-5 text-left transition-all relative ${pending > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-slate-100"}`}>
          <Icons.FileText /><p className={`font-semibold text-sm mt-3 mb-0.5 ${pending > 0 ? "text-amber-800" : "text-slate-900"}`}>Excuse Requests</p><p className={`text-xs ${pending > 0 ? "text-amber-600" : "text-slate-400"}`}>{pending > 0 ? `${pending} pending review` : "No pending"}</p>
          {pending > 0 && <span className="absolute top-3 right-3 w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{pending}</span>}
        </button>
      </div>
      <div className="flex items-center justify-between mb-3"><p className="text-sm font-semibold text-slate-900">Recent scans — SSC General Assembly</p><button onClick={() => onNav("admin-attendees")} className="text-xs text-green-600 font-semibold hover:text-green-700 flex items-center gap-0.5">View all<Icons.ChevronRight /></button></div>
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
        {(EVENT_SCANS["2"] ?? []).slice(0, 5).map((s, i) => (
          <div key={i} className={`flex items-center gap-3 px-5 py-3.5 ${i < 4 ? "border-b border-slate-50" : ""}`}>
            <Avatar name={s.name} size="sm" /><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-900 truncate">{s.name}</p><p className="text-[11px] text-slate-400">{s.id} · {s.section}</p></div>
            <span className="text-[11px] text-slate-400 shrink-0">{s.time}</span><Badge status={s.status} />
          </div>
        ))}
      </div>
    </PageShell>
  );
}

// ─── ADMIN: Events ────────────────────────────────────────────────────────────
interface NewEventDraft { title: string; date: string; time: string; location: string; description: string; program: string; fineAmount: string; photos: File[]; videos: File[]; }

function AdminEventsPage({ onNav }: { onNav: (p: Page) => void }) {
  const [events, setEvents] = useState<EventData[]>(INITIAL_EVENTS.map(e => ({ ...e })));
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EventData | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const editPhotoRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<NewEventDraft>({ title: "", date: "", time: "", location: "", description: "", program: "All Programs", fineAmount: "0", photos: [], videos: [] });
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [videoNames, setVideoNames] = useState<string[]>([]);

  const setD = (k: keyof NewEventDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setDraft(d => ({ ...d, [k]: e.target.value }));
  const handleCreate = () => {
    if (!draft.title || !draft.date) return;
    setEvents(ev => [{ id: Date.now().toString(), title: draft.title, date: draft.date, time: draft.time, location: draft.location, description: draft.description, program: draft.program, status: "upcoming", attendees: 0, fineAmount: parseInt(draft.fineAmount) || 0, mediaUrls: photoUrls }, ...ev]);
    setDraft({ title: "", date: "", time: "", location: "", description: "", program: "All Programs", fineAmount: "0", photos: [], videos: [] });
    setPhotoUrls([]); setVideoNames([]); setShowForm(false);
  };
  const startEdit = (e: EventData) => { setEditId(e.id); setEditDraft({ ...e }); setShowForm(false); };
  const saveEdit = () => { if (!editDraft) return; setEvents(ev => ev.map(e => e.id === editDraft.id ? editDraft : e)); setEditId(null); setEditDraft(null); };
  const deleteEvent = (id: string) => setEvents(ev => ev.filter(e => e.id !== id));
  const setStatus = (id: string, status: EventStatus) => setEvents(ev => ev.map(e => e.id === id ? { ...e, status } : e));

  const statusOptions = (current: EventStatus): { status: EventStatus; label: string; icon: React.ReactNode }[] =>
    ([
      { status: "active"   as EventStatus, label: "Mark as Live",     icon: <Icons.Radio /> },
      { status: "upcoming" as EventStatus, label: "Mark as Upcoming", icon: <Icons.Calendar /> },
      { status: "closed"   as EventStatus, label: "Mark as Ended",    icon: <Icons.Check /> },
    ]).filter(o => o.status !== current);

  return (
    <PageShell>
      <PageHeader title="Events" subtitle="AY 2026–2027, 1st Semester" action={
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setEditDraft(null); }} className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"><Icons.Plus />New event</button>
      } />

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-5">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between"><p className="text-sm font-bold text-slate-900">Create New Event</p><button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><Icons.X /></button></div>
          <div className="px-5 py-4 space-y-3">
            <FieldInput label="Event title *" placeholder="e.g. Foundation Day Celebration" value={draft.title} onChange={setD("title")} />
            <div className="grid grid-cols-2 gap-3"><FieldInput label="Date *" type="date" value={draft.date} onChange={setD("date")} /><FieldInput label="Time" placeholder="e.g. 8:00 AM – 5:00 PM" value={draft.time} onChange={setD("time")} /></div>
            <FieldInput label="Location" placeholder="e.g. Main Gymnasium" value={draft.location} onChange={setD("location")} />
            <div className="grid grid-cols-2 gap-3"><FieldSelect label="Program" value={draft.program} onChange={setD("program")}><option>All Programs</option><option>BSIT / BSCS</option><option>BSIT</option><option>BSCS</option><option>BSBA</option></FieldSelect><FieldInput label="Absence Fee (₱)" type="number" min="0" placeholder="0 = no fee" value={draft.fineAmount} onChange={setD("fineAmount")} /></div>
            <FieldTextarea label="Description" placeholder="What is this event about?" rows={3} value={draft.description} onChange={setD("description")} />
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block mb-2">Media</label>
              <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { const files = Array.from(e.target.files ?? []); setDraft(d => ({ ...d, photos: [...d.photos, ...files] })); files.forEach(f => setPhotoUrls(u => [...u, URL.createObjectURL(f)])); }} />
              <input ref={videoRef} type="file" accept="video/*" multiple className="hidden" onChange={e => { const files = Array.from(e.target.files ?? []); setDraft(d => ({ ...d, videos: [...d.videos, ...files] })); files.forEach(f => setVideoNames(n => [...n, f.name])); }} />
              <div className="flex gap-2"><button onClick={() => photoRef.current?.click()} className="flex-1 h-9 border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:border-green-400 hover:text-green-600 flex items-center justify-center gap-1.5"><Icons.Image />Photos</button><button onClick={() => videoRef.current?.click()} className="flex-1 h-9 border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:border-green-400 hover:text-green-600 flex items-center justify-center gap-1.5"><Icons.Video />Videos</button></div>
              {(photoUrls.length > 0 || videoNames.length > 0) && <div className="mt-2.5 flex flex-wrap gap-2">{photoUrls.map((url, i) => (<div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200"><img src={url} alt="" className="w-full h-full object-cover" /><button onClick={() => { setPhotoUrls(u => u.filter((_, j) => j !== i)); setDraft(d => ({ ...d, photos: d.photos.filter((_, j) => j !== i) })); }} className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px]">×</button></div>))}{videoNames.map((n, i) => (<div key={i} className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-600"><Icons.Video /><span className="max-w-[80px] truncate">{n}</span></div>))}</div>}
            </div>
          </div>
          <div className="px-5 pb-4 flex gap-2.5"><button onClick={handleCreate} disabled={!draft.title || !draft.date} className="flex-1 h-10 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-40">Create event</button><button onClick={() => setShowForm(false)} className="h-10 px-4 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50">Cancel</button></div>
        </div>
      )}

      {editId && editDraft && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-5">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between"><p className="text-sm font-bold text-slate-900">Edit Event</p><button onClick={() => { setEditId(null); setEditDraft(null); }} className="text-slate-400 hover:text-slate-600"><Icons.X /></button></div>
          <div className="px-5 py-4 space-y-3">
            <FieldInput label="Title" value={editDraft.title} onChange={e => setEditDraft(d => d ? { ...d, title: e.target.value } : d)} />
            <div className="grid grid-cols-2 gap-3"><FieldInput label="Date" value={editDraft.date} onChange={e => setEditDraft(d => d ? { ...d, date: e.target.value } : d)} /><FieldInput label="Time" value={editDraft.time} onChange={e => setEditDraft(d => d ? { ...d, time: e.target.value } : d)} /></div>
            <FieldInput label="Location" value={editDraft.location} onChange={e => setEditDraft(d => d ? { ...d, location: e.target.value } : d)} />
            <FieldInput label="Absence Fee (₱)" type="number" min="0" value={editDraft.fineAmount.toString()} onChange={e => setEditDraft(d => d ? { ...d, fineAmount: parseInt(e.target.value) || 0 } : d)} />
            <FieldTextarea label="Description" rows={3} value={editDraft.description} onChange={e => setEditDraft(d => d ? { ...d, description: e.target.value } : d)} />
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block mb-2">Photos</label>
              <input ref={editPhotoRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { Array.from(e.target.files ?? []).forEach(f => { const url = URL.createObjectURL(f); setEditDraft(d => d ? { ...d, mediaUrls: [...(d.mediaUrls ?? []), url] } : d); }); }} />
              {editDraft.mediaUrls && editDraft.mediaUrls.length > 0 && <div className="flex flex-wrap gap-2 mb-2">{editDraft.mediaUrls.map((url, i) => (<div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200"><img src={url} alt="" className="w-full h-full object-cover" /><button onClick={() => setEditDraft(d => d ? { ...d, mediaUrls: d.mediaUrls?.filter((_, j) => j !== i) } : d)} className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px]">×</button></div>))}</div>}
              <button onClick={() => editPhotoRef.current?.click()} className="w-full h-9 border border-dashed border-slate-200 rounded-lg text-xs font-semibold text-slate-400 hover:border-green-400 hover:text-green-600 flex items-center justify-center gap-1.5"><Icons.Image />Add photos</button>
            </div>
          </div>
          <div className="px-5 pb-4 flex gap-2.5"><button onClick={saveEdit} className="flex-1 h-10 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg shadow-sm">Save changes</button><button onClick={() => { setEditId(null); setEditDraft(null); }} className="h-10 px-4 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50">Cancel</button></div>
        </div>
      )}

      <div className="space-y-3">
        {events.map(e => (
          <div key={e.id} className="bg-white border border-slate-100 rounded-xl overflow-hidden">
            {e.mediaUrls && e.mediaUrls.length > 0 && <div className="flex overflow-x-auto">{e.mediaUrls.map((url, i) => <img key={i} src={url} alt="" className="h-32 shrink-0 object-cover" style={{ width: e.mediaUrls!.length === 1 ? "100%" : "50%" }} />)}</div>}
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <Badge status={e.status} />
                <div className="flex items-center gap-2">
                  {e.fineAmount > 0 && <span className="text-xs text-red-500 font-semibold flex items-center gap-0.5"><Icons.Peso />₱{e.fineAmount}</span>}
                  <span className="text-xs text-slate-400">{e.date}</span>
                  <DotMenu items={[
                    ...statusOptions(e.status).map(o => ({ label: o.label, icon: o.icon, onClick: () => setStatus(e.id, o.status) })),
                    { label: "Edit", icon: <Icons.Edit />, onClick: () => startEdit(e) },
                    { label: "Delete", icon: <Icons.Trash />, danger: true, onClick: () => deleteEvent(e.id) },
                  ]} />
                </div>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1.5">{e.title}</h3>
              <div className="flex flex-wrap gap-4 text-xs text-slate-400 mb-4"><span className="flex items-center gap-1.5"><Icons.MapPin />{e.location || "TBA"}</span><span className="flex items-center gap-1.5"><Icons.Clock />{e.time || "TBA"}</span></div>
              <div className="flex gap-2 pt-4 border-t border-slate-50">
                {e.status === "active" && <button onClick={() => onNav("admin-scanner")} className="flex-1 h-9 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 flex items-center justify-center gap-1.5 shadow-sm"><Icons.Scan />Scanner</button>}
                <button onClick={() => onNav("admin-attendees")} className="flex-1 h-9 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 hover:border-slate-300 flex items-center justify-center gap-1.5"><Icons.Users />Attendees{e.attendees > 0 ? ` (${e.attendees})` : ""}</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

// ─── ADMIN: QR Scanner ────────────────────────────────────────────────────────
function AdminScannerPage() {
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [last, setLast] = useState<ScanRecord | null>(null);
  const [scanning, setScanning] = useState(false);
  const activeEvents = INITIAL_EVENTS.filter(e => e.status === "active" || e.status === "upcoming");
  const selectedEvent = INITIAL_EVENTS.find(e => e.id === selectedEventId);
  const eventScans = EVENT_SCANS[selectedEventId] ?? [];
  const simulate = () => {
    setScanning(false);
    const pool = eventScans.length > 0 ? eventScans : [{ name: "Test Student", id: "2440000", program: "BSIT", section: "IT-1A", time: "now", status: "confirmed" as const, dbId: 99 }];
    setLast(pool[Math.floor(Math.random() * pool.length)]);
  };
  return (
    <PageShell>
      <PageHeader title="QR Scanner" subtitle="Select an event, then start scanning." />
      <div className="max-w-xs mx-auto space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100"><p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Select Event</p></div>
          <div className="p-3 space-y-1">
            {activeEvents.map(e => (
              <button key={e.id} onClick={() => { setSelectedEventId(e.id); setLast(null); setScanning(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center gap-3 ${selectedEventId === e.id ? "bg-green-50 border border-green-200" : "border border-transparent hover:bg-slate-50"}`}>
                <div className={`w-2 h-2 rounded-full shrink-0 ${e.status === "active" ? "bg-green-500" : "bg-slate-300"}`} style={e.status === "active" ? { animation: "pulse 2s infinite" } : {}} />
                <div className="flex-1 min-w-0"><p className={`text-sm font-semibold truncate ${selectedEventId === e.id ? "text-green-800" : "text-slate-900"}`}>{e.title}</p><p className={`text-xs mt-0.5 ${selectedEventId === e.id ? "text-green-600" : "text-slate-400"}`}>{e.date}</p></div>
                {selectedEventId === e.id && <span className="text-green-600 shrink-0"><Icons.Check /></span>}
              </button>
            ))}
          </div>
        </div>
        {selectedEventId && (<>
          <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3"><span className="text-green-600 shrink-0"><Icons.Scan /></span><div><p className="text-xs font-bold text-slate-700">Scanning for</p><p className="text-sm font-semibold text-slate-900 truncate max-w-[180px]">{selectedEvent?.title}</p></div></div>
            {selectedEvent?.fineAmount ? <span className="text-xs text-red-500 font-semibold shrink-0">₱{selectedEvent.fineAmount} fee</span> : null}
          </div>
          <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-lg relative" style={{ aspectRatio: "1" }}>
            <style>{`@keyframes scanline{0%,100%{top:12%}50%{top:80%}}`}</style>
            <div className="absolute inset-0 flex items-center justify-center">
              {!scanning && !last && <div className="text-center px-6"><div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3 text-white/50"><Icons.Scan /></div><p className="text-white/50 text-sm">Camera ready</p></div>}
              {scanning && <div className="relative w-48 h-48">{[["top-0 left-0 rounded-tl-lg border-t-2 border-l-2"], ["top-0 right-0 rounded-tr-lg border-t-2 border-r-2"], ["bottom-0 left-0 rounded-bl-lg border-b-2 border-l-2"], ["bottom-0 right-0 rounded-br-lg border-b-2 border-r-2"]].map(([cls], i) => <div key={i} className={`absolute w-6 h-6 border-green-400 ${cls}`} />)}<div className="absolute left-2 right-2 h-px bg-green-400/60" style={{ animation: "scanline 2s ease-in-out infinite" }} /></div>}
              {last && !scanning && <div className="text-center px-8"><div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${last.status === "confirmed" ? "bg-green-500" : "bg-red-500"}`}>{last.status === "confirmed" ? <span className="text-white"><Icons.Check /></span> : <span className="text-white text-xl font-bold">!</span>}</div><p className="text-white font-bold">{last.name}</p><p className="text-white/60 text-sm">{last.id}</p><p className="text-white/40 text-xs mt-0.5">{last.program} · {last.section}</p></div>}
            </div>
          </div>
          {!scanning && !last && <button onClick={() => setScanning(true)} className="w-full h-11 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl shadow-sm flex items-center justify-center gap-2"><Icons.Scan />Start scanning</button>}
          {scanning && <button onClick={simulate} className="w-full h-11 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2"><Icons.Activity />Simulate scan</button>}
          {last && !scanning && (<div className="space-y-2.5"><div className={`rounded-xl px-4 py-3.5 border text-sm ${last.status === "confirmed" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}><div className="flex items-center justify-between"><p className="font-semibold">{last.status === "confirmed" ? "Attendance confirmed" : "Duplicate — rejected"}</p><Badge status={last.status} /></div><p className="text-xs mt-0.5 opacity-60">Scanned at {last.time}</p></div><button onClick={() => { setLast(null); setScanning(true); }} className="w-full h-11 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50">Scan next</button></div>)}
        </>)}
      </div>
    </PageShell>
  );
}

// ─── ADMIN: Attendees (per-event, Present/Absent tabs) ────────────────────────
function AdminAttendeesPage({ onNav }: { onNav: (p: Page) => void }) {
  const [selectedEventId, setSelectedEventId] = useState("2");
  const [scanState, setScanState] = useState<Record<string, ScanRecord[]>>(
    Object.fromEntries(Object.entries(EVENT_SCANS).map(([k, v]) => [k, v.map(s => ({ ...s }))]))
  );
  const [tab, setTab] = useState<"present" | "absent">("present");

  const selectedEvent = INITIAL_EVENTS.find(e => e.id === selectedEventId) ?? INITIAL_EVENTS[0];
  const scans = scanState[selectedEventId] ?? [];
  const confirmed = scans.filter(s => s.status === "confirmed");
  const duplicates = scans.filter(s => s.status === "duplicate");
  const attendedIds = new Set(confirmed.map(s => s.id));
  const absentees = ALL_STUDENTS.filter(s => !attendedIds.has(s.id));
  const deleteRecord = (dbId: number) => setScanState(st => ({ ...st, [selectedEventId]: (st[selectedEventId] ?? []).filter(r => r.dbId !== dbId) }));

  return (
    <PageShell>
      <BackButton onClick={() => onNav("admin-events")} label="Back to Events" />
      <PageHeader title="Attendees" action={<button className="h-9 px-3.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 flex items-center gap-1.5"><Icons.Download />Export</button>} />

      <div className="mb-5">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Event</label>
        <select value={selectedEventId} onChange={e => { setSelectedEventId(e.target.value); setTab("present"); }} className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 font-medium outline-none focus:border-green-500 appearance-none">
          {INITIAL_EVENTS.map(e => <option key={e.id} value={e.id}>{e.title} · {e.date}</option>)}
        </select>
      </div>

      <p className="text-xs text-slate-400 font-medium mb-4">{selectedEvent.location} · {selectedEvent.time}</p>

      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl">
        <button onClick={() => setTab("present")} className={`flex-1 h-9 rounded-lg text-xs font-semibold transition-all ${tab === "present" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>Present ({confirmed.length})</button>
        <button onClick={() => setTab("absent")} className={`flex-1 h-9 rounded-lg text-xs font-semibold transition-all ${tab === "absent" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
          Absent ({absentees.length}){selectedEvent.fineAmount > 0 && <span className="text-red-500 ml-1">· ₱{selectedEvent.fineAmount}</span>}
        </button>
      </div>

      {tab === "present" && (<>
        {confirmed.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-xl px-5 py-10 text-center"><p className="text-slate-400 text-sm font-medium">No scans recorded for this event yet.</p></div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden mb-4">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase tracking-widest"><span className="col-span-5">Student</span><span className="col-span-3">Program</span><span className="col-span-2">Time</span><span className="col-span-2 text-right">Status</span></div>
            {confirmed.map((s, i) => (<div key={s.dbId} className={`px-5 py-3.5 grid grid-cols-12 items-center ${i < confirmed.length - 1 ? "border-b border-slate-50" : ""}`}><div className="col-span-5 flex items-center gap-3 min-w-0"><Avatar name={s.name} size="sm" /><div className="min-w-0"><p className="text-sm font-semibold text-slate-900 truncate">{s.name}</p><p className="text-[11px] text-slate-400">{s.id}</p></div></div><span className="col-span-3 text-xs text-slate-500">{s.program}</span><span className="col-span-2 text-xs text-slate-500">{s.time}</span><div className="col-span-2 flex justify-end"><Badge status={s.status} /></div></div>))}
          </div>
        )}
        {duplicates.length > 0 && (<>
          <SectionLabel>Duplicate scans — tap trash to remove</SectionLabel>
          <div className="bg-white border border-red-100 rounded-xl overflow-hidden">
            {duplicates.map((s, i) => (<div key={s.dbId} className={`px-5 py-3.5 flex items-center gap-3 ${i < duplicates.length - 1 ? "border-b border-slate-50" : ""}`}><Avatar name={s.name} size="sm" /><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-900 truncate">{s.name}</p><p className="text-[11px] text-slate-400">{s.id} · scanned {s.time}</p></div><Badge status={s.status} /><button onClick={() => deleteRecord(s.dbId)} className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"><Icons.Trash /></button></div>))}
          </div>
        </>)}
      </>)}

      {tab === "absent" && (<>
        {selectedEvent.fineAmount > 0 && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3"><span className="text-red-400 shrink-0"><Icons.Peso /></span><p className="text-sm text-red-700">Each absentee is automatically fined <span className="font-bold">₱{selectedEvent.fineAmount}</span>.</p></div>}
        {absentees.length === 0 ? (<div className="bg-white border border-slate-100 rounded-xl px-5 py-10 text-center"><div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-3 text-green-500"><Icons.CheckCircle /></div><p className="font-semibold text-slate-900 text-sm">Full attendance</p><p className="text-xs text-slate-400 mt-1">All enrolled students have been scanned.</p></div>) : (
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase tracking-widest"><span className="col-span-5">Student</span><span className="col-span-4">Program</span><span className="col-span-3 text-right">Fee</span></div>
            {absentees.map((s, i) => (<div key={s.id} className={`px-5 py-3.5 grid grid-cols-12 items-center ${i < absentees.length - 1 ? "border-b border-slate-50" : ""}`}><div className="col-span-5 flex items-center gap-3 min-w-0"><Avatar name={s.name} size="sm" /><div className="min-w-0"><p className="text-sm font-semibold text-slate-900 truncate">{s.name}</p><p className="text-[11px] text-slate-400">{s.id}</p></div></div><span className="col-span-4 text-xs text-slate-500">{s.program} · {s.section}</span><div className="col-span-3 flex justify-end">{selectedEvent.fineAmount > 0 ? <span className="text-sm font-bold text-red-600">₱{selectedEvent.fineAmount}</span> : <span className="text-xs text-slate-400">—</span>}</div></div>))}
          </div>
        )}
      </>)}
    </PageShell>
  );
}

// ─── ADMIN: Student Directory ─────────────────────────────────────────────────
function AdminStudentsPage() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<StudentProfile | null>(null);
  const filtered = ALL_STUDENTS.filter(s => {
    const q = query.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.id.includes(q) || s.program.toLowerCase().includes(q) || s.section.toLowerCase().includes(q);
  });
  return (
    <PageShell>
      <PageHeader title="Students" subtitle={`${ALL_STUDENTS.length} students registered on TapIn`} />
      <div className="relative mb-5">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icons.Search /></span>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, ID, program, or section…" className="w-full h-10 pl-9 pr-9 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-300 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all" />
        {query && <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"><Icons.X /></button>}
      </div>
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-xl px-5 py-10 text-center"><p className="text-slate-400 text-sm">No students match &ldquo;{query}&rdquo;</p></div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span className="col-span-5">Student</span><span className="col-span-3">Program</span><span className="col-span-3">Section</span><span className="col-span-1"></span>
          </div>
          {filtered.map((s, i) => (
            <button key={s.id} onClick={() => setSelected(s)} className={`w-full px-5 py-3.5 grid grid-cols-12 items-center text-left hover:bg-slate-50 transition-colors ${i < filtered.length - 1 ? "border-b border-slate-50" : ""}`}>
              <div className="col-span-5 flex items-center gap-3 min-w-0"><Avatar name={s.name} size="sm" /><div className="min-w-0"><p className="text-sm font-semibold text-slate-900 truncate">{s.name}</p><p className="text-[11px] text-slate-400">{s.id}</p></div></div>
              <span className="col-span-3 text-xs text-slate-500 font-medium">{s.program}</span>
              <span className="col-span-3 text-xs text-slate-500 font-medium">{s.section}</span>
              <span className="col-span-1 flex justify-end text-slate-300"><Icons.ChevronRight /></span>
            </button>
          ))}
        </div>
      )}
      {selected && <StudentProfileModal student={selected} onClose={() => setSelected(null)} />}
    </PageShell>
  );
}

// ─── ADMIN: Announcements ─────────────────────────────────────────────────────
function AdminAnnouncementsPage() {
  const [posts, setPosts] = useState(INITIAL_ANNOUNCEMENTS.map(a => ({ ...a })));
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<typeof INITIAL_ANNOUNCEMENTS[0] | null>(null);
  const [newTitle, setNewTitle] = useState(""); const [newBody, setNewBody] = useState(""); const [newBadge, setNewBadge] = useState("General"); const [newPhoto, setNewPhoto] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null); const editPhotoRef = useRef<HTMLInputElement>(null);
  const handlePublish = () => {
    if (!newTitle.trim()) return;
    setPosts(p => [{ id: Date.now().toString(), title: newTitle, body: newBody, date: "Aug 22, 2026", author: "Administration", badge: newBadge, photoUrl: newPhoto ?? "" }, ...p]);
    setNewTitle(""); setNewBody(""); setNewBadge("General"); setNewPhoto(null); setShowForm(false);
  };
  const startEdit = (a: typeof INITIAL_ANNOUNCEMENTS[0]) => { setEditId(a.id); setEditDraft({ ...a }); setShowForm(false); };
  const saveEdit = () => { if (!editDraft) return; setPosts(p => p.map(a => a.id === editDraft.id ? editDraft : a)); setEditId(null); setEditDraft(null); };
  const deletePost = (id: string) => setPosts(p => p.filter(a => a.id !== id));
  return (
    <PageShell>
      <PageHeader title="Announcements" action={<button onClick={() => { setShowForm(!showForm); setEditId(null); setEditDraft(null); }} className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"><Icons.Plus />New post</button>} />
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between"><p className="text-sm font-bold text-slate-900">New announcement</p><button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><Icons.X /></button></div>
          <div className="px-5 py-4 space-y-3">
            <FieldInput label="Title" placeholder="e.g. Enrollment Now Open" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            <FieldSelect label="Category" value={newBadge} onChange={e => setNewBadge(e.target.value)}><option>General</option><option>Academic</option><option>Schedule</option><option>Financial</option><option>Facilities</option><option>Events</option></FieldSelect>
            <FieldTextarea label="Body" placeholder="Write your announcement…" rows={4} value={newBody} onChange={e => setNewBody(e.target.value)} />
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Photo <span className="text-slate-300 normal-case tracking-normal">(optional)</span></label>
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setNewPhoto(URL.createObjectURL(f)); }} />
              {newPhoto ? (<div className="relative rounded-xl overflow-hidden border border-slate-200"><img src={newPhoto} alt="" className="w-full h-40 object-cover" /><button onClick={() => setNewPhoto(null)} className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"><Icons.X /></button></div>) : <button onClick={() => photoRef.current?.click()} className="w-full h-10 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-green-400 hover:text-green-600 flex items-center justify-center gap-2"><Icons.Image />Attach photo</button>}
            </div>
          </div>
          <div className="px-5 pb-4 flex gap-2.5"><button onClick={handlePublish} disabled={!newTitle.trim()} className="flex-1 h-10 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-40">Publish</button><button onClick={() => setShowForm(false)} className="h-10 px-4 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50">Cancel</button></div>
        </div>
      )}
      {editId && editDraft && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between"><p className="text-sm font-bold text-slate-900">Edit announcement</p><button onClick={() => { setEditId(null); setEditDraft(null); }} className="text-slate-400 hover:text-slate-600"><Icons.X /></button></div>
          <div className="px-5 py-4 space-y-3">
            <FieldInput label="Title" value={editDraft.title} onChange={e => setEditDraft(d => d ? { ...d, title: e.target.value } : d)} />
            <FieldTextarea label="Body" rows={4} value={editDraft.body} onChange={e => setEditDraft(d => d ? { ...d, body: e.target.value } : d)} />
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Photo</label>
              <input ref={editPhotoRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setEditDraft(d => d ? { ...d, photoUrl: URL.createObjectURL(f) } : d); }} />
              {editDraft.photoUrl ? (<div className="relative rounded-xl overflow-hidden border border-slate-200"><img src={editDraft.photoUrl} alt="" className="w-full h-40 object-cover" /><button onClick={() => setEditDraft(d => d ? { ...d, photoUrl: "" } : d)} className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"><Icons.X /></button></div>) : <button onClick={() => editPhotoRef.current?.click()} className="w-full h-10 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-green-400 hover:text-green-600 flex items-center justify-center gap-2"><Icons.Image />Attach photo</button>}
            </div>
          </div>
          <div className="px-5 pb-4 flex gap-2.5"><button onClick={saveEdit} className="flex-1 h-10 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg shadow-sm">Save changes</button><button onClick={() => { setEditId(null); setEditDraft(null); }} className="h-10 px-4 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50">Cancel</button></div>
        </div>
      )}
      <div className="space-y-3">
        {posts.map(a => (
          <div key={a.id} className="bg-white border border-slate-100 rounded-xl overflow-hidden hover:border-slate-200 hover:shadow-sm transition-all">
            {a.photoUrl && <img src={a.photoUrl} alt="" className="w-full h-40 object-cover" />}
            <div className="p-5">
              <div className="flex items-center justify-between mb-3"><span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded uppercase tracking-wide">{a.badge}</span><div className="flex items-center gap-2"><span className="text-[11px] text-slate-400">{a.date}</span><DotMenu items={[{ label: "Edit", icon: <Icons.Edit />, onClick: () => startEdit(a) }, { label: "Delete", icon: <Icons.Trash />, danger: true, onClick: () => deletePost(a.id) }]} /></div></div>
              <h3 className="font-semibold text-slate-900 mb-2">{a.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">{a.body}</p>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

// ─── ADMIN: Excuse Requests ───────────────────────────────────────────────────
function AdminExcuseRequestsPage({ requests, onAction, onBack }: { requests: ExcuseRequest[]; onAction: (id: string, a: "approved" | "denied") => void; onBack: () => void }) {
  const pending = requests.filter(r => r.status === "pending");
  const reviewed = requests.filter(r => r.status !== "pending");
  return (
    <PageShell>
      <BackButton onClick={onBack} label="Back to Overview" />
      <PageHeader title="Excuse Requests" subtitle={`${pending.length} pending review`} />
      {requests.length === 0 && <div className="bg-white border border-slate-100 rounded-xl px-5 py-12 text-center"><div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3 text-slate-400"><Icons.FileText /></div><p className="font-semibold text-slate-900 text-sm">No excuse requests</p><p className="text-xs text-slate-400 mt-1">Student requests will appear here.</p></div>}
      {pending.length > 0 && (<><SectionLabel>Pending review</SectionLabel><div className="space-y-3 mb-6">{pending.map(r => (<div key={r.id} className="bg-white border border-amber-100 rounded-xl p-5 shadow-sm"><div className="flex items-start justify-between gap-3 mb-3"><div className="flex items-center gap-3"><Avatar name={r.studentName} size="sm" /><div><p className="text-sm font-semibold text-slate-900">{r.studentName}</p><p className="text-[11px] text-slate-400">{r.studentId}</p></div></div><Badge status={r.status} /></div><div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5 mb-3"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Event</p><p className="text-sm font-semibold text-slate-900">{r.event}</p><p className="text-xs text-slate-400 mt-0.5">{r.date}</p></div><p className="text-sm text-slate-600 leading-relaxed mb-3">{r.reason}</p>{r.proofName && <p className="text-[11px] text-slate-400 mb-3 flex items-center gap-1"><Icons.Paperclip />{r.proofName}</p>}<p className="text-[11px] text-slate-400 mb-4">Submitted {r.submittedDate}</p><div className="flex gap-2 pt-4 border-t border-slate-50"><button onClick={() => onAction(r.id, "approved")} className="flex-1 h-9 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center justify-center gap-1.5"><Icons.Check />Approve &amp; waive fee</button><button onClick={() => onAction(r.id, "denied")} className="flex-1 h-9 border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 flex items-center justify-center gap-1.5"><Icons.X />Deny</button></div></div>))}</div></>)}
      {reviewed.length > 0 && (<><SectionLabel>Reviewed</SectionLabel><div className="space-y-2.5">{reviewed.map(r => (<div key={r.id} className="bg-white border border-slate-100 rounded-xl px-5 py-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3 min-w-0"><Avatar name={r.studentName} size="xs" /><div className="min-w-0"><p className="text-sm font-semibold text-slate-900 truncate">{r.studentName}</p><p className="text-xs text-slate-400 truncate">{r.event}</p></div></div><Badge status={r.status} /></div></div>))}</div></>)}
    </PageShell>
  );
}

// ─── ADMIN: Reports ───────────────────────────────────────────────────────────
function AdminReportsPage() {
  return (
    <PageShell>
      <PageHeader title="Reports" subtitle="AY 2026–2027, 1st Semester" action={<button className="h-9 px-3.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 flex items-center gap-1.5"><Icons.Download />Export CSV</button>} />
      <SectionLabel>Attendance by program</SectionLabel>
      <div className="grid md:grid-cols-2 gap-3 mb-6">{[{ l: "BSIT", n: 234, total: 301, pct: 78, c: "bg-green-500" }, { l: "BSCS", n: 198, total: 304, pct: 65, c: "bg-sky-500" }, { l: "BSBA", n: 156, total: 300, pct: 52, c: "bg-violet-400" }, { l: "BSEd", n: 89, total: 197, pct: 45, c: "bg-amber-400" }].map(r => (<div key={r.l} className="bg-white border border-slate-100 rounded-xl px-5 py-4"><div className="flex items-center justify-between mb-3"><span className="font-bold text-slate-900 text-sm">{r.l}</span><span className="text-xs text-slate-400 font-semibold">{r.n} / {r.total}</span></div><div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2"><div className={`h-full ${r.c} rounded-full`} style={{ width: `${r.pct}%` }} /></div><p className="text-[11px] text-slate-400 font-semibold">{r.pct}% attendance rate</p></div>))}</div>
      <SectionLabel>Fees summary</SectionLabel>
      <div className="grid grid-cols-3 gap-3 mb-6">{[{ l: "Total fees issued", v: "₱42,500", c: "text-red-600" }, { l: "Collected", v: "₱18,200", c: "text-green-600" }, { l: "Pending", v: "₱24,300", c: "text-amber-600" }].map(s => (<div key={s.l} className="bg-white border border-slate-100 rounded-xl px-4 py-4"><p className={`text-xl font-bold ${s.c}`}>{s.v}</p><p className="text-[11px] text-slate-400 font-semibold mt-1 leading-tight">{s.l}</p></div>))}</div>
      <SectionLabel>By event</SectionLabel>
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">{INITIAL_EVENTS.filter(e => e.status !== "upcoming").map((e, i, arr) => (<div key={e.id} className={`flex items-center justify-between px-5 py-4 ${i < arr.length - 1 ? "border-b border-slate-50" : ""}`}><div><p className="text-sm font-semibold text-slate-900">{e.title}</p><p className="text-[11px] text-slate-400 mt-0.5">{e.date} · ₱{e.fineAmount} fee</p></div><div className="text-right"><p className="font-bold text-green-600 text-lg">{e.attendees}</p><p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">attended</p></div></div>))}</div>
    </PageShell>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>("landing");
  const [user, setUser] = useState<User | null>(null);
  const [toast, setToast] = useState<{ msg: string; variant?: "success" | "error" } | null>(null);
  const [selectedEventId, setSelectedEventId] = useState("1");
  const [qrVersion, setQrVersion] = useState(1);
  const [excuseRequests, setExcuseRequests] = useState<ExcuseRequest[]>([]);
  const [fines, setFines] = useState<FineRecord[]>(STUDENT_FINES);

  const show = (msg: string, variant: "success" | "error" = "success") => { setToast({ msg, variant }); setTimeout(() => setToast(null), 3500); };

  const handleLogin = (role: Role) => {
    if (role === "student") { setUser({ firstName: "", middleInitial: "", surname: "", studentId: "", program: "", yearLevel: "", section: "", phone: "", contactEmail: "", role: "student" }); setPage("onboarding"); }
    else { setUser({ firstName: "Rafael", middleInitial: "M", surname: "Rivera", studentId: "ADMIN-001", program: "Admin", yearLevel: "", section: "", phone: "09171234567", contactEmail: "admin@tapin.edu", role: "admin" }); setPage("admin-dashboard"); }
  };
  const handleOnboarding = (d: OBForm) => {
    setUser({ firstName: d.firstName || "Maria Luisa", middleInitial: d.middleInitial || "A", surname: d.surname || "Santos", studentId: d.studentId || "2440014", program: d.program || "BSIT", yearLevel: d.yearLevel || "2nd Year", section: d.section || "IT-2A", phone: d.phone || "09XX XXX XXXX", contactEmail: d.contactEmail || "mls.santos@tapin.edu", role: "student" });
    show("Setup complete — your QR code is ready"); setPage("dashboard");
  };
  const handleProfileSave = (updated: User) => { setUser(updated); setQrVersion(v => v + 1); show("Profile saved — QR code renewed"); };
  const handleExcuseAction = (id: string, action: "approved" | "denied") => {
    setExcuseRequests(r => r.map(x => x.id === id ? { ...x, status: action } : x));
    if (action === "approved") { const req = excuseRequests.find(r => r.id === id); if (req) setFines(f => f.map(fi => fi.eventTitle === req.event ? { ...fi, status: "excused" as FineStatus } : fi)); show("Excuse approved — fee waived"); }
    else show("Request denied");
  };
  const handleLogout = () => { setUser(null); setPage("landing"); };
  const isAdmin = user?.role === "admin";
  const bare: Page[] = ["landing", "login", "onboarding"];
  const isBare = bare.includes(page);
  const goBack = (fallback: Page) => () => setPage(fallback);

  return (
    <div className="h-full flex flex-col bg-[#f8faf9]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {!isBare && <TopBar user={user} onNav={setPage} />}
      <div className={`flex-1 flex min-h-0 ${!isBare ? "overflow-hidden" : ""}`}>
        {!isBare && user && <Sidebar page={page} user={user} onNav={setPage} onLogout={handleLogout} />}
        <main className={`flex-1 bg-[#f8faf9] ${!isBare ? "overflow-y-auto" : ""}`}>
          {page === "landing"               && <LandingPage onNav={setPage} />}
          {page === "login"                 && <LoginPage onLogin={handleLogin} onBack={() => setPage("landing")} />}
          {page === "onboarding"            && <OnboardingPage onComplete={handleOnboarding} />}
          {page === "dashboard"    && user  && !isAdmin && <DashboardPage user={user} onNav={setPage} fines={fines} />}
          {page === "events"                && <EventsPage onNav={setPage} onSelectEvent={setSelectedEventId} user={user} />}
          {page === "event-detail"          && <EventDetailPage eventId={selectedEventId} user={user} onBack={goBack("events")} />}
          {page === "my-qr"        && user  && <MyQRPage user={user} qrVersion={qrVersion} onBack={goBack("dashboard")} />}
          {page === "announcements"         && <AnnouncementsPage onBack={goBack(isAdmin ? "admin-dashboard" : "dashboard")} />}
          {page === "attendance-history"    && <AttendanceHistoryPage excuseRequests={excuseRequests} fines={fines} onSubmitExcuse={r => { setExcuseRequests(p => [...p, r]); show("Excuse request submitted"); }} onBack={goBack("dashboard")} />}
          {page === "my-fines"     && user  && <MyFinesPage fines={fines} onBack={goBack("dashboard")} />}
          {page === "profile"      && user  && <ProfilePage user={user} onSave={handleProfileSave} onBack={goBack(isAdmin ? "admin-dashboard" : "dashboard")} />}
          {page === "admin-dashboard"       && isAdmin && <AdminDashboard onNav={setPage} excuseRequests={excuseRequests} />}
          {page === "admin-events"          && isAdmin && <AdminEventsPage onNav={setPage} />}
          {page === "admin-scanner"         && isAdmin && <AdminScannerPage />}
          {page === "admin-attendees"       && isAdmin && <AdminAttendeesPage onNav={setPage} />}
          {page === "admin-students"        && isAdmin && <AdminStudentsPage />}
          {page === "admin-announcements"   && isAdmin && <AdminAnnouncementsPage />}
          {page === "admin-excuse-requests" && isAdmin && <AdminExcuseRequestsPage requests={excuseRequests} onAction={handleExcuseAction} onBack={goBack("admin-dashboard")} />}
          {page === "admin-reports"         && isAdmin && <AdminReportsPage />}
        </main>
      </div>
      {!isBare && <BottomNav page={page} user={user} onNav={setPage} />}
      {toast && <Toast message={toast.msg} variant={toast.variant} />}
    </div>
  );
}
