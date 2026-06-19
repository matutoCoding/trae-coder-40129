export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/queue/index',
    'pages/mine/index',
    'pages/platform-manage/index',
    'pages/booking-detail/index',
    'pages/health-commitment/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#FF6B35',
    navigationBarTitleText: '蹦极跳预约',
    navigationBarTextStyle: 'white',
    backgroundColor: '#F7F8FA'
  },
  tabBar: {
    color: '#86909C',
    selectedColor: '#FF6B35',
    backgroundColor: '#FFFFFF',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '排期'
      },
      {
        pagePath: 'pages/queue/index',
        text: '叫号'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的'
      }
    ]
  }
})
