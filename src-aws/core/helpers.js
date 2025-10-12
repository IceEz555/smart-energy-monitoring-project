/**
 * @fileoverview Helper functions สำหรับจัดการ DynamoDB, S3, และคำนวณเกี่ยวกับวันที่
 * @module core/helpers
 */

const { dynamoDocClient, s3 } = require('./aws-connections');
const { ScanCommand, QueryCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const zlib = require('zlib');
const util = require('util');
const gzip = util.promisify(zlib.gzip);

module.exports.getYesterdayDate = function () {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const string = yesterday.toISOString().substring(0, 10).replace(/-/g, '');
    return {
        unixTimestamp: Math.floor(yesterday.getTime() / 1000),
        string: string,
        year: string.substring(0, 4),
        month: string.substring(4, 6)
    };
};

module.exports.getTodaysDate = function () {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
        unixTimestamp: Math.floor(today.getTime() / 1000)
    };
};

/**
 * ดึงข้อมูล readings จาก DynamoDB ตามช่วงเวลาที่กำหนด
 *
 * @param {string} deviceId - Device ID (e.g., "ESP32", "Room1")
 * @param {number} startDate - Unix timestamp (seconds) ของวันที่เริ่มต้น
 * @param {number} endDate - Unix timestamp (seconds) ของวันที่สิ้นสุด
 *
 * @returns {Promise<Array>} Array of DynamoDB items
 * @returns {string} returns[].primarykey - Partition key (reading-{deviceId})
 * @returns {number} returns[].sortkey - Sort key (timestamp)
 * @returns {Array<number>} returns[].readings - Array of wattage values
 *
 * @example
 * const readings = await getReadingsFromDynamoDBByDateRange(
 *   'Room1',
 *   1760115600,  // 2025-01-10 00:00:00
 *   1760202000   // 2025-01-11 00:00:00
 * );
 */

module.exports.getReadingsFromDynamoDBByDateRange = async function (deviceId, startDate, endDate) {
    const params = {
        TableName: process.env.DYNAMO_DB_TABLE,
        KeyConditionExpression: 'primarykey = :pk and sortkey BETWEEN :start AND :end',
        ExpressionAttributeValues: {
            ':pk': `reading-${deviceId}`,
            ':start': startDate,
            ':end': endDate
        }
    };

    try {
        const data = await dynamoDocClient.send(new QueryCommand(params));
        return data.Items || [];
    } catch (err) {
        console.error('Error in getReadingsFromDynamoDBByDateRange:', err);
        return [];
    }
};

/**
 * ดึงข้อมูล readings ตั้งแต่ timestamp ที่ระบุจนถึงปัจจุบัน
 * ใช้สำหรับ stats resolver
 */
module.exports.getReadingsFromDynamoDBSince = async function (deviceId, sinceTimestamp) {
    const now = Math.floor(Date.now() / 1000);
    return await module.exports.getReadingsFromDynamoDBByDateRange(deviceId, sinceTimestamp, now);
};

/**
 * ดึงข้อมูลสรุปรายวัน (Usage Data) ตามช่วงวันที่ สำหรับอุปกรณ์ที่ระบุ
 */
module.exports.getUsageDataFromDynamoDBByDateRange = async function (deviceId, startDate, endDate) {
    const params = {
        TableName: process.env.DYNAMO_DB_TABLE,
        KeyConditionExpression: 'primarykey = :pk and sortkey BETWEEN :start AND :end',
        ExpressionAttributeValues: {
            ':pk': `summary-day-${deviceId}`,
            ':start': startDate,
            ':end': endDate
        }
    };
    const { DatabaseError } = require('./errors');

    try {
        const data = await dynamoDocClient.send(new QueryCommand(params));

        if (!data.Items || data.Items.length === 0) {
            console.info(`No readings found for device ${deviceId} between ${startDate} and ${endDate}`);
        }

        return data.Items || [];
    } catch (err) {
        console.error('[ERROR] Failed to query DynamoDB:', {
            operation: 'getReadingsFromDynamoDBByDateRange',
            deviceId,
            startDate,
            endDate,
            error: err.message,
            code: err.code
        });

        throw new DatabaseError(
            `Failed to retrieve readings for device ${deviceId}`,
            err
        );
    }
};

/**
 * Scans หาชื่ออุปกรณ์ทั้งหมดจากทั้ง summary และ readings
 * เพื่อให้แน่ใจว่าจะเจออุปกรณ์แม้ว่าข้อมูล readings จะถูก TTL ลบไปแล้ว
 */
module.exports.scanForAllDeviceNames = async () => {
    // Scan จาก summary-day (มี TTL 365 วัน)
    const summaryParams = {
        TableName: process.env.DYNAMO_DB_TABLE,
        FilterExpression: 'begins_with(primarykey, :prefix)',
        ProjectionExpression: 'primarykey',
        ExpressionAttributeValues: { ':prefix': 'summary-day-' }
    };

    // Scan จาก readings (มี TTL 30-90 วัน)
    const readingsParams = {
        TableName: process.env.DYNAMO_DB_TABLE,
        FilterExpression: 'begins_with(primarykey, :prefix)',
        ProjectionExpression: 'primarykey',
        ExpressionAttributeValues: { ':prefix': 'reading-' }
    };

    try {
        // Query ทั้งสองแหล่งพร้อมกัน
        const [summaryData, readingsData] = await Promise.all([
            dynamoDocClient.send(new ScanCommand(summaryParams)),
            dynamoDocClient.send(new ScanCommand(readingsParams))
        ]);

        // Extract device names จาก summary
        const summaryDevices = (summaryData.Items || [])
            .map(item => item.primarykey.replace('summary-day-', ''));

        // Extract device names จาก readings
        const readingsDevices = (readingsData.Items || [])
            .map(item => item.primarykey.replace('reading-', ''));

        console.log('[DEBUG] Summary devices:', summaryDevices);
        console.log('[DEBUG] Readings devices:', readingsDevices);

        // Merge และลบตัวซ้ำ
        const uniqueDeviceNames = new Set([...summaryDevices, ...readingsDevices]);
        const result = Array.from(uniqueDeviceNames).sort();

        console.log('[DEBUG] Final unique devices:', result);

        return result;
    } catch (err) {
        console.error('[ERROR] Unable to scan for devices:', err);
        return [];
    }
};
// --- ฟังก์ชันที่เหลือสำหรับ cron-job ---

module.exports.saveDailySummary = async function (summaryObject) {
    const params = { TableName: process.env.DYNAMO_DB_TABLE, Item: summaryObject };
    return dynamoDocClient.send(new PutCommand(params));
};

module.exports.parseDynamoDBItemsToCSV = function (dynamoData) {
    if (!dynamoData || !dynamoData.Items || dynamoData.Items.length === 0) {
        return 'Timestamp,Watts\n';
    }

    let output = 'Timestamp,Watts\n';

    for (const item of dynamoData.Items) {
        const baseTimestamp = item.sortkey || item.timestamp;

        if (!baseTimestamp) {
            continue;
        }

        // กรณีที่ 1: มี array "readings"
        if (Array.isArray(item.readings) && item.readings.length > 0) {
            item.readings.forEach((reading, index) => {
                const timestamp = baseTimestamp + index;
                const watts = reading ?? 'undefined';
                output += `${timestamp},${watts}\n`;
            });
        // กรณีที่ 2: เป็นค่าเดี่ยว
        }else {
            const wattage = item.reading ?? item.watts ?? item.power ?? 'undefined';
            output += `${baseTimestamp},${wattage}\n`;
        }
    }
    return output;
};

module.exports.writeToS3 = async function (filename, contents) {
    const compressedBody = await gzip(contents);
    const params = {
        Body: compressedBody,
        Bucket: process.env.S3_STORAGE_BUCKET,
        Key: filename + '.gz'
    };
    return s3.send(new PutObjectCommand(params));
};