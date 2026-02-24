const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const { roomId } = event;
  const wxContext = cloud.getWXContext();

  try {
    const roomRes = await db.collection('rooms').doc(roomId).get();
    if (!roomRes.data) {
      return { success: false, error: '房间不存在' };
    }

    const room = roomRes.data;

    // 防止重复结算
    if (room.status === 'settled') {
      return { success: true, updatedUsers: 0 };
    }

    // 必须是房间成员才能触发结算
    const isMember = room.members.some(m => m.openid === wxContext.OPENID);
    if (!isMember) {
      return { success: false, error: '你不是房间成员' };
    }

    // 1. 更新房间状态
    const updatedMembers = room.members.map(m => ({ ...m, memberStatus: 'left' }));
    await db.collection('rooms').doc(roomId).update({
      data: {
        status: 'settled',
        settledAt: new Date(),
        members: updatedMembers
      }
    });

    // 2. 更新所有成员统计
    let updatedUsersCount = 0;
    for (const member of room.members) {
      try {
        const userRes = await db.collection('users')
          .where({ _openid: member.openid })
          .get();

        if (userRes.data && userRes.data.length > 0) {
          const user = userRes.data[0];
          const s = user.stats || { totalGames: 0, totalWins: 0, totalLosses: 0, totalScoreChange: 0, totalMoneyChange: 0 };
          const isWin = member.currentBalance > 0;
          const isLoss = member.currentBalance < 0;

          await db.collection('users').doc(user._id).update({
            data: {
              stats: {
                totalGames: s.totalGames + 1,
                totalWins: s.totalWins + (isWin ? 1 : 0),
                totalLosses: s.totalLosses + (isLoss ? 1 : 0),
                totalScoreChange: s.totalScoreChange + member.currentBalance,
                totalMoneyChange: s.totalMoneyChange + member.currentBalance
              },
              updatedAt: new Date()
            }
          });
          updatedUsersCount++;
        }
      } catch (err) {
        console.error(`更新用户 ${member.nickname} 统计失败:`, err);
      }
    }

    return { success: true, updatedUsers: updatedUsersCount };
  } catch (error) {
    console.error('结算房间失败:', error);
    return { success: false, error: error.message };
  }
};
