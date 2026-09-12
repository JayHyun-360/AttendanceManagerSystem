"use client";

import { useRouter } from "next/navigation";
import { MyQRPage } from "../../page";
import { useProtectedUser } from "../layout";

export default function MyQRRoutePage() {
  const router = useRouter();
  const { user } = useProtectedUser();

  if (!user) {
    return null;
  }

  return (
    <MyQRPage
      user={user}
      qrVersion={1}
      onBack={() => router.push("/dashboard")}
    />
  );
}
