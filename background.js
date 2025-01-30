// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('视频字幕提取器已安装');
  // 设置侧边栏选项
  chrome.sidePanel.setOptions({
    enabled: true
  });
});

// 监听扩展图标点击事件
chrome.action.onClicked.addListener((tab) => {
  // 打开侧边栏
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// 处理来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'log') {
    console.log('Content Script Log:', request.message);
  }
  return true;
});