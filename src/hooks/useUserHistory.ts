"use client";

import { useState, useEffect, useCallback } from "react";
import type { UserHistory } from "@/types";
import {
  getFullHistory,
  getUserRepository,
  getOrCreateSessionId,
} from "@/lib/storage/userHistory";

export function useUserHistory() {
  const [history, setHistory] = useState<UserHistory | null>(null);
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    const sid = getOrCreateSessionId();
    setSessionId(sid);
    setHistory(getFullHistory());
  }, []);

  const refreshHistory = useCallback(() => {
    setHistory(getFullHistory());
  }, []);

  const clearHistory = useCallback(async () => {
    const repo = getUserRepository();
    await repo.clearHistory(sessionId);
    setHistory(null);
  }, [sessionId]);

  const recentUrls = history?.recentFiles.filter((f) => f.type === "url") ?? [];
  const recentSearches = history?.recentSearches ?? [];

  return {
    history,
    sessionId,
    recentUrls,
    recentSearches,
    refreshHistory,
    clearHistory,
  };
}
