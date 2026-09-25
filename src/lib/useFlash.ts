"use client";

import { dispatchToast } from "@/lib/toast";

/** Keeps existing call sites while routing all success feedback to the global toast UI. */
const flashSuccess = (message: string) =>
  dispatchToast("success", message.replace(/\s*🗑️?\s*$/, ""));

export function useFlash(): [null, typeof flashSuccess] {
  return [null, flashSuccess];
}
