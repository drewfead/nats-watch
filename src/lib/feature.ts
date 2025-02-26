export const isMulticlusterEnabled = (env: NodeJS.ProcessEnv): boolean => {
  // In client components, env will be empty but process.env.NEXT_PUBLIC_* variables are available directly
  const isClient = typeof window !== "undefined";
  const value = isClient
    ? process.env.NEXT_PUBLIC_MULTICLUSTER_ENABLED
    : env.NEXT_PUBLIC_MULTICLUSTER_ENABLED;

  // Explicitly log the type and value for debugging
  const result = value === "true" || value === "1";

  return result;
};

export const isAutoImportEnabled = (env: NodeJS.ProcessEnv): boolean => {
  // Server-side only environment variable
  return (
    env.NATS_CLUSTER_AUTO_IMPORT === "true" ||
    env.NATS_CLUSTER_AUTO_IMPORT === "1"
  );
};

export const getAutoImportPath = (
  env: NodeJS.ProcessEnv
): string | undefined => {
  // Server-side only environment variable
  return env.NATS_CLUSTER_AUTO_IMPORT_PATH;
};

export const isNatsUrlConfigured = (env: NodeJS.ProcessEnv): boolean => {
  // Server-side only environment variable
  return Boolean(env.NATS_URL && env.NATS_URL.trim() !== "");
};
