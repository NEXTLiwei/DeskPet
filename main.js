const { app, BrowserWindow, ipcMain, screen, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
// 当前设置
// 引入 child_process 模块 
const { exec } = require('child_process');

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

// 当前设置
let currentSettings = { ...defaultSettings };

let mainWindow;

// 确保应用启动时就禁用菜单栏
app.on('ready', () => {
  Menu.setApplicationMenu(null);
});

function createWindow() {
  // 获取屏幕尺寸
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    transparent: true,
    frame: false,
    skipTaskbar: true, // 不在任务栏显示图标
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });
  
  // 启用开发者工具，便于调试
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.loadFile('index.html');
  mainWindow.setAlwaysOnTop(true);
  
  // 设置窗口为点击穿透
  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  
  // 在生产环境下隐藏开发者工具
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();
  
  // 初始化 IPC 监听器
  initIPCListeners();
  
  // 加载设置
  currentSettings = loadSettings();

});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

function initIPCListeners() {
  // 监听获取设置请求 (同步)
  ipcMain.on('get-settings', (event) => {
    try {
      // 返回当前设置
      event.returnValue = currentSettings || loadSettings();
    } catch (error) {
      console.error('获取设置失败:', error);
      event.returnValue = defaultSettings;
    }
  });

  // 监听工具重载请求
  ipcMain.on('reload-tools', () => {
    if(mainWindow) {
      mainWindow.webContents.send('apply-settings', currentSettings);
      console.log('已发送工具重载请求到渲染进程');
    }
  });
  // 监听忽略鼠标事件的请求
  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    mainWindow.setIgnoreMouseEvents(ignore, options);
  });

  // 监听打开系统应用的请求
  ipcMain.on('open-system-app', (event, appName) => {
    if (process.platform === 'win32') {
      exec(`start ${appName}`, (error) => {
        if (error) {
          console.error(`启动应用错误: ${error}`);
        }
      });
    } else if (process.platform === 'darwin') {
      exec(`open -a "${appName}"`, (error) => {
        if (error) {
          console.error(`启动应用错误: ${error}`);
        }
      });
    } else if (process.platform === 'linux') {
      exec(appName, (error) => {
        if (error) {
          console.error(`启动应用错误: ${error}`);
        }
      });
    }
  });

  // 监听系统截图请求
  ipcMain.on('take-system-screenshot', (event) => {
    if (process.platform === 'darwin') {
      // macOS 截图快捷键 Cmd+Shift+4
      exec('screencapture -i ~/Desktop/screenshot.png', (error) => {
        if (error) {
          console.error(`截图错误: ${error}`);
        }
      });
    }
    // 对于其他平台，已在 renderer.js 中处理
  });

  // 存储设置窗口的引用
  let settingsWindow = null;

  // 监听打开设置窗口的请求
  ipcMain.on('open-settings', () => {
    // 如果设置窗口已经存在，则聚焦到该窗口
    if (settingsWindow) {
      settingsWindow.focus();
      return;
    }
    
    settingsWindow = new BrowserWindow({
      width: 800,
      height: 600,
      title: '桌面宠物设置',
      frame: false,
      resizable: true,
      minimizable: true,
      maximizable: false,
      parent: mainWindow,
      modal: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false, // 注意这里设置为false
        enableRemoteModule: true // 如果需要使用remote模块
      }
    });
    
    // 加载设置页面
    settingsWindow.loadFile('settings.html');
    
    // 处理窗口关闭事件
    settingsWindow.on('closed', () => {
      settingsWindow = null;
    });
  });

  // 窗口控制
  ipcMain.on('window-control', (event, command) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return;

    if (command === 'minimize') {
      win.minimize();
    } else if (command === 'close') {
      win.close();
    }
  });

  // 监听退出应用请求
  ipcMain.on('quit-app', () => {
    app.quit();
  });

  // 监听保存设置请求
  ipcMain.on('save-settings', (event, settings) => {
    try {
      // 更新当前设置
      currentSettings = { ...settings };
      
      // 保存到文件
      const settingsPath = path.join(__dirname, 'settings.json');
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
      
      // 应用设置
      applySettings(settings);
      
      // 通知设置窗口保存成功
      if (settingsWindow) {
        settingsWindow.webContents.send('settings-saved', true);
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      
      // 通知设置窗口保存失败
      if (settingsWindow) {
        settingsWindow.webContents.send('settings-saved', false);
      }
    }
  });
}

// 加载设置
function loadSettings() {
  try {
    const settingsPath = path.join(__dirname, 'settings.json');
    
    // 检查文件是否存在
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      const settings = JSON.parse(data);
      
      // 更新当前设置
      currentSettings = { ...settings };
      
      // 应用设置
      applySettings(settings);
    } else {
      // 如果文件不存在，创建并保存默认设置
      fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2), 'utf8');
    }
  } catch (error) {
    console.error('加载设置失败:', error);
  }
  
  return currentSettings;
}

// 应用设置
function applySettings(settings) {
  // 设置窗口置顶
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(settings.topmost);
    
    // 通知渲染进程应用设置
    mainWindow.webContents.send('apply-settings', settings);
  }
}