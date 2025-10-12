const { getUsageDataFromDynamoDBByDateRange } = require('../../../core/helpers');
const { ValidationError } = require('../../../core/errors');

module.exports.usageData = async ({ deviceId, startDate, endDate }) => {
    // Validate inputs
    if (!deviceId || typeof deviceId !== 'string') {
        throw new ValidationError('deviceId must be a non-empty string');
    }

    if (!Number.isInteger(startDate) || !Number.isInteger(endDate)) {
        throw new ValidationError('Timestamps must be integers');
    }

    if (startDate > endDate) {
        throw new ValidationError('startDate must be before endDate');
    }

    // Limit to 1 year
    const oneYear = 365 * 24 * 60 * 60;
    if (endDate - startDate > oneYear) {
        throw new ValidationError('Date range cannot exceed 1 year');
    }

    try {
        const data = await getUsageDataFromDynamoDBByDateRange(
            deviceId,
            startDate,
            endDate
        );

        if (data.length === 0) {
            console.info(`No usage data found for ${deviceId} in specified range`);
        }

        return data.map(el => ({
            timestamp: el.sortkey,
            dayUse: el.usage?.day || 0,
            nightUse: el.usage?.night || 0
        }));
    } catch (error) {
        console.error('[ERROR] usageData resolver failed:', {
            deviceId,
            startDate,
            endDate,
            error: error.message
        });
        throw error;
    }
};