export const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5];

export const WEEKDAY_OPTIONS = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

const WEEKDAY_LABEL_BY_VALUE = new Map(WEEKDAY_OPTIONS.map((day) => [day.value, day.label]));

type AvailabilityRecord = {
  bufferAfterMinutes?: number | null;
  bufferBeforeMinutes?: number | null;
  defaultDurationMinutes?: number | null;
  maxDaysAhead?: number | null;
  slotIntervalMinutes?: number | null;
  timezone?: string | null;
  workdayEndHour?: number | null;
  workdayStartHour?: number | null;
  workingDays?: number[] | null;
};

export type AvailabilitySettings = {
  bufferAfterMinutes: number;
  bufferBeforeMinutes: number;
  defaultDurationMinutes: number;
  maxDaysAhead: number;
  slotIntervalMinutes: number;
  timezone: string;
  workdayEndHour: number;
  workdayStartHour: number;
  workingDays: number[];
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeWorkingDays(value: unknown) {
  const rawDays = Array.isArray(value) ? value : DEFAULT_WORKING_DAYS;
  const days = Array.from(
    new Set(
      rawDays
        .map((day) => Number(day))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
    ),
  ).sort((left, right) => left - right);

  return days.length > 0 ? days : [...DEFAULT_WORKING_DAYS];
}

export function buildAvailabilitySettings(
  availability: AvailabilityRecord | null | undefined,
  fallbackTimezone: string,
): AvailabilitySettings {
  const workdayStartHour = clamp(availability?.workdayStartHour ?? 9, 0, 23);
  const workdayEndHour = clamp(availability?.workdayEndHour ?? 17, workdayStartHour + 1, 24);

  return {
    bufferAfterMinutes: clamp(availability?.bufferAfterMinutes ?? 15, 0, 240),
    bufferBeforeMinutes: clamp(availability?.bufferBeforeMinutes ?? 0, 0, 240),
    defaultDurationMinutes: clamp(availability?.defaultDurationMinutes ?? 45, 15, 240),
    maxDaysAhead: clamp(availability?.maxDaysAhead ?? 10, 1, 30),
    slotIntervalMinutes: clamp(availability?.slotIntervalMinutes ?? 30, 15, 120),
    timezone: availability?.timezone?.trim() || fallbackTimezone,
    workdayEndHour,
    workdayStartHour,
    workingDays: normalizeWorkingDays(availability?.workingDays),
  };
}

export function formatWorkingDayLabels(workingDays: number[]) {
  return normalizeWorkingDays(workingDays)
    .map((day) => WEEKDAY_LABEL_BY_VALUE.get(day))
    .filter(Boolean)
    .join(", ");
}
