/** Tournament rules shared by the form (client) and the server checks. */

export const PLAYER_COUNTS = [2, 4, 8, 16, 32] as const;
export type PlayerCount = (typeof PLAYER_COUNTS)[number];

export const TIME_CONTROLS = [5, 10] as const; // minutes per player, no increment
export type Minutes = (typeof TIME_CONTROLS)[number];

export const TOURNAMENT_NAME_MIN = 3;
export const TOURNAMENT_NAME_MAX = 40;

/** Dev-only helpers (test players) are hidden and refused in production. */
export const DEV_TOOLS_ENABLED = process.env.NODE_ENV === "development";

export function isPlayerCount(value: number): value is PlayerCount {
  return (PLAYER_COUNTS as readonly number[]).includes(value);
}

export function isMinutes(value: number): value is Minutes {
  return (TIME_CONTROLS as readonly number[]).includes(value);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
