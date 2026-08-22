import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * يدمج كلاسات Tailwind بحيث الكلاس اللي بيجي أخيراً هو اللي بيغلب.
 * ضروري عشان الـ className اللي بيمرّره المستخدم يقدر يتجاوز الستايل الافتراضي للكومبوننت.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
