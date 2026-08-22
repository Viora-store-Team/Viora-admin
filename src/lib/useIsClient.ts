"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * بترجّع false أثناء الـ SSR وأول رندر بالمتصفح، وبعدين true.
 *
 * الفايدة: أي قيمة بتعتمد على وقت/بيئة المتصفح (زي تاريخ اليوم) بنأجّلها لبعد الـ hydration
 * عشان ما يصير اختلاف بين ما رندره السيرفر وما رندره المتصفح.
 *
 * useSyncExternalStore هي الطريقة المعتمدة بـ React لهيك حالة — بدون setState داخل useEffect.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
