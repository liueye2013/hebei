// zj.js - 浙江业务模块

const CryptoJS = require('crypto-js');

// 配置
const CONFIG = {
    API_BASE: "https://zlive-das.cztv.com",
    CHANNEL_LIST_URL: "https://zlive-das.cztv.com/api/paas/channel/tv",
    PLAY_INFO_URL: "https://zlive-das.cztv.com/zapp/live/tv/channel/playInfo",
    CACHE_DURATION: 30 * 60 * 1000,  // 流地址缓存30分钟
    AUTH_KEY: 'CHWr9VybUeBZE1VB'  // auth_key 签名密钥
};

// 频道映射（仅保留5个主要频道）
const CHANNELS = {
    zjws: { id: '101', name: '浙江卫视' },
    qjds: { id: '102', name: '钱江都市' },
    jjsh: { id: '103', name: '经济生活' },
    jkys: { id: '104', name: '教科影视' },
    zjgj: { id: '110', name: '浙江国际' }
};

// 缓存对象
const streamCache = {};

// 生成随机字符串
function generateRandomString(length = 16) {
    const chars = 'abcdef0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// 生成 auth_key
function generateAuthKey(streamUrl) {
    const ts = Math.floor(Date.now() / 1000);  // 秒级时间戳（10位）
    const pathname = new URL(streamUrl).pathname;
    const randomStr = generateRandomString(32);  // 32位随机字符串
    const signStr = `${pathname}-${ts}-${randomStr}-0-${CONFIG.AUTH_KEY}`;
    const sign = CryptoJS.MD5(signStr).toString();
    return `${ts}-${randomStr}-0-${sign}`;
}

// 获取流地址
async function fetchStreamUrl(channel) {
    const channelInfo = CHANNELS[channel];
    if (!channelInfo) {
        throw new Error(`Channel '${channel}' not supported`);
    }
    
    const url = `${CONFIG.PLAY_INFO_URL}?channelId=${channelInfo.id}&platform=WEB`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.cztv.com/'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.data && data.data.multiBitrateStreamList) {
            // 获取高清720P的地址
            const hdStream = data.data.multiBitrateStreamList.find(s => s.bitrateCode === '720P');
            let streamUrl = null;
            if (hdStream && hdStream.urlList && hdStream.urlList.length > 0) {
                streamUrl = hdStream.urlList[0];
            } else {
                // 如果没有720P，取第一个可用的
                const firstStream = data.data.multiBitrateStreamList[0];
                if (firstStream && firstStream.urlList && firstStream.urlList.length > 0) {
                    streamUrl = firstStream.urlList[0];
                }
            }
            
            if (streamUrl) {
                // 添加 auth_key
                const authKey = generateAuthKey(streamUrl);
                return `${streamUrl}?auth_key=${authKey}`;
            }
        }
        
        throw new Error('No stream URL found in response');
    } catch (error) {
        throw new Error(`Failed to fetch stream URL: ${error.message}`);
    }
}

// 获取带缓存的流地址
async function getStreamUrl(channel) {
    const now = Date.now();
    const cache = streamCache[channel];
    
    if (cache && cache.url && (now - cache.timestamp < CONFIG.CACHE_DURATION)) {
        return cache.url;
    }
    
    const url = await fetchStreamUrl(channel);
    streamCache[channel] = {
        url: url,
        timestamp: now
    };
    
    return url;
}

// 获取频道列表
function getChannelList() {
    return Object.keys(CHANNELS);
}

// 导出模块接口
module.exports = {
    getStreamUrl,
    getChannelList,
    fetchStreamUrl,  // 导出原始方法用于测试
    isChannelExists: (channel) => CHANNELS.hasOwnProperty(channel)
};
