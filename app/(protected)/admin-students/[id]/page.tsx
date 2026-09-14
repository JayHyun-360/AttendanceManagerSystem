"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PageShell, PageHeader } from "../../../shared-page";
import { supabase } from "@/lib/supabase";

interface StudentDetail {
  id: string;
  profileId: string;
  name: string;
  studentId: string;
  program: string;
  yearLevel: string;
  section: string;
  phone: string;
  email: string;
  photoUrl?: string;
  idPhotoUrl?: string;
  joinedDate: string;
}

export default function StudentDetailRoutePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const routeId = params?.id ?? null;
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!routeId) return;

    let cancelled = false;

    async function loadStudent() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", routeId)
          .maybeSingle();

        if (error) {
          console.error(error);
          return;
        }

        if (!data || cancelled) {
          return;
        }

        setStudent({
          id: data.id,
          profileId: data.id,
          name:
            `${data.first_name ?? ""} ${data.surname ?? ""}`.trim() ||
            data.email ||
            "Student",
          studentId: data.student_id || data.id,
          program: data.program || "",
          yearLevel: data.year_level || "",
          section: data.section || "",
          phone: data.phone || "",
          email: data.contact_email || data.email || "",
          photoUrl: data.photo_url || undefined,
          idPhotoUrl: data.id_photo_url || undefined,
          joinedDate: new Date(data.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
        });
      } catch (caughtError) {
        console.error(caughtError);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadStudent();

    return () => {
      cancelled = true;
    };
  }, [routeId]);

  const badges = useMemo(
    () =>
      [student?.program, student?.yearLevel, student?.section].filter(Boolean),
    [student],
  );

  if (isLoading) {
    return (
      <PageShell>
        <Skeleton className="h-8 w-40 rounded-lg" />
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-48 rounded" />
                <Skeleton className="h-4 w-32 rounded" />
              </div>
            </div>
          </div>
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </PageShell>
    );
  }

  if (!student) {
    return (
      <PageShell>
        <PageHeader title="Student Profile" />
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-sm font-semibold text-amber-800">
            Student profile not found.
          </p>
          <button
            onClick={() => router.push("/admin-students")}
            className="mt-4 h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white"
          >
            Back to students
          </button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => router.push("/admin-students")}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <span aria-hidden="true">←</span>
            Back to students
          </button>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-emerald-500 via-green-600 to-emerald-700 px-5 py-6 md:px-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <div className="relative">
                {student.photoUrl ? (
                  <img
                    src={student.photoUrl}
                    alt={student.name}
                    className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-lg md:h-28 md:w-28"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-white/20 text-2xl font-bold text-white shadow-lg md:h-28 md:w-28">
                    {student.name
                      .split(" ")
                      .filter(Boolean)
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase() || "S"}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 text-white">
                <p className="text-xl font-bold md:text-2xl">{student.name}</p>
                <p className="mt-1 text-sm text-emerald-50">
                  {student.studentId}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {badges.map((badge) => (
                    <span
                      key={badge}
                      className="rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6">
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="mb-5 w-full justify-start bg-slate-100 p-1">
                <TabsTrigger value="profile" className="flex-1 md:flex-none">
                  Profile Info
                </TabsTrigger>
                <TabsTrigger value="id-photo" className="flex-1 md:flex-none">
                  ID Photo
                </TabsTrigger>
                <TabsTrigger value="attendance" className="flex-1 md:flex-none">
                  Attendance History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      {
                        label: "Phone",
                        value: student.phone || "Not provided",
                      },
                      {
                        label: "Email",
                        value: student.email || "Not provided",
                      },
                      { label: "Joined TapIn", value: student.joinedDate },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-xl border border-slate-200 bg-white p-3"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          {item.label}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="id-photo" className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
                  {student.idPhotoUrl ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3">
                      <img
                        src={student.idPhotoUrl}
                        alt="Student ID"
                        className="w-full rounded-xl object-cover md:max-h-[480px]"
                      />
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
                      <p className="text-sm font-semibold text-amber-800">
                        No ID photo uploaded
                      </p>
                      <p className="mt-1 text-xs text-amber-700">
                        This student has not uploaded a school ID photo yet.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="attendance" className="space-y-4">
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <p className="text-base font-semibold text-slate-800">
                    Attendance History
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    This placeholder is reserved for future attendance details.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
