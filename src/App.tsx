import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Page =
  | "landing" | "login" | "onboarding"
  | "dashboard" | "my-qr" | "events" | "event-detail"
  | "announcements" | "attendance-history" | "profile"
  | "admin-dashboard" | "admin-events" | "admin-scanner"
  | "admin-attendees" | "admin-announcements" | "admin-reports";

type Role = "student" | "admin" | null;

interface User {
  firstName: string;
  middleInitial: string;
  surname: string;
  studentId: string;
  program: string;
  yearLevel: string;
  section: string;
  role: Role;
}

function fullName(u: Pick<User, "firstName" | "middleInitial" | "surname">) {
  const mid = u.middleInitial ? ` ${u.middleInitial}.` : "";
  return `${u.firstName}${mid} ${u.surname}`.trim();
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const EVENTS = [
  { id: "1", title: "DLSJBC Foundation Day Celebration", date: "Aug 29, 2026", time: "8:00 AM – 5:00 PM", location: "Main Gymnasium", status: "upcoming", attendees: 0, description: "Annual Foundation Day celebration featuring cultural shows, sports competitions, and academic exhibits. Attendance is required for all enrolled students.", program: "All Programs" },
  { id: "2", title: "SSC General Assembly — 1st Semester", date: "Aug 22, 2026", time: "1:00 PM – 4:00 PM", location: "Audio-Visual Room 2", status: "active", attendees: 143, description: "Supreme Student Council general assembly for the first semester. Agenda includes budget presentation, committee reports, and open forum.", program: "All Programs" },
  { id: "3", title: "Tech Talk: AI in Education", date: "Aug 15, 2026", time: "2:00 PM – 5:00 PM", location: "ICT Laboratory", status: "closed", attendees: 87, description: "Integration of artificial intelligence tools in modern education. Guest speaker from the Department of Information Technology.", program: "BSIT / BSCS" },
  { id: "4", title: "Intramural Opening Ceremony", date: "Sep 5, 2026", time: "7:30 AM – 12:00 PM", location: "Covered Court", status: "upcoming", attendees: 0, description: "Opening ceremony for the annual intramural sports festival. Parade of athletes, oath-taking, and opening of games.", program: "All Programs" },
];

const ANNOUNCEMENTS = [
  { id: "1", title: "Enrollment for 2nd Semester Now Open", body: "Online enrollment for the second semester of AY 2026–2027 is now open. Proceed to the Student Portal and complete enrollment on or before September 15, 2026. Late enrollees are subject to a ₱200 surcharge.", date: "Aug 20, 2026", author: "Registrar's Office", badge: "Academic" },
  { id: "2", title: "Afternoon Classes Suspended — Aug 22", body: "Due to the SSC General Assembly on August 22, all afternoon classes from 1:00 PM onward are suspended. Morning classes proceed as scheduled. All students are required to attend the assembly.", date: "Aug 19, 2026", author: "Office of the Principal", badge: "Schedule" },
  { id: "3", title: "Library Hours Extended During Finals Week", body: "The school library will be open from 7:00 AM to 7:00 PM starting August 25 until September 6. Laptops are allowed; food and drinks are not permitted inside.", date: "Aug 18, 2026", author: "Library Services", badge: "Facilities" },
  { id: "4", title: "Scholarship Application Deadline — Aug 28", body: "All scholarship applicants must submit complete documentary requirements to the Scholarship Office by August 28, 2026. Contact scholarship@dlsjbc.edu.ph for inquiries.", date: "Aug 17, 2026", author: "Scholarship Office", badge: "Financial" },
];

const ATTENDANCE_RECORDS = [
  { event: "SSC General Assembly — 1st Semester", date: "Aug 22, 2026", time: "1:14 PM" },
  { event: "Tech Talk: AI in Education", date: "Aug 15, 2026", time: "2:03 PM" },
  { event: "College Orientation 2026", date: "Aug 5, 2026", time: "8:47 AM" },
  { event: "Leadership and Values Seminar", date: "Jul 28, 2026", time: "9:02 AM" },
];

const ADMIN_SCANS = [
  { name: "Maria Luisa Santos", id: "2024-0014", program: "BSIT", section: "IT-2A", time: "1:14 PM", status: "confirmed" },
  { name: "Juan Carlos Dela Cruz", id: "2024-0042", program: "BSCS", section: "CS-1B", time: "1:15 PM", status: "confirmed" },
  { name: "Alyssa Mae Reyes", id: "2023-0087", program: "BSIT", section: "IT-3A", time: "1:16 PM", status: "confirmed" },
  { name: "Carlo Miguel Mendoza", id: "2024-0103", program: "BSCS", section: "CS-2A", time: "1:17 PM", status: "duplicate" },
  { name: "Jessa Rose Flores", id: "2023-0211", program: "BSIT", section: "IT-2B", time: "1:18 PM", status: "confirmed" },
  { name: "Rafael Antonio Lim", id: "2024-0178", program: "BSBA", section: "BA-1A", time: "1:19 PM", status: "confirmed" },
];

// ─── Icons (Lucide-style, 2px stroke, no fill) ────────────────────────────────
const s = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const ic = "w-[18px] h-[18px] shrink-0";

const Icons = {
  Home:        () => <svg viewBox="0 0 24 24" className={ic} {...s}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Calendar:    () => <svg viewBox="0 0 24 24" className={ic} {...s}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Bell:        () => <svg viewBox="0 0 24 24" className={ic} {...s}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  QrCode:      () => <svg viewBox="0 0 24 24" className={ic} {...s}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3" rx="0.5"/><line x1="21" y1="14" x2="21" y2="14"/><path d="M17 17h4v4h-4z"/></svg>,
  User:        () => <svg viewBox="0 0 24 24" className={ic} {...s}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Shield:      () => <svg viewBox="0 0 24 24" className={ic} {...s}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  CheckCircle: () => <svg viewBox="0 0 24 24" className={ic} {...s}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  Check:       () => <svg viewBox="0 0 24 24" className={ic} {...s}><polyline points="20 6 9 17 4 12"/></svg>,
  Clock:       () => <svg viewBox="0 0 24 24" className={ic} {...s}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  MapPin:      () => <svg viewBox="0 0 24 24" className={ic} {...s}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  ChevronRight:() => <svg viewBox="0 0 24 24" className={ic} {...s}><polyline points="9 18 15 12 9 6"/></svg>,
  ChevronLeft: () => <svg viewBox="0 0 24 24" className={ic} {...s}><polyline points="15 18 9 12 15 6"/></svg>,
  Scan:        () => <svg viewBox="0 0 24 24" className={ic} {...s}><path d="M3 7V5a2 2 0 012-2h2"/><path d="M17 3h2a2 2 0 012 2v2"/><path d="M21 17v2a2 2 0 01-2 2h-2"/><path d="M7 21H5a2 2 0 01-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>,
  Users:       () => <svg viewBox="0 0 24 24" className={ic} {...s}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  BarChart:    () => <svg viewBox="0 0 24 24" className={ic} {...s}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  FileText:    () => <svg viewBox="0 0 24 24" className={ic} {...s}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  LogOut:      () => <svg viewBox="0 0 24 24" className={ic} {...s}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  RefreshCw:   () => <svg viewBox="0 0 24 24" className={ic} {...s}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>,
  Download:    () => <svg viewBox="0 0 24 24" className={ic} {...s}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Plus:        () => <svg viewBox="0 0 24 24" className={ic} {...s}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  AlertCircle: () => <svg viewBox="0 0 24 24" className={ic} {...s}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  Edit:        () => <svg viewBox="0 0 24 24" className={ic} {...s}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Google:      () => <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>,
  Activity:    () => <svg viewBox="0 0 24 24" className={ic} {...s}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Layers:      () => <svg viewBox="0 0 24 24" className={ic} {...s}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
};


// ─── Shared UI primitives ─────────────────────────────────────────────────────
function FieldInput({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{label}</label>
      <input className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 font-medium placeholder:text-slate-300 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all" {...props} />
    </div>
  );
}

function FieldSelect({ label, children, ...props }: { label: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{label}</label>
      <select className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 font-medium outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all appearance-none" {...props}>{children}</select>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const cfg: Record<string, { cls: string; label: string; dot?: boolean }> = {
    active:    { cls: "bg-green-50 text-green-700 ring-1 ring-green-200", label: "Live", dot: true },
    upcoming:  { cls: "bg-sky-50 text-sky-700 ring-1 ring-sky-200", label: "Upcoming" },
    closed:    { cls: "bg-slate-100 text-slate-500 ring-1 ring-slate-200", label: "Closed" },
    confirmed: { cls: "bg-green-50 text-green-700 ring-1 ring-green-200", label: "Confirmed" },
    duplicate: { cls: "bg-red-50 text-red-600 ring-1 ring-red-200", label: "Duplicate" },
  };
  const c = cfg[status] ?? { cls: "bg-slate-100 text-slate-500", label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md ${c.cls}`}>
      {c.dot && <span className="w-1.5 h-1.5 rounded-full bg-green-500 pulse-green" />}
      {c.label}
    </span>
  );
}

function Avatar({ name, size = "md" }: { name: string; size?: "xs" | "sm" | "md" | "lg" }) {
  const sz = { xs: "w-6 h-6 text-[9px]", sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-14 h-14 text-lg" }[size];
  const letters = name.split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return <div className={`${sz} rounded-full bg-gradient-to-br from-green-400 to-green-700 text-white font-bold flex items-center justify-center shrink-0 select-none`}>{letters}</div>;
}

function Toast({ message, type }: { message: string; type: "success" | "warning" | "info" }) {
  const bg = { success: "bg-slate-900", warning: "bg-amber-600", info: "bg-slate-900" }[type];
  return (
    <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 ${bg} text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-2xl slide-up flex items-center gap-2`}>
      {type === "success" && <span className="text-green-400 w-3.5 h-3.5"><Icons.Check /></span>}
      {message}
    </div>
  );
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────
function TopBar({ user, onNav }: { user: User | null; onNav: (p: Page) => void }) {
  return (
    <header className="h-12 sticky top-0 z-40 bg-white border-b border-slate-100 flex items-center justify-between px-5 gap-4 shrink-0">
      <button className="flex items-center gap-2.5" onClick={() => onNav(user?.role === "admin" ? "admin-dashboard" : user ? "dashboard" : "landing")}>
        <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center shadow-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
          </svg>
        </div>
        <span className="text-sm font-bold text-slate-900 tracking-tight">AttendanceQR</span>
        <span className="text-xs text-slate-400 font-medium hidden sm:block">/ DLSJBC</span>
      </button>

      <div className="flex items-center gap-2">
        {user ? (
          <>
            <button className="relative w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors" onClick={() => onNav("announcements")}>
              <Icons.Bell />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-green-600" />
            </button>
            <button onClick={() => onNav("profile")}>
              <Avatar name={fullName(user)} size="sm" />
            </button>
          </>
        ) : (
          <button onClick={() => onNav("login")} className="text-xs font-semibold text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
            Sign in
          </button>
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
    { p: "admin-dashboard" as Page, label: "Overview",      I: Icons.Home },
    { p: "admin-events"   as Page, label: "Events",         I: Icons.Calendar },
    { p: "admin-scanner"  as Page, label: "QR Scanner",     I: Icons.Scan },
    { p: "admin-attendees"as Page, label: "Attendees",      I: Icons.Users },
    { p: "admin-announcements" as Page, label: "Announcements", I: Icons.Bell },
    { p: "admin-reports"  as Page, label: "Reports",        I: Icons.BarChart },
  ] : [
    { p: "dashboard"          as Page, label: "Home",          I: Icons.Home },
    { p: "events"             as Page, label: "Events",         I: Icons.Calendar },
    { p: "my-qr"              as Page, label: "My QR Code",    I: Icons.QrCode },
    { p: "announcements"      as Page, label: "Announcements", I: Icons.Bell },
    { p: "attendance-history" as Page, label: "Attendance",    I: Icons.CheckCircle },
    { p: "profile"            as Page, label: "Profile",       I: Icons.User },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-52 shrink-0 border-r border-slate-100 bg-white h-full">
      {/* Nav items */}
      <nav className="flex-1 px-2 pt-4 pb-2 space-y-0.5 overflow-y-auto">
        {nav.map(({ p, label, I }) => {
          const active = page === p;
          return (
            <button
              key={p + label}
              onClick={() => onNav(p)}
              className={`w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm transition-all ${
                active
                  ? "bg-slate-100 text-slate-900 font-semibold"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium"
              }`}
            >
              <span className={active ? "text-green-600" : "text-slate-400"}><I /></span>
              {label}
            </button>
          );
        })}
      </nav>

      {/* Bottom — account + sign out */}
      <div className="px-2 py-3 border-t border-slate-100 space-y-0.5">
        <button
          onClick={() => onNav("profile")}
          className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg hover:bg-slate-50 transition-colors group"
        >
          <Avatar name={fullName(user)} size="xs" />
          <div className="flex-1 min-w-0 text-left">
            <div className="text-xs font-semibold text-slate-800 truncate">{fullName(user)}</div>
            <div className="text-[10px] text-slate-400 truncate">{user.studentId}</div>
          </div>
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
        >
          <span className="text-slate-300 group-hover:text-red-400"><Icons.LogOut /></span>
          Sign out
        </button>
      </div>
    </aside>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────
function BottomNav({ page, user, onNav }: { page: Page; user: User | null; onNav: (p: Page) => void }) {
  if (!user) return null;
  const isAdmin = user.role === "admin";
  const items = isAdmin
    ? [
        { p: "admin-dashboard" as Page, label: "Overview", I: Icons.Home },
        { p: "admin-events"    as Page, label: "Events",   I: Icons.Calendar },
        { p: "admin-scanner"   as Page, label: "Scan",     I: Icons.Scan },
        { p: "admin-announcements" as Page, label: "Posts", I: Icons.Bell },
        { p: "admin-reports"   as Page, label: "Reports",  I: Icons.BarChart },
      ]
    : [
        { p: "dashboard"          as Page, label: "Home",     I: Icons.Home },
        { p: "events"             as Page, label: "Events",   I: Icons.Calendar },
        { p: "my-qr"              as Page, label: "QR Code",  I: Icons.QrCode },
        { p: "announcements"      as Page, label: "Updates",  I: Icons.Bell },
        { p: "profile"            as Page, label: "Profile",  I: Icons.User },
      ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 flex lg:hidden">
      {items.map(({ p, label, I }) => {
        const active = page === p;
        return (
          <button key={p} onClick={() => onNav(p)} className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors ${active ? "text-green-600" : "text-slate-400"}`}>
            <I />{label}
          </button>
        );
      })}
    </nav>
  );
}

// ─── Landing ──────────────────────────────────────────────────────────────────
function LandingPage({ onNav }: { onNav: (p: Page) => void }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-green-50 to-transparent rounded-full blur-3xl opacity-60 pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full pulse-green" />
            DLSJBC Attendance System — PWA
          </div>
          <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-5">
            Attendance tracking,<br />
            <span className="text-green-600">without the hassle.</span>
          </h1>
          <p className="text-slate-500 text-lg max-w-lg mx-auto mb-10 leading-relaxed">
            One QR code per student. Real-time attendance tracking. Built for DLSJBC.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => onNav("login")} className="h-11 px-6 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-px">
              Get started
            </button>
            <button onClick={() => onNav("events")} className="h-11 px-6 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all">
              Browse events
            </button>
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { Icon: Icons.QrCode, title: "Personal QR Code", desc: "Each student gets a unique QR code tied to their profile. Show it at any event entrance for instant attendance logging." },
            { Icon: Icons.Scan, title: "Instant scan & confirm", desc: "Admins scan student QR codes via camera. Attendance is recorded in real time with duplicate detection." },
            { Icon: Icons.Activity, title: "Live updates", desc: "Announcements, event changes, and attendance records are synced instantly across all devices." },
          ].map(f => (
            <div key={f.title} className="bg-white border border-slate-100 rounded-2xl p-6 hover:border-slate-200 hover:shadow-sm transition-all">
              <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center text-green-600 mb-4"><f.Icon /></div>
              <h3 className="font-semibold text-slate-900 text-sm mb-1.5">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Events preview */}
      <div className="max-w-5xl mx-auto px-6 pb-24">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-slate-900">Upcoming events</h2>
          <button onClick={() => onNav("events")} className="text-sm text-green-600 font-semibold hover:text-green-700 flex items-center gap-1">View all <Icons.ChevronRight /></button>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {EVENTS.filter(e => e.status !== "closed").slice(0, 2).map(e => (
            <div key={e.id} className="bg-white border border-slate-100 rounded-xl p-5 hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <Badge status={e.status} />
                <span className="text-xs text-slate-400 font-medium">{e.date}</span>
              </div>
              <h3 className="font-semibold text-slate-900 text-sm mb-2">{e.title}</h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium"><Icons.MapPin />{e.location}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }: { onLogin: (role: Role) => void }) {
  // Step 1: choose role. Step 2: choose method for that role.
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const Logo = () => (
    <div className="w-12 h-12 rounded-2xl bg-green-600 flex items-center justify-center mx-auto mb-5 shadow-md">
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    </div>
  );

  const proceed = (method: string) => {
    setLoading(method);
    setTimeout(() => { setLoading(null); onLogin(role); }, 1100);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8faf9]">
      <div className="w-full max-w-sm">

        {/* ── Step 1: choose role ── */}
        {!role && (
          <>
            <div className="mb-8 text-center">
              <Logo />
              <h1 className="text-xl font-bold text-slate-900 mb-1">Sign in to AttendanceQR</h1>
              <p className="text-sm text-slate-400">Choose how you're using the system</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <button
                onClick={() => setRole("student")}
                className="w-full h-14 flex items-center gap-4 px-4 border border-slate-200 rounded-xl text-left hover:bg-slate-50 hover:border-slate-300 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-green-600 shrink-0">
                  <Icons.User />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">I'm a student</p>
                  <p className="text-xs text-slate-400 font-medium">View events, show QR code, track attendance</p>
                </div>
                <span className="ml-auto text-slate-300 group-hover:text-slate-500 transition-colors"><Icons.ChevronRight /></span>
              </button>

              <button
                onClick={() => setRole("admin")}
                className="w-full h-14 flex items-center gap-4 px-4 border border-slate-200 rounded-xl text-left hover:bg-slate-50 hover:border-slate-300 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                  <Icons.Shield />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">I'm an admin</p>
                  <p className="text-xs text-slate-400 font-medium">Manage events, scan QR codes, view reports</p>
                </div>
                <span className="ml-auto text-slate-300 group-hover:text-slate-500 transition-colors"><Icons.ChevronRight /></span>
              </button>

              <div className="border-t border-slate-100 pt-3 text-center">
                <p className="text-xs text-slate-400">
                  Don't have an account?{" "}
                  <button onClick={() => { setRole("student"); }} className="text-green-600 font-semibold hover:text-green-700 transition-colors">
                    Sign up as student
                  </button>
                </p>
              </div>
            </div>
          </>
        )}

        {/* ── Step 2: choose sign-in method ── */}
        {role && (
          <>
            <div className="mb-8 text-center">
              <Logo />
              <h1 className="text-xl font-bold text-slate-900 mb-1">
                {role === "student" ? "Student sign-in" : "Admin sign-in"}
              </h1>
              <p className="text-sm text-slate-400">Choose how you'd like to continue</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              {/* Google OAuth — both roles */}
              <button
                onClick={() => proceed("google")}
                disabled={!!loading}
                className="w-full h-11 flex items-center justify-center gap-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
              >
                {loading === "google"
                  ? <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                  : <Icons.Google />}
                Continue with Google
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* Second method — role-specific */}
              {role === "student" ? (
                <button
                  onClick={() => proceed("studentid")}
                  disabled={!!loading}
                  className="w-full h-11 flex items-center justify-center gap-2.5 bg-green-600 hover:bg-green-700 rounded-xl text-sm font-semibold text-white transition-all shadow-sm disabled:opacity-50"
                >
                  {loading === "studentid"
                    ? <div className="w-4 h-4 border-2 border-green-300 border-t-white rounded-full animate-spin" />
                    : <Icons.QrCode />}
                  Continue with Student ID
                </button>
              ) : (
                <button
                  onClick={() => proceed("email")}
                  disabled={!!loading}
                  className="w-full h-11 flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-sm font-semibold text-white transition-all shadow-sm disabled:opacity-50"
                >
                  {loading === "email"
                    ? <div className="w-4 h-4 border-2 border-slate-600 border-t-white rounded-full animate-spin" />
                    : <Icons.FileText />}
                  Continue with Email & Password
                </button>
              )}

              <button
                onClick={() => setRole(null)}
                className="w-full text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors pt-1 flex items-center justify-center gap-1"
              >
                <Icons.ChevronLeft />Back to account selection
              </button>
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-4 leading-relaxed">
              Secured via Google OAuth · Data stored on DLSJBC's private Supabase database
            </p>
          </>
        )}

      </div>
    </div>
  );
}

// ─── Onboarding ───────────────────────────────────────────────────────────────
interface OBForm { firstName: string; middleInitial: string; surname: string; studentId: string; program: string; yearLevel: string; section: string; }

function OnboardingPage({ onComplete }: { onComplete: (d: OBForm) => void }) {
  const [step, setStep] = useState(1);
  const STEPS = 3;
  const [f, setF] = useState<OBForm>({ firstName: "", middleInitial: "", surname: "", studentId: "", program: "", yearLevel: "", section: "" });
  const set = (k: keyof OBForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(p => ({ ...p, [k]: e.target.value }));

  const stepMeta = [
    { title: "Your name", desc: "Enter your name exactly as it appears on your school ID." },
    { title: "Student ID", desc: "Your school-issued ID number, printed on your ID card." },
    { title: "Enrollment details", desc: "Used for grouping attendance reports by program and section." },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8faf9]">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex gap-1 mb-3">
            {Array.from({ length: STEPS }).map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < step ? "bg-green-600" : "bg-slate-200"}`} />
            ))}
          </div>
          <p className="text-xs text-slate-400 font-medium">Step {step} of {STEPS}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-lg">{stepMeta[step-1].title}</h2>
            <p className="text-sm text-slate-400 mt-0.5">{stepMeta[step-1].desc}</p>
          </div>

          <div className="px-6 py-5 space-y-4">
            {step === 1 && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2"><FieldInput label="First Name" placeholder="e.g. Maria Luisa" value={f.firstName} onChange={set("firstName")} /></div>
                  <FieldInput label="M.I." placeholder="A" maxLength={2} value={f.middleInitial} onChange={set("middleInitial")} />
                </div>
                <FieldInput label="Surname" placeholder="e.g. Santos" value={f.surname} onChange={set("surname")} />
                <div className="bg-slate-50 border border-slate-100 rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm text-slate-600">
                  <span className="text-slate-400 shrink-0"><Icons.User /></span>
                  <span className="font-medium">{f.firstName || "Maria Luisa"}{f.middleInitial ? ` ${f.middleInitial}.` : ""} {f.surname || "Santos"}</span>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <FieldInput label="Student ID Number" placeholder="e.g. 2024-0001" value={f.studentId} onChange={set("studentId")} />
                <p className="text-xs text-slate-400 leading-relaxed">Format: YYYY-NNNN, as shown on your official school ID card and enrollment certificate.</p>
              </>
            )}
            {step === 3 && (
              <>
                <FieldSelect label="Program / Course" value={f.program} onChange={set("program")}>
                  <option value="">Select program</option>
                  <option value="BSIT">BSIT — Information Technology</option>
                  <option value="BSCS">BSCS — Computer Science</option>
                  <option value="BSBA">BSBA — Business Administration</option>
                  <option value="BSEd">BSEd — Secondary Education</option>
                  <option value="BSHM">BSHM — Hospitality Management</option>
                </FieldSelect>
                <FieldSelect label="Year Level" value={f.yearLevel} onChange={set("yearLevel")}>
                  <option value="">Select year level</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </FieldSelect>
                <FieldInput label="Section" placeholder="e.g. IT-2A" value={f.section} onChange={set("section")} />
              </>
            )}
          </div>

          <div className="px-6 pb-5 flex gap-2.5">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)} className="h-10 px-4 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-1.5">
                <Icons.ChevronLeft />Back
              </button>
            )}
            <button onClick={() => step < STEPS ? setStep(s => s + 1) : onComplete(f)} className="flex-1 h-10 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5">
              {step === STEPS ? "Complete setup" : "Continue"}{step < STEPS && <Icons.ChevronRight />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page wrapper helpers ─────────────────────────────────────────────────────
function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 font-medium mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-6 max-w-3xl mx-auto pb-24 lg:pb-8 slide-up">{children}</div>;
}

// ─── Student Dashboard ────────────────────────────────────────────────────────
function DashboardPage({ user, onNav }: { user: User; onNav: (p: Page) => void }) {
  const nextEvent = EVENTS.find(e => e.status !== "closed");
  return (
    <PageShell>
      <div className="mb-7">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Dashboard</p>
        <h1 className="text-2xl font-bold text-slate-900">Good morning, {user.firstName || "there"}.</h1>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Events attended", value: "4" },
          { label: "This semester",   value: "2" },
          { label: "Upcoming events", value: "2" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-100 rounded-xl px-4 py-4">
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-[11px] text-slate-400 font-semibold mt-1 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Next event */}
      {nextEvent && (
        <button onClick={() => onNav("events")} className="w-full bg-green-600 hover:bg-green-700 rounded-xl p-5 text-left text-white transition-all mb-5 shadow-sm hover:shadow-md group">
          <div className="flex items-center justify-between mb-3">
            <Badge status={nextEvent.status} />
            <span className="text-green-300 text-xs font-medium">Up next</span>
          </div>
          <h2 className="font-semibold text-base leading-snug mb-3">{nextEvent.title}</h2>
          <div className="flex flex-wrap gap-4 text-sm text-green-200 font-medium">
            <span className="flex items-center gap-1.5"><Icons.Calendar />{nextEvent.date}</span>
            <span className="flex items-center gap-1.5"><Icons.MapPin />{nextEvent.location}</span>
          </div>
        </button>
      )}

      {/* QR shortcut */}
      <button onClick={() => onNav("my-qr")} className="w-full bg-white border border-slate-100 rounded-xl px-5 py-4 flex items-center justify-between hover:border-slate-200 hover:shadow-sm transition-all mb-5 group">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-green-50 border border-green-100 rounded-xl flex items-center justify-center text-green-600"><Icons.QrCode /></div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-900">My QR Code</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Show or download your QR code</p>
          </div>
        </div>
        <span className="text-slate-300 group-hover:text-slate-500 transition-colors"><Icons.ChevronRight /></span>
      </button>

      {/* Announcements */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-900">Latest announcements</p>
        <button onClick={() => onNav("announcements")} className="text-xs text-green-600 font-semibold hover:text-green-700 flex items-center gap-0.5">View all<Icons.ChevronRight /></button>
      </div>
      <div className="space-y-2">
        {ANNOUNCEMENTS.slice(0, 2).map(a => (
          <div key={a.id} className="bg-white border border-slate-100 rounded-xl px-4 py-3.5 hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded uppercase tracking-wide">{a.badge}</span>
              <span className="text-[11px] text-slate-400 font-medium">{a.date}</span>
            </div>
            <p className="text-sm font-semibold text-slate-900">{a.title}</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5 line-clamp-1">{a.body}</p>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

// ─── Events ───────────────────────────────────────────────────────────────────
function EventsPage({ onNav, onSelectEvent }: { onNav: (p: Page) => void; onSelectEvent: (id: string) => void }) {
  const [filter, setFilter] = useState("all");
  const items = filter === "all" ? EVENTS : EVENTS.filter(e => e.status === filter);
  return (
    <PageShell>
      <PageHeader title="Events" />
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {[{ k: "all", l: "All" }, { k: "active", l: "Live" }, { k: "upcoming", l: "Upcoming" }, { k: "closed", l: "Closed" }].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)} className={`shrink-0 h-8 px-3.5 rounded-lg text-xs font-semibold transition-all ${filter === f.k ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"}`}>{f.l}</button>
        ))}
      </div>
      <div className="space-y-3">
        {items.map(e => (
          <div key={e.id} className="bg-white border border-slate-100 rounded-xl p-5 cursor-pointer hover:border-slate-200 hover:shadow-sm transition-all" onClick={() => { onSelectEvent(e.id); onNav("event-detail"); }}>
            <div className="flex items-start justify-between mb-3">
              <Badge status={e.status} />
              {e.attendees > 0 && <span className="text-xs text-slate-400 font-medium">{e.attendees} attended</span>}
            </div>
            <h3 className="font-semibold text-slate-900 mb-1.5 leading-snug">{e.title}</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed line-clamp-2">{e.description}</p>
            <div className="flex flex-wrap gap-4 text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1.5"><Icons.Calendar />{e.date}</span>
              <span className="flex items-center gap-1.5"><Icons.Clock />{e.time}</span>
              <span className="flex items-center gap-1.5"><Icons.MapPin />{e.location}</span>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

// ─── Event Detail ─────────────────────────────────────────────────────────────
function EventDetailPage({ eventId, user, onBack }: { eventId: string; user: User | null; onBack: () => void }) {
  const ev = EVENTS.find(e => e.id === eventId) ?? EVENTS[0];
  return (
    <PageShell>
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 mb-5 transition-colors"><Icons.ChevronLeft />Back to events</button>
      <div className="bg-green-600 rounded-xl p-6 text-white mb-4 shadow-sm">
        <Badge status={ev.status} />
        <h1 className="font-bold text-xl mt-3 mb-4 leading-snug">{ev.title}</h1>
        <div className="grid grid-cols-2 gap-3">
          {[{ l: "DATE", v: ev.date }, { l: "TIME", v: ev.time }].map(d => (
            <div key={d.l} className="bg-white/10 rounded-lg px-3 py-2.5">
              <p className="text-green-300 text-[10px] font-bold uppercase tracking-widest mb-1">{d.l}</p>
              <p className="text-sm font-semibold">{d.v}</p>
            </div>
          ))}
          <div className="bg-white/10 rounded-lg px-3 py-2.5 col-span-2">
            <p className="text-green-300 text-[10px] font-bold uppercase tracking-widest mb-1">LOCATION</p>
            <p className="text-sm font-semibold">{ev.location}</p>
          </div>
        </div>
      </div>
      <div className="bg-white border border-slate-100 rounded-xl p-5 mb-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">About</p>
        <p className="text-sm text-slate-600 leading-relaxed">{ev.description}</p>
      </div>
      {user && ev.status !== "closed" && (
        <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3.5 flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-600 shrink-0"><Icons.QrCode /></div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Ready to attend?</p>
            <p className="text-xs text-slate-500 mt-0.5">Show your QR code at the entrance to log attendance.</p>
          </div>
        </div>
      )}
    </PageShell>
  );
}

// ─── My QR ────────────────────────────────────────────────────────────────────
function MyQRPage({ user, qrVersion }: { user: User; qrVersion: number }) {
  const name = fullName(user);
  const qrRef = (el: SVGSVGElement | null) => { (MyQRPage as any)._svgEl = el; };

  const handleDownload = () => {
    // Draw QR + name card onto a canvas and download as PNG
    const size = 240;
    const padding = 24;
    const footerH = 72;
    const canvas = document.createElement("canvas");
    const dpr = 2;
    canvas.width = (size + padding * 2) * dpr;
    canvas.height = (size + padding * 2 + footerH) * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    const W = size + padding * 2;
    const H = size + padding * 2 + footerH;

    // White card background
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, 0, 0, W, H, 16);
    ctx.fill();

    // QR cells
    const cells = [
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
    const cell = size / 21;
    ctx.fillStyle = "#111827";
    cells.forEach((row, r) => row.forEach((v, c) => {
      if (v) ctx.fillRect(padding + c * cell, padding + r * cell, cell, cell);
    }));

    // Divider
    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, size + padding + 12);
    ctx.lineTo(W - padding, size + padding + 12);
    ctx.stroke();

    // Name & ID text
    ctx.fillStyle = "#111827";
    ctx.font = `bold ${13 * dpr / dpr}px 'Plus Jakarta Sans', system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(name, W / 2, size + padding + 32);
    ctx.fillStyle = "#94a3b8";
    ctx.font = `${11 * dpr / dpr}px 'Plus Jakarta Sans', system-ui, sans-serif`;
    ctx.fillText(`${user.studentId} · ${user.program} ${user.yearLevel}`, W / 2, size + padding + 50);

    // Logo watermark
    ctx.fillStyle = "#16a34a";
    ctx.font = `bold ${10 * dpr / dpr}px system-ui, sans-serif`;
    ctx.fillText("AttendanceQR · DLSJBC", W / 2, size + padding + 66);

    const a = document.createElement("a");
    a.download = `qr-${user.studentId || "student"}-v${qrVersion}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  return (
    <PageShell>
      <PageHeader title="My QR Code" subtitle="Present this at event entrances to log your attendance." />
      <div className="max-w-xs mx-auto">
        {/* QR card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center shadow-sm relative">
          {qrVersion > 1 && (
            <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />Renewed
            </div>
          )}
          <div className="flex justify-center mb-5">
            <svg ref={qrRef} width={192} height={192} viewBox="0 0 192 192">
              {(() => {
                const cells = [
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
                const cell = 192 / 21;
                return cells.map((row, r) => row.map((v, c) => v ? <rect key={`${r}-${c}`} x={c*cell} y={r*cell} width={cell} height={cell} fill="#111827"/> : null));
              })()}
            </svg>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="font-bold text-slate-900">{name}</p>
            <p className="text-sm text-slate-400 font-medium mt-0.5">{user.studentId}</p>
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2.5">
              {[user.program, user.yearLevel, user.section].filter(Boolean).map(t => (
                <span key={t} className="text-[11px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded">{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-3 space-y-2">
          <button
            onClick={handleDownload}
            className="w-full h-10 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Icons.Download />Download QR as PNG
          </button>
        </div>

        {/* Info notice */}
        <div className="mt-4 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 flex items-start gap-3">
          <span className="text-slate-400 shrink-0 mt-0.5"><Icons.AlertCircle /></span>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your QR code is tied to your profile credentials — name, student ID, program, and year level.{" "}
            <span className="font-semibold text-slate-700">If you update any of these in your profile, a new QR code will be generated</span>{" "}
            and any previously downloaded image will no longer be valid.
          </p>
        </div>
      </div>
    </PageShell>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Announcements ────────────────────────────────────────────────────────────
function AnnouncementsPage() {
  return (
    <PageShell>
      <PageHeader title="Announcements" action={
        <button className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"><Icons.RefreshCw /></button>
      } />
      <div className="space-y-3">
        {ANNOUNCEMENTS.map(a => (
          <div key={a.id} className="bg-white border border-slate-100 rounded-xl p-5 hover:border-slate-200 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded uppercase tracking-wide">{a.badge}</span>
              <span className="text-[11px] text-slate-400 font-medium">{a.date}</span>
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">{a.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{a.body}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-4 pt-3 border-t border-slate-50">Posted by {a.author}</p>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

// ─── Attendance History ───────────────────────────────────────────────────────
function AttendanceHistoryPage() {
  return (
    <PageShell>
      <PageHeader title="My Attendance" subtitle="Your complete attendance record across all tracked events." />
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
        {ATTENDANCE_RECORDS.map((r, i) => (
          <div key={i} className={`flex items-center gap-4 px-5 py-4 ${i < ATTENDANCE_RECORDS.length - 1 ? "border-b border-slate-50" : ""}`}>
            <div className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center shrink-0">
              <Icons.Check />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{r.event}</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">{r.date} · {r.time}</p>
            </div>
            <span className="text-[11px] font-semibold text-green-700 bg-green-50 ring-1 ring-green-200 px-2 py-0.5 rounded-md">Recorded</span>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────────
function ProfilePage({ user, onSave }: { user: User; onSave: (updated: User) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ ...user });
  const name = fullName(user);

  const setF = (k: keyof User) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDraft(d => ({ ...d, [k]: e.target.value }));

  const handleSave = () => {
    onSave({ ...user, ...draft });
    setEditing(false);
  };
  const handleDiscard = () => {
    setDraft({ ...user });
    setEditing(false);
  };

  return (
    <PageShell>
      <PageHeader
        title="Profile"
        action={
          editing ? (
            <div className="flex items-center gap-2">
              <button onClick={handleDiscard} className="h-9 px-4 border border-slate-200 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-all">
                Discard
              </button>
              <button onClick={handleSave} className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-all shadow-sm">
                Save changes
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="h-9 px-4 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-1.5"
            >
              <Icons.Edit />Edit profile
            </button>
          )
        }
      />
      <div className="max-w-sm">
        {/* Identity card */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 flex items-center gap-4 mb-4">
          <Avatar name={editing ? fullName(draft) || name : name} size="lg" />
          <div>
            <p className="font-bold text-slate-900">{editing ? (fullName(draft) || name) : name}</p>
            <p className="text-sm text-slate-400 font-medium mt-0.5">{editing ? draft.studentId || user.studentId : user.studentId}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                editing ? draft.program : user.program,
                editing ? draft.yearLevel : user.yearLevel,
                editing ? draft.section : user.section,
              ].filter(Boolean).map(t => (
                <span key={t} className="text-[11px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded">{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* View mode */}
        {!editing && (
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
            {[
              { l: "First name", v: user.firstName },
              { l: "Middle initial", v: user.middleInitial ? user.middleInitial + "." : "—" },
              { l: "Surname", v: user.surname },
              { l: "Student ID", v: user.studentId },
              { l: "Program", v: user.program },
              { l: "Year level", v: user.yearLevel },
              { l: "Section", v: user.section || "—" },
              { l: "Email", v: "mls.santos@dlsjbc.edu.ph" },
            ].map((f, i, arr) => (
              <div key={f.l} className={`flex items-center justify-between px-5 py-3 ${i < arr.length - 1 ? "border-b border-slate-50" : ""}`}>
                <span className="text-xs font-semibold text-slate-400">{f.l}</span>
                <span className="text-sm font-semibold text-slate-900">{f.v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Edit mode */}
        {editing && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Name</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <FieldInput label="First Name" value={draft.firstName} onChange={setF("firstName")} />
                </div>
                <FieldInput label="M.I." value={draft.middleInitial} maxLength={2} onChange={setF("middleInitial")} />
              </div>
              <FieldInput label="Surname" value={draft.surname} onChange={setF("surname")} />
            </div>

            <div className="px-5 py-4 border-t border-slate-100 border-b border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Enrollment</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <FieldInput label="Student ID" value={draft.studentId} onChange={setF("studentId")} />
              <FieldSelect label="Program" value={draft.program} onChange={setF("program")}>
                <option value="">Select program</option>
                <option value="BSIT">BSIT — Information Technology</option>
                <option value="BSCS">BSCS — Computer Science</option>
                <option value="BSBA">BSBA — Business Administration</option>
                <option value="BSEd">BSEd — Secondary Education</option>
                <option value="BSHM">BSHM — Hospitality Management</option>
              </FieldSelect>
              <FieldSelect label="Year Level" value={draft.yearLevel} onChange={setF("yearLevel")}>
                <option value="">Select year level</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </FieldSelect>
              <FieldInput label="Section" value={draft.section} onChange={setF("section")} placeholder="e.g. IT-2A" />
            </div>

            <div className="px-5 py-3.5 border-t border-slate-100 bg-amber-50 flex items-start gap-2.5">
              <span className="text-amber-500 shrink-0 mt-0.5"><Icons.AlertCircle /></span>
              <p className="text-xs text-amber-700 leading-relaxed font-medium">
                Saving changes will regenerate your QR code. Any previously downloaded QR image will no longer be valid.
              </p>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
function AdminDashboard({ onNav }: { onNav: (p: Page) => void }) {
  return (
    <PageShell>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Overview</p>
          <h1 className="text-xl font-bold text-slate-900">Aug 21, 2026</h1>
          <p className="text-sm text-slate-400 font-medium mt-0.5">SSC General Assembly is live now</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full pulse-green" />Live
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { l: "Scanned today",   v: "143", sub: "+12 last hour",     c: "text-green-600" },
          { l: "Duplicates",      v: "3",   sub: "Rejected scans",    c: "text-red-500"   },
          { l: "Active events",   v: "1",   sub: "SSC Assembly",      c: "text-sky-600"   },
          { l: "Total students",  v: "892", sub: "Enrolled AY 26–27", c: "text-slate-700" },
        ].map(s => (
          <div key={s.l} className="bg-white border border-slate-100 rounded-xl px-4 py-4">
            <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
            <p className="text-xs font-semibold text-slate-600 mt-1">{s.l}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <button onClick={() => onNav("admin-scanner")} className="bg-green-600 hover:bg-green-700 text-white rounded-xl p-5 text-left transition-all shadow-sm hover:shadow-md">
          <Icons.Scan />
          <p className="font-semibold text-sm mt-3 mb-0.5">Open scanner</p>
          <p className="text-green-300 text-xs font-medium">Camera-based QR scanning</p>
        </button>
        <button onClick={() => onNav("admin-attendees")} className="bg-white border border-slate-100 rounded-xl p-5 text-left hover:border-slate-200 hover:shadow-sm transition-all">
          <Icons.Users />
          <p className="font-semibold text-sm text-slate-900 mt-3 mb-0.5">Attendees</p>
          <p className="text-slate-400 text-xs font-medium">143 confirmed today</p>
        </button>
      </div>

      {/* Recent scans */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-900">Recent scans</p>
        <button onClick={() => onNav("admin-attendees")} className="text-xs text-green-600 font-semibold hover:text-green-700 flex items-center gap-0.5">View all<Icons.ChevronRight /></button>
      </div>
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
        {ADMIN_SCANS.slice(0, 5).map((s, i) => (
          <div key={i} className={`flex items-center gap-3 px-5 py-3.5 ${i < 4 ? "border-b border-slate-50" : ""}`}>
            <Avatar name={s.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{s.name}</p>
              <p className="text-[11px] text-slate-400 font-medium">{s.id} · {s.section}</p>
            </div>
            <span className="text-[11px] text-slate-400 font-medium shrink-0">{s.time}</span>
            <Badge status={s.status} />
          </div>
        ))}
      </div>
    </PageShell>
  );
}

// ─── Admin Events ─────────────────────────────────────────────────────────────
function AdminEventsPage({ onNav }: { onNav: (p: Page) => void }) {
  return (
    <PageShell>
      <PageHeader title="Events" action={
        <button className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-all shadow-sm flex items-center gap-1.5"><Icons.Plus />New event</button>
      } />
      <div className="space-y-3">
        {EVENTS.map(e => (
          <div key={e.id} className="bg-white border border-slate-100 rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <Badge status={e.status} />
              <span className="text-xs text-slate-400 font-medium">{e.date}</span>
            </div>
            <h3 className="font-semibold text-slate-900 mb-1.5">{e.title}</h3>
            <div className="flex flex-wrap gap-4 text-xs text-slate-400 font-medium mb-4">
              <span className="flex items-center gap-1.5"><Icons.MapPin />{e.location}</span>
              <span className="flex items-center gap-1.5"><Icons.Clock />{e.time}</span>
            </div>
            <div className="flex gap-2 pt-4 border-t border-slate-50">
              {e.status === "active" && (
                <button onClick={() => onNav("admin-scanner")} className="flex-1 h-9 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-all flex items-center justify-center gap-1.5 shadow-sm">
                  <Icons.Scan />Open scanner
                </button>
              )}
              <button onClick={() => onNav("admin-attendees")} className="flex-1 h-9 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-1.5">
                <Icons.Users />Attendees{e.attendees > 0 ? ` (${e.attendees})` : ""}
              </button>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

// ─── Admin Scanner ────────────────────────────────────────────────────────────
function AdminScannerPage() {
  const [last, setLast] = useState<typeof ADMIN_SCANS[0] | null>(null);
  const [scanning, setScanning] = useState(true);
  const simulate = () => { setScanning(false); setLast(ADMIN_SCANS[Math.floor(Math.random() * ADMIN_SCANS.length)]); };
  const reset = () => { setScanning(true); setLast(null); };
  return (
    <PageShell>
      <PageHeader title="QR Scanner" subtitle="SSC General Assembly · Aug 22, 2026" />
      <div className="max-w-xs mx-auto">
        <div className="bg-slate-900 rounded-2xl overflow-hidden mb-4 shadow-lg relative" style={{ aspectRatio: "1" }}>
          <style>{`@keyframes scanline{0%,100%{top:12%}50%{top:80%}}`}</style>
          <div className="absolute inset-0 flex items-center justify-center">
            {scanning ? (
              <div className="relative w-48 h-48">
                {[["top-0 left-0 rounded-tl-lg border-t-2 border-l-2",""],["top-0 right-0 rounded-tr-lg border-t-2 border-r-2",""],["bottom-0 left-0 rounded-bl-lg border-b-2 border-l-2",""],["bottom-0 right-0 rounded-br-lg border-b-2 border-r-2",""]].map(([cls], i) => (
                  <div key={i} className={`absolute w-6 h-6 border-green-400 ${cls}`} />
                ))}
                <div className="absolute left-2 right-2 h-px bg-green-400/60" style={{ animation: "scanline 2s ease-in-out infinite" }} />
                <p className="absolute -bottom-8 left-0 right-0 text-white/40 text-xs text-center font-medium">Align QR within frame</p>
              </div>
            ) : (
              <div className="text-center fade-in px-8">
                {last && (<>
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${last.status === "confirmed" ? "bg-green-500" : "bg-red-500"}`}>
                    {last.status === "confirmed" ? <span className="text-white"><Icons.Check /></span> : <span className="text-white text-lg font-bold">!</span>}
                  </div>
                  <p className="text-white font-bold">{last.name}</p>
                  <p className="text-white/60 text-sm font-medium">{last.id}</p>
                  <p className="text-white/40 text-xs mt-0.5">{last.program} · {last.section}</p>
                </>)}
              </div>
            )}
          </div>
        </div>

        {scanning ? (
          <button onClick={simulate} className="w-full h-11 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm">
            Simulate scan
          </button>
        ) : (
          <div className="space-y-2.5">
            {last && (
              <div className={`rounded-xl px-4 py-3.5 border text-sm ${last.status === "confirmed" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{last.status === "confirmed" ? "Attendance confirmed" : "Duplicate — rejected"}</p>
                  <Badge status={last.status} />
                </div>
                <p className="text-xs mt-0.5 opacity-60">Scanned at {last.time}</p>
              </div>
            )}
            <button onClick={reset} className="w-full h-11 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all">
              Scan next student
            </button>
          </div>
        )}
        <p className="mt-4 text-center text-xs text-slate-400 font-medium">
          {ADMIN_SCANS.filter(s => s.status === "confirmed").length} confirmed · 1 duplicate · 0 errors
        </p>
      </div>
    </PageShell>
  );
}

// ─── Admin Attendees ──────────────────────────────────────────────────────────
function AdminAttendeesPage() {
  return (
    <PageShell>
      <PageHeader title="Attendees" subtitle="SSC General Assembly · Aug 22, 2026" action={
        <button className="h-9 px-3.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-1.5"><Icons.Download />Export</button>
      } />
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <span className="col-span-5">Student</span>
          <span className="col-span-3">Program</span>
          <span className="col-span-2">Section</span>
          <span className="col-span-2 text-right">Status</span>
        </div>
        {ADMIN_SCANS.map((s, i) => (
          <div key={i} className={`px-5 py-3.5 grid grid-cols-12 items-center ${i < ADMIN_SCANS.length - 1 ? "border-b border-slate-50" : ""}`}>
            <div className="col-span-5 flex items-center gap-3 min-w-0">
              <Avatar name={s.name} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{s.name}</p>
                <p className="text-[11px] text-slate-400 font-medium">{s.id}</p>
              </div>
            </div>
            <span className="col-span-3 text-xs text-slate-500 font-medium">{s.program}</span>
            <span className="col-span-2 text-xs text-slate-500 font-medium">{s.section}</span>
            <div className="col-span-2 flex justify-end"><Badge status={s.status} /></div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

// ─── Admin Announcements ──────────────────────────────────────────────────────
function AdminAnnouncementsPage() {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  return (
    <PageShell>
      <PageHeader title="Announcements" action={
        <button onClick={() => setShowForm(!showForm)} className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-all shadow-sm flex items-center gap-1.5"><Icons.Plus />New post</button>
      } />
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4 slide-up">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-bold text-slate-900">New announcement</p>
          </div>
          <div className="px-5 py-4 space-y-3">
            <FieldInput label="Title" placeholder="e.g. Enrollment Now Open" value={title} onChange={e => setTitle(e.target.value)} />
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Body</label>
              <textarea className="px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 font-medium placeholder:text-slate-300 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 resize-none transition-all" rows={4} placeholder="Write your announcement…" value={body} onChange={e => setBody(e.target.value)} />
            </div>
          </div>
          <div className="px-5 pb-4 flex gap-2.5">
            <button className="flex-1 h-10 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-all shadow-sm">Publish</button>
            <button onClick={() => setShowForm(false)} className="h-10 px-4 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-all">Cancel</button>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {ANNOUNCEMENTS.map(a => (
          <div key={a.id} className="bg-white border border-slate-100 rounded-xl p-5 hover:border-slate-200 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded uppercase tracking-wide">{a.badge}</span>
              <span className="text-[11px] text-slate-400 font-medium">{a.date}</span>
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">{a.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">{a.body}</p>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

// ─── Admin Reports ────────────────────────────────────────────────────────────
function AdminReportsPage() {
  return (
    <PageShell>
      <PageHeader title="Reports" action={
        <button className="h-9 px-3.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-1.5"><Icons.Download />Export CSV</button>
      } />
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">By program</p>
      <div className="grid md:grid-cols-2 gap-3 mb-6">
        {[
          { l: "BSIT", n: 234, total: 301, pct: 78, c: "bg-green-500" },
          { l: "BSCS", n: 198, total: 304, pct: 65, c: "bg-sky-500" },
          { l: "BSBA", n: 156, total: 300, pct: 52, c: "bg-violet-400" },
          { l: "BSEd", n: 89,  total: 197, pct: 45, c: "bg-amber-400" },
        ].map(r => (
          <div key={r.l} className="bg-white border border-slate-100 rounded-xl px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-slate-900 text-sm">{r.l}</span>
              <span className="text-xs text-slate-400 font-semibold">{r.n} / {r.total}</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
              <div className={`h-full ${r.c} rounded-full`} style={{ width: `${r.pct}%` }} />
            </div>
            <p className="text-[11px] text-slate-400 font-semibold">{r.pct}% attendance rate</p>
          </div>
        ))}
      </div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">By event</p>
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
        {EVENTS.filter(e => e.status !== "upcoming").map((e, i, arr) => (
          <div key={e.id} className={`flex items-center justify-between px-5 py-4 ${i < arr.length - 1 ? "border-b border-slate-50" : ""}`}>
            <div>
              <p className="text-sm font-semibold text-slate-900">{e.title}</p>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">{e.date}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-green-600 text-lg">{e.attendees}</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">attended</p>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>("landing");
  const [user, setUser] = useState<User | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "warning" | "info" } | null>(null);
  const [selectedEventId, setSelectedEventId] = useState("1");
  // Increments whenever profile is saved — causes MyQRPage to treat the QR as renewed
  const [qrVersion, setQrVersion] = useState(1);

  useEffect(() => {}, []);

  const show = (msg: string, type: "success" | "warning" | "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleLogin = (role: Role) => {
    if (role === "student") {
      setUser({ firstName: "", middleInitial: "", surname: "", studentId: "", program: "", yearLevel: "", section: "", role: "student" });
      setPage("onboarding");
    } else {
      setUser({ firstName: "Rafael", middleInitial: "M", surname: "Rivera", studentId: "ADMIN-001", program: "BSIT", yearLevel: "Admin", section: "", role: "admin" });
      setPage("admin-dashboard");
    }
  };

  const handleOnboarding = (d: OBForm) => {
    setUser({ firstName: d.firstName || "Maria Luisa", middleInitial: d.middleInitial || "A", surname: d.surname || "Santos", studentId: d.studentId || "2024-0014", program: d.program || "BSIT", yearLevel: d.yearLevel || "2nd Year", section: d.section || "IT-2A", role: "student" });
    show("Setup complete — your QR code is ready", "success");
    setPage("dashboard");
  };

  const handleLogout = () => { setUser(null); setPage("landing"); };

  const handleProfileSave = (updated: User) => {
    setUser(updated);
    setQrVersion(v => v + 1);
    show("Profile saved — your QR code has been renewed", "success");
  };

  const isAdmin = user?.role === "admin";
  const bare: Page[] = ["landing", "login", "onboarding"];
  const isBare = bare.includes(page);

  return (
    <div className="h-full flex flex-col bg-[#f8faf9]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {!isBare && <TopBar user={user} onNav={setPage} />}

      <div className={`flex-1 flex min-h-0 ${!isBare ? "overflow-hidden" : ""}`}>
        {!isBare && user && <Sidebar page={page} user={user} onNav={setPage} onLogout={handleLogout} />}

        <main className={`flex-1 bg-[#f8faf9] ${!isBare ? "overflow-y-auto" : ""}`}>
          {page === "landing"             && <LandingPage onNav={setPage} />}
          {page === "login"               && <LoginPage onLogin={handleLogin} />}
          {page === "onboarding"          && <OnboardingPage onComplete={handleOnboarding} />}
          {page === "dashboard"     && user && !isAdmin && <DashboardPage user={user} onNav={setPage} />}
          {page === "events"              && <EventsPage onNav={setPage} onSelectEvent={setSelectedEventId} />}
          {page === "event-detail"        && <EventDetailPage eventId={selectedEventId} user={user} onBack={() => setPage("events")} />}
          {page === "my-qr"         && user && <MyQRPage user={user} qrVersion={qrVersion} />}
          {page === "announcements"       && <AnnouncementsPage />}
          {page === "attendance-history"  && <AttendanceHistoryPage />}
          {page === "profile"       && user && <ProfilePage user={user} onSave={handleProfileSave} />}
          {page === "admin-dashboard"     && isAdmin && <AdminDashboard onNav={setPage} />}
          {page === "admin-events"        && isAdmin && <AdminEventsPage onNav={setPage} />}
          {page === "admin-scanner"       && isAdmin && <AdminScannerPage />}
          {page === "admin-attendees"     && isAdmin && <AdminAttendeesPage />}
          {page === "admin-announcements" && isAdmin && <AdminAnnouncementsPage />}
          {page === "admin-reports"       && isAdmin && <AdminReportsPage />}
        </main>
      </div>

      {!isBare && <BottomNav page={page} user={user} onNav={setPage} />}
      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  );
}
