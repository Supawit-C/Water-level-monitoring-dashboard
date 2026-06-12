const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRCWZtREOAx7TXhyqXdU73DpixjqE_r29_JEPkOP2K-ABy9qPwkv2pVxnQOGaOI3I9KGjClNtWQcUtd/pub?output=csv';

const GAUGE_MAX = 2.5; // ระดับน้ำสูงสุดของสเกลเกจ (เมตร)
let staffChartInstance = null;
let latestRows = [];

// คืนค่าสี/สถานะตามระดับน้ำ
function levelStatus(level) {
    if (level > 2.0) return { color: '#dc2626', badge: 'badge-danger', text: 'วิกฤต' };
    if (level > 1.5) return { color: '#ca8a04', badge: 'badge-warn', text: 'เฝ้าระวัง' };
    return { color: '#16a34a', badge: 'badge-ok', text: 'ปกติดี' };
}

function setGauge(gaugeId, valId, badgeId, level) {
    const pct = Math.min(100, Math.max(0, (level / GAUGE_MAX) * 100));
    const st = levelStatus(level);
    const gauge = document.getElementById(gaugeId);
    gauge.style.background = `conic-gradient(${st.color} ${pct}%, #eef2f7 0)`;
    document.getElementById(valId).innerText = level.toFixed(1);
    const badge = document.getElementById(badgeId);
    badge.innerText = st.text;
    badge.className = 'badge-soft ' + st.badge;
}

async function loadStaffDashboard() {
    try {
        const response = await fetch(csvUrl);
        const csvText = await response.text();
        const rows = csvText.split('\n')
            .map(r => r.split(',').map(c => c.trim()))
            .filter(r => r.length > 5);
        latestRows = rows;

        const header = rows[0];
        const lastRow = rows[rows.length - 1];
        const dateStr = lastRow[0];
        const avgVal = parseFloat(lastRow[26]) || 0;
        const maxVal = parseFloat(lastRow[27]) || 0;

        // กราฟ 24 ชม. จากแถวล่าสุด
        const labels = [];
        const data = [];
        let lastTime = '--:--';
        let latestVal = 0;
        for (let i = 2; i <= 25; i++) {
            const v = parseFloat(lastRow[i]);
            if (!isNaN(v)) {
                labels.push(header[i] || `${i - 2}:00`);
                data.push(v);
                lastTime = header[i] || lastTime;
                latestVal = v;
            }
        }

        // สถานีจำลอง (Mock 4 สถานี) โดยสถานีที่ 1 ดึงข้อมูลจริง
        const stations = [
            { id: 1, name: 'สะพานหมู่ 2', latest: latestVal, avg: avgVal, max: maxVal, isReal: true },
            { id: 2, name: 'ฝายน้ำล้น', latest: 1.4, avg: 1.2, max: 1.6, isReal: false },
            { id: 3, name: 'ปลายน้ำหมู่ 4', latest: 0.8, avg: 0.7, max: 1.1, isReal: false },
            { id: 4, name: 'อ่างเก็บน้ำ', latest: 2.1, avg: 1.9, max: 2.3, isReal: false }
        ];

        const container = document.getElementById('stations-container');
        if (container) {
            container.innerHTML = '';
            stations.forEach(st => {
                const stHtml = `
                    <div class="col-md-6 col-lg-6">
                        <div class="card glass-card p-3 h-100 d-flex flex-column" style="transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                            <div class="d-flex justify-content-between mb-1">
                                <small class="text-muted fw-bold">${st.name} ${st.isReal ? '' : '<span class="text-warning">(Mock)</span>'}</small>
                                <span class="badge-soft" id="g${st.id}-badge">--</span>
                            </div>
                            <div class="gauge my-2" id="gauge${st.id}" style="width: 130px; height: 130px;">
                                <div class="gauge-inner">
                                    <div class="val" id="g${st.id}-val" style="font-size: 1.6rem;">--</div>
                                    <div class="unit">เมตร</div>
                                </div>
                            </div>
                            <div class="text-center mt-auto pt-2">
                                <div class="fw-bold mb-2">ระดับน้ำล่าสุด</div>
                                <button class="btn btn-sm btn-light text-primary rounded-pill w-100 fw-bold" onclick="openStationModal('${st.name}', ${st.avg}, ${st.max})" style="background-color: #eff6ff; border: 1px solid #bfdbfe;">
                                    <i class="fas fa-info-circle me-1"></i> ดูรายละเอียด
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', stHtml);
                // เรนเดอร์เกจ
                setGauge(`gauge${st.id}`, `g${st.id}-val`, `g${st.id}-badge`, st.latest);
            });
        }

        document.getElementById('last-update').innerText =
            `ข้อมูลล่าสุด: ${lastTime} น. (${dateStr})`;

        renderChart(labels, data);
    } catch (err) {
        console.error('Staff dashboard error:', err);
        document.getElementById('last-update').innerText = 'โหลดข้อมูลล้มเหลว';
    }
}

function renderChart(labels, data) {
    const ctx = document.getElementById('staffChart').getContext('2d');
    if (staffChartInstance) staffChartInstance.destroy();

    const dangerLine = new Array(data.length).fill(2.0);
    const warningLine = new Array(data.length).fill(1.5);

    staffChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'ระดับน้ำจริง',
                    data,
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13,110,253,0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 3,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#0d6efd'
                },
                {
                    label: 'ระดับวิกฤต (2.0ม.)',
                    data: dangerLine,
                    borderColor: '#dc3545',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false
                },
                {
                    label: 'เฝ้าระวัง (1.5ม.)',
                    data: warningLine,
                    borderColor: '#ffc107',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { boxWidth: 10, font: { size: 11 } } }
            },
            scales: {
                y: {
                    min: 0,
                    max: GAUGE_MAX,
                    ticks: { stepSize: 0.5, callback: v => v.toFixed(1) + ' ม.' },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

// ===== เลือกชนิดรายงาน =====
let selectedReport = 'daily';
document.querySelectorAll('.report-row').forEach(row => {
    row.addEventListener('click', () => {
        document.querySelectorAll('.report-row').forEach(r => r.classList.remove('active'));
        row.classList.add('active');
        selectedReport = row.dataset.type;
    });
});

// ===== ดาวน์โหลดรายงาน (CSV) =====
document.getElementById('downloadBtn').addEventListener('click', () => {
    if (!latestRows.length) {
        alert('ยังไม่มีข้อมูลให้ดาวน์โหลด');
        return;
    }
    let exportRows = latestRows;
    if (selectedReport === 'daily') {
        exportRows = [latestRows[0], latestRows[latestRows.length - 1]];
    } else if (selectedReport === 'weekly') {
        exportRows = [latestRows[0], ...latestRows.slice(-7)];
    }
    const csv = exportRows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `water-report-${selectedReport}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
});

// ===== เมนูบนมือถือ =====
const menuToggle = document.getElementById('menuToggle');
if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });
}

// ===== ฟังก์ชันเปิด Modal ข้อมูลสถานี =====
window.openStationModal = function(name, avg, max) {
    document.getElementById('detailsModalLabel').innerText = `รายละเอียดระดับน้ำ: ${name}`;
    document.getElementById('modal-avg').innerText = avg.toFixed(2);
    document.getElementById('modal-max').innerText = max.toFixed(2);
    const modalEl = document.getElementById('detailsModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
    
    // อัปเดตกราฟเมื่อ Modal เปิดขึ้นเพื่อให้ขนาดถูกต้อง
    setTimeout(() => {
        if (staffChartInstance) {
            staffChartInstance.resize();
        }
    }, 250);
};

loadStaffDashboard();
setInterval(loadStaffDashboard, 300000);
