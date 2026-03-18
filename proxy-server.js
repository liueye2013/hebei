const http = require('http');
const url = require('url');
const hb = require('./hb');
const sd = require('./sd');
const zj = require('./zj');
const freetv = require('./freetv');

const PORT = 8080;

const ROUTES = {
    '/hb/': hb,
    '/sd/': sd,
    '/zj/': zj
};

async function handleRequest(req, res) {
    const startTime = Date.now();
    const parsedUrl = url.parse(req.url);
    const path = parsedUrl.pathname;

    // /CHCJT/1.m3u8
    const chcMatch = path.match(/^\/CHCJT\/1\.m3u8$/);
    if (chcMatch) {
        try {
            const links = await freetv.getChannelLinks('CHC家庭影院');
            const targetUrl = links[0];

            if (!targetUrl) {
                res.writeHead(404, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
                res.end('Channel not found');
                return;
            }

            console.log(`[CHCJT] -> ${targetUrl} (${Date.now() - startTime}ms)`);

            res.writeHead(302, { 'Location': targetUrl, 'Access-Control-Allow-Origin': '*' });
            res.end();
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
            res.end('');
        }
        return;
    }

    // /CHCYM/1.m3u8
    const chcymMatch = path.match(/^\/CHCYM\/1\.m3u8$/);
    if (chcymMatch) {
        try {
            const links = await freetv.getChannelLinks('CHC影迷電影');
            const targetUrl = links[0];

            if (!targetUrl) {
                res.writeHead(404, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
                res.end('Channel not found');
                return;
            }

            console.log(`[CHCYM] -> ${targetUrl} (${Date.now() - startTime}ms)`);

            res.writeHead(302, { 'Location': targetUrl, 'Access-Control-Allow-Origin': '*' });
            res.end();
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
            res.end('Server error');
        }
        return;
    }

    // /CHCDZ/1.m3u8
    const chcdzMatch = path.match(/^\/CHCDZ\/1\.m3u8$/);
    if (chcdzMatch) {
        try {
            const links = await freetv.getChannelLinks('CHC動作電影');
            const targetUrl = links[0];

            if (!targetUrl) {
                res.writeHead(404, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
                res.end('Channel not found');
                return;
            }

            console.log(`[CHCDZ] -> ${targetUrl} (${Date.now() - startTime}ms)`);

            res.writeHead(302, { 'Location': targetUrl, 'Access-Control-Allow-Origin': '*' });
            res.end();
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
            res.end('Server error');
        }
        return;
    }

    // /ZSJC/1.m3u8
    const zsjcMatch = path.match(/^\/ZSJC\/1\.m3u8$/);
    if (zsjcMatch) {
        try {
            const links = await freetv.getChannelLinks('中視菁采臺');
            const targetUrl = links[0];

            if (!targetUrl) {
                res.writeHead(404, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
                res.end('Channel not found');
                return;
            }

            console.log(`[ZSJC] -> ${targetUrl} (${Date.now() - startTime}ms)`);

            res.writeHead(302, { 'Location': targetUrl, 'Access-Control-Allow-Origin': '*' });
            res.end();
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
            res.end('Server error');
        }
        return;
    }

    // 解析路径格式: /模块/频道.m3u8
    let module = hb;
    let channelPath = path;

    for (const [prefix, mod] of Object.entries(ROUTES)) {
        if (path.startsWith(prefix)) {
            module = mod;
            channelPath = path.slice(prefix.length - 1);
            break;
        }
    }

    const match = channelPath.match(/^\/([a-z]+)\.m3u8$/);
    if (!match) {
        res.writeHead(404, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
        res.end('Not Found');
        return;
    }

    const channel = match[1];

    if (!module.isChannelExists(channel)) {
        res.writeHead(404, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
        res.end('Channel not found');
        return;
    }

    if (module === hb) {
        module.updateCache(channel).then(cache => {
            const targetUrl = module.buildTargetUrl(channel, cache.t, cache.k);
            console.log(`[HB] ${channel} -> ${targetUrl} (${Date.now() - startTime}ms)`);
            res.writeHead(302, { 'Location': targetUrl, 'Access-Control-Allow-Origin': '*' });
            res.end();
        }).catch(() => {
            res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
            res.end('Error');
        });
    } else if (module === sd) {
        module.getStreamUrl(channel).then(streamUrl => {
            console.log(`[SD] ${channel} -> ${streamUrl} (${Date.now() - startTime}ms)`);
            res.writeHead(302, { 'Location': streamUrl, 'Access-Control-Allow-Origin': '*' });
            res.end();
        }).catch(() => {
            res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
            res.end('Error');
        });
    } else if (module === zj) {
        module.getStreamUrl(channel).then(streamUrl => {
            console.log(`[ZJ] ${channel} -> ${streamUrl} (${Date.now() - startTime}ms)`);
            res.writeHead(302, { 'Location': streamUrl, 'Access-Control-Allow-Origin': '*' });
            res.end();
        }).catch(() => {
            res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
            res.end('Error');
        });
    }
}

const server = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') {
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' });
        res.end();
        return;
    }

    handleRequest(req, res).catch(() => {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error');
    });
});

server.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
