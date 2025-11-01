# 🛠️ Development Guide

> Comprehensive guide for developers working on Smart Home Energy Monitor

---

## 📋 Table of Contents

- [Development Environment Setup](#development-environment-setup)
- [Project Architecture](#project-architecture)
- [Backend Development](#backend-development)
- [Frontend Development](#frontend-development)
- [Hardware Development](#hardware-development)
- [Testing](#testing)
- [Debugging](#debugging)
- [Best Practices](#best-practices)
- [Common Tasks](#common-tasks)

---

## 💻 Development Environment Setup

### Required Software

**Core Tools:**
```bash
# Node.js (>= 18.0.0)
node --version

# npm (comes with Node.js)
npm --version

# AWS CLI
aws --version

# Git
git --version
```

**Optional Tools:**
```bash
# PlatformIO (for ESP32)
pio --version

# Docker (for local testing)
docker --version
```

### Installation Steps

#### 1. Install Node.js

**macOS:**
```bash
brew install node@18
```

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Windows:**
```powershell
# Download from https://nodejs.org/
# Or use chocolatey:
choco install nodejs-lts
```

#### 2. Install AWS CLI

**macOS:**
```bash
brew install awscli
```

**Linux:**
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

**Windows:**
```powershell
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi
```

#### 3. Install Serverless Framework

```bash
npm install -g serverless
```

#### 4. Install PlatformIO (for ESP32 development)

**VS Code Extension (Recommended):**
- Open VS Code
- Install "PlatformIO IDE" extension

**Command Line:**
```bash
pip install platformio
```

### Configure AWS Credentials

```bash
# Interactive configuration
aws configure --profile serverless-personal

# Manual configuration
mkdir -p ~/.aws
cat > ~/.aws/credentials << EOF
[serverless-personal]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY
EOF

cat > ~/.aws/config << EOF
[profile serverless-personal]
region = ap-southeast-2
output = json
EOF
```

### Clone & Setup Project

```bash
# Clone repository
git clone https://github.com/yourusername/smart-home-energy-monitor.git
cd smart-home-energy-monitor

# Install backend dependencies
cd src-aws
npm install

# Setup environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Install pre-commit hooks (optional)
npm install -g husky
husky install
```

### IDE Setup

#### VS Code (Recommended)

**Install Extensions:**
- ESLint
- Prettier
- AWS Toolkit
- PlatformIO IDE (for ESP32)
- GraphQL

**Workspace Settings:**

Create `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.validate": [
    "javascript",
    "javascriptreact"
  ],
  "files.associations": {
    "*.ino": "cpp"
  }
}
```

---

## 🏗️ Project Architecture

### Directory Structure

```
smart-home-energy-monitor/
│
├── src-aws/                # Backend (AWS Serverless)
│   ├── core/               # Business logic
│   │   ├── aws-connections.js
│   │   ├── config.js
│   │   ├── errors.js
│   │   ├── helpers.js
│   │   └── helpers/
│   │       ├── CalculateKwh.js
│   │       └── IsNightTarif.js
│   │
│   ├── functions/          # Lambda functions
│   │   ├── cron-rotate-daily.js
│   │   ├── getAiInsights.js
│   │   └── graphql/
│   │       ├── graphql.js
│   │       └── resolvers/
│   │
│   ├── dashboard/          # Frontend
│   │   ├── index.html
│   │   ├── report.html
│   │   ├── main.js
│   │   └── report.js
│   │
│   ├── tests/              # Unit tests
│   ├── docs/               # Backend documentation
│   ├── serverless.yml      # AWS deployment config
│   └── package.json
│
├── src-esp/                # Hardware (ESP32)
│   ├── src/
│   │   ├── MainV.2.ino
│   │   ├── config/
│   │   ├── tasks/
│   │   └── functions/
│   ├── certificates/       # AWS IoT certs (gitignored)
│   └── platformio.ini
│
└── docs/                   # Project documentation
```

### Data Flow

```
[ESP32] 
   ↓ (MQTT every 30s)
[AWS IoT Core]
   ↓ (IoT Rule)
[DynamoDB] ← [Lambda Cron] → [S3 Archive]
   ↓ (Query)         ↓ (Summary)
[GraphQL API]    [DynamoDB]
   ↓
[Dashboard]
```

---

## 🔧 Backend Development

### Local Development Workflow

#### 1. Start Local Development

```bash
cd src-aws

# Run tests in watch mode
npm run test:watch

# Run linter
npm run lint

# Test specific function locally
serverless invoke local -f graphql \
  --data '{"body":"{\"query\":\"{ listDevices }\"}"}'
```

#### 2. Make Changes

Edit files in `src-aws/`:
- `core/` - Business logic
- `functions/` - Lambda handlers
- `tests/` - Unit tests

#### 3. Test Changes

```bash
# Run all tests
npm test

# Run specific test
npm test -- CalculateKwh.test.js

# Check code coverage
npm run test:coverage
```

#### 4. Deploy to AWS

```bash
# Deploy all
serverless deploy

# Deploy specific function
serverless deploy function -f graphql

# Deploy to different stage
serverless deploy --stage dev
```

### Adding New Lambda Function

**1. Create handler file:**

`functions/myNewFunction.js`:
```javascript
'use strict';

module.exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));

    try {
        // Your logic here
        const result = processData(event);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(result)
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

function processData(event) {
    // Implementation
    return { success: true };
}
```

**2. Add to `serverless.yml`:**

```yaml
functions:
  myNewFunction:
    handler: functions/myNewFunction.handler
    description: Description of what this function does
    timeout: 30
    memorySize: 256
    events:
      - http:
          path: my-endpoint
          method: post
          cors: true
```

**3. Deploy:**

```bash
serverless deploy function -f myNewFunction
```

### Adding New GraphQL Resolver

**1. Create resolver file:**

`functions/graphql/resolvers/myResolver.js`:
```javascript
const { getReadingsFromDynamoDBByDateRange } = require('../../../core/helpers');

module.exports.myResolver = async ({ deviceId, startDate, endDate }) => {
    // Input validation
    if (!deviceId) {
        throw new Error('deviceId is required');
    }

    // Query data
    const data = await getReadingsFromDynamoDBByDateRange(
        deviceId, 
        startDate, 
        endDate
    );

    // Transform & return
    return data.map(item => ({
        timestamp: item.sortkey,
        value: item.reading
    }));
};
```

**2. Update schema in `graphql.js`:**

```javascript
const schema = buildSchema(`
  type Query {
    myQuery(deviceId: String!, startDate: Int!, endDate: Int!): [MyType]!
  }
  
  type MyType {
    timestamp: Int!
    value: Float!
  }
`);
```

**3. Add to root value:**

```javascript
const { myResolver } = require('./resolvers/myResolver');

const rootValue = {
    // ... existing resolvers
    myQuery: myResolver
};
```

### Database Schema Changes

#### Adding New DynamoDB Item Type

```javascript
// Example: Adding device metadata
const deviceMetadata = {
    primarykey: `device-meta-${deviceId}`,  // Partition key
    sortkey: Math.floor(Date.now() / 1000), // Sort key
    name: 'Living Room',
    location: 'House 1',
    calibration: 88.27,
    ttl: 0  // Never expire
};

await dynamoDocClient.send(new PutCommand({
    TableName: process.env.DYNAMO_DB_TABLE,
    Item: deviceMetadata
}));
```

#### Querying New Item Type

```javascript
const params = {
    TableName: process.env.DYNAMO_DB_TABLE,
    KeyConditionExpression: 'primarykey = :pk',
    ExpressionAttributeValues: {
        ':pk': `device-meta-${deviceId}`
    }
};

const result = await dynamoDocClient.send(new QueryCommand(params));
```

---

## 🎨 Frontend Development

### Development Server

```bash
cd src-aws/dashboard

# Serve locally (Python)
python3 -m http.server 8000

# Or use Node.js
npx http-server -p 8000

# Open browser
open http://localhost:8000
```

### File Structure

```
dashboard/
├── index.html      # Main dashboard
├── report.html     # Reports page
├── main.js         # Dashboard logic
├── report.js       # Reports logic
└── img/            # Images & icons
```

### Adding New Chart

**Example: Adding Pie Chart**

```javascript
// In main.js or report.js

function createPieChart(data) {
    const ctx = document.getElementById('myPieChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Day', 'Night'],
            datasets: [{
                data: [data.day, data.night],
                backgroundColor: ['#4f46e5', '#d1d5db']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}
```

### Calling GraphQL API

```javascript
async function fetchData(deviceId) {
    const query = `
        query($deviceId: String!) {
            stats(deviceId: $deviceId) {
                always_on
                today_so_far
            }
        }
    `;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query,
                variables: { deviceId }
            })
        });

        const result = await response.json();
        
        if (result.errors) {
            throw new Error(result.errors[0].message);
        }

        return result.data.stats;
        
    } catch (error) {
        console.error('API Error:', error);
        showError('Failed to fetch data');
    }
}
```

---

## 🔌 Hardware Development

### ESP32 Development Workflow

#### 1. Setup PlatformIO Project

```bash
cd src-esp

# Initialize project (if needed)
pio init --board lolin32

# Install dependencies
pio lib install
```

#### 2. Configure Device

Edit `src/config/config.h`:
```cpp
#define WIFI_NETWORK "YourWiFi"
#define WIFI_PASSWORD "YourPassword"
#define DEVICE_NAME "Room1"
#define AWS_IOT_ENDPOINT "xxxxx-ats.iot.ap-southeast-2.amazonaws.com"
```

#### 3. Build & Upload

```bash
# Build firmware
pio run

# Upload to ESP32
pio run -t upload

# Monitor serial output
pio device monitor -b 115200

# Or do all at once
pio run -t upload && pio device monitor
```

### Adding New Task (FreeRTOS)

**Example: Adding temperature monitoring**

```cpp
// In src/tasks/measure-temperature.h

#ifndef TASK_MEASURE_TEMPERATURE
#define TASK_MEASURE_TEMPERATURE

#include <Arduino.h>
#include "../config/enums.h"

extern DisplayValues gDisplayValues;

void measureTemperature(void* parameter) {
    for (;;) {
        // Read sensor
        float temp = readTemperatureSensor();
        
        // Store in global struct
        gDisplayValues.temperature = temp;
        
        // Log
        Serial.printf("[TEMP] %.1f°C\n", temp);
        
        // Sleep for 60 seconds
        vTaskDelay(60000 / portTICK_PERIOD_MS);
    }
}

float readTemperatureSensor() {
    // Implementation
    return 25.5;
}

#endif
```

**Add to `MainV.2.ino`:**

```cpp
#include "tasks/measure-temperature.h"

void setup() {
    // ... existing setup code
    
    // Create temperature task
    xTaskCreate(
        measureTemperature,
        "Measure Temperature",
        5000,    // Stack size
        NULL,    // Parameters
        3,       // Priority
        NULL     // Task handle
    );
}
```

### Calibrating Current Sensor

```cpp
// 1. Connect known load (e.g., 100W light bulb)
// 2. Enable DEBUG mode
#define DEBUG true

// 3. Upload firmware and check serial output
// Expected: ~0.45A for 100W @ 220V

// 4. Calculate calibration
// actual_amps = 100W / 220V = 0.45A
// If measured = 0.40A
// New calibration = (0.45 / 0.40) * 88.27 = 99.3

// 5. Update in setup()
emon1.current(ADC_INPUT, 99.3);
```

---

## 🧪 Testing

### Backend Unit Tests

```bash
cd src-aws

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Run specific test file
npm test -- CalculateKwh.test.js
```

### Writing New Tests

```javascript
// tests/myFeature.test.js
const assert = require('assert');
const { myFunction } = require('../core/myFeature');

describe('MyFeature', function() {
    describe('#myFunction()', function() {
        it('should return correct result', function() {
            const input = { value: 100 };
            const result = myFunction(input);
            assert.equal(result, 200);
        });

        it('should handle edge cases', function() {
            const result = myFunction(null);
            assert.equal(result, 0);
        });
    });
});
```

### Integration Testing

```bash
# Test Lambda function with real AWS
serverless invoke -f graphql \
  --data '{"body":"{\"query\":\"{ listDevices }\"}"}'

# Test with logs
serverless invoke -f graphql \
  --data '{"body":"{\"query\":\"{ listDevices }\"}"}' \
  --log
```

### Hardware Testing

```cpp
// In src-esp/test/test_current_sensor.cpp

#include <unity.h>
#include "EmonLib.h"

EnergyMonitor emon;

void setUp(void) {
    emon.current(34, 88.27);
}

void test_current_reading(void) {
    double amps = emon.calcIrms(2000);
    TEST_ASSERT_GREATER_THAN(0, amps);
    TEST_ASSERT_LESS_THAN(30, amps);
}

void setup() {
    UNITY_BEGIN();
    RUN_TEST(test_current_reading);
    UNITY_END();
}

void loop() {}
```

---

## 🐛 Debugging

### Backend Debugging

#### CloudWatch Logs

```bash
# Tail logs in real-time
serverless logs -f graphql --tail

# View logs from specific time
serverless logs -f graphql --startTime 1h

# Filter logs
serverless logs -f graphql --filter "ERROR"
```

#### Local Debugging with VS Code

`.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug GraphQL Function",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src-aws/functions/graphql/graphql.js",
      "env": {
        "DYNAMO_DB_TABLE": "smart-home-energy-monitor",
        "AWS_REGION": "ap-southeast-2"
      }
    }
  ]
}
```

#### Debug Specific Function

```javascript
// Add console.log statements
console.log('[DEBUG] Input:', JSON.stringify(input, null, 2));
console.log('[DEBUG] Query result:', result);

// Use debugger statement
debugger;  // Breakpoint here when debugging
```

### Frontend Debugging

#### Browser DevTools

```javascript
// In browser console
console.log('Current state:', gDisplayValues);
console.log('Chart data:', data);

// Network tab
// → Check GraphQL requests/responses

// Performance tab
// → Check load times
```

#### Debug API Calls

```javascript
// Wrap fetch with logging
const originalFetch = window.fetch;
window.fetch = function(...args) {
    console.log('[FETCH]', args[0], args[1]);
    return originalFetch(...args).then(response => {
        console.log('[RESPONSE]', response.status);
        return response;
    });
};
```

### Hardware Debugging

#### Serial Monitor

```bash
# Monitor ESP32 output
pio device monitor -b 115200

# With filters
pio device monitor -b 115200 --filter log2file
```

#### Enable Debug Output

```cpp
// In config/config.h
#define DEBUG true

// Use debug macros
serial_println("[DEBUG] WiFi connected");
serial_print("Current reading: ");
serial_println(amps);
```

---

## ✅ Best Practices

### Code Style

- Follow ESLint rules (`.eslintrc.json`)
- Use meaningful variable names
- Add comments for complex logic
- Write self-documenting code

### Git Workflow

```bash
# Feature branch
git checkout -b feature/new-feature

# Commit with convention
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/new-feature
```

### Security

- Never commit `.env` files
- Never commit certificates
- Use environment variables
- Enable CloudWatch Logs encryption

### Performance

- Minimize Lambda cold starts
- Use DynamoDB efficiently
- Cache frequently accessed data
- Optimize frontend bundle size

---

## 🔨 Common Tasks

### Task 1: Add New Device

```bash
# 1. Create AWS IoT Thing
aws iot create-thing --thing-name NewDevice

# 2. Create certificates
aws iot create-keys-and-certificate \
  --set-as-active \
  --certificate-pem-outfile cert.pem \
  --public-key-outfile public.key \
  --private-key-outfile private.key

# 3. Attach policy
aws iot attach-policy \
  --policy-name smart-home-energy-monitor-iotPolicyForDevices \
  --target CERT_ARN

# 4. Flash ESP32 with new config
```

### Task 2: Export Database

```bash
# Export DynamoDB to JSON
aws dynamodb scan \
  --table-name smart-home-energy-monitor \
  --output json > export.json

# Export to CSV
aws dynamodb scan \
  --table-name smart-home-energy-monitor \
  --output text | \
  jq -r '.Items[] | [.primarykey, .sortkey, .reading] | @csv' \
  > export.csv
```

### Task 3: Backup S3 Data

```bash
# Sync S3 to local
aws s3 sync \
  s3://smart-home-energy-monitor-prod-ap-southeast-2-readings \
  ./backup/

# Compress
tar -czf backup.tar.gz backup/
```

---

## 📚 Additional Resources

- [AWS Lambda Docs](https://docs.aws.amazon.com/lambda/)
- [ESP32 Arduino Docs](https://docs.espressif.com/projects/arduino-esp32/)
- [FreeRTOS Tutorial](https://www.freertos.org/tutorial/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)

---

**Last Updated:** November 2025
**Maintainer:** Development Team