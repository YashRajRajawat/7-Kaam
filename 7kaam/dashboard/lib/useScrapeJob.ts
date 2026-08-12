'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ScrapeJob } from '@/types';

const TERMINAL: ScrapeJob['status'][] = ['completed', 'stopped', 'failed'];

/**
 * Track the backend's scrape job and refresh the business queries when a run
 * ends.
 *
 * This deliberately lives outside the scrape dialog. If the polling and the
 * cache invalidation were owned by the dialog, closing it mid-run — which is
 * the natural thing to do during a run that takes minutes — would unmount the
 * query, stop the polling, and leave the directory showing stale counts until
 * the user reloaded by hand. Any page that displays businesses calls this hook
 * instead, so the refresh happens wherever the user happens to be.
 *
 * Invalidation fires on every terminal status, not just 'completed': a stopped
 * or failed run has still checkpointed whatever it collected before it ended,
 * and those records belong on screen.
 */
export function useScrapeJob() {
  const qc = useQueryClient();
  const previousStatus = useRef<ScrapeJob['status'] | null>(null);

  const query = useQuery<ScrapeJob>({
    queryKey: ['businesses', 'scrape-status'],
    queryFn: () => api.get('/businesses/scrape/status').then(r => r.data),
    // Poll tightly while a run is in flight. Keep a slow idle poll so a scrape
    // started elsewhere — by another admin, or directly against the API — is
    // still picked up by a page that was already open.
    refetchInterval: q => (q.state.data?.status === 'running' ? 2000 : 15000),
    refetchOnWindowFocus: true,
  });

  const status = query.data?.status ?? null;
  const finishedAt = query.data?.finishedAt ?? null;

  useEffect(() => {
    const previous = previousStatus.current;
    previousStatus.current = status;

    // Only react to a real running -> finished transition. Without this guard,
    // mounting the hook after an old completed run would invalidate on every
    // page visit for no reason.
    if (previous === 'running' && status && TERMINAL.includes(status)) {
      qc.invalidateQueries({ queryKey: ['businesses'] });
    }
  }, [status, finishedAt, qc]);

  return {
    job: query.data,
    isRunning: status === 'running',
  };
}
