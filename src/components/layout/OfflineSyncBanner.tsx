"use client";

import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

export const OfflineSyncBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="bg-amber-600/90 text-white text-xs py-1.5 px-4 flex items-center justify-center gap-2 font-medium">
      <WifiOff className="w-3.5 h-3.5 animate-bounce" />
      <span>Offline Mode Active: Submissions queued in local storage for automated sync upon reconnection.</span>
    </div>
  );
};
