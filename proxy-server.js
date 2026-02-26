// proxy-server.js - 服务入口

const http = require('http');
const url = require('url');
const hb = require('./hb');
const sd = require('./sd');

// 服务器配置
const PORT = 8080;

// 路由配置：路径前缀 -> 模块
const ROUTES = {
    '/hb/': hb,
    '/sd/': sd
};

// 处理请求
function handleRequest(req, res) {
    const startTime = Date.now();
    const parsedUrl = url.parse(req.url);
    const path = parsedUrl.pathname;

    // 解析路径格式: /模块/频道.m3u8 或 /频道.m3u8 (默认hb)
    let module = hb;
    let channelPath = path;

    for (const [prefix, mod] of Object.entries(ROUTES)) {
        if (path.startsWith(prefix)) {
            module = mod;
            channelPath = path.slice(prefix.length - 1); // 保留 /
            break;
        }
    }

    // 解析频道名
    const match = channelPath.match(/^\/([a-z]+)\.m3u8$/);
    if (!match) {
        res.writeHead(404, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Access-Control-Allow-Origin': '*'
        });
        res.end('Not Found. Usage: /hb/weishi.m3u8 or /sd/qilu.m3u8');
        return;
    }

    const channel = match[1];

    // 检查频道是否存在
    if (!module.isChannelExists(channel)) {
        res.writeHead(404, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(`Channel '${channel}' not supported`);
        return;
    }

    // 根据模块类型处理
    if (module === hb) {
        // HB模块：返回重定向
        module.updateCache(channel).then(cache => {
            const { t, k } = cache;
            const targetUrl = module.buildTargetUrl(channel, t, k);

            const processingTime = Date.now() - startTime;
            console.log(`[HB] ${channel} -> ${targetUrl} (${processingTime}ms)`);

            res.writeHead(302, {
                'Location': targetUrl,
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            res.end();
        }).catch(err => {
            console.error(`[HB] ${channel} 失败:`, err);
            res.writeHead(500, {
                'Content-Type': 'text/plain; charset=utf-8',
                'Access-Control-Allow-Origin': '*'
            });
            res.end('Server Error: ' + err.message);
        });
    } else if (module === sd) {
        // SD模块：返回流地址重定向
        module.getStreamUrl(channel).then(streamUrl => {
            const processingTime = Date.now() - startTime;
            console.log(`[SD] ${channel} -> ${streamUrl} (${processingTime}ms)`);

            res.writeHead(302, {
                'Location': streamUrl,
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            res.end();
        }).catch(err => {
            console.error(`[SD] ${channel} 失败:`, err);
            res.writeHead(500, {
                'Content-Type': 'text/plain; charset=utf-8',
                'Access-Control-Allow-Origin': '*'
            });
            res.end('Server Error: ' + err.message);
        });
    }
}

// 创建服务器
const server = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Origin, Referer'
        });
        res.end();
        return;
    }

    if (req.url.endsWith('.m3u8')) {
        console.log(`[请求] ${req.url}`);
    }

    handleRequest(req, res);
});

// 启动服务器
server.listen(PORT, () => {
    console.log(`服务运行在: http://localhost:${PORT}`);
    console.log('可用路径:');
    console.log('HB:');
    for (const channel of hb.getChannelList()) {
        console.log(`  - /hb/${channel}.m3u8`);
    }
    console.log('SD:');
    for (const channel of sd.getChannelList()) {
        console.log(`  - /sd/${channel}.m3u8`);
    }
    console.log('服务已启动');
});
