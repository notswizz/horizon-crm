"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function KpiCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-20" />
      </CardContent>
    </Card>
  );
}

export function DashboardSkeleton({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="space-y-8 max-w-[1400px]">
      {/* KPI row */}
      {isAdmin ? (
        <div className="grid grid-cols-12 gap-4">
          <Skeleton className="col-span-12 lg:col-span-4 h-[100px] rounded-xl" />
          <div className="col-span-6 lg:col-span-2"><KpiCardSkeleton /></div>
          <div className="col-span-6 lg:col-span-2"><KpiCardSkeleton /></div>
          <div className="col-span-6 lg:col-span-2"><KpiCardSkeleton /></div>
          <div className="col-span-6 lg:col-span-2"><KpiCardSkeleton /></div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-8 space-y-4">
            <Skeleton className="h-10 w-64" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-white border border-gray-100 p-4">
                  <Skeleton className="h-3 w-12 mb-2" />
                  <Skeleton className="h-7 w-16 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          </div>
          <div className="col-span-12 lg:col-span-4">
            <Card className="h-full">
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Map + Recent jobs skeleton */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-5 space-y-3">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <div className="col-span-12 lg:col-span-7">
          <Skeleton className="h-4 w-28 mb-4" />
          <Skeleton className="h-[340px] w-full rounded-xl" />
        </div>
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-12 gap-6">
        <Skeleton className="col-span-12 lg:col-span-8 h-[380px] rounded-xl" />
        <Skeleton className="col-span-12 lg:col-span-4 h-[380px] rounded-xl" />
      </div>
    </div>
  );
}
