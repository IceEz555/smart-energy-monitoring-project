'use strict';
const {
    getYesterdayDate,
    getTodaysDate,
    writeToS3,
    parseDynamoDBItemsToCSV,
    getReadingsFromDynamoDBByDateRange,
    scanForAllDeviceNames,
    saveDailySummary
} = require('../core/helpers');
const { calculateKWH } = require('../core/helpers/CalculateKwh');

module.exports.handler = async () => {
    console.info('--- Daily Cron Job Started ---');

    const allDevices = await scanForAllDeviceNames();

    if (!allDevices || allDevices.length === 0) {
        console.log('No devices found. Exiting.');
        return;
    }
    console.info(`Found devices to process: ${allDevices.join(', ')}`);

    const startTimestamp = getYesterdayDate().unixTimestamp;
    const endTimestamp = getTodaysDate().unixTimestamp;

    for (const deviceId of allDevices) {
        console.info(`\n=== Processing device: ${deviceId} ===`);

        const readingsItems = await getReadingsFromDynamoDBByDateRange(
            deviceId,
            startTimestamp,
            endTimestamp
        );

        if (readingsItems.length === 0) {
            console.log(`No data for ${deviceId}. Skipping.`);
            continue;
        }

        console.info(`[INFO] Retrieved ${readingsItems.length} items from DynamoDB`);

        // แปลงข้อมูลเป็นรูปแบบที่ calculateKWH ต้องการ
        const measurements = [];
        let totalReadings = 0;
        let skippedItems = 0;

        for (const item of readingsItems) {
            const baseTimestamp = item.sortkey || item.timestamp;

            if (!baseTimestamp) {
                console.warn('[WARN] Item missing timestamp, skipping');
                skippedItems++;
                continue;
            }

            // กรณีที่ 1: Array format (readings)
            if (Array.isArray(item.readings) && item.readings.length > 0) {
                item.readings.forEach((reading, index) => {
                    const wattage = Number(reading);
                    if (!isNaN(wattage) && wattage >= 0) {
                        measurements.push([
                            new Date((baseTimestamp + index) * 1000),
                            wattage
                        ]);
                        totalReadings++;
                    }
                });
                continue;
            }

            // กรณีที่ 2: Single value format
            const wattage = item.reading ?? item.watts ?? item.power;

            if (wattage !== undefined) {
                const watts = Number(wattage);
                if (!isNaN(watts) && watts >= 0) {
                    measurements.push([
                        new Date(baseTimestamp * 1000),
                        watts
                    ]);
                    totalReadings++;
                }
            } else {
                console.warn(`[WARN] No wattage field in item with sortkey ${baseTimestamp}`);
                skippedItems++;
            }
        }

        console.info(`[INFO] Processed: ${totalReadings} readings, Skipped: ${skippedItems} items`);

        // ตรวจสอบว่ามีข้อมูลที่ใช้งานได้หรือไม่
        if (measurements.length === 0) {
            console.error(`[ERROR] No valid measurements for ${deviceId}. Skipping summary.`);
            continue;
        }

        // คำนวณการใช้พลังงาน
        const usageData = calculateKWH(measurements);
        console.info('[SUCCESS] Usage calculated:', {
            device: deviceId,
            day: usageData.day.toFixed(3),
            night: usageData.night.toFixed(3),
            total: (usageData.day + usageData.night).toFixed(3)
        });

        // บันทึกสรุปรายวันลง DynamoDB
        try {
            await saveDailySummary({
                primarykey: `summary-day-${deviceId}`,
                sortkey: startTimestamp,
                usage: usageData,
                deviceName: deviceId,
                ttl: startTimestamp + (365 * 24 * 60 * 60)
            });
            console.info('[SUCCESS] Daily summary saved to DynamoDB');
        } catch (error) {
            console.error('[ERROR] Failed to save summary:', error.message);
        }

        // สร้าง CSV และเขียนไปยัง S3
        try {
            const csv = parseDynamoDBItemsToCSV({ Items: readingsItems });
            const time = getYesterdayDate();
            const s3Path = `archived-readings/${deviceId}/${time.year}/${time.month}/${time.string}.csv`;

            await writeToS3(s3Path, csv);
            console.info(`[SUCCESS] CSV archived to S3: ${s3Path}`);
        } catch (error) {
            console.error('[ERROR] Failed to archive CSV:', error.message);
        }
    }

    console.info('\n--- Daily Cron Job Finished ---');
};