// 端末からDBへの書き込み 担当：岩崎
import { supabase } from '@/lib/supabase/browser';
import type { Message } from '@/types/rows';
import type { ReactionValue } from '@/types/domain';

export async function sendMessage(
  roomId: string,
  memberId: string,
  body: string,
  replyTo?: string
): Promise<Message> {
  throw new Error('未実装: sendMessage');
}

export async function react(
  messageId: string,
  memberId: string,
  value: ReactionValue
): Promise<void> {
  throw new Error('未実装: react');
}

export async function unreact(messageId: string, memberId: string): Promise<void> {
  throw new Error('未実装: unreact');
}

export async function retractMessage(messageId: string, memberId: string): Promise<void> {
  throw new Error('未実装: retractMessage');
}
