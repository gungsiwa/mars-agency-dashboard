// --- activity.js: จัดการข้อมูล Google Sheets, Flash Events และการแสดงผลการ์ดกิจกรรม ---

const PK_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS-vZD57djEboAG1wlDYDcVQkK0p9xtLrbwv1LhMtfJRz7NJjsb0uHqq_y5UEgkS-9aZXwtpm-XqhD8/pub?gid=1314436716&single=true&output=csv";
const EXTRA_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS-vZD57djEboAG1wlDYDcVQkK0p9xtLrbwv1LhMtfJRz7NJjsb0uHqq_y5UEgkS-9aZXwtpm-XqhD8/pub?gid=651460921&single=true&output=csv";
const FLASH_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS-vZD57djEboAG1wlDYDcVQkK0p9xtLrbwv1LhMtfJRz7NJjsb0uHqq_y5UEgkS-9aZXwtpm-XqhD8/pub?gid=1120098084&single=true&output=csv";

let allActivities = [];
let flashEvents = [];
let currentTab = 'today';

export async function initActivityModule() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => filterCards());
    }
    await loadActivityData();
    await loadFlashEventData();
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

// ฟังก์ชัน parseCSV ที่ปรับปรุงใหม่ให้รองรับการขึ้นบรรทัดใหม่ในเครื่องหมายคำพูด
function parseCSV(text) {
    const result = [];
    let rows = [];
    let currentRow = [];
    let currentField = "";
    let insideQuotes = "";

    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        const nextC = text[i + 1];

        if (insideQuotes) {
            if (c === '"') {
                if (nextC === '"') {
                    currentField += '"';
                    i++;
                } else {
                    insideQuotes = false;
                }
            } else {
                currentField += c;
            }
        } else {
            if (c === '"') {
                insideQuotes = true;
            } else if (c === ',') {
                currentRow.push(currentField.trim());
                currentField = "";
            } else if (c === '\r') {
                // ข้าม \r
            } else if (c === '\n') {
                currentRow.push(currentField.trim());
                rows.push(currentRow);
                currentRow = [];
                currentField = "";
            } else {
                currentField += c;
            }
        }
    }
    if (currentField !== "" || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
    }

    if (rows.length === 0) return result;

    const headers = rows[0].map(h => h.replace(/^["']|["']$/g, ''));

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length === 1 && row[0] === "") continue;
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            let val = row[j] !== undefined ? row[j] : "";
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

        const [pkRes, extraRes] = await Promise.all([
            fetch(PK_SHEET_URL),
            fetch(EXTRA_SHEET_URL)
        ]);

        const pkText = await pkRes.text();
        const extraText = await extraRes.text();

        const pkData = parseCSV(pkText).map(item => ({ ...item, _type: 'PK' }));
        const extraData = parseCSV(extraText).map(item => ({ ...item, _type: 'EXTRA' }));

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

// โหลดข้อมูล Flash Event จาก CSV
async function loadFlashEventData() {
    try {
        const res = await fetch(FLASH_SHEET_URL);
        const text = await res.text();
        const data = parseCSV(text);
        
        flashEvents = data.filter(item => (item.is_active || '').toUpperCase() === 'TRUE');
        renderFlashEvents();
    } catch (err) {
        console.error("เกิดข้อผิดพลาดในการโหลดข้อมูล Flash Event:", err);
    }
}

// เรนเดอร์ Flash Events แบบ 2 คอลัมน์ (พร้อมแสดงวันเริ่มและวันสิ้นสุดกิจกรรม)
function renderFlashEvents() {
    const flashContainer = document.getElementById("flashEventContainer");
    if (!flashContainer) return;

    if (flashEvents.length === 0) {
        flashContainer.innerHTML = '';
        return;
    }

    let html = '';
    flashEvents.forEach(event => {
        const title = event.title || 'Flash Event';
        const badge = event.badge_label || '';
        const banner = event.banner_url || '';
        const startDate = event.start_date || '';
        const endDate = event.end_date || '';
        const eventId = event.event_id || '';
        const shortDesc = event.description || 'คลิกเพื่อดูรายละเอียดเพิ่มเติม...';
        
        // จัดรูปแบบแสดงผลวันเริ่มและวันสิ้นสุด
        const dateDisplayHtml = (startDate && endDate) 
            ? `<div class="flash-event-date"><i class="far fa-calendar-alt"></i> ระยะเวลา: ${startDate} - ${endDate}</div>` 
            : (startDate ? `<div class="flash-event-date"><i class="far fa-calendar-alt"></i> เริ่ม: ${startDate}</div>` : '');

        html += `
        <div class="flash-event-card">
            <div class="flash-event-media">
                ${banner ? `<img src="${banner}" alt="${title}">` : '<img src="https://via.placeholder.com/400x200/1e293b/f59e0b?text=Flash+Event" alt="Flash Event">'}
            </div>
            <div class="flash-event-info">
                ${badge ? `<span class="flash-event-badge">${badge}</span>` : '<span class="flash-event-badge">⚡ FLASH EVENT</span>'}
                <h3 class="flash-event-title">${title}</h3>
                ${dateDisplayHtml}
                <p class="flash-event-desc">${shortDesc}</p>
                <button type="button" class="flash-event-btn" onclick="openFlashEventModal('${eventId}')">
                    📖 รายละเอียดเพิ่มเติม
                </button>
            </div>
        </div>
        `;
    });
    flashContainer.innerHTML = html;
}

// ฟังก์ชันเปิด Modal Flash Event พร้อมปุ่มกากบาท
window.openFlashEventModal = function(eventId) {
    const event = flashEvents.find(e => e.event_id === eventId);
    if (!event) return;

    const modal = document.getElementById("flashEventModal");
    if (!modal) return;

    const titleEl = modal.querySelector('.modal-title');
    const descEl = modal.querySelector('.modal-description');
    
    if (titleEl) titleEl.innerText = event.title || 'รายละเอียด Flash Event';
    if (descEl) {
        let contentHtml = '';
        if (event.banner_url) {
            contentHtml += `<img src="${event.banner_url}" alt="${event.title || ''}" style="width:100%; border-radius:8px; margin-bottom: 12px; display: block;">`;
        }
        if (event.start_date && event.end_date) {
            contentHtml += `<p style="font-size: 12px; color: #f59e0b; margin-bottom: 8px; font-weight: 600;">📅 ระยะเวลา: ${event.start_date} - ${event.end_date}</p>`;
        }
        contentHtml += (event.description || '').replace(/\n/g, '<br>');
        descEl.innerHTML = contentHtml;
    }

    modal.classList.add('active');
};

// ฟังก์ชันปิด Modal Flash Event (ทำงานร่วมกับปุ่มกากบาท)
window.closeFlashEventModal = function() {
    const modal = document.getElementById("flashEventModal");
    if (modal) {
        modal.classList.remove('active');
    }
};

// ปิด Modal เมื่อคลิกพื้นที่ว่างด้านนอกกล่อง
window.addEventListener('click', (e) => {
    const modal = document.getElementById("flashEventModal");
    if (e.target === modal) {
        closeFlashEventModal();
    }
});

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

    tabFiltered.sort((a, b) => {
        const timeA = parseDateTimeToObj(a).getTime();
        const timeB = parseDateTimeToObj(b).getTime();
        if (currentTab === 'today') {
            return timeA - timeB;
        } else {
            return timeB - timeA;
        }
    });

    if (tabFiltered.length === 0) {
        cardList.innerHTML = `<div class="no-data" style="text-align: center; color: var(--text-muted); padding: 30px;">📌 ว่าง (ลงสมัครได้เลย) "${currentTab === 'today' ? 'กิจกรรมวันนี้' : 'กิจกรรมย้อนหลัง'}"</div>`;
        return;
    }

    let html = '';
    tabFiltered.forEach(item => {
        if (item._type === 'EXTRA') {
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
                    <div class="extra-center-info">
                        <div class="extra-act-title">${actName}</div>
                        <div class="digital-clock">${timeStr}</div>
                    </div>
                </div>
                <div class="card-footer-status" style="display: flex; justify-content: space-between; align-items: center; color: #fbbf24; background: rgba(245, 158, 11, 0.08); padding: 6px 12px; font-size: 12px;">
                    <span>📅 วันที่: ${dateStr}</span>
                    <span>📌 สถานะ: ${vStatus}</span>
                </div>
            </div>
            `;
        } else {
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