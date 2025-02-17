declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NATS_URL: string;
      NATS_CREDS_PATH: string;
      [key: string]: string | undefined;
    }
  }
} 