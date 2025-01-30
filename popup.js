document.addEventListener('DOMContentLoaded', () => {
  const subtitlesArea = document.getElementById('subtitles');
  const statusElement = document.getElementById('status');
  const extractBtn = document.getElementById('extractBtn');
  const exportBtn = document.getElementById('exportBtn');
  const clearBtn = document.getElementById('clearBtn');
  const translationPopup = document.getElementById('translationPopup');
  const translationText = document.getElementById('translationText');
  let isExtracting = false;

  // 监听来自content script的字幕更新消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateSubtitles' && request.subtitles) {
      subtitlesArea.value = request.subtitles.join('\n');
      exportBtn.disabled = false;
    } else if (request.action === 'updateStatus') {
      statusElement.textContent = request.status;
      statusElement.classList.remove('active');
      extractBtn.disabled = false;
    }
  });

  // 检查当前标签页是否有视频
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'checkVideo'}, (response) => {
      if (response && response.hasVideo) {
        if (response.hasSubtitles) {
          statusElement.textContent = '发现视频和字幕，点击开始提取';
          statusElement.classList.add('active');
        } else {
          statusElement.textContent = '发现视频，但未检测到字幕轨道';
          statusElement.classList.remove('active');
        }
        extractBtn.disabled = false;
      } else {
        statusElement.textContent = '未发现视频';
        statusElement.classList.remove('active');
        extractBtn.disabled = true;
      }
    });
  });

  // 开始/停止提取字幕
  extractBtn.addEventListener('click', () => {
    isExtracting = !isExtracting;
    if (isExtracting) {
      extractBtn.textContent = '停止提取';
      statusElement.textContent = '正在提取字幕...';
      statusElement.classList.add('active');
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'startExtraction'});
      });
    } else {
      extractBtn.textContent = '开始提取';
      statusElement.textContent = '字幕提取已停止';
      statusElement.classList.remove('active');
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'stopExtraction'});
      });
    }
  });

  // 导出字幕
  exportBtn.addEventListener('click', () => {
    const blob = new Blob([subtitlesArea.value], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subtitles.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    statusElement.textContent = '字幕已导出';
    setTimeout(() => {
      statusElement.textContent = isExtracting ? '正在提取字幕...' : '字幕提取已停止';
    }, 2000);
  });

  // 清除字幕
  clearBtn.addEventListener('click', () => {
    subtitlesArea.value = '';
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'clearSubtitles'});
    });
    statusElement.textContent = isExtracting ? '字幕已清除，继续提取中...' : '字幕已清除';
    statusElement.classList.toggle('active', isExtracting);
    exportBtn.disabled = true;
  });

  // 初始状态设置
  exportBtn.disabled = true;
  extractBtn.textContent = '开始提取';

  // 选词翻译功能
  let translateTimeout;
  subtitlesArea.addEventListener('mouseup', async (e) => {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
      clearTimeout(translateTimeout);
      translateTimeout = setTimeout(async () => {
        try {
          const response = await fetch(`https://api.fanyi.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(selectedText)}&from=auto&to=zh&appid=YOUR_APP_ID&salt=1435660288&sign=YOUR_SIGN`);
          const data = await response.json();
          if (data.trans_result && data.trans_result[0]) {
            translationText.textContent = data.trans_result[0].dst;
            translationPopup.style.display = 'block';
            translationPopup.style.left = `${e.pageX}px`;
            translationPopup.style.top = `${e.pageY + 20}px`;
          }
        } catch (error) {
          console.error('翻译失败:', error);
          translationText.textContent = '翻译失败，请稍后重试';
          translationPopup.style.display = 'block';
          translationPopup.style.left = `${e.pageX}px`;
          translationPopup.style.top = `${e.pageY + 20}px`;
        }
      }, 300);
    } else {
      translationPopup.style.display = 'none';
    }
  });

  // 点击其他区域关闭翻译弹窗
  document.addEventListener('click', (e) => {
    if (!translationPopup.contains(e.target) && e.target !== subtitlesArea) {
      translationPopup.style.display = 'none';
    }
  });
});