# VoiceForge Pro (fish-tts-cfpages 升级版)

基于 Cloudflare Pages 和 Functions 构建的高级多模态语音合成与克隆前端。

## 🌟 新增“拉满”功能特性
1. **多模型无缝切换**：前端支持 Fish TTS、阿里云、SiliconFlow 三个不同平台的 API 一键切换。
2. **现代化响应式 UI**：采用 TailwindCSS + DaisyUI 打造类似 iOS/HarmonyOS 的毛玻璃 (Glassmorphism) 质感，完美适配移动端与桌面端。
3. **沉浸式暗黑模式**：一键切换夜间模式。
4. **集成声音克隆**：专门的 Clone 界面，支持录音文件拖拽上传。
5. **灵活的鉴权机制**：
   - 生产环境：通过 Cloudflare Pages 环境变量 (`FISH_API_KEY` 等) 保护您的密钥。
   - 本地/体验环境：内置本地浏览器密钥存储（点击右上角齿轮⚙️设置），无需重新部署即可随时更换 API Key。
6. **参数微调**：语速、音调滑块，情感预设下拉菜单。
7. **长文本适配**：专注文学与创作体验的大视野文本框。

## 🚀 部署指南 (Cloudflare Pages)

1. 将本项目的代码推送到您的 GitHub / GitLab 仓库。
2. 登录 Cloudflare 仪表板，进入 **Pages** -> **Connect to Git**。
3. 选择对应仓库。
4. **构建设置**：
   - 框架预设：`None`
   - 构建命令：留空 (本项目纯静态 + serverless 函数，无需 node 构建)
   - 构建输出目录：`public`  *(⚠️重要：必须填写 public，因为静态资源在 public 文件夹内)*
5. **环境变量配置** (可选)：
   在 Cloudflare Pages 的 Settings -> Environment Variables 中添加：
   - `FISH_API_KEY` = 您的 Fish Audio 密钥
   - `ALIYUN_API_KEY` = 您的阿里云密钥
   - `SILICONFLOW_API_KEY` = 您的 SiliconFlow 密钥
6. 点击部署，1分钟后即可获得全球 CDN 加速的专属声音工作站！

## 📂 目录结构说明
*   `/public/` - 前端静态资源 (HTML, JS, CSS 框架 CDN 引入)
*   `/functions/api/` - 后端 API 路由，基于 Cloudflare Workers 架构处理跨域并隐藏真实 API Key。
