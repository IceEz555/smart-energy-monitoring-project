# Code Structure Documentation

## Directory Layout

```
smart-home-energy-monitor/
├── core/                    # Core business logic
│   ├── aws-connections.js   # AWS SDK clients initialization
│   ├── config.js            # Configuration management
│   ├── errors.js            # Custom error classes
│   ├── helpers.js           # Shared utility functions
│   └── helpers/
│       ├── CalculateKwh.js  # kWh calculation logic
│       └── IsNightTarif.js  # Tariff time detection
│
├── functions/               # AWS Lambda functions
│   ├── cron-rotate-daily.js # Daily data archiving cron
│   ├── getAiInsights.js     # AI insights API endpoint
│   └── graphql/
│       ├── graphql.js       # GraphQL handler
│       └── resolvers/       # GraphQL resolvers
│           ├── listDevices.js
│           ├── realtime.js
│           ├── readings.js
│           ├── stats.js
│           └── usageData.js
│
├── dashboard/               # Frontend application
│   ├── index.html           # Main dashboard page
│   ├── report.html          # Reports page
│   ├── main.js              # Dashboard logic
│   └── report.js            # Reports logic
│
├── tests/                   # Unit tests
│   └── *.test.js            # Test files
│
├── docs/                    # Documentation
│   ├── CODE_STRUCTURE.md
│   ├── API.md
│   └── DEVELOPMENT.md
│
├── .env                     # Environment variables (not in git)
├── .env.example             # Environment template
├── .eslintrc.json           # ESLint configuration
├── .eslintignore            # ESLint ignore rules
├── package.json             # Node.js dependencies
├── serverless.yml           # Serverless Framework config
└── webpack.config.js        # Webpack bundler config
```

---

## Core Modules

### `core/errors.js`

Custom error classes for standardized error handling:

```javascript
class ValidationError extends Error    // 400 - Invalid input
class DatabaseError extends Error      // 500 - Database errors
class NotFoundError extends Error      // 404 - Resource not found
class AuthenticationError extends Error // 401 - Auth failed
class AuthorizationError extends Error  // 403 - Permission denied
```

**Usage:**
```javascript
const { ValidationError } = require('./core/errors');
throw new ValidationError('Invalid device ID');
```

---

### `core/aws-connections.js`

Initializes AWS SDK clients:

- **DynamoDB Document Client** - For table operations
- **S3 Client** - For file storage
- **IoT Data Client** - For device communication

**Exports:**
```javascript
module.exports = {
    docClient,    // DynamoDB operations
    s3Client,     // S3 operations
    iotDataClient // IoT operations
};
```

---

### `core/config.js`

Configuration management with validation:

```javascript
module.exports = {
    dynamoDBTableName: 'smart-home-energy-monitor',
    s3BucketName: 'energy-archive-bucket',
    region: 'ap-southeast-2',
    nightTariffStart: 22,  // 10 PM
    nightTariffEnd: 7      // 7 AM
};
```

---

### `core/helpers.js`

Contains utility functions for:
- DynamoDB operations (query, scan, put)
- S3 operations (read, write with gzip)
- Date calculations
- CSV parsing

**Key Functions:**

#### DynamoDB Operations

```javascript
// Query readings by date range
getReadingsFromDynamoDBByDateRange(deviceId, startDate, endDate)
// Returns: Array of reading items

// Query daily summaries
getUsageDataFromDynamoDBByDateRange(deviceId, startDate, endDate)
// Returns: Array of summary items

// Scan all devices
scanForAllDeviceNames()
// Returns: Array of device IDs
```

#### S3 Operations

```javascript
// Write compressed data to S3
writeToS3(bucket, key, data)
// Automatically gzips data

// Read and decompress from S3
readFromS3(bucket, key)
// Automatically ungzips data
```

#### Data Transformation

```javascript
// Convert DynamoDB items to CSV
parseDynamoDBItemsToCSV(items)
// Returns: CSV string

// Calculate date range
getDateRangeTimestamps(startDate, endDate)
// Returns: { start, end } Unix timestamps
```

---

### `core/helpers/CalculateKwh.js`

Calculates energy consumption in kWh separated by day/night tariff.

**Algorithm:**
1. Iterate through measurements
2. Calculate time delta between readings (seconds)
3. Calculate energy: `(watts × seconds) / 3600 / 1000`
4. Classify as day or night tariff using `IsNightTarif()`
5. Accumulate totals

**Function Signature:**
```javascript
calculateKwh(readings, timestamps)
// Returns: { day: 2.456, night: 1.234 }
```

**Example:**
```javascript
const readings = [500, 520, 510];  // Watts
const timestamps = [1000, 1300, 1600]; // Unix timestamps

const result = calculateKwh(readings, timestamps);
// result = { day: 0.145, night: 0.0 }
```

---

### `core/helpers/IsNightTarif.js`

Determines if a timestamp falls within night tariff hours.

**Configuration:**
- Night tariff: 22:00 - 07:00 (configurable in `config.js`)

**Function Signature:**
```javascript
isNightTarif(timestamp)
// Returns: boolean
```

**Example:**
```javascript
isNightTarif(1760150400); // 23:00 -> true
isNightTarif(1760160400); // 14:00 -> false
```

---

## Lambda Functions

### `functions/cron-rotate-daily.js`

**Purpose:** Daily data archiving cron job

**Schedule:** Runs daily at midnight (configurable in `serverless.yml`)

**Process:**
1. Scan all devices from DynamoDB
2. For each device:
   - Calculate yesterday's kWh (day/night)
   - Store summary in DynamoDB
   - Archive raw readings to S3
   - Set TTL for automatic cleanup

**Triggers:**
- CloudWatch Events (cron)

---

### `functions/getAiInsights.js`

**Purpose:** AI-powered energy insights using Google Gemini

**Endpoint:** `POST /get-insights`

**Request Body:**
```json
{
  "prompt": "ฉันใช้ไฟ 2.5 kWh วันนี้ แนะนำวิธีประหยัดหน่อย"
}
```

**Response:**
```json
{
  "insights": "คำแนะนำจาก AI..."
}
```

**Features:**
- Integrates with Gemini API
- Context-aware responses
- Error handling

---

### `functions/graphql/graphql.js`

**Purpose:** GraphQL API handler

**Endpoint:** `/graphql`

**Supported Queries:**
- `listDevices` - List all devices
- `realtime` - Last 24 hours data
- `readings` - Historical readings
- `stats` - Always-on and today's usage
- `usageData` - Daily summaries

**Architecture:**
```javascript
Handler -> Resolver Router -> Specific Resolver -> Core Helpers -> DynamoDB/S3
```

---

## GraphQL Resolvers

### `resolvers/listDevices.js`

Returns array of all registered device IDs.

**Query:**
```graphql
query {
  listDevices
}
```

**Response:**
```json
["Room1", "Room2", "Kitchen"]
```

---

### `resolvers/realtime.js`

Returns last 24 hours of readings for a device.

**Query:**
```graphql
query {
  realtime(deviceId: "Room1", sinceTimestamp: 1760120000) {
    timestamp
    watts
  }
}
```

**Response:**
```json
[
  { "timestamp": 1760120344, "watts": 523 },
  { "timestamp": 1760120644, "watts": 587 }
]
```

---

### `resolvers/readings.js`

Returns readings for a specific date range.

**Query:**
```graphql
query {
  readings(
    deviceId: "Room1",
    startDate: 1760115600,
    endDate: 1760202000
  ) {
    timestamp
    watts
  }
}
```

---

### `resolvers/stats.js`

Returns always-on power and today's usage.

**Query:**
```graphql
query {
  stats(deviceId: "Room1") {
    alwaysOn
    todaySoFar
  }
}
```

**Response:**
```json
{
  "alwaysOn": 45,      // Watts
  "todaySoFar": 1.234  // kWh
}
```

**Calculation:**
- `alwaysOn` - Minimum wattage over last 24h
- `todaySoFar` - kWh accumulated since midnight

---

### `resolvers/usageData.js`

Returns daily energy summaries.

**Query:**
```graphql
query {
  usageData(
    deviceId: "Room1",
    startDate: 1760115600,
    endDate: 1760288400
  ) {
    date
    day
    night
    total
  }
}
```

**Response:**
```json
[
  {
    "date": "2025-10-11",
    "day": 2.456,
    "night": 1.234,
    "total": 3.690
  }
]
```

---

## Data Models

### DynamoDB Tables

**Table Name:** `smart-home-energy-monitor`

#### Reading Item

```javascript
{
  primarykey: "reading-Room1",      // Partition Key
  sortkey: 1760120344,              // Sort Key (Unix timestamp)
  readings: [523, 587, 601, ...],   // Array of wattage values
  ttl: 1762712344                   // Time to Live (30 days)
}
```

**Key Pattern:**
- `primarykey` - Format: `reading-{deviceId}`
- `sortkey` - Unix timestamp of reading batch
- `ttl` - Auto-deletion after 30 days

#### Summary Item

```javascript
{
  primarykey: "summary-day-Room1",  // Partition Key
  sortkey: 1760115600,              // Sort Key (start of day)
  usage: {
    day: 2.456,                     // kWh during day tariff
    night: 1.234                    // kWh during night tariff
  },
  deviceName: "Room1",
  ttl: 1791651600                   // 1 year retention
}
```

**Key Pattern:**
- `primarykey` - Format: `summary-day-{deviceId}`
- `sortkey` - Unix timestamp (start of day, midnight)
- `ttl` - Auto-deletion after 1 year

---

## Frontend Architecture

### `dashboard/index.html`

Main dashboard page structure:
- Device selector dropdown
- Real-time power chart
- Statistics cards (always-on, today's usage)
- Historical usage chart

### `dashboard/main.js`

**Key Features:**
- Real-time updates (WebSocket-like polling)
- Chart rendering (Chart.js, Dygraph)
- Data fetching from GraphQL API
- Date range selection

**Main Functions:**
```javascript
fetchDevices()           // Load device list
fetchRealtimeData()      // Get last 24h data
fetchUsageData()         // Get daily summaries
updateCharts()           // Render visualizations
```

### `dashboard/report.js`

**Key Features:**
- Historical data analysis
- CSV export
- Statistical summaries
- Date range filtering

---

## API Endpoints

### GraphQL API

**Endpoint:** `POST /graphql`

**Authentication:** None (add if needed)

**Content-Type:** `application/json`

**Request Format:**
```json
{
  "query": "query { listDevices }"
}
```

---

### AI Insights API

**Endpoint:** `POST /get-insights`

**Authentication:** None (add if needed)

**Request:**
```json
{
  "prompt": "ฉันใช้ไฟ 2.5 kWh วันนี้..."
}
```

**Response:**
```json
{
  "insights": "AI-generated insights..."
}
```

**Rate Limiting:** Not implemented (consider adding)

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- CalculateKwh.test.js

# Watch mode
npm test -- --watch
```

### Test Coverage

```bash
npm run test:coverage
```

**Test Files:**
- `core/helpers/CalculateKwh.test.js`
- `core/helpers/IsNightTarif.test.js`

**Coverage Target:** > 80%

---

## Configuration

### Environment Variables

Create `.env` file (copy from `.env.example`):

```bash
# AWS Configuration
AWS_REGION=ap-southeast-2
DYNAMODB_TABLE=smart-home-energy-monitor
S3_BUCKET=energy-archive-bucket

# API Keys
GEMINI_API_KEY=your_gemini_api_key_here

# Tariff Configuration
NIGHT_TARIFF_START=22
NIGHT_TARIFF_END=7
```

### Serverless Configuration

**File:** `serverless.yml`

Key settings:
- AWS region
- Lambda memory/timeout
- DynamoDB table names
- S3 bucket configuration
- CloudWatch Events (cron)

---

## Deployment

### Deploy to AWS

```bash
# Deploy all functions
serverless deploy

# Deploy specific function
serverless deploy function -f graphql

# Deploy to specific stage
serverless deploy --stage prod
```

### View Logs

```bash
# Tail logs
serverless logs -f graphql --tail

# Logs from last hour
serverless logs -f graphql --startTime 1h
```

---

## Code Style

### ESLint Configuration

**File:** `.eslintrc.json`

**Key Rules:**
- 4-space indentation
- Single quotes
- Semicolons required
- No trailing spaces
- No unused variables

### Running Linter

```bash
# Check for errors
npm run lint

# Auto-fix issues
npm run lint:fix

# Generate HTML report
npm run lint:report
```

---

## Best Practices

### Error Handling

Always use custom error classes:

```javascript
const { ValidationError } = require('./core/errors');

if (!deviceId) {
    throw new ValidationError('Device ID is required');
}
```

### Logging

Use appropriate log levels:

```javascript
console.info('Device registered:', deviceId);
console.warn('High power consumption detected');
console.error('Database connection failed:', error);
```

### Async/Await

Prefer async/await over callbacks:

```javascript
// ✅ Good
async function getData() {
    const result = await docClient.query(params);
    return result.Items;
}

// ❌ Avoid
function getData(callback) {
    docClient.query(params, callback);
}
```

---

## Troubleshooting

### Common Issues

**1. DynamoDB Access Denied**
- Check IAM permissions in `serverless.yml`
- Verify AWS credentials

**2. GraphQL Queries Timeout**
- Check DynamoDB indexes
- Optimize query parameters
- Increase Lambda timeout

**3. S3 Upload Fails**
- Verify bucket exists
- Check bucket permissions
- Ensure gzip compression works

### Debug Mode

```bash
# Enable debug logs
export SLS_DEBUG=*
serverless deploy

# Invoke function locally
serverless invoke local -f graphql \
  --data '{"body":"{\"query\":\"{ listDevices }\"}"}'
```

---

## Performance Optimization

### DynamoDB
- Use batch operations when possible
- Implement pagination for large datasets
- Create appropriate indexes

### Lambda
- Minimize cold starts (use provisioned concurrency)
- Optimize memory allocation
- Reuse connections (AWS SDK clients)

### Frontend
- Implement data caching
- Use debouncing for API calls
- Lazy load charts

---

## Security Considerations

### Current Status
- ⚠️ No authentication implemented
- ⚠️ No rate limiting
- ⚠️ No input validation on frontend

### Recommendations
1. Add API Gateway authentication (API keys or Cognito)
2. Implement rate limiting
3. Add CORS configuration
4. Sanitize user inputs
5. Encrypt sensitive data

---

## Future Enhancements

### Planned Features
- [ ] User authentication system
- [ ] Multi-user support
- [ ] Mobile app
- [ ] Push notifications for alerts
- [ ] Advanced analytics dashboard
- [ ] Cost estimation based on tariffs
- [ ] Energy comparison with neighbors

### Technical Debt
- [ ] Add comprehensive unit tests
- [ ] Implement integration tests
- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Set up CI/CD pipeline
- [ ] Implement monitoring/alerting

---

## Contributing

### Commit Guidelines

Use conventional commits:
```bash
feat: Add new feature
fix: Bug fix
docs: Documentation changes
style: Code style changes
refactor: Code refactoring
test: Add tests
chore: Maintenance tasks
```

**Example:**
```bash
git commit -m "feat: Add caching to usageData resolver"
git commit -m "fix: Correct kWh calculation for night tariff"
```

### Pull Request Process
1. Create feature branch
2. Write/update tests
3. Run linter
4. Update documentation
5. Submit PR with description

---

## Support

### Resources
- [Serverless Framework Docs](https://www.serverless.com/framework/docs/)
- [AWS Lambda Docs](https://docs.aws.amazon.com/lambda/)
- [DynamoDB Docs](https://docs.aws.amazon.com/dynamodb/)

### Getting Help
- Check existing issues
- Review CloudWatch logs
- Use `serverless support` command

---

**Last Updated:** October 2025  
**Version:** 1.0.0  
**Maintainer:** Your Team