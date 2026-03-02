const https = require('https');
const http = require('http');
const url = require('url');

const PLAYLIST_URL = 'https://t.freetv.fun/m3u/playlist.txt';
const CACHE_DURATION = 6 * 60 * 60 * 1000;

const cache = new Map();

async function getChannelLinks(searchKey) {
    const cached = cache.get(searchKey);
    if (cached && Date.now() - cached.time < CACHE_DURATION) {
        return cached.links;
    }
    
    const content = await fetchPlaylist();
    const links = parsePlaylist(content, searchKey);
    
    const result = [links[0] || null, links[1] || null, links[2] || null];
    cache.set(searchKey, { links: result, time: Date.now() });
    
    return result;
}

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

function parsePlaylist(content, searchKey) {
    const links = [];
    const lowerSearch = searchKey.toLowerCase();
    
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        const commaIdx = trimmed.indexOf(',');
        if (commaIdx === -1) continue;
        
        const name = trimmed.substring(0, commaIdx).trim();
        const link = trimmed.substring(commaIdx + 1).trim();
        
        if (name.toLowerCase().includes(lowerSearch) && link) {
            links.push(link);
        }
    }
    
    return links;
}

module.exports = { getChannelLinks };
