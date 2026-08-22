"use client";

import { useEffect } from "react";
import { getCsrfToken } from "@/lib/auth";
import { readCurrentUser } from "@/lib/auth-client";

export default function AuthSessionBootstrap() {
  useEffect(() => {
    void getCsrfToken()
      .then(() => readCurrentUser())
      .catch(() => {
        // AuthStatus and protected feature surfaces report service availability.
      });
  }, []);

  return null;
}
