export const MAX_RESUME_FILE_SIZE_MB = 100;
export const MAX_RESUME_FILE_SIZE_BYTES = MAX_RESUME_FILE_SIZE_MB * 1024 * 1024;
export const MAX_RESUME_FILE_SIZE_LABEL = `${MAX_RESUME_FILE_SIZE_MB} MB`;
export const DIRECT_STORAGE_RESUME_PARSE_FILE_SIZE_MB = 20;
export const DIRECT_STORAGE_RESUME_PARSE_FILE_SIZE_BYTES = DIRECT_STORAGE_RESUME_PARSE_FILE_SIZE_MB * 1024 * 1024;
export const SERVER_ACTION_SAFE_RESUME_FILE_SIZE_MB = 24;
export const SERVER_ACTION_SAFE_RESUME_FILE_SIZE_BYTES = SERVER_ACTION_SAFE_RESUME_FILE_SIZE_MB * 1024 * 1024;
export const RESUME_FILE_TOO_LARGE_MESSAGE = `Resume file must be ${MAX_RESUME_FILE_SIZE_LABEL} or smaller.`;
export const RESUME_FILE_UNDER_LIMIT_MESSAGE = `Resume is too large. Upload a file under ${MAX_RESUME_FILE_SIZE_LABEL}.`;
export const RESUME_FILE_DEFERRED_MESSAGE =
  "Large file selected. Aptelys will record the file name and continue; paste resume text so recruiters can review the content immediately.";
