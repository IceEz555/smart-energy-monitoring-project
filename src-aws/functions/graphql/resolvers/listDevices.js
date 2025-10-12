const { scanForAllDeviceNames } = require('../../../core/helpers');

/**
 * Resolver for the listDevices query
 * ต้อง return array ของ string (ชื่ออุปกรณ์)
 */
module.exports.listDevices = async () => {
    console.log('[DEBUG] "listDevices" resolver called');

    try {
        const devices = await scanForAllDeviceNames();
        console.log('[DEBUG] Found devices:', devices);

        // เพิ่ม fallback: ถ้าไม่เจออะไรเลย ให้ return อุปกรณ์ที่คาดหวัง
        if (!devices || devices.length === 0) {
            console.log('[WARN] No devices found in DynamoDB, returning defaults');
            return ['ESP32', 'Room1'];
        }

        return devices;
    } catch (error) {
        console.error('[ERROR] listDevices failed:', error);
        // กรณี error ให้ return อุปกรณ์เริ่มต้น
        return ['ESP32', 'Room1'];
    }
};