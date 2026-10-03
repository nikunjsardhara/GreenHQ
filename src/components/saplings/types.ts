export interface SpeciesFacet {
  id: string;
  name: string;
  count: number;
}

export interface SpeciesOption {
  id: string;
  commonName: string;
}

export interface SaplingRow {
  nanoid: string;
  status: string;
  species: { id: string; commonName: string } | null;
  project: { id: string; name: string; startDate: string | null } | null;
  plantedAt: string | Date | null;
  createdAt: string | Date;
}

export const SAPLING_STATUSES = [
  "all",
  "registered",
  "planted",
  "growing",
  "mature",
  "lost",
  "replaced",
] as const;

export type SaplingStatusFilter = (typeof SAPLING_STATUSES)[number];
export type SaplingSort = "newest" | "oldest" | "code";

export const NO_CHANGE = "__nochange";
export const PAGE_SIZE = 20;
