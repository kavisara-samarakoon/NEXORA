"use client";

import { useEffect } from "react";
import { readCurrentUser } from "@/lib/auth-client";

export default function AuthSessionBootstrap() {
  useEffect(() => {
    void readCurrentUser().catch(() => {
      // AuthStatus and protected feature surfaces report service availability.
    });
  }, []);

  return null;
}
