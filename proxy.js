const LIVE_KEY = "k5m9p2x8r4b3";

const CHANNELS = {
  weishi: "/jishi/weishipindao.m3u8",
  dushi: "/jishi/dushipindao.m3u8",
  gonggong: "/jishi/gonggongpindao.m3u8",
  shenghuo: "/jishi/shenghuopindao.m3u8"
};

async function md5(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("MD5", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    const match = path.match(/^\/([a-z]+)\.m3u8$/);
    if (!match) {
      return new Response("Not Found. Usage: /weishi.m3u8", { status: 404 });
    }

    const channel = match[1];
    const realPath = CHANNELS[channel];
    if (!realPath) {
      return new Response(`Channel '${channel}' not supported`, { status: 404 });
    }

    const t = Math.floor(Date.now() / 1000).toString();
     const k = await md5(realPath + LIVE_KEY + t);
     const targetUrl = `https://tv.pull.hebtv.com${realPath}?t=${t}&k=${k}`;;

    return Response.redirect(targetUrl, 302);
  }
};
