import userService from '../../services/user.service';
import haptic from '../../utils/haptic.util';

Component({
  properties: {
    user: {
      type: Object,
      value: null
    },
    showStats: {
      type: Boolean,
      value: true
    },
    /** 首页用浅色卡片，避免与操作区样式重合 */
    variant: {
      type: String,
      value: 'default' // 'default' | 'light'
    }
  },

  data: {
    winRate: '-',
    isEditingNickname: false,
    tempNickname: ''
  },

  observers: {
    'user.stats': function(stats) {
      if (stats && stats.totalGames > 0) {
        const rate = ((stats.totalWins / stats.totalGames) * 100).toFixed(1);
        this.setData({ winRate: rate + '%' });
      } else {
        this.setData({ winRate: '-' });
      }
    }
  },

  methods: {
    /**
     * 选择头像
     */
    async onChooseAvatar(e: any) {
      const { avatarUrl } = e.detail;
      if (!avatarUrl) return; // 用户取消

      try {
        haptic.light();
        wx.showLoading({ title: '上传中...' });

        const cloudPath = `avatars/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
        const uploadResult = await wx.cloud.uploadFile({
          cloudPath,
          filePath: avatarUrl
        });

        await userService.updateUserInfo({
          nickName: this.data.user.nickname || '新用户',
          avatarUrl: uploadResult.fileID
        });

        haptic.success();
        wx.showToast({ title: '头像更新成功', icon: 'success' });
        this.triggerEvent('userupdate');
      } catch (error: any) {
        // 用户主动取消不报错
        const msg = error?.message || error?.errMsg || '';
        if (msg.includes('cancel') || msg.includes('fail cancel')) return;

        console.error('更新头像失败:', error);
        haptic.error();
        wx.showToast({ title: '上传失败，请重试', icon: 'none' });
      } finally {
        wx.hideLoading();
      }
    },

    /**
     * 开始编辑昵称
     */
    startEditNickname() {
      haptic.light();
      this.setData({
        isEditingNickname: true,
        tempNickname: this.data.user.nickname || ''
      });
    },

    /**
     * 昵称输入
     */
    onNicknameInput(e: any) {
      this.setData({
        tempNickname: e.detail.value
      });
    },

    /**
     * 确认昵称
     */
    async confirmNickname() {
      try {
        const nickname = this.data.tempNickname.trim();

        // 如果昵称为空或未改变，不更新
        if (!nickname) {
          wx.showToast({
            title: '请输入昵称',
            icon: 'none'
          });
          return;
        }

        if (nickname === this.data.user.nickname) {
          this.setData({ isEditingNickname: false });
          return;
        }

        haptic.light();
        wx.showLoading({ title: '保存中...' });

        // 更新用户信息
        await userService.updateUserInfo({
          nickName: nickname,
          avatarUrl: this.data.user.avatarUrl || ''
        });

        haptic.success();
        wx.showToast({
          title: '昵称更新成功',
          icon: 'success'
        });

        this.setData({ isEditingNickname: false });

        // 触发更新事件
        this.triggerEvent('userupdate');
      } catch (error) {
        console.error('更新昵称失败:', error);
        haptic.error();
        wx.showToast({
          title: '更新失败',
          icon: 'error'
        });
      } finally {
        wx.hideLoading();
      }
    },

    /**
     * 取消编辑
     */
    cancelEdit() {
      haptic.light();
      this.setData({
        isEditingNickname: false,
        tempNickname: ''
      });
    }
  }
})
