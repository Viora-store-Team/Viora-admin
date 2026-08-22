"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApiResponse, Pagination } from "@/lib/api";
import { classifyStatus } from "@/lib/apiFailure";
import { t } from "@/lib/strings";

/**
 * آلة الحالة المشتركة لصفحات القوائم (متاجر · مستخدمين · بلاغات · فشل توصيل).
 *
 * بلاها بينكتب نفس السلّم أربع مرات: جلب + إلغاء + ترقيم + بحث + فلاتر +
 * تصنيف الفشل. نفس نمط lib/products/useLookups.ts — الحالة كائن واحد عشان
 * ما نضطر نصفّرها بـ setState جوّا الـ effect (القاعدة react-hooks/set-state-in-effect).
 */

interface ListState<T> {
  rows: T[];
  pagination: Pagination | null;
  loading: boolean;
  error: string;
  /** 401 — الجلسة مرفوضة. الصفحة بتقرّر شو تعمل فيها */
  unauthorized: boolean;
}

const EMPTY: ListState<never> = {
  rows: [],
  pagination: null,
  loading: true,
  error: "",
  unauthorized: false,
};

export interface AdminListOptions<T> {
  /** الجالب — بياخد رقم الصفحة والبحث والفلاتر */
  fetcher: (params: {
    page: number;
    q: string;
    filters: Record<string, string>;
  }) => Promise<ApiResponse>;
  /** بيقرأ المصفوفة من الرد — الكيانات بالمستوى الأعلى مش جوّا data */
  select: (res: ApiResponse) => T[] | undefined;
  /** قيم الفلاتر الابتدائية — "" يعني بلا فلترة */
  initialFilters?: Record<string, string>;
}

export function useAdminList<T>({
  fetcher,
  select,
  initialFilters = {},
}: AdminListOptions<T>) {
  const [state, setState] = useState<ListState<T>>(EMPTY as ListState<T>);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  /** عدّاد إعادة المحاولة — تغييره بيعيد تشغيل الـ effect */
  const [attempt, setAttempt] = useState(0);

  // المفتاح بيمنع إعادة الجلب لما يتغيّر مرجع الكائن بلا ما تتغيّر قيمه
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  /*
    initialFilters كائن حرفي بموضع الاستدعاء، يعني مرجع جديد كل رندر.
    بنحوّله لمفتاح نصي ثابت القيمة عشان clearFilters تضل مستقرة.
  */
  const initialKey = useMemo(() => JSON.stringify(initialFilters), [initialFilters]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const res = await fetcher({
        page,
        q,
        filters: JSON.parse(filterKey) as Record<string, string>,
      });
      if (cancelled) return;

      const rows = select(res);

      if (res.success && rows) {
        setState({
          rows,
          pagination: (res.pagination as Pagination) ?? null,
          loading: false,
          error: "",
          unauthorized: false,
        });
        return;
      }

      const failure = classifyStatus(res);
      setState({
        rows: [],
        pagination: null,
        loading: false,
        error:
          failure.kind === "validation" ? t.admin.common.loadFailed : failure.message,
        unauthorized: failure.kind === "unauthorized",
      });
    })();

    return () => {
      cancelled = true;
    };
    // fetcher/select بيتعرّفوا جوّا الصفحة، فبنعتمد على المفاتيح القيمية بس
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q, filterKey, attempt]);

  /** التحديث متزامن هون لأنه معالج حدث مش effect — مسموح ومقصود */
  const startLoading = () => setState((s) => ({ ...s, loading: true, error: "" }));

  const changePage = useCallback((next: number) => {
    startLoading();
    setPage(next);
  }, []);

  /** البحث والفلاتر بيرجّعوا لأول صفحة — الصفحة 5 من نتيجة قديمة ما إلها معنى */
  const changeQuery = useCallback((next: string) => {
    startLoading();
    setPage(1);
    setQ(next);
  }, []);

  const changeFilter = useCallback((key: string, value: string) => {
    startLoading();
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reload = useCallback(() => {
    startLoading();
    setAttempt((a) => a + 1);
  }, []);

  const clearFilters = useCallback(() => {
    startLoading();
    setPage(1);
    setQ("");
    setFilters(JSON.parse(initialKey) as Record<string, string>);
  }, [initialKey]);

  /** في فلترة فعّالة؟ بيفرّق بين "ما في بيانات" و"ما في نتائج بحث" */
  const isFiltered =
    q.trim() !== "" || Object.values(filters).some((v) => v !== "");

  return {
    ...state,
    page,
    q,
    filters,
    isFiltered,
    changePage,
    changeQuery,
    changeFilter,
    clearFilters,
    reload,
    /** لتحديث صف محلياً بعد عملية ناجحة بلا إعادة جلب */
    patchRows: (updater: (rows: T[]) => T[]) =>
      setState((s) => ({ ...s, rows: updater(s.rows) })),
  };
}
