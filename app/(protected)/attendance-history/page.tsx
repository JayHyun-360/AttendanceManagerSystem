"use client";

import {
  AttendanceHistoryPage,
  type ExcuseRequest,
  type FineRecord,
} from "../../page";

const emptyExcuseRequests: ExcuseRequest[] = [];
const emptyFines: FineRecord[] = [];

export default function AttendanceHistoryRoutePage() {
  return (
    <AttendanceHistoryPage
      excuseRequests={emptyExcuseRequests}
      fines={emptyFines}
      showFees={true}
      onSubmitExcuse={(record: ExcuseRequest) => undefined}
      onBack={() => undefined}
    />
  );
}
