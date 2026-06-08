const headers = {
  'Accept': '*/*',
  'Accept-Encoding': 'gzip, deflate, br, zstd',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin': 'https://new-life-clinic-4i51.vercel.app',
  'Referer': 'https://new-life-clinic-4i51.vercel.app/',
  'Sec-Ch-Ua': '"Chromium";v="148"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'cross-site',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'
};

const url = 'https://investment-bedrooms-routers-vpn.trycloudflare.com/api/stream.m3u8?src=6b8dd2bb-3e59-432e-ace3-3ffa27c64e66';

console.log('Sending request to master playlist...');
fetch(url, { headers })
  .then(async r => {
    console.log('Master Playlist Status:', r.status);
    console.log('Master Playlist Headers:', [...r.headers.entries()]);
    const body = await r.text();
    console.log('Master Playlist Body:\n', body);
    const match = body.match(/playlist\.m3u8\?id=[a-zA-Z0-9]+/);
    if (match) {
      const nextUrl = 'https://investment-bedrooms-routers-vpn.trycloudflare.com/api/hls/' + match[0];
      console.log('Fetching sub-playlist:', nextUrl);
      const subRes = await fetch(nextUrl, { headers });
      console.log('Sub-playlist Status:', subRes.status);
      console.log('Sub-playlist Headers:', [...subRes.headers.entries()]);
      console.log('Sub-playlist Body:\n', await subRes.text());
    } else {
      console.log('No sub-playlist found in body.');
    }
  })
  .catch(e => console.error(e));
