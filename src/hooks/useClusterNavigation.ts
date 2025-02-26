import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { addClusterParam } from "@/lib/navigation";

interface ClusterNavigation {
  navigateWithCluster: (newPathname: string, clusterId?: string) => void;
  updateCluster: (clusterId?: string) => void;
}

export function useClusterNavigation(): ClusterNavigation {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const navigateWithCluster = useCallback(
    (newPathname: string, clusterId?: string) => {
      const currentClusterId = searchParams.get("cluster");
      const href = addClusterParam(
        newPathname,
        searchParams,
        clusterId ?? (currentClusterId || undefined)
      );
      router.push(href);
    },
    [router, searchParams]
  );

  const updateCluster = useCallback(
    (clusterId?: string) => {
      navigateWithCluster(pathname, clusterId);
    },
    [navigateWithCluster, pathname]
  );

  return {
    navigateWithCluster,
    updateCluster,
  };
}
