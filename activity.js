// --- activity.js: จัดการข้อมูล Google Sheets และการแสดงผลการ์ดกิจกรรม (รวม Activity Extra เรียงตามเวลา) ---

const PK_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS-vZD57djEboAG1wlDYDcVQkK0p9xtLrbwv1LhMtfJRz7NJjsb0uHqq_y5UEgkS-9aZXwtpm-XqhD8/pub?gid=1314436716&single=true&output=csv";
const EXTRA_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS-vZD57djEboAG1wlDYDcVQkK0p9xtLrbwv1LhMtfJRz7NJjsb0uHqq_y5UEgkS-9aZXwtpm-XqhD8/pub?gid=651460921&single=true&output=csv";

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
        const targetBarBtn = document.getElementById(tabName === 'today' ? 'tab-today-bar' : 'tab-archive-bar');
        if (targetBarBtn) targetBarBtn.classList.add('active');
    }
    filterCards();
}

window.switchTab = switchTab;

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

        // ดึงข้อมูลทั้งสองชีตพร้อมกัน
        const [pkRes, extraRes] = await Promise.all([
            fetch(PK_SHEET_URL),
            fetch(EXTRA_SHEET_URL)
        ]);

        const pkText = await pkRes.text();
        const extraText = await extraRes.text();

        const pkData = parseCSV(pkText).map(item => ({ ...item, _type: 'PK' }));
        const extraData = parseCSV(extraText).map(item => ({ ...item, _type: 'EXTRA' }));

        // รวมข้อมูลกิจกรรมทั้งหมดเข้าด้วยกัน
        allActivities = [...pkData, ...extraData];

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

// รวมวันที่ (Date) และเวลา (Time) เพื่อใช้เรียงลำดับตามเวลาจริง
function parseDateTimeToObj(item) {
    let datePart = item.Date || item.DateTime || '';
    let timePart = item.Time || '00:00';
    
    const d = parseDateStrToDate(datePart);
    if (!d) return new Date(0);

    const timeParts = timePart.split(':');
    if (timeParts.length >= 2) {
        d.setHours(parseInt(timeParts[0]) || 0, parseInt(timeParts[1]) || 0, 0, 0);
    }
    return d;
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
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const tabFiltered = dataToRender.filter(item => {
        const activityDate = parseDateStrToDate(item.Date || item.DateTime);
        if (!activityDate) return false;
        const itemMidnight = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());

        if (currentTab === 'today') {
            return itemMidnight.getTime() === todayMidnight.getTime();
        } else {
            return itemMidnight.getTime() < todayMidnight.getTime();
        }
    });

    // เรียงลำดับตามเวลาจริงทั้ง PK และ Extra ผสมกัน
    tabFiltered.sort((a, b) => {
        const timeA = parseDateTimeToObj(a).getTime();
        const timeB = parseDateTimeToObj(b).getTime();
        if (currentTab === 'today') {
            return timeA - timeB; // วันนี้เรียงจากเวลาเช้าไปค่ำ
        } else {
            return timeB - timeA; // ย้อนหลังเรียงจากใหม่ไปเก่า
        }
    });

    if (tabFiltered.length === 0) {
        cardList.innerHTML = `<div class="no-data" style="text-align: center; color: var(--text-muted); padding: 30px;">📌 ว่าง (ลงสมัครได้เลย) "${currentTab === 'today' ? 'กิจกรรมวันนี้' : 'กิจกรรมย้อนหลัง'}"</div>`;
        return;
    }

    let html = '';
    tabFiltered.forEach(item => {
        if (item._type === 'EXTRA') {
            // ================= โครงสร้างการ์ด Activity_Extra (ปรับตำแหน่งตามต้องการ) =================
            const actName = item.ActivityName && item.ActivityName.trim() !== '' ? item.ActivityName : 'กิจกรรมพิเศษ';
            const vName = item.Name && item.Name.trim() !== '' ? item.Name : 'วีเจ';
            const vId = item.BigoID && item.BigoID.trim() !== '' ? item.BigoID : '-';
            const vImg = item.OurImage && item.OurImage.trim() !== '' ? item.OurImage : 'https://via.placeholder.com/64';
            const vStatus = item.Status && item.Status.trim() !== '' ? item.Status : 'รอตาราง';
            const dateStr = item.Date || '-';
            const timeStr = item.Time || '00:00';

            html += `
            <div class="pk-match-card card-extra-single">
                <div class="extra-card-body">
                    <!-- ฝั่งซ้าย: โครงเดิม (รูป, ชื่อ VJ, ID) -->
                    <div class="extra-left-info">
                        <div class="avatar-aura" style="border: 2px solid var(--mars-green); box-shadow: 0 0 12px var(--mars-glow);">
                            <img src="${vImg}" alt="${vName}">
                        </div>
                        <div style="min-width: 0;">
                            <div class="agency-label" style="color: var(--mars-green);">MARS AGENCY</div>
                            <div class="vj-name">${vName}</div>
                            <div class="vj-id">ID: ${vId} ${vId !== '-' ? `<button class="copy-btn" onclick="copyToClipboard('${vId}')" title="คัดลอก ID">📋</button>` : ''}</div>
                        </div>
                    </div>

                    <!-- ฝั่งขวา: ชื่อกิจกรรมอยู่บน, เวลาอยู่ล่าง -->
                    <div class="extra-center-info">
                        <div class="extra-act-title">${actName}</div>
                        <div class="digital-clock">${timeStr}</div>
                    </div>
                </div>

                <!-- Footer: แสดงวันที่แทนคำว่ากิจกรรมพิเศษ และสถานะขวาล่างคงเดิม -->
                <div class="card-footer-status" style="display: flex; justify-content: space-between; align-items: center; color: #fbbf24; background: rgba(245, 158, 11, 0.08); padding: 6px 12px; font-size: 12px;">
                    <span>📅 วันที่: ${dateStr}</span>
                    <span>📌 สถานะ: ${vStatus}</span>
                </div>
            </div>
            `;
        } else {
            // ================= โครงสร้างการ์ด PK เดิม =================
            const activityName = item.ActivityName && item.ActivityName.trim() !== '' ? item.ActivityName : 'Super PK';
            
            const leftAgency = item.OurAgency && item.OurAgency.trim() !== '' ? item.OurAgency : 'MARS AGENCY';
            const leftAvatar = item.OurImage && item.OurImage.trim() !== '' ? item.OurImage : '';
            const leftName = item.Name && item.Name.trim() !== '' ? item.Name : '?';
            const leftId = item.BigoID && item.BigoID.trim() !== '' ? item.BigoID : '-';

            const rightAgencyRaw = item.OpponentAgency ? item.OpponentAgency.trim() : '';
            const rightAgency = rightAgencyRaw !== '' ? rightAgencyRaw : 'OPPONENT SQUAD';
            const rightAvatar = item.OpponentImage && item.OpponentImage.trim() !== '' ? item.OpponentImage : '';
            const rightNameRaw = item.OpponentName ? item.OpponentName.trim() : '';
            const rightName = rightNameRaw !== '' ? rightNameRaw : 'คู่แข่ง';
            const rightId = item.OpponentID && item.OpponentID.trim() !== '' ? item.OpponentID : '-';

            const time = item.Time && item.Time.trim() !== '' ? item.Time : '22:00';
            const status = item.Status && item.Status.trim() !== '' ? item.Status : 'รอตาราง';
            const activityDateStr = item.Date || item.DateTime || '';

            const leftAvatarHtml = leftAvatar !== '' ? `<img src="${leftAvatar}" alt="${leftName}">` : `<img src="https://via.placeholder.com/64" alt="${leftName}">`;
            const rightAvatarHtml = rightAvatar !== '' ? `<img src="${rightAvatar}" alt="${rightName}">` : `<img src="https://via.placeholder.com/64" alt="${rightName}">`;

            html += `
            <div class="pk-match-card">
                <div class="match-arena">
                    <div class="side-left">
                        <div class="avatar-aura">${leftAvatarHtml}</div>
                        <div style="min-width: 0;">
                            <div class="agency-label" style="color: var(--mars-green);">${leftAgency}</div>
                            <div class="vj-name">${leftName}</div>
                            <div class="vj-id">ID: ${leftId} ${leftId !== '-' ? `<button class="copy-btn" onclick="copyToClipboard('${leftId}')" title="คัดลอก ID">📋</button>` : ''}</div>
                        </div>
                    </div>

                    <div class="digital-scoreboard">
                        <div class="event-tag">${activityName}</div>
                        <div class="digital-clock">${time}</div>
                        <div class="vs-status">⚔️ VS</div>
                    </div>

                    <div class="side-right">
                        <div style="min-width: 0;">
                            <div class="agency-label" style="color: var(--opponent-blue);">${rightAgency}</div>
                            <div class="vj-name">${rightName}</div>
                            <div class="vj-id">${rightId !== '-' ? `<button class="copy-btn" onclick="copyToClipboard('${rightId}')" title="คัดลอก ID">📋</button>` : ''} ID: ${rightId}</div>
                        </div>
                        <div class="avatar-aura">${rightAvatarHtml}</div>
                    </div>
                </div>

                <div class="card-footer-status" style="display: flex; justify-content: space-between; align-items: center; color: #fbbf24; background: rgba(245, 158, 11, 0.08); padding: 6px 12px; font-size: 12px;">
                    <span>📅 วันที่: ${activityDateStr}</span>
                    <span>📌 สถานะ: ${status}</span>
                </div>
            </div>
            `;
        }
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