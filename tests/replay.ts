//会話ログの再生テスト 担当：岩崎
//DBを使わない：ジョブを積むか判定→analyze→toNoteDraft → applyDiff を繰り返す
import type { AnalysisAction, AnalysisInput } from '@/types/diff';
import type { AnalysisMode } from '@/types/domain';
import type { BoardState } from '@/types/state';
import type { ConversationLog } from './types';

export type ReplayStep = {
  messageId: string;
  input: AnalysisInput | null;    // ジョブを積まなかった発言はnull
  action: AnalysisAction | null;
  state: BoardState;              // この発言を処理したあとの状態
};

export async function replay(log: ConversationLog, mode: AnalysisMode): Promise<ReplayStep[]> {
  throw new Error('未実装: replay');
}
