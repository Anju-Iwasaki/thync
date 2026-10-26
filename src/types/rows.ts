// DBの行の型に短い名前を付けただけ。中身は database.ts（自動生成）
import type { Tables } from './database';

export type Room = Tables<'rooms'>;
export type Member = Tables<'members'>;
export type Message = Tables<'messages'>;
export type Reaction = Tables<'reactions'>;
export type Note = Tables<'notes'>;
export type Job = Tables<'analysis_jobs'>;
