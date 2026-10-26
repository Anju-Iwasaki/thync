// プロンプト  担当：楠奥（messagePrompt は岩崎と共同）
import type { AnalysisInput } from '@/types/diff';
import type { BoardState } from '@/types/state';

// reaction トリガー：create_idea / none
export function reactionPrompt(state: BoardState, input: Extract<AnalysisInput, { trigger: 'reaction' }>): string {
  throw new Error('未実装: reactionPrompt');
}

// reply トリガー：add_reason / add_problem / add_solution / none
export function replyPrompt(state: BoardState, input: Extract<AnalysisInput, { trigger: 'reply' }>): string {
  throw new Error('未実装: replyPrompt');
}

// message トリガー（全発言方式）：すべてのop
export function messagePrompt(state: BoardState, input: Extract<AnalysisInput, { trigger: 'message' }>): string {
  throw new Error('未実装: messagePrompt');
}
