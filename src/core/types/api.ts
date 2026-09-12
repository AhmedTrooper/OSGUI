/**
 * Generic API envelope returned by every Tauri command.
 *
 * Rust commands consistently return `Result<ApiResult<T>, _>`, so the
 * frontend always receives either:
 *   - `{ success: true, payload: <T> }`
 *   - `{ success: false, message: <string> }`
 *
 * Some commands return `ApiResult<T & { message?: string }>` so the
 * frontend gets a single discriminated union to narrow on.
 */
export interface ApiResult<T> {
  success: boolean;
  message?: string;
  payload?: T;
}

export interface ApiSuccess<T> extends ApiResult<T> {
  success: true;
  payload: T;
}

export interface ApiFailure extends ApiResult<never> {
  success: false;
  message: string;
}

export const isApiSuccess = <T>(value: ApiResult<T>): value is ApiSuccess<T> =>
  value.success === true && value.payload !== undefined;

export const isApiFailure = <T>(value: ApiResult<T>): value is ApiFailure =>
  value.success === false;
