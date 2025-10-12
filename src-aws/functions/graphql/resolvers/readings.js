const { getReadingsFromDynamoDBByDateRange } = require('../../../core/helpers');

module.exports.readings = async ({ startDate, endDate, deviceId }) => {
    const data = await getReadingsFromDynamoDBByDateRange(deviceId, startDate, endDate);
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

    // Sample ถ้ามีมากเกิน 5000 จุด
    const MAX_DATA_POINTS = 5000;
    let sampledData = flattenedData;

    if (flattenedData.length > MAX_DATA_POINTS) {
        const step = Math.ceil(flattenedData.length / MAX_DATA_POINTS);
        sampledData = flattenedData.filter((_, index) => index % step === 0);
    }

    return sampledData;
};