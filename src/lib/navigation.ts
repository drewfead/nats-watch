import { ReadonlyURLSearchParams } from "next/navigation";

export function addClusterParam(
  pathname: string,
  searchParams: ReadonlyURLSearchParams,
  clusterId?: string
): string {
  const params = new URLSearchParams(searchParams.toString());

  if (clusterId && clusterId !== "default") {
    params.set("cluster", clusterId);
  } else {
    params.delete("cluster");
  }

  const queryString = params.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

export function getClusterParam(
  searchParams: ReadonlyURLSearchParams
): string | null {
  return searchParams.get("cluster");
}
