"use client";

import { MyFinesPage, type FineRecord } from "../../page";

const emptyFines: FineRecord[] = [];

export default function MyFinesRoutePage() {
  return (
    <MyFinesPage fines={emptyFines} showFees={true} onBack={() => undefined} />
  );
}
