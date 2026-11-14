"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useIsClient } from "@/lib/useIsClient";
import { formatNumber } from "@/lib/format";

export interface TrendSeries {
  /** مفتاح الحقل بكائن البيانات */
  key: string;
  label: string;
  /** لون من توكنز الثيم — بلا قيم hex مكتوبة هون */
  color: string;
}

const chartColors = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)"];
const sourceColors = ["var(--color-primary)", "var(--color-info)", "var(--color-success)", "var(--color-warning)"];
const chartColor = (series: TrendSeries, index: number) => chartColors[sourceColors.indexOf(series.color)] ?? chartColors[index % chartColors.length];

interface TrendChartProps {
  /**
   * كل عنصر لازم يحمل حقل التاريخ + كل مفاتيح السلاسل.
   * النوع `object` مقصود: الأنواع المسمّاة (GrowthPoint) ما فيها index signature،
   * وفرض واحدة عليها بيخلّي أي مفتاح غلط يمرّ بصمت.
   */
  data: readonly object[];
  /** اسم حقل المحور الأفقي (تاريخ YYYY-MM-DD) */
  xKey: string;
  series: TrendSeries[];
  height?: number;
}

/**
 * مخطّط زمني — الغلاف الوحيد فوق recharts بالمشروع.
 *
 * الاعتماد معزول هون عمداً: أي استبدال للمكتبة لاحقاً بيتم بملف واحد بلا ما
 * تتغيّر أي صفحة. المكتبة أول اعتمادية ثقيلة بالمشروع، فمقصود ما تنتشر.
 *
 * ملاحظات RTL: المحور الأفقي معكوس والعمودي على اليمين، لأن recharts
 * بتفترض LTR وما بتقرأ dir من الـ DOM.
 */
export default function TrendChart({
  data,
  xKey,
  series,
  height = 280,
}: TrendChartProps) {
  /*
    recharts بتقيس أبعاد الحاوية، وعلى السيرفر ما في أبعاد — فبتطلع تحذيرات
    وفروقات ترطيب. useIsClient الموجود بالمشروع بيأجّل الرسم لبعد الترطيب،
    والارتفاع محجوز مسبقاً فما بيصير قفزة بالتخطيط.
  */
  const isClient = useIsClient();

  /** "2026-08-21" → "21/08" — المحور ضيّق، والسنة مفهومة من السياق */
  const shortDate = (iso: string) => {
    const [, month, day] = iso.split("-");
    return `${day}/${month}`;
  };

  if (!isClient) return <div style={{ height }} aria-hidden="true" />;

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            {series.map((s, index) => (
              <linearGradient
                key={s.key}
                id={`fill-${s.key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={chartColor(s, index)} stopOpacity={0.28} />
                <stop offset="100%" stopColor={chartColor(s, index)} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            vertical={false}
          />

          {/* معكوس عشان الزمن يمشي من اليمين لليسار زي قراءة العربية */}
          <XAxis
            dataKey={xKey}
            reversed
            tickFormatter={shortDate}
            tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border)" }}
            minTickGap={24}
          />
          <YAxis
            orientation="right"
            tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(value: number) => formatNumber(value)}
          />

          <Tooltip
            labelFormatter={(label) => shortDate(String(label))}
            formatter={(value, name) => [formatNumber(Number(value)), String(name)]}
            contentStyle={{
              direction: "rtl",
              borderRadius: 16,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              fontSize: 12,
              fontWeight: 700,
              boxShadow: "var(--shadow-pop)",
            }}
          />
          <Legend
            formatter={(value: string) => (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--color-text-secondary)",
                }}
              >
                {value}
              </span>
            )}
          />

          {series.map((s, index) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={chartColor(s, index)}
              strokeWidth={2}
              fill={`url(#fill-${s.key})`}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
