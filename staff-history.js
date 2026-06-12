const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRCWZtREOAx7TXhyqXdU73DpixjqE_r29_JEPkOP2K-ABy9qPwkv2pVxnQOGaOI3I9KGjClNtWQcUtd/pub?output=csv';

async function loadHistory(days = 7){
    const tbody = document.getElementById("staff-history-list");
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">กำลังโหลดข้อมูล...</td></tr>';
    
    try {
        const response = await fetch(csvUrl);
        const csv = await response.text();

        const rows = csv.split("\n")
            .map(r => r.split(",").map(c => c.trim()))
            .filter(r => r.length > 5);

        let html = "";

        // only show the latest `days` entries (but not more than available rows)
        const count = Math.min(days, rows.length);
        for (let i = rows.length - 1; i >= rows.length - count; i--) {
            let date = rows[i][0];
            let avg = parseFloat(rows[i][26]);
            let max = parseFloat(rows[i][27]);

            let status = "ปกติ";
            let statusClass = "status-normal";

            if (max > 2.0) {
                status = "อันตราย";
                statusClass = "status-danger";
            } else if (max > 1.5) {
                status = "เฝ้าระวัง";
                statusClass = "status-warning";
            }

            html += `
            <tr>
                <td class="fw-bold">${date}</td>
                <td><span class="status-badge ${statusClass}">${status}</span></td>
                <td>${avg.toFixed(2)}</td>
                <td>${max.toFixed(2)}</td>
            </tr>
            `;
        }
        
        if (html === "") {
            html = '<tr><td colspan="4" class="text-center py-4 text-muted">ไม่มีข้อมูล</td></tr>';
        }

        tbody.innerHTML = html;
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-danger">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
        console.error("Error loading history:", error);
    }
}

// Add event listener to filter dropdown
const filterSelect = document.getElementById('days-filter');
if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
        const days = parseInt(e.target.value, 10);
        loadHistory(days);
    });
}

// Mobile sidebar toggle
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
}

// Initial load
loadHistory(7);
