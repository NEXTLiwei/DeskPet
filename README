# 桌面宠物

基于Electron构建的定制桌面宠物应用。该应用提供一个可爱的交互式角色，它会停留在您的桌面上，提供快速访问工具的功能，并包含AI聊天助手。

![桌面宠物](./assets/pet-normal.png)

## 功能特点

- **交互式宠物**：点击、拖拽和与您的桌面伙伴互动
- **快速访问工具**：通过悬停菜单访问计算器、截图和时钟等实用工具
- **自定义功能**：更改宠物大小、外观和工具配置
- **AI聊天助手**：内置聊天窗口，支持OpenAI和Anthropic模型
- **跨平台**：适用于Windows、macOS和Linux
- **始终置顶模式**：让您的宠物始终可见
- **启动选项**：在计算机启动时自动运行

## 安装

### 前提条件

- Node.js (14版本或更高)
- npm或yarn

### 设置

1. 克隆仓库
   ```
   git clone https://github.com/yourusername/desktop-pet.git
   cd desktop-pet
   ```

2. 安装依赖
   ```
   npm install
   ```

3. 运行应用
   ```
   npm start
   ```

### 构建分发版本

要为您的平台构建应用：

```
npm run build
```

这将在`dist/`目录中创建可分发的包。

## 使用方法

### 基本交互

- **点击**：与宠物互动
- **双击**：让宠物跳舞
- **拖拽**：在屏幕上移动宠物
- **右键点击**：访问设置和退出的上下文菜单
- **悬停**：在宠物周围显示工具菜单

### 工具

当您将鼠标悬停在宠物上时，四个可自定义工具会环绕宠物显示：

1. **计算器**：打开系统计算器
2. **截图**：启动系统截图工具
3. **时钟**：显示当前时间
4. **帮助**：显示宠物使用提示

### AI聊天

通过在设置菜单中配置API设置来访问AI聊天。聊天支持：

- OpenAI模型（需要API密钥）
- Anthropic模型（需要API密钥）

## 配置

### 设置菜单

通过右键点击宠物并选择"设置"来访问设置。您可以配置：

- **工具**：自定义宠物周围显示的工具
- **个性化**：更改宠物大小、风格和菜单颜色
- **AI设置**：配置自动行为和移动
- **其他设置**：设置启动选项、始终置顶和声音偏好

### 设置文件

应用将设置存储在应用目录中的`settings.json`文件中。默认设置：

```json
{
  "startup": true,
  "topmost": true,
  "sounds": true,
  "petSize": 100,
  "petStyle": "default",
  "menuColor": "#4a90e2",
  "randomMovement": true,
  "autoActions": true,
  "actionFrequency": "medium",
  "tools": {
    "position1": "calc",
    "position2": "screenshot",
    "position3": "help",
    "position4": "clock"
  }
}
```

## 开发

### 项目结构

- `main.js` - 主Electron进程
- `renderer.js` - UI交互和宠物行为
- `index.html` - 主应用窗口
- `ai-chat.html` - AI聊天界面
- `settings.html` - 设置界面
- `setting.js` - 设置逻辑
- `styles.css` - 应用样式

### 添加新的宠物风格

要添加新的宠物风格：

1. 将您的图像资源添加到`assets/`文件夹
2. 更新`styles.css`中的CSS，包含您的新风格
3. 在设置窗口中添加您的风格选项

### 添加新工具

要添加新工具：

1. 在`renderer.js`中的`getToolIcon()`函数中添加新的工具类型
2. 在`handleToolClick()`函数中添加工具处理
3. 更新设置页面中的工具选项

## 许可

本项目采用MIT许可证 - 详情请参见LICENSE文件。

## 致谢

- 图标和宠物图像来源于[设计资源]
- 使用[Electron](https://www.electronjs.org/)构建
