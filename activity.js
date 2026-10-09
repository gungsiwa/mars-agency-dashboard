// --- activity.js: จัดการข้อมูล Google Sheets และการแสดงผลการ์ดกิจกรรม ---

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS-vZD57djEboAG1wlDYDcVQkK0p9xtLrbwv1LhMtfJRz7NJjsb0uHqq_y5UEgkS-9aZXwtpm-XqhD8/pub?gid=1314436716&single=true&output=csv";

let allActivities = [];
let currentTab = 'today';

export async function initActivityModule() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => filterCards());
    }
    await loadActivityData();
}

export function switchTab(tabName, event) {
    currentTab = tabName;
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    } else {
        const targetBtn = document.getElementById(tabName === 'today' ? 'tab-today' : 'tab-archive');
        if (targetBtn) targetBtn.classList.add('active');
    }
    filterCards();
}

window.switchTab = switchTab; // ผูกไว้กับ window เพื่อให้ HTML เรียกใช้งานได้ง่าย

function parseCSV(text) {
    const lines = text.split("\n");
    const result = [];
    if (lines.length === 0) return result;
    
    const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, ''));

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const currentline = lines[i].split(",");
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            let val = currentline[j] ? currentline[j].trim() : "";
            val = val.replace(/^["']|["']$/g, '');
            obj[headers[j]] = val;
        }
        result.push(obj);
    }
    return result;
}

async function loadActivityData() {
    try {
        const lastUpdatedBox = document.getElementById("lastUpdatedBox");
        if (lastUpdatedBox) lastUpdatedBox.innerText = `กำลังดึงข้อมูลจากระบบ... ⏳`;

        const activityResponse = await fetch(SHEET_CSV_URL);
        const activityText = await activityResponse.text();
        allActivities = parseCSV(activityText);

        if (lastUpdatedBox) {
            lastUpdatedBox.innerText = `อัปเดตข้อมูลล่าสุด: ${new Date().toLocaleTimeString('th-TH')}`;
        }
        renderActivities();
    } catch (err) {
        console.error("Error loading activity data:", err);
        const lastUpdatedBox = document.getElementById("lastUpdatedBox");
        if (lastUpdatedBox) lastUpdatedBox.innerText = `เกิดข้อผิดพลาดในการโหลดข้อมูล`;
    }
}

function parseDateStrToDate(dateStr) {
    if (!dateStr) return null;
    const cleanDate = dateStr.trim().split(' ')[0];
    const parts = cleanDate.split('/');
    if (parts.length === 3) {
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    const isoDate = new Date(cleanDate);
    return isNaN(isoDate) ? null : isoDate;
}

window.copyToClipboard = function(text) {
    if (!text || text === '-' || text === '?') return;
    navigator.clipboard.writeText(text).then(() => {
        alert('คัดลอก ID เรียบร้อยแล้ว: ' + text);
    }).catch(err => console.error('Failed to copy: ', err));
};

function renderActivities(dataToRender = allActivities) {
    const cardList = document.getElementById("cardList");
    if (!cardList) return;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const tabFiltered = dataToRender.filter(item => {
        const itemDateStr = item.DateTime || item.Date || '';
        const activityDate = parseDateStrToDate(itemDateStr);
        if (!activityDate) return false;
        activityDate.setHours(0, 0, 0, 0);

        if (currentTab === 'today') {
            return activityDate.getTime() === now.getTime();
        } else {
            return activityDate.getTime() < now.getTime();
        }
    });

    tabFiltered.sort((a, b) => {
        const dateA = parseDateStrToDate(a.DateTime || a.Date);
        const dateB = parseDateStrToDate(b.DateTime || b.Date);
        if (!dateA || !dateB) return 0;
        if (currentTab === 'today') return 0;
        else return dateB.getTime() - dateA.getTime();
    });

    if (tabFiltered.length === 0) {
        cardList.innerHTML = `<div class="no-data" style="text-align: center; color: var(--text-muted); padding: 30px;">📌 ไม่พบข้อมูลในแท็บ "${currentTab === 'today' ? 'กิจกรรมวันนี้' : 'กิจกรรมย้อนหลัง'}"</div>`;
        return;
    }

    let html = '';
    tabFiltered.forEach(item => {
        const activityName = item.ActivityName && item.ActivityName.trim() !== '' ? item.ActivityName : 'Super PK';
        
        const leftAgency = item.OurAgency && item.OurAgency.trim() !== '' ? item.OurAgency : 'MARS Agency';
        const leftAvatar = item.OurImage && item.OurImage.trim() !== '' ? item.OurImage : '';
        const leftName = item.Name && item.Name.trim() !== '' ? item.Name : '?';
        const leftId = item.BigoID && item.BigoID.trim() !== '' ? item.BigoID : '-';

        const rightAgencyRaw = item.OpponentAgency ? item.OpponentAgency.trim() : '';
        const rightAgency = rightAgencyRaw !== '' ? rightAgencyRaw : '-';
        const rightAvatar = item.OpponentImage && item.OpponentImage.trim() !== '' ? item.OpponentImage : '';
        const rightNameRaw = item.OpponentName ? item.OpponentName.trim() : '';
        const rightName = rightNameRaw !== '' ? rightNameRaw : 'คู่แข่ง';
        const rightId = item.OpponentID && item.OpponentID.trim() !== '' ? item.OpponentID : '-';

        const date = item.Date && item.Date.trim() !== '' ? item.Date : '';
        const time = item.Time && item.Time.trim() !== '' ? item.Time : '';
        const dateTime = (date || time) ? `${date} ${time}` : '';

        const status = item.Status && item.Status.trim() !== '' ? item.Status : '';

        // กำหนดสีชื่อกิจกรรม (รองรับทั้ง Battle Royal และ Battle Royale)
        let activityBg = 'rgba(108, 35, 56, 0.8)';
        let activityColor = '#ffcccc';
        let activityBorder = 'rgba(255, 100, 100, 0.3)';
        
        const actLower = activityName.toLowerCase();
        if (actLower.includes('pk battle royal')) {
            activityBg = 'rgba(30, 144, 255, 0.25)'; // สีฟ้าสำหรับ Battle Royal
            activityColor = '#87cefa';
            activityBorder = 'rgba(30, 144, 255, 0.4)';
        } else if (actLower.includes('family super pk')) {
            activityBg = 'rgba(138, 43, 226, 0.25)'; // สีม่วงสำหรับ Family
            activityColor = '#dda0dd';
            activityBorder = 'rgba(138, 43, 226, 0.4)';
        } else if (actLower.includes('super pk')) {
            activityBg = 'rgba(108, 35, 56, 0.8)'; // ค่าเริ่มต้น/Super PK
            activityColor = '#ffcccc';
            activityBorder = 'rgba(255, 100, 100, 0.3)';
        }

        // กำหนดสีสถานะตามข้อความจริงในตาราง
        let statusBg = 'rgba(16, 185, 129, 0.15)';
        let statusColor = '#34d399';
        let statusBorder = 'rgba(16, 185, 129, 0.3)';

        const statusLower = status.toLowerCase();
        if (statusLower.includes('ลงทะเบียนแล้ว') || statusLower.includes('รอตาราง')) {
            // 1. ลงทะเบียนแล้ว (รอตาราง) -> โทนสีเหลือง/ส้ม
            statusBg = 'rgba(245, 158, 11, 0.2)';
            statusColor = '#fbbf24';
            statusBorder = 'rgba(245, 158, 11, 0.4)';
        } else if (statusLower.includes('ได้ตารางแล้ว')) {
            // 2. ได้ตารางแล้ว -> โทนสีฟ้า
            statusBg = 'rgba(30, 144, 255, 0.25)';
            statusColor = '#87cefa';
            statusBorder = 'rgba(30, 144, 255, 0.4)';
        } else if (statusLower.includes('สำเร็จ') || statusLower.includes('กิจกรรมจบแล้ว')) {
            // 3. สำเร็จ (กิจกรรมจบแล้ว) -> โทนสีเขียว
            statusBg = 'rgba(16, 185, 129, 0.15)';
            statusColor = '#34d399';
            statusBorder = 'rgba(16, 185, 129, 0.3)';
        } else if (statusLower.includes('ไม่สำเร็จ') || statusLower.includes('ยกเลิก')) {
            // 4. ไม่สำเร็จ / ยกเลิก -> โทนสีชมพู/แดง
            statusBg = 'rgba(239, 68, 68, 0.2)';
            statusColor = '#f87171';
            statusBorder = 'rgba(239, 68, 68, 0.4)';
        }

        const leftAvatarHtml = leftAvatar !== '' 
            ? `<img src="${leftAvatar}" alt="${leftName}" class="avatar-img">`
            : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#1e1e1e; color:var(--gold); font-size:28px; font-weight:bold;">?</div>`;

        const rightAvatarHtml = rightAvatar !== '' 
            ? `<img src="${rightAvatar}" alt="${rightName}" class="avatar-img">`
            : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#1e1e1e; color:var(--gold); font-size:28px; font-weight:bold;">?</div>`;

        html += `
        <div class="pk-card">
            <div class="pk-card-header">
                <span style="background-color: ${activityBg}; color: ${activityColor}; border: 1px solid ${activityBorder}; padding: 2px 6px; border-radius: 4px; display: inline-block;">${activityName}</span>
                <span style="font-size: 12px; color: var(--text-muted);">${dateTime}</span>
            </div>

            <div class="match-content">
                <div class="player-box left-box">
                    <div class="agency-tag mars-agency">${leftAgency}</div>
                    <div class="avatar-container">${leftAvatarHtml}</div>
                    <div class="vj-name">${leftName}</div>
                    <div class="vj-id-row">
                        <span>${leftId}</span>
                        ${leftId !== '-' ? `<button class="copy-btn" onclick="copyToClipboard('${leftId}')" title="คัดลอก ID">📋</button>` : ''}
                    </div>
                </div>

                <div class="vs-badge">VS</div>

                <div class="player-box right-box">
                    <div class="agency-tag opponent-agency">${rightAgency}</div>
                    <div class="avatar-container">${rightAvatarHtml}</div>
                    <div class="vj-name">${rightName}</div>
                    <div class="vj-id-row">
                        <span>${rightId}</span>
                        ${rightId !== '-' ? `<button class="copy-btn" onclick="copyToClipboard('${rightId}')" title="คัดลอก ID">📋</button>` : ''}
                    </div>
                </div>
            </div>

            <div class="pk-card-footer">
                <div class="status-badge" style="background: ${statusBg}; color: ${statusColor}; border-color: ${statusBorder};">${status}</div>
            </div>
        </div>
        `;
    });

    cardList.innerHTML = html;
}

function filterCards() {
    const searchInput = document.getElementById("searchInput");
    const keyword = searchInput ? searchInput.value.toLowerCase().trim() : "";

    const filtered = allActivities.filter(item => {
        const name = (item.Name || '').toLowerCase();
        const bigoId = (item.BigoID || '').toLowerCase();
        const activity = (item.ActivityName || '').toLowerCase();
        const opponentName = (item.OpponentName || '').toLowerCase();
        
        return !keyword || name.includes(keyword) || bigoId.includes(keyword) || activity.includes(keyword) || opponentName.includes(keyword);
    });

    renderActivities(filtered);
}