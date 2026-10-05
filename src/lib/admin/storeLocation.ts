import { textOrNull } from "@/lib/brokenText";

const GOVERNORATES: Record<string, string> = {
  NORTH_GAZA: "شمال غزة",
  GAZA: "غزة",
  DEIR_AL_BALAH: "دير البلح",
  KHAN_YUNIS: "خان يونس",
  RAFAH: "رفح",
};

export function storeLocation(store: {
  governorate?: string | null;
  district?: string | null;
  city?: string | null;
}): string | null {
  const governorate = store.governorate ? GOVERNORATES[store.governorate] : null;
  return [governorate, textOrNull(store.district)].filter(Boolean).join(" — ") || textOrNull(store.city);
}
