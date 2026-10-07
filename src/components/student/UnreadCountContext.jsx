"use client";

import { createContext, useContext, useState } from "react";

// Shares the notifications unread count between StudentHeader (the bell
// badge, mounted once in StudentShellClient) and NotificationsList (mounted
// per-page, deep inside `children`) — they're siblings in the component
// tree, not parent/child, so a plain prop/callback can't connect them.
// Initialized from the same server-fetched value StudentShell already
// passes down; only ever updated from a Server Action's confirmed return
// value, never guessed client-side.
const UnreadCountContext = createContext(null);

export function UnreadCountProvider({ initialCount, children }) {
  const [unreadCount, setUnreadCount] = useState(initialCount);
  return (
    <UnreadCountContext.Provider value={{ unreadCount, setUnreadCount }}>
      {children}
    </UnreadCountContext.Provider>
  );
}

export function useUnreadCount() {
  const ctx = useContext(UnreadCountContext);
  if (!ctx) {
    throw new Error("useUnreadCount must be used within a UnreadCountProvider");
  }
  return ctx;
}
