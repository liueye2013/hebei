// sd.js - 业务模块

const CryptoJS = require('crypto-js');

// 配置
const CONFIG = {
    API_BASE: "https://sdxw.iqilu.com",
    AUTH_BASE: "https://feiying.litenews.cn/api",
    CACHE_DURATION: 30 * 60 * 1000,  // 流地址缓存30分钟
    MXPX: 'GBHWERMTGPHFELSJ',
    ALY: 'BDNZNQSRYWXYCKNA'
};

// 频道ID映射
const CHANNELS = {
    sdtv: 24,
    qilu: 25,
    shpd: 29
};

// 频道Mark映射 (用于获取流地址)
const CHANNEL_MARKS = {
    sdtv: '24581',  // 山东卫视
    qilu: '24584',  // 齐鲁频道
    shpd: '24596'   // 生活频道
};

// 缓存对象
const programCache = {};
const streamCache = {};

// MD5函数
function md5(str) {
    return CryptoJS.MD5(str).toString();
}

// AES加密
function aesEncrypt(data, key) {
    const keyHex = CryptoJS.enc.Utf8.parse(key);
    const iv = CryptoJS.enc.Utf8.parse('0000000000000000');  // 16个0字符
    const encrypted = CryptoJS.AES.encrypt(data, keyHex, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return encrypted.toString();
}

// AES解密
function aesDecrypt(ciphertext, key) {
    const keyHex = CryptoJS.enc.Utf8.parse(key);
    const iv = CryptoJS.enc.Utf8.parse('0000000000000000');  // 16个0字符
    const decrypted = CryptoJS.AES.decrypt(ciphertext, keyHex, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
}

// 获取流地址
async function fetchStreamUrl(channel) {
    const channelMark = CHANNEL_MARKS[channel];
    if (!channelMark) {
        throw new Error(`Channel '${channel}' not supported for streaming`);
    }

    const t = Date.now();
    const s = md5(channelMark + t + CONFIG.MXPX);
    const url = `${CONFIG.AUTH_BASE}/v1/auth/exchange?t=${t}&s=${s}`;

    const bodyData = JSON.stringify({ channelMark: channelMark });
    const encryptedBody = aesEncrypt(bodyData, CONFIG.ALY);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0',
                'Referer': 'https://v.iqilu.com/',
                'Origin': 'https://v.iqilu.com'
            },
            body: encryptedBody
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const encryptedResponse = await response.text();
        const decryptedResponse = aesDecrypt(encryptedResponse, CONFIG.ALY);
        const data = JSON.parse(decryptedResponse);

        if (data.data) {
            return data.data;
        } else {
            throw new Error('No stream URL in response');
        }
    } catch (error) {
        throw new Error(`Failed to fetch stream URL: ${error.message}`);
    }
}

// 获取带缓存的流地址
async function getStreamUrl(channel) {
    const now = Date.now();
    const cache = streamCache[channel];

    // 流地址缓存1小时
    if (cache && cache.url && (now - cache.timestamp < 60 * 60 * 1000)) {
        return cache.url;
    }

    const url = await fetchStreamUrl(channel);
    streamCache[channel] = {
        url: url,
        timestamp: now
    };

    return url;
}

// 获取节目单
async function fetchProgramList(channelID, date = '') {
    const timestamp = Date.now();
    const callback = `jQuery${Math.floor(Math.random() * 1000000000000000000)}_${timestamp}`;
    const url = `${CONFIG.API_BASE}/v1/app/play/program/qilu?jsonpcallback=${callback}&channelID=${channelID}&date=${date}&_=${timestamp}`;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://sdxw.iqilu.com/'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();

        const match = text.match(/jQuery\d+_\d+\((.*)\)$/s);
        if (!match) {
            throw new Error('Invalid JSONP response');
        }

        const data = JSON.parse(match[1]);
        return data;
    } catch (error) {
        throw new Error(`Failed to fetch program list: ${error.message}`);
    }
}

// 获取当前播放的节目
function getCurrentProgram(programList) {
    if (!programList || !Array.isArray(programList) || programList.length === 0) {
        return null;
    }

    const now = Math.floor(Date.now() / 1000);

    for (const program of programList) {
        if (now >= program.begintime && now < program.endtime) {
            return program;
        }
    }

    return programList[programList.length - 1];
}

// 更新缓存
async function updateCache(channel) {
    const channelID = CHANNELS[channel];
    if (!channelID) {
        throw new Error(`Channel '${channel}' not supported`);
    }

    const now = Date.now();
    const cache = programCache[channel];

    if (cache && cache.data && (now - cache.timestamp < CONFIG.CACHE_DURATION)) {
        return cache;
    }

    const data = await fetchProgramList(channelID);

    if (data.code !== 1 || !data.value || !data.value.list) {
        throw new Error('Invalid API response');
    }

    const currentProgram = getCurrentProgram(data.value.list);

    programCache[channel] = {
        data: data.value.list,
        current: currentProgram,
        timestamp: now
    };

    return programCache[channel];
}

// 获取频道列表
function getChannelList() {
    return Object.keys(CHANNELS);
}

// 检查频道是否存在
function isChannelExists(channel) {
    return !!CHANNELS[channel];
}

// 获取频道ID
function getChannelID(channel) {
    return CHANNELS[channel];
}

// 预热所有频道缓存
async function warmupAllChannels() {
    const channels = Object.keys(CHANNELS);
    const results = {
        success: [],
        failed: []
    };

    for (const channel of channels) {
        try {
            await updateCache(channel);
            results.success.push(channel);
        } catch (error) {
            results.failed.push({ channel, error: error.message });
        }
    }

    return results;
}

// 导出模块
module.exports = {
    CONFIG,
    CHANNELS,
    CHANNEL_MARKS,
    fetchStreamUrl,
    getStreamUrl,
    fetchProgramList,
    getCurrentProgram,
    updateCache,
    getChannelList,
    isChannelExists,
    getChannelID,
    warmupAllChannels
};
