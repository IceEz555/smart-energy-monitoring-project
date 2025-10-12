// ใช้ AWS SDK v3 แทน aws-sdk v2

const { S3Client } = require('@aws-sdk/client-s3');
const {
    DynamoDBClient
} = require('@aws-sdk/client-dynamodb');
const {
    DynamoDBDocumentClient
} = require('@aws-sdk/lib-dynamodb');

// สร้าง S3 client
const s3 = new S3Client({ region: 'ap-southeast-2' });

// สร้าง DynamoDB Document client
const dynamoClient = new DynamoDBClient({ region: 'ap-southeast-2' });
const dynamoDocClient = DynamoDBDocumentClient.from(dynamoClient);

module.exports = {
    s3,
    dynamoDocClient
};
