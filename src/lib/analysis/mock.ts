// モック分析  担当：岩崎
// USE_MOCK_LLM=trueのときanalyzeの代わりに使う。Geminiのキーなしで一周動かすため
import type { AnalysisAction, AnalysisInput } from '@/types/diff';

export function mockAnalyze(input: AnalysisInput): AnalysisAction {
  const body = input.message.body.trim();
  const label = body.slice(0, 30);

  switch (input.trigger) {
    case 'reaction':
    case 'message':
      return body.includes('案') ? { op: 'create_idea', label } : { op: 'none' };
    case 'reply':
      if (input.target.kind === 'problem') {
        return { op: 'add_solution', problemId: input.target.id, label };
      }
      return /でも|けど|問題/.test(body)
        ? { op: 'add_problem', ideaId: input.target.id, label }
        : { op: 'add_reason', ideaId: input.target.id, label };
  }
}
