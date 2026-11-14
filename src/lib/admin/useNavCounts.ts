"use client";

import { useEffect, useState } from "react";
import type { NavCountKey } from "@/config/nav";
import { fetchReports, fetchStores, fetchSupportTickets } from "@/lib/admin/api";

export function useNavCounts(): Partial<Record<NavCountKey, number>> {
  const [counts, setCounts] = useState<Partial<Record<NavCountKey, number>>>({});

  useEffect(() => {
    let active = true;
    const load = async () => {
      const requests = {
        stores: fetchStores({ page: 1, limit: 1, status: "PENDING" }),
        reports: fetchReports({ page: 1, limit: 1, status: "PENDING" }),
        support: fetchSupportTickets({ page: 1, limit: 1, status: "OPEN" }),
      };
      const keys = Object.keys(requests) as NavCountKey[];
      const settled = await Promise.allSettled(keys.map((key) => requests[key]));
      if (!active) return;
      const next: Partial<Record<NavCountKey, number>> = {};
      settled.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value.success && typeof result.value.pagination?.total === "number") {
          next[keys[index]] = result.value.pagination.total;
        }
      });
      setCounts(next);
    };
    void load();
    const interval = setInterval(() => void load(), 45_000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  return counts;
}
