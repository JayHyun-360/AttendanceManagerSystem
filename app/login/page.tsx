"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoginPage } from "../page";

export default function LoginRoute() {
  const router = useRouter();
  const [adminAccessError, setAdminAccessError] = useState<string | null>(null);

  return (
    <LoginPage
      onLogin={(role) => {
        setAdminAccessError(null);
        if (role === "admin") {
          router.push("/admin-dashboard?freshLogin=1");
        } else {
          router.push("/dashboard?freshLogin=1");
        }
      }}
      onBack={() => router.push("/")}
      adminAccessError={adminAccessError}
      onRoleSelect={() => {
        setAdminAccessError(null);
      }}
      onGoogleLogin={() => {
        setAdminAccessError(null);
      }}
    />
  );
}
