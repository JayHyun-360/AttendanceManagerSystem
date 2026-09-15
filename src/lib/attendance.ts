import { supabase } from "@/lib/supabase";

export type AttendanceRecordResult =
  | {
      outcome: "success";
      action: "time_in" | "time_out";
      status: "confirmed" | "late";
      recordId: string | number;
      scannedAt: Date | string;
    }
  | {
      outcome: "duplicate" | "rejected";
      action: "duplicate" | "time_out_rejected";
      status: "duplicate";
      recordId: string | number;
      scannedAt: Date | string;
      reason: "existing" | "unique_violation" | "session_not_ended";
    }
  | {
      outcome: "error";
      error: unknown;
    };

type RecordAttendanceInput = {
  eventId: string;
  studentId: string;
  sessionLabel: "morning" | "afternoon";
  status: "present" | "late";
  scannedBy: string;
  strictSession: boolean;
  canTimeOut: boolean;
  now?: Date;
};

export async function recordAttendance({
  eventId,
  studentId,
  sessionLabel,
  status,
  scannedBy,
  strictSession,
  canTimeOut,
  now = new Date(),
}: RecordAttendanceInput): Promise<AttendanceRecordResult> {
  try {
    const { data: existing, error: existingError } = await supabase
      .from("attendance_scans")
      .select("id, session_label, scan_in_at, scan_out_at, status")
      .eq("event_id", eventId)
      .eq("student_id", studentId)
      .eq("session_label", sessionLabel)
      .maybeSingle();

    if (existingError) {
      return { outcome: "error", error: existingError };
    }

    if (!existing) {
      const { data: inserted, error: insertError } = await supabase
        .from("attendance_scans")
        .insert({
          event_id: eventId,
          student_id: studentId,
          session_label: sessionLabel,
          scan_in_at: now.toISOString(),
          scan_out_at: null,
          status,
          scanned_by: scannedBy,
        })
        .select("id, scan_in_at")
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          return {
            outcome: "duplicate",
            action: "duplicate",
            status: "duplicate",
            recordId: "",
            scannedAt: now,
            reason: "unique_violation",
          };
        }

        return { outcome: "error", error: insertError };
      }

      return {
        outcome: "success",
        action: "time_in",
        status: status === "late" ? "late" : "confirmed",
        recordId: inserted.id,
        scannedAt: inserted.scan_in_at ?? now,
      };
    }

    if (existing.scan_in_at && !existing.scan_out_at) {
      if (!strictSession) {
        return {
          outcome: "duplicate",
          action: "duplicate",
          status: "duplicate",
          recordId: existing.id,
          scannedAt: existing.scan_in_at ?? now,
          reason: "existing",
        };
      }

      if (!canTimeOut) {
        return {
          outcome: "rejected",
          action: "time_out_rejected",
          status: "duplicate",
          recordId: existing.id,
          scannedAt: existing.scan_in_at ?? now,
          reason: "session_not_ended",
        };
      }

      const { error: updateError } = await supabase
        .from("attendance_scans")
        .update({
          scan_out_at: now.toISOString(),
          status: "present",
          scanned_by: scannedBy,
        })
        .eq("id", existing.id);

      if (updateError) {
        return { outcome: "error", error: updateError };
      }

      return {
        outcome: "success",
        action: "time_out",
        status: "confirmed",
        recordId: existing.id,
        scannedAt: now,
      };
    }

    if (!existing.scan_in_at && !existing.scan_out_at) {
      const { error: updateError } = await supabase
        .from("attendance_scans")
        .update({
          scan_in_at: now.toISOString(),
          status,
          scanned_by: scannedBy,
        })
        .eq("id", existing.id);

      if (updateError) {
        return { outcome: "error", error: updateError };
      }

      return {
        outcome: "success",
        action: "time_in",
        status: status === "late" ? "late" : "confirmed",
        recordId: existing.id,
        scannedAt: now,
      };
    }

    return {
      outcome: "duplicate",
      action: "duplicate",
      status: "duplicate",
      recordId: existing.id,
      scannedAt: existing.scan_in_at ?? now,
      reason: "existing",
    };
  } catch (error) {
    return { outcome: "error", error };
  }
}
