// =================================================================
// ส่วนที่ 1: การตั้งค่าและตัวแปรส่วนกลาง (Global Variables)
// =================================================================
const BASE_URL =
  'https://jcjmov2wp8.execute-api.ap-southeast-2.amazonaws.com/prod/graphql';
let data = [];
let chart;
let usageChart;
let standbyChart;
let animateDuration = 1500;
let currentDeviceId = '';

// --- START: โค้ดใหม่สำหรับจัดการ Style ปุ่ม ---
function setActiveButton(activeButtonId) {
    const btnToday = document.getElementById('btnToday');
    const btnYesterday = document.getElementById('btnYesterday');

    // Style ของปุ่มที่ "เลือก" (Active)
    const activeClasses = 'px-4 py-1.5 text-sm font-semibold text-white bg-indigo-600 rounded-md shadow-sm focus:outline-none transition-all';
    const inactiveClasses = 'px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-white hover:shadow-sm rounded-md focus:outline-none transition-all';

    if (activeButtonId === 'btnToday') {
        if (btnToday) btnToday.className = activeClasses;
        if (btnYesterday) btnYesterday.className = inactiveClasses;
    } else {
        if (btnYesterday) btnYesterday.className = activeClasses;
        if (btnToday) btnToday.className = inactiveClasses;
    }
}
// --- END: โค้ดใหม่สำหรับจัดการ Style ปุ่ม ---

// ปิด console.log ในโหมด production
const IS_DEBUG = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
if (!IS_DEBUG) {
    console.log = function () {};
    console.debug = function () {};
} // *** เพิ่ม: track device ปัจจุบัน ***

// =================================================================
// ส่วนที่ 2: ฟังก์ชันสำหรับดึงข้อมูลจาก API (Data Fetching)
// =================================================================

function makeGqlRequest(query, variables = {}) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                const json = JSON.parse(xhr.response);
                if (json.errors) {
                    const errorMessages = json.errors.map(e => e.message).join('\n');
                    console.error('GraphQL Error:', errorMessages);
                    reject(new Error(errorMessages));
                } else {
                    resolve(json.data);
                }
            } else {
                reject(new Error(`HTTP Error: ${xhr.status}`));
            }
        };
        xhr.onerror = () => reject(new Error('Network Error'));
        xhr.open('POST', BASE_URL);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({ query, variables }));
    });
}

async function fetchDeviceList() {
    const data = await makeGqlRequest('query { listDevices }');
    return data.listDevices || [];
}

async function fetchChartDataForDailyUsage(deviceId) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 31);
    const start = parseInt(startDate.getTime() / 1000);
    const end = parseInt(Date.now() / 1000);

    const query = `query($deviceId: String!, $start: Int!, $end: Int!) {
        usageData(deviceId: $deviceId, startDate: $start, endDate: $end) {
            timestamp dayUse nightUse
        }
    }`;
    const data = await makeGqlRequest(query, { deviceId, start, end });
    return {
        labels: data.usageData.map((el) => formatTimestampForChartAxis(el.timestamp)),
        datasets: [
            {
                label: 'Day',
                backgroundColor: 'rgb(56, 189, 248)',
                data: data.usageData.map((el) => el.dayUse),
                barThickness: 20,  // กำหนดความกว้างคงที่
                maxBarThickness: 30  // ความกว้างสูงสุด
            },
            {
                label: 'Night',
                backgroundColor: 'rgb(49, 46, 129)',
                data: data.usageData.map((el) => el.nightUse),
                barThickness: 20,
                maxBarThickness: 30
            }
        ]
    };
}

async function fetchData(deviceId, since) {
    // *** FIX: เช็คว่าเปลี่ยน device หรือไม่ ***
    if (deviceId !== currentDeviceId) {
        data = [];
        currentDeviceId = deviceId;
        // Clear chart ด้วย
        if (chart) {
            chart = null;
        }
    }

    if (!since) {
        const safeTimeAgo = new Date();
        safeTimeAgo.setDate(safeTimeAgo.getDate() - 1); // เปลี่ยนเป็น 1 วัน
        since = safeTimeAgo.getTime() / 1000;
    }
    since = parseInt(since);

    const query = `query($deviceId: String!, $since: Int!) { 
        realtime(deviceId: $deviceId, sinceTimestamp: $since) { timestamp, reading }
        stats(deviceId: $deviceId) { always_on, today_so_far }
    }`;

    try {
        const result = await makeGqlRequest(query, { deviceId, since });
        processData({ data: result });
    } catch (error) {
        console.error('[ERROR] Failed to fetch data:', error);
        updateUINoData();
    }
}

async function fetchHistoricalData(deviceId, startTimestamp, endTimestamp) {
    console.log(`Fetching historical data for ${deviceId}`);
    const query = `query($deviceId: String!, $start: Int!, $end: Int!) {
        readings(deviceId: $deviceId, startDate: $start, endDate: $end) {
            timestamp, reading
        }
    }`;
    const result = await makeGqlRequest(query, { deviceId, start: startTimestamp, end: endTimestamp });
    return result.readings.map((entry) => [new Date(entry.timestamp * 1000), parseFloat(entry.reading)]);
}

// dashboard/main.js

async function getEnergyInsights() {
    showModal();

    const todayKwh = document.getElementById('stats-kwh').innerText;
    const peakUsage = document.getElementById('stats-max').innerText;
    const standbyPower = document.getElementById('stats-standby').innerText;

    // 1. สร้าง Prompt เหมือนเดิม
    const prompt = `

        ฉันเป็นผู้ใช้งานระบบ Home Energy Monitor และนี่คือข้อมูลการใช้พลังงานของฉันล่าสุด:
        - การใช้งานรวมวันนี้: ${todayKwh}
        - การใช้งานสูงสุด (Peak): ${peakUsage}
        - พลังงานที่ใช้ตอนสแตนด์บาย (Standby Power): ${standbyPower}

        จากข้อมูลนี้ช่วยวิเคราะห์พฤติกรรมการใช้พลังงานของฉันออกมาในรูปของสถิติและให้คำแนะนำที่เป็นรูปธรรม 2-3 ข้อเพื่อช่วยให้ฉันประหยัดค่าไฟ
        กรุณาตอบในรูปแบบ Markdown ที่อ่านง่ายและรวดเร็วไม่เกิน 25 วินาที
    `;

    // 2. กำหนด URL ของ Backend Proxy ของเรา (ที่สร้างใน serverless.yml)
    //    คุณต้องเปลี่ยน URL นี้เป็น URL ที่ได้หลังจาก deploy service ของคุณ
    const ourApiUrl = 'https://jcjmov2wp8.execute-api.ap-southeast-2.amazonaws.com/prod/get-insights';

    try {
    // 3. เรียกไปที่ Backend ของเราแทน Google API
        const response = await fetch(ourApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({ prompt: prompt }) // ส่ง prompt ไปใน body
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const result = await response.json();

        // 4. ส่วนที่เหลือทำงานเหมือนเดิม: นำผลลัพธ์มาแสดงผล
        let text = 'ขออภัย, ไม่สามารถรับข้อมูลจาก AI ได้ในขณะนี้';
        if (
            result.candidates &&
      result.candidates.length > 0 &&
      result.candidates[0].content &&
      result.candidates[0].content.parts &&
      result.candidates[0].content.parts.length > 0
        ) {
            text = result.candidates[0].content.parts[0].text;
        }

        const converter = new showdown.Converter();
        const html = converter.makeHtml(text);
        document.getElementById('modal-content-area').innerHTML = html;

    } catch (error) {
        console.error('Error fetching AI insights:', error);
        document.getElementById('modal-content-area').innerText =
      'เกิดข้อผิดพลาดในการขอคำแนะนำจาก AI กรุณาลองใหม่อีกครั้ง';
    }
}

// =================================================================
// ส่วนที่ 3: ฟังก์ชันสำหรับประมวลผลและแสดงผลข้อมูล
// =================================================================

function processData(rawData) {
    // ตรวจสอบความถูกต้องของข้อมูล
    if (!rawData || !rawData.data) {
        console.log('No data received from API');
        updateUINoData();
        return;
    }

    if (!rawData.data.realtime || !Array.isArray(rawData.data.realtime) || rawData.data.realtime.length === 0) {
        console.log('No realtime data available');
        updateUINoData();
        return;
    }

    // เพิ่มข้อมูลใหม่
    for (const entry of rawData.data.realtime) {
        if (!entry || entry.timestamp === undefined || entry.reading === undefined) {
            console.log('Skipping invalid entry:', entry);
            continue;
        }

        const date = entry.timestamp * 1000;
        if (data.length > 1 && date < data[data.length - 1][0].getTime()) {
            continue;
        }
        const watts = parseFloat(entry.reading);
        data.push([new Date(date), watts]);
    }

    if (data.length === 0) {
        console.log('No data to process after filtering.');
        updateUINoData();
        return;
    }

    if (chart) {
        chart.updateOptions({ file: data });
    }

    // อัปเดต UI ด้วยข้อมูลจริง
    const $current = document.getElementById('stats-current');
    const $todayKwh = document.getElementById('stats-kwh');
    const $standbyPower = document.getElementById('stats-standby');
    const $max = document.getElementById('stats-max');
    const $lastreading = document.getElementById('last-reading');

    // ใช้ข้อมูลล่าสุดจาก API
    const latestEntry = rawData.data.realtime[rawData.data.realtime.length - 1];
    const latestDate = new Date(latestEntry.timestamp * 1000);
    const currentWatts = parseFloat(latestEntry.reading);

    // คำนวณว่าข้อมูลล่าสุดเก่าแค่ไหน
    const timeDiffMinutes = (Date.now() - latestDate.getTime()) / 1000 / 60; // นาที

    // ฟังก์ชันแปลงนาทีเป็นข้อความที่อ่านง่าย
    function formatTimeAgo(minutes) {
        if (minutes < 60) {
            return `${Math.floor(minutes)} minutes ago`;
        } else if (minutes < 1440) { // น้อยกว่า 24 ชั่วโมง
            const hours = Math.floor(minutes / 60);
            const mins = Math.floor(minutes % 60);
            return mins > 0 ? `${hours} Hours ${mins} miniutes ago` : `${hours} hours ago`;
        } else {
            const days = Math.floor(minutes / 1440);
            const hours = Math.floor((minutes % 1440) / 60);
            return hours > 0 ? `${days} Day ${hours} hours ago` : `${days} day ago`;
        }
    }

    // ถ้าข้อมูลเก่ากว่า 5 นาที แสดงว่าอุปกรณ์ออฟไลน์
    if (timeDiffMinutes > 5) {
        $current.innerHTML = `<span class="text-gray-400">${currentWatts} W</span><br><small class="text-xs text-red-500">Offline (${formatTimeAgo(timeDiffMinutes)})</small>`;
    } else {
        $current.innerHTML = currentWatts + ' W';
    }

    $lastreading.innerHTML = latestDate.toLocaleString();

    const totalKwh = calculateKWH(data);

    if (rawData.data.stats && rawData.data.stats.today_so_far !== undefined) {
        $todayKwh.innerHTML = Math.round(rawData.data.stats.today_so_far * 100) / 100 + ' kWh';
    } else {
        $todayKwh.innerHTML = Math.round(totalKwh * 100) / 100 + ' kWh';
    }

    const readings = data.map((el) => el[1]);

    let standbyWatts = 0;
    if (rawData.data.stats && rawData.data.stats.always_on !== undefined) {
        standbyWatts = rawData.data.stats.always_on;
    } else {
        standbyWatts = jStat.mode(readings);
    }

    $standbyPower.innerHTML = parseInt(standbyWatts) + ' W';
    $max.innerHTML = jStat.max(readings) + ' W';

    const hours = (data[data.length - 1][0].getTime() - data[0][0].getTime()) / 1000 / 3600;
    const standbyKwh = (standbyWatts / 1000) * hours;
    initStandbyChart({
        activePower: totalKwh - standbyKwh,
        standbyPower: standbyKwh
    });
}

// ฟังก์ชันสำหรับอัปเดต UI เมื่อไม่มีข้อมูล
function updateUINoData() {
    document.getElementById('stats-current').innerHTML = '<span class="text-red-500">-- W</span><br><small class="text-xs">No data</small>';
    document.getElementById('stats-kwh').innerHTML = '0 kWh';
    document.getElementById('stats-standby').innerHTML = '0 W';
    document.getElementById('stats-max').innerHTML = '0 W';
    document.getElementById('last-reading').innerHTML = 'No recent data';

    // ถ้ามี chart อยู่แล้ว ให้ clear
    if (chart) {
        chart.updateOptions({ file: [[new Date(), 0]] });
    }
}

function initStandbyChart({ activePower, standbyPower }) {
    const barChartData = {
        labels: ['Active', 'Standby'],
        datasets: [{ data: [activePower, standbyPower], backgroundColor: ['#4f46e5', '#d1d5db'], borderWidth: 0 }]
    };
    const ctx = document.getElementById('chart-standby').getContext('2d');

    if (standbyChart) {
        standbyChart.destroy();
    }

    standbyChart = new Chart(ctx, {
        type: 'doughnut',
        data: barChartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
            animation: { duration: animateDuration }
        }
    });
    animateDuration = 0;
}

async function initUsageChart() {
    const deviceId = document.getElementById('device-selector').value;
    if (!deviceId || deviceId.includes('...')) {
        return;
    }

    const chartdata = await fetchChartDataForDailyUsage(deviceId);
    const ctx = document.getElementById('canvas').getContext('2d');

    if (usageChart) {
        usageChart.destroy();
    }

    usageChart = new Chart(ctx, {
        type: 'bar',
        data: chartdata,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { stacked: true, grid: { display: false } },
                y: { stacked: true, grid: { display: false } }
            }
        }
    });
}

// =================================================================
// ส่วนที่ 4: ฟังก์ชันหลักและตัวควบคุม
// =================================================================

async function initChart() {
    const deviceId = document.getElementById('device-selector').value;
    if (!deviceId || deviceId.includes('...')) {
        return;
    }
    await fetchData(deviceId);
    if (data.length === 0) {
        console.error('[ERROR] No data to display in chart');
        return;
    }

    if (!chart) {
        try {
            chart = new Dygraph(document.getElementById('graphdiv'), data, {
                colors: ['#8B5CF6'],
                legend: 'follow',  // เปลี่ยนจาก "always" เป็น "follow" เพื่อไม่ให้ซ้อน
                labels: ['Timestamp', 'Watts'],
                underlayCallback: highlightNightHours,
                drawCallback: updateMetricsForSelectedRange,
                showRoller: true,
                rollPeriod: 14,
                drawPoints: false,  // ปิด points เพื่อให้กราฟเรียบขึ้น
                strokeWidth: 2,     // เพิ่มความหนาของเส้น
                highlightCircleSize: 3,  // ขนาดจุดเมื่อ hover
                axes: {
                    x: {
                        axisLabelFormatter: function (d) {
                            const hours = d.getHours().toString().padStart(2, '0');
                            const minutes = d.getMinutes().toString().padStart(2, '0');
                            return `${hours}:${minutes}`;
                        }
                    },
                    y: {
                        axisLabelFormatter: function (y) {
                            return y.toFixed(0) + ' W';
                        }
                    }
                }
            });
        } catch (error) {
            console.error('[ERROR] Failed to create Dygraph:', error);
        }
    } else {
        chart.updateOptions({ file: data, dateWindow: null });
    }
}

// =================================================================
// ส่วนที่ 5: การเริ่มต้นทำงานและผูก Events
// =================================================================

async function updateAllData() {
    toggleLoadingIndicator(true);
    try {
        await Promise.all([
            initChart(),
            initUsageChart()
        ]);
    } catch (error) {
        console.error('Failed to update data:', error);
        showNotification('An error occurred while loading data. Please check the console.');
    } finally {
        toggleLoadingIndicator(false);
    }
}

document.addEventListener('DOMContentLoaded', async () => {

    // 1. ดึงรายชื่ออุปกรณ์มาสร้าง Dropdown
    try {
        const devices = await fetchDeviceList();
        const selector = document.getElementById('device-selector');
        selector.innerHTML = '';
        if (devices && devices.length > 0) {
            devices.forEach(device => {
                const option = document.createElement('option');
                option.value = device;
                option.textContent = device;
                selector.appendChild(option);
            });
            // *** FIX: set currentDeviceId เมื่อเริ่มต้น ***
            currentDeviceId = devices[0];
        } else {
            selector.innerHTML = '<option>No devices found</option>';
        }
    } catch(error) {
        document.getElementById('device-selector').innerHTML = '<option>Error loading</option>';
        console.error('Failed to init devices:', error);
    }

    // 2. ดึงข้อมูลครั้งแรก
    await updateAllData();

    // 3. ผูก Event ให้ Dropdown
    document.getElementById('device-selector').addEventListener('change', () => {
        console.log('Device changed. Clearing old data and chart.');

        // 1. แสดง Spinner ทันทีเพื่อให้ User ทราบว่ากำลังโหลด
        toggleLoadingIndicator(true);
        // รีเซ็ตปุ่มกลับไปที่ Today ทุกครั้งที่เปลี่ยนอุปกรณ์
        setActiveButton('btnToday');
        // 2. (สำคัญ) ทำลายกราฟเก่า (ถ้ามี) เพื่อล้างหน้าจอทันที
        if (chart) {
            chart.destroy();
            chart = null;
        }

        // 3. ล้างข้อมูลเก่าในตัวแปร
        data = [];

        // 4. เรียกฟังก์ชันเพื่อโหลดข้อมูลและสร้างกราฟใหม่ทั้งหมด
        // updateAllData() จะซ่อน Spinner เองเมื่อทำงานเสร็จ
        updateAllData();
    });

    // 4. ผูก Event ให้ปุ่ม Yesterday
    document.getElementById('btnYesterday').addEventListener('click', async () => {
        setActiveButton('btnYesterday');
        toggleLoadingIndicator(true);
        const deviceId = document.getElementById('device-selector').value;
        const start = new Date();
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        const startTimestamp = Math.floor(start.getTime() / 1000);
        const endTimestamp = Math.floor(end.getTime() / 1000);
        const historicalData = await fetchHistoricalData(deviceId, startTimestamp, endTimestamp);

        if (chart && historicalData.length > 0) {
            chart.updateOptions({ file: historicalData, dateWindow: null });
        } else {
            showNotification('ไม่พบข้อมูลการใช้งานของเมื่อวาน');
        }
        toggleLoadingIndicator(false);
    });

    // 5. ผูก Event ให้ปุ่ม Today
    document.getElementById('btnToday').addEventListener('click', () => {
        setActiveButton('btnToday'); // <--- เรียกใช้ฟังก์ชันใหม่


        data = [];
        updateAllData();
    });

    // 6. ผูก Event ของ AI Insights และ Modal
    document.getElementById('get-insights-btn').addEventListener('click', getEnergyInsights);
    document.getElementById('close-modal-btn').addEventListener('click', hideModal);

    document.getElementById('ai-modal').addEventListener('click', (e) => {
        if (e.target.id === 'ai-modal') {
            hideModal();
        }
    });

    // 7. ตั้งเวลาอัปเดต Real-time
    setInterval(async () => {
        const deviceId = document.getElementById('device-selector').value;
        if (data.length > 0) {
            await fetchData(deviceId, data[data.length - 1][0].getTime() / 1000);
        }
    }, 30 * 1000);
});

// =================================================================
// ส่วนที่ 6: ฟังก์ชันเสริม (Helper Functions)
// =================================================================

function showModal() {
    const modal = document.getElementById('ai-modal');
    const modalBackdrop = modal;
    const modalContent = modal.querySelector('.modal-content');

    modal.querySelector('#modal-content-area').innerHTML = `
        <div class="flex items-center justify-center h-32">
            <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div>
        </div>`;

    modal.classList.remove('hidden');
    setTimeout(() => {
        modalBackdrop.classList.remove('opacity-0');
        modalContent.classList.remove('scale-95');
    }, 10);
}

function hideModal() {
    const modal = document.getElementById('ai-modal');
    const modalBackdrop = modal;
    const modalContent = modal.querySelector('.modal-content');

    modalBackdrop.classList.add('opacity-0');
    modalContent.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

// --- START: Notification Modal Control ---
const notificationModal = document.getElementById('notification-modal');
const notificationMessage = document.getElementById('notification-message');
const notificationCloseBtn = document.getElementById('notification-close-btn');

function showNotification(message) {
    notificationMessage.textContent = message;
    notificationModal.classList.remove('hidden');
}

function hideNotification() {
    notificationModal.classList.add('hidden');
}

notificationCloseBtn.addEventListener('click', hideNotification);
notificationModal.addEventListener('click', (e) => {
    if (e.target.id === 'notification-modal') {
        hideNotification();
    }
});
// --- END: Notification Modal Control ---

function toggleLoadingIndicator(show) {
    const spinner = document.getElementById('spinner');
    if (spinner) {
        if (show) {
            spinner.classList.remove('hidden');
        } else {
            spinner.classList.add('hidden');
        }
    }
}

function formatTimestampForChartAxis(rawTimestamp) {
    const date = new Date(rawTimestamp * 1000);
    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return date.getDate() + ' ' + months[date.getMonth()];
}

function calculateKWH(dataset) {
    let total = 0;
    for (let i = 0; i < dataset.length - 1; i++) {
        const current = dataset[i];
        const next = dataset[i + 1];
        const seconds = (next[0].getTime() - current[0].getTime()) / 1000;
        total += (current[1] * seconds * (1 / 3600)) / 1000;
    }
    return total;
}

function updateMetricsForSelectedRange(chart) {
    let startDate = 0;
    let endDate = Number.MAX_SAFE_INTEGER;
    if (chart.dateWindow_) {
        startDate = chart.dateWindow_[0];
        endDate = chart.dateWindow_[1];
    }
    const dataInScope = data.filter((el) => el[0] > startDate && el[0] < endDate);
    const metrics = { usage: calculateKWH(dataInScope) };
    const $kwh = document.getElementById('usage-kwh');
    $kwh.innerHTML = parseFloat(metrics.usage).toFixed(2) + ' kWh';
}

function highlightNightHours(canvas, area, chart) {
    let foundStart = false;
    let foundEnd = false;
    let startHighlight = null;
    let endHighlight = null;
    canvas.fillStyle = 'rgba(229, 231, 235, 0.5)';
    for (let i = 0; i < chart.file_.length; i++) {
        const entry = chart.file_[i];
        const date = entry[0];
        endHighlight = chart.toDomXCoord(date);
        if (foundStart === false && isNightTarif(date)) {
            foundStart = true;
            startHighlight = chart.toDomXCoord(date);
        }
        if (foundStart === true && isNightTarif(date) === false) {
            foundEnd = true;
        }
        if (foundStart === true && foundEnd === true) {
            const width = endHighlight - startHighlight;
            canvas.fillRect(startHighlight, area.y, width, area.h);
            foundStart = false;
            foundEnd = false;
        }
        i += 30;
    }
    if (foundStart && foundEnd === false) {
        const lastPosition = chart.toDomXCoord(
            chart.file_[chart.file_.length - 1][0]
        );
        const width = lastPosition - startHighlight;
        canvas.fillRect(startHighlight, area.y, width, area.h);
    }
}

function isNightTarif(dateObj) {
    if (
        (dateObj.getHours() >= 21 && dateObj.getHours() <= 23) ||
    (dateObj.getHours() >= 0 && dateObj.getHours() <= 5)
    ) {
        return true;
    }
    if (dateObj.getDay() === 0 || dateObj.getDay() === 6) {
        return true;
    }
    return false;
}