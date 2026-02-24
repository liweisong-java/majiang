// 用户模型
export interface User {
  _id: string;
  _openid: string;
  nickname: string;
  avatarUrl: string;
  stats: UserStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserStats {
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  totalScoreChange: number;
  totalMoneyChange: number;
}

export interface UserInfo {
  nickName: string;
  avatarUrl: string;
}
