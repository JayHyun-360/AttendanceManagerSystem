import { useState, useRef, useEffect } from "react";
import jsQR from "jsqr";
import QRCode from "qrcode";
import tapInLogoSrc from "@/imports/Free_Simple_Modern_Design_Studio_Logo.png";

// ─── Types ────────────────────────────────────────────────────────────────────
type Page =
  | "landing" | "login" | "onboarding"
  | "dashboard" | "my-qr" | "events" | "event-detail"
  | "announcements" | "attendance-history" | "my-fines" | "profile"
  | "admin-dashboard" | "admin-events" | "admin-scanner"
  | "admin-attendees" | "admin-announcements" | "admin-reports"
  | "admin-excuse-requests" | "admin-students" | "admin-settings";

type Role = "student" | "admin" | null;
type FineStatus = "unpaid" | "paid" | "excused";
type EventStatus = "active" | "upcoming" | "closed";

interface User {
  firstName: string; middleInitial: string; surname: string;
  studentId: string; program: string; yearLevel: string; section: string;
  phone: string; contactEmail: string; role: Role; photoUrl?: string;
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
  { id: "1", title: "TapIn Foundation Day Celebration",      date: "Aug 29, 2026", time: "8:00 AM – 5:00 PM",  location: "Main Gymnasium",      status: "upcoming", attendees: 0, program: "All Programs", fineAmount: 150, description: "Annual Foundation Day celebration featuring cultural shows, sports competitions, and academic exhibits. Attendance is required for all enrolled students." },
  { id: "2", title: "SSG General Assembly — 1st Semester",   date: "Aug 22, 2026", time: "1:00 PM – 4:00 PM",  location: "Audio-Visual Room 2", status: "active",   attendees: 6, program: "All Programs", fineAmount: 100, description: "Supreme Student Government general assembly for the first semester. Agenda includes budget presentation, committee reports, and open forum." },
  { id: "3", title: "Tech Talk: AI in Education",            date: "Aug 15, 2026", time: "2:00 PM – 5:00 PM",  location: "ICT Laboratory",      status: "closed",   attendees: 8, program: "BSIT / BSCS", fineAmount: 50,  description: "Integration of artificial intelligence tools in modern education. Guest speaker from the Department of Information Technology." },
  { id: "4", title: "Intramural Opening Ceremony",           date: "Sep 5, 2026",  time: "7:30 AM – 12:00 PM", location: "Covered Court",       status: "upcoming", attendees: 0, program: "All Programs", fineAmount: 200, description: "Opening ceremony for the annual intramural sports festival. Parade of athletes, oath-taking, and opening of games." },
];

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
  { id: "1", title: "Enrollment for 2nd Semester Now Open",       body: "Online enrollment for the second semester of AY 2026-2027 is now open. Complete enrollment on or before September 15, 2026. Late enrollees are subject to a P200 surcharge.", date: "Aug 20, 2026", author: "Registrar's Office",    badge: "Academic",   photoUrl: "" },
  { id: "2", title: "Afternoon Classes Suspended — Aug 22",       body: "Due to the SSG General Assembly on August 22, all afternoon classes from 1:00 PM onward are suspended. Morning classes proceed as scheduled.",                              date: "Aug 19, 2026", author: "Office of the Principal", badge: "Schedule",   photoUrl: "" },
  { id: "3", title: "Library Hours Extended During Finals Week",  body: "The library will be open 7:00 AM to 7:00 PM starting August 25 until September 6. Laptops allowed; food and drinks are not permitted.",                                      date: "Aug 18, 2026", author: "Library Services",         badge: "Facilities", photoUrl: "" },
  { id: "4", title: "Scholarship Application Deadline — Aug 28",  body: "All scholarship applicants must submit complete documentary requirements to the Scholarship Office by August 28, 2026.",                                                      date: "Aug 17, 2026", author: "Scholarship Office",       badge: "Financial",  photoUrl: "" },
];

const ATTENDANCE_RECORDS = [
  { id: "a1", eventId: "2", event: "SSG General Assembly — 1st Semester", date: "Aug 22, 2026", time: "1:14 PM", status: "present" },
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
  Scan:           () => <svg viewBox="0 0 24 24" className={ic} {...sv}><path d="M3 7V5a2 2 0 012-2h2"/><path d="M17 3h2a2 2 0 012 2v2"/><path d="M21 17v2a2 2 0 01-2 2h-2"/><path d="M7 21H5a2 2 0 01-2-2v-2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>,
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
  Settings:       () => <svg viewBox="0 0 24 24" className={ic} {...sv}><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="8" cy="6" r="2" fill="white" stroke="currentColor" strokeWidth="2"/><circle cx="16" cy="12" r="2" fill="white" stroke="currentColor" strokeWidth="2"/><circle cx="10" cy="18" r="2" fill="white" stroke="currentColor" strokeWidth="2"/></svg>,
  Camera:         () => <svg viewBox="0 0 24 24" className={ic} {...sv}><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  Peso:           () => <svg viewBox="0 0 24 24" className={ic} fill="currentColor"><text x="3" y="19" fontSize="17" fontWeight="700" fontFamily="sans-serif">&#8369;</text></svg>,
  Google:         () => <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>,
  Menu:           () => <svg viewBox="0 0 24 24" className={ic} {...sv}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
};

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ on, onToggle, label, desc }: { on: boolean; onToggle: () => void; label: string; desc?: string }) {
  return (
    <div className="flex items-center justify-between py-4 gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        {desc && <p className="text-xs text-slate-400 mt-1 leading-relaxed">{desc}</p>}
      </div>
      <button
        onClick={onToggle}
        role="switch"
        aria-checked={on}
        className={`relative w-11 h-6 rounded-full transition-all duration-200 shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-2 ${on ? "bg-green-600 focus:ring-green-500" : "bg-slate-200 focus:ring-slate-400"}`}
      >
        <span className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] bg-white rounded-full shadow-md transition-transform duration-200 ${on ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

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
    closed:    { cls: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",   label: "Closed" },
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

// ─── Avatar / ProfileIcon ─────────────────────────────────────────────────────
function Avatar({ name, photoUrl, size = "md" }: { name: string; photoUrl?: string; size?: "xs" | "sm" | "md" | "lg" }) {
  const sz = { xs: "w-6 h-6", sm: "w-7 h-7", md: "w-9 h-9", lg: "w-14 h-14" }[size];
  if (photoUrl) return <img src={photoUrl} alt={name} className={`${sz} rounded-full object-cover shrink-0 ring-1 ring-slate-200`} />;
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

function ProfileIcon({ photoUrl, size = "sm" }: { photoUrl?: string; size?: "xs" | "sm" | "md" | "lg" }) {
  const sz = { xs: "w-6 h-6", sm: "w-7 h-7", md: "w-9 h-9", lg: "w-14 h-14" }[size];
  if (photoUrl) return <img src={photoUrl} alt="Profile" className={`${sz} rounded-full object-cover shrink-0 ring-1 ring-slate-200`} />;
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
  return <div className="px-5 py-6 max-w-3xl mx-auto pb-8">{children}</div>;
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
    <img src={tapInLogoSrc} alt="TapIn" className={`${className} shrink-0 rounded-lg object-cover`} />
  );
}

// ─── QR Code ──────────────────────────────────────────────────────────────────
function StudentQR({ studentId, size }: { studentId: string; size: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(`TAPIN:${studentId}`, {
      width: size * 2,
      margin: 1,
      color: { dark: "#111827", light: "#ffffff" },
      errorCorrectionLevel: "H",
    }).then(setDataUrl).catch(() => setDataUrl(null));
  }, [studentId, size]);
  if (!dataUrl) return <div style={{ width: size, height: size }} className="bg-slate-100 rounded animate-pulse" />;
  return <img src={dataUrl} width={size} height={size} alt="Student QR Code" style={{ display: "block", imageRendering: "pixelated" }} />;
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────
function TopBar({ user, onNav, onMenuOpen }: { user: User | null; onNav: (p: Page) => void; onMenuOpen: () => void }) {
  const dest = user?.role === "admin" ? "admin-dashboard" : user ? "dashboard" : "landing";
  const isMod = user?.role === "admin";
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-100 shrink-0" style={{ boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
      <div className="flex items-center justify-between px-4 lg:px-5 gap-3" style={{ height: "56px" }}>
        {/* Left — hamburger + brand */}
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
          <button className="flex items-center gap-2.5 min-w-0" onClick={() => onNav(dest)}>
            <TapInMark className="w-8 h-8 shrink-0" />
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-bold text-slate-900 tracking-tight">TapIn</span>
              <span className="text-[10px] text-slate-400 font-medium hidden sm:block leading-tight truncate">
                {isMod ? "Moderator Portal" : "Student Attendance"}
              </span>
            </div>
          </button>
        </div>

        {/* Right — user actions */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <button
              onClick={() => onNav("profile")}
              className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full hover:bg-slate-100 transition-colors group"
              aria-label="View profile"
            >
              <ProfileIcon photoUrl={user.photoUrl} size="sm" />
              <span className="hidden sm:block text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors truncate max-w-[120px]">
                {user.firstName || (isMod ? "Moderator" : "My Profile")}
              </span>
            </button>
          ) : (
            <button
              onClick={() => onNav("login")}
              className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── Sidebar (desktop + mobile drawer) ───────────────────────────────────────
function Sidebar({ page, user, open, onNav, onClose, onLogout, badges }: {
  page: Page; user: User | null; open: boolean;
  onNav: (p: Page) => void; onClose: () => void; onLogout: () => void;
  badges?: Partial<Record<Page, number>>;
}) {
  if (!user) return null;
  const isMod = user.role === "admin";
  const nav = isMod ? [
    { p: "admin-dashboard" as Page,       l: "Overview",        I: Icons.Home },
    { p: "admin-events" as Page,          l: "Events",          I: Icons.Calendar },
    { p: "admin-scanner" as Page,         l: "QR Scanner",      I: Icons.Scan },
    { p: "admin-attendees" as Page,       l: "Attendees",       I: Icons.Users },
    { p: "admin-students" as Page,        l: "Students",        I: Icons.User },
    { p: "admin-announcements" as Page,   l: "Announcements",   I: Icons.Bell },
    { p: "admin-excuse-requests" as Page, l: "Excuse Requests", I: Icons.FileText },
    { p: "admin-reports" as Page,         l: "Reports",         I: Icons.BarChart },
    { p: "admin-settings" as Page,        l: "Settings",        I: Icons.Settings },
  ] : [
    { p: "dashboard" as Page,          l: "Home",          I: Icons.Home },
    { p: "events" as Page,             l: "Events",        I: Icons.Calendar },
    { p: "my-qr" as Page,              l: "My QR Code",    I: Icons.QrCode },
    { p: "announcements" as Page,      l: "Announcements", I: Icons.Bell },
    { p: "attendance-history" as Page, l: "Attendance",    I: Icons.CheckCircle },
    { p: "my-fines" as Page,           l: "My Fines",      I: Icons.Peso },
    { p: "profile" as Page,            l: "Profile",       I: Icons.User },
  ];

  const handleNav = (p: Page) => { onNav(p); };

  const inner = (
    <div className="flex flex-col h-full bg-white">
      {/* Mobile header inside drawer */}
      <div className="flex items-center justify-between px-4 h-[52px] border-b border-slate-100 lg:hidden shrink-0">
        <div className="flex items-center gap-2.5">
          <TapInMark />
          <span className="text-sm font-bold text-slate-900 tracking-tight">TapIn</span>
        </div>
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors" aria-label="Close menu">
          <Icons.X />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 pt-3 pb-2 space-y-0.5 overflow-y-auto">
        {nav.map(({ p, l, I }) => {
          const active = page === p;
          const count = badges?.[p] ?? 0;
          const badgeLabel = count > 9 ? "9+" : count > 0 ? String(count) : null;
          return (
            <button key={p} onClick={() => handleNav(p)} className={`w-full flex items-center gap-3 px-3 h-10 rounded-xl text-sm transition-all ${active ? "bg-green-50 text-green-800 font-semibold" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium"}`}>
              <span className={`relative shrink-0 ${active ? "text-green-600" : "text-slate-400"}`}>
                <I />
                {badgeLabel && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-[3px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                    {badgeLabel}
                  </span>
                )}
              </span>
              <span className="truncate">{l}</span>
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-2 py-3 border-t border-slate-100 space-y-0.5 shrink-0">
        <button onClick={() => handleNav("profile")} className="w-full flex items-center gap-3 px-3 h-11 rounded-xl hover:bg-slate-50 transition-colors group">
          <ProfileIcon photoUrl={user.photoUrl} size="xs" />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-semibold text-slate-800 truncate">{fullName(user) || "Set up profile"}</p>
            <p className="text-[10px] text-slate-400 truncate">{isMod ? "Moderator" : user.studentId || "No ID yet"}</p>
          </div>
          <span className="text-slate-300 group-hover:text-slate-500 shrink-0"><Icons.ChevronRight /></span>
        </button>
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 h-10 rounded-xl text-sm font-medium text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all">
          <span className="text-slate-300 shrink-0"><Icons.LogOut /></span>Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop: persistent sidebar ── */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-slate-100 h-full">
        {inner}
      </aside>

      {/* ── Mobile: slide-in drawer overlay ── */}
      <div className="lg:hidden">
        {/* Backdrop */}
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300"
          style={{ opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }}
          aria-hidden="true"
        />
        {/* Drawer panel */}
        <aside
          className="fixed top-0 left-0 z-50 h-full w-72 shadow-2xl transition-transform duration-300 ease-in-out"
          style={{ transform: open ? "translateX(0)" : "translateX(-100%)" }}
          aria-label="Navigation menu"
        >
          {inner}
        </aside>
      </div>
    </>
  );
}

// ─── LANDING CAROUSEL ─────────────────────────────────────────────────────────
function LandingCarousel({ slides }: { slides: CarouselSlide[] }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStart = useRef<number | null>(null);
  const n = slides.length;

  const go = (next: number, manual = false) => {
    setIdx(((next % n) + n) % n);
    if (manual) {
      setPaused(true);
      if (pauseTimer.current) clearTimeout(pauseTimer.current);
      pauseTimer.current = setTimeout(() => setPaused(false), 8000);
    }
  };

  useEffect(() => {
    if (paused || n <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % n), 5000);
    return () => clearInterval(t);
  }, [paused, n]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(idx - 1, true);
      if (e.key === "ArrowRight") go(idx + 1, true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx]);

  if (n === 0) return null;
  const slide = slides[idx];

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl select-none"
      style={{ aspectRatio: "16/7" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={e => { touchStart.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        if (touchStart.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStart.current;
        if (Math.abs(dx) > 40) go(dx < 0 ? idx + 1 : idx - 1, true);
        touchStart.current = null;
      }}
    >
      {/* Slides */}
      {slides.map((s, i) => (
        <div key={i} className="absolute inset-0 transition-opacity duration-700" style={{ opacity: i === idx ? 1 : 0, zIndex: i === idx ? 1 : 0 }}>
          <img src={s.imageUrl} alt={s.caption} className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,.72) 0%, rgba(0,0,0,.18) 55%, transparent 100%)" }} />
          <div className="absolute bottom-0 left-0 right-0 px-6 py-5">
            <p className="text-white font-bold text-lg leading-tight drop-shadow">{s.caption}</p>
            {s.date && <p className="text-white/65 text-sm mt-1">{s.date}</p>}
          </div>
        </div>
      ))}

      {/* Arrow controls */}
      {n > 1 && (<>
        <button onClick={() => go(idx - 1, true)} className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors backdrop-blur-sm">
          <Icons.ChevronLeft />
        </button>
        <button onClick={() => go(idx + 1, true)} className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors backdrop-blur-sm">
          <Icons.ChevronRight />
        </button>
      </>)}

      {/* Dot indicators */}
      {n > 1 && (
        <div className="absolute bottom-3 right-5 z-10 flex gap-1.5">
          {slides.map((_, i) => (
            <button key={i} onClick={() => go(i, true)} className={`rounded-full transition-all ${i === idx ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/45 hover:bg-white/70"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── LANDING ──────────────────────────────────────────────────────────────────
function LandingPage({ onNav, settings }: { onNav: (p: Page) => void; settings: SystemSettings }) {
  const hasHero = !!settings.heroImageUrl;
  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className={`relative overflow-hidden ${hasHero ? "min-h-[520px] lg:min-h-[580px]" : ""}`}>
        {/* Background image + gradient */}
        {hasHero && (
          <>
            <img src={settings.heroImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" aria-hidden />
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(0,0,0,.58) 0%, rgba(0,0,0,.35) 60%, rgba(0,0,0,.18) 100%)" }} />
          </>
        )}
        {/* Fallback radial glow when no image */}
        {!hasHero && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-green-50 to-transparent rounded-full blur-3xl opacity-60 pointer-events-none" />
        )}

        {/* Hero content */}
        <div className={`relative max-w-5xl mx-auto px-6 flex flex-col ${hasHero ? "items-start text-left pt-28 pb-24" : "items-center text-center pt-24 pb-20"}`}>
          <div className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-8 ${hasHero ? "text-green-300 bg-white/10 border border-white/25 backdrop-blur-sm" : "text-green-700 bg-green-50 border border-green-200"}`}>
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full" style={{ animation: "pulse 2s infinite" }} />
            AY 2026-2027 · 1st Semester
          </div>
          <div className={`flex items-center gap-3 mb-4 ${hasHero ? "" : "justify-center"}`}>
            <TapInMark className="w-14 h-14" />
          </div>
          <h1 className={`text-5xl font-extrabold tracking-tight leading-tight mb-2 ${hasHero ? "text-white" : "text-slate-900"}`}>TapIn</h1>
          <p className={`text-base font-semibold mb-6 ${hasHero ? "text-white/70" : "text-slate-400"}`}>
            Student Event Attendance &amp; Fee Tracking System
          </p>
          <p className={`text-lg mb-10 leading-relaxed ${hasHero ? "text-white/80 max-w-md" : "text-slate-500 max-w-lg"}`}>
            One QR code per student. Real-time attendance logging. Automatic fee tracking.
          </p>
          <div className={`flex items-center gap-3 ${hasHero ? "" : "justify-center"}`}>
            <button onClick={() => onNav("login")} className="h-11 px-6 bg-green-500 hover:bg-green-400 text-white text-sm font-semibold rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-px">
              Get started
            </button>
            <button onClick={() => onNav("events")} className={`h-11 px-6 text-sm font-semibold rounded-xl transition-all ${hasHero ? "bg-white/15 text-white border border-white/30 hover:bg-white/25 backdrop-blur-sm" : "border border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
              Browse events
            </button>
          </div>
        </div>
      </div>

      {/* ── Feature cards ─────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { I: Icons.QrCode, t: "Personal QR Code",       d: "Each student gets a unique QR code tied to their profile. Present it at any event entrance for instant logging." },
            { I: Icons.Scan,   t: "Instant scan & confirm", d: "Moderators scan student QR codes in real time with automatic duplicate detection and confirmation." },
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

      {/* ── Event carousel ────────────────────────────────────────── */}
      {settings.carouselSlides.length > 0 && (
        <div className="max-w-5xl mx-auto px-6 pb-20">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Upcoming Highlights</p>
          </div>
          <LandingCarousel slides={settings.carouselSlides} />
        </div>
      )}
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
                <div className="flex-1"><p className="font-semibold text-slate-900 text-sm">Login as Moderator</p><p className="text-xs text-slate-400 font-medium mt-0.5">Manage events, scan QR codes, view reports</p></div>
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
              <h1 className="text-2xl font-bold text-slate-900 mb-1">{role === "student" ? "Student login" : "Moderator login"}</h1>
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
interface OBForm { firstName: string; middleInitial: string; surname: string; phone: string; contactEmail: string; studentId: string; program: string; yearLevel: string; section: string; idPhotoUrl?: string; agreedToTerms?: boolean; }

function OnboardingPage({ onComplete }: { onComplete: (d: OBForm) => void }) {
  const [step, setStep] = useState(1);
  const [f, setF] = useState<OBForm>({ firstName: "", middleInitial: "", surname: "", phone: "", contactEmail: "", studentId: "", program: "", yearLevel: "", section: "" });
  const [agreed, setAgreed] = useState(false);
  const idPhotoRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof OBForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(p => ({ ...p, [k]: e.target.value }));
  const TOTAL = 6;
  const steps = [
    { t: "Your name",           d: "Enter your full name as it appears on your school ID." },
    { t: "Contact information", d: "Used for important notices and updates." },
    { t: "Student ID",          d: "Your 7-digit school-issued ID number." },
    { t: "Enrollment details",  d: "Used to group attendance records by program and section." },
    { t: "School ID photo",     d: "Take or upload a clear photo of your school-issued ID." },
    { t: "Terms & Privacy",     d: "Please read and agree to continue." },
  ];
  const canContinue = () => {
    if (step === 5) return !!f.idPhotoUrl;
    if (step === 6) return agreed;
    return true;
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8faf9]">
      <div className="w-full max-w-md">
        <div className="mb-6"><div className="flex gap-1 mb-3">{steps.map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < step ? "bg-green-600" : "bg-slate-200"}`} />)}</div><p className="text-xs text-slate-400 font-medium">Step {step} of {TOTAL}</p></div>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100"><h2 className="font-bold text-slate-900 text-lg">{steps[step - 1].t}</h2><p className="text-sm text-slate-400 mt-0.5">{steps[step - 1].d}</p></div>
          <div className="px-6 py-5 space-y-4">
            {step === 1 && (<><div className="grid grid-cols-3 gap-3"><div className="col-span-2"><FieldInput label="First Name" placeholder="e.g. Maria Luisa" value={f.firstName} onChange={set("firstName")} /></div><FieldInput label="M.I." placeholder="A" maxLength={2} value={f.middleInitial} onChange={set("middleInitial")} /></div><FieldInput label="Surname" placeholder="e.g. Santos" value={f.surname} onChange={set("surname")} /></>)}
            {step === 2 && (<><FieldInput label="Phone" type="tel" placeholder="e.g. 09XX XXX XXXX" value={f.phone} onChange={set("phone")} /><FieldInput label="Email" type="email" placeholder="e.g. student@email.com" value={f.contactEmail} onChange={set("contactEmail")} /></>)}
            {step === 3 && <FieldInput label="Student ID (7 digits, starts with 244...)" placeholder="e.g. 2440001" value={f.studentId} onChange={set("studentId")} />}
            {step === 4 && (<><FieldSelect label="Program" value={f.program} onChange={set("program")}><option value="">Select program</option><option>BSIT - Information Technology</option><option>BSCS - Computer Science</option><option>BSBA - Business Administration</option><option>BSEd - Secondary Education</option><option>BSHM - Hospitality Management</option></FieldSelect><FieldSelect label="Year Level" value={f.yearLevel} onChange={set("yearLevel")}><option value="">Select year level</option><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option></FieldSelect><FieldInput label="Section" placeholder="e.g. IT-2A" value={f.section} onChange={set("section")} /></>)}
            {step === 5 && (
              <div className="flex flex-col items-center gap-4">
                <input ref={idPhotoRef} type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={e => { const file = e.target.files?.[0]; if (file) setF(p => ({ ...p, idPhotoUrl: URL.createObjectURL(file) })); }} />
                {f.idPhotoUrl ? (
                  <div className="relative w-full rounded-xl overflow-hidden border-2 border-green-400" style={{ aspectRatio: "16/10" }}>
                    <img src={f.idPhotoUrl} alt="School ID" className="w-full h-full object-cover" />
                    <button onClick={() => setF(p => ({ ...p, idPhotoUrl: undefined }))} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"><Icons.X /></button>
                  </div>
                ) : (
                  <button onClick={() => idPhotoRef.current?.click()} className="w-full border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-3 py-10 hover:border-green-400 hover:bg-green-50/50 transition-all text-slate-400 hover:text-green-600">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center"><Icons.Camera /></div>
                    <div className="text-center"><p className="text-sm font-semibold">Take or upload ID photo</p><p className="text-xs mt-0.5">Position your school ID clearly in frame</p></div>
                  </button>
                )}
                <p className="text-[11px] text-slate-400 text-center leading-relaxed">Make sure all text on your ID is visible and legible. This is used to verify your identity.</p>
              </div>
            )}
            {step === 6 && (
              <div className="flex flex-col gap-4">
                <div className="h-52 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 leading-relaxed space-y-3">
                  <p className="font-semibold text-slate-700">Terms of Use</p>
                  <p>By creating an account on TapIn, you agree to use this system solely for legitimate attendance tracking purposes. You must not share your QR code with others or attempt to record attendance on behalf of another student. Any misuse may result in disciplinary action.</p>
                  <p className="font-semibold text-slate-700">Privacy Policy</p>
                  <p>TapIn collects your name, student ID, contact information, and attendance records to facilitate event attendance and fee management within your institution. Your data is stored securely and is accessible only to authorized moderators and system administrators within your school.</p>
                  <p>We do not sell or share your personal information with third parties. Attendance records and fine statuses are visible only to moderators of your institution. Your ID photo is used solely for identity verification during account review.</p>
                  <p className="font-semibold text-slate-700">Data Retention</p>
                  <p>Your records are retained for the duration of your enrollment and may be archived thereafter per institutional policy. You may request data correction or deletion by contacting your school's SSG office.</p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${agreed ? "bg-green-600 border-green-600" : "border-slate-300 group-hover:border-green-400"}`} onClick={() => setAgreed(v => !v)}>
                    {agreed && <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  <span className="text-sm text-slate-600 leading-snug" onClick={() => setAgreed(v => !v)}>I have read and agree to the <span className="font-semibold text-slate-800">Terms of Use</span> and <span className="font-semibold text-slate-800">Privacy Policy</span>.</span>
                </label>
              </div>
            )}
          </div>
          <div className="px-6 pb-5 flex gap-2.5">
            {step > 1 && <button onClick={() => setStep(s => s - 1)} className="h-10 px-4 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-1.5"><Icons.ChevronLeft />Back</button>}
            <button
              disabled={!canContinue()}
              onClick={() => step < TOTAL ? setStep(s => s + 1) : onComplete({ ...f, agreedToTerms: agreed })}
              className={`flex-1 h-10 text-white text-sm font-semibold rounded-lg transition-all shadow-sm ${canContinue() ? "bg-green-600 hover:bg-green-700" : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"}`}
            >{step === TOTAL ? "Complete setup" : "Continue"}</button>
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
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Document (optional)</label>
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

// ─── Shared Form Modal ────────────────────────────────────────────────────────
function FormModal({ title, onClose, footer, children }: {
  title: string; onClose: () => void;
  footer?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col" style={{ maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <p className="text-base font-bold text-slate-900">{title}</p>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"><Icons.X /></button>
        </div>
        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-5 pt-3 pb-5 flex gap-2.5 shrink-0 border-t border-slate-100">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Student Profile Modal (Moderator view, with QR) ─────────────────────────
function StudentProfileModal({ student, onClose }: { student: StudentProfile; onClose: () => void }) {
  const [tab, setTab] = useState<"info" | "qr">("info");
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <p className="font-bold text-slate-900">Student Profile</p>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><Icons.X /></button>
        </div>
        <div className="px-5 pt-4 pb-3 flex items-center gap-4">
          <Avatar name={student.name} size="lg" />
          <div>
            <p className="font-bold text-slate-900 text-base leading-tight">{student.name}</p>
            <p className="text-sm text-slate-400 font-medium">{student.id}</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">{[student.program, student.yearLevel, student.section].filter(Boolean).map(t => <span key={t} className="text-[11px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded">{t}</span>)}</div>
          </div>
        </div>
        <div className="flex gap-1 mx-5 mb-4 bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setTab("info")} className={`flex-1 h-8 rounded-lg text-xs font-semibold transition-all ${tab === "info" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>Profile Info</button>
          <button onClick={() => setTab("qr")} className={`flex-1 h-8 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${tab === "qr" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}><Icons.QrCode />QR Code</button>
        </div>
        {tab === "info" && (
          <div className="px-5 pb-5">
            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
              {[{ l: "Phone", v: student.phone }, { l: "Email", v: student.email }, { l: "Joined TapIn", v: student.joinedDate }].map((f, i, arr) => (
                <div key={f.l} className={`flex items-center justify-between px-4 py-3 ${i < arr.length - 1 ? "border-b border-slate-50" : ""}`}>
                  <span className="text-xs font-semibold text-slate-400">{f.l}</span>
                  <span className="text-sm font-semibold text-slate-900 text-right max-w-[60%] truncate">{f.v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === "qr" && (
          <div className="px-5 pb-5 text-center">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 inline-block mb-3">
              <StudentQR studentId={student.id} size={160} />
            </div>
            <p className="text-xs font-semibold text-slate-900">{student.name}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{student.id} · {student.program}</p>
            <p className="text-[10px] text-slate-300 mt-2">Moderator view — for in-person check-in assist</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Upcoming Event Card (adaptive: photo or green fallback) ──────────────────
function UpcomingEventCard({ event: ev, onClick }: { event: EventData; onClick: () => void }) {
  const cover = ev.mediaUrls?.[0] ?? null;

  /* Shared text content */
  const greenText = (dim?: boolean) => (
    <>
      <div className="flex items-center justify-between mb-3">
        <Badge status={ev.status} />
        <span className={`text-xs font-medium ${dim ? "text-white/70" : "text-green-300"}`}>Up next</span>
      </div>
      <h2 className={`font-semibold text-base leading-snug mb-3 ${dim ? "text-white" : "text-white"}`}>{ev.title}</h2>
      <div className={`flex flex-wrap gap-3 text-sm font-medium ${dim ? "text-white/75" : "text-green-200"}`}>
        <span className="flex items-center gap-1.5"><Icons.Calendar />{ev.date}</span>
        <span className="flex items-center gap-1.5"><Icons.MapPin />{ev.location}</span>
      </div>
    </>
  );

  return (
    <button onClick={onClick} className="w-full text-left mb-5 block group">
      {/* ── Mobile ── */}
      {cover ? (
        /* Photo full-bleed */
        <div className="relative md:hidden overflow-hidden rounded-xl" style={{ height: 152 }}>
          <img src={cover} alt={ev.title} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,.68) 0%, rgba(0,0,0,.22) 55%, transparent 100%)" }} />
          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge status={ev.status} />
              <span className="text-white/70 text-xs font-medium">Up next</span>
            </div>
            <h2 className="font-semibold text-base leading-snug text-white mb-1.5 line-clamp-1">{ev.title}</h2>
            <div className="flex gap-3 text-xs text-white/70 font-medium">
              <span className="flex items-center gap-1"><Icons.Calendar />{ev.date}</span>
              <span className="flex items-center gap-1"><Icons.MapPin />{ev.location}</span>
            </div>
          </div>
        </div>
      ) : (
        /* Green fallback */
        <div className="md:hidden bg-green-600 group-hover:bg-green-700 rounded-xl p-5 text-white transition-colors shadow-sm">
          {greenText()}
        </div>
      )}

      {/* ── Desktop ── */}
      {cover ? (
        /* Split card: green left + concave photo right */
        <div className="relative hidden md:block overflow-hidden rounded-xl shadow-sm group-hover:shadow-md transition-shadow" style={{ height: 160 }}>
          {/* SVG clip definition — concave left boundary for photo pane */}
          <svg width="0" height="0" style={{ position: "absolute" }}>
            <defs>
              <clipPath id="ec-photo-clip" clipPathUnits="objectBoundingBox">
                {/* left edge bows leftward at midpoint creating a crescent notch */}
                <path d="M 0.2,0 C 0,0.28 0,0.72 0.2,1 L 1,1 L 1,0 Z" />
              </clipPath>
            </defs>
          </svg>

          {/* Green background full-bleed */}
          <div className="absolute inset-0 bg-green-600 group-hover:bg-green-700 transition-colors" />

          {/* Green content pane — left 62% */}
          <div className="absolute inset-y-0 left-0 z-10 flex flex-col justify-between px-5 py-5 text-white" style={{ width: "62%" }}>
            {greenText()}
          </div>

          {/* Photo pane — right 45%, clipped with concave left arc */}
          <div className="absolute inset-y-0 right-0" style={{ width: "45%", clipPath: "url(#ec-photo-clip)" }}>
            <img src={cover} alt={ev.title} className="w-full h-full object-cover" />
            {/* Subtle left-edge blend into green */}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(22,101,52,.55) 0%, transparent 35%)" }} />
          </div>
        </div>
      ) : (
        /* Green fallback */
        <div className="hidden md:block bg-green-600 group-hover:bg-green-700 rounded-xl p-5 text-white transition-colors shadow-sm">
          {greenText()}
        </div>
      )}
    </button>
  );
}

// ─── STUDENT: Dashboard ───────────────────────────────────────────────────────
function DashboardPage({ user, onNav, fines, showFees }: { user: User; onNav: (p: Page) => void; fines: FineRecord[]; showFees: boolean }) {
  const nextEvent = INITIAL_EVENTS.find(e => e.status !== "closed");
  const unpaidFines = fines.filter(f => f.status === "unpaid");
  const total = unpaidFines.reduce((s, f) => s + f.amount, 0);
  return (
    <PageShell>
      <div className="mb-7"><p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Aug 22, 2026 · Friday</p><h1 className="text-2xl font-bold text-slate-900">Good morning, {user.firstName || "there"}.</h1></div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[{ l: "Present", v: "2" }, { l: "Absent", v: "2" }, { l: "Upcoming", v: "2" }].map(s => (<div key={s.l} className="bg-white border border-slate-100 rounded-xl px-4 py-4"><p className="text-2xl font-bold text-slate-900">{s.v}</p><p className="text-[11px] text-slate-400 font-semibold mt-1 leading-tight">{s.l}</p></div>))}
      </div>
      {showFees && unpaidFines.length > 0 && (
        <button onClick={() => onNav("my-fines")} className="w-full bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between mb-5 hover:bg-red-100 transition-all group">
          <div className="flex items-center gap-3"><div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center text-red-500 shrink-0"><Icons.Peso /></div><div className="text-left"><p className="text-sm font-bold text-red-700">Unpaid fines — ₱{total.toLocaleString()}</p><p className="text-xs text-red-500 mt-0.5">{unpaidFines.length} outstanding fine{unpaidFines.length > 1 ? "s" : ""}</p></div></div>
          <span className="text-red-400 group-hover:text-red-600"><Icons.ChevronRight /></span>
        </button>
      )}
      {nextEvent && <UpcomingEventCard event={nextEvent} onClick={() => onNav("events")} />}
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

// ─── STUDENT: Events ──────────────────────────────────────────────────────────
function EventsPage({ onNav, onSelectEvent, user, showFees }: { onNav: (p: Page) => void; onSelectEvent: (id: string) => void; user: User | null; showFees: boolean }) {
  const [filter, setFilter] = useState("all");
  const items = filter === "all" ? INITIAL_EVENTS : INITIAL_EVENTS.filter(e => e.status === filter);
  const canSeeFees = user?.role === "student" && showFees;
  return (
    <PageShell>
      <PageHeader title="Events" subtitle="AY 2026-2027, 1st Semester" />
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {[{ k: "all", l: "All" }, { k: "active", l: "Live" }, { k: "upcoming", l: "Upcoming" }, { k: "closed", l: "Closed" }].map(f => (
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
              {canSeeFees && e.fineAmount > 0 && <span className="flex items-center gap-1.5 text-red-400 font-semibold">₱{e.fineAmount} fine</span>}
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

// ─── STUDENT: Event Detail ────────────────────────────────────────────────────
function EventDetailPage({ eventId, user, showFees, onBack }: { eventId: string; user: User | null; showFees: boolean; onBack: () => void }) {
  const ev = INITIAL_EVENTS.find(e => e.id === eventId) ?? INITIAL_EVENTS[0];
  const canSeeFees = user?.role === "student" && showFees;
  return (
    <PageShell>
      <BackButton onClick={onBack} label="Back to Events" />
      <div className="bg-green-600 rounded-xl p-6 text-white mb-4 shadow-sm">
        <Badge status={ev.status} />
        <h1 className="font-bold text-xl mt-3 mb-4 leading-snug">{ev.title}</h1>
        <div className="grid grid-cols-2 gap-3">
          {[{ l: "DATE", v: ev.date }, { l: "TIME", v: ev.time }].map(d => (<div key={d.l} className="bg-white/10 rounded-lg px-3 py-2.5"><p className="text-green-300 text-[10px] font-bold uppercase tracking-widest mb-1">{d.l}</p><p className="text-sm font-semibold">{d.v}</p></div>))}
          <div className="bg-white/10 rounded-lg px-3 py-2.5 col-span-2"><p className="text-green-300 text-[10px] font-bold uppercase tracking-widest mb-1">LOCATION</p><p className="text-sm font-semibold">{ev.location}</p></div>
          {canSeeFees && ev.fineAmount > 0 && <div className="bg-white/10 rounded-lg px-3 py-2.5 col-span-2"><p className="text-green-300 text-[10px] font-bold uppercase tracking-widest mb-1">ABSENCE FEE</p><p className="text-sm font-semibold">₱{ev.fineAmount}</p></div>}
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
  const handleDownload = async () => {
    const size = 240, pad = 24, footH = 72, dpr = 2;
    const canvas = document.createElement("canvas");
    canvas.width = (size + pad * 2) * dpr; canvas.height = (size + pad * 2 + footH) * dpr;
    const ctx = canvas.getContext("2d")!; ctx.scale(dpr, dpr);
    const W = size + pad * 2;
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.roundRect(0, 0, W, size + pad * 2 + footH, 16); ctx.fill();
    const qrDataUrl = await QRCode.toDataURL(`TAPIN:${user.studentId}`, { width: size, margin: 0, color: { dark: "#111827", light: "#ffffff" }, errorCorrectionLevel: "H" });
    const img = new Image(); img.src = qrDataUrl;
    await new Promise(r => { img.onload = r; });
    ctx.drawImage(img, pad, pad, size, size);
    ctx.strokeStyle = "#f1f5f9"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad, size + pad + 12); ctx.lineTo(W - pad, size + pad + 12); ctx.stroke();
    ctx.fillStyle = "#111827"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(name, W / 2, size + pad + 32);
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px sans-serif";
    ctx.fillText(`${user.studentId} · ${user.program} ${user.yearLevel}`, W / 2, size + pad + 50);
    ctx.fillStyle = "#16a34a"; ctx.font = "bold 10px sans-serif";
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
          <div className="flex justify-center mb-5"><StudentQR studentId={user.studentId} size={192} /></div>
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
function AttendanceHistoryPage({ excuseRequests, fines, showFees, onSubmitExcuse, onBack }: { excuseRequests: ExcuseRequest[]; fines: FineRecord[]; showFees: boolean; onSubmitExcuse: (r: ExcuseRequest) => void; onBack: () => void }) {
  const [modal, setModal] = useState<typeof ATTENDANCE_RECORDS[0] | null>(null);
  return (
    <PageShell>
      <BackButton onClick={onBack} label="Back to Home" />
      <PageHeader title="My Attendance" subtitle="AY 2026-2027, 1st Semester" />
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
                {showFees && fine && eff === "absent" && <p className="text-xs text-red-500 font-semibold mt-0.5">Fee: ₱{fine.amount}</p>}
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
function MyFinesPage({ fines, showFees, onBack }: { fines: FineRecord[]; showFees: boolean; onBack: () => void }) {
  const unpaid = fines.filter(f => f.status === "unpaid");
  const total = unpaid.reduce((s, f) => s + f.amount, 0);
  if (!showFees) {
    return (
      <PageShell>
        <BackButton onClick={onBack} label="Back to Home" />
        <PageHeader title="My Fines" />
        <div className="bg-white border border-slate-100 rounded-xl px-5 py-12 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3 text-slate-400"><Icons.Peso /></div>
          <p className="font-semibold text-slate-900 text-sm">Fee information not yet available</p>
          <p className="text-xs text-slate-400 mt-1.5 max-w-[220px] mx-auto leading-relaxed">Fee details will be shown when the payment period opens. Check back soon.</p>
        </div>
      </PageShell>
    );
  }
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
        <div className="mt-4 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 flex items-start gap-3"><span className="text-slate-400 shrink-0 mt-0.5"><Icons.AlertCircle /></span><p className="text-xs text-slate-500 leading-relaxed">Pay fines at the SSG office or Accounting window. Bring your student ID. Approved excuse requests automatically waive the corresponding fee.</p></div>
      </>)}
    </PageShell>
  );
}

// ─── Profile (shared: student + moderator) ────────────────────────────────────
function ProfilePage({ user, onSave, onBack }: { user: User; onSave: (u: User) => void; onBack: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ ...user });
  const photoRef = useRef<HTMLInputElement>(null);
  const setF = (k: keyof User) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setDraft(d => ({ ...d, [k]: e.target.value }));
  const isMod = user.role === "admin";

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setDraft(d => ({ ...d, photoUrl: URL.createObjectURL(file) }));
  };

  return (
    <PageShell>
      <BackButton onClick={onBack} label={isMod ? "Back to Overview" : "Back to Home"} />
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
          <div className="relative">
            <ProfileIcon photoUrl={(editing ? draft : user).photoUrl} size="lg" />
            {editing && (
              <>
                <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                <button onClick={() => photoRef.current?.click()} className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center shadow-md transition-colors">
                  <Icons.Camera />
                </button>
              </>
            )}
          </div>
          <div>
            <p className="font-bold text-slate-900">{fullName(editing ? draft : user) || "Your name"}</p>
            <p className="text-sm text-slate-400 mt-0.5">{(editing ? draft : user).studentId || (isMod ? "Moderator" : "No ID")}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">{[(editing ? draft : user).program, (editing ? draft : user).yearLevel, (editing ? draft : user).section].filter(Boolean).map(t => <span key={t} className="text-[11px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded">{t}</span>)}</div>
          </div>
        </div>
        {editing && (
          <p className="text-[11px] text-slate-400 mb-3 flex items-center gap-1.5 -mt-1"><Icons.Camera />Tap the camera icon on the photo to change it</p>
        )}
        {!editing ? (
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
            {[
              { l: "First name",     v: user.firstName },
              { l: "Middle initial", v: user.middleInitial ? user.middleInitial + "." : "—" },
              { l: "Surname",        v: user.surname },
              ...(!isMod ? [{ l: "Student ID", v: user.studentId }] : []),
              { l: "Program",   v: user.program },
              ...(!isMod ? [{ l: "Year level", v: user.yearLevel }, { l: "Section", v: user.section || "—" }] : []),
              { l: "Phone", v: user.phone || "—" },
              { l: "Email", v: user.contactEmail || "—" },
            ].map((f, i, arr) => (
              <div key={f.l} className={`flex items-center justify-between px-5 py-3 ${i < arr.length - 1 ? "border-b border-slate-50" : ""}`}><span className="text-xs font-semibold text-slate-400">{f.l}</span><span className="text-sm font-semibold text-slate-900">{f.v}</span></div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100"><SectionLabel>Name</SectionLabel></div>
            <div className="px-5 py-4 space-y-3"><div className="grid grid-cols-3 gap-3"><div className="col-span-2"><FieldInput label="First Name" value={draft.firstName} onChange={setF("firstName")} /></div><FieldInput label="M.I." value={draft.middleInitial} maxLength={2} onChange={setF("middleInitial")} /></div><FieldInput label="Surname" value={draft.surname} onChange={setF("surname")} /></div>
            <div className="px-5 py-3.5 border-t border-slate-100 border-b border-slate-100"><SectionLabel>Contact</SectionLabel></div>
            <div className="px-5 py-4 space-y-3"><FieldInput label="Phone" type="tel" placeholder="09XX XXX XXXX" value={draft.phone} onChange={setF("phone")} /><FieldInput label="Email" type="email" value={draft.contactEmail} onChange={setF("contactEmail")} /></div>
            {!isMod && (<>
              <div className="px-5 py-3.5 border-t border-slate-100 border-b border-slate-100"><SectionLabel>Enrollment</SectionLabel></div>
              <div className="px-5 py-4 space-y-3">
                <FieldInput label="Student ID (7 digits)" value={draft.studentId} onChange={setF("studentId")} />
                <FieldSelect label="Program" value={draft.program} onChange={setF("program")}><option value="">Select program</option><option>BSIT - Information Technology</option><option>BSCS - Computer Science</option><option>BSBA - Business Administration</option><option>BSEd - Secondary Education</option><option>BSHM - Hospitality Management</option></FieldSelect>
                <FieldSelect label="Year Level" value={draft.yearLevel} onChange={setF("yearLevel")}><option value="">Select year level</option><option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option></FieldSelect>
                <FieldInput label="Section" placeholder="e.g. IT-2A" value={draft.section} onChange={setF("section")} />
              </div>
              <div className="px-5 py-3.5 bg-amber-50 border-t border-amber-100 flex items-start gap-2.5"><span className="text-amber-500 shrink-0 mt-0.5"><Icons.AlertCircle /></span><p className="text-xs text-amber-700 leading-relaxed">Saving changes will regenerate your QR code. Previously downloaded images will be invalidated.</p></div>
            </>)}
          </div>
        )}
      </div>
    </PageShell>
  );
}

// ─── MODERATOR: Dashboard ─────────────────────────────────────────────────────
function AdminDashboard({ onNav, excuseRequests }: { onNav: (p: Page) => void; excuseRequests: ExcuseRequest[] }) {
  const pending = excuseRequests.filter(r => r.status === "pending").length;
  return (
    <PageShell>
      <div className="flex items-start justify-between mb-6">
        <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Aug 22, 2026 · Friday</p><h1 className="text-xl font-bold text-slate-900">Moderator Overview</h1><p className="text-sm text-slate-400 mt-0.5">SSG General Assembly is live now</p></div>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full shrink-0"><span className="w-1.5 h-1.5 bg-green-500 rounded-full" style={{ animation: "pulse 2s infinite" }} />Live</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[{ l: "Scanned today", v: "6", sub: "SSG Assembly", c: "text-green-600" }, { l: "Duplicates", v: "1", sub: "Rejected", c: "text-red-500" }, { l: "Active events", v: "1", sub: "Live now", c: "text-sky-600" }, { l: "Students on TapIn", v: String(ALL_STUDENTS.length), sub: "Registered", c: "text-slate-700" }].map(s => (
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
      <div className="flex items-center justify-between mb-3"><p className="text-sm font-semibold text-slate-900">Recent scans — SSG General Assembly</p><button onClick={() => onNav("admin-attendees")} className="text-xs text-green-600 font-semibold hover:text-green-700 flex items-center gap-0.5">View all<Icons.ChevronRight /></button></div>
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

// ─── MODERATOR: Events ────────────────────────────────────────────────────────
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
    ([{ status: "active" as EventStatus, label: "Mark as Live", icon: <Icons.Radio /> }, { status: "upcoming" as EventStatus, label: "Mark as Upcoming", icon: <Icons.Calendar /> }, { status: "closed" as EventStatus, label: "Mark as Closed", icon: <Icons.Check /> }]).filter(o => o.status !== current);

  return (
    <PageShell>
      <PageHeader title="Events" subtitle="AY 2026-2027, 1st Semester" action={
        <button onClick={() => { setShowForm(true); setEditId(null); setEditDraft(null); }} className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"><Icons.Plus />New event</button>
      } />

      {/* New event modal */}
      {showForm && (
        <FormModal title="Create New Event" onClose={() => setShowForm(false)}
          footer={<><button onClick={handleCreate} disabled={!draft.title || !draft.date} className="flex-1 h-10 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-40">Create event</button><button onClick={() => setShowForm(false)} className="h-10 px-4 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50">Cancel</button></>}>
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
        </FormModal>
      )}

      {/* Edit event modal */}
      {editId && editDraft && (
        <FormModal title="Edit Event" onClose={() => { setEditId(null); setEditDraft(null); }}
          footer={<><button onClick={saveEdit} className="flex-1 h-10 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg shadow-sm">Save changes</button><button onClick={() => { setEditId(null); setEditDraft(null); }} className="h-10 px-4 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50">Cancel</button></>}>
          <FieldInput label="Title" value={editDraft.title} onChange={e => setEditDraft(d => d ? { ...d, title: e.target.value } : d)} />
          <div className="grid grid-cols-2 gap-3"><FieldInput label="Date" type="date" value={editDraft.date} onChange={e => setEditDraft(d => d ? { ...d, date: e.target.value } : d)} /><FieldInput label="Time" value={editDraft.time} onChange={e => setEditDraft(d => d ? { ...d, time: e.target.value } : d)} /></div>
          <FieldInput label="Location" value={editDraft.location} onChange={e => setEditDraft(d => d ? { ...d, location: e.target.value } : d)} />
          <div className="grid grid-cols-2 gap-3"><FieldSelect label="Program" value={editDraft.program} onChange={e => setEditDraft(d => d ? { ...d, program: e.target.value } : d)}><option>All Programs</option><option>BSIT / BSCS</option><option>BSIT</option><option>BSCS</option><option>BSBA</option></FieldSelect><FieldInput label="Absence Fee (₱)" type="number" min="0" value={editDraft.fineAmount.toString()} onChange={e => setEditDraft(d => d ? { ...d, fineAmount: parseInt(e.target.value) || 0 } : d)} /></div>
          <FieldTextarea label="Description" rows={3} value={editDraft.description} onChange={e => setEditDraft(d => d ? { ...d, description: e.target.value } : d)} />
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block mb-2">Photos</label>
            <input ref={editPhotoRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { Array.from(e.target.files ?? []).forEach(f => { const url = URL.createObjectURL(f); setEditDraft(d => d ? { ...d, mediaUrls: [...(d.mediaUrls ?? []), url] } : d); }); }} />
            {editDraft.mediaUrls && editDraft.mediaUrls.length > 0 && <div className="flex flex-wrap gap-2 mb-2">{editDraft.mediaUrls.map((url, i) => (<div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200"><img src={url} alt="" className="w-full h-full object-cover" /><button onClick={() => setEditDraft(d => d ? { ...d, mediaUrls: d.mediaUrls?.filter((_, j) => j !== i) } : d)} className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px]">×</button></div>))}</div>}
            <button onClick={() => editPhotoRef.current?.click()} className="w-full h-9 border border-dashed border-slate-200 rounded-lg text-xs font-semibold text-slate-400 hover:border-green-400 hover:text-green-600 flex items-center justify-center gap-1.5"><Icons.Image />Add photos</button>
          </div>
        </FormModal>
      )}
      <div className="space-y-3">
        {events.map(e => (
          <div key={e.id} className="bg-white border border-slate-100 rounded-xl overflow-hidden">
            {e.mediaUrls && e.mediaUrls.length > 0 && <div className="flex overflow-x-auto">{e.mediaUrls.map((url, i) => <img key={i} src={url} alt="" className="h-32 shrink-0 object-cover" style={{ width: e.mediaUrls!.length === 1 ? "100%" : "50%" }} />)}</div>}
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <Badge status={e.status} />
                <div className="flex items-center gap-2">
                  {e.fineAmount > 0 && <span className="text-xs text-red-500 font-semibold">₱{e.fineAmount} fine</span>}
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

// ─── MODERATOR: QR Scanner ────────────────────────────────────────────────────
function CameraScanner({ event, onResult, onClose }: {
  event: EventData;
  onResult: (r: ScanRecord) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);
  const scannedRef = useRef<boolean>(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanRecord | null>(null);
  const [torch, setTorch] = useState(false);
  const eventScans = EVENT_SCANS[event.id] ?? [];

  const resolveQr = (raw: string) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    const id = raw.startsWith("TAPIN:") ? raw.slice(6) : raw;
    const existing = eventScans.find(s => s.id === id);
    const time = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    const rec: ScanRecord = existing
      ? { ...existing, status: "duplicate" as const }
      : { name: `Student ${id}`, id, program: "BSIT", section: "IT-1A", time, status: "confirmed" as const, dbId: Date.now() };
    setSweeping(true);
    setTimeout(() => { setResult(rec); onResult(rec); }, 700);
  };

  useEffect(() => {
    let active = true;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
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
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, w, h);
              const imageData = ctx.getImageData(0, 0, w, h);
              const code = jsQR(imageData.data, w, h, { inversionAttempts: "dontInvert" });
              if (code?.data) { resolveQr(code.data); return; }
            }
          }
          animRef.current = requestAnimationFrame(tickRef.current);
        };
        animRef.current = requestAnimationFrame(tickRef.current);
      } catch {
        if (active) setCamError("Camera access denied. Please allow camera permission and try again.");
      }
    }
    start();
    return () => {
      active = false;
      cancelAnimationFrame(animRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await (track as MediaStreamTrack & { applyConstraints: (c: object) => Promise<void> })
        .applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] });
      setTorch(t => !t);
    } catch { /* not supported */ }
  };

  const [sweeping, setSweeping] = useState(false);
  const tickRef = useRef<() => void>(() => {});
  const scanAgain = () => { scannedRef.current = false; setSweeping(false); setResult(null); animRef.current = requestAnimationFrame(tickRef.current); };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Scanner header */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-safe" style={{ paddingTop: "max(16px, env(safe-area-inset-top))", paddingBottom: "16px", background: "linear-gradient(to bottom, rgba(0,0,0,.7) 0%, transparent 100%)" }}>
        <button onClick={onClose} className="flex items-center gap-2 text-white/90 hover:text-white transition-colors">
          <Icons.ChevronLeft />
          <span className="text-sm font-semibold">Back</span>
        </button>
        <div className="text-center">
          <p className="text-white text-sm font-semibold leading-tight truncate max-w-[180px]">{event.title}</p>
          <p className="text-white/50 text-xs mt-0.5">{event.date}</p>
        </div>
        <button onClick={toggleTorch} className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${torch ? "bg-yellow-400 text-slate-900" : "bg-white/15 text-white"}`} title="Toggle flash">
          <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
        </button>
      </div>

      {/* Camera viewport */}
      <div className="flex-1 relative overflow-hidden">
        {/* Live video */}
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        {/* Hidden canvas for jsQR frame decoding */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Dark vignette overlay */}
        {!result && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 60% at 50% 50%, transparent 0%, rgba(0,0,0,.55) 100%)" }} />
            {/* Scan frame */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72">
              {/* Scanline — static when idle, single sweep on QR detect */}
              <div
                className={`absolute inset-x-0 h-[2px] rounded-full ${sweeping ? "scan-sweep" : ""}`}
                style={{
                  top: sweeping ? "8%" : "50%",
                  background: "linear-gradient(90deg, transparent 0%, rgba(74,222,128,0.9) 20%, #4ade80 50%, rgba(74,222,128,0.9) 80%, transparent 100%)",
                  boxShadow: "0 0 10px 2px rgba(74,222,128,0.55)",
                  opacity: sweeping ? 1 : 0.6,
                  transition: sweeping ? "none" : "opacity 0.3s",
                }}
              />
              {/* Corner marks */}
              {[
                "top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-lg",
                "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-lg",
                "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-lg",
                "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-lg",
              ].map((cls, i) => <div key={i} className={`absolute w-8 h-8 border-green-400 ${cls}`} />)}
            </div>
            {!camError && <p className="absolute bottom-12 text-white/60 text-xs font-medium tracking-wide">Point camera at student's QR code</p>}
          </div>
        )}

        {/* Camera error state */}
        {camError && !result && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/90 text-center px-8">
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white/50">
              <Icons.AlertCircle />
            </div>
            <p className="text-white font-semibold">{camError}</p>
            <p className="text-white/50 text-sm">Ensure camera permissions are allowed in your browser settings.</p>
          </div>
        )}

        {/* Result overlay */}
        {result && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 px-8 gap-4">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl ${result.status === "confirmed" ? "bg-green-500" : "bg-red-500"}`}>
              {result.status === "confirmed"
                ? <svg viewBox="0 0 24 24" className="w-9 h-9" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                : <svg viewBox="0 0 24 24" className="w-9 h-9" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              }
            </div>
            <div className="text-center">
              <p className={`text-lg font-bold ${result.status === "confirmed" ? "text-green-400" : "text-red-400"}`}>
                {result.status === "confirmed" ? "Attendance Confirmed" : "Duplicate — Rejected"}
              </p>
              <p className="text-white text-base font-semibold mt-1">{result.name}</p>
              <p className="text-white/60 text-sm mt-0.5">{result.id} · {result.program} · {result.section}</p>
            </div>
            <div className="flex gap-3 mt-2">
              <button onClick={scanAgain} className="h-11 px-6 bg-white text-slate-900 text-sm font-semibold rounded-xl hover:bg-slate-100 transition-colors">
                Scan next
              </button>
              <button onClick={onClose} className="h-11 px-6 bg-white/15 text-white text-sm font-semibold rounded-xl hover:bg-white/25 transition-colors">
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom hint */}
      {!result && !camError && (
        <div className="relative z-10 px-6 flex flex-col gap-2 items-center" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))", paddingTop: "16px", background: "linear-gradient(to top, rgba(0,0,0,.75) 0%, transparent 100%)" }}>
          <p className="text-white/50 text-xs text-center">Camera active · Scanning automatically</p>
        </div>
      )}

    </div>
  );
}

function AdminScannerPage() {
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanned, setScanned] = useState<ScanRecord[]>([]);
  const activeEvents = INITIAL_EVENTS.filter(e => e.status === "active" || e.status === "upcoming");
  const selectedEvent = INITIAL_EVENTS.find(e => e.id === selectedEventId);

  const handleResult = (r: ScanRecord) => {
    setScanned(prev => [{ ...r, time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) }, ...prev]);
  };

  if (scannerOpen && selectedEvent) {
    return <CameraScanner event={selectedEvent} onResult={handleResult} onClose={() => setScannerOpen(false)} />;
  }

  return (
    <PageShell>
      <PageHeader title="QR Scanner" subtitle="Select an event to begin scanning." />
      <div className="max-w-lg mx-auto space-y-4">
        {/* Event selection */}
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-50">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Select event</p>
          </div>
          <div className="p-3 space-y-1">
            {activeEvents.length === 0 && (
              <p className="px-3 py-4 text-sm text-slate-400 text-center">No active or upcoming events.</p>
            )}
            {activeEvents.map(e => (
              <button
                key={e.id}
                onClick={() => setSelectedEventId(e.id)}
                className={`w-full text-left px-4 py-3.5 rounded-xl transition-all flex items-center gap-4 ${selectedEventId === e.id ? "bg-green-50 ring-1 ring-green-200" : "hover:bg-slate-50"}`}
              >
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${e.status === "active" ? "bg-green-500" : "bg-slate-300"}`} style={e.status === "active" ? { animation: "pulse 2s infinite" } : {}} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${selectedEventId === e.id ? "text-green-900" : "text-slate-900"}`}>{e.title}</p>
                  <p className={`text-xs mt-0.5 ${selectedEventId === e.id ? "text-green-600" : "text-slate-400"}`}>{e.date} · {e.location}</p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {e.status === "active" && <Badge status="active" />}
                  {selectedEventId === e.id && <span className="text-green-600"><Icons.Check /></span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Open scanner CTA */}
        {selectedEvent ? (
          <div className="space-y-3">
            <div className="bg-white border border-slate-100 rounded-xl px-4 py-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-green-50 border border-green-100 rounded-xl flex items-center justify-center text-green-600 shrink-0">
                <Icons.Scan />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{selectedEvent.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{selectedEvent.date} · {selectedEvent.location}</p>
              </div>
              {selectedEvent.fineAmount > 0 && (
                <span className="text-xs font-bold text-red-500 shrink-0">₱{selectedEvent.fineAmount} fee</span>
              )}
            </div>
            <button
              onClick={() => setScannerOpen(true)}
              className="w-full h-14 bg-green-600 hover:bg-green-700 active:scale-[.99] text-white text-base font-bold rounded-2xl flex items-center justify-center gap-3 transition-all shadow-md shadow-green-900/20"
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
            <p className="text-slate-500 text-sm font-medium">Select an event above to open the scanner</p>
          </div>
        )}

        {/* Recent scans this session */}
        {scanned.length > 0 && (
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-50 flex items-center justify-between">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Scanned this session</p>
              <span className="text-[11px] font-bold text-green-600">{scanned.length}</span>
            </div>
            {scanned.slice(0, 8).map((s, i) => (
              <div key={i} className={`flex items-center gap-3 px-5 py-3.5 ${i < Math.min(scanned.length, 8) - 1 ? "border-b border-slate-50" : ""}`}>
                <Avatar name={s.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{s.name}</p>
                  <p className="text-[11px] text-slate-400">{s.id} · {s.time}</p>
                </div>
                <Badge status={s.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}

// ─── MODERATOR: Attendees ─────────────────────────────────────────────────────
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
          Absent ({absentees.length}){selectedEvent.fineAmount > 0 && <span className="text-red-500 ml-1">· P{selectedEvent.fineAmount}</span>}
        </button>
      </div>
      {tab === "present" && (<>
        {confirmed.length === 0 ? (<div className="bg-white border border-slate-100 rounded-xl px-5 py-10 text-center"><p className="text-slate-400 text-sm font-medium">No scans recorded for this event yet.</p></div>) : (
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden mb-4">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase tracking-widest"><span className="col-span-5">Student</span><span className="col-span-3">Program</span><span className="col-span-2">Time</span><span className="col-span-2 text-right">Status</span></div>
            {confirmed.map((s, i) => (<div key={s.dbId} className={`px-5 py-3.5 grid grid-cols-12 items-center ${i < confirmed.length - 1 ? "border-b border-slate-50" : ""}`}><div className="col-span-5 flex items-center gap-3 min-w-0"><Avatar name={s.name} size="sm" /><div className="min-w-0"><p className="text-sm font-semibold text-slate-900 truncate">{s.name}</p><p className="text-[11px] text-slate-400">{s.id}</p></div></div><span className="col-span-3 text-xs text-slate-500">{s.program}</span><span className="col-span-2 text-xs text-slate-500">{s.time}</span><div className="col-span-2 flex justify-end"><Badge status={s.status} /></div></div>))}
          </div>
        )}
        {duplicates.length > 0 && (<><SectionLabel>Duplicate scans — tap trash to remove</SectionLabel><div className="bg-white border border-red-100 rounded-xl overflow-hidden">{duplicates.map((s, i) => (<div key={s.dbId} className={`px-5 py-3.5 flex items-center gap-3 ${i < duplicates.length - 1 ? "border-b border-slate-50" : ""}`}><Avatar name={s.name} size="sm" /><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-900 truncate">{s.name}</p><p className="text-[11px] text-slate-400">{s.id} · scanned {s.time}</p></div><Badge status={s.status} /><button onClick={() => deleteRecord(s.dbId)} className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"><Icons.Trash /></button></div>))}</div></>)}
      </>)}
      {tab === "absent" && (<>
        {selectedEvent.fineAmount > 0 && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3"><Icons.AlertCircle /><p className="text-sm text-red-700">Each absentee is automatically fined <span className="font-bold">₱{selectedEvent.fineAmount}</span>.</p></div>}
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

// ─── MODERATOR: Students ──────────────────────────────────────────────────────
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
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, ID, program, or section..." className="w-full h-10 pl-9 pr-9 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-300 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all" />
        {query && <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"><Icons.X /></button>}
      </div>
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-xl px-5 py-10 text-center"><p className="text-slate-400 text-sm">No students match "{query}"</p></div>
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

// ─── MODERATOR: Announcements ─────────────────────────────────────────────────
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
      <PageHeader title="Announcements" action={<button onClick={() => { setShowForm(true); setEditId(null); setEditDraft(null); }} className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"><Icons.Plus />New post</button>} />

      {showForm && (
        <FormModal title="New Announcement" onClose={() => setShowForm(false)}
          footer={<><button onClick={handlePublish} disabled={!newTitle.trim()} className="flex-1 h-10 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-40">Publish</button><button onClick={() => setShowForm(false)} className="h-10 px-4 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50">Cancel</button></>}>
          <FieldInput label="Title" placeholder="e.g. Enrollment Now Open" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
          <FieldSelect label="Category" value={newBadge} onChange={e => setNewBadge(e.target.value)}><option>General</option><option>Academic</option><option>Schedule</option><option>Financial</option><option>Facilities</option><option>Events</option></FieldSelect>
          <FieldTextarea label="Body" placeholder="Write your announcement..." rows={4} value={newBody} onChange={e => setNewBody(e.target.value)} />
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Photo (optional)</label>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setNewPhoto(URL.createObjectURL(f)); }} />
            {newPhoto ? (<div className="relative rounded-xl overflow-hidden border border-slate-200"><img src={newPhoto} alt="" className="w-full h-40 object-cover" /><button onClick={() => setNewPhoto(null)} className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"><Icons.X /></button></div>) : <button onClick={() => photoRef.current?.click()} className="w-full h-10 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-green-400 hover:text-green-600 flex items-center justify-center gap-2"><Icons.Image />Attach photo</button>}
          </div>
        </FormModal>
      )}

      {editId && editDraft && (
        <FormModal title="Edit Announcement" onClose={() => { setEditId(null); setEditDraft(null); }}
          footer={<><button onClick={saveEdit} className="flex-1 h-10 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg shadow-sm">Save changes</button><button onClick={() => { setEditId(null); setEditDraft(null); }} className="h-10 px-4 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50">Cancel</button></>}>
          <FieldInput label="Title" value={editDraft.title} onChange={e => setEditDraft(d => d ? { ...d, title: e.target.value } : d)} />
          <FieldSelect label="Category" value={editDraft.badge} onChange={e => setEditDraft(d => d ? { ...d, badge: e.target.value } : d)}><option>General</option><option>Academic</option><option>Schedule</option><option>Financial</option><option>Facilities</option><option>Events</option></FieldSelect>
          <FieldTextarea label="Body" rows={4} value={editDraft.body} onChange={e => setEditDraft(d => d ? { ...d, body: e.target.value } : d)} />
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Photo</label>
            <input ref={editPhotoRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setEditDraft(d => d ? { ...d, photoUrl: URL.createObjectURL(f) } : d); }} />
            {editDraft.photoUrl ? (<div className="relative rounded-xl overflow-hidden border border-slate-200"><img src={editDraft.photoUrl} alt="" className="w-full h-40 object-cover" /><button onClick={() => setEditDraft(d => d ? { ...d, photoUrl: "" } : d)} className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"><Icons.X /></button></div>) : <button onClick={() => editPhotoRef.current?.click()} className="w-full h-10 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-green-400 hover:text-green-600 flex items-center justify-center gap-2"><Icons.Image />Attach photo</button>}
          </div>
        </FormModal>
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

// ─── MODERATOR: Excuse Requests ───────────────────────────────────────────────
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

// ─── MODERATOR: Reports ───────────────────────────────────────────────────────
function AdminReportsPage() {
  return (
    <PageShell>
      <PageHeader title="Reports" subtitle="AY 2026-2027, 1st Semester" action={<button className="h-9 px-3.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 flex items-center gap-1.5"><Icons.Download />Export CSV</button>} />
      <SectionLabel>Attendance by program</SectionLabel>
      <div className="grid md:grid-cols-2 gap-3 mb-6">{[{ l: "BSIT", n: 234, total: 301, pct: 78, c: "bg-green-500" }, { l: "BSCS", n: 198, total: 304, pct: 65, c: "bg-sky-500" }, { l: "BSBA", n: 156, total: 300, pct: 52, c: "bg-violet-400" }, { l: "BSEd", n: 89, total: 197, pct: 45, c: "bg-amber-400" }].map(r => (<div key={r.l} className="bg-white border border-slate-100 rounded-xl px-5 py-4"><div className="flex items-center justify-between mb-3"><span className="font-bold text-slate-900 text-sm">{r.l}</span><span className="text-xs text-slate-400 font-semibold">{r.n} / {r.total}</span></div><div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2"><div className={`h-full ${r.c} rounded-full`} style={{ width: `${r.pct}%` }} /></div><p className="text-[11px] text-slate-400 font-semibold">{r.pct}% attendance rate</p></div>))}</div>
      <SectionLabel>Fees summary</SectionLabel>
      <div className="grid grid-cols-3 gap-3 mb-6">{[{ l: "Total fees issued", v: "₱42,500", c: "text-red-600" }, { l: "Collected", v: "₱18,200", c: "text-green-600" }, { l: "Pending", v: "₱24,300", c: "text-amber-600" }].map(s => (<div key={s.l} className="bg-white border border-slate-100 rounded-xl px-4 py-4"><p className={`text-xl font-bold ${s.c}`}>{s.v}</p><p className="text-[11px] text-slate-400 font-semibold mt-1 leading-tight">{s.l}</p></div>))}</div>
      <SectionLabel>By event</SectionLabel>
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">{INITIAL_EVENTS.filter(e => e.status !== "upcoming").map((e, i, arr) => (<div key={e.id} className={`flex items-center justify-between px-5 py-4 ${i < arr.length - 1 ? "border-b border-slate-50" : ""}`}><div><p className="text-sm font-semibold text-slate-900">{e.title}</p><p className="text-[11px] text-slate-400 mt-0.5">{e.date} · ₱{e.fineAmount} fee</p></div><div className="text-right"><p className="font-bold text-green-600 text-lg">{e.attendees}</p><p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">attended</p></div></div>))}</div>
    </PageShell>
  );
}

// ─── MODERATOR: Management & Settings ────────────────────────────────────────
interface CarouselSlide { imageUrl: string; caption: string; date: string; }
interface SystemSettings {
  showFees: boolean;
  allowExcuseRequests: boolean;
  requirePhotoId: boolean;
  academicYear: string;
  semester: string;
  institution: string;
  heroImageUrl: string;
  carouselSlides: CarouselSlide[];
}

function AdminSettingsPage({ settings, onSave }: { settings: SystemSettings; onSave: (s: SystemSettings) => void }) {
  const update = (patch: Partial<SystemSettings>) => onSave({ ...settings, ...patch });
  const toggle = (k: "showFees" | "allowExcuseRequests" | "requirePhotoId") =>
    onSave({ ...settings, [k]: !settings[k] });
  const heroRef = useRef<HTMLInputElement>(null);
  const slideRefs = useRef<(HTMLInputElement | null)[]>([]);
  const addSlide = () => {
    if (settings.carouselSlides.length >= 10) return;
    update({ carouselSlides: [...settings.carouselSlides, { imageUrl: "", caption: "", date: "" }] });
  };
  const removeSlide = (i: number) => update({ carouselSlides: settings.carouselSlides.filter((_, j) => j !== i) });
  const moveSlide = (i: number, dir: -1 | 1) => {
    const arr = [...settings.carouselSlides];
    const t = i + dir;
    if (t < 0 || t >= arr.length) return;
    [arr[i], arr[t]] = [arr[t], arr[i]];
    update({ carouselSlides: arr });
  };
  const patchSlide = (i: number, patch: Partial<CarouselSlide>) => {
    const arr = settings.carouselSlides.map((s, j) => j === i ? { ...s, ...patch } : s);
    update({ carouselSlides: arr });
  };

  return (
    <PageShell>
      <PageHeader title="Management & Settings" subtitle="Changes are saved automatically" />

      {/* Fee Visibility */}
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Fee Visibility</p>
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden mb-5">
        <div className="px-5 divide-y divide-slate-50">
          <Toggle
            on={settings.showFees}
            onToggle={() => toggle("showFees")}
            label="Show fees to students"
            desc="Enable during fee-paying week so students can see absence fine amounts across events, attendance history, and their Fines page."
          />
        </div>
        <div className={`mx-5 mb-4 rounded-lg px-3.5 py-2.5 flex items-center gap-2.5 transition-colors ${settings.showFees ? "bg-green-50 border border-green-200" : "bg-slate-50 border border-slate-200"}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${settings.showFees ? "bg-green-500" : "bg-slate-400"}`} style={settings.showFees ? { animation: "pulse 2s infinite" } : {}} />
          <p className={`text-xs font-medium leading-relaxed ${settings.showFees ? "text-green-800" : "text-slate-500"}`}>
            Fees are <span className="font-bold">{settings.showFees ? "visible" : "hidden"}</span> to students
            {!settings.showFees && " — enable when the payment period opens"}
          </p>
        </div>
      </div>

      {/* Attendance & Requests */}
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Attendance &amp; Requests</p>
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

      {/* Academic Information */}
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Academic Information</p>
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden mb-5">
        <div className="px-5 py-4 space-y-3">
          <FieldInput
            label="Institution name"
            value={settings.institution}
            onChange={e => update({ institution: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput
              label="Academic year"
              placeholder="e.g. 2026-2027"
              value={settings.academicYear}
              onChange={e => update({ academicYear: e.target.value })}
            />
            <FieldSelect label="Semester" value={settings.semester} onChange={e => update({ semester: e.target.value })}>
              <option>1st Semester</option>
              <option>2nd Semester</option>
              <option>Summer</option>
            </FieldSelect>
          </div>
        </div>
      </div>

      {/* Landing Page */}
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Landing Page</p>

      {/* Hero image */}
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden mb-3">
        <div className="px-5 py-4">
          <p className="text-sm font-semibold text-slate-900 mb-0.5">Hero image</p>
          <p className="text-xs text-slate-400 mb-3">Shown as the full-width background behind the headline. A dark gradient overlay keeps text readable.</p>
          <input ref={heroRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) update({ heroImageUrl: URL.createObjectURL(f) }); }} />
          {settings.heroImageUrl ? (
            <div className="relative rounded-xl overflow-hidden border border-slate-200">
              <img src={settings.heroImageUrl} alt="Hero preview" className="w-full h-36 object-cover" />
              <div className="absolute inset-0 bg-black/30" />
              <div className="absolute bottom-2 right-2 flex gap-2">
                <button onClick={() => heroRef.current?.click()} className="h-7 px-3 bg-white/90 hover:bg-white text-slate-700 text-xs font-semibold rounded-lg transition-colors">Replace</button>
                <button onClick={() => update({ heroImageUrl: "" })} className="h-7 px-3 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors">Remove</button>
              </div>
            </div>
          ) : (
            <button onClick={() => heroRef.current?.click()} className="w-full h-24 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-green-400 hover:text-green-600 flex items-center justify-center gap-2 transition-colors">
              <Icons.Image />Upload hero image
            </button>
          )}
        </div>
      </div>

      {/* Carousel slides */}
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden mb-5">
        <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Event carousel</p>
            <p className="text-xs text-slate-400 mt-0.5">Up to 10 slides shown below the feature cards on the landing page.</p>
          </div>
          {settings.carouselSlides.length < 10 && (
            <button onClick={addSlide} className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0">
              <Icons.Plus />Add slide
            </button>
          )}
        </div>
        {settings.carouselSlides.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-slate-400">No slides yet — add one above.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {settings.carouselSlides.map((slide, i) => {
              const ref = (el: HTMLInputElement | null) => { slideRefs.current[i] = el; };
              return (
                <div key={i} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    <div className="shrink-0">
                      <input ref={ref} type="file" accept="image/*" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) patchSlide(i, { imageUrl: URL.createObjectURL(f) }); }} />
                      {slide.imageUrl ? (
                        <div className="relative w-20 h-14 rounded-lg overflow-hidden border border-slate-200 cursor-pointer" onClick={() => slideRefs.current[i]?.click()}>
                          <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><Icons.Camera /></div>
                        </div>
                      ) : (
                        <button onClick={() => slideRefs.current[i]?.click()} className="w-20 h-14 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 hover:border-green-400 hover:text-green-600 flex items-center justify-center transition-colors">
                          <Icons.Image />
                        </button>
                      )}
                    </div>
                    {/* Fields */}
                    <div className="flex-1 space-y-2 min-w-0">
                      <FieldInput label="Caption" placeholder="e.g. Foundation Day Celebration" value={slide.caption} onChange={e => patchSlide(i, { caption: e.target.value })} />
                      <FieldInput label="Date (optional)" placeholder="e.g. Aug 29, 2026" value={slide.date} onChange={e => patchSlide(i, { date: e.target.value })} />
                    </div>
                    {/* Controls */}
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => moveSlide(i, -1)} disabled={i === 0} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                      </button>
                      <button onClick={() => moveSlide(i, 1)} disabled={i === settings.carouselSlides.length - 1} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                      <button onClick={() => removeSlide(i)} className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 transition-colors">
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

      {/* System Info */}
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">System</p>
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
        {[{ l: "System name", v: "TapIn" }, { l: "Version", v: "1.0.0" }, { l: "Environment", v: "Production" }].map((r, i, arr) => (
          <div key={r.l} className={`flex items-center justify-between px-5 py-3.5 ${i < arr.length - 1 ? "border-b border-slate-50" : ""}`}>
            <span className="text-sm text-slate-500">{r.l}</span>
            <span className="text-sm font-semibold text-slate-900">{r.v}</span>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS: SystemSettings = {
  showFees: false,
  allowExcuseRequests: true,
  requirePhotoId: false,
  academicYear: "2026-2027",
  semester: "1st Semester",
  institution: "TapIn",
  heroImageUrl: "",
  carouselSlides: [],
};

export default function App() {
  const [page, setPage] = useState<Page>("landing");
  const [user, setUser] = useState<User | null>(null);
  const [toast, setToast] = useState<{ msg: string; variant?: "success" | "error" } | null>(null);
  const [selectedEventId, setSelectedEventId] = useState("1");
  const [qrVersion, setQrVersion] = useState(1);
  const [excuseRequests, setExcuseRequests] = useState<ExcuseRequest[]>([]);
  const [fines, setFines] = useState<FineRecord[]>(STUDENT_FINES);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [menuOpen, setMenuOpen] = useState(false);
  const [seenAnnouncements, setSeenAnnouncements] = useState(0);

  const show = (msg: string, variant: "success" | "error" = "success") => { setToast({ msg, variant }); setTimeout(() => setToast(null), 3500); };

  const isMod = user?.role === "admin";
  const pendingExcuses = excuseRequests.filter(r => r.status === "pending").length;
  const unreadAnnouncements = Math.max(0, INITIAL_ANNOUNCEMENTS.length - seenAnnouncements);
  const unpaidFines = fines.filter(f => f.status === "unpaid").length;
  const sideBadges: Partial<Record<Page, number>> = isMod
    ? { "admin-excuse-requests": pendingExcuses }
    : { "announcements": unreadAnnouncements, "my-fines": unpaidFines };

  const handleLogin = (role: Role) => {
    if (role === "student") { setUser({ firstName: "", middleInitial: "", surname: "", studentId: "", program: "", yearLevel: "", section: "", phone: "", contactEmail: "", role: "student" }); setPage("onboarding"); }
    else { setUser({ firstName: "Rafael", middleInitial: "M", surname: "Rivera", studentId: "ADMIN-001", program: "Moderator", yearLevel: "", section: "", phone: "09171234567", contactEmail: "moderator@tapin.edu", role: "admin" }); setPage("admin-dashboard"); }
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
  const handleLogout = () => { setUser(null); setPage("landing"); setMenuOpen(false); };
  const bare: Page[] = ["landing", "login", "onboarding"];
  const isBare = bare.includes(page);
  const goBack = (fallback: Page) => () => setPage(fallback);
  const navigate = (p: Page) => { setPage(p); setMenuOpen(false); };

  return (
    <div className="h-full flex flex-col bg-[#f8faf9]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {!isBare && <TopBar user={user} onNav={navigate} onMenuOpen={() => setMenuOpen(true)} />}
      <div className={`flex-1 flex min-h-0 ${!isBare ? "overflow-hidden" : ""}`}>
        {!isBare && user && (
          <Sidebar
            page={page}
            user={user}
            open={menuOpen}
            onNav={p => { if (p === "announcements") setSeenAnnouncements(INITIAL_ANNOUNCEMENTS.length); navigate(p); }}
            onClose={() => setMenuOpen(false)}
            onLogout={handleLogout}
            badges={sideBadges}
          />
        )}
        <main className={`flex-1 bg-[#f8faf9] ${!isBare ? "overflow-y-auto" : ""}`}>
          {page === "landing"               && <LandingPage onNav={navigate} settings={settings} />}
          {page === "login"                 && <LoginPage onLogin={handleLogin} onBack={() => navigate("landing")} />}
          {page === "onboarding"            && <OnboardingPage onComplete={handleOnboarding} />}
          {page === "dashboard"   && user   && !isMod && <DashboardPage user={user} onNav={navigate} fines={fines} showFees={settings.showFees} />}
          {page === "events"                && <EventsPage onNav={navigate} onSelectEvent={setSelectedEventId} user={user} showFees={settings.showFees} />}
          {page === "event-detail"          && <EventDetailPage eventId={selectedEventId} user={user} showFees={settings.showFees} onBack={goBack("events")} />}
          {page === "my-qr"       && user   && <MyQRPage user={user} qrVersion={qrVersion} onBack={goBack("dashboard")} />}
          {page === "announcements"         && <AnnouncementsPage onBack={goBack(isMod ? "admin-dashboard" : "dashboard")} />}
          {page === "attendance-history"    && <AttendanceHistoryPage excuseRequests={excuseRequests} fines={fines} showFees={settings.showFees} onSubmitExcuse={r => { setExcuseRequests(p => [...p, r]); show("Excuse request submitted"); }} onBack={goBack("dashboard")} />}
          {page === "my-fines"    && user   && <MyFinesPage fines={fines} showFees={settings.showFees} onBack={goBack("dashboard")} />}
          {page === "profile"     && user   && <ProfilePage user={user} onSave={handleProfileSave} onBack={goBack(isMod ? "admin-dashboard" : "dashboard")} />}
          {page === "admin-dashboard"       && isMod && <AdminDashboard onNav={navigate} excuseRequests={excuseRequests} />}
          {page === "admin-events"          && isMod && <AdminEventsPage onNav={navigate} />}
          {page === "admin-scanner"         && isMod && <AdminScannerPage />}
          {page === "admin-attendees"       && isMod && <AdminAttendeesPage onNav={navigate} />}
          {page === "admin-students"        && isMod && <AdminStudentsPage />}
          {page === "admin-announcements"   && isMod && <AdminAnnouncementsPage />}
          {page === "admin-excuse-requests" && isMod && <AdminExcuseRequestsPage requests={excuseRequests} onAction={handleExcuseAction} onBack={goBack("admin-dashboard")} />}
          {page === "admin-reports"         && isMod && <AdminReportsPage />}
          {page === "admin-settings"        && isMod && <AdminSettingsPage settings={settings} onSave={setSettings} />}
        </main>
      </div>
      {toast && <Toast message={toast.msg} variant={toast.variant} />}
    </div>
  );
}
