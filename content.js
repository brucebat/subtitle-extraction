// 检查页面中的视频元素
function checkForVideo() {
  const videos = document.getElementsByTagName('video');
  return videos.length > 0;
}

// 存储已提取的字幕，避免重复
let extractedSubtitles = new Set();
let lastSubtitleText = '';
let subtitleUpdateInterval = null;

// 检查视频是否有字幕
function checkForSubtitles(video) {
  // 检查原生字幕轨道
  const hasTextTracks = video.textTracks && video.textTracks.length > 0;
  
  // 检查WebVTT字幕文件
  const hasTrackElements = document.querySelectorAll('track[src]').length > 0;
  
  // 检查B站字幕元素
  const hasBilibiliSubtitles = document.querySelectorAll('.bpx-player-subtitle-panel-wrap').length > 0;
  
  return hasTextTracks || hasTrackElements || hasBilibiliSubtitles;
}

// 提取视频字幕
function extractSubtitles() {
  const videos = document.getElementsByTagName('video');
  if (videos.length === 0) return null;

  const video = videos[0];
  let hasNewSubtitles = false;

  // 检查视频是否有字幕
  const hasSubtitles = checkForSubtitles(video);
  if (!hasSubtitles) {
    chrome.runtime.sendMessage({
      action: 'updateStatus',
      status: '未检测到字幕轨道'
    });
    return null;
  }

  // 1. 检查原生字幕轨道
  const tracks = video.textTracks;
  for (let track of tracks) {
    if (track.kind === 'subtitles' || track.kind === 'captions') {
      track.mode = 'showing';
      const cues = track.cues;
      if (cues) {
        for (let cue of cues) {
          const subtitleText = `${formatTime(cue.startTime)} --> ${formatTime(cue.endTime)}\n${cue.text}\n`;
          if (!extractedSubtitles.has(subtitleText)) {
            extractedSubtitles.add(subtitleText);
            hasNewSubtitles = true;
          }
        }
      }
    }
  }

  // 2. 检查WebVTT字幕文件
  const trackElements = document.querySelectorAll('track[src]');
  trackElements.forEach(track => {
    if (track.track.mode !== 'showing') {
      track.track.mode = 'showing';
    }
  });

  // 3. 实时检查B站字幕元素
  const bilibiliSubtitles = document.querySelectorAll('.bpx-player-subtitle-panel-wrap');
  if (bilibiliSubtitles.length > 0) {
    bilibiliSubtitles.forEach(container => {
      const text = container.textContent.trim();
      if (text && text !== lastSubtitleText) {
        const currentTime = video.currentTime;
        const subtitleText = `${formatTime(currentTime)} --> ${formatTime(currentTime + 5)}\n${text}\n`;
        if (!extractedSubtitles.has(subtitleText)) {
          extractedSubtitles.add(subtitleText);
          lastSubtitleText = text;
          hasNewSubtitles = true;
        }
      }
    });
  }

  // 如果有新的字幕，通知popup更新
  if (hasNewSubtitles) {
    chrome.runtime.sendMessage({
      action: 'updateSubtitles',
      subtitles: Array.from(extractedSubtitles)
    }).catch(error => {
      console.log('发送字幕更新消息失败:', error);
    });
  }

  return Array.from(extractedSubtitles);
}

// 格式化时间为 HH:MM:SS,mmm 格式
function formatTime(seconds) {
  const date = new Date(seconds * 1000);
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  const mmm = String(date.getUTCMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss},${mmm}`;
}

// 设置MutationObserver监听字幕变化
function setupSubtitleObserver(video) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' || mutation.type === 'attributes') {
        const tracks = video.textTracks;
        for (let track of tracks) {
          if (track.kind === 'subtitles' || track.kind === 'captions') {
            track.mode = 'showing';
          }
        }
      }
    });
  });

  observer.observe(video, {
    childList: true,
    attributes: true,
    subtree: true,
    attributeFilter: ['src', 'track']
  });

  return observer;
}

// 开始实时字幕提取
function startRealtimeSubtitleExtraction(video) {
  // 清除之前的定时器
  if (subtitleUpdateInterval) {
    clearInterval(subtitleUpdateInterval);
    subtitleUpdateInterval = null;
  }

  // 设置新的定时器，不再依赖视频播放状态
  subtitleUpdateInterval = setInterval(() => {
    extractSubtitles();
  }, 500); // 每0.5秒检查一次
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkVideo') {
    const hasVideo = checkForVideo();
    try {
      if (hasVideo) {
        const video = document.getElementsByTagName('video')[0];
        const hasSubtitles = checkForSubtitles(video);
        setupSubtitleObserver(video);
        sendResponse({hasVideo: true, hasSubtitles: hasSubtitles});
      } else {
        sendResponse({hasVideo: false, hasSubtitles: false});
      }
    } catch (error) {
      console.log('处理checkVideo消息时出错:', error);
      sendResponse({hasVideo: false, hasSubtitles: false, error: error.message});
    }
  } else if (request.action === 'extractSubtitles') {
    const subtitles = extractSubtitles();
    sendResponse({subtitles: subtitles});
  } else if (request.action === 'startExtraction') {
    const video = document.getElementsByTagName('video')[0];
    if (video) {
      startRealtimeSubtitleExtraction(video);
      sendResponse({success: true});
    }
  } else if (request.action === 'stopExtraction') {
    if (subtitleUpdateInterval) {
      clearInterval(subtitleUpdateInterval);
      subtitleUpdateInterval = null;
    }
    sendResponse({success: true});
  } else if (request.action === 'clearSubtitles') {
    extractedSubtitles.clear();
    lastSubtitleText = '';
    sendResponse({success: true});
  }
  return true;
});