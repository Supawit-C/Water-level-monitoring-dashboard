const apiUrlRain = 'https://api.open-meteo.com/v1/forecast?latitude=18.925&longitude=98.925&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m&timezone=Asia%2FBangkok';
fetch(apiUrlRain)
    .then(response => response.json())
    .then(data => {
        const rain = data.current && typeof data.current.rain !== 'undefined' ? data.current.rain : '-';
        const updated = data.current && data.current.time ? new Date(data.current.time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-';
        document.getElementById('rain-value').innerHTML = `${rain} <small class="fs-6">mm</small>`;
        document.getElementById('rain-update').innerHTML = `อัปเดตล่าสุด: ${updated} น.`;
    })
    .catch(error => {
        document.getElementById('rain-value').innerHTML = '- <small class="fs-6">mm</small>';
        document.getElementById('rain-update').innerHTML = 'อัปเดตล่าสุด: ไม่สามารถดึงข้อมูลได้';
        console.error('Error fetching rainfall:', error);
    });

function getWeatherText(code) {
    if ([0].includes(code)) return 'โปร่งใส';
    if ([1, 2].includes(code)) return 'มีเมฆบางส่วน';
    if ([3].includes(code)) return 'เมฆมาก';
    if ([45, 48].includes(code)) return 'หมอก';
    if ([51, 53, 55, 56, 57].includes(code)) return 'ฝนปรอย';
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'มีโอกาสเกิดฝน';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'หิมะ';
    if ([95, 96, 99].includes(code)) return 'ฝนตกหนัก';
    return 'ไม่ทราบสภาพอากาศ';
}
function getWeatherIcon(code) {
    if ([0].includes(code)) return 'fa-sun text-warning';
    if ([1, 2].includes(code)) return 'fa-cloud-sun text-info';
    if ([3].includes(code)) return 'fa-cloud text-light-gray';
    if ([45, 48].includes(code)) return 'fa-smog text-secondary';
    if ([51, 53, 55, 56, 57].includes(code)) return 'fa-cloud-rain text-info';
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'fa-cloud-showers-heavy text-primary';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'fa-snowflake text-primary';
    if ([95, 96, 99].includes(code)) return 'fa-bolt text-warning';
    return 'fa-question-circle text-muted';
}

const apiUrlForecast = 'https://api.open-meteo.com/v1/forecast?latitude=18.925&longitude=98.925&daily=weather_code&forecast_days=5&timezone=Asia%2FBangkok';
fetch(apiUrlForecast)
    .then(response => response.json())
    .then(data => {
        const daily = data.daily;
        const dates = daily.time;
        const weatherCodes = daily.weather_code;
        let html = '';
        for (let i = 0; i < dates.length; i++) {
            const date = new Date(dates[i]);
            const day = date.toLocaleDateString('th-TH', { weekday: 'short', day: '2-digit', month: 'short' });
            const weatherText = getWeatherText(weatherCodes[i]);
            const iconClass = getWeatherIcon(weatherCodes[i]);
            html += `<div style=\"min-width:70px\">
                <div class=\"small text-muted mb-2\">${day}</div>
                <i class=\"fas ${iconClass} mb-1 fs-4\"></i>
                <div class=\"small mb-1\">${weatherText}</div>
            </div>`;
        }
        document.getElementById('forecast-days').innerHTML = html;
    })
    .catch(error => {
        document.getElementById('forecast-days').innerHTML = '<div class="text-danger">ไม่สามารถดึงข้อมูลพยากรณ์ได้</div>';
        console.error('Error fetching forecast:', error);
    });

const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRCWZtREOAx7TXhyqXdU73DpixjqE_r29_JEPkOP2K-ABy9qPwkv2pVxnQOGaOI3I9KGjClNtWQcUtd/pub?output=csv';

// เก็บ Instance ของกราฟไว้ข้างนอกเพื่อใช้ทำลาย (Destroy) ก่อนสร้างใหม่
let waterChartInstance = null;

function updateWaterCircleColor(level) {
    const waterCircle = document.querySelector('.water-circle');
    if (!waterCircle) return;
    if (level > 2.0) {
        waterCircle.style.background = 'radial-gradient(circle, #EE0E0E 27%, #F54040 100%)';
    } else if (level > 1.5) {
        waterCircle.style.background = 'radial-gradient(circle, #EDDE0F 27%, #F1D81E 100%)';
    } else {
        waterCircle.style.background = 'radial-gradient(circle, #4ade80 0%, #22c55e 100%)';
    }
}

async function updateDashboard() {
    try {
        const response = await fetch(csvUrl);
        const csvText = await response.text();
        // แปลง CSV เป็น Array 2 มิติ และกรองแถวว่าง
        const rows = csvText.split('\n')
            .map(r => r.split(',').map(cell => cell.trim()))
            .filter(r => r.length > 5);
        const header = rows[0];
        const lastRow = rows[rows.length - 1];
        const dateStr = lastRow[0];
        const avgVal = parseFloat(lastRow[26]) || 0;
        const maxVal = parseFloat(lastRow[27]) || 0;
        let chartLabels = [];
        let chartData = [];
        let latestWaterLevel = 0;
        let lastUpdateTime = "--:--";
        for (let i = 2; i <= 25; i++) {
            const timeLabel = header[i] || `${i - 2}:00`;
            const value = parseFloat(lastRow[i]);
            if (!isNaN(value)) {
                chartLabels.push(timeLabel);
                chartData.push(value);
                latestWaterLevel = value;
                lastUpdateTime = timeLabel;
            }
        }
        document.getElementById('current-water-level').innerText = latestWaterLevel.toFixed(2);
        document.getElementById('last-update').innerText = `วันที่ ${dateStr} | เวลาล่าสุด ${lastUpdateTime}`;
        if (document.getElementById('avg-level')) document.getElementById('avg-level').innerText = avgVal.toFixed(2);
        if (document.getElementById('max-level')) document.getElementById('max-level').innerText = maxVal.toFixed(2);
        updateWaterCircleColor(latestWaterLevel);
        // เพิ่มการเปลี่ยนข้อความสถานะ
        const statusText = document.getElementById('status-text');
        if (latestWaterLevel > 2.0) {
            statusText.innerText = 'อันตราย';
            statusText.classList.remove('text-warning', 'text-success');
            statusText.classList.add('text-danger');
        } else if (latestWaterLevel > 1.5) {
            statusText.innerText = 'เฝ้าระวัง';
            statusText.classList.remove('text-danger', 'text-success');
            statusText.classList.add('text-warning');
        } else {
            statusText.innerText = 'ปกติ';
            statusText.classList.remove('text-danger', 'text-warning');
            statusText.classList.add('text-success');
        }
        renderWaterChart(chartLabels, chartData);
    } catch (error) {
        console.error("Dashboard Error:", error);
        document.getElementById('status-text').innerText = 'โหลดข้อมูลล้มเหลว';
    }
}

function renderWaterChart(labels, data) {
    const ctx = document.getElementById('waterChart').getContext('2d');

    // ล้างกราฟเก่าก่อนวาดใหม่ (กันบั๊ก)
    if (waterChartInstance) {
        waterChartInstance.destroy();
    }

    // สร้างข้อมูลเส้นสมมติให้ยาวเท่ากับจำนวนข้อมูลจริง
    const dangerLine = new Array(data.length).fill(2.0);  // เส้นแดง 2.0ม.
    const warningLine = new Array(data.length).fill(1.5); // เส้นเหลือง 1.5ม.

    waterChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'ระดับน้ำจริง',
                    data: data,
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 4,
                    zIndex: 10,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#0d6efd',
                    pointHoverRadius: 6
                },
                {
                    label: 'อันตราย (2.0ม.)',
                    data: dangerLine,
                    borderColor: '#dc3545', // สีแดง
                    borderWidth: 2,
                    borderDash: [5, 5],    // เส้นประ
                    pointRadius: 0,        // ไม่เอาเคอร์เซอร์จุด
                    fill: false,
                    zIndex: 5
                },
                {
                    label: 'เฝ้าระวัง (1.5ม.)',
                    data: warningLine,
                    borderColor: '#ffc107', // สีเหลือง
                    borderWidth: 2,
                    borderDash: [5, 5],    // เส้นประ
                    pointRadius: 0,        // ไม่เอาเคอร์เซอร์จุด
                    fill: false,
                    zIndex: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top', // แสดงคำอธิบายเส้นด้านบน
                    labels: { boxWidth: 10, font: { size: 11 } }
                }
            },
            scales: {
                y: {
                    min: 0,
                    max: 2.5,
                    title: {
                        display: true,
                        text: 'ระดับน้ำ (ม.)',
                        font: { size: 14, weight: 'bold' }
                    },
                    ticks: {
                        stepSize: 0.5,
                        callback: value => value.toFixed(1) + ' ม.'
                    },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: {
                    grid: { display: false },
                    title: {
                        display: true,
                        text: 'เวลา',
                        font: { size: 14, weight: 'bold' }
                    }
                }
            }
        }
    });
}

updateDashboard();
setInterval(updateDashboard, 300000);
