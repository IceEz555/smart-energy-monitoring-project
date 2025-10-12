module.exports.config = {
    deviceName: 'ESP32',

    dynamoDb: {
        table: process.env.DYNAMO_DB_TABLE
    },

    s3: {
        bucket: process.env.S3_STORAGE_BUCKET
    }
};