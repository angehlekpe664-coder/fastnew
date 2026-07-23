import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch } from "@/lib/api";
import { supabase, isConfigured } from "@/lib/supabase";

export type FailureRow = {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
  filiere: string;
  code_tp: string;
  motif: string;
  created_at: string;
  fichier?: string | null;
};

type FailuresResponse = {
  items: FailureRow[];
  meta: { totalToday: number; limit: number; since: string | null };
};

export type LiveStatus = "loading" | "live" | "polling" | "paused" | "error";

const MAX_ROWS = 200;
const POLL_FALLBACK_MS = 6_000;

function matchesQuery(row: FailureRow, q: string): boolean {
  if (!q.trim()) return true;
  const hay = `${row.nom} ${row.prenom} ${row.matricule} ${row.motif} ${row.code_tp} ${row.filiere}`.toLowerCase();
  return hay.includes(q.trim().toLowerCase());
}

function mergeRows(existing: FailureRow[], incoming: FailureRow[]): FailureRow[] {
  const map = new Map<string, FailureRow>();
  for (const row of [...incoming, ...existing]) {
    map.set(row.id, row);
  }
  return [...map.values()]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, MAX_ROWS);
}

export function useFailuresFeed(search: string, liveEnabled = true) {
  const [rows, setRows] = useState<FailureRow[]>([]);
  const [totalToday, setTotalToday] = useState(0);
  const [status, setStatus] = useState<LiveStatus>("loading");
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  const rowsRef = useRef<FailureRow[]>([]);
  const searchRef = useRef(search);
  const liveRef = useRef(liveEnabled);
  const realtimeOkRef = useRef(false);

  searchRef.current = search;
  liveRef.current = liveEnabled;
  rowsRef.current = rows;

  const markNew = useCallback((id: string) => {
    setNewIds((prev) => new Set(prev).add(id));
    window.setTimeout(() => {
      setNewIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 5000);
  }, []);

  const applyIncoming = useCallback(
    (incoming: FailureRow[], replace = false) => {
      if (!incoming.length && replace) {
        setRows([]);
        rowsRef.current = [];
        return;
      }
      if (!incoming.length) return;

      setRows((prev) => {
        const next = replace ? incoming : mergeRows(prev, incoming);
        if (!replace) {
          const prevIds = new Set(prev.map((r) => r.id));
          for (const row of incoming) {
            if (!prevIds.has(row.id)) markNew(row.id);
          }
        }
        rowsRef.current = next;
        return next;
      });
    },
    [markNew]
  );

  const fetchFailures = useCallback(async (opts?: { since?: string; replace?: boolean }) => {
    const q = searchRef.current.trim();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (opts?.since) params.set("since", opts.since);
    params.set("limit", String(MAX_ROWS));

    const data = await adminFetch<FailuresResponse>(`/api/admin/failures?${params}`);
    setTotalToday(data.meta.totalToday);
    applyIncoming(data.items, opts?.replace ?? !opts?.since);
    setError("");
    return data.items;
  }, [applyIncoming]);

  const pollNew = useCallback(async () => {
    if (!liveRef.current) return;
    const latest = rowsRef.current[0]?.created_at;
    if (!latest) return;
    try {
      await fetchFailures({ since: latest });
    } catch {
      /* ignore transient poll errors */
    }
  }, [fetchFailures]);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError("");

    fetchFailures({ replace: true })
      .then(() => {
        if (!cancelled) setStatus(liveEnabled ? "polling" : "paused");
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Impossible de charger les rejets.");
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [search, liveEnabled, fetchFailures]);

  useEffect(() => {
    if (!liveEnabled || !isConfigured()) {
      setStatus((s) => (s === "loading" ? s : liveEnabled ? "polling" : "paused"));
      return;
    }

    const channel = supabase
      .channel("admin-failures-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "failed_verifications" },
        (payload) => {
          if (!liveRef.current) return;
          const row = payload.new as FailureRow;
          if (!matchesQuery(row, searchRef.current)) return;

          setRows((prev) => {
            if (prev.some((r) => r.id === row.id)) return prev;
            const next = mergeRows(prev, [row]);
            rowsRef.current = next;
            return next;
          });
          markNew(row.id);
          setTotalToday((n) => n + 1);
        }
      )
      .subscribe((state) => {
        if (state === "SUBSCRIBED") {
          realtimeOkRef.current = true;
          if (liveRef.current) setStatus("live");
        } else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") {
          realtimeOkRef.current = false;
          if (liveRef.current) setStatus("polling");
        }
      });

    return () => {
      realtimeOkRef.current = false;
      void supabase.removeChannel(channel);
    };
  }, [liveEnabled, markNew]);

  useEffect(() => {
    if (!liveEnabled) {
      setStatus("paused");
      return;
    }

    const id = window.setInterval(() => void pollNew(), POLL_FALLBACK_MS);
    return () => window.clearInterval(id);
  }, [liveEnabled, pollNew]);

  const refresh = useCallback(async () => {
    setStatus("loading");
    try {
      await fetchFailures({ replace: true });
      setStatus(liveEnabled ? (realtimeOkRef.current ? "live" : "polling") : "paused");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setStatus("error");
    }
  }, [fetchFailures, liveEnabled]);

  return { rows, totalToday, status, newIds, error, refresh };
}
