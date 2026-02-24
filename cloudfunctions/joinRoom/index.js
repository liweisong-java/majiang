// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { inviteCode } = event

  try {
    // 查找房间
    const roomResult = await db.collection('rooms')
      .where({
        inviteCode,
        status: 'active'
      })
      .get()

    if (roomResult.data.length === 0) {
      return {
        success: false,
        error: '房间不存在或已结束'
      }
    }

    const room = roomResult.data[0]

    // 检查是否已在房间中
    const isAlreadyMember = room.members.some(m => m.openid === wxContext.OPENID)
    if (isAlreadyMember) {
      return {
        success: true,
        room
      }
    }

    // 获取用户信息
    const userResult = await db.collection('users')
      .where({
        _openid: wxContext.OPENID
      })
      .get()

    const user = userResult.data[0]

    // 添加用户到房间
    await db.collection('rooms')
      .doc(room._id)
      .update({
        data: {
          members: _.push({
            openid: wxContext.OPENID,
            nickname: user ? user.nickname : '新用户',
            avatarUrl: user ? user.avatarUrl : '',
            role: 'member',
            currentBalance: 0
          })
        }
      })

    return {
      success: true,
      roomId: room._id
    }
  } catch (error) {
    console.error('加入房间失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
