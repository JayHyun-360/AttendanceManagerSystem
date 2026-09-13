"use client";

import { useRouter } from "next/navigation";
import { LoginPage } from "../page";

export default function LoginRoute() {
  const router = useRouter();

  return <LoginPage onBack={() => router.push("/")} />;
}
