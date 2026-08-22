import type { NextConfig } from "next";
import path from "path";

/*
  ما في redirects هون — بلوحة التاجر الجذر `/` بيروح على `/dashboard`،
  أما هون الجذر **هو** صفحة النظرة العامة (src/app/(panel)/page.tsx).
*/
const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
