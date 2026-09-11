"use client";

import { useState, type ReactNode } from "react";
import {
  TopBar,
  Sidebar,
  Toast,
  PageShell,
  ProfileIcon,
  TapInMark,
  DotMenu,
  BackButton,
  type Page,
  type User,
} from "../page";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>("landing");
  const [open, setOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const onLogout = () => {
    setUser(null);
    setPage("landing");
    setOpen(false);
  };

  const onNav = (p: Page) => {
    setPage(p);
    setOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f8faf9]">
      <TopBar user={user} onNav={onNav} onMenuOpen={() => setOpen(true)} />
      <div className="flex min-h-[calc(100vh-56px)]">
        <Sidebar
          page={page}
          user={user}
          open={open}
          onNav={onNav}
          onClose={() => setOpen(false)}
          onLogout={onLogout}
        />
        <main className="flex-1">
          <PageShell>{children}</PageShell>
        </main>
      </div>
      {toastMessage && <Toast message={toastMessage} variant="success" />}
    </div>
  );
}
