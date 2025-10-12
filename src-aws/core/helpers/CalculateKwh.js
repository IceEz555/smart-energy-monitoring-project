/**
 * คำนวณการใช้พลังงานเป็น kWh แบ่งตาม day/night tariff
 *
 * @param {Array<[Date, number]>} dataset - Array of [timestamp, watts]
 * @param {Date} dataset[].0 - Timestamp of measurement
 * @param {number} dataset[].1 - Power consumption in watts
 *
 * @returns {{day: number, night: number}} Energy consumed in kWh
 * @returns {number} returns.day - kWh during day tariff (06:00-21:00, Mon-Fri)
 * @returns {number} returns.night - kWh during night tariff (21:00-06:00, Sat-Sun)
 *
 * @example
 * const data = [
 *   [new Date('2025-01-01 14:00'), 1000],
 *   [new Date('2025-01-01 15:00'), 500]
 * ];
 * const usage = calculateKWH(data);
 * console.log(usage); // { day: 0.75, night: 0 }
 *
 * @throws {Error} If dataset contains invalid wattage values
 */
module.exports.calculateKWH = function (dataset) {
    const { isNightTarif } = require('./IsNightTarif');

    const output = {
        day: 0,
        night: 0
    };

    for(let i = 0; i < dataset.length-1; i++){
        const current = dataset[i];
        const next = dataset[i+1];

        // 1. ตรวจสอบว่าค่า wattage เป็นตัวเลขที่ถูกต้องหรือไม่
        const currentWatts = Number(current[1]);
        if (isNaN(currentWatts)) {
            console.warn('[WARN] Invalid wattage detected. Skipping entry. Value:', current[1]);
            continue; // ข้ามข้อมูลชุดนี้ไปถ้าค่า wattage ไม่ใช่ตัวเลข
        }
        // --- END: โค้ดที่แก้ไข ---

        // Seconds between the two measurements
        const seconds =
			(next[0].getTime() - current[0].getTime()) / 1000;

        // Kilowatts used between those points
        const kWh = (current[1] * seconds * (1/(60*60))) / 1000;

        if(isNightTarif(current[0])){
            output.night += kWh;
        }else{
            output.day += kWh;
        }
    }

    return output;
};