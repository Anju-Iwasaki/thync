// テストデータの形式検査  npm run check:fixtures
// 大谷さんがJSONを書いたら実行する。問題がなければ「OK」だけが出る
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ConversationLog, ClassifyFile } from './types';

const dir = join(__dirname, 'fixtures');
const problems: string[] = [];

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    problems.push(`${path}: JSONとして読めない（${(e as Error).message}）`);
    return undefined;
  }
}

function zodIssues(path: string, issues: { path: PropertyKey[]; message: string }[]) {
  for (const i of issues) problems.push(`${path}: ${i.path.join('.') || '(全体)'} — ${i.message}`);
}

// ---------- classify.json ----------
const classifyPath = join(dir, 'classify.json');
if (existsSync(classifyPath)) {
  const data = readJson(classifyPath);
  if (data !== undefined) {
    const r = ClassifyFile.safeParse(data);
    if (!r.success) zodIssues(classifyPath, r.error.issues);
    else {
      const ids = r.data.map((x) => x.id);
      ids.filter((id, i) => ids.indexOf(id) !== i).forEach((id) => problems.push(`${classifyPath}: id が重複 ${id}`));
      const split = r.data.filter((x) => x.otani && x.mori && x.otani !== x.mori && !x.answer).length;
      console.log(`classify.json: ${r.data.length} 件（正解あり ${r.data.filter((x) => x.answer).length} 件、2人で割れて未決 ${split} 件）`);
    }
  }
}

// ---------- logs/*.json ----------
const logsDir = join(dir, 'logs');
if (existsSync(logsDir)) {
  for (const name of readdirSync(logsDir).filter((f) => f.endsWith('.json'))) {
    const path = join(logsDir, name);
    const data = readJson(path);
    if (data === undefined) continue;
    const r = ConversationLog.safeParse(data);
    if (!r.success) {
      zodIssues(path, r.error.issues);
      continue;
    }
    // 形は合っていても中身がつながっていないもの
    const seen = new Set<string>();
    for (const m of r.data.messages) {
      if (seen.has(m.id)) problems.push(`${path}: 発言の id が重複 ${m.id}`);
      if (m.replyTo && !seen.has(m.replyTo)) problems.push(`${path}: ${m.id} の replyTo（${m.replyTo}）がそれより前の発言にない`);
      seen.add(m.id);
    }
    for (const c of r.data.checkpoints) {
      if (!seen.has(c.after)) problems.push(`${path}: チェックポイントの after（${c.after}）が発言にない`);
      if (c.kind !== 'idea' && !c.parentLabelIncludes) problems.push(`${path}: ${c.after} の ${c.kind} に parentLabelIncludes がない`);
    }
    console.log(`logs/${name}: 発言 ${r.data.messages.length} 件、チェックポイント ${r.data.checkpoints.length} 件`);
  }
}

if (problems.length) {
  console.log('\n直すところ：');
  problems.forEach((p) => console.log(' - ' + p));
  process.exit(1);
}
console.log('OK');
