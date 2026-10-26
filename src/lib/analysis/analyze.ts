// 分析本体　担当：楠奥
// テスト（replay）からも呼ばれるので、server-only は付けない
import type { AnalysisAction, AnalysisInput } from '@/types/diff';
import type { BoardState } from '@/types/state';
import { mockAnalyze } from './mock';

// プロンプトを選んで callGemini → zod で検証 → validateAction。
// どちらかで不正なら LLM_RETRY 回まで再試行し、それでも不正なら例外
export async function analyze(state: BoardState, input: AnalysisInput): Promise<AnalysisAction> {
  if (process.env.USE_MOCK_LLM === 'true') return mockAnalyze(input);
  throw new Error('未実装: analyze');
}
