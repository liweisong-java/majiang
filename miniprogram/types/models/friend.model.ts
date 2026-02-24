// 牌友模型
export interface Friend {
  _id: string;
  _openid: string;
  friendOpenid: string;
  friendNickname: string;
  friendAvatarUrl: string;
  frequency: number;
  stats: FriendStats;
  lastPlayedAt: Date;
  addedAt: Date;
}

export interface FriendStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  totalScoreChange: number;
}

export interface OpponentStats {
  openid: string;
  nickname: string;
  avatarUrl: string;
  gamesPlayed: number;
  winRate: number;
  totalScoreChange: number;
}
