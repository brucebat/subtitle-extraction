// 保存设置到Chrome存储
function saveOptions() {
  const translationService = document.getElementById('translationService').value;
  const apiKey = document.getElementById('apiKey').value;
  const apiSecret = document.getElementById('apiSecret').value;

  chrome.storage.sync.set(
    {
      translationService: translationService,
      apiKey: apiKey,
      apiSecret: apiSecret
    },
    () => {
      const statusMessage = document.getElementById('statusMessage');
      statusMessage.textContent = '设置已保存';
      statusMessage.className = 'status-message success';
      setTimeout(() => {
        statusMessage.className = 'status-message';
      }, 3000);
    }
  );
}

// 从Chrome存储加载设置
function loadOptions() {
  chrome.storage.sync.get(
    {
      translationService: 'google',
      apiKey: '',
      apiSecret: ''
    },
    (items) => {
      document.getElementById('translationService').value = items.translationService;
      document.getElementById('apiKey').value = items.apiKey;
      document.getElementById('apiSecret').value = items.apiSecret;
    }
  );
}

// 初始化页面
document.addEventListener('DOMContentLoaded', loadOptions);
document.getElementById('saveButton').addEventListener('click', saveOptions);