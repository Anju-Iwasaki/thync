// 見本データ（tests/fixtures/board-sample.json）を型付きで読み込む
// DBの行と同じ形なので、本番のデータが届く前の画面開発に使う
// 列名や型がDBとずれると、ここでビルドが失敗する
import json from '../../tests/fixtures/board-sample.json';
import type { Member, Message, Note, Reaction, Room } from '@/types/rows';

export type Sample = {
  room: Room;
  members: Member[];
  messages: Message[];
  reactions: Reaction[];
  notes: Note[];
};

export const sample: Sample = json;
