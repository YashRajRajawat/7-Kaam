'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { DashboardShell } from '@/components/layout/DashboardShell';
import type {
  Business, BusinessListResponse, BusinessStats, BusinessFilters, ScrapeJob,
} from '@/types';
import { cn, formatDate } from '@/lib/utils';
import { useScrapeJob } from '@/lib/useScrapeJob';
import {
  Store, Search, Filter, ChevronLeft, ChevronRight, MapPin, Phone, Globe,
  Star, Clock, RefreshCcw, Download, X, ExternalLink, AlertTriangle,
  Radar, Loader2, CheckCircle2, XCircle, Square,
} from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'recent',  label: 'Most Recently Collected' },
  { value: 'name',    label: 'Name (A–Z)' },
  { value: 'rating',  label: 'Highest Rated' },
  { value: 'reviews', label: 'Most Reviewed' },
];

const PAGE_SIZE = 12;

/** Categories offered in the scrape dialog — mirrors business_scraper/config.yaml. */
const SCRAPE_CATEGORIES = [
  'Electrician', 'Plumber', 'Mechanic', 'Painter', 'Hardware Shop', 'Tailor',
  'Welder', 'Carpenter', 'Laundry', 'Mobile Repair', 'Bike Repair', 'AC Repair',
];

const SCRAPE_AREAS = [
  'SG Palya', 'Jayanagar', 'Indiranagar', 'MG Road',
  'HSR Layout', 'Koramangala', 'Whitefield',
];

function Stars({ rating }: { rating?: number | null }) {
  if (rating == null) return <span className="text-[11px] text-[#767586]">No rating</span>;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#191c1e]">
      <Star size={12} className="text-amber-500 fill-amber-500" />
      {rating.toFixed(1)}
    </span>
  );
}

function BusinessCard({ business, onOpen }: { business: Business; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="text-left bg-white border border-[#e0e3e5] rounded-xl p-5 shadow-sm hover:shadow-md hover:border-[#c0c1ff] transition-all flex flex-col gap-3 w-full"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-[#191c1e] truncate">{business.name}</h3>
          <p className="text-[11px] text-[#4648d4] font-semibold mt-0.5 truncate">{business.category}</p>
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          <Stars rating={business.rating} />
          {business.reviewCount != null && (
            <span className="text-[10px] text-[#767586]">{business.reviewCount} reviews</span>
          )}
        </div>
      </div>

      {business.address && (
        <p className="text-[11px] text-[#565e74] flex items-start gap-1.5 leading-relaxed">
          <MapPin size={12} className="text-[#767586] flex-shrink-0 mt-0.5" />
          <span className="line-clamp-2">{business.address}</span>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-2 border-t border-[#f2f4f6]">
        {business.phoneNumber ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Phone size={10} /> {business.phoneNumber}
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f2f4f6] text-[#767586] border border-[#e0e3e5]">
            No phone
          </span>
        )}
        {business.website && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Globe size={10} /> Website
          </span>
        )}
        {business.area && (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#e1e0ff] text-[#4648d4] border border-[#c0c1ff] truncate max-w-[140px]">
            {business.area}
          </span>
        )}
      </div>
    </button>
  );
}

/** Close on Escape — expected of any modal, and the only exit for keyboard users. */
function useEscapeToClose(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
}

function BusinessDetailModal({ business, onClose }: { business: Business; onClose: () => void }) {
  useEscapeToClose(onClose);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#e0e3e5] rounded-xl w-full max-w-2xl shadow-xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-6 border-b border-[#f2f4f6] sticky top-0 bg-white rounded-t-xl">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-[#191c1e]">{business.name}</h3>
            <p className="text-xs text-[#4648d4] font-semibold mt-1">{business.category}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#f2f4f6] hover:bg-[#e6e8ea] text-[#565e74] transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Rating', value: business.rating != null ? business.rating.toFixed(1) : '—' },
              { label: 'Reviews', value: business.reviewCount ?? '—' },
              { label: 'Status', value: business.status },
              { label: 'Pincode', value: business.pincode ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#f7f9fb] border border-[#e0e3e5] rounded-xl px-3 py-2.5">
                <p className="text-[10px] font-bold text-[#767586] uppercase tracking-wider">{label}</p>
                <p className="text-sm font-black text-[#191c1e] mt-0.5 truncate">{value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2.5 text-xs">
            {business.address && (
              <div className="flex items-start gap-2.5">
                <MapPin size={14} className="text-[#4648d4] flex-shrink-0 mt-0.5" />
                <span className="text-[#565e74]">{business.address}</span>
              </div>
            )}
            {business.phoneNumber && (
              <div className="flex items-center gap-2.5">
                <Phone size={14} className="text-[#4648d4] flex-shrink-0" />
                <a href={`tel:${business.phoneNumber}`} className="text-[#565e74] hover:text-[#4648d4] font-semibold">
                  {business.phoneNumber}
                </a>
              </div>
            )}
            {business.website && (
              <div className="flex items-center gap-2.5 min-w-0">
                <Globe size={14} className="text-[#4648d4] flex-shrink-0" />
                <a
                  href={business.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#4648d4] hover:underline truncate"
                >
                  {business.website}
                </a>
              </div>
            )}
            {business.latitude != null && business.longitude != null && (
              <div className="flex items-center gap-2.5">
                <Radar size={14} className="text-[#4648d4] flex-shrink-0" />
                <span className="text-[#565e74]">
                  {business.latitude.toFixed(6)}, {business.longitude.toFixed(6)}
                </span>
              </div>
            )}
          </div>

          {business.description && (
            <div className="bg-[#f7f9fb] border border-[#e0e3e5] rounded-xl p-4">
              <p className="text-xs text-[#565e74] leading-relaxed">{business.description}</p>
            </div>
          )}

          {business.openingHoursList.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-[#191c1e] flex items-center gap-2 mb-2.5">
                <Clock size={14} className="text-[#4648d4]" />
                Opening Hours
              </h4>
              <div className="bg-[#f7f9fb] border border-[#e0e3e5] rounded-xl divide-y divide-[#e0e3e5]">
                {business.openingHoursList.map(({ day, hours }) => (
                  <div key={day} className="flex items-center justify-between px-4 py-2 text-xs">
                    <span className="font-semibold text-[#191c1e]">{day}</span>
                    <span className="text-[#565e74]">{hours}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {business.services.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {business.services.map(s => (
                <span key={s} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#e1e0ff] text-[#4648d4] border border-[#c0c1ff]">
                  {s}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#f2f4f6]">
            <p className="text-[11px] text-[#767586]">
              Collected {formatDate(business.collectedAt)} · source: {business.source}
            </p>
            {business.sourceUrl && (
              <a
                href={business.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f2f4f6] hover:bg-[#e1e0ff] hover:text-[#4648d4] text-[#565e74] text-[11px] font-bold transition-all"
              >
                <ExternalLink size={12} />
                View Source
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The job is polled by the page, not by this dialog, so closing the dialog
 * mid-run does not stop the status updates or the post-run refresh.
 */
function ScrapeDialog({ job, running, onClose }: {
  job?: ScrapeJob;
  running: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [city, setCity] = useState('Bangalore');
  const [areas, setAreas] = useState<string[]>(['Jayanagar']);
  const [categories, setCategories] = useState<string[]>(['Electrician']);
  const [customArea, setCustomArea] = useState('');

  useEscapeToClose(onClose);

  const start = useMutation({
    mutationFn: () => api.post('/businesses/scrape', { city, areas, categories, site: 'google_maps', headless: true }),
    onSuccess: () => {
      toast.success('Scrape started — this can take several minutes.');
      qc.invalidateQueries({ queryKey: ['businesses', 'scrape-status'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Could not start the scrape.');
    },
  });

  const stop = useMutation({
    mutationFn: () => api.post('/businesses/scrape/stop'),
    onSuccess: () => {
      toast('Stop requested.');
      qc.invalidateQueries({ queryKey: ['businesses', 'scrape-status'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Could not stop the scrape.'),
  });

  // Functional updates: several chips clicked before React re-renders must all
  // register, rather than each one overwriting the previous from a stale list.
  function toggle(setList: React.Dispatch<React.SetStateAction<string[]>>, value: string) {
    setList(prev => (prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]));
  }

  function addCustomArea() {
    const value = customArea.trim();
    if (!value) return;
    setAreas(prev => (prev.includes(value) ? prev : [...prev, value]));
    setCustomArea('');
  }

  const taskCount = areas.length * categories.length;
  const tooMany = taskCount > 60;
  const canStart = !running && areas.length > 0 && categories.length > 0 && city.trim().length > 0 && !tooMany;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white border border-[#e0e3e5] rounded-xl w-full max-w-2xl shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 p-6 border-b border-[#f2f4f6] sticky top-0 bg-white rounded-t-xl">
          <div>
            <h3 className="text-base font-bold text-[#191c1e] flex items-center gap-2">
              <Radar size={18} className="text-[#4648d4]" />
              Collect Business Data
            </h3>
            <p className="text-xs text-[#565e74] mt-1">
              Runs the Google Maps scraper. New businesses are saved and appear here automatically.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#f2f4f6] hover:bg-[#e6e8ea] text-[#565e74] transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label htmlFor="scrape-city" className="block text-xs font-bold text-[#565e74] mb-1.5">City</label>
            <input
              id="scrape-city"
              value={city}
              onChange={e => setCity(e.target.value)}
              disabled={running}
              className="w-full px-3.5 py-2 rounded-xl bg-[#f8f9fa] border border-[#e0e3e5] text-xs text-[#191c1e] focus:outline-none focus:border-[#4648d4] disabled:opacity-50"
            />
          </div>

          <div>
            <p className="text-xs font-bold text-[#565e74] mb-2">Areas ({areas.length} selected)</p>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {Array.from(new Set([...SCRAPE_AREAS, ...areas])).map(a => (
                <button
                  key={a}
                  onClick={() => toggle(setAreas, a)}
                  disabled={running}
                  aria-pressed={areas.includes(a)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all disabled:opacity-50',
                    areas.includes(a)
                      ? 'bg-[#4648d4] text-white border-[#4648d4]'
                      : 'bg-[#f2f4f6] text-[#565e74] border-[#e0e3e5] hover:border-[#c0c1ff]'
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={customArea}
                onChange={e => setCustomArea(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomArea(); } }}
                placeholder="Add another area..."
                disabled={running}
                className="flex-1 px-3.5 py-2 rounded-xl bg-[#f8f9fa] border border-[#e0e3e5] text-xs text-[#191c1e] placeholder:text-[#767586] focus:outline-none focus:border-[#4648d4] disabled:opacity-50"
              />
              <button
                onClick={addCustomArea}
                disabled={running || !customArea.trim()}
                className="px-4 py-2 rounded-xl bg-[#f2f4f6] hover:bg-[#e6e8ea] text-[#191c1e] text-xs font-bold transition-colors disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-[#565e74] mb-2">Categories ({categories.length} selected)</p>
            <div className="flex flex-wrap gap-1.5">
              {SCRAPE_CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => toggle(setCategories, c)}
                  disabled={running}
                  aria-pressed={categories.includes(c)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all disabled:opacity-50',
                    categories.includes(c)
                      ? 'bg-[#4648d4] text-white border-[#4648d4]'
                      : 'bg-[#f2f4f6] text-[#565e74] border-[#e0e3e5] hover:border-[#c0c1ff]'
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className={cn(
            'rounded-xl px-4 py-3 text-xs border',
            tooMany
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-[#f7f9fb] border-[#e0e3e5] text-[#565e74]'
          )}>
            {tooMany ? (
              <span className="flex items-center gap-2 font-semibold">
                <AlertTriangle size={14} />
                {taskCount} searches is too many — narrow this to 60 or fewer.
              </span>
            ) : (
              <>This run performs <b className="text-[#191c1e]">{taskCount}</b> search{taskCount === 1 ? '' : 'es'} (areas × categories). Expect roughly a minute each.</>
            )}
          </div>

          {job && job.status !== 'idle' && (
            <div className="border border-[#e0e3e5] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#f7f9fb] border-b border-[#e0e3e5]">
                <span className="flex items-center gap-2 text-xs font-bold text-[#191c1e]">
                  {job.status === 'running' && <Loader2 size={13} className="animate-spin text-[#4648d4]" />}
                  {job.status === 'completed' && <CheckCircle2 size={13} className="text-emerald-600" />}
                  {job.status === 'stopped' && <Square size={13} className="text-amber-600" />}
                  {job.status === 'failed' && <XCircle size={13} className="text-red-600" />}
                  {{
                    running: 'Scraping…',
                    completed: 'Completed',
                    stopped: 'Stopped',
                    failed: 'Failed',
                  }[job.status] ?? job.status}
                </span>
                {job.recordsAfter != null && (
                  <span className="text-[11px] text-[#565e74] font-semibold">
                    {Math.max(0, job.recordsAfter - (job.recordsBefore ?? 0))} new · {job.recordsAfter} total
                  </span>
                )}
              </div>
              <pre className="text-[10px] leading-relaxed text-[#565e74] bg-white px-4 py-3 max-h-40 overflow-y-auto whitespace-pre-wrap">
                {(job.log ?? []).join('\n') || 'Waiting for output…'}
              </pre>
              {job.error && (
                <p className="text-[11px] text-red-700 bg-red-50 border-t border-red-200 px-4 py-2">{job.error}</p>
              )}
            </div>
          )}

          <div className="flex gap-2.5 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-[#f2f4f6] hover:bg-[#e6e8ea] text-[#191c1e] text-xs font-bold transition-colors"
            >
              Close
            </button>
            {running ? (
              <button
                onClick={() => stop.mutate()}
                disabled={stop.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Square size={13} />
                Stop Scrape
              </button>
            ) : (
              <button
                onClick={() => start.mutate()}
                disabled={!canStart || start.isPending}
                className="flex-1 py-2.5 rounded-xl bg-[#4648d4] hover:bg-[#3738b8] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Radar size={13} />
                {start.isPending ? 'Starting…' : 'Start Scrape'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BusinessesPage() {
  const qc = useQueryClient();

  // Owned by the page, not the dialog, so a run keeps reporting progress and
  // still refreshes this list even if the user closes the dialog mid-scrape.
  const { job, isRunning } = useScrapeJob();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [area, setArea] = useState('');
  const [sort, setSort] = useState('recent');
  const [hasPhone, setHasPhone] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Business | null>(null);
  const [showScrape, setShowScrape] = useState(false);

  // Debounce typing so each keystroke does not fire a request.
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<BusinessListResponse>({
    queryKey: ['businesses', 'list', search, category, area, sort, hasPhone, page],
    queryFn: () =>
      api.get('/businesses', {
        params: { search, category, area, sort, hasPhone: hasPhone || undefined, page, limit: PAGE_SIZE },
      }).then(r => r.data),
    placeholderData: prev => prev,
  });

  const { data: stats } = useQuery<BusinessStats>({
    queryKey: ['businesses', 'stats'],
    queryFn: () => api.get('/businesses/stats').then(r => r.data),
  });

  const { data: filters } = useQuery<BusinessFilters>({
    queryKey: ['businesses', 'filters'],
    queryFn: () => api.get('/businesses/filters').then(r => r.data),
  });

  const refresh = useMutation({
    mutationFn: () => api.post('/businesses/refresh'),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['businesses'] });
      toast.success(`Reloaded ${res.data.total} businesses from disk.`);
    },
    onError: () => toast.error('Could not reload business data.'),
  });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const hasAnyData = (data?.totalAvailable ?? 0) > 0;
  const filtersActive = Boolean(search || category || area || hasPhone);

  function clearFilters() {
    setSearchInput(''); setSearch(''); setCategory(''); setArea(''); setHasPhone(false); setPage(1);
  }

  function exportCsv() {
    const rows = data?.data ?? [];
    if (!rows.length) { toast.error('Nothing to export on this page.'); return; }

    const cols = ['name', 'category', 'phoneNumber', 'address', 'area', 'pincode', 'rating', 'reviewCount', 'website', 'sourceUrl'] as const;
    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [cols.join(','), ...rows.map(r => cols.map(c => escape(r[c])).join(','))].join('\n');

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `businesses_page_${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const summaryTiles = useMemo(() => ([
    { label: 'Total Collected', value: stats?.total ?? '—' },
    { label: 'With Phone', value: stats?.withPhone ?? '—' },
    { label: 'Categories', value: stats?.categoryCount ?? '—' },
    { label: 'Avg Rating', value: stats?.averageRating != null ? `${stats.averageRating}★` : '—' },
  ]), [stats]);

  return (
    <DashboardShell>
      <div className="max-w-7xl mx-auto space-y-6 fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e0e3e5] rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4648d4] flex items-center justify-center text-white shadow-sm">
              <Store size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#191c1e] tracking-tight">Local Business Directory</h2>
              <p className="text-xs text-[#565e74]">
                {stats?.total ?? 0} businesses collected
                {stats?.latestCollectedAt && ` · last collected ${formatDate(stats.latestCollectedAt)}`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f2f4f6] hover:bg-[#e6e8ea] text-[#191c1e] text-xs font-bold border border-[#e0e3e5] transition-all"
            >
              <Download size={15} />
              Export Page
            </button>
            <button
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f2f4f6] hover:bg-[#e6e8ea] text-[#191c1e] text-xs font-bold border border-[#e0e3e5] transition-all disabled:opacity-50"
            >
              <RefreshCcw size={15} className={cn((refresh.isPending || isFetching) && 'animate-spin')} />
              Reload
            </button>
            <button
              onClick={() => setShowScrape(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4648d4] hover:bg-[#3738b8] text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98]"
            >
              <Radar size={15} />
              Collect Data
            </button>
          </div>
        </div>

        {/* Summary tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {summaryTiles.map(({ label, value }) => (
            <div key={label} className="bg-white border border-[#e0e3e5] rounded-xl px-4 py-3 shadow-sm">
              <p className="text-[10px] font-bold text-[#767586] uppercase tracking-wider">{label}</p>
              <p className="text-xl font-black text-[#191c1e] mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {/* A run in progress stays visible after the dialog is closed. */}
        {isRunning && (
          <button
            onClick={() => setShowScrape(true)}
            className="w-full flex flex-wrap items-center justify-between gap-3 bg-[#e1e0ff] border border-[#c0c1ff] rounded-xl px-5 py-3.5 text-left hover:bg-[#d6d5ff] transition-colors"
          >
            <span className="flex items-center gap-2.5 text-xs font-bold text-[#4648d4]">
              <Loader2 size={15} className="animate-spin" />
              Collecting businesses
              {job?.params && ` — ${job.params.categories.join(', ')} in ${job.params.areas.join(', ')}`}
            </span>
            <span className="text-[11px] text-[#4648d4] font-bold">
              View progress →
            </span>
          </button>
        )}

        {/* Warnings from the loader (corrupt/missing files) */}
        {data?.warnings && data.warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-bold text-amber-800 flex items-center gap-2">
              <AlertTriangle size={14} />
              Some scraped files could not be read
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {data.warnings.map(w => (
                <li key={w} className="text-[11px] text-amber-700">• {w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white border border-[#e0e3e5] rounded-xl p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#767586]" />
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search name, category, address, phone..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#f2f4f6] border border-[#e0e3e5] text-xs text-[#191c1e] placeholder:text-[#767586] focus:outline-none focus:border-[#4648d4] transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Filter size={14} className="text-[#767586] hidden sm:block" />

              <select
                value={category}
                onChange={e => { setCategory(e.target.value); setPage(1); }}
                className="px-3 py-2 rounded-xl bg-[#f2f4f6] border border-[#e0e3e5] text-xs text-[#191c1e] focus:outline-none focus:border-[#4648d4] cursor-pointer max-w-[190px]"
              >
                <option value="">All Categories</option>
                {(filters?.categories ?? []).map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select
                value={area}
                onChange={e => { setArea(e.target.value); setPage(1); }}
                className="px-3 py-2 rounded-xl bg-[#f2f4f6] border border-[#e0e3e5] text-xs text-[#191c1e] focus:outline-none focus:border-[#4648d4] cursor-pointer max-w-[190px]"
              >
                <option value="">All Areas</option>
                {(filters?.areas ?? []).map(a => <option key={a} value={a}>{a}</option>)}
              </select>

              <select
                value={sort}
                onChange={e => { setSort(e.target.value); setPage(1); }}
                className="px-3 py-2 rounded-xl bg-[#f2f4f6] border border-[#e0e3e5] text-xs text-[#191c1e] focus:outline-none focus:border-[#4648d4] cursor-pointer"
              >
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>

              <button
                onClick={() => { setHasPhone(v => !v); setPage(1); }}
                aria-pressed={hasPhone}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-bold border transition-all',
                  hasPhone
                    ? 'bg-[#4648d4] text-white border-[#4648d4]'
                    : 'bg-[#f2f4f6] text-[#565e74] border-[#e0e3e5] hover:border-[#c0c1ff]'
                )}
              >
                Has Phone
              </button>

              {filtersActive && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 rounded-xl bg-[#f2f4f6] hover:bg-[#e6e8ea] text-[#565e74] text-xs font-bold border border-[#e0e3e5] transition-all"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        {isError ? (
          <div className="bg-white border border-[#e0e3e5] rounded-xl p-12 text-center shadow-sm">
            <XCircle size={32} className="mx-auto text-red-500 mb-3" />
            <p className="text-sm font-bold text-[#191c1e]">Could not load business data</p>
            <p className="text-xs text-[#565e74] mt-1.5">
              {(error as any)?.response?.data?.error || (error as Error)?.message || 'The API did not respond.'}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-5 py-2.5 rounded-xl bg-[#4648d4] hover:bg-[#3738b8] text-white text-xs font-bold transition-all"
            >
              Try Again
            </button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white border border-[#e0e3e5] rounded-xl p-5 shadow-sm animate-pulse space-y-3">
                <div className="h-3.5 bg-[#f2f4f6] rounded w-2/3" />
                <div className="h-2.5 bg-[#f2f4f6] rounded w-1/3" />
                <div className="h-2.5 bg-[#f2f4f6] rounded w-full" />
                <div className="h-2.5 bg-[#f2f4f6] rounded w-4/5" />
              </div>
            ))}
          </div>
        ) : (data?.data.length ?? 0) === 0 ? (
          <div className="bg-white border border-[#e0e3e5] rounded-xl p-12 text-center shadow-sm">
            <Store size={32} className="mx-auto text-[#767586] mb-3" />
            {hasAnyData ? (
              <>
                <p className="text-sm font-bold text-[#191c1e]">No businesses match these filters</p>
                <p className="text-xs text-[#565e74] mt-1.5">
                  {data?.totalAvailable} businesses are stored. Try widening your search.
                </p>
                <button
                  onClick={clearFilters}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-[#f2f4f6] hover:bg-[#e6e8ea] text-[#191c1e] text-xs font-bold transition-all"
                >
                  Clear Filters
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-[#191c1e]">No business data collected yet</p>
                <p className="text-xs text-[#565e74] mt-1.5 max-w-md mx-auto">
                  Run the collector to gather local businesses from Google Maps. Results are saved to disk and
                  appear here — and on the Overview page — automatically.
                </p>
                <button
                  onClick={() => setShowScrape(true)}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4648d4] hover:bg-[#3738b8] text-white text-xs font-bold transition-all"
                >
                  <Radar size={15} />
                  Collect Business Data
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {data!.data.map(b => (
                <BusinessCard key={b.id} business={b} onOpen={() => setSelected(b)} />
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-[#e0e3e5] rounded-xl px-6 py-4 shadow-sm">
              <p className="text-xs text-[#767586]">
                Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, data!.total)} of {data!.total}
                {filtersActive && ` (filtered from ${data!.totalAvailable})`}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-xl bg-white border border-[#e0e3e5] hover:bg-[#f2f4f6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} className="text-[#191c1e]" />
                </button>
                <span className="px-3 py-1 text-xs font-bold text-[#191c1e]">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-xl bg-white border border-[#e0e3e5] hover:bg-[#f2f4f6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight size={14} className="text-[#191c1e]" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {selected && <BusinessDetailModal business={selected} onClose={() => setSelected(null)} />}
      {showScrape && (
        <ScrapeDialog job={job} running={isRunning} onClose={() => setShowScrape(false)} />
      )}
    </DashboardShell>
  );
}
