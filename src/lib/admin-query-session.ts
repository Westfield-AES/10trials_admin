import { QueryClient } from "@tanstack/react-query";
import { getAdminSessionToken, subscribeToAdminSession } from "@/lib/admin-session";

export function createAdminQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
    },
  });
}

export function bindAdminQuerySession(client: QueryClient): () => void {
  const token = getAdminSessionToken();
  const unsubscribe = subscribeToAdminSession(() => {
    if (getAdminSessionToken() !== token) client.clear();
  });
  return () => {
    unsubscribe();
    client.clear();
  };
}
