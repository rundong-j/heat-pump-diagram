import type { CycleMode, OverlayToggles } from "./types";

export type CoilRole = "evaporator" | "condenser";

export type StationId = "discharge" | "liquid" | "twoPhase" | "suction";

export type StationReading = {
  pressure: string;
  temperature: string;
  phase: string;
};

export type CycleReadings = Record<StationId, StationReading>;

/** Illustrative teaching values, not a property library. */
export const CYCLE_READINGS: Record<CycleMode, CycleReadings> = {
  cooling: {
    discharge: { pressure: "410 psi", temperature: "180°F", phase: "Vapor" },
    liquid: { pressure: "400 psi", temperature: "95°F", phase: "Liquid" },
    twoPhase: { pressure: "130 psi", temperature: "45°F", phase: "Two-phase" },
    suction: { pressure: "125 psi", temperature: "50°F", phase: "Vapor" },
  },
  heating: {
    discharge: { pressure: "350 psi", temperature: "140°F", phase: "Vapor" },
    liquid: { pressure: "340 psi", temperature: "90°F", phase: "Liquid" },
    twoPhase: { pressure: "70 psi", temperature: "20°F", phase: "Two-phase" },
    suction: { pressure: "65 psi", temperature: "25°F", phase: "Vapor" },
  },
};

export function indoorCoilRole(mode: CycleMode): CoilRole {
  return mode === "heating" ? "condenser" : "evaporator";
}

export function coilLabel(role: CoilRole): string {
  return role === "evaporator" ? "Evaporator" : "Condenser";
}

export function heatFlowLabel(role: CoilRole): string {
  return role === "evaporator" ? "Heat absorbed" : "Heat rejected";
}

export function badgeText(reading: StationReading, overlays: OverlayToggles): string {
  const parts: string[] = [];
  if (overlays.pressure) {
    parts.push(reading.pressure);
  }
  if (overlays.temperature) {
    parts.push(reading.temperature);
  }
  if (overlays.phase) {
    parts.push(reading.phase);
  }
  return parts.join(" · ");
}
