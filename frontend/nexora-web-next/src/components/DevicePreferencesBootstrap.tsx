"use client";

import { useEffect } from "react";
import {
  applyDevicePreferenceAttributes,
  readStoredDevicePreferencesSnapshot,
  subscribeDevicePreferences,
} from "../lib/device-preferences";

export function DevicePreferencesBootstrap() {
  useEffect(() => {
    applyDevicePreferenceAttributes(readStoredDevicePreferencesSnapshot());
    return subscribeDevicePreferences(() => {
      applyDevicePreferenceAttributes(readStoredDevicePreferencesSnapshot());
    });
  }, []);

  return null;
}
