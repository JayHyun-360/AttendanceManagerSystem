"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AttendanceHistoryPage,
  type ExcuseRequest,
  type FineRecord,
} from "../../page";
import { supabase } from "@/lib/supabase";
import { useProtectedUser } from "../layout";

export default function AttendanceHistoryRoutePage() {
  const router = useRouter();
  const { authUserId } = useProtectedUser();
  const [excuseRequests, setExcuseRequests] = useState<ExcuseRequest[]>([]);
  const [fines, setFines] = useState<FineRecord[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!authUserId) {
        return;
      }

      const [finesResult, excuseResult, attendanceResult] = await Promise.all([
        supabase
          .from("fines")
          .select("*")
          .eq("student_id", authUserId)
          .order("created_at", { ascending: false }),
        supabase
          .from("excuse_requests")
          .select("*")
          .eq("student_id", authUserId)
          .order("created_at", { ascending: false }),
        supabase
          .from("attendance_logs")
          .select("*, events(title, event_date, start_time, end_time)")
          .eq("student_id", authUserId)
          .order("scanned_at", { ascending: false }),
      ]);

      if (finesResult.error) {
        console.error(finesResult.error);
      }

      if (excuseResult.error) {
        console.error(excuseResult.error);
      }

      if (attendanceResult.error) {
        console.error(attendanceResult.error);
      }

      if (cancelled) {
        return;
      }

      setFines(
        (finesResult.data ?? []).map((row: any) => ({
          id: String(row.id),
          eventId: row.event_id,
          eventTitle: row.events?.title ?? "Event",
          eventDate: row.events?.event_date ?? "",
          amount: Number(row.amount || 0),
          status: row.status || "unpaid",
        })),
      );

      setExcuseRequests(
        (excuseResult.data ?? []).map((row: any) => ({
          id: String(row.id),
          studentName: "You",
          studentId: authUserId,
          event: row.fine_id ? "Attendance event" : "Excuse request",
          date: row.created_at,
          reason: row.reason,
          proofName: row.document_url ? "Supporting document" : null,
          status: row.status,
          submittedDate: new Date(row.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
        })),
      );

      setAttendanceRecords(
        (attendanceResult.data ?? []).map((row: any, index: number) => ({
          id: String(row.id ?? index),
          eventId: row.event_id,
          event: row.events?.title ?? "Event",
          date: row.events?.event_date ?? "",
          time:
            row.events?.start_time && row.events?.end_time
              ? `${row.events.start_time}–${row.events.end_time}`
              : "—",
          status: row.status || "present",
        })),
      );
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  const handleSubmitExcuse = async (record: ExcuseRequest) => {
    if (!authUserId) {
      return;
    }

    const { error } = await supabase.from("excuse_requests").insert({
      student_id: authUserId,
      reason: record.reason,
      status: "pending",
      document_url: record.proofName,
    });

    if (error) {
      console.error(error);
      return;
    }

    router.refresh();
  };

  return (
    <AttendanceHistoryPage
      excuseRequests={excuseRequests}
      fines={fines}
      showFees={true}
      onSubmitExcuse={handleSubmitExcuse}
      onBack={() => router.push("/dashboard")}
      attendanceRecords={attendanceRecords}
    />
  );
}
