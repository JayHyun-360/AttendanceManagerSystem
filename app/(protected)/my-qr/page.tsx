"use client";

import { MyQRPage } from "../../page";
import { useProtectedUser } from "../layout";

export default function MyQRRoutePage() {
  const { user } = useProtectedUser();

  if (!user) {
    return null;
  }

  return <MyQRPage user={user} qrVersion={1} onBack={() => undefined} />;
}
