"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RoomProfile } from "@/components/dashboard/RoomProfile";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { GoldButton } from "@/components/ui/GoldButton";
import { MandalaCanvas } from "@/components/visualisations/MandalaCanvas";
import Link from "next/link";

function DashboardContent() {
  const params = useSearchParams();
  const roomId = params.get("roomId");

  if (!roomId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <GlassPanel className="max-w-md w-full text-center">
          <h2 className="mb-4 text-xl font-bold text-gold">No Room Selected</h2>
          <p className="mb-6 text-sm text-foreground-muted/70">
            Complete a Room Discovery to create your first room profile.
          </p>
          <Link href="/">
            <GoldButton className="w-full">Discover a Room</GoldButton>
          </Link>
        </GlassPanel>
      </div>
    );
  }

  return <RoomProfile roomId={roomId} />;
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <MandalaCanvas width={200} height={200} active />
          <p className="mt-6 text-sm text-foreground-muted/60 animate-pulse">
            Loading&hellip;
          </p>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
