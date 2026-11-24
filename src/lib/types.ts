/** Types shared by server and client code. Keep this file free of server-only imports. */

export type AppUser = {
  /** Lichess user id (lowercase username). */
  id: string;
  lichessUsername: string;
  displayName: string;
  photoUrl: string | null;
};

/** Result returned by form Server Actions. */
export type FormState = { ok?: string; error?: string };

export type TournamentStatus = "open" | "running" | "finished" | "cancelled";

export type PlayerSummary = {
  id: string;
  displayName: string;
  photoUrl: string | null;
};

export type TournamentSummary = {
  id: string;
  name: string;
  size: number;
  minutes: number;
  status: TournamentStatus;
  host: PlayerSummary;
  playerCount: number;
  createdAt: string;
};

export type TournamentDetail = TournamentSummary & {
  hostPlays: boolean;
  currentRound: number;
  startedAt: string | null;
  /** In join order. */
  players: (PlayerSummary & { joinedAt: string; isTest: boolean })[];
};
