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
  actionFrequency: 'medium',
  // 工具设置
  tools: {
    position1: 'calc',
    position2: 'screenshot',
    position3: 'clock',
    position4: 'help'
  }
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
  // 检查是否有老版本的设置没有tools属性
  if (!settings.tools) {
    settings.tools = defaultSettings.tools;
  }

  // 常规设置
  document.getElementById('startup').checked = settings.startup;
  document.getElementById('topmost').checked = settings.topmost;
  document.getElementById('sounds').checked = settings.sounds;
  
  // 个性化设置
  document.getElementById('pet-size').value = settings.petSize;
  document.getElementById('size-value').textContent = `${settings.petSize}%`;
  document.getElementById('pet-style').value = settings.petStyle;
  document.getElementById('menu-color').value = settings.menuColor;
  
  // AI设置
  document.getElementById('random-movement').checked = settings.randomMovement;
  document.getElementById('auto-actions').checked = settings.autoActions;
  document.getElementById('action-frequency').value = settings.actionFrequency;
  
  // 工具设置 - 只设置第一个工具，其他工具在点击相应的位置时设置
  document.getElementById('tool-1').value = settings.tools.position1 || 'calc';
}

// 从UI收集设置
function collectSettingsFromUI() {
  const currentSettings = loadSettings();
  
  return {
    startup: document.getElementById('startup').checked,
    topmost: document.getElementById('topmost').checked,
    sounds: document.getElementById('sounds').checked,
    petSize: parseInt(document.getElementById('pet-size').value),
    petStyle: document.getElementById('pet-style').value,
    menuColor: document.getElementById('menu-color').value,
    randomMovement: document.getElementById('random-movement').checked,
    autoActions: document.getElementById('auto-actions').checked,
    actionFrequency: document.getElementById('action-frequency').value,
    // 保留当前工具设置，并更新position1
    tools: {
      ...currentSettings.tools,
      position1: document.getElementById('tool-1').value
    }
  };
}

// 当前选择的位置
let selectedPosition = 1;

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
  
  // 设置位置标记点击事件
  setupPositionMarkers();
  
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

// 设置位置标记点击事件
function setupPositionMarkers() {
  const positions = document.querySelectorAll('.position-marker');
  const toolDropdown = document.getElementById('tool-1');
  const settings = loadSettings();
  
  positions.forEach(position => {
    position.addEventListener('click', () => {
      // 清除所有位置标记的活跃状态
      positions.forEach(p => {
        p.style.backgroundColor = 'white';
        p.style.color = 'black';
      });
      
      // 设置当前选中的位置标记为活跃状态
      position.style.backgroundColor = '#4a90e2';
      position.style.color = 'white';
      
      // 获取位置编号
      const positionNumber = position.id.split('-')[1];
      selectedPosition = positionNumber;
      
      // 更新工具下拉菜单值
      const toolKey = `position${positionNumber}`;
      const toolValue = settings.tools && settings.tools[toolKey] ? 
                        settings.tools[toolKey] : 'calc';
      
      // 更新下拉菜单
      toolDropdown.value = toolValue;
    });
  });
  
  // 默认选中位置1
  document.getElementById('position-1').click();
  
  // 工具下拉菜单变化时更新当前位置的工具设置
  toolDropdown.addEventListener('change', () => {
    const toolValue = toolDropdown.value;
    const currentSettings = loadSettings();
    
    // 确保tools对象存在
    if (!currentSettings.tools) {
      currentSettings.tools = {};
    }
    
    // 更新当前选中位置的工具
    currentSettings.tools[`position${selectedPosition}`] = toolValue;
    
    // 保存更新后的设置
    saveSettings(currentSettings);
  });
}

// 接收来自主进程的消息
ipcRenderer.on('settings-saved', (event, success) => {
  if (success) {
    console.log('设置已成功应用');
  } else {
    console.error('设置应用失败');
  }
});