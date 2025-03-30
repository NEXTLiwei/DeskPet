const { ipcRenderer, remote } = require('electron');

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
let danceCount = 0; // 跟踪跳舞次数
const DANCE_THRESHOLD = 3; // 触发生气状态的跳舞次数阈值
const CLICK_TIMEOUT = 500; // 双击检测超时时间（毫秒）
const DRAG_THRESHOLD = 5; // 拖动阈值（像素）
let lastMousePosition = { x: 0, y: 0 }; // 存储最后的鼠标位置
let hoverMenuContainer = null; // 悬浮菜单容器

// 设置是否忽略鼠标事件
function setIgnoreMouseEvents(ignore, options = { forward: true }) {
  ipcRenderer.send('set-ignore-mouse-events', ignore, options);
}

// 初始化悬浮菜单
function initHoverMenu() {
  // 创建悬浮菜单容器
  hoverMenuContainer = document.createElement('div');
  hoverMenuContainer.id = 'hover-menu-container';
  hoverMenuContainer.style.position = 'fixed';
  hoverMenuContainer.style.display = 'none';
  hoverMenuContainer.style.zIndex = '999';
  hoverMenuContainer.style.pointerEvents = 'auto';
  document.body.appendChild(hoverMenuContainer);
  
  // 创建计算器按钮
  const calcButton = createMenuButton('calc-button', '🧮', 'blue', () => {
    // 打开系统计算器
    openSystemCalculator();
  });
  
  // 创建截图按钮
  const screenshotButton = createMenuButton('screenshot-button', '📷', 'purple', () => {
    // 调用系统截图工具
    takeSystemScreenshot();
  });
  
  // 创建其他示例按钮
  const clockButton = createMenuButton('clock-button', '⏰', 'lightblue', () => {
    const now = new Date();
    speak(`现在时间: ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`);
  });
  
  const helpButton = createMenuButton('help-button', '❓', 'orange', () => {
    speak('我是你的桌面宠物！双击我可以让我跳舞哦！');
  });
  
  // 添加按钮到容器
  hoverMenuContainer.appendChild(calcButton);
  hoverMenuContainer.appendChild(screenshotButton);
  hoverMenuContainer.appendChild(clockButton);
  hoverMenuContainer.appendChild(helpButton);
  
  // 添加鼠标进入事件
  pet.addEventListener('mouseenter', showHoverMenu);
  
  // 添加鼠标离开事件
  pet.addEventListener('mouseleave', (e) => {
    // 检查鼠标是否移到了菜单上
    const rect = hoverMenuContainer.getBoundingClientRect();
    if (
      e.clientX >= rect.left && 
      e.clientX <= rect.right && 
      e.clientY >= rect.top && 
      e.clientY <= rect.bottom
    ) {
      return; // 如果移到了菜单上，不要隐藏
    }
    
    // 否则检查鼠标是否真的离开了宠物和菜单
    const isOverMenu = document.elementFromPoint(e.clientX, e.clientY) === hoverMenuContainer || 
                       hoverMenuContainer.contains(document.elementFromPoint(e.clientX, e.clientY));
    const isOverPet = document.elementFromPoint(e.clientX, e.clientY) === pet;
    
    if (!isOverMenu && !isOverPet) {
      hideHoverMenu();
    }
  });
  
  // 菜单也要添加鼠标离开事件
  hoverMenuContainer.addEventListener('mouseleave', (e) => {
    // 检查鼠标是否移回了宠物上
    const petRect = pet.getBoundingClientRect();
    if (
      e.clientX >= petRect.left && 
      e.clientX <= petRect.right && 
      e.clientY >= petRect.top && 
      e.clientY <= petRect.bottom
    ) {
      return; // 如果移回了宠物上，不要隐藏
    }
    
    // 检查是否还在菜单内部的某个按钮上
    const isStillOverMenu = hoverMenuContainer.contains(document.elementFromPoint(e.clientX, e.clientY));
    if (!isStillOverMenu) {
      hideHoverMenu();
    }
  });
}

// 打开系统计算器
function openSystemCalculator() {
  // 根据操作系统打开不同的计算器应用
  const platform = process.platform;
  
  if (platform === 'win32') {
    // Windows
    ipcRenderer.send('open-system-app', 'calc.exe');
    speak('打开系统计算器！');
  } else if (platform === 'darwin') {
    // macOS
    ipcRenderer.send('open-system-app', 'Calculator.app');
    speak('打开系统计算器！');
  } else if (platform === 'linux') {
    // Linux (尝试打开常见的计算器应用)
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
    // Windows (Win+Shift+S 组合键无法直接调用，使用系统应用代替)
    ipcRenderer.send('open-system-app', 'SnippingTool.exe');
    speak('打开系统截图工具！');
  } else if (platform === 'darwin') {
    // macOS 截图快捷键 (在主进程中模拟按键)
    ipcRenderer.send('take-system-screenshot');
    speak('正在截图...');
  } else if (platform === 'linux') {
    // Linux (尝试打开常见的截图应用)
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
  button.style.width = '40px';
  button.style.height = '40px';
  button.style.borderRadius = '50%';
  button.style.backgroundColor = color;
  button.style.color = 'white';
  button.style.display = 'flex';
  button.style.justifyContent = 'center';
  button.style.alignItems = 'center';
  button.style.cursor = 'pointer';
  button.style.position = 'absolute';
  button.style.fontSize = '20px';
  button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  button.style.transition = 'transform 0.2s';
  button.style.transform = 'scale(1)';
  button.style.userSelect = 'none';
  
  // 添加悬停效果
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.1)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
  });
  
  // 添加点击事件
  button.addEventListener('click', (e) => {
    e.stopPropagation(); // 阻止事件冒泡
    onClick();
  });
  
  return button;
}

// 显示悬浮菜单
function showHoverMenu() {
  // 禁用点击穿透
  setIgnoreMouseEvents(false);
  
  // 获取宠物位置
  const petRect = pet.getBoundingClientRect();
  const petCenterX = petRect.left + petRect.width / 2;
  const petCenterY = petRect.top + petRect.height / 2;
  
  // 将宠物定位为菜单的绝对中心
  hoverMenuContainer.style.position = 'fixed';
  hoverMenuContainer.style.width = '200px';
  hoverMenuContainer.style.height = '200px';
  hoverMenuContainer.style.left = (petCenterX - 100) + 'px'; // 100是容器宽度的一半
  hoverMenuContainer.style.top = (petCenterY - 100) + 'px'; // 100是容器高度的一半
  hoverMenuContainer.style.display = 'block';
  hoverMenuContainer.style.pointerEvents = 'none'; // 让整个容器不接收鼠标事件
  
  // 定位各个按钮 - 以宠物为中心的环形排列
  const radius = 80; // 按钮距离中心的半径
  const buttons = hoverMenuContainer.querySelectorAll('.hover-menu-button');
  const angleStep = (2 * Math.PI) / buttons.length;
  
  buttons.forEach((button, index) => {
    const angle = index * angleStep;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    
    button.style.position = 'absolute';
    button.style.left = `calc(50% + ${x}px - 20px)`;
    button.style.top = `calc(50% + ${y}px - 20px)`;
    button.style.pointerEvents = 'auto'; // 单独让按钮接收鼠标事件
  });
}

// 隐藏悬浮菜单
function hideHoverMenu() {
  hoverMenuContainer.style.display = 'none';
  
  // 检查鼠标是否在宠物上
  const petRect = pet.getBoundingClientRect();
  const isOverPet = (
    lastMousePosition.x >= petRect.left && 
    lastMousePosition.x <= petRect.right && 
    lastMousePosition.y >= petRect.top && 
    lastMousePosition.y <= petRect.bottom
  );
  
  // 如果鼠标不在宠物上，恢复点击穿透
  if (!isOverPet) {
    setIgnoreMouseEvents(true, { forward: true });
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  // 设置初始位置在窗口中央
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  pet.style.left = (windowWidth / 2 - 50) + 'px'; // 50 是宠物宽度的一半
  pet.style.top = (windowHeight / 2 - 50) + 'px'; // 50 是宠物高度的一半
  
  // 初始化点击和拖拽功能
  initInteractions();
  
  // 初始化悬浮菜单
  initHoverMenu();
  
  // 初始化桌宠状态检查
  setInterval(checkState, 5000);
  
  // 初始化随机动作
  setInterval(randomAction, 30000);
  
  // 鼠标进入宠物时，禁用点击穿透，确保所有鼠标事件都能被捕获
  pet.addEventListener('mouseenter', () => {
    setIgnoreMouseEvents(false);
    console.log('Mouse entered pet - disabling click-through');
  });
  
  // 添加右键菜单事件监听
  pet.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    event.stopPropagation();
    console.log('Right-click detected on pet');
    showContextMenu(event.clientX, event.clientY);
  });
  
  // 添加全局鼠标移动事件来检测鼠标是否在宠物上
  document.addEventListener('mousemove', (e) => {
    // 记录鼠标位置
    lastMousePosition.x = e.clientX;
    lastMousePosition.y = e.clientY;
    
    if (isDragging) {
      // 如果正在拖动，保持鼠标事件捕获
      return;
    }
    
    // 检查右键菜单是否显示
    const contextMenuVisible = document.getElementById('context-menu') !== null;
    if (contextMenuVisible) {
      // 如果右键菜单正在显示，不要启用点击穿透
      return;
    }
    
    // 检查鼠标是否在宠物上
    const petRect = pet.getBoundingClientRect();
    const isOverPet = (
      e.clientX >= petRect.left && 
      e.clientX <= petRect.right && 
      e.clientY >= petRect.top && 
      e.clientY <= petRect.bottom
    );
    
    // 检查鼠标是否在菜单按钮上
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
    
    // 如果鼠标在宠物上，显示菜单
    if (isOverPet && hoverMenuContainer && hoverMenuContainer.style.display === 'none') {
      showHoverMenu();
    }
    
    // 根据鼠标位置设置点击穿透
    const shouldIgnore = !(isOverPet || isOverMenuButton || contextMenuVisible);
    setIgnoreMouseEvents(shouldIgnore, { forward: true });
  });
});

// 初始化交互功能
function initInteractions() {
  // 禁用默认拖动行为
  document.addEventListener('dragstart', (e) => {
    if (e.target === pet) {
      e.preventDefault();
    }
  });
  
  // 添加右键菜单
  pet.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    
    // 确保禁用点击穿透
    setIgnoreMouseEvents(false);
    
    // 创建自定义右键菜单
    showContextMenu(e.clientX, e.clientY);
  });

  // 鼠标按下事件
  pet.addEventListener('mousedown', (e) => {
    // 阻止默认操作
    e.preventDefault();
    e.stopPropagation();
    
    // 确保禁用点击穿透
    setIgnoreMouseEvents(false);
    
    // 记录起始点击位置
    startDragX = e.clientX;
    startDragY = e.clientY;
    
    // 记录点击位置相对于宠物元素的偏移
    offsetX = e.clientX - pet.getBoundingClientRect().left;
    offsetY = e.clientY - pet.getBoundingClientRect().top;
    
    isDragging = true;
    
    // 隐藏悬浮菜单
    if (hoverMenuContainer) {
      hideHoverMenu();
    }
  });
  
  // 鼠标移动事件 - 全局监听
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    // 计算新位置
    let newLeft = e.clientX - offsetX;
    let newTop = e.clientY - offsetY;
    
    // 允许在整个屏幕范围内移动，但确保不会完全移出屏幕
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    
    // 确保至少有20%的宠物在屏幕内
    const visibleThreshold = 0.2;
    const minX = -pet.offsetWidth * (1 - visibleThreshold);
    const minY = -pet.offsetHeight * (1 - visibleThreshold);
    const maxX = screenWidth - pet.offsetWidth * visibleThreshold;
    const maxY = screenHeight - pet.offsetHeight * visibleThreshold;
    
    newLeft = Math.max(minX, Math.min(newLeft, maxX));
    newTop = Math.max(minY, Math.min(newTop, maxY));
    
    // 应用新位置
    pet.style.left = newLeft + 'px';
    pet.style.top = newTop + 'px';
    
    // 如果移动距离超过阈值且还没有进入happy状态，显示happy状态
    if (currentState !== 'happy' && 
        (Math.abs(e.clientX - startDragX) > DRAG_THRESHOLD || 
         Math.abs(e.clientY - startDragY) > DRAG_THRESHOLD)) {
      changeState('happy');
      speak('谢谢你摸我~');
      
      // 更新交互时间
      lastInteractionTime = Date.now();
    }
  });
  
  // 鼠标释放事件 - 全局监听
  document.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    
    // 检查是否真的拖动了
    const dragDistanceX = Math.abs(e.clientX - startDragX);
    const dragDistanceY = Math.abs(e.clientY - startDragY);
    const wasDragged = dragDistanceX > DRAG_THRESHOLD || dragDistanceY > DRAG_THRESHOLD;
    
    isDragging = false;
    
    if (wasDragged) {
      // 如果真的拖动了，恢复正常状态
      setTimeout(() => changeState('normal'), 500);
    } else {
      // 如果没有真正拖动，则视为点击
      handlePetClick(e);
    }
    
    // 检查鼠标是否仍在宠物上
    const petRect = pet.getBoundingClientRect();
    const isOverPet = (
      e.clientX >= petRect.left && 
      e.clientX <= petRect.right && 
      e.clientY >= petRect.top && 
      e.clientY <= petRect.bottom
    );
    
    // 如果鼠标在宠物上，显示悬浮菜单
    if (isOverPet && hoverMenuContainer) {
      showHoverMenu();
    }
    // 如果鼠标不在宠物上，恢复点击穿透
    else if (!isOverPet) {
      setIgnoreMouseEvents(true, { forward: true });
    }
  });
  
  // 直接添加点击事件监听器
  pet.addEventListener('click', (e) => {
    // 如果刚刚结束拖动，忽略这次点击
    if (isDragging) return;
    
    // 防止事件冒泡
    e.stopPropagation();
    
    handlePetClick(e);
  });
}

// 处理点击宠物
function handlePetClick(e) {
  console.log('Pet clicked!');
  const now = Date.now();
  
  // 更新最后交互时间
  lastInteractionTime = now;
  
  // 检测双击
  if (now - lastClickTime < CLICK_TIMEOUT) {
    console.log('Double click detected!');
    
    // 增加跳舞计数
    danceCount++;
    console.log('Dance count:', danceCount);
    
    // 检查是否达到跳舞阈值
    if (danceCount >= DANCE_THRESHOLD) {
      // 重置跳舞计数
      danceCount = 0;
      
      // 触发生气状态
      changeState('angry');
      speak('别让我再跳舞了！我累了！😠');
      setTimeout(() => changeState('normal'), 3000);
    } else {
      // 双击触发跳舞
      changeState('dance');
      speak('看我跳舞！');
      setTimeout(() => changeState('normal'), 3000);
    }
    
    // 重置点击时间
    lastClickTime = 0;
    return;
  }
  
  // 记录这次点击时间
  lastClickTime = now;
  
  // 单击行为
  changeState('happy');
  speak('你好啊！');
  setTimeout(() => changeState('normal'), 2000);
}

// 状态检查
function checkState() {
  const currentTime = Date.now();
  const timeSinceLastInteraction = currentTime - lastInteractionTime;
  
  // 如果超过30秒没有交互，变为无聊状态
  if (timeSinceLastInteraction > 30000 && currentState !== 'bored') {
    changeState('bored');
    speak('好无聊啊...');
  }
}

// 随机动作
function randomAction() {
  // 只有在正常状态下才执行随机动作
  if (currentState === 'normal') {
    const actions = [
      () => {
        // 增加跳舞计数
        danceCount++;
        console.log('Dance count (random):', danceCount);
        
        // 检查是否达到跳舞阈值
        if (danceCount >= DANCE_THRESHOLD) {
          // 重置跳舞计数
          danceCount = 0;
          
          // 触发生气状态
          changeState('angry');
          speak('都说了我不想跳舞了！😠');
          setTimeout(() => changeState('normal'), 3000);
        } else {
          // 跳舞
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
    
    // 随机选择一个动作
    const randomIndex = Math.floor(Math.random() * actions.length);
    actions[randomIndex]();
    
    // 更新交互时间，避免立即进入无聊状态
    lastInteractionTime = Date.now();
  }
}

// 改变状态
function changeState(state) {
  console.log('Changing state to:', state);
  pet.className = state;
  currentState = state;
}

// 显示对话泡泡
function speak(text) {
  console.log('Speaking:', text);
  speechBubble.textContent = text;
  
  // 获取宠物当前位置
  const petRect = pet.getBoundingClientRect();
  
  // 定位对话泡泡在宠物上方
  speechBubble.style.left = (petRect.left + 20) + 'px';
  speechBubble.style.top = (petRect.top - 50) + 'px';
  speechBubble.style.display = 'block';
  
  // 设置自动隐藏
  setTimeout(hideSpeechBubble, 3000);
}

// 隐藏对话泡泡
function hideSpeechBubble() {
  speechBubble.style.display = 'none';
}

// 显示自定义右键菜单
function showContextMenu(x, y) {
  console.log('Showing context menu at:', x, y);
  
  // 确保禁用点击穿透
  setIgnoreMouseEvents(false);
  
  // 移除可能已存在的菜单
  const existingMenu = document.getElementById('context-menu');
  if (existingMenu) {
    document.body.removeChild(existingMenu);
  }
  
  // 创建菜单容器
  const contextMenu = document.createElement('div');
  contextMenu.id = 'context-menu';
  contextMenu.style.position = 'fixed';
  contextMenu.style.left = x + 'px';
  contextMenu.style.top = y + 'px';
  contextMenu.style.backgroundColor = 'white';
  contextMenu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  contextMenu.style.padding = '5px 0';
  contextMenu.style.borderRadius = '4px';
  contextMenu.style.zIndex = '2500'; // 确保在最上层
  contextMenu.style.minWidth = '120px';
  
  // 创建设置按钮
  const settingsOption = document.createElement('div');
  settingsOption.className = 'context-menu-option';
  settingsOption.textContent = '设置';
  settingsOption.style.padding = '8px 15px';
  settingsOption.style.cursor = 'pointer';
  settingsOption.style.fontSize = '14px';
  
  settingsOption.addEventListener('mouseover', () => {
    settingsOption.style.backgroundColor = '#f0f0f0';
  });
  
  settingsOption.addEventListener('mouseout', () => {
    settingsOption.style.backgroundColor = 'transparent';
  });
  
  settingsOption.addEventListener('click', () => {
    // 关闭菜单
    hideContextMenu();
    // 打开设置窗口
    ipcRenderer.send('open-settings');
  });
  
  // 创建关闭按钮
  const closeOption = document.createElement('div');
  closeOption.className = 'context-menu-option';
  closeOption.textContent = '关闭';
  closeOption.style.padding = '8px 15px';
  closeOption.style.cursor = 'pointer';
  closeOption.style.fontSize = '14px';
  
  closeOption.addEventListener('mouseover', () => {
    closeOption.style.backgroundColor = '#f0f0f0';
  });
  
  closeOption.addEventListener('mouseout', () => {
    closeOption.style.backgroundColor = 'transparent';
  });
  
  closeOption.addEventListener('click', () => {
    // 关闭应用
    ipcRenderer.send('quit-app');
  });
  
  // 添加选项到菜单
  contextMenu.appendChild(settingsOption);
  contextMenu.appendChild(closeOption);
  
  // 添加菜单到页面
  document.body.appendChild(contextMenu);
  
  // 点击其他区域关闭菜单
  document.addEventListener('click', hideContextMenu);
  document.addEventListener('contextmenu', hideContextMenu);
}

// 隐藏右键菜单
function hideContextMenu() {
  console.log('Hiding context menu');
  
  const contextMenu = document.getElementById('context-menu');
  if (contextMenu) {
    document.body.removeChild(contextMenu);
  }
  
  // 移除点击事件监听
  document.removeEventListener('click', hideContextMenu);
  document.removeEventListener('contextmenu', hideContextMenu);
  
  // 延迟检查鼠标是否在宠物上，给点击事件处理一些时间
  setTimeout(() => {
    // 检查鼠标是否在宠物上
    const petRect = pet.getBoundingClientRect();
    const isOverPet = (
      lastMousePosition.x >= petRect.left && 
      lastMousePosition.x <= petRect.right && 
      lastMousePosition.y >= petRect.top && 
      lastMousePosition.y <= petRect.bottom
    );
    
    // 如果鼠标不在宠物上，恢复点击穿透
    if (!isOverPet) {
      setIgnoreMouseEvents(true, { forward: true });
    }
  }, 100);
}

// 接收来自主进程的消息
ipcRenderer.on('show-calculator', () => {
  openSystemCalculator();
});

ipcRenderer.on('take-screenshot', () => {
  takeSystemScreenshot();
});

// 接收设置更新消息
ipcRenderer.on('apply-settings', (event, settings) => {
  applySettings(settings);
});

// 应用设置
function applySettings(settings) {
  // 应用宠物大小
  if (settings.petSize) {
    const scale = settings.petSize / 100;
    pet.style.transform = `scale(${scale})`;
  }
  
  // 应用菜单按钮颜色
  if (settings.menuColor && hoverMenuContainer) {
    const buttons = hoverMenuContainer.querySelectorAll('.hover-menu-button');
    buttons.forEach(button => {
      if (button.id === 'calc-button') {
        button.style.backgroundColor = settings.menuColor;
      }
    });
  }
  
  // 其他设置应用
  console.log('应用设置:', settings);
}