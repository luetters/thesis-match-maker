import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * Hook für Echtzeit-Benachrichtigungen
 * Pollt alle 5 Sekunden neue Benachrichtigungen
 * Pausiert wenn Tab nicht aktiv ist
 */
export function useNotificationPoller() {
  const { user } = useAuth();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastNotificationCountRef = useRef<number>(0);

  // Query für Benachrichtigungen
  const { data: notifications = [], refetch } = (trpc.notifications as any).list?.useQuery?.() || { 
    data: [], 
    refetch: async () => {} 
  };

  useEffect(() => {
    if (!user) {
      // Cleanup wenn Nutzer nicht eingeloggt ist
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      return;
    }

    // Visibility API: Polling pausieren wenn Tab nicht aktiv
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      } else {
        // Tab wird aktiv - sofort neue Benachrichtigungen abrufen
        refetch();
        startPolling();
      }
    };

    const startPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      // Sofort erste Abfrage
      refetch();

      // Dann alle 5 Sekunden
      pollingIntervalRef.current = setInterval(() => {
        refetch();
      }, 5000);
    };

    // Nur starten wenn Tab aktiv ist
    if (!document.hidden) {
      startPolling();
    }

    // Visibility Listener
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [user, refetch]);

  return { notifications };
}
