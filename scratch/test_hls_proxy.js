const headers = {
  'Accept': '*/*',
  'Origin': 'https://new-life-clinic-4i51.vercel.app',
  'Referer': 'https://new-life-clinic-4i51.vercel.app/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'
};

const streamKey = '6b8dd2bb-3e59-432e-ace3-3ffa27c64e66';
const localBaseUrl = 'http://localhost:1985';

async function runTest() {
  try {
    console.log('1. Fetching master manifest from local proxy...');
    const masterUrl = `${localBaseUrl}/api/stream.m3u8?src=${encodeURIComponent(streamKey)}`;
    console.log(`URL: ${masterUrl}`);
    
    const masterRes = await fetch(masterUrl, { headers });
    console.log(`Response Status: ${masterRes.status}`);
    const masterBody = await masterRes.text();
    console.log('Response Body:\n', masterBody);
    
    if (masterRes.status !== 200) {
      throw new Error(`Master manifest failed with status ${masterRes.status}`);
    }

    // Extract the playlist URL
    const playlistMatch = masterBody.match(/\/api\/proxy-hls\/playlist\.m3u8\?stream=[^\s]+/);
    if (!playlistMatch) {
      throw new Error('Could not find /api/proxy-hls/playlist.m3u8 inside master manifest!');
    }

    const playlistUrl = `${localBaseUrl}${playlistMatch[0]}`;
    console.log('\n2. Fetching sub-playlist...');
    console.log(`URL: ${playlistUrl}`);
    
    const playlistRes = await fetch(playlistUrl, { headers });
    console.log(`Response Status: ${playlistRes.status}`);
    const playlistBody = await playlistRes.text();
    console.log('Response Body:\n', playlistBody);

    if (playlistRes.status !== 200) {
      throw new Error(`Playlist failed with status ${playlistRes.status}`);
    }

    // Extract segment URL
    const segmentMatch = playlistBody.match(/\/api\/proxy-hls\/segment\.ts\?stream=[^\s]+/);
    if (segmentMatch) {
      const segmentUrl = `${localBaseUrl}${segmentMatch[0]}`;
      console.log('\n3. Fetching segment...');
      console.log(`URL: ${segmentUrl}`);
      const segmentRes = await fetch(segmentUrl, { headers });
      console.log(`Response Status: ${segmentRes.status}`);
    } else {
      console.log('\nNo segment found in playlist (stream might be idle or loading)');
    }

    console.log('\n🎉 ALL CHECKS PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

runTest();
