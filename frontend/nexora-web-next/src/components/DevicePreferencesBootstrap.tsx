"use client";

import { useEffect } from "react";
import { subscribeDevicePreferences } from "../lib/device-preferences";

export function DevicePreferencesBootstrap() {
  useEffect(() => subscribeDevicePreferences(() => {}), []);
  return null;
}
