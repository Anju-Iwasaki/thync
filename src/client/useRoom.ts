'use client';
// 部屋のデータの読み込みとRealtimeの購読（岩崎）
// トーク（大槻）・ボード（森）・まとめ（大槻）は、ここから受け取ったデータを表示するだけ
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/browser';
import type { Member, Message, Note, Reaction, Room } from '@/types/rows';

export type RoomData = {
  room: Room | null;
  members: Member[];
  messages: Message[];
  reactions: Reaction[];
  notes: Note[];
  error: string | null;   // 読み込みかRealtimeの失敗。画面に出すこと
};

const empty: RoomData = { room: null, members: [], messages: [], reactions: [], notes: [], error: null };

// 同じIDの行があれば置き換え、なければ足す（二重にならない）
function upsertById<T extends { id: string }>(list: T[], row: T): T[] {
  return list.some((x) => x.id === row.id)
    ? list.map((x) => (x.id === row.id ? row : x))
    : [...list, row];
}

const sameReaction = (a: Reaction, b: Pick<Reaction, 'message_id' | 'member_id'>) =>
  a.message_id === b.message_id && a.member_id === b.member_id;

export function useRoom(roomId: string): RoomData {
  const [data, setData] = useState<RoomData>(empty);

  useEffect(() => {
    const set = (f: (d: RoomData) => RoomData) => setData((d) => f(d));
    const fail = (msg: string) => set((d) => ({ ...d, error: msg }));

    // 最初の読み込み。購読が繋がってから行う（繋がる前に起きた変更を取りこぼさないため）
    async function load() {
      const [r, m, msg, n] = await Promise.all([
        supabase.from('rooms').select('*').eq('id', roomId).single(),
        supabase.from('members').select('*').eq('room_id', roomId),
        supabase.from('messages').select('*').eq('room_id', roomId).order('created_at'),
        supabase.from('notes').select('*').eq('room_id', roomId).order('created_at'),
      ]);
      const err = r.error ?? m.error ?? msg.error ?? n.error;
      if (err) return fail(`読み込み失敗: ${err.message}`);

      // reactionsには room_idがないので、この部屋の発言のIDで絞る
      const ids = (msg.data ?? []).map((x) => x.id);
      let reactions: Reaction[] = [];
      if (ids.length) {
        const re = await supabase.from('reactions').select('*').in('message_id', ids);
        if (re.error) return fail(`読み込み失敗: ${re.error.message}`);
        reactions = re.data;
      }

      // 購読が先に届けた行と混ざってもいいように、置き換えではなく合流させる
      set((d) => ({
        room: r.data,
        members: (m.data ?? []).reduce(upsertById, d.members),
        messages: (msg.data ?? []).reduce(upsertById, d.messages),
        notes: (n.data ?? []).reduce(upsertById, d.notes),
        reactions: [...d.reactions.filter((x) => !reactions.some((y) => sameReaction(x, y))), ...reactions],
        error: null,
      }));
    }

    //DELETEのイベントは主キーしか届かず、filterでも絞れない。部屋で絞らずに受け取る
    const channel = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (p) => set((d) => ({ ...d, room: p.new as Room })))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'members', filter: `room_id=eq.${roomId}` },
        (p) => set((d) => ({ ...d, members: upsertById(d.members, p.new as Member) })))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (p) => p.eventType !== 'DELETE' && set((d) => ({ ...d, messages: upsertById(d.messages, p.new as Message) })))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notes', filter: `room_id=eq.${roomId}` },
        (p) => set((d) => ({ ...d, notes: upsertById(d.notes, p.new as Note) })))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notes' },
        (p) => set((d) => ({ ...d, notes: d.notes.filter((x) => x.id !== (p.old as { id: string }).id) })))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, (p) => {
        const key = (p.eventType === 'DELETE' ? p.old : p.new) as Reaction;
        set((d) => {
          const rest = d.reactions.filter((x) => !sameReaction(x, key));
          return { ...d, reactions: p.eventType === 'DELETE' ? rest : [...rest, p.new as Reaction] };
        });
      })
      .subscribe((status, err) => {
        // 失敗はエラーにならず何も届かないだけなので、必ず表に出す
        if (status === 'SUBSCRIBED') load();
        else fail(`Realtime: ${status} ${err?.message ?? ''}`);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return data;
}
