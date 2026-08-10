"use client";

import { useRef, useCallback } from "react";
import type { PdfFile } from "@/types";
import {
  createPrefetchController,
  type PrefetchController,
} from "@/lib/pdf/prefetch";
import { getPageTextCache, cacheKeyFor } from "@/lib/pdf/textCache";

/**
 * Manages background text-layer extraction for uploaded files. The controller
 * is created once and lives for the hook's lifetime — enqueue/yield/resume
 * are stable callbacks safe for dependency arrays.
 */
export function useTextPrefetch(): {
  enqueue: (files: PdfFile[]) => void;
  yieldToSearch: () => void;
  resume: () => void;
  drop: (fileId: string) => void;
  reset: () => void;
} {
  const ctrlRef = useRef<PrefetchController | null>(null);

  function getCtrl(): PrefetchController {
    if (!ctrlRef.current) {
      const cache = getPageTextCache();
      ctrlRef.current = createPrefetchController({
        getCache: (f) => cache.get(cacheKeyFor(f)),
        setCache: (f, d) => cache.set(cacheKeyFor(f), d),
      });
    }
    return ctrlRef.current;
  }

  const enqueue = useCallback((files: PdfFile[]) => {
    getCtrl().enqueue(files);
  }, []);

  const yieldToSearch = useCallback(() => {
    getCtrl().yieldToSearch();
  }, []);

  const resume = useCallback(() => {
    getCtrl().resume();
  }, []);

  const drop = useCallback((fileId: string) => {
    getCtrl().drop(fileId);
  }, []);

  const reset = useCallback(() => {
    getCtrl().reset();
  }, []);

  return { enqueue, yieldToSearch, resume, drop, reset };
}
