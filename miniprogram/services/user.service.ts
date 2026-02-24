// 用户服务
import { User, UserStats, UserInfo } from '../types/models';
import cloudService from './cloud.service';

class UserService {
  private static instance: UserService;
  private currentUser: User | null;
  private db: DB.Database | null;

  private constructor() {
    this.currentUser = null;
    this.db = null;
  }

  private getDb(): DB.Database {
    if (!this.db) {
      this.db = cloudService.getDatabase();
    }
    return this.db;
  }

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * 获取当前用户
   * @param forceRefresh 是否强制刷新，忽略缓存
   */
  public async getCurrentUser(forceRefresh: boolean = false): Promise<User> {
    if (this.currentUser && !forceRefresh) {
      return this.currentUser;
    }

    try {
      // 登录获取 openid
      const { openid } = await cloudService.login();

      // 查询用户信息
      const res = await this.getDb().collection('users').where({
        _openid: openid
      }).get();

      if (res.data && res.data.length > 0) {
        this.currentUser = res.data[0] as User;
      } else {
        // 用户不存在，创建新用户
        this.currentUser = await this.createUser(openid);
      }

      return this.currentUser;
    } catch (error) {
      console.error('获取当前用户失败:', error);
      throw error;
    }
  }

  /**
   * 生成随机昵称
   */
  private generateRandomNickname(): string {
    // 麻将相关的前缀词
    const prefixes = [
      '清一色', '七对子', '大三元', '小三元', '混一色',
      '碰碰胡', '全求人', '双暗刻', '三暗刻', '四暗刻',
      '东风', '南风', '西风', '北风', '红中',
      '发财', '白板', '一条龙', '九莲宝灯', '十三幺',
      '天胡', '地胡', '人胡', '杠上开花', '海底捞月',
      '河底捞鱼', '抢杠胡', '自摸', '点炮', '听牌'
    ];

    // 可爱/有趣的后缀
    const suffixes = [
      '小能手', '达人', '高手', '玩家', '爱好者',
      '专家', '大师', '王者', '传说', '冠军',
      '选手', '战士', '勇士', '精英', '强者',
      '萌新', '菜鸟', '学徒', '新星', '天才'
    ];

    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];

    return `${randomPrefix}${randomSuffix}`;
  }

  /**
   * 创建新用户（自动获取微信头像）
   */
  private async createUser(openid: string): Promise<User> {
    try {
      // 生成随机昵称
      let nickname = this.generateRandomNickname();
      let avatarUrl = '';

      try {
        // 尝试从本地缓存获取用户信息
        const userProfile = wx.getStorageSync('userProfile');
        if (userProfile) {
          avatarUrl = userProfile.avatarUrl || '';
          // 如果缓存中有昵称且不是默认值，使用缓存的昵称
          if (userProfile.nickName && userProfile.nickName !== '微信用户') {
            nickname = userProfile.nickName;
          }
        }
      } catch (e) {
        console.log('获取缓存用户信息失败', e);
      }

      // _openid 为云开发保留字段，由云端自动填充，客户端不能写入
      const newUserData = {
        nickname: nickname,
        avatarUrl: avatarUrl,
        stats: {
          totalGames: 0,
          totalWins: 0,
          totalLosses: 0,
          totalScoreChange: 0,
          totalMoneyChange: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const res = await this.getDb().collection('users').add({
        data: newUserData
      });

      const newUser = {
        _id: res._id,
        _openid: openid,
        ...newUserData
      } as User;

      // 保存用户信息到本地缓存
      try {
        wx.setStorageSync('userProfile', {
          nickName: nickname,
          avatarUrl: avatarUrl
        });
      } catch (e) {
        console.error('保存用户信息到本地失败', e);
      }

      return newUser;
    } catch (error) {
      console.error('创建用户失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户信息
   */
  public async updateUserInfo(userInfo: UserInfo): Promise<void> {
    try {
      const user = await this.getCurrentUser();

      await this.getDb().collection('users').doc(user._id).update({
        data: {
          nickname: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          updatedAt: new Date()
        }
      });

      // 更新缓存
      if (this.currentUser) {
        this.currentUser.nickname = userInfo.nickName;
        this.currentUser.avatarUrl = userInfo.avatarUrl;
        this.currentUser.updatedAt = new Date();
      }

      // 保存到本地存储，供下次创建用户时使用
      try {
        wx.setStorageSync('userProfile', {
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl
        });
      } catch (e) {
        console.error('保存用户信息到本地失败', e);
      }
    } catch (error) {
      console.error('更新用户信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户统计
   */
  public async getUserStats(): Promise<UserStats> {
    try {
      const user = await this.getCurrentUser();
      return user.stats;
    } catch (error) {
      console.error('获取用户统计失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户统计
   */
  public async updateUserStats(stats: Partial<UserStats>): Promise<void> {
    try {
      const user = await this.getCurrentUser();

      // 合并统计数据
      const updatedStats = {
        ...user.stats,
        ...stats
      };

      await this.getDb().collection('users').doc(user._id).update({
        data: {
          stats: updatedStats,
          updatedAt: new Date()
        }
      });

      // 更新缓存
      if (this.currentUser) {
        this.currentUser.stats = updatedStats;
        this.currentUser.updatedAt = new Date();
      }
    } catch (error) {
      console.error('更新用户统计失败:', error);
      throw error;
    }
  }

  /**
   * 清除用户缓存
   */
  public clearCache(): void {
    this.currentUser = null;
  }

  /**
   * 获取用户 openid
   */
  public async getOpenId(): Promise<string> {
    const user = await this.getCurrentUser();
    return user._openid;
  }
}

export default UserService.getInstance();
