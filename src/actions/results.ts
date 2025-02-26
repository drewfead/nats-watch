export type Result<T> = Promise<Success<T> | Failure>;

export interface Failure {
  success: false;
  error: string;
}

export interface Success<T> {
  success: true;
  data: T;
}
