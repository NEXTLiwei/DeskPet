console.log('setting.js 已加载');
console.log('Electron:', typeof require('electron'));
console.log('IPC Renderer:', typeof require('electron').ipcRenderer);

const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// 设置文件路径
const settingsPath = path.join(__dirname, 'settings.json');

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
  tools: {
    position1: 'calc',
    position2: 'screenshot',
    position3: 'clock',
    position4: 'help'
  }
};

// 当前选中的位置
let currentPosition = "1";

// 在页面加载完成后立即运行
window.onload = function() {
  console.log("页面加载完成");
  
  // 1. 立即填充下拉菜单
  fillDropdown();
  
  // 2. 为位置标记添加点击事件
  setupPositionMarkers();
  
  // 3. 加载所有其他设置
  loadAndApplySettings();
  
  // 4. 设置按钮事件
  setupButtons();
  
  // 5. 添加侧边栏切换事件
  setupSidebar();
  
  // 6. 设置窗口控制
  setupWindowControls();
  
  console.log("所有初始化完成");
};
// 设置窗口控制
function setupWindowControls() {
  const { ipcRenderer } = require('electron');
  
  document.getElementById('minimize-btn')?.addEventListener('click', () => {
    ipcRenderer.send('window-control', 'minimize');
  });
  
  document.getElementById('close-btn')?.addEventListener('click', () => {
    ipcRenderer.send('window-control', 'close');
  });
  
  console.log('窗口控制按钮已初始化');
}

// 添加这个新函数来设置侧边栏事件
function setupSidebar() {
  document.querySelectorAll('.sidebar-item, .about-button').forEach(item => {
    item.addEventListener('click', () => {
      // Update active sidebar item
      document.querySelectorAll('.sidebar-item, .about-button').forEach(el => {
        el.classList.remove('active');
      });
      item.classList.add('active');
      
      // Show corresponding content section
      const sectionId = item.getAttribute('data-section') + '-section';
      document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
      });
      document.getElementById(sectionId).classList.add('active');
    });
  });
}
// 填充下拉菜单选项
function fillDropdown() {
  console.log("正在填充下拉菜单");
  
  const dropdown = document.getElementById("tool-1");
  if (!dropdown) {
    console.error("找不到下拉菜单元素 (ID: tool-1)");
    return;
  }
  
  // 清空现有选项
  dropdown.innerHTML = "";
  
  // 添加新选项
  const options = [
    { value: "calc", text: "计算器" },
    { value: "screenshot", text: "截图" },
    { value: "clock", text: "时钟" },
    { value: "help", text: "帮助" },
    { value: "note", text: "便签" }
  ];
  
  options.forEach(opt => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.text;
    dropdown.appendChild(option);
  });
  
  console.log(`已添加 ${options.length} 个选项到下拉菜单`);
}

// 设置位置标记点击事件
function setupPositionMarkers() {
  console.log("正在设置位置标记点击事件");

  // 使用直接的获取元素方法
  const position1 = document.getElementById("position-1");
  const position2 = document.getElementById("position-2");
  const position3 = document.getElementById("position-3");
  const position4 = document.getElementById("position-4");

  if (!position1 || !position2 || !position3 || !position4) {
    console.error("找不到一个或多个位置标记元素");
    return;
  }

  // 使用直接的onclick赋值
  position1.onclick = function() { selectPosition("1"); };
  position2.onclick = function() { selectPosition("2"); };
  position3.onclick = function() { selectPosition("3"); };
  position4.onclick = function() { selectPosition("4"); };

  // 更新位置标记样式
  for (let i = 1; i <= 4; i++) {
    const marker = document.getElementById(`position-${i}`);
    if (marker) {
      if (i.toString() === currentPosition) {
        marker.classList.add("active");
      } else {
        marker.classList.remove("active");
      }
    }
  }

  console.log("已为所有位置标记设置点击事件");

  // 默认选中位置1
  selectPosition("1");
}

// 选择位置
function selectPosition(position) {
  console.log(`选择位置: ${position}`);
  currentPosition = position;
  
  // 清除所有标记的active类
  document.querySelectorAll('.position-marker').forEach(marker => {
    marker.classList.remove('active');
  });
  
  // 激活当前选择的标记
  const activeMarker = document.getElementById(`position-${position}`);
  if (activeMarker) {
    activeMarker.classList.add('active');
  }
  
  // 加载此位置的工具设置
  const settings = loadSettings();
  const toolValue = settings.tools[`position${position}`] || "calc";
  
  // 更新下拉菜单
  const dropdown = document.getElementById("tool-1");
  if (dropdown) {
    dropdown.value = toolValue;
  }
}
// 添加工具位置预览函数
function updateToolsPreview(tools) {
  // 这里可以添加代码来可视化显示每个位置对应的工具
  console.log("当前工具位置配置:", tools);
  
  // 示例：在控制台输出当前配置
  for (let i = 1; i <= 4; i++) {
    console.log(`位置 ${i}: ${tools[`position${i}`]}`);
  }
}

// 加载设置
function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      const settings = JSON.parse(data);
      // 确保tools对象存在
      if (!settings.tools) {
        settings.tools = defaultSettings.tools;
      }
      return settings;
    }
  } catch (error) {
    console.error("加载设置出错:", error);
  }
  return defaultSettings;
}

// 保存设置
function saveSettings(settings) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error("保存设置出错:", error);
    return false;
  }
}

// 加载设置并应用到UI
function loadAndApplySettings() {
  const settings = loadSettings();
  
  // 应用常规设置
  const startupCheckbox = document.getElementById("startup");
  const topmostCheckbox = document.getElementById("topmost");
  const soundsCheckbox = document.getElementById("sounds");
  
  if (startupCheckbox) startupCheckbox.checked = settings.startup;
  if (topmostCheckbox) topmostCheckbox.checked = settings.topmost;
  if (soundsCheckbox) soundsCheckbox.checked = settings.sounds;
  
  // 应用个性化设置
  const petSizeSlider = document.getElementById("pet-size");
  const sizeValue = document.getElementById("size-value");
  const petStyle = document.getElementById("pet-style");
  const menuColor = document.getElementById("menu-color");
  
  if (petSizeSlider) petSizeSlider.value = settings.petSize;
  if (sizeValue) sizeValue.textContent = `${settings.petSize}%`;
  if (petStyle) petStyle.value = settings.petStyle;
  if (menuColor) menuColor.value = settings.menuColor;
  
  // 应用AI设置
  const randomMovement = document.getElementById("random-movement");
  const autoActions = document.getElementById("auto-actions");
  const actionFrequency = document.getElementById("action-frequency");
  
  if (randomMovement) randomMovement.checked = settings.randomMovement;
  if (autoActions) autoActions.checked = settings.autoActions;
  if (actionFrequency) actionFrequency.value = settings.actionFrequency;
  
  // 添加UI事件监听器
  if (petSizeSlider) {
    petSizeSlider.addEventListener('input', () => {
      if (sizeValue) sizeValue.textContent = `${petSizeSlider.value}%`;
    });
  }
  
  if (menuColor) {
    menuColor.addEventListener('input', () => {
      // 更新颜色预览
      console.log(`颜色已更改为: ${menuColor.value}`);
    });
  }
}

// 设置按钮事件
function setupButtons() {
  const { ipcRenderer } = require('electron');
  
  // 保存按钮
  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      console.log('保存按钮点击');
      saveCurrentSettings();
    });
  } else {
    console.error('找不到保存按钮');
  }
  
  // 重置按钮
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      console.log('重置按钮点击');
      if (confirm('确定要重置所有设置到默认值吗？')) {
        resetToDefaultSettings();
      }
    });
  } else {
    console.error('找不到重置按钮');
  }
  
  // 管理小工具按钮
  const manageToolsBtn = document.querySelector('.manage-tools-btn');
  if (manageToolsBtn) {
    manageToolsBtn.addEventListener('click', () => {
      console.log('管理小工具按钮点击');
      alert('工具管理功能正在开发中，敬请期待！');
    });
  } else {
    console.error('找不到管理小工具按钮');
  }
  
  console.log('所有按钮已初始化');
}

// 重置为默认设置
function resetToDefaultSettings() {
  // 保存默认设置
  if (saveSettings(defaultSettings)) {
    // 重新加载和应用设置
    loadAndApplySettings();
    // 发送设置到主进程
    ipcRenderer.send('save-settings', defaultSettings);
    alert("已重置为默认设置！");
    
    // 通知主窗口重新加载工具
    ipcRenderer.send('reload-tools');
  } else {
    alert("重置设置失败，请重试！");
  }
}

// 保存当前设置
function saveCurrentSettings() {
  const settings = loadSettings();
  
  // 更新工具设置
  const dropdown = document.getElementById("tool-1");
  if (dropdown) {
    settings.tools[`position${currentPosition}`] = dropdown.value;
    console.log(`保存位置${currentPosition}的工具为: ${dropdown.value}`);
  
    // 确保所有工具位置都有值
    for(let i=1; i<=4; i++) {
      if(!settings.tools[`position${i}`]) {
        settings.tools[`position${i}`] = defaultSettings.tools[`position${i}`];
      }
    }
  }

  // 验证position3（右侧位置）是否正确设置
  console.log(`右侧位置工具设置为: ${settings.tools.position3}`);
  
  // 更新常规设置
  const startupCheckbox = document.getElementById("startup");
  const topmostCheckbox = document.getElementById("topmost");
  const soundsCheckbox = document.getElementById("sounds");
  
  if (startupCheckbox) settings.startup = startupCheckbox.checked;
  if (topmostCheckbox) settings.topmost = topmostCheckbox.checked;
  if (soundsCheckbox) settings.sounds = soundsCheckbox.checked;
  
  // 更新个性化设置
  const petSizeSlider = document.getElementById("pet-size");
  const petStyle = document.getElementById("pet-style");
  const menuColor = document.getElementById("menu-color");
  
  if (petSizeSlider) settings.petSize = parseInt(petSizeSlider.value);
  if (petStyle) settings.petStyle = petStyle.value;
  if (menuColor) settings.menuColor = menuColor.value;
  
  // 更新AI设置
  const randomMovement = document.getElementById("random-movement");
  const autoActions = document.getElementById("auto-actions");
  const actionFrequency = document.getElementById("action-frequency");
  
  if (randomMovement) settings.randomMovement = randomMovement.checked;
  if (autoActions) settings.autoActions = autoActions.checked;
  if (actionFrequency) settings.actionFrequency = actionFrequency.value;
  
  // 保存设置
  if (saveSettings(settings)) {
    // 发送设置到主进程
    ipcRenderer.send('save-settings', settings);
    alert("设置已保存！");
    
    // 立即通知主窗口重新加载工具
    ipcRenderer.send('reload-tools');
  } else {
    alert("保存设置失败，请重试！");
  }
}

// 接收来自主进程的消息
ipcRenderer.on('settings-saved', (event, success) => {
  if (success) {
    console.log("设置已成功应用到主进程");
  } else {
    console.error("设置应用到主进程失败");
  }
});