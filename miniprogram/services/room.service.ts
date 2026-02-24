// 房间服务
import { Room, CreateRoomData, RoomStatus, RoomMember, BalanceChange } from '../types/models';
import cloudService from './cloud.service';
import userService from './user.service';

class RoomService {
  private static instance: RoomService;
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

  public static getInstance(): RoomService {
    if (!RoomService.instance) {
      RoomService.instance = new RoomService();
    }
    return RoomService.instance;
  }

  /**
   * 生成唯一的邀请码(带重复检查)
   */
  private async generateInviteCode(): Promise<string> {
    const maxRetries = 5;

    for (let i = 0; i < maxRetries; i++) {
      const code = this.generateRandomCode();

      // 检查是否已存在（只查询活跃房间）
      const res = await this.getDb().collection('rooms')
        .where({
          inviteCode: code,
          status: 'active'
        })
        .count();

      if (res.total === 0) {
        console.log(`生成邀请码成功: ${code} (第${i + 1}次尝试)`);
        return code;
      }

      console.warn(`邀请码 ${code} 已存在,重新生成 (第${i + 1}次尝试)`);
    }

    // 重试失败,使用时间戳降级方案
    const fallbackCode = this.generateRandomCode().slice(0, 4) + Date.now().toString(36).slice(-2).toUpperCase();
    console.warn(`邀请码生成使用降级方案: ${fallbackCode}`);
    return fallbackCode;
  }

  /**
   * 生成随机邀请码(不检查唯一性)
   */
  private generateRandomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * 创建房间（转积分版：仅房间名，其余用默认）
   */
  public async createRoom(data: CreateRoomData): Promise<Room> {
    try {
      const user = await userService.getCurrentUser();
      const inviteCode = await this.generateInviteCode();

      const members: RoomMember[] = [
        {
          openid: user._openid,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
          role: 'creator',
          currentBalance: 0
        }
      ];

      if (data.initialMembers && data.initialMembers.length > 0) {
        data.initialMembers.forEach(member => {
          members.push({
            ...member,
            role: 'member',
            currentBalance: 0
          });
        });
      }

      // 转积分版：仅房间名，类型/底分等用默认
      const newRoomData = {
        roomName: data.roomName,
        gameType: data.gameType ?? 'majiang',
        settlementMode: data.settlementMode ?? 'score',
        basePoint: data.basePoint ?? 1,
        status: 'active' as RoomStatus,
        members,
        inviteCode,
        totalRounds: 0,
        balanceHistory: [],  // 初始化积分变动历史
        createdAt: new Date()
      };

      const res = await this.getDb().collection('rooms').add({
        data: newRoomData
      });

      return {
        _id: res._id,
        _openid: user._openid,
        ...newRoomData
      } as Room;
    } catch (error) {
      console.error('创建房间失败:', error);
      throw error;
    }
  }

  /**
   * 加入房间
   */
  public async joinRoom(inviteCode: string): Promise<Room> {
    try {
      // 确保用户已登录，如果没有账号会自动创建
      const user = await userService.getCurrentUser(false);

      if (!user || !user._openid) {
        throw new Error('用户信息获取失败，请重试');
      }

      console.log('=== 加入房间 ===');
      console.log('邀请码:', inviteCode);
      console.log('用户OpenID:', user._openid);
      console.log('用户昵称:', user.nickname);

      // 查找房间
      const res = await this.getDb().collection('rooms').where({
        inviteCode,
        status: 'active'
      }).get();

      if (!res.data || res.data.length === 0) {
        throw new Error('房间不存在或已结束');
      }

      const room = res.data[0] as Room;
      console.log('找到房间:', room._id);
      console.log('房间成员数量:', room.members.length);
      console.log('当前成员列表:', room.members);

      // 检查用户是否已在房间中
      const isAlreadyMember = room.members.some(m => m.openid === user._openid);
      if (isAlreadyMember) {
        console.log('用户已在房间中，直接返回房间信息');
        return room;
      }

      // 添加用户到房间 - 使用完整数组更新而不是 command.push
      const newMember: RoomMember = {
        openid: user._openid,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        role: 'member',
        currentBalance: 0
      };

      console.log('添加新成员:', newMember);

      // 创建新的成员数组
      const updatedMembers = [...room.members, newMember];
      console.log('更新后的成员数组:', updatedMembers);

      // 使用完整数组更新，而不是 command.push
      const updateResult = await this.getDb().collection('rooms').doc(room._id).update({
        data: {
          members: updatedMembers
        }
      });

      console.log('数据库更新结果:', updateResult);
      console.log('数据库更新成功，等待同步...');

      // 等待数据同步
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 重新获取房间数据，确保返回最新的成员列表
      const updatedRoom = await this.getRoomDetail(room._id);
      console.log('重新获取房间数据，成员数量:', updatedRoom.members.length);
      console.log('重新获取的成员列表:', updatedRoom.members);

      return updatedRoom;
    } catch (error) {
      console.error('加入房间失败:', error);
      throw error;
    }
  }

  /**
   * 获取房间详情
   */
  public async getRoomDetail(roomId: string): Promise<Room> {
    try {
      console.log('=== 获取房间详情 ===');
      console.log('房间ID:', roomId);

      const res = await this.getDb().collection('rooms').doc(roomId).get();

      console.log('数据库返回:', res);
      console.log('房间数据:', res.data);

      if (!res.data) {
        throw new Error('房间不存在');
      }

      const room = res.data as Room;
      console.log('房间成员数量:', room.members?.length || 0);
      console.log('房间成员列表:', room.members);

      return room;
    } catch (error) {
      console.error('获取房间详情失败:', error);
      throw error;
    }
  }

  /**
   * 获取我的房间列表
   */
  public async getMyRooms(status?: RoomStatus): Promise<Room[]> {
    try {
      const openid = await userService.getOpenId();

      const query: any = {
        'members.openid': openid
      };

      if (status) {
        query.status = status;
      }

      const res = await this.getDb().collection('rooms')
        .where(query)
        .orderBy('createdAt', 'desc')
        .get();

      return res.data as Room[];
    } catch (error) {
      console.error('获取房间列表失败:', error);
      throw error;
    }
  }

  /**
   * 结算房间：使用云函数进行结算
   * 客户端无法跨用户更新数据,必须使用云函数(有管理员权限)
   */
  public async settleRoom(roomId: string): Promise<void> {
    try {
      // 调用云函数进行结算
      const result: any = await cloudService.callFunction('settleRoom', { roomId });

      if (!result.success) {
        throw new Error(result.error || '结算失败');
      }

      console.log('房间结算成功');
      console.log(`已更新 ${result.updatedUsers} 个用户统计`);
      console.log(`已更新 ${result.updatedFriends} 条牌友关系`);
    } catch (error) {
      console.error('结算房间失败:', error);
      throw error;
    }
  }

  /**
   * 降级结算：云函数不可用时，直接更新房间状态为 settled
   */
  public async forceSettle(roomId: string): Promise<void> {
    await this.getDb().collection('rooms').doc(roomId).update({
      data: {
        status: 'settled',
        settledAt: new Date()
      }
    });
  }

  /**
   * 退出房间（标记为已退出，保留积分记录）
   */
  public async leaveRoom(roomId: string, openid: string): Promise<void> {
    try {
      const room = await this.getRoomDetail(roomId);

      // 检查房间状态
      if (room.status !== 'active') {
        throw new Error('房间已结束，无法退出');
      }

      // 检查用户是否在房间中
      const memberIndex = room.members.findIndex(m => m.openid === openid);
      if (memberIndex === -1) {
        throw new Error('你不在此房间中');
      }

      // 标记为已退出，保留积分数据
      const updatedMembers = room.members.map(m => {
        if (m.openid === openid) {
          return { ...m, memberStatus: 'left' as const };
        }
        return m;
      });

      await this.getDb().collection('rooms').doc(roomId).update({
        data: {
          members: updatedMembers
        }
      });

      // 检查是否所有成员都已退出，如果是则自动结算房间
      const allMembersLeft = updatedMembers.every(m => m.memberStatus === 'left');

      if (allMembersLeft) {
        try {
          await this.settleRoom(roomId);
        } catch (settleError) {
          console.warn('云函数结算失败，降级更新房间状态:', settleError);
          await this.forceSettle(roomId);
        }
      }
    } catch (error) {
      console.error('退出房间失败:', error);
      throw error;
    }
  }

  /**
   * 监听房间变化
   */
  public watchRoom(roomId: string, callback: (room: Room) => void): DB.Watcher {
    const watcher = this.getDb().collection('rooms')
      .doc(roomId)
      .watch({
        onChange: (snapshot) => {
          if (snapshot.docs && snapshot.docs.length > 0) {
            callback(snapshot.docs[0] as Room);
          }
        },
        onError: (err) => {
          console.error('监听房间变化失败:', err);
        }
      });

    return watcher;
  }

  /**
   * 更新房间成员余额（单成员）
   */
  public async updateMemberBalance(roomId: string, openid: string, balanceChange: number): Promise<void> {
    try {
      const room = await this.getRoomDetail(roomId);
      const memberIndex = room.members.findIndex(m => m.openid === openid);

      if (memberIndex === -1) {
        throw new Error('成员不存在');
      }

      room.members[memberIndex].currentBalance += balanceChange;

      await this.getDb().collection('rooms').doc(roomId).update({
        data: {
          members: room.members
        }
      });
    } catch (error) {
      console.error('更新成员余额失败:', error);
      throw error;
    }
  }

  /**
   * 转积分：从 fromOpenid 转 amount 给 toOpenid（零和）
   */
  public async transferPoints(roomId: string, fromOpenid: string, toOpenid: string, amount: number): Promise<void> {
    if (amount <= 0) {
      throw new Error('转出积分必须大于 0');
    }

    if (!Number.isInteger(amount)) {
      throw new Error('积分必须是整数');
    }

    const room = await this.getRoomDetail(roomId);

    // 验证零和原则：转账前所有成员积分总和应该为0
    const beforeSum = room.members.reduce((sum, m) => sum + (m.currentBalance || 0), 0);
    if (Math.abs(beforeSum) > 0.01) {
      console.warn(`警告：转账前积分总和不为零！当前总和: ${beforeSum}`);
    }

    if (room.status !== 'active') {
      throw new Error('房间已结束，无法转积分');
    }

    const fromIdx = room.members.findIndex(m => m.openid === fromOpenid);
    const toIdx = room.members.findIndex(m => m.openid === toOpenid);

    if (fromIdx === -1 || toIdx === -1) {
      throw new Error('成员不存在');
    }

    if (fromOpenid === toOpenid) {
      throw new Error('不能转给自己');
    }

    const fromMember = room.members[fromIdx];
    const toMember = room.members[toIdx];

    // 已退出的成员不能转积分
    if (fromMember.memberStatus === 'left' || toMember.memberStatus === 'left') {
      throw new Error('已退出的成员不能转积分');
    }

    const currentBalance = fromMember.currentBalance || 0;

    // 检查余额是否足够（允许负数余额，但要提示）
    if (currentBalance - amount < -1000) {
      throw new Error('余额不足，当前积分：' + currentBalance);
    }

    // 深拷贝成员数组，确保不修改原对象
    const nextMembers = room.members.map(m => ({ ...m }));

    // 转出者减少积分
    nextMembers[fromIdx].currentBalance = currentBalance - amount;

    // 接收者增加积分
    nextMembers[toIdx].currentBalance = (nextMembers[toIdx].currentBalance || 0) + amount;

    // 创建积分变动记录
    const balances: { [openid: string]: number } = {};
    nextMembers.forEach(m => {
      balances[m.openid] = m.currentBalance;
    });

    const balanceChange: BalanceChange = {
      timestamp: new Date(),
      fromOpenid: fromOpenid,
      fromNickname: fromMember.nickname,
      toOpenid: toOpenid,
      toNickname: toMember.nickname,
      amount: amount,
      balances: balances
    };

    // 获取现有历史记录
    const balanceHistory = room.balanceHistory || [];
    balanceHistory.push(balanceChange);

    // 验证零和原则：转账后所有成员积分总和应该仍为0
    const afterSum = nextMembers.reduce((sum, m) => sum + (m.currentBalance || 0), 0);
    if (Math.abs(afterSum) > 0.01) {
      console.error(`错误：转账后积分总和不为零！当前总和: ${afterSum}`);
      throw new Error('转账失败：积分总和不平衡');
    }

    await this.getDb().collection('rooms').doc(roomId).update({
      data: {
        members: nextMembers,
        balanceHistory: balanceHistory
      }
    });
  }
}

export default RoomService.getInstance();
