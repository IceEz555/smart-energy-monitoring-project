# 🚀 Deployment Guide

> Complete guide for deploying Smart Home Energy Monitor to production

---

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Backend Deployment (AWS)](#backend-deployment-aws)
- [Frontend Deployment](#frontend-deployment)
- [Hardware Deployment](#hardware-deployment)
- [Post-Deployment Verification](#post-deployment-verification)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

### Required Accounts & Tools

- [x] AWS Account with admin access
- [x] AWS CLI configured
- [x] Node.js >= 18.0.0
- [x] Serverless Framework installed
- [x] Git repository access
- [x] Google Gemini API key

### Required Knowledge

- Basic AWS services (Lambda, DynamoDB, S3, IoT Core)
- Serverless Framework concepts
- Command line usage
- Environment variable management

---

## 📝 Pre-Deployment Checklist

### 1. Environment Configuration

```bash
# Clone repository
git clone https://github.com/yourusername/smart-home-energy-monitor.git
cd smart-home-energy-monitor/src-aws

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

**Edit `.env`:**
```bash
# Google Gemini API Key (REQUIRED)
GEMINI_API_KEY=your_actual_api_key_here

# AWS Region (optional, defaults in serverless.yml)
AWS_REGION=ap-southeast-2
```

### 2. AWS Credentials

```bash
# Configure AWS CLI
aws configure --profile serverless-personal

# Verify credentials
aws sts get-caller-identity --profile serverless-personal
```

**Expected Output:**
```json
{
  "UserId": "AIDAXXXXXXXXXXXXXXXXX",
  "Account": "123456789012",
  "Arn": "arn:aws:iam::123456789012:user/your-user"
}
```

### 3. Code Quality Checks

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Run tests
npm test

# Check test coverage
npm run test:coverage
```

**All tests must pass before deployment! ✅**

### 4. Review Configuration

**Check `serverless.yml`:**
```yaml
provider:
  region: ap-southeast-2  # Your target region
  stage: prod            # prod, staging, or dev
  profile: serverless-personal
```

---

## 🌩️ Backend Deployment (AWS)

### Step 1: Initial Deployment

```bash
cd src-aws

# Deploy everything (first time)
serverless deploy --verbose

# This will create:
# - Lambda functions (graphql, dailyDataArchive, getAiInsights)
# - DynamoDB table
# - S3 buckets
# - IoT Core resources
# - API Gateway
```

**Expected Output:**
```
Service Information
service: smart-home-energy-monitor
stage: prod
region: ap-southeast-2
stack: smart-home-energy-monitor-prod
resources: 15
api keys:
  None
endpoints:
  POST - https://xxxxxxxxxx.execute-api.ap-southeast-2.amazonaws.com/prod/graphql
  POST - https://xxxxxxxxxx.execute-api.ap-southeast-2.amazonaws.com/prod/get-insights
functions:
  graphql: smart-home-energy-monitor-prod-graphql
  getAiInsights: smart-home-energy-monitor-prod-getAiInsights
  dailyDataArchive: smart-home-energy-monitor-prod-dailyDataArchive
```

**⚠️ Save these endpoints! You'll need them for the frontend.**

### Step 2: Configure IoT Core

#### Create Thing

```bash
# Create IoT Thing for your device
aws iot create-thing \
  --thing-name Room1 \
  --region ap-southeast-2

# Create certificates
aws iot create-keys-and-certificate \
  --set-as-active \
  --certificate-pem-outfile Room1-cert.pem \
  --public-key-outfile Room1-public.key \
  --private-key-outfile Room1-private.key \
  --region ap-southeast-2
```

**Save the certificate ARN from output!**

#### Attach Policy to Certificate

```bash
# Get policy name from deployment output
POLICY_NAME=$(aws iot list-policies --query 'policies[?contains(policyName, `smart-home`)].[policyName]' --output text)

# Attach policy (use certificate ARN from previous step)
aws iot attach-policy \
  --policy-name $POLICY_NAME \
  --target "arn:aws:iot:ap-southeast-2:ACCOUNT_ID:cert/CERT_ID" \
  --region ap-southeast-2

# Attach certificate to thing
aws iot attach-thing-principal \
  --thing-name Room1 \
  --principal "arn:aws:iot:ap-southeast-2:ACCOUNT_ID:cert/CERT_ID" \
  --region ap-southeast-2
```

#### Get IoT Endpoint

```bash
# Get your IoT endpoint
aws iot describe-endpoint \
  --endpoint-type iot:Data-ATS \
  --region ap-southeast-2
```

**Save this endpoint for ESP32 configuration!**

### Step 3: Deploy Specific Functions (Updates)

```bash
# Deploy only GraphQL function
serverless deploy function -f graphql

# Deploy only AI Insights
serverless deploy function -f getAiInsights

# Deploy only Cron Job
serverless deploy function -f dailyDataArchive
```

### Step 4: View Deployment Info

```bash
# Get deployed stack info
serverless info

# Get specific function info
serverless info --function graphql

# View CloudFormation stack
aws cloudformation describe-stacks \
  --stack-name smart-home-energy-monitor-prod \
  --region ap-southeast-2
```

---

## 🌐 Frontend Deployment

### Method 1: Deploy to S3 (Recommended)

**Already configured in `serverless.yml`:**

```bash
cd src-aws

# Deploy dashboard to S3
serverless client deploy
```

**Output:**
```
Deploying client to stage "prod" in region "ap-southeast-2"
...
Website deployed successfully!
URL: http://smart-home-energy-monitor-www.s3-website-ap-southeast-2.amazonaws.com
```

### Method 2: Deploy to S3 + CloudFront

**Update `serverless.yml`:**
```yaml
custom:
  client:
    bucketName: smart-home-energy-monitor-www
    distributionFolder: dashboard/
    indexDocument: index.html
    errorDocument: index.html
    # Add CloudFront
    cloudFront: true
    cloudFrontDistribution:
      compress: true
      priceClass: PriceClass_100
```

**Deploy:**
```bash
serverless client deploy
```

### Method 3: Manual Deployment

```bash
# Build (if needed)
cd src-aws/dashboard

# Upload to S3
aws s3 sync . s3://smart-home-energy-monitor-www/ \
  --exclude "*.md" \
  --exclude ".DS_Store" \
  --region ap-southeast-2

# Make public (if needed)
aws s3 website s3://smart-home-energy-monitor-www/ \
  --index-document index.html \
  --error-document index.html \
  --region ap-southeast-2
```

### Configure API Endpoints in Frontend

**Edit `dashboard/main.js` and `dashboard/report.js`:**

```javascript
// Replace with your actual API endpoint
const BASE_URL = 'https://xxxxxxxxxx.execute-api.ap-southeast-2.amazonaws.com/prod/graphql';
```

**Re-deploy after changes:**
```bash
serverless client deploy
```

---

## 🔌 Hardware Deployment

### Step 1: Prepare ESP32

**Required Files:**
- Certificates from IoT Core setup
- Configured `config.h`

### Step 2: Configure Firmware

**Edit `src-esp/src/config/config.h`:**

```cpp
// WiFi Configuration
#define WIFI_NETWORK "YourWiFiSSID"
#define WIFI_PASSWORD "YourWiFiPassword"

// Device Name (must match IoT Thing name)
#define DEVICE_NAME "Room1"

// AWS IoT Endpoint (from previous step)
#define AWS_IOT_ENDPOINT "xxxxxxxxxx-ats.iot.ap-southeast-2.amazonaws.com"

// MQTT Topic
#define AWS_IOT_TOPIC "esp32/data"

// Hardware
#define HOME_VOLTAGE 220  // Your voltage (220V or 110V)
#define ADC_INPUT 34
```

### Step 3: Install Certificates

```bash
# Copy certificates to project
cp Room1-cert.pem src-esp/certificates/certificate.pem.crt
cp Room1-private.key src-esp/certificates/private.pem.key

# Download Amazon Root CA 1 (if not already)
curl https://www.amazontrust.com/repository/AmazonRootCA1.pem \
  -o src-esp/certificates/amazonrootca1.pem
```

**Verify certificates:**
```bash
ls -la src-esp/certificates/
# Should show:
# - certificate.pem.crt
# - private.pem.key
# - amazonrootca1.pem
```

### Step 4: Flash Firmware

```bash
cd src-esp

# Build firmware
pio run

# Upload to ESP32 (connect via USB)
pio run -t upload

# Monitor output
pio device monitor -b 115200
```

**Expected Serial Output:**
```
[WIFI] Connecting
[WIFI] Connected: 192.168.1.100
[MQTT] Connecting to AWS...
[MQTT] AWS Connected!
[ENERGY] Measuring...
[MQTT] AWS publish: {"readings":[523,587,601,...]}
```

### Step 5: Verify in AWS

```bash
# Check IoT Core activity
aws iot-data get-thing-shadow \
  --thing-name Room1 \
  --region ap-southeast-2

# Monitor MQTT messages (in AWS Console)
# → IoT Core → Test → Subscribe to topic: esp32/data
```

---

## ✅ Post-Deployment Verification

### 1. Test Backend APIs

```bash
# Test GraphQL API
curl -X POST https://YOUR_API/prod/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ listDevices }"}'

# Expected output
{"data":{"listDevices":["Room1"]}}
```

### 2. Test AI Insights

```bash
curl -X POST https://YOUR_API/prod/get-insights \
  -H "Content-Type: application/json" \
  -d '{"prompt":"สวัสดี ทดสอบระบบ"}'
```

### 3. Check DynamoDB

```bash
# List recent readings
aws dynamodb query \
  --table-name smart-home-energy-monitor \
  --key-condition-expression "primarykey = :pk" \
  --expression-attribute-values '{":pk":{"S":"reading-Room1"}}' \
  --limit 5 \
  --scan-index-forward false \
  --region ap-southeast-2
```

### 4. Test Dashboard

```bash
# Open dashboard URL
open http://smart-home-energy-monitor-www.s3-website-ap-southeast-2.amazonaws.com

# Check browser console for errors
# → Should load device list
# → Should display real-time data
```

### 5. Verify Cron Job

```bash
# Check EventBridge rule
aws events list-rules \
  --name-prefix smart-home \
  --region ap-southeast-2

# Manually trigger cron
serverless invoke -f dailyDataArchive --log

# Check S3 for archived data
aws s3 ls s3://smart-home-energy-monitor-prod-ap-southeast-2-readings/archived-readings/
```

---

## 📊 Monitoring & Maintenance

### CloudWatch Logs

```bash
# Tail logs
serverless logs -f graphql --tail

# View errors only
serverless logs -f graphql --filter "ERROR"

# View last 10 minutes
serverless logs -f graphql --startTime 10m
```

### CloudWatch Metrics

**Key Metrics to Monitor:**
- Lambda Invocations
- Lambda Errors
- Lambda Duration
- DynamoDB Read/Write Capacity
- IoT Core Messages

**Create Alarm (Example):**
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name lambda-errors-high \
  --alarm-description "Alert when Lambda errors exceed threshold" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=FunctionName,Value=smart-home-energy-monitor-prod-graphql \
  --region ap-southeast-2
```

### Cost Monitoring

```bash
# Check current month costs
aws ce get-cost-and-usage \
  --time-period Start=$(date -u +%Y-%m-01),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE

# Set cost budget
aws budgets create-budget \
  --account-id YOUR_ACCOUNT_ID \
  --budget file://budget.json
```

**`budget.json`:**
```json
{
  "BudgetName": "smart-home-monitor-monthly",
  "BudgetLimit": {
    "Amount": "5",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST"
}
```

---

## 🔄 Rollback Procedures

### Rollback Lambda Function

```bash
# List previous deployments
serverless deploy list

# Rollback to specific timestamp
serverless rollback --timestamp TIMESTAMP

# Rollback specific function
serverless rollback function -f graphql --version VERSION_NUMBER
```

### Restore DynamoDB

```bash
# Enable Point-in-Time Recovery (do this first!)
aws dynamodb update-continuous-backups \
  --table-name smart-home-energy-monitor \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true \
  --region ap-southeast-2

# Restore from point in time
aws dynamodb restore-table-to-point-in-time \
  --source-table-name smart-home-energy-monitor \
  --target-table-name smart-home-energy-monitor-restored \
  --restore-date-time "2025-11-01T00:00:00Z" \
  --region ap-southeast-2
```

### Rollback Frontend

```bash
# Re-deploy previous version from Git
git checkout PREVIOUS_COMMIT
cd src-aws
serverless client deploy
git checkout main
```

---

## 🐛 Troubleshooting

### Issue 1: Deployment Failed

**Error:** `The stack named smart-home-energy-monitor-prod failed to deploy`

**Solutions:**
```bash
# Check CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name smart-home-energy-monitor-prod \
  --max-items 20 \
  --region ap-southeast-2

# Remove failed stack and retry
serverless remove
serverless deploy
```

### Issue 2: Lambda Timeout

**Error:** `Task timed out after 30.00 seconds`

**Solutions:**
- Increase timeout in `serverless.yml`:
  ```yaml
  functions:
    graphql:
      timeout: 60  # Increase from 30 to 60 seconds
  ```
- Optimize database queries
- Add indexes to DynamoDB

### Issue 3: IoT Connection Failed

**Error:** `[MQTT] AWS connection timeout`

**Solutions:**
```bash
# Verify certificates
openssl x509 -in certificate.pem.crt -text -noout

# Check policy attachment
aws iot list-principal-policies \
  --principal "arn:aws:iot:REGION:ACCOUNT:cert/CERT_ID"

# Test MQTT connection (mosquitto)
mosquitto_pub \
  --cafile amazonrootca1.pem \
  --cert certificate.pem.crt \
  --key private.pem.key \
  -h YOUR-IOT-ENDPOINT \
  -p 8883 \
  -t test/topic \
  -m "test message"
```

### Issue 4: Dashboard Not Loading Data

**Solutions:**
1. Check API endpoint in `main.js`
2. Verify CORS configuration in `serverless.yml`
3. Check browser console for errors
4. Test API directly with cURL

---

## 🔒 Security Considerations

### Production Checklist

- [ ] Enable AWS WAF for API Gateway
- [ ] Implement API authentication (API Keys or Cognito)
- [ ] Enable CloudWatch Logs encryption
- [ ] Use Secrets Manager for API keys
- [ ] Enable DynamoDB encryption at rest
- [ ] Configure S3 bucket policies correctly
- [ ] Enable MFA for AWS account
- [ ] Rotate AWS access keys regularly
- [ ] Enable CloudTrail for audit logging

### Secrets Management

```bash
# Store Gemini API Key in Secrets Manager
aws secretsmanager create-secret \
  --name smart-home-monitor/gemini-api-key \
  --secret-string "your-api-key" \
  --region ap-southeast-2

# Update Lambda to use Secrets Manager
# (requires code changes)
```

---

## 📚 Additional Resources

- [AWS Serverless Deployment](https://www.serverless.com/framework/docs/providers/aws/guide/deploying)
- [AWS IoT Core Setup](https://docs.aws.amazon.com/iot/latest/developerguide/iot-gs.html)
- [CloudWatch Monitoring](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)

---

## 📞 Support

**Deployment Issues:**
- Check CloudWatch Logs
- Review CloudFormation events
- Contact: apiwit806@gmail.com

---

**Last Updated:** November 2025
**Maintainer:** Dev