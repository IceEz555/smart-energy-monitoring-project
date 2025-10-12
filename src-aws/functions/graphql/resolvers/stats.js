const graphqlFields = require('graphql-fields');
const { getReadingsFromDynamoDBSince, getTodaysDate } = require('../../../core/helpers'); 
const { calculateKWH } = require('../../../core/helpers/CalculateKwh');
const jStat = require('jStat').jStat;

module.exports.stats = async ({ deviceId }, context, info) => { 
    const todayStartTimestamp = getTodaysDate().unixTimestamp;
    console.log(`[DEBUG] todayStartTimestamp: ${todayStartTimestamp} (${new Date(todayStartTimestamp * 1000)})`);
    const requestedFields = graphqlFields(info);
    const output = {};
    const allReadings = await getReadingsFromDynamoDBSince(deviceId, todayStartTimestamp);
    console.log(`[DEBUG] stats got ${allReadings.length} records`);

    // *** FIX: แตก array readings ออกมา ***
    const flattenedReadings = [];
    
    for (const item of allReadings) {
        const baseTimestamp = item.sortkey || item.timestamp;
        
        if (Array.isArray(item.readings)) {
            // แต่ละค่าใน array คือการอ่านค่าห่างกัน 1 วินาที
            item.readings.forEach((reading, index) => {
                flattenedReadings.push({
                    timestamp: baseTimestamp + index,
                    reading: parseInt(reading) || 0
                });
            });
        } else if (item.reading !== undefined) {
            flattenedReadings.push({
                timestamp: baseTimestamp,
                reading: parseInt(item.reading) || 0
            });
        }
    }
    

    if (requestedFields.always_on) {
        if (flattenedReadings && flattenedReadings.length > 0) {
            const readingsOnly = flattenedReadings.map(el => el.reading);
            const standbyWatts = jStat.mode(readingsOnly);
            
            // ป้องกัน NaN
            output.always_on = (isNaN(standbyWatts) || !isFinite(standbyWatts)) ? 0 : standbyWatts;
        } else {
            output.always_on = 0;
        }
    }

    if (requestedFields.today_so_far) {
        if (flattenedReadings && flattenedReadings.length > 0) {
            const input = flattenedReadings.map(item => [
                new Date(item.timestamp * 1000), 
                item.reading
            ]);
            
            const usage = calculateKWH(input);
            output.today_so_far = usage.day + usage.night;
            
            // ป้องกัน NaN
            if (isNaN(output.today_so_far) || !isFinite(output.today_so_far)) {
                output.today_so_far = 0;
            }
            
        } else {
            output.today_so_far = 0;
        }
    }

    return output;
};