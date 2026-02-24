// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  const { cloudID } = event

  try {
    // 使用云开发的 opendata 能力解密
    const res = await cloud.getOpenData({
      list: [cloudID]
    })

    console.log('解密结果:', res)

    if (res && res.list && res.list.length > 0) {
      const userInfo = res.list[0].data
      return {
        success: true,
        userInfo: userInfo
      }
    } else {
      return {
        success: false,
        error: '解密失败'
      }
    }
  } catch (err) {
    console.error('解密失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}
