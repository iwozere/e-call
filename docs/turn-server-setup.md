# TURN Server Setup

WebRTC P2P calls use ICE to establish a direct connection between two browsers. STUN is enough when both peers have simple NAT, but calls fail silently when either side is behind:

- symmetric NAT (most mobile carriers)
- a corporate or university firewall
- double NAT (e.g. ISP modem + home router)

A TURN server acts as a relay of last resort: when direct ICE fails, media flows through the TURN server. **TURN is a fallback — it is only used when direct P2P cannot be established.**

---

## Chosen approach: Metered.ca free-tier TURN (Option A)

No infrastructure to run. Get credentials from Metered.ca, add them to `infra/pi/.env`, rebuild the frontend.

### 1. Get credentials

1. Sign up at <https://www.metered.ca/tools/openrelay>
2. Under **TURN Server credentials**, note your:
   - TURN URL (e.g. `openrelay.metered.ca`)
   - Username
   - Credential (password)

Metered's free tier provides ~500 MB/month of relay traffic. TURN is only used when direct P2P fails, so a typical low-volume personal deployment stays well under the limit.

### 2. Add to `infra/pi/.env`

Uncomment and fill in the three `VITE_TURN_*` lines:

```env
VITE_TURN_URL=turns:openrelay.metered.ca:443?transport=tcp
VITE_TURN_USERNAME=your_metered_username
VITE_TURN_PASSWORD=your_metered_credential
```

Use `turns:` (with TLS) on port 443 with TCP transport — this is the fallback that works even when UDP is blocked by a firewall.

### 3. Rebuild and redeploy

From `infra/pi`:

```bash
./prepare-frontend.sh
docker compose -f docker-compose.p2p.yml up -d --build
```

On Windows (build step only, then copy `html/` to the Pi):

```powershell
.\prepare-frontend.ps1
```

The TURN credentials are baked into the frontend bundle at build time (`VITE_*` env vars). After any credential change you must rebuild the frontend and restart nginx.

### 4. Verify

Open `https://call.yourdomain.com` in two browsers on **different networks** (e.g. one on Wi-Fi, one on mobile data). If the call connects, TURN is working. You can also use <https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/> — add your TURN server credentials and check that `relay` ICE candidates appear in the results.

---

## Other options considered

### Option B — coturn on a VPS (~$4–6/month)

Run `coturn` on a cheap VPS (Hetzner CX11, DigitalOcean Droplet) that has a direct public IP. No NAT issues. You own the relay.

Suitable when: you need guaranteed bandwidth, no third-party dependency, or higher call volume.

Requires: renting a VPS, installing/configuring coturn, opening UDP 3478 and 49152–65535 in the VPS firewall.

### Option C — coturn on the Pi (not recommended with double NAT)

Self-hosting coturn on the Pi requires forwarding TURN ports through **both** routers (ISP modem + home router). This only works if:

- your ISP does **not** use CGNAT (verify: `curl -s ifconfig.me` on the Pi must match the ISP router's WAN IP)
- both router admin panels allow port forwarding

With double NAT, CGNAT is common and inbound port forwarding is often impossible without paying for a static IP. Prefer Option A or B.

---

## Why the Pi already uses Cloudflare Tunnel but still needs TURN

Cloudflare Tunnel carries **HTTPS and WebSocket** traffic — it is how signaling (Socket.io) and the API reach the Pi without opening ports. It does **not** carry UDP or the WebRTC media stream. Media is peer-to-peer between browsers and bypasses the tunnel entirely. TURN is a separate relay path for media only.
