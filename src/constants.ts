import type { AnalysisMode } from '@/types/domain';

// 新しく作る部屋の方式
export const DEFAULT_ANALYSIS_MODE: AnalysisMode =
  process.env.NEXT_PUBLIC_DEFAULT_ANALYSIS_MODE === 'all' ? 'all' : 'reaction';

// 分析
export const ANALYSIS_LOCK_TIMEOUT_MS = 30_000;
export const LLM_RETRY = 1;
export const MAX_LABEL_LENGTH = 30;      // 仮。付箋の見た目に合わせて決める

// 配置（数値はすべて仮、調整必須）
export const MAX_BOARD_SCALE = 3.0;
export const PLACE_ANGLE_STEP = Math.PI / 12;
export const LOW_SIMILARITY = 0.3;