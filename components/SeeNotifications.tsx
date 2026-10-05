"use client";

import { useEffect, useRef } from "react";
import { markNotificationsSeen } from "@/app/actions/activity";

export function SeeNotifications() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void markNotificationsSeen();
  }, []);

  return null;
}
