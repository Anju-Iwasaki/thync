import { z } from 'zod';

export const AnalysisMode = z.enum(['reaction', 'all']);
export type AnalysisMode = z.infer<typeof AnalysisMode>;

export const NoteKind = z.enum(['idea', 'problem', 'solution', 'reason']);
export type NoteKind = z.infer<typeof NoteKind>;

export const Trigger = z.enum(['reaction', 'reply', 'message']);
export type Trigger = z.infer<typeof Trigger>;

export const JobStatus = z.enum(['pending', 'running', 'done', 'failed']);
export type JobStatus = z.infer<typeof JobStatus>;

export const ReactionValue = z.enum(['pro', 'con']);
export type ReactionValue = z.infer<typeof ReactionValue>;