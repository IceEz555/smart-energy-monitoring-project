// =================================================================
// การตั้งค่าและตัวแปร
// =================================================================
const BASE_URL = 'https://jcjmov2wp8.execute-api.ap-southeast-2.amazonaws.com/prod/graphql';
let usageChart, costChart;
let processedData = [];

// =================================================================
// DOM Elements
// =================================================================
const deviceSelector = document.getElementById('device-selector');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const generateBtn = document.getElementById('generate-report-btn');
const downloadBtn = document.getElementById('download-csv-btn');
const loadingIndicator = document.getElementById('loading-indicator');
const initialState = document.getElementById('initial-state');
const reportContent = document.getElementById('report-content');

/**
 * คำนวณค่าไฟฟ้าตามโครงสร้างอัตราก้าวหน้าและค่า Ft
 */
function calculateEstimatedCost(totalKwh) {
    const KWH_RATES = { tier1: 3.2484, tier2: 4.2218, tier3: 4.4217 };
    const FT_RATE = 0.3672;
    const VAT_RATE = 0.07;
    let energyCharge = 0;
    if (totalKwh <= 150) {
        energyCharge = totalKwh * KWH_RATES.tier1;
    } else if (totalKwh <= 400) {
        energyCharge = (150 * KWH_RATES.tier1) + ((totalKwh - 150) * KWH_RATES.tier2);
    } else {
        energyCharge = (150 * KWH_RATES.tier1) + (250 * KWH_RATES.tier2) + ((totalKwh - 400) * KWH_RATES.tier3);
    }
    const ftCharge = totalKwh * FT_RATE;
    const subTotal = energyCharge + ftCharge;
    const vat = subTotal * VAT_RATE;
    return subTotal + vat;
}

// =================================================================
// ฟังก์ชันหลัก
// =================================================================

async function initialize() {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    startDateInput.valueAsDate = sevenDaysAgo;
    endDateInput.valueAsDate = today;

    try {
        const devices = await fetchDeviceList();
        deviceSelector.innerHTML = '';
        if (devices && devices.length > 0) {
            devices.forEach(device => {
                const option = document.createElement('option');
                option.value = device;
                option.textContent = device;
                deviceSelector.appendChild(option);
            });
        } else {
            deviceSelector.innerHTML = '<option>No devices found</option>';
        }
    } catch (error) {
        deviceSelector.innerHTML = '<option>Error loading devices</option>';
        console.error('Failed to fetch device list:', error);
    }

    generateBtn.addEventListener('click', handleGenerateReport);
    downloadBtn.addEventListener('click', handleDownloadCSV);
}

async function handleGenerateReport() {
    const deviceId = deviceSelector.value;
    if (!deviceId || !startDateInput.value || !endDateInput.value) {
        showNotification('Please select a device and date range.');
        return;
    }

    loadingIndicator.style.display = 'block';
    generateBtn.disabled = true;
    reportContent.classList.add('hidden');
    initialState.classList.remove('hidden');
    downloadBtn.disabled = true;

    const startTimestamp = Math.floor(startDateInput.valueAsDate.getTime() / 1000);
    const endTimestamp = Math.floor(endDateInput.valueAsDate.getTime() / 1000) + (24 * 60 * 60 - 1);

    try {
        const rawData = await fetchUsageData(deviceId, startTimestamp, endTimestamp);

        if (rawData.length > 0) {
            processedData = rawData.map(item => {
                const totalKwh = item.dayUse + item.nightUse;
                return {
                    date: new Date(item.timestamp * 1000).toLocaleDateString('en-CA'),
                    dayUse: item.dayUse,
                    nightUse: item.nightUse,
                    totalKwh: totalKwh,
                    dailyCost: calculateEstimatedCost(totalKwh),
                    deviceName: deviceId
                };
            });

            updateSummaryCards(processedData);
            renderUsageChart(processedData);
            renderCostChart(processedData);
            renderTable(processedData);

            initialState.classList.add('hidden');
            reportContent.classList.remove('hidden');
            downloadBtn.disabled = false;
        } else {
            showNotification('No data found for the selected device and date range.');
        }
    } catch (error) {
        console.error('Failed to generate report:', error);
        showNotification('An error occurred while generating the report.');
    } finally {
        loadingIndicator.style.display = 'none';
        generateBtn.disabled = false;
    }
}

function fetchDeviceList() {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve(JSON.parse(xhr.response).data.listDevices || []) : reject(new Error(`Request failed: ${xhr.status}`));
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.open('POST', BASE_URL);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({ query: 'query { listDevices }' }));
    });
}

function fetchUsageData(deviceId, startTimestamp, endTimestamp) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve(JSON.parse(xhr.response).data.usageData || []) : reject(new Error(`Request failed with status ${xhr.status}`));
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.open('POST', BASE_URL);
        xhr.setRequestHeader('Content-Type', 'application/json');
        const query = 'query($d: String!, $s: Int!, $e: Int!) { usageData(deviceId: $d, startDate: $s, endDate: $e) { timestamp dayUse nightUse } }';
        xhr.send(JSON.stringify({ query: query, variables: { d: deviceId, s: startTimestamp, e: endTimestamp } }));
    });
}

function updateSummaryCards(data) {
    const totalKwh = data.reduce((sum, item) => sum + item.totalKwh, 0);
    const totalCost = data.reduce((sum, item) => sum + item.dailyCost, 0);
    const avgKwh = totalKwh / data.length;
    const peakUsage = Math.max(...data.map(item => item.totalKwh));

    document.getElementById('summary-total-kwh').innerText = `${totalKwh.toFixed(2)} kWh`;
    document.getElementById('summary-est-cost').innerText = `${totalCost.toFixed(2)} ฿`;
    document.getElementById('summary-avg-kwh').innerText = `${avgKwh.toFixed(2)} kWh`;
    document.getElementById('summary-peak-usage').innerText = `${peakUsage.toFixed(2)} kWh`;
}

/**
 * วาดกราฟแท่งแบบ Stacked (Daily Usage)
 */
function renderUsageChart(data) {
    const ctx = document.getElementById('report-chart').getContext('2d');
    if (usageChart) {
        usageChart.destroy();
    }
    usageChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(el => el.date),
            datasets: [{
                label: 'Day Usage (kWh)',
                backgroundColor: 'rgb(56, 189, 248)', //  สีใหม่: ฟ้า (Sky Blue)
                data: data.map(el => el.dayUse.toFixed(2))
            }, {
                label: 'Night Usage (kWh)',
                backgroundColor: 'rgb(49, 46, 129)',  // สีใหม่: กรมท่า (Dark Indigo)
                data: data.map(el => el.nightUse.toFixed(2))
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } },
            scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }
        }
    });
}

function renderCostChart(data) {
    const ctx = document.getElementById('cost-chart').getContext('2d');
    if (costChart) {
        costChart.destroy();
    }
    costChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(el => el.date),
            datasets: [{
                label: 'Cost (฿)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                borderColor: 'rgba(34, 197, 94, 1)',
                data: data.map(el => el.dailyCost.toFixed(2)),
                fill: true,
                tension: 0.3
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

/**
 * แสดงข้อมูลในตาราง
 */
function renderTable(data) {
    const tableBody = document.getElementById('report-table-body');
    tableBody.innerHTML = data.map(item => `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.date}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.dayUse.toFixed(2)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.nightUse.toFixed(2)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium text-gray-800">${item.totalKwh.toFixed(2)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.dailyCost.toFixed(2)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.deviceName}</td>
        </tr>
    `).join('');
}

/**
 * จัดการการดาวน์โหลดไฟล์ CSV
 */
function handleDownloadCSV() {
    if (processedData.length === 0) {
        return;
    }
    let csvContent = 'data:text/csv;charset=utf-8,Date,Day_kWh,Night_kWh,Total_kWh,Cost_THB,Device\r\n';
    processedData.forEach(item => {
        csvContent += `${item.date},${item.dayUse.toFixed(3)},${item.nightUse.toFixed(3)},${item.totalKwh.toFixed(3)},${item.dailyCost.toFixed(3)},${item.deviceName}\r\n`;
    });
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `energy_report_${deviceSelector.value}.csv`);
    link.click();
}

document.addEventListener('DOMContentLoaded', initialize);

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