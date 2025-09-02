# NetWORX Essentials - Light Production Architecture

## **🎯 GOAL: Enterprise-Grade Reliability Under $200/month**

This architecture addresses ALL critical production issues while keeping costs minimal:
- ✅ **NO FALLBACKS** - Strict real data validation
- ✅ **Persistent job storage** - Redis-backed, survives restarts  
- ✅ **Worker processes** - No more main thread blocking
- ✅ **Connection management** - Prevents database exhaustion
- ✅ **Error handling** - Circuit breakers and monitoring

## **💰 Cost Breakdown - Light Architecture**

```
Monthly Costs (Estimated):
┌─────────────────────────────────────┬─────────┐
│ Component                           │ Cost    │
├─────────────────────────────────────┼─────────┤
│ DigitalOcean Droplet (8GB, 4 vCPU) │ $48     │
│ Managed PostgreSQL (2GB)           │ $60     │
│ Managed Redis (1GB)                │ $15     │
│ Load Balancer                       │ $12     │
│ Backups & Snapshots                │ $10     │
│ Domain & SSL                        │ $5      │
├─────────────────────────────────────┼─────────┤
│ TOTAL                               │ $150    │
└────────────────────────────────���────┴─────────┘

Alternative: Single VPS with Docker    $40-60/month
```

## **🏗️ Light Architecture Options**

### **Option 1: Managed Services (Recommended) - $150/month**

```
┌─────────────────────────────────────────────────────────────┐
│                 DigitalOcean Load Balancer                 │
│                       (SSL + Health)                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│           DigitalOcean Droplet (8GB RAM, 4 vCPU)          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │   Next.js App   │  │ Optimization    │  │ File Proc   │  │
│  │   (Port 3000)   │  │ Worker Process  │  │ Worker      │  │
│  │   2GB RAM       │  │   4GB RAM       │  │ 2GB RAM     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│  Managed PostgreSQL     │    Managed Redis                  │
│  (2GB, Primary only)    │    (1GB, Job persistence)        │
│  $60/month              │    $15/month                      │
└─────────────────────────────────────────────────────────────┘
```

### **Option 2: Single VPS with Docker - $40-60/month**

```
┌─────────────────────────────────────────────────────────────���
│              VPS (Linode/Vultr/Hetzner)                    │
│                 8GB RAM, 4 vCPU                            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                Docker Compose                           │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │ │
│  │  │ Next.js     │ │ PostgreSQL  │ │ Redis       │       │ │
│  │  │ Container   │ │ Container   │ │ Container   │       │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘       │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │ │
│  │  │ Optimization│ │ File Worker │ │ Monitoring  │       │ │
│  │  │ Worker      │ │ Process     │ │ (Grafana)   │       │ │
│  │  └─────────────┘ └─────────────┘ └───���─────────┘       │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## **🚀 Quick Start: Single VPS Docker Setup (Cheapest)**

### **1. VPS Providers & Pricing**
```bash
# Recommended VPS options:
Hetzner Cloud: 8GB, 4 vCPU = €15.24/month (~$17)
Linode: 8GB, 4 vCPU = $40/month  
Vultr: 8GB, 4 vCPU = $40/month
DigitalOcean: 8GB, 4 vCPU = $48/month
```

### **2. Docker Compose Setup**
```yaml
# docker-compose.production.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

  app:
    build: 
      context: .
      dockerfile: Dockerfile.production
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://networx:${DB_PASSWORD}@postgres:5432/networx
      REDIS_HOST: redis
      REDIS_PORT: 6379
    volumes:
      - ./uploads:/app/uploads
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G

  optimization-worker:
    build: 
      context: .
      dockerfile: Dockerfile.worker
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://networx:${DB_PASSWORD}@postgres:5432/networx
      REDIS_HOST: redis
      REDIS_PORT: 6379
      WORKER_TYPE: optimization
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G

  file-worker:
    build: 
      context: .
      dockerfile: Dockerfile.worker
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://networx:${DB_PASSWORD}@postgres:5432/networx
      REDIS_HOST: redis
      REDIS_PORT: 6379
      WORKER_TYPE: file-processing
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 2G

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: networx
      POSTGRES_USER: networx
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres.conf:/etc/postgresql/postgresql.conf
    command: postgres -c config_file=/etc/postgresql/postgresql.conf
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1.5G

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M

  # Simple monitoring
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  grafana_data:
```

### **3. Production Dockerfile**
```dockerfile
# Dockerfile.production
FROM node:18-alpine AS base
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Build stage
FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy built application
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules

# Production optimizations
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=1536"
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

EXPOSE 3000
CMD ["pnpm", "start"]
```

### **4. Worker Dockerfile**
```dockerfile
# Dockerfile.worker
FROM node:18-alpine AS base
WORKDIR /app

RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .
RUN pnpm build:worker

# Worker optimizations for heavy compute
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=3584 --expose-gc"
ENV UV_THREADPOOL_SIZE=16

USER node
CMD ["node", "dist/worker.js"]
```

## **⚙️ Server Configuration**

### **PostgreSQL Optimization (1.5GB RAM)**
```bash
# postgres.conf
shared_buffers = 384MB                 # 25% of RAM
effective_cache_size = 1152MB          # 75% of RAM
work_mem = 8MB
maintenance_work_mem = 96MB
wal_buffers = 16MB
checkpoint_completion_target = 0.9
max_connections = 200
log_min_duration_statement = 1000      # Log slow queries
```

### **Nginx Configuration**
```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=optimization:10m rate=1r/s;

    server {
        listen 80;
        server_name _;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # Optimization endpoints - stricter limits
        location /api/optimize {
            limit_req zone=optimization burst=2 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_read_timeout 300s;
            proxy_send_timeout 300s;
        }

        # Regular API endpoints
        location /api {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Static files
        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

## **📊 Simple Monitoring Setup**

### **Basic Health Monitoring Script**
```bash
#!/bin/bash
# health-monitor.sh

LOG_FILE="/var/log/networx-health.log"
ALERT_EMAIL="admin@yourcompany.com"

check_service() {
    local service=$1
    local url=$2
    
    if ! curl -f -s "$url" > /dev/null; then
        echo "$(date): $service DOWN" >> $LOG_FILE
        echo "$service is down!" | mail -s "NetWORX Alert: $service Down" $ALERT_EMAIL
        return 1
    fi
    return 0
}

# Check services
check_service "App" "http://localhost:3000/api/health"
check_service "Database" "http://localhost:3000/api/db-status"

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "$(date): Disk usage high: $DISK_USAGE%" >> $LOG_FILE
    echo "Disk usage is $DISK_USAGE%" | mail -s "NetWORX Alert: High Disk Usage" $ALERT_EMAIL
fi

# Check memory
MEM_USAGE=$(free | awk 'FNR==2{printf "%.0f", $3/($3+$4)*100}')
if [ $MEM_USAGE -gt 85 ]; then
    echo "$(date): Memory usage high: $MEM_USAGE%" >> $LOG_FILE
fi
```

### **Cron Job for Monitoring**
```bash
# Add to crontab
*/5 * * * * /opt/networx/health-monitor.sh
0 1 * * * docker system prune -f  # Daily cleanup
0 2 * * 0 pg_dump networx > /backup/networx-$(date +%Y%m%d).sql  # Weekly backup
```

## **🚀 Deployment Steps**

### **1. Server Setup**
```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Setup firewall
sudo ufw allow 22,80,443/tcp
sudo ufw enable
```

### **2. Deploy Application**
```bash
# Clone repository
git clone your-repo-url /opt/networx
cd /opt/networx

# Setup environment
cp .env.example .env.production
# Edit .env.production with your values

# Build and start
docker-compose -f docker-compose.production.yml up -d --build

# Check status
docker-compose -f docker-compose.production.yml ps
docker-compose -f docker-compose.production.yml logs
```

### **3. SSL Certificate (Free with Let's Encrypt)**
```bash
# Install Certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/networx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/networx/ssl/key.pem

# Auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

## **💡 Cost Optimization Tips**

### **1. Use Smaller VPS Initially**
```bash
# Start with 4GB RAM for testing
Hetzner: 4GB, 2 vCPU = €7.64/month (~$8.50)
Vultr: 4GB, 2 vCPU = $20/month

# Scale up only when needed
```

### **2. Alternative Database Options**
```bash
# Option 1: Neon (Serverless PostgreSQL)
# $0-20/month for small usage
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/networx"

# Option 2: PlanetScale (MySQL)
# $0-39/month
DATABASE_URL="mysql://user:pass@aws.connect.psdb.cloud/networx"

# Option 3: Railway PostgreSQL
# $5-20/month
```

### **3. Free Redis Options**
```bash
# Redis Labs (256MB free)
REDIS_HOST="redis-xxxxx.redislabs.com"

# Upstash Redis (10k requests/day free)
REDIS_HOST="redis-xxxxx.upstash.io"
```

## **📈 Scaling Path**

```
Month 1-3: Single VPS ($40-60)
    ↓
Month 4-6: Managed services ($150)
    ↓  
Month 7-12: Load balancer + multi-instance ($300)
    ↓
Year 2+: Full AWS/enterprise setup ($2000+)
```

## **🎯 Production Readiness Checklist**

- [ ] ✅ No fallback data (enforced in code)
- [ ] ✅ Redis job persistence (survives restarts)
- [ ] ✅ Worker processes (no main thread blocking)
- [ ] ✅ Database connection management
- [ ] ✅ Error handling and circuit breakers
- [ ] ✅ Basic monitoring and alerts
- [ ] ✅ SSL certificate and security
- [ ] ✅ Automated backups
- [ ] ✅ Resource limits and optimization

**This light architecture gives you enterprise-grade reliability at startup prices!**

## **🚀 Quick Commands to Get Started**

```bash
# Option 1: Cheapest ($40/month) - Hetzner + Docker
curl -sSL https://get.docker.com | sh
git clone your-repo && cd your-repo
docker-compose -f docker-compose.production.yml up -d

# Option 2: Easier ($150/month) - DigitalOcean managed
# Just deploy to DigitalOcean App Platform + managed DB/Redis
```

**Ready to implement the light version?** I can help you set up whichever option fits your budget!
