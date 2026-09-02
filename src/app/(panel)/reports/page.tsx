"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/ui/Spinner";

export default function AdminReportsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/reviews");
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner />
    </div>
  );
}
