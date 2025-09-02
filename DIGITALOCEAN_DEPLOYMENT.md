# NetWORX Essentials - DigitalOcean Deployment Guide

## **🌊 Cost: $48-78/month on DigitalOcean**

```
Monthly DigitalOcean Costs:
┌─────────────────────────────────────┬─────────┐
│ Component                           │ Cost    │
├─────────────────────────────────────┼─────────┤
│ Droplet (8GB, 4 vCPU)              │ $48     │
│ Backup Snapshots                    │ $10     │
│ Domain Registration (optional)      │ $12     │
│ Load Balancer (optional)            │ $12     │
├─────────────────────────────────────┼─────────┤
│ TOTAL (Basic)                       │ $58     │
│ TOTAL (with LB)                     │ $70     │
└─────────────────────────────────────┴─────────┘
```

## **🚀 Step-by-Step DigitalOcean Setup**

### **Step 1: Create DigitalOcean Droplet**

1. **Log into DigitalOcean Console**
   - Go to https://cloud.digitalocean.com/
   - Click "Create" → "Droplets"

2. **Choose Configuration:**
   ```
   Image: Ubuntu 24.04 LTS x64
   Size: Basic Plan
   CPU Options: Regular Intel
   Memory: 8 GB / 4 CPUs ($48/month)
   Datacenter: Choose closest to your users
   ```

3. **Authentication:**
   - Add your SSH key (recommended)
   - Or use password authentication

4. **Additional Options:**
   - ✅ Enable backups (+$10/month - recommended)
   - ✅ Enable monitoring (free)
   - Hostname: `networx-production`

5. **Create Droplet**
   - Click "Create Droplet"
   - Note the IP address once created

### **Step 2: Connect and Setup Server**

1. **SSH into your Droplet:**
   ```bash
   ssh root@YOUR_DROPLET_IP
   ```

2. **Update system:**
   ```bash
   apt update && apt upgrade -y
   ```

3. **Install Docker:**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```

4. **Install Docker Compose:**
   ```bash
   curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   chmod +x /usr/local/bin/docker-compose
   ```

5. **Setup firewall:**
   ```bash
   ufw allow 22   # SSH
   ufw allow 80   # HTTP
   ufw allow 443  # HTTPS
   ufw enable
   ```

### **Step 3: Deploy NetWORX Application**

1. **Create project directory:**
   ```bash
   mkdir -p /opt/networx
   cd /opt/networx
   ```

2. **Transfer your code** (choose one method):

   **Option A: Git Clone (if public repo):**
   ```bash
   git clone YOUR_REPO_URL .
   ```

   **Option B: SCP from local machine:**
   ```bash
   # From your local machine
   scp -r . root@YOUR_DROPLET_IP:/opt/networx/
   ```

   **Option C: Create tar and upload:**
   ```bash
   # Local machine: create archive
   tar -czf networx.tar.gz --exclude=node_modules --exclude=.git .
   
   # Upload to droplet
   scp networx.tar.gz root@YOUR_DROPLET_IP:/opt/networx/
   
   # On droplet: extract
   cd /opt/networx && tar -xzf networx.tar.gz
   ```

3. **Make deployment script executable:**
   ```bash
   chmod +x deploy-light-production.sh
   ```

### **Step 4: Configure Environment**

1. **Set environment variables:**
   ```bash
   # Set your domain (use droplet IP if no domain yet)
   export DOMAIN="YOUR_DOMAIN.com"  # or use YOUR_DROPLET_IP
   
   # Generate secure passwords
   export DB_PASSWORD=$(openssl rand -base64 32)
   export GRAFANA_PASSWORD=$(openssl rand -base64 16)
   
   # Save these passwords!
   echo "DB_PASSWORD: $DB_PASSWORD" > /root/passwords.txt
   echo "GRAFANA_PASSWORD: $GRAFANA_PASSWORD" >> /root/passwords.txt
   ```

2. **Run deployment script:**
   ```bash
   ./deploy-light-production.sh
   ```

### **Step 5: Domain Setup (Optional)**

If you want a custom domain:

1. **Buy domain through DigitalOcean:**
   - Go to Networking → Domains
   - Add domain or buy new one

2. **Configure DNS:**
   ```
   Type: A Record
   Name: @
   Data: YOUR_DROPLET_IP
   
   Type: A Record  
   Name: www
   Data: YOUR_DROPLET_IP
   ```

3. **Setup SSL with Let's Encrypt:**
   ```bash
   # Install certbot
   apt install certbot -y
   
   # Stop nginx temporarily
   docker-compose -f docker-compose.production.yml stop nginx
   
   # Get certificate
   certbot certonly --standalone -d YOUR_DOMAIN.com -d www.YOUR_DOMAIN.com
   
   # Copy certificates
   cp /etc/letsencrypt/live/YOUR_DOMAIN.com/fullchain.pem nginx/ssl/cert.pem
   cp /etc/letsencrypt/live/YOUR_DOMAIN.com/privkey.pem nginx/ssl/key.pem
   
   # Restart nginx
   docker-compose -f docker-compose.production.yml start nginx
   ```

### **Step 6: Verify Deployment**

1. **Check all services:**
   ```bash
   docker-compose -f docker-compose.production.yml ps
   ```

2. **Test application:**
   ```bash
   curl http://YOUR_DROPLET_IP/api/health
   # Should return: {"status":"ok"}
   ```

3. **Access monitoring:**
   - Grafana: `http://YOUR_DROPLET_IP:3001`
   - Login: admin / YOUR_GRAFANA_PASSWORD

4. **Check logs:**
   ```bash
   docker-compose -f docker-compose.production.yml logs -f app
   ```

## **🔧 DigitalOcean Specific Optimizations**

### **1. Enable Automatic Backups**
```bash
# Already enabled during droplet creation
# Creates daily snapshots automatically
```

### **2. Add DigitalOcean Monitoring**
```bash
# Install monitoring agent
curl -sSL https://repos.insights.digitalocean.com/install.sh | sudo bash
```

### **3. Setup Floating IP (Optional)**
```bash
# In DigitalOcean console:
# Networking → Floating IPs → Assign to Droplet
# This gives you a static IP that can be moved between droplets
```

### **4. Configure Load Balancer (Optional - $12/month)**
If you want high availability:
1. Go to Networking → Load Balancers
2. Create new load balancer
3. Add your droplet as target
4. Configure health checks

## **💾 Backup Strategy**

### **Automated Database Backups**
The deployment includes automatic PostgreSQL backups:
```bash
# Backups are stored in /opt/networx/backups/
# Retention: 7 days
# Frequency: Daily

# Manual backup:
docker-compose -f docker-compose.production.yml exec postgres pg_dump -U networx networx > manual-backup.sql
```

### **Droplet Snapshots**
```bash
# Manual snapshot via CLI:
doctl compute droplet-action snapshot YOUR_DROPLET_ID --snapshot-name "networx-backup-$(date +%Y%m%d)"

# Or use DigitalOcean console:
# Droplets → Your Droplet → Snapshots → Take Snapshot
```

## **📊 Monitoring & Maintenance**

### **Daily Health Checks**
```bash
# Add to crontab (crontab -e):
*/5 * * * * curl -f http://localhost:3000/api/health || echo "App down: $(date)" >> /var/log/networx-alerts.log
0 1 * * * docker system prune -f  # Daily cleanup
0 2 * * 0 /opt/networx/backup-database.sh  # Weekly DB backup
```

### **Resource Monitoring**
```bash
# Check resource usage:
docker stats
htop
df -h  # Disk usage
free -h  # Memory usage
```

### **Log Management**
```bash
# View application logs:
docker-compose -f docker-compose.production.yml logs -f app

# View specific service logs:
docker-compose -f docker-compose.production.yml logs postgres
docker-compose -f docker-compose.production.yml logs redis
docker-compose -f docker-compose.production.yml logs optimization-worker
```

## **🛠️ Troubleshooting**

### **Common Issues:**

1. **Services won't start:**
   ```bash
   # Check Docker status
   systemctl status docker
   
   # Restart Docker
   systemctl restart docker
   
   # Rebuild and restart
   docker-compose -f docker-compose.production.yml down
   docker-compose -f docker-compose.production.yml up -d --build
   ```

2. **Out of disk space:**
   ```bash
   # Clean Docker
   docker system prune -a -f
   
   # Clean old backups
   find /opt/networx/backups -name "*.sql" -mtime +7 -delete
   
   # Check space
   df -h
   ```

3. **Memory issues:**
   ```bash
   # Check memory usage
   free -h
   
   # Restart memory-heavy services
   docker-compose -f docker-compose.production.yml restart optimization-worker
   ```

## **🚀 Quick Commands Reference**

```bash
# Deployment
cd /opt/networx
./deploy-light-production.sh

# Service management
docker-compose -f docker-compose.production.yml up -d      # Start all
docker-compose -f docker-compose.production.yml down       # Stop all
docker-compose -f docker-compose.production.yml restart    # Restart all
docker-compose -f docker-compose.production.yml ps         # Status

# Updates
git pull                                                    # Update code
docker-compose -f docker-compose.production.yml build      # Rebuild
docker-compose -f docker-compose.production.yml up -d      # Deploy

# Monitoring
docker-compose -f docker-compose.production.yml logs -f    # All logs
curl http://localhost:3000/api/health                      # Health check
htop                                                        # System resources

# Backups
docker-compose -f docker-compose.production.yml exec postgres pg_dump -U networx networx > backup.sql
```

## **🎯 Next Steps After Deployment**

1. **Test all functionality:**
   - Upload Excel files
   - Run optimizations
   - Check data persistence

2. **Configure monitoring alerts:**
   - Setup email notifications
   - Configure Grafana dashboards

3. **Plan scaling:**
   - Monitor resource usage
   - Consider upgrading Droplet size if needed

4. **Security hardening:**
   - Change default passwords
   - Setup SSH key authentication only
   - Configure fail2ban

**Your NetWORX Essentials will be production-ready on DigitalOcean! 🌊**
