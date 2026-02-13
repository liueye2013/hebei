# 河北电视台直播代理服务器

通过代理服务器解决河北电视台直播的签名问题，支持多频道播放。

## 功能特性

- 自动生成MD5签名
- 5分钟缓存自动更新
- 支持302重定向到官网
- 多频道支持

## 支持频道

- 卫视频道：`/weishi.m3u8`
- 农民频道：`/nongmin.m3u8`
- 都市频道：`/dushi.m3u8`
- 公共频道：`/gonggong.m3u8`
- 生活频道：`/shenghuo.m3u8`
- 经济频道：`/jingji.m3u8`

## 本地运行

```bash
# 安装依赖（无需额外依赖，Node.js内置）
node proxy-server.js
```

访问地址：`http://localhost:3002/weishi.m3u8`

## 部署到免费平台

### 1. Render（推荐）

1. 将代码推送到GitHub
2. 访问 [render.com](https://render.com/)
3. 点击 "New" → "Web Service"
4. 连接你的GitHub仓库
5. 配置：
   - Build Command: `npm install`
   - Start Command: `node proxy-server.js`
6. 部署完成后获得访问地址

### 2. Glitch

1. 访问 [glitch.com](https://glitch.com/)
2. 点击 "New Project" → "glitch-hello-node"
3. 将 `proxy-server.js` 的内容复制到 `server.js`
4. 点击 "Show" 查看访问地址

### 3. Replit

1. 访问 [replit.com](https://replit.com/)
2. 点击 "Create Repl" → 选择 "Node.js"
3. 将 `proxy-server.js` 的内容复制到 `index.js`
4. 点击 "Run" 运行

### 4. Railway

1. 访问 [railway.app](https://railway.app/)
2. 点击 "New Project" → "Deploy from GitHub repo"
3. 选择你的GitHub仓库
4. 自动部署完成

## 使用方式

将以下地址添加到支持m3u8的播放器（如百川影音）：

```
http://your-domain.com/weishi.m3u8
http://your-domain.com/nongmin.m3u8
http://your-domain.com/dushi.m3u8
```

## 工作原理

1. 播放器请求代理服务器的m3u8链接
2. 服务器生成有效的t和k签名参数
3. 返回302重定向到官网链接
4. 播放器跟随重定向，直接从官网获取内容

## 注意事项

- 签名每5分钟自动更新
- 播放器只需请求一次，后续直接走官网
- 支持CORS，可跨域访问
