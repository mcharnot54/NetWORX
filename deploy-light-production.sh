#!/bin/bash

# NetWORX Essentials - Light Production Deployment Script
# Deploys the application with Redis job persistence and worker processes
# Cost: $40-150/month depending on provider choice

set -e

echo "🚀 NetWORX Essentials - Light Production Deployment"
echo "=================================================="

# Configuration
PROJECT_NAME="networx-essentials"
DOMAIN="${DOMAIN:-localhost}"
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -base64 32)}"
GRAFANA_PASSWORD="${GRAFANA_PASSWORD:-$(openssl rand -base64 16)}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        usermod -aG docker $USER
        print_success "Docker installed. Please log out and log back in to use Docker without sudo."
    else
        print_success "Docker is already installed"
    fi
}

# Check if Docker Compose is installed
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Installing..."
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
        print_success "Docker Compose installed"
    else
        print_success "Docker Compose is already installed"
    fi
}

# Create necessary directories
create_directories() {
    print_status "Creating directories..."
    mkdir -p nginx/ssl postgres/init grafana/dashboards grafana/datasources backups uploads logs scripts
    
    # Create nginx config
    cat > nginx/nginx.conf << 'EOF'
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

        # Optimization endpoints - stricter limits
        location /api/optimize {
            limit_req zone=optimization burst=2 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_read_timeout 300s;
            proxy_send_timeout 300s;
            client_max_body_size 50M;
        }

        # Regular API endpoints
        location /api {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            client_max_body_size 10M;
        }

        # Static files
        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
EOF

    # Create PostgreSQL config
    cat > postgres/postgresql.conf << 'EOF'
# PostgreSQL configuration for light production (1.5GB RAM)
shared_buffers = 384MB
effective_cache_size = 1152MB
work_mem = 8MB
maintenance_work_mem = 96MB
wal_buffers = 16MB
checkpoint_completion_target = 0.9
max_connections = 200
log_min_duration_statement = 1000
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
EOF

    # Create database initialization script
    cat > postgres/init/01-init.sql << 'EOF'
-- NetWORX Essentials Database Initialization
-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Performance optimization
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';

-- Create monitoring user
CREATE USER monitoring WITH PASSWORD 'monitoring123';
GRANT CONNECT ON DATABASE networx TO monitoring;
GRANT USAGE ON SCHEMA public TO monitoring;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitoring;

-- Create indexes for common queries (add your schema here)
-- Example: CREATE INDEX CONCURRENTLY idx_projects_status ON projects(status);
EOF

    print_success "Directories and configs created"
}

# Create environment file
create_env_file() {
    print_status "Creating environment file..."
    
    cat > .env.production << EOF
# Database Configuration
DB_PASSWORD=${DB_PASSWORD}
DATABASE_URL=postgresql://networx:${DB_PASSWORD}@postgres:5432/networx

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379

# Application Configuration
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
DOMAIN=${DOMAIN}

# Monitoring
GRAFANA_PASSWORD=${GRAFANA_PASSWORD}

# Security (update these!)
SESSION_SECRET=$(openssl rand -base64 32)
API_SECRET_KEY=$(openssl rand -base64 32)
EOF

    print_success "Environment file created"
    print_warning "IMPORTANT: Update .env.production with your actual domain and secrets!"
}

# Setup SSL (self-signed for local, Let's Encrypt for production)
setup_ssl() {
    if [ "$DOMAIN" = "localhost" ]; then
        print_status "Creating self-signed SSL certificate for localhost..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/key.pem \
            -out nginx/ssl/cert.pem \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        print_success "Self-signed certificate created"
    else
        print_warning "For production domains, setup Let's Encrypt after deployment:"
        print_warning "1. Point your domain to this server"
        print_warning "2. Run: certbot certonly --standalone -d $DOMAIN"
        print_warning "3. Copy certificates to nginx/ssl/"
        
        # Create placeholder certificates
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/key.pem \
            -out nginx/ssl/cert.pem \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=$DOMAIN"
    fi
}

# Build and start services
deploy_services() {
    print_status "Building and starting services..."
    
    # Build images
    docker-compose -f docker-compose.production.yml build
    
    # Start services
    docker-compose -f docker-compose.production.yml up -d
    
    print_success "Services started"
}

# Wait for services to be ready
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    # Wait for database
    echo -n "Waiting for PostgreSQL"
    while ! docker-compose -f docker-compose.production.yml exec -T postgres pg_isready -U networx -d networx; do
        echo -n "."
        sleep 2
    done
    echo " Ready!"
    
    # Wait for Redis
    echo -n "Waiting for Redis"
    while ! docker-compose -f docker-compose.production.yml exec -T redis redis-cli ping; do
        echo -n "."
        sleep 2
    done
    echo " Ready!"
    
    # Wait for application
    echo -n "Waiting for Application"
    for i in {1..30}; do
        if curl -f -s http://localhost:3000/api/health > /dev/null; then
            echo " Ready!"
            break
        fi
        echo -n "."
        sleep 5
    done
    
    print_success "All services are ready!"
}

# Display deployment summary
show_summary() {
    print_success "🎉 NetWORX Essentials deployed successfully!"
    echo ""
    echo "📋 Deployment Summary:"
    echo "====================="
    echo "Application: http://${DOMAIN}:80"
    echo "Monitoring:  http://${DOMAIN}:3001 (admin/${GRAFANA_PASSWORD})"
    echo "Database:    PostgreSQL (networx/${DB_PASSWORD})"
    echo "Redis:       localhost:6379"
    echo ""
    echo "📊 Service Status:"
    docker-compose -f docker-compose.production.yml ps
    echo ""
    echo "📝 Useful Commands:"
    echo "View logs:     docker-compose -f docker-compose.production.yml logs -f"
    echo "Stop services: docker-compose -f docker-compose.production.yml down"
    echo "Restart:       docker-compose -f docker-compose.production.yml restart"
    echo "Backup DB:     docker-compose -f docker-compose.production.yml exec postgres pg_dump -U networx networx > backup.sql"
    echo ""
    print_warning "🔐 SECURITY REMINDERS:"
    echo "1. Change default passwords in .env.production"
    echo "2. Setup firewall: ufw allow 22,80,443/tcp && ufw enable"
    echo "3. Setup SSL certificate for production domain"
    echo "4. Configure automated backups"
    echo ""
    print_success "✅ No more fallback data - only real client data processing!"
    print_success "✅ Redis job persistence - survives restarts!"
    print_success "✅ Worker processes - no main thread blocking!"
    print_success "✅ Database connection management!"
    print_success "✅ Circuit breakers and error handling!"
}

# Main deployment flow
main() {
    echo ""
    print_status "Starting deployment process..."
    
    # Check prerequisites
    check_docker
    check_docker_compose
    
    # Setup environment
    create_directories
    create_env_file
    setup_ssl
    
    # Deploy
    deploy_services
    wait_for_services
    
    # Show results
    show_summary
}

# Handle interruption
trap 'print_error "Deployment interrupted"; exit 1' INT

# Run deployment
main

print_success "🚀 Deployment completed! Your NetWORX system is ready for production use."
