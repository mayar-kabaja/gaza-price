"use client";

import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { OfflineQueueStatus } from "@/components/ui/OfflineQueueStatus";

export function OfflineQueueSync() {
  const { pendingCount, syncNow, isSyncing } = useOfflineQueue();

  return (
    <OfflineQueueStatus
      pendingCount={pendingCount}
      isSyncing={isSyncing}
      onSync={syncNow}
    />
  );
}
