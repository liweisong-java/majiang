// app.ts
import cloudService from './services/cloud.service';
import userService from './services/user.service';
import themeService from './services/theme.service';

App<IAppOption>({
  globalData: {
    userInfo: null,
    statusBarHeight: 0,
    navBarHeight: 0
  },

  async onLaunch(options: any) {
    console.log('小程序启动', options);

    // 获取系统信息
    this.initSystemInfo();

    // 初始化主题
    themeService.init();

    // 初始化云开发
    await this.initCloud();

    // 判断是否已有用户身份
    let hasExistingUser = false;
    try {
      // 检查是否有本地存储的 openid（表示用户之前登录过）
      const mockOpenid = wx.getStorageSync('mock_openid');
      hasExistingUser = !!mockOpenid;
    } catch (e) {
      console.error('检查本地用户失败', e);
    }

    // 场景值判断
    const shareScenes = [1007, 1008, 1011, 1012, 1013, 1020, 1035, 1036, 1044];
    const isFromShare = shareScenes.includes(options.scene);

    if (isFromShare && !hasExistingUser) {
      // 从分享进入且是新用户，清除缓存，等待 join-room 页面创建新用户
      console.log('新用户从分享链接进入，等待创建用户');
      userService.clearCache();
    } else {
      // 已有用户或正常启动，使用缓存自动登录
      console.log('使用已有用户身份自动登录');
      await this.autoLogin();
    }
  },

  /**
   * 初始化系统信息
   */
  initSystemInfo() {
    try {
      const systemInfo = wx.getSystemInfoSync();
      this.globalData.statusBarHeight = systemInfo.statusBarHeight || 0;

      // 导航栏内容区高度（不含状态栏）
      const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
      const navBarContentHeight = menuButtonInfo.height + (menuButtonInfo.top - systemInfo.statusBarHeight) * 2;
      // 页面内容区 padding-top 用「状态栏 + 导航栏」总高度，避免顶部被遮挡
      const navBarHeight = (systemInfo.statusBarHeight || 0) + navBarContentHeight;
      this.globalData.navBarHeight = navBarHeight;

      console.log('系统信息初始化完成:', {
        statusBarHeight: this.globalData.statusBarHeight,
        navBarHeight: this.globalData.navBarHeight
      });
    } catch (error) {
      console.error('获取系统信息失败:', error);
    }
  },

  /**
   * 初始化云开发
   */
  async initCloud() {
    try {
      // 注意：在实际使用时，需要在这里填入你的云开发环境 ID
      // 或者在 project.config.json 中配置
      await cloudService.init();
      console.log('云开发初始化成功');
    } catch (error) {
      console.error('云开发初始化失败:', error);
      wx.showToast({
        title: '云服务初始化失败',
        icon: 'none'
      });
    }
  },

  /**
   * 自动登录
   */
  async autoLogin() {
    try {
      const user = await userService.getCurrentUser();
      this.globalData.userInfo = {
        nickName: user.nickname,
        avatarUrl: user.avatarUrl
      };
      console.log('自动登录成功:', user);
    } catch (error) {
      console.error('自动登录失败:', error);
      // 登录失败不阻断应用启动，可以在需要时再次尝试登录
    }
  },

  /**
   * 更新用户信息
   */
  async updateUserInfo(userInfo: { nickName: string; avatarUrl: string }) {
    try {
      await userService.updateUserInfo(userInfo);
      this.globalData.userInfo = userInfo;
      console.log('用户信息更新成功');
    } catch (error) {
      console.error('用户信息更新失败:', error);
      throw error;
    }
  }
})