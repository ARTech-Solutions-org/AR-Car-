# MG7 Photobooth + WebAR Experience

A two-part web experience: a kiosk-style AI photobooth and a mobile WebAR car viewer.

---

## 📁 File Structure

```
Mg test/
├── config.js                  ← ⚙️  EDIT THIS FIRST
├── server.js                  ← Node.js local server
├── shared/
│   └── mg-logo.svg
├── photobooth/
│   └── index.html             ← PC kiosk photobooth
├── ar/
│   ├── index.html             ← Mobile WebAR experience
│   └── (mg7.glb must be here — see note below)
└── mg7.glb                    ← 3D model (root)
```

> **Note:** The GLB file is served from `/mg7.glb` (the workspace root).  
> The AR page references `/mg7.glb` — no copy needed.

---

## ⚙️ Setup

### 1. Configure `config.js`

Open [`config.js`](./config.js) and fill in:

```javascript
const CONFIG = {
  GEMINI_API_KEY: "YOUR_ACTUAL_API_KEY",   // ← Gemini API key with Imagen access
  AR_URL: "http://192.168.X.X:8080/ar/index.html",  // ← Your LAN IP
  CAR_MODEL: "MG7"
};
```

To find your LAN IP:
- **Windows:** Run `ipconfig` in CMD → look for IPv4 Address
- **Mac/Linux:** Run `ip a` or `ifconfig`

### 2. Install Node.js (if not installed)

Download from [nodejs.org](https://nodejs.org) — no additional npm packages needed.

### 3. Start the Server

```bash
node server.js
```

The server will print your LAN IP. Example output:
```
║  Network:  http://192.168.1.50:8080  ║
║  Photobooth: http://192.168.1.50:8080/photobooth/  ║
║  AR page:    http://192.168.1.50:8080/ar/          ║
```

---

## 🚀 Alternative: Use `npx http-server`

If you don't want to use `server.js`:

```bash
npx http-server . -p 8080 --cors -c-1
```

Then visit `http://YOUR_LAN_IP:8080/photobooth/` on the kiosk PC.

---

## 📱 AR on Mobile

### Android (Recommended)
- Works over **HTTP** via **Scene Viewer** (Google ARCore)
- Open `http://YOUR_LAN_IP:8080/ar/` in Chrome on Android
- Tap "View in AR" → launches native AR scene

### iOS
- Requires **HTTPS** for WebXR
- Use **ngrok** for HTTPS tunnel:
  ```bash
  # Install ngrok: https://ngrok.com/download
  ngrok http 8080
  ```
  Update `config.js` → `AR_URL` with the ngrok HTTPS URL.
- Alternatively: **Quick Look** mode works with `.usdz` files (convert GLB → USDZ using Reality Composer or online tools)

---

## 🔑 Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create an API key
3. Ensure your project has **Vertex AI** or **Imagen API** access enabled
4. Paste into `config.js`

**Fallback:** If `imagen-3.0-generate-001` fails (requires billing), the app automatically falls back to `gemini-2.0-flash-preview-image-generation`.

---

## ✅ Testing Checklist

- [ ] Photobooth loads webcam on desktop Chrome
- [ ] Camera source selector populates correctly
- [ ] Camera selection persists after reload (localStorage)
- [ ] Countdown timer shows before capture
- [ ] Gemini image generation returns a result
- [ ] Fallback shows raw capture if API fails
- [ ] QR code renders and scans correctly on phone
- [ ] AR page opens on mobile from same network
- [ ] 3D model loads and auto-rotates
- [ ] Info panels animate in with stagger
- [ ] Panel tap interaction shows/hides detail
- [ ] AR placement works on Android (Scene Viewer)
- [ ] AR placement works on iOS (Quick Look / WebXR)
- [ ] "Save Photo" downloads the image
- [ ] "Print" opens print dialog
- [ ] "Retake" returns to camera screen

---

## 🎨 Customisation

### Change Car Info Panels

Edit the `CAR_INFO` array at the **top of** `ar/index.html`:

```javascript
const CAR_INFO = [
  { id: 1, icon: "⚡", title: "Engine",  value: "1.5T Turbo", detail: "169 HP / 275 Nm" },
  // Add/remove/edit entries freely
];
```

### Change the AI Photo Prompt

Edit `config.js` → the `get IMAGE_PROMPT()` getter.

### Change Brand Colors

Both HTML files use CSS variables at the top:
```css
--red:    #C8102E;
--chrome: #B0B0B0;
```

---

## 🛠 Troubleshooting

| Problem | Solution |
|---------|----------|
| Camera not detected | Allow camera permissions in browser; use Chrome |
| "API key invalid" toast | Check `config.js` → `GEMINI_API_KEY` |
| QR code links to wrong URL | Update `AR_URL` in `config.js` with your LAN IP |
| AR button missing | Device doesn't support WebXR/Scene Viewer — try another browser |
| GLB model not loading | Verify file is at `/mg7.glb` (workspace root); check server CORS |
| iOS AR not working | Need HTTPS; use ngrok tunnel |
