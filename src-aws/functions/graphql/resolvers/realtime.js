const { getReadingsFromDynamoDBByDateRange } = require('../../../core/helpers');
const moment = require('moment-timezone');

module.exports.realtime = async ({ sinceTimestamp, deviceId }) => {

    // จำกัดเวลาไม่เกิน 24 ชั่วโมง
    const oneDayAgo = moment().subtract(1, 'days').unix();
    const start = Math.max(sinceTimestamp || oneDayAgo, oneDayAgo);
    const end = moment().unix();


    const data = await getReadingsFromDynamoDBByDateRange(deviceId, start, end);
    const flattenedData = [];

    for (const item of data) {
        const baseTimestamp = item.sortkey || item.timestamp;

        if (Array.isArray(item.readings)) {
            item.readings.forEach((reading, index) => {
                flattenedData.push({
                    timestamp: baseTimestamp + index,
                    reading: parseInt(reading) || 0
                });
            });
        } else if (item.reading !== undefined) {
            flattenedData.push({
                timestamp: baseTimestamp,
                reading: parseInt(item.reading) || 0
            });
        }
    }


    // ถ้ามีข้อมูลมากเกิน 10,000 จุด ให้ sample ลง
    const MAX_DATA_POINTS = 10000;
    let sampledData = flattenedData;

    if (flattenedData.length > MAX_DATA_POINTS) {
        const step = Math.ceil(flattenedData.length / MAX_DATA_POINTS);
        sampledData = flattenedData.filter((_, index) => index % step === 0);
    }

    if (sampledData.length > 0) {
        console.log('[DEBUG] First:', sampledData[0]);
        console.log('[DEBUG] Last:', sampledData[sampledData.length - 1]);
    }

    return sampledData;
};