/**
 * Persists application errors and parse transactions directly to the SQLite
 * log tables (`error_logs`, `parse_logs`).
 *
 * Silently no-ops when the app runs outside the Tauri shell.
 */
import { safeInvoke } from "@/utils/tauri";

export type ParseLogStatus = "running" | "success" | "failed";

export interface InsertErrorLogArgs {
  downloadJobSlug: string;
  commandExecuted: string;
  errorMessage: string;
}

export interface InsertParseLogArgs {
  parsedFileSlug: string;
  status: ParseLogStatus;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number;
  commandExecuted: string;
  exitCode: number | null;
  bytesReturned: number;
}

export const logErrorToDb = async (
  errorMsg: string,
  context = "app_error",
  jobSlug = "app_fallback",
): Promise<void> => {
  const args: InsertErrorLogArgs = {
    downloadJobSlug: jobSlug,
    commandExecuted: context,
    errorMessage: errorMsg,
  };
  await safeInvoke<void>("insert_error_log", args as unknown as Record<string, unknown>);
};

export const logParseToDb = async (
  parsedFileSlug: string,
  status: ParseLogStatus,
  startedAt: string,
  finishedAt: string | null,
  durationMs: number,
  commandExecuted: string,
  exitCode: number | null,
  bytesReturned: number,
): Promise<void> => {
  const args: InsertParseLogArgs = {
    parsedFileSlug,
    status,
    startedAt,
    finishedAt,
    durationMs,
    commandExecuted,
    exitCode,
    bytesReturned,
  };
  await safeInvoke<void>("insert_parse_log", args as unknown as Record<string, unknown>);
};
