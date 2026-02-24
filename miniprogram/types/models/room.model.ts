// 房间模型
export type GameType = 'majiang' | 'poker' | 'doudizhu' | 'other';
export type SettlementMode = 'score' | 'money';
export type RoomStatus = 'active' | 'settled' | 'archived';
export type MemberRole = 'creator' | 'member';
export type MemberStatus = 'active' | 'left';

export interface Room {
  _id: string;
  _openid: string;
  roomName: string;
  gameType: GameType;
  settlementMode: SettlementMode;
  basePoint?: number;
  status: RoomStatus;
  members: RoomMember[];
  inviteCode: string;
  qrCodeUrl?: string;
  totalRounds: number;
  createdAt: Date;
  settledAt?: Date;
  balanceHistory?: BalanceChange[];  // 积分变动历史
}

export interface RoomMember {
  openid: string;
  nickname: string;
  avatarUrl: string;
  role: MemberRole;
  currentBalance: number;
  memberStatus?: MemberStatus;  // 成员状态，默认 active
}

/** 积分变动记录 */
export interface BalanceChange {
  timestamp: Date;           // 变动时间
  fromOpenid: string;        // 转出者 openid
  fromNickname: string;      // 转出者昵称
  toOpenid: string;          // 接收者 openid
  toNickname: string;        // 接收者昵称
  amount: number;            // 转账金额
  balances: {                // 变动后所有成员的积分快照
    [openid: string]: number;
  };
}

/** 创建房间（转积分版：仅房间名） */
export interface CreateRoomData {
  roomName: string;
  /** 兼容旧版，不填则用默认 */
  gameType?: GameType;
  settlementMode?: SettlementMode;
  basePoint?: number;
  initialMembers?: Array<{
    openid: string;
    nickname: string;
    avatarUrl: string;
  }>;
}
