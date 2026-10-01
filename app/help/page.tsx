import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const helpTopics = [
  {
    title: "Signing in and updating your profile",
    body: "Sign in with the Google account connected to your student profile. If your name, program, or student details are missing or incorrect, contact your school administrator so the profile can be reviewed.",
  },
  {
    title: "Finding your attendance QR code",
    body: "Open My QR from the student navigation and present the code to the event check-in staff. A scan is recorded for the event session selected by the staff scanner.",
  },
  {
    title: "Attendance is missing or incorrect",
    body: "Check Attendance History first. If an event or session is missing, or the recorded status looks wrong, contact an event administrator and include the event name and session.",
  },
  {
    title: "Understanding fines and excuse requests",
    body: "When available, current charges appear under My Fines. If excuse requests are enabled, open the relevant absence in Attendance History to submit it for administrator review.",
  },
  {
    title: "Sending system feedback",
    body: "Choose Send helpful feedback from the Help & Feedback menu. The form opens in a new tab. Avoid including passwords or other sensitive account information.",
  },
];

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-12">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-emerald-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Adesse
        </Link>

        <header className="mt-10 border-b border-emerald-900/10 pb-7 sm:mt-14">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
            Adesse support
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
            Help &amp; Support
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Quick answers for your account, event attendance, and student tools.
          </p>
        </header>

        <section className="mt-8" aria-label="Frequently asked questions">
          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {helpTopics.map((topic, index) => (
              <details key={topic.title} className="group py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-4 text-left [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs font-semibold text-emerald-800">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm font-semibold text-slate-800 sm:text-base">
                      {topic.title}
                    </span>
                  </span>
                  <span className="text-lg leading-none text-slate-400 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="max-w-3xl pb-5 pl-10 text-sm leading-relaxed text-slate-600">
                  {topic.body}
                </p>
              </details>
            ))}
          </div>
        </section>

        <aside className="mt-8 border-l-2 border-emerald-600 pl-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Still need help?
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            For account access, profile corrections, or event attendance issues,
            contact your school administrator through your institution's usual
            support channel.
          </p>
        </aside>
      </div>
    </main>
  );
}
