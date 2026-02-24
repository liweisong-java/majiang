// 云开发基础服务
class CloudService {
  private static instance: CloudService;
  private initialized: boolean;
  private env: string; // 云开发环境 ID

  private constructor() {
    this.initialized = false;
    this.env = '';
  }

  public static getInstance(): CloudService {
    if (!CloudService.instance) {
      CloudService.instance = new CloudService();
    }
    return CloudService.instance;
  }

  /**
   * 初始化云环境
   */
  public async init(envId?: string): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      if (!wx.cloud) {
        console.error('请使用 2.2.3 或以上的基础库以使用云能力');
        throw new Error('云开发不可用');
      }

      // 如果提供了环境 ID，使用指定的环境，否则使用默认环境
      if (envId) {
        this.env = envId;
        wx.cloud.init({
          env: envId,
          traceUser: true
        });
      } else {
        wx.cloud.init({
          traceUser: true
        });
      }

      this.initialized = true;
      console.log('云开发初始化成功');
    } catch (error) {
      console.error('云开发初始化失败:', error);
      throw error;
    }
  }

  /**
   * 用户登录，获取 openid
   */
  public async login(): Promise<{ openid: string }> {
    try {
      // 临时方案：直接使用 wx.cloud.callFunction 获取 openid
      // 如果云函数未部署，使用 mock 数据
      try {
        const result = await this.callFunction('login', {});
        if (result.openid) {
          return { openid: result.openid };
        }
      } catch (err) {
        console.warn('云函数 login 未部署，使用临时方案');
      }

      // 备用方案：使用持久化的临时 openid（开发阶段）
      let mockOpenid = '';
      try {
        mockOpenid = wx.getStorageSync('mock_openid');
      } catch (e) {
        console.error('读取本地 openid 失败', e);
      }

      if (!mockOpenid) {
        mockOpenid = 'mock_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        try {
          wx.setStorageSync('mock_openid', mockOpenid);
        } catch (e) {
          console.error('保存本地 openid 失败', e);
        }
      }

      console.log('使用临时 openid:', mockOpenid);
      return { openid: mockOpenid };

    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  }

  /**
   * 调用云函数
   */
  public async callFunction(name: string, data: any = {}): Promise<any> {
    if (!this.initialized) {
      throw new Error('云开发未初始化');
    }

    try {
      const res = await wx.cloud.callFunction({
        name,
        data
      });

      if (res.errMsg && res.errMsg.indexOf('ok') === -1) {
        throw new Error(res.errMsg);
      }

      return res.result;
    } catch (error) {
      console.error(`调用云函数 ${name} 失败:`, error);
      throw error;
    }
  }

  /**
   * 获取数据库引用
   */
  public getDatabase(): DB.Database {
    if (!this.initialized) {
      throw new Error('云开发未初始化');
    }
    return wx.cloud.database();
  }

  /**
   * 获取云存储引用
   */
  public getStorage() {
    if (!this.initialized) {
      throw new Error('云开发未初始化');
    }
    return wx.cloud;
  }

  /**
   * 检查是否已初始化
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
}

export default CloudService.getInstance();
