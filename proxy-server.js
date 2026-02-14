// proxyservice
// 优化版本：高效使用签名，稳定返回官网链接

const http = require('http');
const url = require('url');

// 配置
const PORT = 8080;
const LIVE_KEY = "k5m9p2x8r4b3";
const TK_CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存
const CHANNELS = {
    weishi: "/jishi/weishipindao.m3u8",
    dushi: "/jishi/dushipindao.m3u8",
    gonggong: "/jishi/gonggongpindao.m3u8",
    shenghuo: "/jishi/shenghuopindao.m3u8",
    jingji: "/jishi/jingjishenghuo.m3u8",
    nongmin: "/jishi/nongminpindao.m3u8"
};

// 缓存对象 - 只存储t和k参数
const tkCache = {};

// 生成北京时间的时间戳（UTC+8）
function getBeijingTimestamp() {
    const now = new Date();
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    return Math.floor(beijingTime.getTime() / 1000).toString();
}

// MD5 函数
function md5(str) {
    function safeAdd(x,y){var lsw=(x&0xffff)+(y&0xffff)
    var msw=(x>>16)+(y>>16)+(lsw>>16)
    return(msw<<16)|(lsw&0xffff)}
    function bitRotateLeft(num,cnt){return(num<<cnt)|(num>>>(32-cnt))}
    function md5cmn(q,a,b,x,s,t){return safeAdd(bitRotateLeft(safeAdd(safeAdd(a,q),safeAdd(x,t)),s),b)}
    function md5ff(a,b,c,d,x,s,t){return md5cmn((b&c)|(~b&d),a,b,x,s,t)}
    function md5gg(a,b,c,d,x,s,t){return md5cmn((b&d)|(c&~d),a,b,x,s,t)}
    function md5hh(a,b,c,d,x,s,t){return md5cmn(b^c^d,a,b,x,s,t)}
    function md5ii(a,b,c,d,x,s,t){return md5cmn(c^(b|~d),a,b,x,s,t)}
    function binlMD5(x,len){x[len>>5]|=0x80<<len%32
    x[(((len+64)>>>9)<<4)+14]=len
    var i
    var olda
    var oldb
    var oldc
    var oldd
    var a=1732584193
    var b=-271733879
    var c=-1732584194
    var d=271733878
    for(i=0;i<x.length;i+=16){olda=a
    oldb=b
    oldc=c
    oldd=d
    a=md5ff(a,b,c,d,x[i],7,-680876936)
    d=md5ff(d,a,b,c,x[i+1],12,-389564586)
    c=md5ff(c,d,a,b,x[i+2],17,606105819)
    b=md5ff(b,c,d,a,x[i+3],22,-1044525330)
    a=md5ff(a,b,c,d,x[i+4],7,-176418897)
    d=md5ff(d,a,b,c,x[i+5],12,1200080426)
    c=md5ff(c,d,a,b,x[i+6],17,-1473231341)
    b=md5ff(b,c,d,a,x[i+7],22,-45705983)
    a=md5ff(a,b,c,d,x[i+8],7,1770035416)
    d=md5ff(d,a,b,c,x[i+9],12,-1958414417)
    c=md5ff(c,d,a,b,x[i+10],17,-42063)
    b=md5ff(b,c,d,a,x[i+11],22,-1990404162)
    a=md5ff(a,b,c,d,x[i+12],7,1804603682)
    d=md5ff(d,a,b,c,x[i+13],12,-40341101)
    c=md5ff(c,d,a,b,x[i+14],17,-1502002290)
    b=md5ff(b,c,d,a,x[i+15],22,1236535329)
    a=md5gg(a,b,c,d,x[i+1],5,-165796510)
    d=md5gg(d,a,b,c,x[i+6],9,-1069501632)
    c=md5gg(c,d,a,b,x[i+11],14,643717713)
    b=md5gg(b,c,d,a,x[i],20,-373897302)
    a=md5gg(a,b,c,d,x[i+5],5,-701558691)
    d=md5gg(d,a,b,c,x[i+10],9,38016083)
    c=md5gg(c,d,a,b,x[i+15],14,-660478335)
    b=md5gg(b,c,d,a,x[i+4],20,-405537848)
    a=md5gg(a,b,c,d,x[i+9],5,568446438)
    d=md5gg(d,a,b,c,x[i+14],9,-1019803690)
    c=md5gg(c,d,a,b,x[i+3],14,-187363961)
    b=md5gg(b,c,d,a,x[i+8],20,1163531501)
    a=md5gg(a,b,c,d,x[i+13],5,-1444681467)
    d=md5gg(d,a,b,c,x[i+2],9,-51403784)
    c=md5gg(c,d,a,b,x[i+7],14,1735328473)
    b=md5gg(b,c,d,a,x[i+12],20,-1926607734)
    a=md5hh(a,b,c,d,x[i+5],4,-378558)
    d=md5hh(d,a,b,c,x[i+8],11,-2022574463)
    c=md5hh(c,d,a,b,x[i+11],16,1839030562)
    b=md5hh(b,c,d,a,x[i+14],23,-35309556)
    a=md5hh(a,b,c,d,x[i+1],4,-1530992060)
    d=md5hh(d,a,b,c,x[i+4],11,1272893353)
    c=md5hh(c,d,a,b,x[i+7],16,-155497632)
    b=md5hh(b,c,d,a,x[i+10],23,-1094730640)
    a=md5hh(a,b,c,d,x[i+13],4,681279174)
    d=md5hh(d,a,b,c,x[i],11,-358537222)
    c=md5hh(c,d,a,b,x[i+3],16,-722521979)
    b=md5hh(b,c,d,a,x[i+6],23,76029189)
    a=md5hh(a,b,c,d,x[i+9],4,-640364487)
    d=md5hh(d,a,b,c,x[i+12],11,-421815835)
    c=md5hh(c,d,a,b,x[i+15],16,530742520)
    b=md5hh(b,c,d,a,x[i+2],23,-995338651)
    a=md5ii(a,b,c,d,x[i],6,-198630844)
    d=md5ii(d,a,b,c,x[i+7],10,1126891415)
    c=md5ii(c,d,a,b,x[i+14],15,-1416354905)
    b=md5ii(b,c,d,a,x[i+5],21,-57434055)
    a=md5ii(a,b,c,d,x[i+12],6,1700485571)
    d=md5ii(d,a,b,c,x[i+3],10,-1894986606)
    c=md5ii(c,d,a,b,x[i+10],15,-1051523)
    b=md5ii(b,c,d,a,x[i+1],21,-2054922799)
    a=md5ii(a,b,c,d,x[i+8],6,1873313359)
    d=md5ii(d,a,b,c,x[i+15],10,-30611744)
    c=md5ii(c,d,a,b,x[i+6],15,-1560198380)
    b=md5ii(b,c,d,a,x[i+13],21,1309151649)
    a=md5ii(a,b,c,d,x[i+4],6,-145523070)
    d=md5ii(d,a,b,c,x[i+11],10,-1120210379)
    c=md5ii(c,d,a,b,x[i+2],15,718787259)
    b=md5ii(b,c,d,a,x[i+9],21,-343485551)
    a=safeAdd(a,olda)
    b=safeAdd(b,oldb)
    c=safeAdd(c,oldc)
    d=safeAdd(d,oldd)}
    return[a,b,c,d]}
    function binl2rstr(input){var i
    var output=''
    var length32=input.length*32
    for(i=0;i<length32;i+=8){output+=String.fromCharCode((input[i>>5]>>>i%32)&0xff)}
    return output}
    function rstr2binl(input){var i
    var output=[]
    output[(input.length>>2)-1]=undefined
    for(i=0;i<output.length;i+=1){output[i]=0}
    var length8=input.length*8
    for(i=0;i<length8;i+=8){output[i>>5]|=(input.charCodeAt(i/8)&0xff)<<i%32}
    return output}
    function rstrMD5(s){return binl2rstr(binlMD5(rstr2binl(s),s.length*8))}
    function rstr2hex(input){var hexTab='0123456789abcdef'
    var output=''  
    var x
    var i
    for(i=0;i<input.length;i+=1){x=input.charCodeAt(i)
    output+=hexTab.charAt((x>>>4)&0x0f)+hexTab.charAt(x&0x0f)}
    return output}
    function str2rstrUTF8(input){return unescape(encodeURIComponent(input))}
    function hexMD5(s){return rstr2hex(rstrMD5(str2rstrUTF8(s)))}    
    return hexMD5(str);
}

// 更新t/k缓存
async function updateCache(channel) {
    const realPath = CHANNELS[channel];
    if (!realPath) {
        throw new Error(`Channel '${channel}' not supported`);
    }
    
    // 检查t/k缓存
    const now = Date.now();
    const cache = tkCache[channel];
    
    if (cache && cache.t && cache.k && (now - cache.timestamp < TK_CACHE_DURATION)) {
        // t/k缓存有效，直接返回
        return cache;
    }
    
    // 生成新的时间戳和签名
    const t = getBeijingTimestamp();
    const k = md5(realPath + LIVE_KEY + t);
    
    // 更新t/k缓存
    tkCache[channel] = {
        t: t,
        k: k,
        timestamp: now
    };
    
    console.log(`[签名更新] ${channel} 频道 - t: ${t}, k: ${k}`);
    
    return tkCache[channel];
}

// 预热缓存
async function warmupCache() {
    console.log('=== 缓存预热启动 ===');
    const channels = Object.keys(CHANNELS);
    
    for (const channel of channels) {
        try {
            await updateCache(channel);
        } catch (error) {
            console.error(`预热 ${channel} 频道缓存失败:`, error);
        }
    }
    
    console.log('=== 缓存预热完成 ===');
}

// 定期更新缓存
function startCacheUpdater() {
    console.log('=== 缓存自动更新器启动，每 5 分钟更新一次 ===');
    
    // 立即执行一次
    warmupCache();
    
    // 定时执行
    setInterval(() => {
        warmupCache();
    }, TK_CACHE_DURATION);
}

// 处理请求
function handleRequest(req, res) {
    const startTime = Date.now();
    const parsedUrl = url.parse(req.url);
    const path = parsedUrl.pathname;

    // 解析频道名
    const match = path.match(/^\/([a-z]+)\.m3u8$/);
    if (!match) {
        res.writeHead(404, { 
            'Content-Type': 'text/plain; charset=utf-8',
            'Access-Control-Allow-Origin': '*'
        });
        res.end('Not Found. Usage: /weishi.m3u8');
        return;
    }

    const channel = match[1];
    
    // 获取t和k参数并返回官网链接
    updateCache(channel).then(cache => {
        const { t, k } = cache;
        const realPath = CHANNELS[channel];
        const targetUrl = `https://tv.pull.hebtv.com${realPath}?t=${t}&k=${k}`;
        
        const processingTime = Date.now() - startTime;
        console.log(`[请求处理] ${channel} 频道 -> ${targetUrl} (${processingTime}ms)`);
        
        // 重定向到官网链接
        res.writeHead(302, {
            'Location': targetUrl,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.end();
    }).catch(err => {
        console.error(`处理 ${channel} 频道请求失败:`, err);
        res.writeHead(500, { 
            'Content-Type': 'text/plain; charset=utf-8',
            'Access-Control-Allow-Origin': '*'
        });
        res.end('Server Error: ' + err.message);
    });
}

// 创建服务器
const server = http.createServer((req, res) => {
    // 处理CORS预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Origin, Referer'
        });
        res.end();
        return;
    }

    // 记录请求
    if (req.url.endsWith('.m3u8')) {
        console.log(`[播放器请求] ${req.url}`);
    }

    handleRequest(req, res);
});

// 启动服务器
server.listen(PORT, () => {
    console.log('=== proxy service (优化版) ===');
    console.log(`服务器运行在: http://localhost:${PORT}`);
    console.log('');
    console.log('使用方式:');
    for (const [channel, path] of Object.entries(CHANNELS)) {
        console.log(`- http://localhost:${PORT}/${channel}.m3u8`);
    }
    console.log('');
    console.log('特性:');
    console.log('- 高效签名缓存: 5分钟自动更新');
    console.log('- 缓存预热: 启动时自动预热所有频道');
    console.log('- 稳定重定向: 每次返回官网链接');
    console.log('- 性能优化: 最小化响应时间');
    console.log('- 完善的错误处理');
    console.log('');
    console.log('开始接收请求...');
});

// 启动缓存更新器
startCacheUpdater();

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n=== 正在关闭服务器 ===');
    server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
    });
});
