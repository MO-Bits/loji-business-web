"use client";

import { useSyncExternalStore } from "react";

function subscribe(onStatusChange: () => void) {
  window.addEventListener("online", onStatusChange);
  window.addEventListener("offline", onStatusChange);

  return () => {
    window.removeEventListener("online", onStatusChange);
    window.removeEventListener("offline", onStatusChange);
  };
}

function getSnapshot() {
  return window.navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

export function useOnlineStatus() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
