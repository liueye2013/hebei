const https = require('https');
const http = require('http');
const url = require('url');

const PLAYLIST_URL = 'https://t.freetv.fun/m3u/playlist.txt';
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6小时

// 用到的频道列表
const CHANNELS = [
    'CHC家庭影院',
    'CHC影迷電影',
    'CHC動作電影',
    '中視菁采臺',
    '三沙衛視'
];

// 缓存：{ channelName: { link: string, time: number } }
const cache = {};

// 播放列表缓存
let playlistContent = null;
let playlistTime = 0;

function fetchPlaylist() {
    return new Promise((resolve, reject) => {
        const parsed = url.parse(PLAYLIST_URL);
        const client = parsed.protocol === 'https:' ? https : http;
        
        client.get(PLAYLIST_URL, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

function parsePlaylistForChannels(content, channels) {
    const result = {};
    const lowerChannels = channels.map(c => c.toLowerCase());
    
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        const commaIdx = trimmed.indexOf(',');
        if (commaIdx === -1) continue;
        
        const name = trimmed.substring(0, commaIdx).trim();
        const link = trimmed.substring(commaIdx + 1).trim();
        const lowerName = name.toLowerCase();
        
        // 匹配需要的频道
        for (let i = 0; i < lowerChannels.length; i++) {
            if (lowerName.includes(lowerChannels[i]) && link) {
                const channelName = channels[i];
                if (!result[channelName]) {
                    result[channelName] = [];
                }
                if (result[channelName].length < 3) {
                    result[channelName].push(link);
                }
            }
        }
    }
    
    return result;
}

async function refreshCache() {
    // 检查播放列表是否过期
    if (playlistContent && Date.now() - playlistTime < CACHE_DURATION) {
        return;
    }
    
    console.log('[freetv] 刷新播放列表缓存...');
    const content = await fetchPlaylist();
    playlistContent = content;
    playlistTime = Date.now();
    
    // 解析并缓存所有用到的频道
    const parsed = parsePlaylistForChannels(content, CHANNELS);
    for (const channel of CHANNELS) {
        const links = parsed[channel] || [];
        cache[channel] = {
            link: links[0] || null,
            time: Date.now()
        };
    }
    console.log('[freetv] 缓存刷新完成，已缓存频道:', Object.keys(cache).filter(k => cache[k].link));
}

async function getChannelLinks(searchKey) {
    // 确保缓存已初始化
    await refreshCache();
    
    const cached = cache[searchKey];
    if (cached && cached.link) {
        return [cached.link, null, null];
    }
    
    return [null, null, null];
}

module.exports = { getChannelLinks };
