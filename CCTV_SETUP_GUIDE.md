# 🎥 CCTV Module Setup Guide — New Life Clinic

## Overview
This guide installs the secure EZVIZ CCTV integration module on your existing clinic system.

---

## Step 1: Add Environment Variables

Open `backend/.env` and add these lines:

```env
# ── CCTV Security Module ──────────────────────────────────────────────
# AES-256-GCM encryption key for RTSP credentials (EXACTLY 32 characters)
CCTV_ENCRYPTION_KEY=YourSecure32CharKeyHereChangeMeNow

# go2rtc API URL (running on same server)
GO2RTC_API_URL=http://localhost:1984

# go2rtc public URL seen by the browser (same server or your LAN IP)
GO2RTC_PUBLIC_URL=http://192.168.x.x:1984

# Optional go2rtc API key (add to go2rtc.yaml too if used)
GO2RTC_API_KEY=

# Local recordings directory
CCTV_RECORDINGS_DIR=C:/recordings
```

> ⚠️ Replace `192.168.x.x` with your server's actual LAN IP.

---

## Step 2: Install go2rtc (Stream Relay)

### Windows (Recommended for your server)

1. Download `go2rtc.exe` from: https://github.com/AlexxIT/go2rtc/releases/latest
2. Place it in your clinic folder: `C:\Users\HP\OneDrive\Desktop\clinic new life\go2rtc.exe`
3. Create a startup script `start-go2rtc.bat`:
   ```bat
   @echo off
   cd /d "C:\Users\HP\OneDrive\Desktop\clinic new life"
   go2rtc.exe -config go2rtc.yaml
   ```
4. Run `start-go2rtc.bat` — keep it running in background.

### Linux / Docker (Alternative)
```bash
docker compose -f docker-compose.cctv.yml up -d
```

---

## Step 3: Install FFmpeg (for Recording)

### Windows
1. Download FFmpeg from: https://ffmpeg.org/download.html (Windows builds)
2. Extract and add to PATH, OR note the full path for recordings
3. Test: open CMD and run `ffmpeg -version`

---

## Step 4: Install hls.js in Frontend

```bash
cd "C:\Users\HP\OneDrive\Desktop\clinic new life\frontend"
npm install hls.js
```

---

## Step 5: Configure EZVIZ Camera RTSP

### Enable RTSP on your EZVIZ camera:
1. Open the EZVIZ app or web portal
2. Go to: **Device Settings → Video Settings → Enable RTSP**
3. Note the RTSP port (default: 554)

### RTSP URL format:
```
rtsp://admin:YourPassword@192.168.1.x:554/Streaming/Channels/101
```

Where:
- `admin` = camera username
- `YourPassword` = camera password
- `192.168.1.x` = camera's LAN IP
- `/Streaming/Channels/101` = main stream (use `102` for sub-stream)

### To find EZVIZ camera IP:
- Log into your router's DHCP table, or
- Use EZVIZ PC software → Device List → View IP

---

## Step 6: Restart Backend

```bash
# Stop existing backend
# Then restart:
cd "C:\Users\HP\OneDrive\Desktop\clinic new life\backend"
node server.js
```

You should see: `✅ CCTV module loaded`

---

## Step 7: Access CCTV Dashboard

1. Log in to clinic system as **admin**
2. Look for **"CCTV Security"** in the left sidebar (camera icon)
3. Navigate to `/app/cctv`
4. Click **"Add Camera"**
5. Enter:
   - Camera name: e.g. "Reception Camera"
   - RTSP URL: `rtsp://admin:password@192.168.1.x:554/Streaming/Channels/101`
   - Room: e.g. "Reception"
6. Click **"Add Camera"** — stream should appear live

---

## RTSP Examples for Common EZVIZ Models

| Camera | RTSP URL Pattern |
|--------|-----------------|
| CS-C3W | `rtsp://admin:pass@IP:554/Streaming/Channels/101` |
| C6N | `rtsp://admin:pass@IP:554/Streaming/Channels/101` |
| H8c | `rtsp://admin:pass@IP:554/Streaming/Channels/101` |
| CS-C3N | `rtsp://admin:pass@IP:554/h264/ch1/main/av_stream` |

---

## Security Notes

- ✅ RTSP URLs are AES-256-GCM encrypted before saving to MongoDB
- ✅ Browser never sees camera credentials
- ✅ JWT authentication required for all API calls
- ✅ Admin-only access enforced at middleware level
- ✅ All changes logged to AuditLog
- ❌ Never expose port 554 (RTSP) to the internet

---

## Recording Storage

Recordings are saved as MP4 files to the path set in `CCTV_RECORDINGS_DIR`.

Default: `backend/recordings/`

Format: `CameraName_2026-05-29T19-30-00.mp4`

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Camera shows "Offline" | Check RTSP URL format; try in VLC first |
| go2rtc not online | Start `start-go2rtc.bat` or Docker |
| Recording fails | Install FFmpeg and add to PATH |
| "CCTV module loaded" not shown | Check backend .env has `CCTV_ENCRYPTION_KEY` |
| HLS stream shows error | Check `GO2RTC_PUBLIC_URL` has correct LAN IP |

---

## Test RTSP in VLC

Before adding to clinic system, test your RTSP URL in VLC:
1. Open VLC → Media → Open Network Stream
2. Paste: `rtsp://admin:password@192.168.1.x:554/Streaming/Channels/101`
3. If video plays → URL is correct

---

## Future AI Features (Ready)

The system is pre-wired for AI. To activate:
1. Run an AI inference service (e.g. YOLO, OpenCV)
2. POST to `/api/cctv/events` with `eventType: "ai_person_detected"` and `metadata: { count: 2, bbox: [...] }`
3. Events appear automatically in the Motion Log

Supported future AI events:
- `ai_person_detected` — person count
- `ai_intrusion_alert` — restricted zone breach
- `ai_face_recognized` — face match (with consent)
- `ai_queue_monitoring` — patient queue length
