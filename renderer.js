const { ipcRenderer } = require('electron');
let hideMenuTimer = null;

// 桌宠元素
const pet = document.getElementById('pet');
const speechBubble = document.getElementById('speech-bubble');

// 状态变量
let lastInteractionTime = Date.now();
let isDragging = false;
let startDragX = 0;
let startDragY = 0;
let offsetX, offsetY;
let currentState = 'normal';
let lastClickTime = 0;
let danceCount = 0;
const DANCE_THRESHOLD = 3;
const CLICK_TIMEOUT = 500;
const DRAG_THRESHOLD = 5;
let lastMousePosition = { x: 0, y: 0 };
let hoverMenuContainer = null;

// 工具配置
let currentToolsConfig = {
  position1: 'calc',
  position2: 'screenshot',
  position3: 'help',
  position4: 'clock'
};

function safeGetSettings() {
  try {
    const settings = ipcRenderer.sendSync('get-settings');
    if (!settings) {
      console.warn('收到空设置，使用默认值');
      return {
        tools: {
          position1: 'calc',
          position2: 'screenshot',
          position3: 'help',
          position4: 'clock'
        }
      };
    }
    return settings;
  } catch (error) {
    console.error('同步获取设置失败:', error);
    return {
      tools: {
        position1: 'calc',
        position2: 'screenshot',
        position3: 'help',
        position4: 'clock'
      }
    };
  }
}

// 设置是否忽略鼠标事件
function setIgnoreMouseEvents(ignore, options = { forward: true }) {
  ipcRenderer.send('set-ignore-mouse-events', ignore, options);
}

// 获取工具图标
function getToolIcon(toolType) {
  switch (toolType) {
    case 'calc': return '🧮';
    case 'screenshot': return '📷';
    case 'clock': return '⏰';
    case 'help': return '❓';
    case 'note': return '📝';
    default: return '🔧';
  }
}

// 处理工具点击
function handleToolClick(toolType) {
  switch (toolType) {
    case 'calc':
      openSystemCalculator();
      break;
    case 'screenshot':
      takeSystemScreenshot();
      break;
    case 'clock':
      const now = new Date();
      speak(`现在时间: ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`);
      break;
    case 'help':
      speak('我是你的桌面宠物助手！');
      break;
    case 'note':
      speak('便签功能正在开发中...');
      break;
  }
  hideHoverMenu();
}

// 初始化悬浮菜单 - 修改为环绕宠物的4个工具按钮
function initHoverMenu() {
  // 如果已存在，先移除
  const existingMenu = document.getElementById('hover-menu-container');
  if (existingMenu) {
    document.body.removeChild(existingMenu);
  }
  
  hoverMenuContainer = document.createElement('div');
  hoverMenuContainer.id = 'hover-menu-container';
  hoverMenuContainer.style.display = 'none';
  hoverMenuContainer.style.position = 'fixed';
  hoverMenuContainer.style.width = '200px';
  hoverMenuContainer.style.height = '200px';
  hoverMenuContainer.style.pointerEvents = 'none';
  hoverMenuContainer.style.zIndex = '999';
  document.body.appendChild(hoverMenuContainer);
  
  // 创建4个工具按钮 - 使用用户设置中的工具类型
  const settings = safeGetSettings();
  
  // 左侧按钮
  const leftTool = settings.tools.position1 || 'calc';
  const leftButton = createMenuButton(`${leftTool}-button`, getToolIcon(leftTool), '#4a90e2', () => handleToolClick(leftTool));
  
  // 顶部按钮
  const topTool = settings.tools.position2 || 'screenshot';
  const topButton = createMenuButton(`${topTool}-button`, getToolIcon(topTool), '#4a90e2', () => handleToolClick(topTool));
  
  // 右侧按钮
  const rightTool = settings.tools.position3 || 'help';
  const rightButton = createMenuButton(`${rightTool}-button`, getToolIcon(rightTool), '#4a90e2', () => handleToolClick(rightTool));
  
  // 底部按钮
  const bottomTool = settings.tools.position4 || 'clock';
  const bottomButton = createMenuButton(`${bottomTool}-button`, getToolIcon(bottomTool), '#4a90e2', () => handleToolClick(bottomTool));
  
  hoverMenuContainer.appendChild(leftButton);
  hoverMenuContainer.appendChild(topButton);
  hoverMenuContainer.appendChild(rightButton);
  hoverMenuContainer.appendChild(bottomButton);
}

// 打开系统计算器
function openSystemCalculator() {
  const platform = process.platform;
  
  if (platform === 'win32') {
    ipcRenderer.send('open-system-app', 'calc.exe');
    speak('打开系统计算器！');
  } else if (platform === 'darwin') {
    ipcRenderer.send('open-system-app', 'Calculator.app');
    speak('打开系统计算器！');
  } else if (platform === 'linux') {
    ipcRenderer.send('open-system-app', 'gnome-calculator');
    speak('打开系统计算器！');
  } else {
    speak('抱歉，无法打开系统计算器');
  }
}

// 调用系统截图工具
function takeSystemScreenshot() {
  const platform = process.platform;
  
  if (platform === 'win32') {
    ipcRenderer.send('open-system-app', 'SnippingTool.exe');
    speak('打开系统截图工具！');
  } else if (platform === 'darwin') {
    ipcRenderer.send('take-system-screenshot');
    speak('正在截图...');
  } else if (platform === 'linux') {
    ipcRenderer.send('open-system-app', 'gnome-screenshot');
    speak('打开系统截图工具！');
  } else {
    speak('抱歉，无法调用系统截图工具');
  }
}

// 创建菜单按钮
function createMenuButton(id, emoji, color, onClick) {
  const button = document.createElement('div');
  button.id = id;
  button.className = 'hover-menu-button';
  button.innerHTML = emoji;
  button.style.backgroundColor = color;
  button.style.color = 'white';
  button.style.cursor = 'pointer';
  button.style.fontSize = '20px';
  button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  button.style.transition = 'transform 0.2s';
  button.style.width = '40px';
  button.style.height = '40px';
  button.style.borderRadius = '50%';
  button.style.display = 'flex';
  button.style.justifyContent = 'center';
  button.style.alignItems = 'center';
  button.style.position = 'absolute';
  button.style.pointerEvents = 'auto';
  
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.1)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
  });
  
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  
  return button;
}

// 显示悬浮菜单 - 修改为环形布局
function showHoverMenu() {
  setIgnoreMouseEvents(false);
  
  const petRect = pet.getBoundingClientRect();
  const petCenterX = petRect.left + petRect.width / 2;
  const petCenterY = petRect.top + petRect.height / 2;
  
  hoverMenuContainer.style.left = (petCenterX - 100) + 'px';
  hoverMenuContainer.style.top = (petCenterY - 100) + 'px';
  hoverMenuContainer.style.display = 'block';
  
  const radius = 80;
  const buttons = hoverMenuContainer.querySelectorAll('.hover-menu-button');
  
  // 固定4个位置
  const positions = [
    { angle: Math.PI, name: 'left' },      // 左侧
    { angle: Math.PI * 1.5, name: 'top' }, // 顶部
    { angle: 0, name: 'right' },           // 右侧
    { angle: Math.PI * 0.5, name: 'bottom' } // 底部
  ];
  
  buttons.forEach((button, index) => {
    if (index < 4) {
      const pos = positions[index];
      const x = radius * Math.cos(pos.angle);
      const y = radius * Math.sin(pos.angle);
      
      button.style.left = `calc(50% + ${x}px - 20px)`;
      button.style.top = `calc(50% + ${y}px - 20px)`;
      button.style.pointerEvents = 'auto';  // 允许点击
    }
  });
}

// 隐藏悬浮菜单
function hideHoverMenu() {
  // 清除任何隐藏定时器
  if (hideMenuTimer) {
    clearTimeout(hideMenuTimer);
    hideMenuTimer = null;
  }
  
  hoverMenuContainer.style.display = 'none';
  
  const petRect = pet.getBoundingClientRect();
  const isOverPet = (
    lastMousePosition.x >= petRect.left && 
    lastMousePosition.x <= petRect.right && 
    lastMousePosition.y >= petRect.top && 
    lastMousePosition.y <= petRect.bottom
  );
  
  if (!isOverPet) {
    setIgnoreMouseEvents(true, { forward: true });
  }
}

// 初始化
window.addEventListener('DOMContentLoaded', () => {
  // 设置初始位置
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  pet.style.left = (windowWidth / 2 - 50) + 'px';
  pet.style.top = (windowHeight / 2 - 50) + 'px';
  
  // 安全地获取设置
  let settings;
  try {
    settings = ipcRenderer.sendSync('get-settings');
    if (!settings || typeof settings !== 'object') {
      throw new Error('收到无效的设置数据');
    }
  } catch (error) {
    console.error('获取设置失败:', error);
    settings = {
      tools: {
        position1: 'calc',
        position2: 'screenshot',
        position3: 'help',
        position4: 'clock'
      }
    };
  }
  
  // 初始化交互
  initInteractions();
  
  // 初始化悬浮菜单
  initHoverMenu();
  
  // 初始化状态检查
  setInterval(checkState, 5000);
  setInterval(randomAction, 30000);
  
  // 鼠标事件
  pet.addEventListener('mouseenter', () => {
    setIgnoreMouseEvents(false);
    showHoverMenu();
  });
  
  pet.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    showContextMenu(event.clientX, event.clientY);
  });
  
  document.addEventListener('mousemove', (e) => {
    lastMousePosition.x = e.clientX;
    lastMousePosition.y = e.clientY;
    
    if (isDragging) return;
    
    const contextMenuVisible = document.getElementById('context-menu') !== null;
    if (contextMenuVisible) return;
    
    const petRect = pet.getBoundingClientRect();
    const isOverPet = (
      e.clientX >= petRect.left && 
      e.clientX <= petRect.right && 
      e.clientY >= petRect.top && 
      e.clientY <= petRect.bottom
    );
    
    let isOverMenuButton = false;
    if (hoverMenuContainer && hoverMenuContainer.style.display !== 'none') {
      const buttons = hoverMenuContainer.querySelectorAll('.hover-menu-button');
      for (const button of buttons) {
        const buttonRect = button.getBoundingClientRect();
        if (
          e.clientX >= buttonRect.left && 
          e.clientX <= buttonRect.right && 
          e.clientY >= buttonRect.top && 
          e.clientY <= buttonRect.bottom
        ) {
          isOverMenuButton = true;
          break;
        }
      }
    }
    
    if (isOverPet || isOverMenuButton) {
      // 鼠标在宠物或按钮上，显示菜单并取消任何隐藏定时器
      if (hoverMenuContainer && hoverMenuContainer.style.display === 'none') {
        showHoverMenu();
      }
      
      // 取消任何已存在的隐藏定时器
      if (hideMenuTimer) {
        clearTimeout(hideMenuTimer);
        hideMenuTimer = null;
      }
    } else if (!isOverPet && !isOverMenuButton && hoverMenuContainer && hoverMenuContainer.style.display !== 'none') {
      // 鼠标不在宠物或按钮上，如果没有活动的定时器，启动一个2秒的定时器
      if (!hideMenuTimer) {
        hideMenuTimer = setTimeout(() => {
          hideHoverMenu();
          hideMenuTimer = null;
        }, 2000); // 2秒后隐藏菜单
      }
    }
    
    const shouldIgnore = !(isOverPet || isOverMenuButton || contextMenuVisible);
    setIgnoreMouseEvents(shouldIgnore, { forward: true });
  });
});

// 初始化交互功能
function initInteractions() {
  document.addEventListener('dragstart', (e) => {
    if (e.target === pet) {
      e.preventDefault();
    }
  });
  
  pet.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation(); // 防止事件传播
    setIgnoreMouseEvents(false);
    console.log('右键菜单触发'); // 添加调试信息
    showContextMenu(e.clientX, e.clientY);
  });

  pet.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIgnoreMouseEvents(false);
    
    startDragX = e.clientX;
    startDragY = e.clientY;
    offsetX = e.clientX - pet.getBoundingClientRect().left;
    offsetY = e.clientY - pet.getBoundingClientRect().top;
    isDragging = true;
    
    if (hoverMenuContainer) {
      hideHoverMenu();
    }
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    let newLeft = e.clientX - offsetX;
    let newTop = e.clientY - offsetY;
    
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const visibleThreshold = 0.2;
    const minX = -pet.offsetWidth * (1 - visibleThreshold);
    const minY = -pet.offsetHeight * (1 - visibleThreshold);
    const maxX = screenWidth - pet.offsetWidth * visibleThreshold;
    const maxY = screenHeight - pet.offsetHeight * visibleThreshold;
    
    newLeft = Math.max(minX, Math.min(newLeft, maxX));
    newTop = Math.max(minY, Math.min(newTop, maxY));
    
    pet.style.left = newLeft + 'px';
    pet.style.top = newTop + 'px';
    
    if (currentState !== 'happy' && 
        (Math.abs(e.clientX - startDragX) > DRAG_THRESHOLD || 
         Math.abs(e.clientY - startDragY) > DRAG_THRESHOLD)) {
      changeState('happy');
      speak('谢谢你摸我~');
      lastInteractionTime = Date.now();
    }
  });
  
  document.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    
    const dragDistanceX = Math.abs(e.clientX - startDragX);
    const dragDistanceY = Math.abs(e.clientY - startDragY);
    const wasDragged = dragDistanceX > DRAG_THRESHOLD || dragDistanceY > DRAG_THRESHOLD;
    
    isDragging = false;
    
    if (wasDragged) {
      setTimeout(() => changeState('normal'), 500);
    } else {
      handlePetClick(e);
    }
    
    const petRect = pet.getBoundingClientRect();
    const isOverPet = (
      e.clientX >= petRect.left && 
      e.clientX <= petRect.right && 
      e.clientY >= petRect.top && 
      e.clientY <= petRect.bottom
    );
    
    if (isOverPet && hoverMenuContainer) {
      showHoverMenu();
    } else if (!isOverPet) {
      setIgnoreMouseEvents(true, { forward: true });
    }
  });
  
  pet.addEventListener('click', (e) => {
    if (isDragging) return;
    e.stopPropagation();
    handlePetClick(e);
  });
}

// 处理点击宠物
function handlePetClick(e) {
  const now = Date.now();
  lastInteractionTime = now;
  
  if (now - lastClickTime < CLICK_TIMEOUT) {
    danceCount++;
    
    if (danceCount >= DANCE_THRESHOLD) {
      danceCount = 0;
      changeState('angry');
      speak('别让我再跳舞了！我累了！😠');
      setTimeout(() => changeState('normal'), 3000);
    } else {
      changeState('dance');
      speak('看我跳舞！');
      setTimeout(() => changeState('normal'), 3000);
    }
    
    lastClickTime = 0;
    return;
  }
  
  lastClickTime = now;
  changeState('happy');
  speak('你好啊！');
  setTimeout(() => changeState('normal'), 2000);
}

// 状态检查
function checkState() {
  const currentTime = Date.now();
  const timeSinceLastInteraction = currentTime - lastInteractionTime;
  
  if (timeSinceLastInteraction > 30000 && currentState !== 'bored') {
    changeState('bored');
    speak('好无聊啊...');
  }
}

// 随机动作
function randomAction() {
  if (currentState === 'normal') {
    const actions = [
      () => {
        danceCount++;
        if (danceCount >= DANCE_THRESHOLD) {
          danceCount = 0;
          changeState('angry');
          speak('都说了我不想跳舞了！😠');
          setTimeout(() => changeState('normal'), 3000);
        } else {
          changeState('dance');
          speak('看我跳舞！');
          setTimeout(() => changeState('normal'), 3000);
        }
      },
      () => {
        speak('今天天气真好！');
        setTimeout(() => hideSpeechBubble(), 3000);
      },
      () => {
        pet.style.transform = 'rotate(360deg)';
        setTimeout(() => {
          pet.style.transform = 'rotate(0deg)';
        }, 1000);
      }
    ];
    
    const randomIndex = Math.floor(Math.random() * actions.length);
    actions[randomIndex]();
    lastInteractionTime = Date.now();
  }
}

// 改变状态
function changeState(state) {
  pet.className = state;
  currentState = state;
}

// 显示对话泡泡
function speak(text) {
  speechBubble.textContent = text;
  const petRect = pet.getBoundingClientRect();
  speechBubble.style.left = (petRect.left + 20) + 'px';
  speechBubble.style.top = (petRect.top - 50) + 'px';
  speechBubble.style.display = 'block';
  setTimeout(hideSpeechBubble, 3000);
}

// 隐藏对话泡泡
function hideSpeechBubble() {
  speechBubble.style.display = 'none';
}

// 显示自定义右键菜单
function showContextMenu(x, y) {
  setIgnoreMouseEvents(false);
  
  const existingMenu = document.getElementById('context-menu');
  if (existingMenu) {
    document.body.removeChild(existingMenu);
  }
  
  const contextMenu = document.createElement('div');
  contextMenu.id = 'context-menu';
  contextMenu.style.position = 'fixed';  // 确保位置是固定的
  contextMenu.style.left = x + 'px';
  contextMenu.style.top = y + 'px';
  contextMenu.style.width = '120px';     // 设置固定宽度
  contextMenu.style.backgroundColor = 'white';
  contextMenu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  contextMenu.style.borderRadius = '4px';
  contextMenu.style.zIndex = '2500';
  
  const settingsOption = document.createElement('div');
  settingsOption.className = 'context-menu-option';
  settingsOption.textContent = '设置';
  settingsOption.style.padding = '8px 15px';
  settingsOption.style.cursor = 'pointer';
  settingsOption.style.fontSize = '14px';
  settingsOption.addEventListener('click', () => {
    hideContextMenu();
    ipcRenderer.send('open-settings');
  });
  
  const closeOption = document.createElement('div');
  closeOption.className = 'context-menu-option';
  closeOption.textContent = '关闭';
  closeOption.style.padding = '8px 15px';
  closeOption.style.cursor = 'pointer';
  closeOption.style.fontSize = '14px';
  closeOption.addEventListener('click', () => {
    ipcRenderer.send('quit-app');
  });
  
  contextMenu.appendChild(settingsOption);
  contextMenu.appendChild(closeOption);
  document.body.appendChild(contextMenu);
  
  // 防止右键菜单被立即关闭
  setTimeout(() => {
    document.addEventListener('click', hideContextMenu);
    document.addEventListener('contextmenu', hideContextMenu);
  }, 100);
}

// 隐藏右键菜单
function hideContextMenu() {
  const contextMenu = document.getElementById('context-menu');
  if (contextMenu) {
    document.body.removeChild(contextMenu);
  }
  
  document.removeEventListener('click', hideContextMenu);
  document.removeEventListener('contextmenu', hideContextMenu);
  
  setTimeout(() => {
    const petRect = pet.getBoundingClientRect();
    const isOverPet = (
      lastMousePosition.x >= petRect.left && 
      lastMousePosition.x <= petRect.right && 
      lastMousePosition.y >= petRect.top && 
      lastMousePosition.y <= petRect.bottom
    );
    
    if (!isOverPet) {
      setIgnoreMouseEvents(true, { forward: true });
    }
  }, 100);
}

// 接收来自主进程的消息
ipcRenderer.on('apply-settings', (event, settings) => {
  console.log('接收到新设置', settings);
  applySettings(settings);
  if (settings.tools) {
    currentToolsConfig = settings.tools;
    // 重新初始化悬浮菜单以更新工具类型
    initHoverMenu();
  }
});

// 应用设置
function applySettings(settings) {
  if (settings.petSize) {
    const scale = settings.petSize / 100;
    pet.style.transform = `scale(${scale})`;
  }
  
  if (settings.menuColor && hoverMenuContainer) {
    const buttons = hoverMenuContainer.querySelectorAll('.hover-menu-button');
    buttons.forEach(button => {
      button.style.backgroundColor = settings.menuColor;
    });
  }
  
  console.log('应用设置:', settings);
}