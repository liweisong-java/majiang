// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { roomName, gameType, settlementMode, basePoint, initialMembers } = event

  try {
    // 生成邀请码
    const inviteCode = generateInviteCode()

    // 创建房间
    const result = await db.collection('rooms').add({
      data: {
        roomName,
        gameType,
        settlementMode,
        basePoint,
        status: 'active',
        members: initialMembers || [],
        inviteCode,
        totalRounds: 0,
        createdAt: new Date(),
        _openid: wxContext.OPENID
      }
    })

    return {
      success: true,
      roomId: result._id,
      inviteCode
    }
  } catch (error) {
    console.error('创建房间失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 生成邀请码
function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
