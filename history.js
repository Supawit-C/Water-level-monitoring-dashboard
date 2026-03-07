const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRCWZtREOAx7TXhyqXdU73DpixjqE_r29_JEPkOP2K-ABy9qPwkv2pVxnQOGaOI3I9KGjClNtWQcUtd/pub?output=csv';

async function loadHistory(days = 7){
    // fetch and parse CSV data
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

<div class="history-card">

<div class="d-flex justify-content-between">

<div>

<div class="fw-bold">${date}</div>
<div class="${statusClass}">${status}</div>

</div>

</div>

<hr>

<div class="row text-center">

<div class="col">
<div class="text-muted small">ค่าเฉลี่ยทั้งวัน</div>
<div class="fw-bold">${avg.toFixed(2)} เมตร</div>
</div>

<div class="col">
<div class="text-muted small">ระดับน้ำสูงสุด</div>
<div class="fw-bold">${max.toFixed(2)} เมตร</div>
</div>

</div>

</div>

`;
    }

    document.getElementById("history-list").innerHTML = html;

    // update button styles to reflect selected filter
    updateButtonStyles(days);
}

function updateButtonStyles(selectedDays) {
    document.querySelectorAll('#filter-buttons button').forEach(btn => {
        const d = parseInt(btn.dataset.days, 10);
        if (d === selectedDays) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// attach event listener to container for delegation
const filterContainer = document.getElementById('filter-buttons');
if (filterContainer) {
    filterContainer.addEventListener('click', e => {
        if (e.target.tagName === 'BUTTON') {
            const days = parseInt(e.target.dataset.days, 10);
            if (!isNaN(days)) {
                loadHistory(days);
            }
        }
    });
}

// initial load with default range
loadHistory();