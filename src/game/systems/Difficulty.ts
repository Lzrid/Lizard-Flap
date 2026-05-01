import {
  DIFFICULTY_MAX_SCROLL,
  DIFFICULTY_MIN_GAP,
  DIFFICULTY_RAMP_SCORES,
  PIPE_GAP,
  SCROLL_SPEED,
} from "../../config";
import { clamp } from "../../utils/math";

export interface DifficultyParams {
  scrollSpeed: number;
  pipeGap: number;
}

export function difficultyFor(score: number): DifficultyParams {
  const t = clamp(score / DIFFICULTY_RAMP_SCORES, 0, 1);
  return {
    scrollSpeed: SCROLL_SPEED + (DIFFICULTY_MAX_SCROLL - SCROLL_SPEED) * t,
    pipeGap: PIPE_GAP + (DIFFICULTY_MIN_GAP - PIPE_GAP) * t,
  };
}
