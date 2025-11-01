# 📡 API Documentation

> Complete GraphQL API reference for Smart Home Energy Monitor

---

## 🔗 Base URL

```
POST https://YOUR_API_ID.execute-api.ap-southeast-2.amazonaws.com/prod/graphql
```

**Headers:**
```http
Content-Type: application/json
```

**Request Format:**
```json
{
  "query": "YOUR_GRAPHQL_QUERY",
  "variables": {
    "variable1": "value1"
  }
}
```

---

## 📚 Table of Contents

- [Authentication](#authentication)
- [GraphQL Schema](#graphql-schema)
- [Queries](#queries)
  - [listDevices](#listdevices)
  - [realtime](#realtime)
  - [readings](#readings)
  - [stats](#stats)
  - [usageData](#usagedata)
- [AI Insights API](#ai-insights-api)
- [Error Handling](#error-handling)
- [Rate Limits](#rate-limits)
- [Examples](#examples)

---

## 🔐 Authentication

**Current Status:** ⚠️ No authentication required

**Future Plans:**
- AWS Cognito User Pools
- API Key authentication
- JWT tokens

**Security Note:**
> This API should be secured before production use. Consider adding API Gateway authorization.

---

## 📋 GraphQL Schema

### Type Definitions

```graphql
type Query {
  listDevices: [String!]!
  realtime(sinceTimestamp: Int!, deviceId: String!): [Reading]!
  readings(startDate: Int!, endDate: Int!, deviceId: String!): [Reading]!
  stats(deviceId: String!): Stats!
  usageData(startDate: Int!, endDate: Int!, deviceId: String!): [DailySummary]!
}

type Reading {
  timestamp: Int!
  reading: Int!
}

type Stats {
  always_on: Float
  today_so_far: Float
}

type DailySummary {
  timestamp: Int!
  dayUse: Float!
  nightUse: Float!
}
```

---

## 🔍 Queries

### `listDevices`

Returns an array of all registered device IDs.

**Query:**
```graphql
query {
  listDevices
}
```

**Response:**
```json
{
  "data": {
    "listDevices": ["ESP32", "Room1", "Kitchen", "Office"]
  }
}
```

**Use Case:** Populate device selector dropdown

**cURL Example:**
```bash
curl -X POST https://YOUR_API/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ listDevices }"
  }'
```

---

### `realtime`

Returns readings from the last 24 hours for a specific device.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `deviceId` | String | ✅ | Device identifier |
| `sinceTimestamp` | Int | ✅ | Unix timestamp (seconds) |

**Query:**
```graphql
query GetRealtime($deviceId: String!, $since: Int!) {
  realtime(deviceId: $deviceId, sinceTimestamp: $since) {
    timestamp
    reading
  }
}
```

**Variables:**
```json
{
  "deviceId": "Room1",
  "since": 1760120000
}
```

**Response:**
```json
{
  "data": {
    "realtime": [
      {
        "timestamp": 1760120344,
        "reading": 523
      },
      {
        "timestamp": 1760120374,
        "reading": 587
      },
      {
        "timestamp": 1760120404,
        "reading": 601
      }
    ]
  }
}
```

**Notes:**
- Automatically limits to last 24 hours
- Returns up to 10,000 data points (sampled if needed)
- Timestamp is Unix epoch in seconds
- Reading is power in watts

**JavaScript Example:**
```javascript
const query = `
  query($deviceId: String!, $since: Int!) {
    realtime(deviceId: $deviceId, sinceTimestamp: $since) {
      timestamp
      reading
    }
  }
`;

const variables = {
  deviceId: "Room1",
  since: Math.floor(Date.now() / 1000) - 86400  // Last 24 hours
};

const response = await fetch('https://YOUR_API/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, variables })
});

const data = await response.json();
console.log(data.data.realtime);
```

---

### `readings`

Returns historical readings for a custom date range.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `deviceId` | String | ✅ | Device identifier |
| `startDate` | Int | ✅ | Start timestamp (seconds) |
| `endDate` | Int | ✅ | End timestamp (seconds) |

**Query:**
```graphql
query GetReadings($deviceId: String!, $start: Int!, $end: Int!) {
  readings(
    deviceId: $deviceId, 
    startDate: $start, 
    endDate: $end
  ) {
    timestamp
    reading
  }
}
```

**Variables:**
```json
{
  "deviceId": "Room1",
  "start": 1760115600,
  "end": 1760202000
}
```

**Response:**
```json
{
  "data": {
    "readings": [
      { "timestamp": 1760115600, "reading": 450 },
      { "timestamp": 1760115630, "reading": 472 },
      { "timestamp": 1760115660, "reading": 495 }
    ]
  }
}
```

**Limits:**
- Maximum 30 days per request
- Returns up to 5,000 data points (sampled if needed)
- Data older than 30 days may not be available (DynamoDB TTL)

**Use Case:** Generate historical reports (Yesterday button)

---

### `stats`

Returns real-time statistics for a device.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `deviceId` | String | ✅ | Device identifier |

**Query:**
```graphql
query GetStats($deviceId: String!) {
  stats(deviceId: $deviceId) {
    always_on
    today_so_far
  }
}
```

**Variables:**
```json
{
  "deviceId": "Room1"
}
```

**Response:**
```json
{
  "data": {
    "stats": {
      "always_on": 45,
      "today_so_far": 2.456
    }
  }
}
```

**Field Descriptions:**
- `always_on` (Float) - Standby power in watts (mode of readings)
- `today_so_far` (Float) - kWh consumed since midnight today

**Calculation Details:**

**Always On (Standby Power):**
```javascript
// Statistical mode of all readings from today
always_on = mode([523, 587, 601, 548, 492, ...])
// Result: Most frequent value ≈ standby power
```

**Today So Far:**
```javascript
// kWh from midnight until now
const todayStart = new Date().setHours(0, 0, 0, 0);
const readings = getReadingsSince(todayStart);
today_so_far = calculateKwh(readings);  // day + night
```

**Use Case:** Dashboard statistics cards

---

### `usageData`

Returns daily energy usage summaries (kWh per day).

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `deviceId` | String | ✅ | Device identifier |
| `startDate` | Int | ✅ | Start timestamp (seconds) |
| `endDate` | Int | ✅ | End timestamp (seconds) |

**Query:**
```graphql
query GetUsage($deviceId: String!, $start: Int!, $end: Int!) {
  usageData(
    deviceId: $deviceId,
    startDate: $start,
    endDate: $end
  ) {
    timestamp
    dayUse
    nightUse
  }
}
```

**Variables:**
```json
{
  "deviceId": "Room1",
  "start": 1759511200,
  "end": 1760202000
}
```

**Response:**
```json
{
  "data": {
    "usageData": [
      {
        "timestamp": 1759511200,
        "dayUse": 2.456,
        "nightUse": 1.234
      },
      {
        "timestamp": 1759597600,
        "dayUse": 3.125,
        "nightUse": 1.567
      }
    ]
  }
}
```

**Field Descriptions:**
- `timestamp` (Int) - Unix timestamp of the day (midnight)
- `dayUse` (Float) - kWh during day tariff (06:00-22:00 weekdays)
- `nightUse` (Float) - kWh during night tariff (22:00-06:00 + weekends)

**Tariff Rules:**
```
Night Tariff:
- 22:00 - 06:00 (all days)
- All day Saturday & Sunday

Day Tariff:
- 06:00 - 22:00 (Monday - Friday)
```

**Limits:**
- Maximum 1 year per request
- Data available for up to 1 year (DynamoDB TTL)

**Use Case:** 
- Daily usage bar chart
- Cost estimation reports

---

## 🤖 AI Insights API

### Endpoint

```
POST https://YOUR_API/prod/get-insights
```

### Request

**Headers:**
```http
Content-Type: application/json
```

**Body:**
```json
{
  "prompt": "ฉันใช้ไฟ 2.5 kWh วันนี้ แนะนำวิธีประหยัดหน่อย"
}
```

### Response

```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "## การวิเคราะห์การใช้พลังงาน...\n\n### คำแนะนำ..."
          }
        ]
      }
    }
  ],
  "modelUsed": "gemini-2.5-flash"
}
```

### Example

```javascript
const response = await fetch('https://YOUR_API/prod/get-insights', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: `
      การใช้งานรวมวันนี้: 3.2 kWh
      การใช้งานสูงสุด: 1,200 W
      พลังงานสแตนด์บาย: 45 W
      
      จากข้อมูลนี้ ช่วยวิเคราะห์และให้คำแนะนำประหยัดพลังงาน
    `
  })
});

const result = await response.json();
const insights = result.candidates[0].content.parts[0].text;
console.log(insights);
```

### Features

- Powered by Google Gemini 2.5 Flash
- Supports Thai language
- Context-aware responses
- Markdown formatted output
- Average response time: ~2-3 seconds

---

## ⚠️ Error Handling

### GraphQL Errors

```json
{
  "errors": [
    {
      "message": "deviceId must be a non-empty string",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["usageData"]
    }
  ],
  "data": null
}
```

### Common Error Codes

| Error | Cause | Solution |
|-------|-------|----------|
| `ValidationError` | Invalid input parameters | Check parameter types and values |
| `NotFoundError` | Device not found | Verify device ID exists |
| `DatabaseError` | DynamoDB query failed | Check CloudWatch logs |
| `RateLimitError` | Too many requests | Wait before retrying |

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success (even with GraphQL errors) |
| `400` | Bad Request (invalid JSON) |
| `500` | Internal Server Error |

### Error Handling Example

```javascript
async function fetchData(deviceId) {
  try {
    const response = await fetch('https://YOUR_API/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($id: String!) { 
          stats(deviceId: $id) { 
            always_on 
            today_so_far 
          } 
        }`,
        variables: { id: deviceId }
      })
    });

    const result = await response.json();

    if (result.errors) {
      console.error('GraphQL Errors:', result.errors);
      throw new Error(result.errors[0].message);
    }

    return result.data.stats;
    
  } catch (error) {
    console.error('Fetch Error:', error);
    throw error;
  }
}
```

---

## 🚦 Rate Limits

**Current Status:** ⚠️ No rate limiting implemented

**Recommendations:**
- Implement AWS WAF rate limiting
- Use API Gateway throttling
- Cache frequently accessed data

**Suggested Limits:**
| Endpoint | Limit |
|----------|-------|
| GraphQL | 1000 requests/hour per IP |
| AI Insights | 100 requests/hour per IP |

---

## 💡 Examples

### Example 1: Dashboard Data Flow

```javascript
// 1. Get list of devices
const devicesQuery = `{ listDevices }`;
const devices = await graphql(devicesQuery);

// 2. Get real-time data for selected device
const realtimeQuery = `
  query($deviceId: String!, $since: Int!) {
    realtime(deviceId: $deviceId, sinceTimestamp: $since) {
      timestamp
      reading
    }
  }
`;
const realtime = await graphql(realtimeQuery, {
  deviceId: devices[0],
  since: Math.floor(Date.now() / 1000) - 86400
});

// 3. Get today's statistics
const statsQuery = `
  query($deviceId: String!) {
    stats(deviceId: $deviceId) {
      always_on
      today_so_far
    }
  }
`;
const stats = await graphql(statsQuery, {
  deviceId: devices[0]
});

// 4. Get historical usage (last 30 days)
const usageQuery = `
  query($deviceId: String!, $start: Int!, $end: Int!) {
    usageData(deviceId: $deviceId, startDate: $start, endDate: $end) {
      timestamp
      dayUse
      nightUse
    }
  }
`;
const usage = await graphql(usageQuery, {
  deviceId: devices[0],
  start: Math.floor(Date.now() / 1000) - 2592000,  // 30 days ago
  end: Math.floor(Date.now() / 1000)
});
```

### Example 2: Generate Report

```javascript
async function generateReport(deviceId, startDate, endDate) {
  const query = `
    query($deviceId: String!, $start: Int!, $end: Int!) {
      usageData(deviceId: $deviceId, startDate: $start, endDate: $end) {
        timestamp
        dayUse
        nightUse
      }
    }
  `;

  const response = await fetch('https://YOUR_API/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      variables: {
        deviceId,
        start: startDate,
        end: endDate
      }
    })
  });

  const result = await response.json();
  const usageData = result.data.usageData;

  // Calculate totals
  const totalKwh = usageData.reduce((sum, day) => 
    sum + day.dayUse + day.nightUse, 0
  );

  // Estimate cost (Thai electricity tariff)
  const cost = calculateCost(totalKwh);

  return {
    period: { start: startDate, end: endDate },
    totalKwh,
    estimatedCost: cost,
    dailyData: usageData
  };
}

function calculateCost(kwh) {
  // Progressive tariff rates (example)
  const rates = [
    { limit: 150, rate: 3.2484 },
    { limit: 400, rate: 4.2218 },
    { limit: Infinity, rate: 4.4217 }
  ];

  let cost = 0;
  let remaining = kwh;

  for (const tier of rates) {
    const amount = Math.min(remaining, tier.limit - (kwh - remaining));
    cost += amount * tier.rate;
    remaining -= amount;
    if (remaining <= 0) break;
  }

  // Add Ft charge (0.3672 THB/kWh) + VAT (7%)
  const ft = kwh * 0.3672;
  const subtotal = cost + ft;
  const vat = subtotal * 0.07;

  return Math.round((subtotal + vat) * 100) / 100;
}
```

### Example 3: Real-time Monitoring

```javascript
class EnergyMonitor {
  constructor(apiUrl, deviceId) {
    this.apiUrl = apiUrl;
    this.deviceId = deviceId;
    this.lastTimestamp = Math.floor(Date.now() / 1000) - 86400;
  }

  async update() {
    const query = `
      query($deviceId: String!, $since: Int!) {
        realtime(deviceId: $deviceId, sinceTimestamp: $since) {
          timestamp
          reading
        }
      }
    `;

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: {
          deviceId: this.deviceId,
          since: this.lastTimestamp
        }
      })
    });

    const result = await response.json();
    const readings = result.data.realtime;

    if (readings.length > 0) {
      // Update chart with new data
      this.updateChart(readings);
      
      // Remember last timestamp for next update
      this.lastTimestamp = readings[readings.length - 1].timestamp;
    }
  }

  startMonitoring(intervalSeconds = 30) {
    this.update();  // Initial update
    this.interval = setInterval(() => {
      this.update();
    }, intervalSeconds * 1000);
  }

  stopMonitoring() {
    clearInterval(this.interval);
  }

  updateChart(newReadings) {
    // Add to existing chart data
    console.log('New readings:', newReadings);
  }
}

// Usage
const monitor = new EnergyMonitor(
  'https://YOUR_API/graphql',
  'Room1'
);
monitor.startMonitoring(30);  // Update every 30 seconds
```

---

## 🔧 Testing

### Using cURL

```bash
# Test listDevices
curl -X POST https://YOUR_API/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ listDevices }"}'

# Test stats
curl -X POST https://YOUR_API/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query($id:String!){stats(deviceId:$id){always_on today_so_far}}","variables":{"id":"Room1"}}'
```

### Using Postman

1. **Create new request:**
   - Method: POST
   - URL: `https://YOUR_API/graphql`

2. **Headers:**
   ```
   Content-Type: application/json
   ```

3. **Body (raw JSON):**
   ```json
   {
     "query": "{ listDevices }",
     "variables": {}
   }
   ```

### Using GraphQL Playground

Unfortunately, GraphQL Playground is not built into this API. Use Postman or cURL instead.

---

## 📚 Additional Resources

- [GraphQL Official Docs](https://graphql.org/learn/)
- [AWS AppSync (Alternative)](https://aws.amazon.com/appsync/)
- [Google Gemini API](https://ai.google.dev/)

---

## 📞 Support

- **Email:** apiwit806@gmail.com

---

**Last Updated:** November 2025  
**API Version:** 1.0.0  
**Maintainer:** Apivit Y.