const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// 默认设置
const defaultSettings = {
  startup: true,
  topmost: true,
  sounds: true,
  petSize: 100,
  petStyle: 'default',
  menuColor: '#4a90e2',
  randomMovement: true,
  autoActions: true,
  actionFrequency: 'medium'
};

// 设置文件路径
const settingsPath = path.join(__dirname, 'settings.json');

// 加载设置
function loadSettings() {
  try {
    // 检查文件是否存在
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(data);
    } else {
      // 如果文件不存在，创建默认设置文件
      saveSettings(defaultSettings);
      return defaultSettings;
    }
  } catch (error) {
    console.error('加载设置失败:', error);
    return defaultSettings;
  }
}

// 保存设置
function saveSettings(settings) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('保存设置失败:', error);
    return false;
  }
}

// 应用设置到UI
function applySettingsToUI(settings) {
  document.getElementById('startup').checked = settings.startup;
  document.getElementById('topmost').checked = settings.topmost;
  document.getElementById('sounds').checked = settings.sounds;
  document.getElementById('pet-size').value = settings.petSize;
  document.getElementById('size-value').textContent = `${settings.petSize}%`;
  document.getElementById('pet-style').value = settings.petStyle;
  document.getElementById('menu-color').value = settings.menuColor;
  document.getElementById('random-movement').checked = settings.randomMovement;
  document.getElementById('auto-actions').checked = settings.autoActions;
  document.getElementById('action-frequency').value = settings.actionFrequency;
}

// 从UI收集设置
function collectSettingsFromUI() {
  return {
    startup: document.getElementById('startup').checked,
    topmost: document.getElementById('topmost').checked,
    sounds: document.getElementById('sounds').checked,
    petSize: parseInt(document.getElementById('pet-size').value),
    petStyle: document.getElementById('pet-style').value,
    menuColor: document.getElementById('menu-color').value,
    randomMovement: document.getElementById('random-movement').checked,
    autoActions: document.getElementById('auto-actions').checked,
    actionFrequency: document.getElementById('action-frequency').value
  };
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  // 加载设置并应用到UI
  const settings = loadSettings();
  applySettingsToUI(settings);
  
  // 监听滑块变化更新显示
  const sizeSlider = document.getElementById('pet-size');
  const sizeValue = document.getElementById('size-value');
  
  sizeSlider.addEventListener('input', () => {
    sizeValue.textContent = `${sizeSlider.value}%`;
  });
  
  // 保存设置按钮
  document.getElementById('save-btn').addEventListener('click', () => {
    const newSettings = collectSettingsFromUI();
    
    if (saveSettings(newSettings)) {
      // 发送设置到主进程
      ipcRenderer.send('save-settings', newSettings);
      alert('设置已保存！');
    } else {
      alert('保存设置失败，请重试！');
    }
  });
  
  // 重置默认设置按钮
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('确定要重置所有设置到默认值吗？')) {
      applySettingsToUI(defaultSettings);
    }
  });
});

// 接收来自主进程的消息
ipcRenderer.on('settings-saved', (event, success) => {
  if (success) {
    console.log('设置已成功应用');
  } else {
    console.error('设置应用失败');
  }
});