// 游戏记录模型
export interface GameRecord {
  _id: string;
  roomId: string;
  roundNumber: number;
  scores: ScoreEntry[];
  isBalanced: boolean;
  playedAt: Date;
}

export interface ScoreEntry {
  openid: string;
  nickname: string;
  scoreChange: number;
  note?: string;
}

export interface RecordData {
  scores: ScoreEntry[];
}

// 个人记账模型
export interface PersonalRecord {
  _id: string;
  _openid: string;
  gameType: string;
  settlementMode: 'score' | 'money';
  players: PersonalPlayer[];
  playedAt: Date;
  note?: string;
}

export interface PersonalPlayer {
  name: string;
  finalScore: number;
}

export interface PersonalRecordData {
  gameType: string;
  settlementMode: 'score' | 'money';
  players: PersonalPlayer[];
  note?: string;
}
