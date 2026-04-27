"use client";

import type { ObservationResult } from "./observation-schema";

export type AgeGroup = "3-6" | "6-9" | "9-12";

export interface Child {
  id: string;
  nickname: string;
  age_group: AgeGroup;
  created_at: string;
}

export interface ObservationEntry {
  id: string;
  child_id: string;
  age_group: AgeGroup;
  observed_at: string;
  structured_payload: ObservationResult;
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ── 아동 프로필 ──────────────────────────────────────────────

const CHILDREN_KEY = "ssaemi_children";

export function getChildren(): Child[] {
  return read<Child[]>(CHILDREN_KEY, []);
}

export function addChild(data: Omit<Child, "id" | "created_at">): Child {
  const child: Child = {
    ...data,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  write(CHILDREN_KEY, [child, ...getChildren()]);
  return child;
}

// ── 관찰 기록 ─────────────────────────────────────────────────

const OBS_KEY = "ssaemi_observations";

export function getObservations(childId: string): ObservationEntry[] {
  return read<ObservationEntry[]>(OBS_KEY, []).filter((o) => o.child_id === childId);
}

export function saveObservation(
  childId: string,
  ageGroup: AgeGroup,
  result: ObservationResult
): ObservationEntry {
  const entry: ObservationEntry = {
    id: crypto.randomUUID(),
    child_id: childId,
    age_group: ageGroup,
    observed_at: result.observed_at_iso,
    structured_payload: result,
  };
  const all = read<ObservationEntry[]>(OBS_KEY, []);
  write(OBS_KEY, [entry, ...all]);
  return entry;
}
