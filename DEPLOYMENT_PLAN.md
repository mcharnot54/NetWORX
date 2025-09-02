# NetWORX Essentials - Production Deployment Plan

## **🚨 CRITICAL: No-Fallback Production System**

This deployment plan ensures your optimization platform can handle real client workloads with **zero tolerance for synthetic data or system failures**.

## **Pre-Deployment Requirements**

### **✅ Mandatory Prerequisites**
- [ ] AWS Account with sufficient limits (EC2, RDS, ElastiCache)
- [ ] Domain name and SSL certificate ready
- [ ] Real client transport data uploaded (UPS, TL, R&L files)
- [ ] Completed transport baseline analysis ($6.56M verified)
- [ ] Capacity analysis completed for test scenarios
- [ ] All fallback/mock data code removed (✅ Already done)

### **🔧 Technical Prerequisites**
- [ ] Docker images built and tested
- [ ] Database migrations prepared
- [ ] Environment variables configured
- [ ] Monitoring dashboards created
- [ ] Alert notifications configured (PagerDuty/Slack)

## **Phase 1: Infrastructure Setup (Week 1)**

### **Day 1-2: Core AWS Infrastructure**

#### **1. VPC and Networking**
```bash
# Create VPC with public/private subnets
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=networx-prod-vpc}]'

# Create subnets across AZs
aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.1.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.2.0/24 --availability-zone us-east-1b
aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.101.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.102.0/24 --availability-zone us-east-1b

# Setup NAT Gateway and routing
aws ec2 create-nat-gateway --subnet-id $PUBLIC_SUBNET_ID --allocation-id $EIP_ALLOCATION_ID
```

#### **2. RDS Database Setup**
```bash
# Create RDS subnet group
aws rds create-db-subnet-group \
  --db-subnet-group-name networx-db-subnet-group \
  --db-subnet-group-description "NetWORX DB subnet group" \
  --subnet-ids $PRIVATE_SUBNET_1 $PRIVATE_SUBNET_2

# Create production database
aws rds create-db-instance \
  --db-instance-identifier networx-prod-db \
  --db-instance-class db.r6g.xlarge \
  --engine postgres \
  --engine-version 14.9 \
  --master-username networx \
  --master-user-password $DB_PASSWORD \
  --allocated-storage 100 \
  --storage-type gp3 \
  --storage-encrypted \
  --vpc-security-group-ids $DB_SECURITY_GROUP_ID \
  --db-subnet-group-name networx-db-subnet-group \
  --backup-retention-period 30 \
  --multi-az \
  --auto-minor-version-upgrade \
  --deletion-protection

# Create read replica
aws rds create-db-instance-read-replica \
  --db-instance-identifier networx-prod-db-replica \
  --source-db-instance-identifier networx-prod-db \
  --db-instance-class db.r6g.large
```

#### **3. ElastiCache Redis Setup**
```bash
# Create Redis subnet group
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name networx-redis-subnet-group \
  --cache-subnet-group-description "NetWORX Redis subnet group" \
  --subnet-ids $PRIVATE_SUBNET_1 $PRIVATE_SUBNET_2

# Create Redis cluster
aws elasticache create-replication-group \
  --replication-group-id networx-prod-redis \
  --description "NetWORX Production Redis" \
  --num-cache-clusters 3 \
  --cache-node-type cache.r6g.large \
  --engine redis \
  --engine-version 7.0 \
  --cache-subnet-group-name networx-redis-subnet-group \
  --security-group-ids $REDIS_SECURITY_GROUP_ID \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled \
  --automatic-failover-enabled \
  --multi-az-enabled
```

### **Day 3-4: Container Infrastructure**

#### **4. ECS Cluster Setup**
```yaml
# ecs-cluster.yaml
Resources:
  ECSCluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: networx-production
      CapacityProviders:
        - FARGATE
        - FARGATE_SPOT
      DefaultCapacityProviderStrategy:
        - CapacityProvider: FARGATE
          Weight: 1
          Base: 2
        - CapacityProvider: FARGATE_SPOT
          Weight: 4

  WebTaskDefinition:
    Type: AWS::ECS::TaskDefinition
    Properties:
      Family: networx-web
      NetworkMode: awsvpc
      RequiresCompatibilities:
        - FARGATE
      Cpu: 2048
      Memory: 4096
      ExecutionRoleArn: !Ref ECSExecutionRole
      TaskRoleArn: !Ref ECSTaskRole
      ContainerDefinitions:
        - Name: networx-web
          Image: !Sub "${AWS::AccountId}.dkr.ecr.${AWS::Region}.amazonaws.com/networx-web:latest"
          PortMappings:
            - ContainerPort: 3000
              Protocol: tcp
          Environment:
            - Name: NODE_ENV
              Value: production
            - Name: DATABASE_URL
              Value: !Sub "postgresql://networx:${DBPassword}@${DBEndpoint}:5432/networx"
            - Name: REDIS_HOST
              Value: !GetAtt RedisCluster.RedisEndpoint.Address
          LogConfiguration:
            LogDriver: awslogs
            Options:
              awslogs-group: /ecs/networx-web
              awslogs-region: !Ref AWS::Region
              awslogs-stream-prefix: ecs

  OptimizationTaskDefinition:
    Type: AWS::ECS::TaskDefinition
    Properties:
      Family: networx-optimization-worker
      NetworkMode: awsvpc
      RequiresCompatibilities:
        - FARGATE
      Cpu: 8192
      Memory: 16384
      ContainerDefinitions:
        - Name: optimization-worker
          Image: !Sub "${AWS::AccountId}.dkr.ecr.${AWS::Region}.amazonaws.com/networx-worker:latest"
          Environment:
            - Name: WORKER_TYPE
              Value: optimization
            - Name: NODE_OPTIONS
              Value: "--max-old-space-size=14336"
```

#### **5. Application Load Balancer**
```yaml
  ApplicationLoadBalancer:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Name: networx-alb
      Scheme: internet-facing
      Type: application
      Subnets:
        - !Ref PublicSubnet1
        - !Ref PublicSubnet2
      SecurityGroups:
        - !Ref ALBSecurityGroup

  ALBTargetGroup:
    Type: AWS::ElasticLoadBalancingV2::TargetGroup
    Properties:
      Name: networx-web-targets
      Port: 3000
      Protocol: HTTP
      VpcId: !Ref VPC
      TargetType: ip
      HealthCheckPath: /api/health
      HealthCheckIntervalSeconds: 30
      HealthCheckTimeoutSeconds: 10
      HealthyThresholdCount: 2
      UnhealthyThresholdCount: 5
```

### **Day 5: Service Configuration**

#### **6. ECS Services**
```yaml
  WebService:
    Type: AWS::ECS::Service
    Properties:
      Cluster: !Ref ECSCluster
      TaskDefinition: !Ref WebTaskDefinition
      ServiceName: networx-web-service
      DesiredCount: 3
      LaunchType: FARGATE
      NetworkConfiguration:
        AwsvpcConfiguration:
          SecurityGroups:
            - !Ref WebSecurityGroup
          Subnets:
            - !Ref PrivateSubnet1
            - !Ref PrivateSubnet2
          AssignPublicIp: DISABLED
      LoadBalancers:
        - ContainerName: networx-web
          ContainerPort: 3000
          TargetGroupArn: !Ref ALBTargetGroup
      
  OptimizationService:
    Type: AWS::ECS::Service
    Properties:
      Cluster: !Ref ECSCluster
      TaskDefinition: !Ref OptimizationTaskDefinition
      ServiceName: networx-optimization-service
      DesiredCount: 2
      LaunchType: FARGATE
      NetworkConfiguration:
        AwsvpcConfiguration:
          SecurityGroups:
            - !Ref WorkerSecurityGroup
          Subnets:
            - !Ref PrivateSubnet1
            - !Ref PrivateSubnet2
```

## **Phase 2: Application Deployment (Week 2)**

### **Day 1-2: Container Images**

#### **7. Docker Images**
```dockerfile
# Dockerfile.web
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS build
COPY . .
RUN npm run build

FROM node:18-alpine AS production
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json

# Production optimizations
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=3584"
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000
CMD ["npm", "start"]
```

```dockerfile
# Dockerfile.worker
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS build
COPY . .
RUN npm run build:worker

FROM node:18-alpine AS production
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

# Worker optimizations for heavy compute
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=14336 --expose-gc"
ENV UV_THREADPOOL_SIZE=32

CMD ["node", "dist/worker.js"]
```

#### **8. Build and Push Images**
```bash
# Build images
docker build -f Dockerfile.web -t networx-web:latest .
docker build -f Dockerfile.worker -t networx-worker:latest .

# Tag for ECR
docker tag networx-web:latest $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/networx-web:latest
docker tag networx-worker:latest $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/networx-worker:latest

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
docker push $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/networx-web:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/networx-worker:latest
```

### **Day 3-4: Database Migration**

#### **9. Database Setup Script**
```sql
-- production-schema.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Performance optimization
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET max_connections = 1000;
ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET effective_cache_size = '6GB';
ALTER SYSTEM SET work_mem = '256MB';
ALTER SYSTEM SET maintenance_work_mem = '512MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '64MB';

-- Create application tables
-- (Your existing schema here)

-- Create indexes for performance
CREATE INDEX CONCURRENTLY idx_projects_status ON projects(status);
CREATE INDEX CONCURRENTLY idx_scenarios_project_id ON scenarios(project_id);
CREATE INDEX CONCURRENTLY idx_data_files_scenario_id ON data_files(scenario_id);
CREATE INDEX CONCURRENTLY idx_data_files_processing_status ON data_files(processing_status);

-- Create monitoring views
CREATE VIEW active_connections AS
SELECT 
  datname,
  usename,
  application_name,
  client_addr,
  state,
  query_start,
  state_change
FROM pg_stat_activity 
WHERE state = 'active';

-- Grant permissions
GRANT CONNECT ON DATABASE networx TO networx;
GRANT USAGE ON SCHEMA public TO networx;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO networx;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO networx;
```

#### **10. Migration Script**
```bash
#!/bin/bash
# migrate-production.sh

set -e

echo "Starting production database migration..."

# Wait for database to be ready
until pg_isready -h $DB_HOST -p 5432 -U networx; do
  echo "Waiting for database..."
  sleep 2
done

# Run schema migration
psql -h $DB_HOST -p 5432 -U networx -d networx -f production-schema.sql

# Verify tables created
psql -h $DB_HOST -p 5432 -U networx -d networx -c "\dt"

echo "Database migration completed successfully"
```

### **Day 5: Application Configuration**

#### **11. Environment Configuration**
```bash
# production.env
NODE_ENV=production
DATABASE_URL=postgresql://networx:$DB_PASSWORD@$DB_ENDPOINT:5432/networx
REDIS_HOST=$REDIS_ENDPOINT
REDIS_PORT=6379

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=$ACCESS_KEY
AWS_SECRET_ACCESS_KEY=$SECRET_KEY

# Application Settings
NEXT_TELEMETRY_DISABLED=1
LOG_LEVEL=info
API_TIMEOUT_MS=30000
JOB_TIMEOUT_MS=300000

# Monitoring
SNS_ALERT_TOPIC_ARN=$ALERT_TOPIC_ARN
CLOUDWATCH_NAMESPACE=NetWORX/Production

# Security
CORS_ORIGIN=https://networx.yourdomain.com
SESSION_SECRET=$SESSION_SECRET
```

## **Phase 3: Load Testing (Week 3)**

### **Pre-Production Load Testing**

#### **12. Load Test Configuration**
```typescript
// load-tests/config.ts
export const LOAD_TEST_SCENARIOS = {
  // Baseline load test
  baseline: {
    name: 'Baseline API Load',
    duration: '5m',
    vus: 10, // Virtual users
    requests: 1000,
    endpoints: [
      { path: '/api/health', weight: 10 },
      { path: '/api/projects', weight: 20 },
      { path: '/api/scenarios', weight: 30 },
      { path: '/api/optimize/run-batch', weight: 5 }
    ]
  },
  
  // Peak load test
  peak: {
    name: 'Peak Load Simulation',
    duration: '10m',
    vus: 50,
    requests: 5000,
    rampUpTime: '2m',
    steadyTime: '6m',
    rampDownTime: '2m'
  },
  
  // Stress test (optimization heavy)
  stress: {
    name: 'Optimization Stress Test',
    duration: '15m',
    vus: 20,
    requests: 200,
    endpoints: [
      { path: '/api/optimize/run-batch', weight: 80 },
      { path: '/api/jobs', weight: 20 }
    ]
  },
  
  // Spike test
  spike: {
    name: 'Traffic Spike Test',
    stages: [
      { duration: '1m', target: 10 },
      { duration: '30s', target: 100 }, // Spike
      { duration: '2m', target: 100 },
      { duration: '30s', target: 10 },
      { duration: '1m', target: 10 }
    ]
  }
};
```

#### **13. K6 Load Test Scripts**
```javascript
// load-tests/optimization-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export let options = {
  stages: [
    { duration: '2m', target: 20 }, // Ramp up
    { duration: '5m', target: 20 }, // Stay at 20 users
    { duration: '2m', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<30000'], // 95% of requests under 30s
    errors: ['rate<0.05'], // Error rate under 5%
  },
};

export default function() {
  // Test optimization endpoint
  const optimizationPayload = {
    scenario_id: 1,
    model: {
      optimize: 'cost',
      opType: 'min',
      constraints: {
        capacity: { max: 1000000 }
      },
      variables: generateTestVariables()
    }
  };
  
  const response = http.post(
    `${BASE_URL}/api/optimize/run-batch`,
    JSON.stringify(optimizationPayload),
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: '60s'
    }
  );
  
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response has job_id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.job_id;
      } catch {
        return false;
      }
    },
    'response time < 30s': (r) => r.timings.duration < 30000,
  });
  
  errorRate.add(!success);
  
  if (success && response.status === 200) {
    const body = JSON.parse(response.body);
    const jobId = body.data.job_id;
    
    // Poll for job completion
    pollJobStatus(jobId);
  }
  
  sleep(Math.random() * 5 + 2); // Random sleep 2-7 seconds
}

function pollJobStatus(jobId) {
  for (let i = 0; i < 30; i++) { // Poll for up to 5 minutes
    const response = http.get(`${BASE_URL}/api/optimize/run-batch?job_id=${jobId}`);
    
    if (response.status === 200) {
      const body = JSON.parse(response.body);
      if (body.data.status === 'completed' || body.data.status === 'failed') {
        break;
      }
    }
    
    sleep(10); // Wait 10 seconds between polls
  }
}

function generateTestVariables() {
  // Generate realistic optimization variables
  const variables = {};
  for (let i = 0; i < 50; i++) {
    for (let j = 0; j < 20; j++) {
      variables[`x_${i}_${j}`] = {
        cost: Math.random() * 1000,
        capacity: Math.random() * 100
      };
    }
  }
  return variables;
}
```

#### **14. Database Load Test**
```javascript
// load-tests/database-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% under 5s
    'http_req_duration{endpoint:projects}': ['p(90)<1000'],
    'http_req_duration{endpoint:scenarios}': ['p(90)<2000'],
  },
};

export default function() {
  // Test database-heavy endpoints
  const endpoints = [
    { path: '/api/projects', tag: 'projects' },
    { path: '/api/scenarios?project_id=1', tag: 'scenarios' },
    { path: '/api/data_files?scenario_id=1', tag: 'files' },
    { path: '/api/health', tag: 'health' }
  ];
  
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const response = http.get(`${BASE_URL}${endpoint.path}`, {
    tags: { endpoint: endpoint.tag }
  });
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time acceptable': (r) => r.timings.duration < 10000,
    'valid JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    }
  });
  
  sleep(1);
}
```

#### **15. Load Test Execution**
```bash
#!/bin/bash
# run-load-tests.sh

set -e

BASE_URL="https://networx-staging.yourdomain.com"
RESULTS_DIR="load-test-results"

mkdir -p $RESULTS_DIR

echo "Starting load tests against $BASE_URL..."

# Run baseline test
echo "Running baseline load test..."
k6 run --env BASE_URL=$BASE_URL \
  --summary-export=$RESULTS_DIR/baseline-summary.json \
  --out json=$RESULTS_DIR/baseline-results.json \
  load-tests/baseline-test.js

# Run database test
echo "Running database load test..."
k6 run --env BASE_URL=$BASE_URL \
  --summary-export=$RESULTS_DIR/database-summary.json \
  --out json=$RESULTS_DIR/database-results.json \
  load-tests/database-test.js

# Run optimization stress test
echo "Running optimization stress test..."
k6 run --env BASE_URL=$BASE_URL \
  --summary-export=$RESULTS_DIR/optimization-summary.json \
  --out json=$RESULTS_DIR/optimization-results.json \
  load-tests/optimization-test.js

# Run spike test
echo "Running spike test..."
k6 run --env BASE_URL=$BASE_URL \
  --summary-export=$RESULTS_DIR/spike-summary.json \
  --out json=$RESULTS_DIR/spike-results.json \
  load-tests/spike-test.js

echo "Load tests completed. Results in $RESULTS_DIR/"

# Generate report
node scripts/generate-load-test-report.js $RESULTS_DIR
```

### **Performance Requirements**

#### **16. Acceptance Criteria**
```yaml
performance_requirements:
  api_endpoints:
    health_check:
      p95_response_time: 200ms
      availability: 99.9%
    
    project_operations:
      p95_response_time: 2000ms
      throughput: 100 req/min
    
    scenario_operations:
      p95_response_time: 5000ms
      throughput: 50 req/min
    
    optimization_submission:
      p95_response_time: 30000ms
      throughput: 10 req/min
      success_rate: 95%
  
  resource_limits:
    cpu_utilization: 70%
    memory_utilization: 80%
    database_connections: 80% of max
    queue_depth: 20 jobs max
    
  error_rates:
    total_error_rate: <2%
    optimization_error_rate: <5%
    database_error_rate: <1%
```

## **Phase 4: Production Deployment (Week 4)**

### **Day 1-2: Staging Deployment**

#### **17. Staging Environment**
```bash
# Deploy to staging first
aws ecs update-service \
  --cluster networx-staging \
  --service networx-web-service \
  --task-definition networx-web:latest \
  --desired-count 2

# Run smoke tests
curl -f https://networx-staging.yourdomain.com/api/health
curl -f https://networx-staging.yourdomain.com/api/projects

# Run load tests against staging
./run-load-tests.sh
```

### **Day 3-4: Production Deployment**

#### **18. Blue-Green Deployment**
```bash
#!/bin/bash
# blue-green-deploy.sh

set -e

# Create new task definition with latest image
NEW_TASK_DEF=$(aws ecs register-task-definition \
  --family networx-web \
  --task-role-arn $TASK_ROLE_ARN \
  --execution-role-arn $EXECUTION_ROLE_ARN \
  --network-mode awsvpc \
  --requires-compatibilities FARGATE \
  --cpu 2048 \
  --memory 4096 \
  --container-definitions file://task-definition.json \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "Created new task definition: $NEW_TASK_DEF"

# Update service with new task definition
aws ecs update-service \
  --cluster networx-production \
  --service networx-web-service \
  --task-definition $NEW_TASK_DEF

# Wait for deployment to complete
aws ecs wait services-stable \
  --cluster networx-production \
  --services networx-web-service

echo "Deployment completed successfully"

# Run health checks
./verify-deployment.sh
```

#### **19. Deployment Verification**
```bash
#!/bin/bash
# verify-deployment.sh

set -e

BASE_URL="https://networx.yourdomain.com"

echo "Verifying production deployment..."

# Health check
HEALTH_RESPONSE=$(curl -s -f $BASE_URL/api/health)
echo "Health check: $HEALTH_RESPONSE"

# Verify all services healthy
HEALTH_STATUS=$(echo $HEALTH_RESPONSE | jq -r '.status')
if [ "$HEALTH_STATUS" != "healthy" ]; then
  echo "❌ Health check failed: $HEALTH_STATUS"
  exit 1
fi

# Test API endpoints
curl -s -f $BASE_URL/api/projects > /dev/null
echo "✅ Projects API working"

curl -s -f $BASE_URL/api/scenarios > /dev/null
echo "✅ Scenarios API working"

# Test optimization submission
OPTIMIZATION_RESPONSE=$(curl -s -X POST $BASE_URL/api/optimize/run-batch \
  -H "Content-Type: application/json" \
  -d '{"scenario_id": 1, "model": {"optimize": "cost"}}')

JOB_ID=$(echo $OPTIMIZATION_RESPONSE | jq -r '.data.job_id')
if [ "$JOB_ID" != "null" ]; then
  echo "✅ Optimization API working (Job ID: $JOB_ID)"
else
  echo "❌ Optimization API failed"
  exit 1
fi

echo "🎉 Production deployment verified successfully"
```

### **Day 5: Monitoring Setup**

#### **20. CloudWatch Dashboard Creation**
```bash
# Create production dashboard
aws cloudwatch put-dashboard \
  --dashboard-name "NetWORX-Production" \
  --dashboard-body file://dashboard-config.json

# Setup alerts
aws sns create-topic --name networx-production-alerts
aws cloudwatch put-metric-alarm \
  --alarm-name "NetWORX-HighErrorRate" \
  --alarm-description "High error rate detected" \
  --metric-name "Errors" \
  --namespace "AWS/ApplicationELB" \
  --statistic "Sum" \
  --period 300 \
  --threshold 10 \
  --comparison-operator "GreaterThanThreshold" \
  --evaluation-periods 2
```

## **Post-Deployment Checklist**

### **✅ Mandatory Verification Steps**
- [ ] All health checks passing
- [ ] Database migrations completed
- [ ] Redis cluster operational
- [ ] Job queues processing correctly
- [ ] Real data validation working (no fallbacks)
- [ ] Monitoring dashboards active
- [ ] Alerts configured and tested
- [ ] SSL certificates valid
- [ ] Load balancer routing correctly
- [ ] Auto-scaling policies active

### **✅ Performance Verification**
- [ ] API response times under thresholds
- [ ] Database connection pool stable
- [ ] Memory usage within limits
- [ ] Job processing working at scale
- [ ] Error rates below 2%
- [ ] Optimization jobs completing successfully

### **✅ Security Verification**
- [ ] All services in private subnets
- [ ] Security groups properly configured
- [ ] Database encryption enabled
- [ ] Redis encryption enabled
- [ ] No sensitive data in logs
- [ ] IAM roles follow least privilege

## **Rollback Plan**

### **Emergency Rollback Procedure**
```bash
#!/bin/bash
# emergency-rollback.sh

set -e

echo "🚨 EMERGENCY ROLLBACK INITIATED"

# Get previous task definition
PREVIOUS_TASK_DEF=$(aws ecs describe-services \
  --cluster networx-production \
  --services networx-web-service \
  --query 'services[0].deployments[1].taskDefinition' \
  --output text)

if [ "$PREVIOUS_TASK_DEF" == "None" ]; then
  echo "❌ No previous deployment found"
  exit 1
fi

echo "Rolling back to: $PREVIOUS_TASK_DEF"

# Rollback service
aws ecs update-service \
  --cluster networx-production \
  --service networx-web-service \
  --task-definition $PREVIOUS_TASK_DEF \
  --force-new-deployment

# Wait for rollback
aws ecs wait services-stable \
  --cluster networx-production \
  --services networx-web-service

echo "✅ Rollback completed"

# Verify health
./verify-deployment.sh
```

## **Ongoing Operations**

### **Daily Operations Checklist**
- [ ] Check CloudWatch dashboards
- [ ] Review error logs
- [ ] Monitor job queue depths
- [ ] Verify database performance
- [ ] Check optimization job success rates
- [ ] Review resource utilization
- [ ] Validate backup completions

### **Weekly Operations**
- [ ] Review performance trends
- [ ] Analyze optimization patterns
- [ ] Update capacity planning
- [ ] Security patch review
- [ ] Cost optimization review

This deployment plan ensures your NetWORX system can handle real client workloads with enterprise-grade reliability and performance.
