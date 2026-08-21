import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Page =
  | "landing"
  | "login"
  | "onboarding"
  | "dashboard"
  | "my-qr"
  | "events"
  | "event-detail"
  | "announcements"
  | "updates"
  | "faq"
  | "attendance-history"
  | "profile"
  | "admin-dashboard"
  | "admin-events"
  | "admin-scanner"
  | "admin-attendees"
  | "admin-announcements"
  | "admin-reports";

type Role = "student" | "admin" | null;

interface User {
  name: string;
  studentId: string;
  program: string;
  yearLevel: string;
  role: Role;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const EVENTS = [
  {
    id: "1",
    title: "DLSJBC Foundation Day Celebration",
    date: "Aug 29, 2026",
    time: "8:00 AM – 5:00 PM",
    location: "Main Gymnasium",
    status: "upcoming",
    attendees: 0,
    description:
      "Join us for our annual Foundation Day celebration featuring cultural shows, sports competitions, and academic exhibits. All students are required to attend.",
    program: "All Programs",
  },
  {
    id: "2",
    title: "SSC General Assembly",
    date: "Aug 22, 2026",
    time: "1:00 PM – 4:00 PM",
    location: "Audio-Visual Room 2",
    status: "active",
    attendees: 143,
    description:
      "Supreme Student Council general assembly for the first semester. Agenda includes budget presentation, committee reports, and open forum.",
    program: "All Programs",
  },
  {
    id: "3",
    title: "Tech Talk: AI in Education",
    date: "Aug 15, 2026",
    time: "2:00 PM – 5:00 PM",
    location: "ICT Laboratory",
    status: "closed",
    attendees: 87,
    description:
      "A talk on the integration of artificial intelligence tools in modern education. Guest speaker from the Department of Information Technology.",
    program: "BSIT / BSCS",
  },
  {
    id: "4",
    title: "Intramural Opening Ceremony",
    date: "Sep 5, 2026",
    time: "7:30 AM – 12:00 PM",
    location: "Covered Court",
    status: "upcoming",
    attendees: 0,
    description:
      "Opening ceremony for the annual intramural sports festival. Parade of athletes, oath-taking, and opening of games.",
    program: "All Programs",
  },
];

const ANNOUNCEMENTS = [
  {
    id: "1",
    title: "Enrollment for 2nd Semester Now Open",
    body: "Online enrollment for the second semester of AY 2026–2027 is now open. Please proceed to the Student Portal and complete your enrollment on or before September 15, 2026. Late enrollees will be subject to additional fees.",
    date: "Aug 20, 2026",
    author: "Registrar's Office",
    badge: "Academic",
  },
  {
    id: "2",
    title: "Updated Class Schedule – Aug 22",
    body: "Due to the SSC General Assembly on August 22, afternoon classes from 1:00 PM onward are suspended. Morning classes will proceed as scheduled. Students are required to attend the assembly.",
    date: "Aug 19, 2026",
    author: "Office of the Principal",
    badge: "Schedule",
  },
  {
    id: "3",
    title: "Library Hours Extended During Finals",
    body: "The school library will be open from 7:00 AM to 7:00 PM starting August 25 until September 6 to accommodate students preparing for final examinations. Overnight stays are not permitted.",
    date: "Aug 18, 2026",
    author: "Library Services",
    badge: "Facilities",
  },
  {
    id: "4",
    title: "Scholarship Application Deadline",
    body: "All scholarship applicants must submit complete requirements to the Scholarship Office by August 28, 2026. Incomplete submissions will not be processed. Contact scholarship@dlsjbc.edu.ph for inquiries.",
    date: "Aug 17, 2026",
    author: "Scholarship Office",
    badge: "Financial",
  },
];

const ATTENDANCE_RECORDS = [
  { event: "SSC General Assembly", date: "Aug 22, 2026", time: "1:14 PM", status: "synced" },
  { event: "Tech Talk: AI in Education", date: "Aug 15, 2026", time: "2:03 PM", status: "synced" },
  { event: "College Orientation 2026", date: "Aug 5, 2026", time: "8:47 AM", status: "synced" },
  { event: "Leadership Seminar", date: "Jul 28, 2026", time: "9:02 AM", status: "queued" },
];

const ADMIN_SCANS = [
  { name: "Maria Santos", id: "2024-0001", program: "BSIT-2A", time: "1:14 PM", status: "confirmed" },
  { name: "Juan dela Cruz", id: "2024-0042", program: "BSCS-1B", time: "1:15 PM", status: "confirmed" },
  { name: "Alyssa Reyes", id: "2023-0087", program: "BSIT-3A", time: "1:16 PM", status: "confirmed" },
  { name: "Carlo Mendoza", id: "2024-0103", program: "BSCS-2A", time: "1:17 PM", status: "duplicate" },
  { name: "Jessa Flores", id: "2023-0211", program: "BSIT-2B", time: "1:18 PM", status: "confirmed" },
];

// ─── QR Code SVG (deterministic, pixel-art style) ─────────────────────────────
function QRPattern({ size = 200 }: { size?: number }) {
  const cells = [
    [1,1,1,1,1,1,1,0,1,0,0,1,0,0,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,1,0,0,1,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,1,0,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,0,0,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,1,0,1,0,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,1,1,0,0,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,1,1,0,1,1,0,0,0,0,0,0,0,0],
    [1,0,1,1,0,1,1,1,0,0,1,0,1,1,1,0,1,0,1,1,0],
    [0,1,0,0,1,0,0,0,1,1,0,1,0,0,0,1,0,1,0,0,1],
    [1,1,1,0,1,1,1,0,0,1,1,0,1,1,1,0,0,1,1,0,1],
    [0,0,1,0,0,1,0,1,1,0,0,1,0,0,1,1,1,0,0,1,0],
    [1,0,0,1,1,0,1,0,1,1,1,0,1,0,0,0,1,0,1,0,1],
    [0,0,0,0,0,0,0,0,1,0,0,1,1,0,1,1,0,1,0,1,0],
    [1,1,1,1,1,1,1,0,0,1,1,0,0,0,1,0,1,0,0,1,1],
    [1,0,0,0,0,0,1,0,1,0,0,1,0,1,1,0,0,1,1,0,0],
    [1,0,1,1,1,0,1,0,0,1,1,0,1,0,0,1,1,0,0,1,0],
    [1,0,1,1,1,0,1,0,1,0,0,1,0,1,1,0,1,1,0,0,1],
    [1,0,1,1,1,0,1,0,0,1,1,0,1,0,0,1,0,0,1,1,0],
    [1,0,0,0,0,0,1,0,1,0,0,1,1,0,1,0,1,0,0,1,1],
    [1,1,1,1,1,1,1,0,0,1,0,0,0,1,0,1,0,1,1,0,1],
  ];
  const cols = 21;
  const rows = 21;
  const cell = size / cols;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {cells.map((row, r) =>
        row.map((v, c) =>
          v ? (
            <rect
              key={`${r}-${c}`}
              x={c * cell}
              y={r * cell}
              width={cell}
              height={cell}
              fill="#111827"
            />
          ) : null
        )
      )}
    </svg>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = {
  Home: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Calendar: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Bell: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),
  QR: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="3" height="3" /><line x1="21" y1="14" x2="21" y2="14" /><line x1="21" y1="21" x2="21" y2="21" />
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Wifi: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M5 12.55a11 11 0 0114.08 0" /><path d="M1.42 9a16 16 0 0121.16 0" /><path d="M8.53 16.11a6 6 0 016.95 0" /><circle cx="12" cy="20" r="1" fill="currentColor" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  MapPin: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Scan: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M3 7V5a2 2 0 012-2h2" /><path d="M17 3h2a2 2 0 012 2v2" /><path d="M21 17v2a2 2 0 01-2 2h-2" /><path d="M7 21H5a2 2 0 01-2-2v-2" /><line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  ),
  Users: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  BarChart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  ),
  Log: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  Google: () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  ),
  ArrowLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  RefreshCw: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  ),
  Download: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
};

// ─── Shared Components ────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    upcoming: "bg-blue-50 text-blue-600",
    closed: "bg-slate-100 text-slate-500",
    synced: "bg-green-100 text-green-700",
    queued: "bg-amber-100 text-amber-700",
    confirmed: "bg-green-100 text-green-700",
    duplicate: "bg-red-100 text-red-600",
  };
  const label: Record<string, string> = {
    active: "Live",
    upcoming: "Upcoming",
    closed: "Closed",
    synced: "Synced",
    queued: "Queued Offline",
    confirmed: "Confirmed",
    duplicate: "Duplicate",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${map[status] || "bg-slate-100 text-slate-500"}`}>
      {status === "active" && <span className="w-1.5 h-1.5 rounded-full bg-green-500 pulse-green inline-block" />}
      {label[status] || status}
    </span>
  );
}

function SyncIndicator({ online }: { online: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium ${online ? "text-green-600" : "text-amber-600"}`}>
      <span className={`w-2 h-2 rounded-full ${online ? "bg-green-500 pulse-green" : "bg-amber-400"}`} />
      {online ? "Synced" : "Offline"}
    </div>
  );
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sz = { sm: "w-8 h-8 text-sm", md: "w-10 h-10 text-base", lg: "w-16 h-16 text-2xl" }[size];
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("");
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-green-400 to-green-700 text-white font-bold flex items-center justify-center flex-shrink-0`}>
      {initials}
    </div>
  );
}

function Toast({ message, type }: { message: string; type: "success" | "warning" | "info" }) {
  const bg = { success: "bg-green-600", warning: "bg-amber-500", info: "bg-slate-700" }[type];
  return (
    <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 ${bg} text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg slide-up flex items-center gap-2`}>
      {type === "success" && <Icon.Check />}
      {message}
    </div>
  );
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────
function TopBar({
  user,
  online,
  announcementCount,
  onNav,
}: {
  user: User | null;
  online: boolean;
  announcementCount: number;
  onNav: (p: Page) => void;
}) {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100 px-4 py-3 flex items-center justify-between">
      <button onClick={() => onNav(user ? "dashboard" : "landing")} className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="w-4.5 h-4.5">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
        </div>
        <span className="font-extrabold text-slate-900 text-sm tracking-tight">AttendanceQR</span>
      </button>
      <div className="flex items-center gap-3">
        <SyncIndicator online={online} />
        {user && (
          <button className="relative" onClick={() => onNav("announcements")}>
            <Icon.Bell />
            {announcementCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center slide-up">
                {announcementCount}
              </span>
            )}
          </button>
        )}
        {user ? (
          <button onClick={() => onNav("profile")}>
            <Avatar name={user.name} size="sm" />
          </button>
        ) : (
          <button
            onClick={() => onNav("login")}
            className="text-sm font-semibold text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-50"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────
function BottomNav({ page, user, onNav }: { page: Page; user: User | null; onNav: (p: Page) => void }) {
  if (!user) return null;
  const isAdmin = user.role === "admin";
  const items = isAdmin
    ? [
        { page: "admin-dashboard" as Page, label: "Overview", Icon: Icon.Home },
        { page: "admin-events" as Page, label: "Events", Icon: Icon.Calendar },
        { page: "admin-scanner" as Page, label: "Scan", Icon: Icon.Scan },
        { page: "admin-announcements" as Page, label: "Posts", Icon: Icon.Bell },
        { page: "admin-reports" as Page, label: "Reports", Icon: Icon.BarChart },
      ]
    : [
        { page: "dashboard" as Page, label: "Home", Icon: Icon.Home },
        { page: "events" as Page, label: "Events", Icon: Icon.Calendar },
        { page: "my-qr" as Page, label: "My QR", Icon: Icon.QR },
        { page: "announcements" as Page, label: "Updates", Icon: Icon.Bell },
        { page: "profile" as Page, label: "Profile", Icon: Icon.User },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 flex lg:hidden">
      {items.map(({ page: p, label, Icon: I }) => {
        const active = page === p || (p === "admin-dashboard" && page.startsWith("admin") && page !== "admin-announcements" && page !== "admin-reports" && page !== "admin-scanner" && page !== "admin-events");
        return (
          <button
            key={p}
            onClick={() => onNav(p)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors ${
              active ? "text-green-600" : "text-slate-400"
            }`}
          >
            <I />
            {label}
            {active && <span className="absolute bottom-0 w-6 h-0.5 bg-green-600 rounded-t-full" />}
          </button>
        );
      })}
    </nav>
  );
}

// ─── Sidebar (desktop) ────────────────────────────────────────────────────────
function Sidebar({ page, user, onNav }: { page: Page; user: User | null; onNav: (p: Page) => void }) {
  if (!user) return null;
  const isAdmin = user.role === "admin";
  const items = isAdmin
    ? [
        { page: "admin-dashboard" as Page, label: "Dashboard", Icon: Icon.Home },
        { page: "admin-events" as Page, label: "Events", Icon: Icon.Calendar },
        { page: "admin-scanner" as Page, label: "QR Scanner", Icon: Icon.Scan },
        { page: "admin-attendees" as Page, label: "Attendees", Icon: Icon.Users },
        { page: "admin-announcements" as Page, label: "Announcements", Icon: Icon.Bell },
        { page: "admin-reports" as Page, label: "Reports", Icon: Icon.BarChart },
        { page: "admin-dashboard" as Page, label: "Access Logs", Icon: Icon.Log },
      ]
    : [
        { page: "dashboard" as Page, label: "Home", Icon: Icon.Home },
        { page: "events" as Page, label: "Events", Icon: Icon.Calendar },
        { page: "my-qr" as Page, label: "My QR Code", Icon: Icon.QR },
        { page: "announcements" as Page, label: "Announcements", Icon: Icon.Bell },
        { page: "attendance-history" as Page, label: "My Attendance", Icon: Icon.Check },
        { page: "profile" as Page, label: "Profile", Icon: Icon.User },
      ];

  return (
    <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-slate-100 bg-white min-h-0">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onNav(isAdmin ? "admin-dashboard" : "dashboard")}>
          <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="w-4 h-4">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <div>
            <div className="font-extrabold text-slate-900 text-sm">AttendanceQR</div>
            <div className="text-[10px] text-slate-400 font-medium">DLSJBC</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {items.map(({ page: p, label, Icon: I }) => {
          const active = page === p;
          return (
            <button
              key={p + label}
              onClick={() => onNav(p)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-0.5 transition-all ${
                active
                  ? "bg-green-50 text-green-700 font-semibold"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              <span className={active ? "text-green-600" : "text-slate-400"}>
                <I />
              </span>
              {label}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-100">
        <div className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer">
          <Avatar name={user.name} size="sm" />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-800 truncate">{user.name}</div>
            <div className="text-[10px] text-slate-400 truncate">{user.studentId}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── Pages ────────────────────────────────────────────────────────────────────

// Landing
function LandingPage({ onNav }: { onNav: (p: Page) => void }) {
  return (
    <div className="min-h-screen bg-[#f8faf9]">
      {/* Hero */}
      <div className="relative overflow-hidden bg-white border-b border-slate-100">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-green-100 rounded-full opacity-60 blur-3xl" />
          <div className="absolute top-24 -left-24 w-80 h-80 bg-green-50 rounded-full opacity-80 blur-2xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 pt-16 pb-20 text-center">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 slide-up">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full pulse-green inline-block" />
            DLSJBC Student Attendance System
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4 slide-up">
            Event Attendance,<br />
            <span className="text-green-600">Made Simple.</span>
          </h1>
          <p className="text-slate-500 text-lg max-w-xl mx-auto mb-8 leading-relaxed slide-up">
            Scan your personal QR code at any school event. Works offline. Syncs automatically. No hassle.
          </p>
          <div className="flex items-center justify-center gap-3 slide-up">
            <button
              onClick={() => onNav("login")}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl shadow-sm hover:shadow-md transition-all hover:scale-[1.02]"
            >
              Sign In with Google
            </button>
            <button
              onClick={() => onNav("events")}
              className="bg-white border border-slate-200 text-slate-700 font-semibold px-6 py-3 rounded-xl hover:bg-slate-50 transition-all"
            >
              Browse Events
            </button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-4xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-6">
        {[
          { icon: "📱", title: "Your QR, Your Device", desc: "Your personal QR code lives on your device. Show it at any event to log attendance instantly." },
          { icon: "📶", title: "Works Offline", desc: "No connection? No problem. The app loads from cache and syncs attendance records when you're back online." },
          { icon: "⚡", title: "Instant Confirmation", desc: "Admin scans your QR, you're marked attended. Real-time confirmation, no paper forms needed." },
        ].map(f => (
          <div key={f.title} className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-bold text-slate-900 mb-2">{f.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Upcoming Events preview */}
      <div className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="font-extrabold text-slate-900 text-xl mb-4">Upcoming Events</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {EVENTS.filter(e => e.status !== "closed").slice(0, 2).map(e => (
            <div key={e.id} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-all cursor-pointer" onClick={() => onNav("events")}>
              <div className="flex items-start justify-between mb-3">
                <StatusBadge status={e.status} />
                <span className="text-xs text-slate-400 font-medium">{e.date}</span>
              </div>
              <h3 className="font-bold text-slate-900 mb-2 leading-snug">{e.title}</h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Icon.MapPin />
                {e.location}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Login
function LoginPage({ onLogin }: { onLogin: (role: Role) => void }) {
  const [loading, setLoading] = useState(false);
  const handleLogin = (role: Role) => {
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(role); }, 1200);
  };
  return (
    <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-green-600 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="w-8 h-8">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <h1 className="font-extrabold text-slate-900 text-2xl mb-1">Welcome back</h1>
          <p className="text-slate-500 text-sm">Sign in to access your attendance dashboard</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <button
            onClick={() => handleLogin("student")}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all mb-3 disabled:opacity-60"
          >
            {loading ? <div className="w-5 h-5 border-2 border-green-300 border-t-green-600 rounded-full animate-spin" /> : <Icon.Google />}
            Continue as Student
          </button>
          <button
            onClick={() => handleLogin("admin")}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all disabled:opacity-60"
          >
            <Icon.Shield />
            Continue as Admin
          </button>
          <p className="text-[11px] text-slate-400 text-center mt-4 leading-relaxed">
            Sign-in is secured via Google OAuth. Your data is stored on DLSJBC's Supabase instance.
          </p>
        </div>
      </div>
    </div>
  );
}

// Onboarding
function OnboardingPage({ onComplete }: { onComplete: (data: Partial<User>) => void }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", studentId: "", program: "", yearLevel: "" });
  const next = () => step < 3 ? setStep(s => s + 1) : onComplete(form);
  return (
    <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <div className="flex gap-1.5 mb-4">
            {[1,2,3].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${s <= step ? "bg-green-600" : "bg-slate-200"}`} />
            ))}
          </div>
          <p className="text-xs text-slate-400 font-medium">Step {step} of 3</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm slide-up">
          {step === 1 && (
            <div>
              <h2 className="font-extrabold text-slate-900 text-xl mb-1">What's your name?</h2>
              <p className="text-sm text-slate-500 mb-5">This will appear on your attendance records.</p>
              <input
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
                placeholder="Full name (e.g. Maria Santos)"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
          )}
          {step === 2 && (
            <div>
              <h2 className="font-extrabold text-slate-900 text-xl mb-1">Student ID</h2>
              <p className="text-sm text-slate-500 mb-5">Your school-issued ID number.</p>
              <input
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
                placeholder="e.g. 2024-0001"
                value={form.studentId}
                onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))}
              />
            </div>
          )}
          {step === 3 && (
            <div>
              <h2 className="font-extrabold text-slate-900 text-xl mb-1">Program & Year</h2>
              <p className="text-sm text-slate-500 mb-5">Used for attendance grouping and reports.</p>
              <select
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 mb-3"
                value={form.program}
                onChange={e => setForm(f => ({ ...f, program: e.target.value }))}
              >
                <option value="">Select program</option>
                <option>BSIT</option><option>BSCS</option><option>BSBA</option><option>BSEd</option>
              </select>
              <select
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
                value={form.yearLevel}
                onChange={e => setForm(f => ({ ...f, yearLevel: e.target.value }))}
              >
                <option value="">Year level</option>
                <option>1st Year</option><option>2nd Year</option><option>3rd Year</option><option>4th Year</option>
              </select>
            </div>
          )}
          <button
            onClick={next}
            className="w-full mt-5 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-all"
          >
            {step === 3 ? "Finish Setup" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Student Dashboard
function DashboardPage({ user, onNav }: { user: User; onNav: (p: Page) => void }) {
  const nextEvent = EVENTS.find(e => e.status !== "closed");
  return (
    <div className="p-4 max-w-2xl mx-auto pb-24 lg:pb-8 slide-up">
      {/* Greeting */}
      <div className="mb-6 mt-2">
        <p className="text-sm text-slate-500 font-medium">Good morning,</p>
        <h1 className="text-2xl font-extrabold text-slate-900">{user.name.split(" ")[0]} 👋</h1>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Events Attended", value: "4" },
          { label: "This Semester", value: "2" },
          { label: "Streak", value: "3 days" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
            <div className="text-xl font-extrabold text-slate-900">{s.value}</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5 leading-tight">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Next Event card */}
      {nextEvent && (
        <div className="bg-green-600 rounded-2xl p-5 text-white mb-4 cursor-pointer hover:bg-green-700 transition-all" onClick={() => onNav("events")}>
          <div className="flex items-center justify-between mb-3">
            <StatusBadge status={nextEvent.status} />
            <span className="text-green-200 text-xs font-medium">Up next</span>
          </div>
          <h2 className="font-bold text-lg leading-snug mb-3">{nextEvent.title}</h2>
          <div className="flex items-center gap-4 text-sm text-green-100">
            <span className="flex items-center gap-1"><Icon.Calendar />{nextEvent.date}</span>
            <span className="flex items-center gap-1"><Icon.MapPin />{nextEvent.location}</span>
          </div>
        </div>
      )}

      {/* QR shortcut */}
      <button
        onClick={() => onNav("my-qr")}
        className="w-full bg-white border border-slate-100 rounded-2xl p-5 flex items-center justify-between hover:shadow-md transition-all mb-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center">
            <Icon.QR />
          </div>
          <div className="text-left">
            <div className="font-bold text-slate-900 text-sm">My QR Code</div>
            <div className="text-xs text-slate-400">Tap to show at events</div>
          </div>
        </div>
        <Icon.ChevronRight />
      </button>

      {/* Latest Announcements */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-slate-900">Latest Updates</h2>
        <button onClick={() => onNav("announcements")} className="text-xs text-green-600 font-semibold">See all</button>
      </div>
      <div className="space-y-3">
        {ANNOUNCEMENTS.slice(0, 2).map(a => (
          <div key={a.id} className="bg-white rounded-2xl border border-slate-100 p-4 cursor-pointer hover:shadow-sm transition-all" onClick={() => onNav("announcements")}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-xs bg-green-50 text-green-700 font-semibold px-2 py-0.5 rounded-full">{a.badge}</span>
              <span className="text-[11px] text-slate-400 shrink-0">{a.date}</span>
            </div>
            <h3 className="font-semibold text-slate-900 text-sm mb-1">{a.title}</h3>
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{a.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Events Page
function EventsPage({ onNav, onSelectEvent }: { onNav: (p: Page) => void; onSelectEvent: (id: string) => void }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? EVENTS : EVENTS.filter(e => e.status === filter);
  return (
    <div className="p-4 max-w-2xl mx-auto pb-24 lg:pb-8 slide-up">
      <h1 className="font-extrabold text-2xl text-slate-900 mt-2 mb-5">Events</h1>
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {["all", "active", "upcoming", "closed"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all capitalize ${
              filter === f ? "bg-green-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600"
            }`}
          >
            {f === "all" ? "All Events" : f}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {filtered.map(e => (
          <div
            key={e.id}
            className="bg-white rounded-2xl border border-slate-100 p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
            onClick={() => { onSelectEvent(e.id); onNav("event-detail"); }}
          >
            <div className="flex items-start justify-between mb-3">
              <StatusBadge status={e.status} />
              {e.status === "active" && (
                <span className="text-xs text-slate-400 font-medium">{e.attendees} attended</span>
              )}
            </div>
            <h3 className="font-bold text-slate-900 mb-2 leading-snug">{e.title}</h3>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed line-clamp-2">{e.description}</p>
            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Icon.Calendar />{e.date}</span>
              <span className="flex items-center gap-1"><Icon.Clock />{e.time}</span>
              <span className="flex items-center gap-1"><Icon.MapPin />{e.location}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Event Detail
function EventDetailPage({ eventId, user, onBack }: { eventId: string; user: User | null; onBack: () => void }) {
  const event = EVENTS.find(e => e.id === eventId) || EVENTS[0];
  return (
    <div className="max-w-2xl mx-auto p-4 pb-24 lg:pb-8 slide-up">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 font-medium mb-5 mt-2 hover:text-slate-700 transition-colors">
        <Icon.ArrowLeft /> Back to Events
      </button>
      <div className="bg-green-600 rounded-2xl p-6 text-white mb-4">
        <StatusBadge status={event.status} />
        <h1 className="font-extrabold text-2xl mt-3 mb-4 leading-snug">{event.title}</h1>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-green-200 text-[10px] font-semibold mb-1">DATE</div>
            <div className="text-sm font-semibold">{event.date}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-green-200 text-[10px] font-semibold mb-1">TIME</div>
            <div className="text-sm font-semibold">{event.time}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 col-span-2">
            <div className="text-green-200 text-[10px] font-semibold mb-1">LOCATION</div>
            <div className="text-sm font-semibold">{event.location}</div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
        <h2 className="font-bold text-slate-900 mb-2">About this Event</h2>
        <p className="text-sm text-slate-500 leading-relaxed">{event.description}</p>
      </div>
      {user && event.status !== "closed" && (
        <div className="bg-green-50 border border-green-100 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0 text-green-600">
            <Icon.QR />
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-sm">Ready to attend?</div>
            <div className="text-xs text-slate-500">Show your QR code at the entrance to log your attendance.</div>
          </div>
        </div>
      )}
    </div>
  );
}

// My QR
function MyQRPage({ user }: { user: User }) {
  const [brightness, setBrightness] = useState(false);
  return (
    <div className="p-4 max-w-sm mx-auto pb-24 lg:pb-8 slide-up flex flex-col items-center">
      <h1 className="font-extrabold text-2xl text-slate-900 mt-2 mb-2 self-start">My QR Code</h1>
      <p className="text-sm text-slate-500 mb-8 self-start">Show this to the admin to log your attendance.</p>
      <div className={`bg-white rounded-3xl border-2 border-green-100 p-6 shadow-lg text-center qr-glow ${brightness ? "brightness-150" : ""}`}>
        <div className="mb-4">
          <QRPattern size={200} />
        </div>
        <div className="border-t border-slate-100 pt-4">
          <p className="font-extrabold text-slate-900 text-lg">{user.name}</p>
          <p className="text-sm text-slate-500 font-medium">{user.studentId}</p>
          <p className="text-xs text-slate-400 mt-1">{user.program} · {user.yearLevel}</p>
        </div>
      </div>
      <div className="mt-6 w-full space-y-3">
        <button
          onClick={() => setBrightness(b => !b)}
          className="w-full bg-white border border-slate-200 text-slate-700 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
        >
          ☀️ {brightness ? "Normal Brightness" : "Boost Brightness"}
        </button>
        <div className="flex items-center gap-2 justify-center text-xs text-slate-400">
          <Icon.Check />
          <span>QR stored on your device — works offline</span>
        </div>
      </div>
    </div>
  );
}

// Announcements
function AnnouncementsPage() {
  return (
    <div className="p-4 max-w-2xl mx-auto pb-24 lg:pb-8 slide-up">
      <div className="flex items-center justify-between mt-2 mb-5">
        <h1 className="font-extrabold text-2xl text-slate-900">Announcements</h1>
        <button className="text-slate-400 hover:text-slate-600"><Icon.RefreshCw /></button>
      </div>
      <div className="space-y-4">
        {ANNOUNCEMENTS.map(a => (
          <div key={a.id} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs bg-green-50 text-green-700 font-semibold px-2.5 py-1 rounded-full">{a.badge}</span>
              <span className="text-[11px] text-slate-400 font-medium">{a.date}</span>
            </div>
            <h3 className="font-bold text-slate-900 mb-2">{a.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{a.body}</p>
            <div className="mt-3 pt-3 border-t border-slate-50 text-[11px] text-slate-400">
              Posted by {a.author}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Attendance History
function AttendanceHistoryPage() {
  return (
    <div className="p-4 max-w-2xl mx-auto pb-24 lg:pb-8 slide-up">
      <h1 className="font-extrabold text-2xl text-slate-900 mt-2 mb-2">My Attendance</h1>
      <p className="text-sm text-slate-500 mb-5">Your complete attendance record across all events.</p>
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {ATTENDANCE_RECORDS.map((r, i) => (
          <div key={i} className={`flex items-center justify-between p-4 ${i < ATTENDANCE_RECORDS.length - 1 ? "border-b border-slate-50" : ""}`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${r.status === "synced" ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"}`}>
                {r.status === "synced" ? <Icon.Check /> : <Icon.Clock />}
              </div>
              <div>
                <div className="font-semibold text-slate-900 text-sm">{r.event}</div>
                <div className="text-[11px] text-slate-400">{r.date} · {r.time}</div>
              </div>
            </div>
            <StatusBadge status={r.status} />
          </div>
        ))}
      </div>
      <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center gap-2 text-xs text-amber-700">
        <span className="font-semibold">1 record</span> queued — will sync when you're back online.
      </div>
    </div>
  );
}

// Profile
function ProfilePage({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <div className="p-4 max-w-sm mx-auto pb-24 lg:pb-8 slide-up">
      <h1 className="font-extrabold text-2xl text-slate-900 mt-2 mb-6">Profile</h1>
      <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center mb-4">
        <Avatar name={user.name} size="lg" />
        <h2 className="font-bold text-slate-900 text-lg mt-3">{user.name}</h2>
        <p className="text-sm text-slate-500">{user.studentId}</p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="text-xs bg-green-50 text-green-700 font-semibold px-2.5 py-1 rounded-full">{user.program}</span>
          <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2.5 py-1 rounded-full">{user.yearLevel}</span>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-4">
        {[
          { label: "Full Name", value: user.name },
          { label: "Student ID", value: user.studentId },
          { label: "Program", value: user.program },
          { label: "Year Level", value: user.yearLevel },
          { label: "Account", value: "student@dlsjbc.edu.ph" },
        ].map((f, i, arr) => (
          <div key={f.label} className={`flex items-center justify-between px-5 py-4 ${i < arr.length - 1 ? "border-b border-slate-50" : ""}`}>
            <span className="text-xs text-slate-400 font-medium">{f.label}</span>
            <span className="text-sm text-slate-900 font-semibold">{f.value}</span>
          </div>
        ))}
      </div>
      <button
        onClick={onLogout}
        className="w-full border border-red-100 text-red-500 font-semibold py-3 rounded-xl hover:bg-red-50 transition-all text-sm"
      >
        Sign Out
      </button>
    </div>
  );
}

// ─── Admin Pages ──────────────────────────────────────────────────────────────

function AdminDashboard({ onNav }: { onNav: (p: Page) => void }) {
  return (
    <div className="p-4 max-w-3xl mx-auto pb-24 lg:pb-8 slide-up">
      <div className="flex items-center justify-between mt-2 mb-6">
        <div>
          <h1 className="font-extrabold text-2xl text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-500">Aug 21, 2026 · SSC General Assembly is active</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full pulse-green" />
          <span className="text-xs font-semibold text-green-700">Live</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Scanned Today", value: "143", color: "text-green-600", bg: "bg-green-50" },
          { label: "Pending Sync", value: "7", color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Active Events", value: "1", color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Total Students", value: "892", color: "text-slate-700", bg: "bg-slate-50" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button onClick={() => onNav("admin-scanner")} className="bg-green-600 hover:bg-green-700 text-white rounded-2xl p-5 text-left transition-all hover:shadow-md">
          <Icon.Scan />
          <div className="font-bold mt-3 mb-1">Open Scanner</div>
          <div className="text-green-200 text-xs">Scan student QR codes</div>
        </button>
        <button onClick={() => onNav("admin-attendees")} className="bg-white border border-slate-100 rounded-2xl p-5 text-left hover:shadow-md transition-all">
          <Icon.Users />
          <div className="font-bold text-slate-900 mt-3 mb-1">View Attendees</div>
          <div className="text-slate-400 text-xs">143 confirmed today</div>
        </button>
      </div>

      {/* Recent scans */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-slate-900">Recent Scans</h2>
        <button onClick={() => onNav("admin-attendees")} className="text-xs text-green-600 font-semibold">See all</button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {ADMIN_SCANS.slice(0, 4).map((s, i) => (
          <div key={i} className={`flex items-center gap-3 px-4 py-3.5 ${i < 3 ? "border-b border-slate-50" : ""}`}>
            <Avatar name={s.name} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-slate-900">{s.name}</div>
              <div className="text-xs text-slate-400">{s.id} · {s.program}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{s.time}</span>
              <StatusBadge status={s.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminEventsPage({ onNav }: { onNav: (p: Page) => void }) {
  return (
    <div className="p-4 max-w-3xl mx-auto pb-24 lg:pb-8 slide-up">
      <div className="flex items-center justify-between mt-2 mb-5">
        <h1 className="font-extrabold text-2xl text-slate-900">Events</h1>
        <button className="flex items-center gap-1.5 bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-green-700 transition-all">
          <Icon.Plus />New Event
        </button>
      </div>
      <div className="space-y-4">
        {EVENTS.map(e => (
          <div key={e.id} className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-start justify-between mb-3">
              <StatusBadge status={e.status} />
              <span className="text-xs text-slate-400">{e.date}</span>
            </div>
            <h3 className="font-bold text-slate-900 mb-2">{e.title}</h3>
            <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-4">
              <span className="flex items-center gap-1"><Icon.MapPin />{e.location}</span>
              <span className="flex items-center gap-1"><Icon.Clock />{e.time}</span>
            </div>
            <div className="flex gap-2">
              {e.status === "active" && (
                <button onClick={() => onNav("admin-scanner")} className="flex-1 bg-green-600 text-white text-xs font-semibold py-2 rounded-lg hover:bg-green-700 transition-all flex items-center justify-center gap-1">
                  <Icon.Scan />Open Scanner
                </button>
              )}
              <button onClick={() => onNav("admin-attendees")} className="flex-1 border border-slate-200 text-slate-600 text-xs font-semibold py-2 rounded-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-1">
                <Icon.Users />Attendees {e.attendees > 0 ? `(${e.attendees})` : ""}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminScannerPage() {
  const [lastScan, setLastScan] = useState<typeof ADMIN_SCANS[0] | null>(null);
  const [scanning, setScanning] = useState(true);
  const simulateScan = () => {
    setScanning(false);
    const s = ADMIN_SCANS[Math.floor(Math.random() * ADMIN_SCANS.length)];
    setLastScan(s);
  };
  const reset = () => { setScanning(true); setLastScan(null); };
  return (
    <div className="p-4 max-w-sm mx-auto pb-24 lg:pb-8 slide-up">
      <h1 className="font-extrabold text-2xl text-slate-900 mt-2 mb-2">QR Scanner</h1>
      <p className="text-xs text-slate-400 mb-5 font-medium">SSC General Assembly · Aug 22, 2026</p>

      {/* Camera view */}
      <div className="bg-slate-900 rounded-2xl overflow-hidden mb-4 relative" style={{ aspectRatio: "1" }}>
        <div className="absolute inset-0 flex items-center justify-center">
          {scanning ? (
            <div className="relative">
              <div className="w-48 h-48 border-2 border-white/30 rounded-xl relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-green-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-green-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-green-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-green-400 rounded-br-lg" />
                <div className="absolute top-0 left-4 right-4 h-0.5 bg-green-400/60 animate-[scan_2s_ease-in-out_infinite]" style={{ animation: "scan 2s ease-in-out infinite" }} />
              </div>
              <p className="text-white/60 text-xs text-center mt-4">Position QR code inside the frame</p>
            </div>
          ) : (
            <div className="text-center fade-in">
              {lastScan && (
                <div className="text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${lastScan.status === "confirmed" ? "bg-green-500" : "bg-red-500"}`}>
                    {lastScan.status === "confirmed" ? <Icon.Check /> : <span className="text-white text-xl font-bold">!</span>}
                  </div>
                  <p className="text-white font-bold text-lg">{lastScan.name}</p>
                  <p className="text-white/60 text-sm">{lastScan.id}</p>
                  <p className="text-white/40 text-xs mt-1">{lastScan.program}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes scan { 0%, 100% { top: 8px; } 50% { top: calc(100% - 10px); } }`}</style>

      {scanning ? (
        <button
          onClick={simulateScan}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3.5 rounded-xl transition-all"
        >
          Simulate Scan
        </button>
      ) : (
        <div className="space-y-3">
          {lastScan && (
            <div className={`rounded-xl p-4 border ${lastScan.status === "confirmed" ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-bold text-sm ${lastScan.status === "confirmed" ? "text-green-800" : "text-red-800"}`}>
                    {lastScan.status === "confirmed" ? "✓ Attendance Confirmed" : "⚠ Duplicate Scan"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{lastScan.time}</p>
                </div>
                <StatusBadge status={lastScan.status} />
              </div>
            </div>
          )}
          <button onClick={reset} className="w-full border border-slate-200 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-all">
            Scan Next Student
          </button>
        </div>
      )}

      <div className="mt-5 text-center text-xs text-slate-400 font-medium">
        {ADMIN_SCANS.filter(s => s.status === "confirmed").length} confirmed this session
      </div>
    </div>
  );
}

function AdminAttendeesPage() {
  return (
    <div className="p-4 max-w-3xl mx-auto pb-24 lg:pb-8 slide-up">
      <div className="flex items-center justify-between mt-2 mb-5">
        <div>
          <h1 className="font-extrabold text-2xl text-slate-900">Attendees</h1>
          <p className="text-sm text-slate-500">SSC General Assembly</p>
        </div>
        <button className="flex items-center gap-1.5 border border-slate-200 text-slate-600 text-sm font-semibold px-3 py-2 rounded-xl hover:bg-slate-50 transition-all">
          <Icon.Download />Export
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 grid grid-cols-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
          <span className="col-span-2">Student</span>
          <span>Program</span>
          <span className="text-right">Status</span>
        </div>
        {ADMIN_SCANS.map((s, i) => (
          <div key={i} className={`px-4 py-3.5 grid grid-cols-4 items-center ${i < ADMIN_SCANS.length - 1 ? "border-b border-slate-50" : ""}`}>
            <div className="col-span-2 flex items-center gap-3">
              <Avatar name={s.name} size="sm" />
              <div>
                <div className="font-semibold text-sm text-slate-900">{s.name}</div>
                <div className="text-[11px] text-slate-400">{s.id}</div>
              </div>
            </div>
            <span className="text-xs text-slate-500">{s.program}</span>
            <div className="flex justify-end">
              <StatusBadge status={s.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminAnnouncementsPage() {
  const [showForm, setShowForm] = useState(false);
  return (
    <div className="p-4 max-w-3xl mx-auto pb-24 lg:pb-8 slide-up">
      <div className="flex items-center justify-between mt-2 mb-5">
        <h1 className="font-extrabold text-2xl text-slate-900">Announcements</h1>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-green-700 transition-all">
          <Icon.Plus />New Post
        </button>
      </div>
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-5 slide-up">
          <h2 className="font-bold text-slate-900 mb-4">New Announcement</h2>
          <input className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 mb-3" placeholder="Title" />
          <textarea className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 mb-3 resize-none" rows={4} placeholder="Body text..." />
          <div className="flex gap-2">
            <button className="flex-1 bg-green-600 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-green-700 transition-all">Publish</button>
            <button onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-all">Cancel</button>
          </div>
        </div>
      )}
      <div className="space-y-4">
        {ANNOUNCEMENTS.map(a => (
          <div key={a.id} className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs bg-green-50 text-green-700 font-semibold px-2.5 py-1 rounded-full">{a.badge}</span>
              <span className="text-[11px] text-slate-400">{a.date}</span>
            </div>
            <h3 className="font-bold text-slate-900 mb-2">{a.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">{a.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminReportsPage() {
  return (
    <div className="p-4 max-w-3xl mx-auto pb-24 lg:pb-8 slide-up">
      <div className="flex items-center justify-between mt-2 mb-5">
        <h1 className="font-extrabold text-2xl text-slate-900">Reports</h1>
        <button className="flex items-center gap-1.5 border border-slate-200 text-slate-600 text-sm font-semibold px-3 py-2 rounded-xl hover:bg-slate-50 transition-all">
          <Icon.Download />Export CSV
        </button>
      </div>
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {[
          { label: "BSIT", count: 234, pct: 78, color: "bg-green-500" },
          { label: "BSCS", count: 198, pct: 65, color: "bg-blue-500" },
          { label: "BSBA", count: 156, pct: 52, color: "bg-purple-400" },
          { label: "BSEd", count: 89, pct: 45, color: "bg-amber-400" },
        ].map(r => (
          <div key={r.label} className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-slate-900">{r.label}</span>
              <span className="text-sm font-semibold text-slate-500">{r.count} students</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full ${r.color} rounded-full`} style={{ width: `${r.pct}%` }} />
            </div>
            <div className="text-xs text-slate-400 mt-2">{r.pct}% attendance rate</div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50">
          <h2 className="font-bold text-slate-900">By Event</h2>
        </div>
        {EVENTS.filter(e => e.status !== "upcoming").map((e, i, arr) => (
          <div key={e.id} className={`flex items-center justify-between px-5 py-4 ${i < arr.length - 1 ? "border-b border-slate-50" : ""}`}>
            <div>
              <div className="font-semibold text-sm text-slate-900">{e.title}</div>
              <div className="text-xs text-slate-400 mt-0.5">{e.date}</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-green-600">{e.attendees}</div>
              <div className="text-[11px] text-slate-400">attendees</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>("landing");
  const [user, setUser] = useState<User | null>(null);
  const [online, setOnline] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "warning" | "info" } | null>(null);
  const [selectedEventId, setSelectedEventId] = useState("1");

  // Simulate occasional offline state
  useEffect(() => {
    const t = setTimeout(() => setOnline(false), 8000);
    const t2 = setTimeout(() => { setOnline(true); showToast("3 attendance records synced", "success"); }, 12000);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  const showToast = (msg: string, type: "success" | "warning" | "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = (role: Role) => {
    const mockUser: User = {
      name: role === "admin" ? "Admin Rivera" : "Maria Santos",
      studentId: role === "admin" ? "ADMIN-001" : "2024-0001",
      program: "BSIT",
      yearLevel: "2nd Year",
      role,
    };
    if (role === "student") {
      setUser(mockUser);
      setPage("onboarding");
    } else {
      setUser(mockUser);
      setPage("admin-dashboard");
    }
  };

  const handleOnboardingComplete = (data: Partial<User>) => {
    setUser(u => u ? { ...u, ...data } : u);
    showToast("Welcome! Your QR code is ready.", "success");
    setPage("dashboard");
  };

  const handleLogout = () => {
    setUser(null);
    setPage("landing");
  };

  const isAdmin = user?.role === "admin";

  // Pages that don't need the shell
  const barePages = ["landing", "login", "onboarding"];
  const isBare = barePages.includes(page);

  return (
    <div className="h-full flex flex-col bg-[#f8faf9]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* Top bar */}
      {!isBare && (
        <TopBar user={user} online={online} announcementCount={2} onNav={setPage} />
      )}

      {/* Body */}
      <div className={`flex-1 flex min-h-0 ${!isBare ? "overflow-hidden" : ""}`}>
        {/* Sidebar */}
        {!isBare && user && (
          <Sidebar page={page} user={user} onNav={setPage} />
        )}

        {/* Main content */}
        <main className={`flex-1 ${!isBare ? "overflow-y-auto" : ""}`} style={{ backgroundColor: "#C4F7CA" }}>
          {page === "landing" && <LandingPage onNav={setPage} />}
          {page === "login" && <LoginPage onLogin={handleLogin} />}
          {page === "onboarding" && <OnboardingPage onComplete={handleOnboardingComplete} />}
          {page === "dashboard" && user && !isAdmin && <DashboardPage user={user} onNav={setPage} />}
          {page === "events" && <EventsPage onNav={setPage} onSelectEvent={setSelectedEventId} />}
          {page === "event-detail" && <EventDetailPage eventId={selectedEventId} user={user} onBack={() => setPage("events")} />}
          {page === "my-qr" && user && <MyQRPage user={user} />}
          {page === "announcements" && <AnnouncementsPage />}
          {page === "attendance-history" && <AttendanceHistoryPage />}
          {page === "profile" && user && <ProfilePage user={user} onLogout={handleLogout} />}
          {page === "admin-dashboard" && isAdmin && <AdminDashboard onNav={setPage} />}
          {page === "admin-events" && isAdmin && <AdminEventsPage onNav={setPage} />}
          {page === "admin-scanner" && isAdmin && <AdminScannerPage />}
          {page === "admin-attendees" && isAdmin && <AdminAttendeesPage />}
          {page === "admin-announcements" && isAdmin && <AdminAnnouncementsPage />}
          {page === "admin-reports" && isAdmin && <AdminReportsPage />}
        </main>
      </div>

      {/* Bottom nav */}
      {!isBare && <BottomNav page={page} user={user} onNav={setPage} />}

      {/* Toast */}
      {toast && <Toast message={toast.msg} type={toast.type} />}
    </div>
  );
}
