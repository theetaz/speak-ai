# Self-Hosting LiveKit on AWS EC2 (Ubuntu) with Cloudflare DNS & Nginx Reverse Proxy

> Complete step-by-step guide to deploy a production-ready LiveKit server on an AWS EC2 Ubuntu instance using Docker, Cloudflare-pointed domain, and Nginx reverse proxy.

---

## Prerequisites

- AWS EC2 Ubuntu instance (recommended: compute-optimized, e.g. `c5.xlarge` or higher)
- Docker & Docker Compose installed on the instance
- A domain name managed via Cloudflare (e.g. `yourdomain.com`)
- SSH access to your EC2 instance

---

## Step 1: Configure AWS Security Group (Firewall)

Open the following **inbound rules** in your EC2 instance's Security Group:

| Port(s)          | Protocol | Source    | Purpose                        |
| ----------------- | -------- | --------- | ------------------------------ |
| 22                | TCP      | Your IP   | SSH access                     |
| 80                | TCP      | 0.0.0.0/0 | HTTP (redirect / cert verify)  |
| 443               | TCP      | 0.0.0.0/0 | HTTPS & TURN/TLS               |
| 7881              | TCP      | 0.0.0.0/0 | WebRTC over TCP fallback       |
| 3478              | UDP      | 0.0.0.0/0 | TURN/UDP (STUN)                |
| 50000-60000       | UDP      | 0.0.0.0/0 | WebRTC media (UDP)             |

**AWS Console path:** VPC Dashboard → Security Groups → Select your SG → Inbound Rules → Edit Inbound Rules

---

## Step 2: Configure Cloudflare DNS

Add the following DNS records in your Cloudflare dashboard pointing to your EC2 **public IP**:

| Type | Name              | Content (Value)     | Proxy Status        |
| ---- | ----------------- | ------------------- | ------------------- |
| A    | `livekit`         | `<EC2_PUBLIC_IP>`   | **DNS only** (grey) |
| A    | `turn.livekit`    | `<EC2_PUBLIC_IP>`   | **DNS only** (grey) |

> **CRITICAL:** Both records **must** be set to **"DNS only"** (grey cloud icon), NOT "Proxied" (orange). Cloudflare's proxy does **not** support WebRTC/UDP traffic and will break LiveKit connectivity. WebSocket and TURN connections also require direct access to the origin server.

Your domains will be:
- **LiveKit Server:** `livekit.yourdomain.com`
- **TURN Server:** `turn.livekit.yourdomain.com`

---

## Step 3: Create LiveKit Directory Structure

SSH into your EC2 instance and create the working directory:

```bash
sudo mkdir -p /opt/livekit
cd /opt/livekit
```

---

## Step 4: Generate LiveKit API Key and Secret

Generate a random API key and secret for LiveKit authentication:

```bash
# Generate API key (alphanumeric, 12 chars)
export LK_API_KEY=$(head -c 12 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 12)

# Generate API secret (alphanumeric, 32 chars)
export LK_API_SECRET=$(head -c 32 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 32)

echo "API Key:    $LK_API_KEY"
echo "API Secret: $LK_API_SECRET"
```

> **Save these values securely.** You will need them in your application's `.env` file and in the LiveKit config.

---

## Step 5: Create LiveKit Server Configuration

```bash
sudo nano /opt/livekit/livekit.yaml
```

Paste the following (replace placeholders):

```yaml
port: 7880
log_level: info
rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 60000
  # Required for EC2 — discovers the public IP via STUN
  use_external_ip: true
redis:
  address: redis:6379
keys:
  # Replace with your generated key/secret
  YOUR_API_KEY: YOUR_API_SECRET
turn:
  enabled: true
  domain: turn.livekit.yourdomain.com
  # Set to 443 since we are NOT using a load balancer for TURN
  tls_port: 443
  cert_file: /etc/letsencrypt/live/turn.livekit.yourdomain.com/fullchain.pem
  key_file: /etc/letsencrypt/live/turn.livekit.yourdomain.com/privkey.pem
  udp_port: 3478
```

---

## Step 6: Create Redis Configuration

```bash
sudo nano /opt/livekit/redis.conf
```

```conf
bind 0.0.0.0
protected-mode yes
port 6379
maxmemory 128mb
maxmemory-policy noeviction
```

---

## Step 7: Install Certbot and Obtain SSL Certificates

Since we're using Nginx (not Caddy), we need to manually provision SSL certificates via Let's Encrypt:

```bash
sudo apt update
sudo apt install -y certbot
```

**Stop any service using port 80** before running certbot, then obtain certificates for both domains:

```bash
sudo certbot certonly --standalone \
  -d livekit.yourdomain.com \
  -d turn.livekit.yourdomain.com \
  --agree-tos \
  --no-eff-email \
  -m your-email@example.com
```

Verify certificates exist:

```bash
ls /etc/letsencrypt/live/livekit.yourdomain.com/
ls /etc/letsencrypt/live/turn.livekit.yourdomain.com/
```

### Set Up Auto-Renewal

```bash
sudo crontab -e
```

Add this line:

```
0 3 * * * certbot renew --pre-hook "systemctl stop nginx" --post-hook "systemctl start nginx" --quiet
```

---

## Step 8: Configure Nginx as Reverse Proxy

Install Nginx:

```bash
sudo apt install -y nginx
```

Create the LiveKit Nginx config:

```bash
sudo nano /etc/nginx/sites-available/livekit
```

Paste the following:

```nginx
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name livekit.yourdomain.com;
    return 301 https://$host$request_uri;
}

# LiveKit HTTPS + WebSocket reverse proxy
server {
    listen 443 ssl;
    server_name livekit.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/livekit.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/livekit.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:7880;
        proxy_http_version 1.1;

        # WebSocket support — required for LiveKit signaling
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Disable buffering for real-time streams
        proxy_buffering off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Enable the site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/livekit /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## Step 9: Create Docker Compose File

```bash
sudo nano /opt/livekit/docker-compose.yaml
```

```yaml
services:
  livekit:
    image: livekit/livekit-server:latest
    container_name: livekit-server
    restart: unless-stopped
    network_mode: host
    volumes:
      - /opt/livekit/livekit.yaml:/etc/livekit.yaml
      - /etc/letsencrypt:/etc/letsencrypt:ro
    command: --config /etc/livekit.yaml

  redis:
    image: redis:7-alpine
    container_name: livekit-redis
    restart: unless-stopped
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - /opt/livekit/redis.conf:/usr/local/etc/redis/redis.conf
      - livekit-redis-data:/data
    command: redis-server /usr/local/etc/redis/redis.conf

volumes:
  livekit-redis-data:
```

> **Note:** LiveKit uses `network_mode: host` for optimal WebRTC performance — this gives it direct access to all host ports without Docker NAT overhead.

---

## Step 10: Fix Redis Connectivity with Host Networking

Since LiveKit runs in `host` network mode but Redis runs in bridge mode, update the LiveKit config to connect to Redis via the host:

```bash
sudo nano /opt/livekit/livekit.yaml
```

Change the Redis address to:

```yaml
redis:
  address: 127.0.0.1:6379
```

---

## Step 11: Start LiveKit Services

```bash
cd /opt/livekit
sudo docker compose up -d
```

Verify containers are running:

```bash
sudo docker compose ps
sudo docker compose logs -f livekit
```

You should see logs indicating LiveKit has started and connected to Redis.

---

## Step 12: Create a Systemd Service (Auto-Start on Reboot)

```bash
sudo nano /etc/systemd/system/livekit-docker.service
```

```ini
[Unit]
Description=LiveKit Docker Compose
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/livekit
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable livekit-docker
```

---

## Step 13: Verify the Deployment

### Test HTTPS endpoint

```bash
curl https://livekit.yourdomain.com
```

You should get a response (likely a `404` or LiveKit default response — this confirms the server is reachable).

### Test WebSocket connectivity

From your **local machine**, install the LiveKit CLI and test:

```bash
# Install LiveKit CLI
brew install livekit-cli   # macOS
# or
curl -sSL https://get.livekit.io/cli | bash   # Linux

# Add your self-hosted project
lk cloud add \
  --url wss://livekit.yourdomain.com \
  --api-key YOUR_API_KEY \
  --api-secret YOUR_API_SECRET

# Create a test token and join a room
lk token create --join --room test-room --identity test-user \
  --api-key YOUR_API_KEY \
  --api-secret YOUR_API_SECRET
```

---

## Step 14: Update Your Application Environment

In your project's `.env` file, configure the LiveKit connection:

```env
LIVEKIT_URL=wss://livekit.yourdomain.com
LIVEKIT_API_KEY=YOUR_API_KEY
LIVEKIT_API_SECRET=YOUR_API_SECRET
```

---

## Architecture Overview

```
┌─────────────┐       ┌──────────────┐       ┌──────────────────────────┐
│   Client    │──────▶│  Cloudflare  │──────▶│     AWS EC2 (Ubuntu)     │
│  (Browser)  │       │  DNS Only    │       │                          │
└─────────────┘       └──────────────┘       │  ┌─────────┐            │
                                              │  │  Nginx  │ :443/:80   │
     WSS (signaling)  ─────────────────────▶  │  │ (proxy) │───┐       │
                                              │  └─────────┘   │       │
                                              │       │        ▼       │
                                              │       │  ┌──────────┐  │
                                              │       │  │ LiveKit  │  │
                                              │       │  │ :7880    │  │
                                              │       │  └──────────┘  │
     WebRTC UDP (media) ─────────────────────▶│       :50000-60000/UDP │
     WebRTC TCP (fallback) ──────────────────▶│       :7881/TCP        │
     TURN/TLS ───────────────────────────────▶│       :443 (LiveKit)   │
     TURN/UDP ───────────────────────────────▶│       :3478/UDP        │
                                              │                        │
                                              │  ┌──────────┐         │
                                              │  │  Redis   │ :6379   │
                                              │  └──────────┘         │
                                              └──────────────────────────┘
```

---

## Port Conflict Note: Nginx & TURN/TLS on Port 443

Both Nginx and LiveKit's TURN/TLS want port 443. Since LiveKit runs in `host` network mode, there's a conflict. Here are your options:

### Option A: Use a different TURN/TLS port (Recommended for Nginx setup)

In `livekit.yaml`, change the TURN TLS port:

```yaml
turn:
  enabled: true
  domain: turn.livekit.yourdomain.com
  tls_port: 5349
  cert_file: /etc/letsencrypt/live/turn.livekit.yourdomain.com/fullchain.pem
  key_file: /etc/letsencrypt/live/turn.livekit.yourdomain.com/privkey.pem
  udp_port: 3478
```

Then add port `5349/TCP` to your AWS Security Group inbound rules.

> **Trade-off:** Some strict corporate firewalls only allow port 443, so clients behind those firewalls won't be able to use TURN/TLS. For most use cases this is fine.

### Option B: Use Nginx Stream module for TCP multiplexing

Add a stream block to `/etc/nginx/nginx.conf` to route TLS traffic based on SNI:

```nginx
stream {
    map $ssl_preread_server_name $backend {
        livekit.yourdomain.com          127.0.0.1:7880;
        turn.livekit.yourdomain.com     127.0.0.1:5349;
    }

    server {
        listen 443;
        ssl_preread on;
        proxy_pass $backend;
    }
}
```

Then update the `server` block in `/etc/nginx/sites-available/livekit` to listen on a different internal port (e.g., `8443`) and adjust the stream backend accordingly. This approach is more complex but allows both Nginx and TURN to share port 443.

---

## Troubleshooting

| Issue | Solution |
| ----- | -------- |
| Containers not starting | `cd /opt/livekit && sudo docker compose logs` |
| SSL certificate errors | Verify certs: `sudo certbot certificates` |
| WebSocket connection fails | Check Nginx config: `sudo nginx -t` — ensure `Upgrade` headers are set |
| Clients can't connect media | Verify UDP ports `50000-60000` are open in Security Group |
| TURN not working | Ensure `turn.livekit.yourdomain.com` DNS resolves to EC2 IP: `host turn.livekit.yourdomain.com` |
| Redis connection refused | Confirm Redis is running: `sudo docker compose logs redis` |
| Cloud-init stuck on EC2 | `sudo cloud-init clean --logs && sudo reboot now` |
| Instance firewall blocking | Check: `sudo ufw status` → If active, run `sudo ufw allow 80,443,7881/tcp && sudo ufw allow 3478,50000:60000/udp` |

---

## Upgrading LiveKit

Edit `/opt/livekit/docker-compose.yaml` and change the image version:

```yaml
image: livekit/livekit-server:v<NEW_VERSION>
```

Then pull and restart:

```bash
cd /opt/livekit
sudo docker compose pull
sudo docker compose up -d
```
