/**
 * تنسيق الأرقام والتواريخ.
 *
 * نستخدم `-u-nu-latn` عشان نجبر الأرقام الغربية (1,2,3) بدل العربية-الهندية (١,٢,٣)،
 * لأن المستخدمين بفلسطين والأردن بيقروا الأرقام الغربية.
 */

const numberFormatter = new Intl.NumberFormat("ar-PS-u-nu-latn");

const dateFormatter = new Intl.DateTimeFormat("ar-PS-u-nu-latn", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** 32000 => "32,000" */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** 145 => "145 ₪" */
export function formatCurrency(value: number): string {
  return `${numberFormatter.format(value)} ₪`;
}

const priceFormatter = new Intl.NumberFormat("ar-PS-u-nu-latn", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * أسعار المنتجات بتيجي من الباك إند **كنص** ("25.5") مش رقم — لأن النوع Decimal
 * بينتقل كنص عشان ما تضيع الدقة. دايماً خانتين عشريتين بالعرض.
 *
 * "25.5" => "25.50 ₪"
 */
export function formatPrice(value: string | number): string {
  return `${priceFormatter.format(Number(value))} ₪`;
}

/**
 * "2026-08-01" => "01 أغسطس 2026"
 *
 * نضيف T00:00:00 عشان JS يفسّرها كوقت محلي؛ بدونها بتتفسّر UTC
 * وبتنزاح ليوم قبل عند المستخدمين اللي توقيتهم خلف UTC.
 */
export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(`${iso}T00:00:00`));
}

/** تاريخ اليوم بصيغة "YYYY-MM-DD" بالتوقيت المحلي — للمقارنة النصية مع تواريخ الـ dummy data */
export function todayISO(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

const dateTimeFormatter = new Intl.DateTimeFormat("ar-PS-u-nu-latn", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * لطوابع زمنية كاملة ("2026-08-21T14:30:00Z") مش تواريخ يوم.
 * منفصلة عن formatDate لأن هديك بتضيف T00:00:00 وبتنكسر مع طابع فيه وقت.
 */
export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}
