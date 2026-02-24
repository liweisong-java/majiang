// 记录服务
import { GameRecord, RecordData, PersonalRecord, PersonalRecordData } from '../types/models';
import cloudService from './cloud.service';
import userService from './user.service';
import roomService from './room.service';

class RecordService {
  private static instance: RecordService;
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

  public static getInstance(): RecordService {
    if (!RecordService.instance) {
      RecordService.instance = new RecordService();
    }
    return RecordService.instance;
  }

  /**
   * 检查分数是否平衡
   */
  private checkBalance(scores: { scoreChange: number }[]): boolean {
    const sum = scores.reduce((acc, score) => acc + score.scoreChange, 0);
    return Math.abs(sum) < 0.01; // 允许浮点数误差
  }

  /**
   * 添加游戏记录
   */
  public async addRecord(roomId: string, data: RecordData): Promise<GameRecord> {
    try {
      // 获取房间信息
      const room = await roomService.getRoomDetail(roomId);

      // 检查分数是否平衡
      const isBalanced = this.checkBalance(data.scores);

      // 创建记录
      const newRecord = {
        roomId,
        roundNumber: room.totalRounds + 1,
        scores: data.scores,
        isBalanced,
        playedAt: new Date()
      };

      const res = await this.getDb().collection('game_records').add({
        data: newRecord
      });

      // 更新房间总局数
      await this.getDb().collection('rooms').doc(roomId).update({
        data: {
          totalRounds: this.getDb().command.inc(1)
        }
      });

      // 更新每个成员的余额
      for (const score of data.scores) {
        const member = room.members.find(m => m.openid === score.openid);
        if (member) {
          member.currentBalance += score.scoreChange;
        }
      }

      await this.getDb().collection('rooms').doc(roomId).update({
        data: {
          members: room.members
        }
      });

      return {
        _id: res._id,
        ...newRecord
      } as GameRecord;
    } catch (error) {
      console.error('添加记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取房间记录列表
   */
  public async getRoomRecords(roomId: string): Promise<GameRecord[]> {
    try {
      const res = await this.getDb().collection('game_records')
        .where({ roomId })
        .orderBy('roundNumber', 'desc')
        .get();

      return res.data as GameRecord[];
    } catch (error) {
      console.error('获取房间记录失败:', error);
      throw error;
    }
  }

  /**
   * 删除记录
   */
  public async deleteRecord(recordId: string): Promise<void> {
    try {
      // 获取记录详情
      const record = await this.getDb().collection('game_records').doc(recordId).get();
      if (!record.data) {
        throw new Error('记录不存在');
      }

      const gameRecord = record.data as GameRecord;

      // 删除记录
      await this.getDb().collection('game_records').doc(recordId).remove();

      // 回退房间成员余额
      const room = await roomService.getRoomDetail(gameRecord.roomId);
      for (const score of gameRecord.scores) {
        const member = room.members.find(m => m.openid === score.openid);
        if (member) {
          member.currentBalance -= score.scoreChange;
        }
      }

      await this.getDb().collection('rooms').doc(gameRecord.roomId).update({
        data: {
          members: room.members,
          totalRounds: this.getDb().command.inc(-1)
        }
      });
    } catch (error) {
      console.error('删除记录失败:', error);
      throw error;
    }
  }

  /**
   * 添加个人记账
   */
  public async addPersonalRecord(data: PersonalRecordData): Promise<PersonalRecord> {
    try {
      const openid = await userService.getOpenId();

      // _openid 由云开发自动填充，不能写入
      const newRecordData = {
        gameType: data.gameType,
        settlementMode: data.settlementMode,
        players: data.players,
        playedAt: new Date(),
        note: data.note
      };

      const res = await this.getDb().collection('personal_records').add({
        data: newRecordData
      });

      return {
        _id: res._id,
        _openid: openid,
        ...newRecordData
      } as PersonalRecord;
    } catch (error) {
      console.error('添加个人记账失败:', error);
      throw error;
    }
  }

  /**
   * 获取个人记账列表
   */
  public async getPersonalRecords(): Promise<PersonalRecord[]> {
    try {
      const openid = await userService.getOpenId();

      const res = await this.getDb().collection('personal_records')
        .where({ _openid: openid })
        .orderBy('playedAt', 'desc')
        .get();

      return res.data as PersonalRecord[];
    } catch (error) {
      console.error('获取个人记账列表失败:', error);
      throw error;
    }
  }
}

export default RecordService.getInstance();
