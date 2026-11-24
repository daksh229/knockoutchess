"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureUserRow, requireSession } from "@/lib/auth";
import { isDbConfigured } from "@/lib/env";
import {
  DEV_TOOLS_ENABLED,
  TOURNAMENT_NAME_MAX,
  TOURNAMENT_NAME_MIN,
  isMinutes,
  isPlayerCount,
  isUuid,
} from "@/lib/rules";
import {
  TournamentError,
  addTestPlayers,
  cancelTournament,
  createTournament,
  getTournament,
  joinTournament,
  leaveTournament,
  startTournament,
} from "@/lib/tournaments";
import type { FormState } from "@/lib/types";

const NOT_CONNECTED: FormState = { error: "The database isn't connected yet." };

function failure(error: unknown, what: string): FormState {
  if (error instanceof TournamentError) return { error: error.message };
  console.error(`${what} failed`, error);
  return { error: "Something went wrong. Please try again." };
}

function refreshTournament(id: string) {
  revalidatePath(`/tournaments/${id}`);
  revalidatePath("/tournaments");
}

export async function createTournamentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  if (!isDbConfigured()) return NOT_CONNECTED;

  const name = String(formData.get("name") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  const size = Number(formData.get("size"));
  const minutes = Number(formData.get("minutes"));
  const hostPlays = formData.get("hostPlays") === "on";

  if (name.length < TOURNAMENT_NAME_MIN || name.length > TOURNAMENT_NAME_MAX) {
    return { error: `Name must be ${TOURNAMENT_NAME_MIN}–${TOURNAMENT_NAME_MAX} characters.` };
  }
  if (!isPlayerCount(size)) return { error: "Pick 2, 4, 8, 16 or 32 players." };
  if (!isMinutes(minutes)) return { error: "Pick 5 or 10 minutes." };

  let id: string;
  try {
    await ensureUserRow(session);
    id = await createTournament({ hostId: session.userId, name, size, minutes, hostPlays });
  } catch (error) {
    return failure(error, "Create tournament");
  }

  revalidatePath("/tournaments");
  redirect(`/tournaments/${id}`);
}

/** Used from the lobby cards and the tournament page. Always lands on the tournament page. */
export async function joinTournamentAction(id: string): Promise<FormState> {
  const session = await requireSession();
  if (!isDbConfigured()) return NOT_CONNECTED;
  if (!isUuid(id)) return { error: "That tournament doesn't exist." };

  try {
    await ensureUserRow(session);
    await joinTournament(id, session.userId);
  } catch (error) {
    return failure(error, "Join");
  }

  refreshTournament(id);
  redirect(`/tournaments/${id}`);
}

export async function leaveTournamentAction(id: string): Promise<FormState> {
  const session = await requireSession();
  if (!isDbConfigured()) return NOT_CONNECTED;
  if (!isUuid(id)) return { error: "That tournament doesn't exist." };

  try {
    await leaveTournament(id, session.userId);
  } catch (error) {
    return failure(error, "Leave");
  }

  refreshTournament(id);
  return {};
}

export async function cancelTournamentAction(id: string): Promise<FormState> {
  const session = await requireSession();
  if (!isDbConfigured()) return NOT_CONNECTED;
  if (!isUuid(id)) return { error: "That tournament doesn't exist." };

  try {
    await cancelTournament(id, session.userId);
  } catch (error) {
    return failure(error, "Cancel");
  }

  refreshTournament(id);
  return {};
}

export async function startTournamentAction(id: string): Promise<FormState> {
  const session = await requireSession();
  if (!isDbConfigured()) return NOT_CONNECTED;
  if (!isUuid(id)) return { error: "That tournament doesn't exist." };

  try {
    await startTournament(id, session.userId);
  } catch (error) {
    return failure(error, "Start");
  }

  refreshTournament(id);
  return {};
}

/** Dev only: fill open spots with fake players. `count` 0 means "all remaining". */
export async function addTestPlayersAction(id: string, count: number): Promise<FormState> {
  const session = await requireSession();
  if (!DEV_TOOLS_ENABLED) return { error: "Test players are only available in development." };
  if (!isDbConfigured()) return NOT_CONNECTED;
  if (!isUuid(id)) return { error: "That tournament doesn't exist." };

  try {
    const tournament = await getTournament(id);
    if (!tournament) return { error: "That tournament doesn't exist." };
    if (tournament.host.id !== session.userId) return { error: "Only the host can add test players." };
    if (tournament.status !== "open") return { error: "This tournament has already started." };

    const open = tournament.size - tournament.players.length;
    const added = await addTestPlayers(id, count === 0 ? open : Math.min(count, open));
    refreshTournament(id);
    return { ok: added === 1 ? "Added 1 test player." : `Added ${added} test players.` };
  } catch (error) {
    return failure(error, "Add test players");
  }
}
