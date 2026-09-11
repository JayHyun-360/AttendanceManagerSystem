"use client";

import { ProfilePage, type User } from "../../page";

const demoUser: User = {
  firstName: "Maria",
  middleInitial: "L",
  surname: "Santos",
  studentId: "2440014",
  program: "BSIT",
  yearLevel: "2nd Year",
  section: "IT-2A",
  phone: "09171234567",
  contactEmail: "mls.santos@tapin.edu",
  role: "student",
};

export default function ProfileRoutePage() {
  return (
    <ProfilePage
      user={demoUser}
      onSave={(user: User) => undefined}
      onBack={() => undefined}
    />
  );
}
