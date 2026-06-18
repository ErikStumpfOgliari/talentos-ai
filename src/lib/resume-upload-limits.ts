export const MAX_RESUME_FILE_SIZE_MB = 30;
export const MAX_RESUME_FILE_SIZE_BYTES = MAX_RESUME_FILE_SIZE_MB * 1024 * 1024;
export const MAX_RESUME_FILE_SIZE_LABEL = `${MAX_RESUME_FILE_SIZE_MB} MB`;
export const RESUME_FILE_TOO_LARGE_MESSAGE = `Resume file must be ${MAX_RESUME_FILE_SIZE_LABEL} or smaller.`;
export const RESUME_FILE_UNDER_LIMIT_MESSAGE = `Resume is too large. Upload a file under ${MAX_RESUME_FILE_SIZE_LABEL}.`;
