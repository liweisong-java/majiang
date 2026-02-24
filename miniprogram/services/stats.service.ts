// 统计服务 - 直接从已结束房间实时计算，不依赖云函数写入的 user.stats
import cloudService from './cloud.service';
import userService from './user.service';

export interface OverallStats {
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  totalScoreChange: number;
  averageScore: number;
}

class StatsService {
  private static instance: StatsService;
  private db: DB.Database | null = null;

  private getDb(): DB.Database {
    if (!this.db) {
      this.db = cloudService.getDatabase();
    }
    return this.db;
  }

  public static getInstance(): StatsService {
    if (!StatsService.instance) {
      StatsService.instance = new StatsService();
    }
    return StatsService.instance;
  }

  /**
   * 从已结束的房间实时计算总览统计
   */
  public async getOverallStats(): Promise<OverallStats> {
    const openid = await userService.getOpenId();

    const res = await this.getDb().collection('rooms')
      .where({ 'members.openid': openid, status: 'settled' })
      .get();

    let totalGames = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let totalScoreChange = 0;

    for (const room of res.data) {
      const me = (room.members || []).find((m: any) => m.openid === openid);
      if (!me) continue;
      totalGames++;
      const balance = me.currentBalance || 0;
      totalScoreChange += balance;
      if (balance > 0) totalWins++;
      else if (balance < 0) totalLosses++;
    }

    return {
      totalGames,
      totalWins,
      totalLosses,
      winRate: totalGames > 0 ? (totalWins / totalGames) * 100 : 0,
      totalScoreChange,
      averageScore: totalGames > 0 ? totalScoreChange / totalGames : 0
    };
  }

  /**
   * 获取近 N 天的累计积分趋势
   */
  public async getTrendData(days: number = 7): Promise<{ dates: string[]; scores: number[] }> {
    const openid = await userService.getOpenId();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const res = await this.getDb().collection('rooms')
      .where({
        'members.openid': openid,
        status: 'settled',
        settledAt: this.getDb().command.gte(startDate)
      })
      .orderBy('settledAt', 'asc')
      .get();

    const recordsByDate: { [key: string]: number } = {};

    for (const room of res.data) {
      if (!room.settledAt) continue;
      const date = new Date(room.settledAt);
      const key = `${date.getMonth() + 1}/${date.getDate()}`;
      const me = (room.members || []).find((m: any) => m.openid === openid);
      if (me) {
        recordsByDate[key] = (recordsByDate[key] || 0) + (me.currentBalance || 0);
      }
    }

    const dates: string[] = [];
    const scores: number[] = [];
    let cumulative = 0;

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      dates.push(key);
      cumulative += recordsByDate[key] || 0;
      scores.push(cumulative);
    }

    return { dates, scores };
  }
}

export default StatsService.getInstance();
