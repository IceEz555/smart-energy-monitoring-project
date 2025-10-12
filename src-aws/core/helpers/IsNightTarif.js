/**
 * ตรวจสอบว่าเวลาที่กำหนดอยู่ในช่วง night tariff หรือไม่
 * Night tariff: 21:00-06:00 ทุกวัน และวันเสาร์-อาทิตย์ทั้งวัน
 *
 * @param {Date|number} dateObj - Date object หรือ Unix timestamp (seconds)
 *
 * @returns {boolean} true ถ้าอยู่ในช่วง night tariff, false ถ้าไม่ใช่
 *
 * @example
 * // ตรวจสอบด้วย Date object
 * const isNight = isNightTarif(new Date('2025-01-01 23:00'));
 * console.log(isNight); // true
 *
 * @example
 * // ตรวจสอบด้วย Unix timestamp
 * const isNight = isNightTarif(1735750800); // Wednesday 14:00
 * console.log(isNight); // false
 */
module.exports.isNightTarif = function (dateObj) {
    if (typeof dateObj === 'number') {
        dateObj = new Date(dateObj * 1000);
    }

    if((dateObj.getHours() >= 21 && dateObj.getHours() <= 23) ||
		(dateObj.getHours() >= 0 && dateObj.getHours() <= 5)){
        return true;
    }

    if(dateObj.getDay() === 0 || dateObj.getDay() === 6){
        return true;
    }

    return false;
};