# QAPlanet - AI问答社区平台

## 项目简介
QAPlanet是一个专注于AI相关问题讨论的社区平台，用户可以分享和讨论有关ChatGPT、Claude、Gemini等AI模型的使用经验和问题。

## 技术栈
- 后端：Node.js + Express
- 数据库：MongoDB
- 认证：JWT
- 前端：HTML + CSS + JavaScript

## 本地运行步骤

1. 安装依赖
```bash
npm install
```

2. 配置环境变量
复制 `.env.example` 到 `.env` 并修改配置：
```bash
cp .env.example .env
```

3. 启动MongoDB
确保MongoDB服务已启动

4. 运行开发服务器
```bash
npm run dev
```

## 部署说明

### 部署到Railway
1. 注册Railway账号：https://railway.app
2. 连接GitHub仓库
3. 配置环境变量
4. 自动部署

### 部署到Vercel
1. 注册Vercel账号：https://vercel.com
2. 导入GitHub仓库
3. 配置环境变量
4. 自动部署

### 部署到自有服务器
1. 安装Node.js和MongoDB
2. 克隆代码
3. 安装依赖
4. 配置环境变量
5. 使用PM2运行：
```bash
npm install -g pm2
pm2 start src/app.js --name qaplanet
```

## API文档
API文档见：`/docs/api.md`

## 许可证
MIT 