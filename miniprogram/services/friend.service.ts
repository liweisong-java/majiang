// 牌友服务
import { Friend, OpponentStats } from '../types/models';
import cloudService from './cloud.service';
import userService from './user.service';

class FriendService {
  private static instance: FriendService;
  private db: DB.Database | null;

  private constructor() {
    this.db = null;
  }

  private getDb(): DB.Database {
    if (!this.db) {
      this.db = cloudService.getDatabase();
    }
    return this.db;
  }

  public static getInstance(): FriendService {
    if (!FriendService.instance) {
      FriendService.instance = new FriendService();
    }
    return FriendService.instance;
  }

  /**
   * 获取牌友列表
   */
  public async getFriends(): Promise<Friend[]> {
    try {
      const openid = await userService.getOpenId();

      const res = await this.getDb().collection('friends')
        .where({ _openid: openid })
        .orderBy('frequency', 'desc')
        .get();

      return res.data as Friend[];
    } catch (error) {
      console.error('获取牌友列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取牌友统计
   */
  public async getFriendStats(friendOpenid: string): Promise<Friend | null> {
    try {
      const openid = await userService.getOpenId();

      const res = await this.getDb().collection('friends')
        .where({
          _openid: openid,
          friendOpenid
        })
        .get();

      if (res.data && res.data.length > 0) {
        return res.data[0] as Friend;
      }

      return null;
    } catch (error) {
      console.error('获取牌友统计失败:', error);
      throw error;
    }
  }

  /**
   * 添加或更新牌友
   */
  public async addOrUpdateFriend(
    friendOpenid: string,
    friendNickname: string,
    friendAvatarUrl: string,
    scoreChange: number
  ): Promise<void> {
    try {
      const openid = await userService.getOpenId();

      // 检查是否已存在
      const existingFriend = await this.getFriendStats(friendOpenid);

      if (existingFriend) {
        // 更新统计
        const updatedStats = {
          gamesPlayed: existingFriend.stats.gamesPlayed + 1,
          wins: scoreChange > 0 ? existingFriend.stats.wins + 1 : existingFriend.stats.wins,
          losses: scoreChange < 0 ? existingFriend.stats.losses + 1 : existingFriend.stats.losses,
          totalScoreChange: existingFriend.stats.totalScoreChange + scoreChange
        };

        await this.getDb().collection('friends').doc(existingFriend._id).update({
          data: {
            frequency: this.getDb().command.inc(1),
            stats: updatedStats,
            lastPlayedAt: new Date()
          }
        });
      } else {
        // 创建新牌友（_openid 由云开发自动填充，不能写入）
        await this.getDb().collection('friends').add({
          data: {
            friendOpenid,
            friendNickname,
            friendAvatarUrl,
            frequency: 1,
            stats: {
              gamesPlayed: 1,
              wins: scoreChange > 0 ? 1 : 0,
              losses: scoreChange < 0 ? 1 : 0,
              totalScoreChange: scoreChange
            },
            lastPlayedAt: new Date(),
            addedAt: new Date()
          }
        });
      }
    } catch (error) {
      console.error('添加或更新牌友失败:', error);
      throw error;
    }
  }
}

export default FriendService.getInstance();
