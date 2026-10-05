const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS-vZD57djEboAG1wlDYDcVQkK0p9xtLrbwv1LhMtfJRz7NJjsb0uHqq_y5UEgkS-9aZXwtpm-XqhD8/pub?gid=1314436716&single=true&output=csv";
const ANNOUNCEMENT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS-vZD57djEboAG1wlDYDcVQkK0p9xtLrbwv1LhMtfJRz7NJjsb0uHqq_y5UEgkS-9aZXwtpm-XqhD8/pub?gid=768921656&single=true&output=csv";

let allActivities = [];
let externalLinks = [];
let bannerImages = [];
let currentTab = 'today';
let currentSlideIndex = 0;
let slideInterval;

async function loadData() {
    // 1. โหลดประกาศและเวลาอัปเดตจากชีต Announcement
    try {
        let annRes = await fetch(ANNOUNCEMENT_CSV_URL);
        let annText = await annRes.text();
        let annData = parseCSV(annText);
        if (annData.length > 0) {
            let noticeText = annData[0]['NoticeText'] || '';
            let lastUpdated = annData[0]['LastUpdated'] || '-';
            
            let noticeContainer = document.getElementById("noticeBannerContainer");
            if (noticeText.trim()) {
                noticeContainer.innerHTML = `
                    <div class="notice-banner">
                        <span class="notice-icon">📢</span>
                        <div class="marquee-container">
                            <div class="marquee-text">${noticeText}</div>
                        </div>
                    </div>
                `;
            } else {
                noticeContainer.innerHTML = "";
            }

            document.getElementById("lastUpdatedBox").innerText = `อัปเดตข้อมูลล่าสุด: ${lastUpdated}`;
        }
    } catch (error) {
        console.error("ไม่สามารถโหลดข้อมูลประกาศได้: ", error);
        document.getElementById("lastUpdatedBox").innerText = `อัปเดตข้อมูลล่าสุด: -`;
    }

    // 2. โหลดข้อมูลกิจกรรมหลัก
    try {
        let response = await fetch(SHEET_CSV_URL);
        let csvText = await response.text();
        
        allActivities = parseCSV(csvText);
        renderCurrentTab();
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการโหลดข้อมูลกิจกรรม: ", error);
        document.getElementById("cardList").innerHTML = `<div class="no-data" style="color: #ff5252;">⚠️ ไม่สามารถโหลดข้อมูลกิจกรรมได้</div>`;
    }

    // 3. โหลดลิงก์เสริมภายนอก (links.json)
    try {
        let linkRes = await fetch('links.json');
        externalLinks = await linkRes.json();
        renderExternalLinks();
    } catch (error) {
        console.error("ไม่สามารถโหลดไฟล์ links.json ได้: ", error);
        document.getElementById("externalLinksContainer").innerHTML = `<div style="font-size: 11.5px; color: var(--text-muted); text-align: center;">ยังไม่มีลิงก์เพิ่มเติม</div>`;
    }

    // 4. โหลดรูปภาพแบนเนอร์กิจกรรม (banners.json)
    try {
        let bannerRes = await fetch('banners.json');
        bannerImages = await bannerRes.json();
        initBannerSlider();
    } catch (error) {
        console.error("ไม่สามารถโหลดไฟล์ banners.json ได้: ", error);
    }
}

// --- ระบบจัดการ Banner Slider ---
function initBannerSlider() {
    const track = document.getElementById("bannerSliderTrack");
    const dotsContainer = document.getElementById("bannerDots");
    if (!track || !dotsContainer || bannerImages.length === 0) return;

    track.innerHTML = "";
    dotsContainer.innerHTML = "";

    bannerImages.forEach((item, index) => {
        const slide = document.createElement("div");
        slide.className = "banner-slide";
        slide.innerHTML = `<img src="${item.image}" alt="${item.alt || 'Banner'}">`;
        track.appendChild(slide);

        const dot = document.createElement("div");
        dot.className = `banner-dot ${index === 0 ? "active" : ""}`;
        dot.addEventListener("click", () => {
            goToSlide(index);
            resetInterval();
        });
        dotsContainer.appendChild(dot);
    });

    startAutoSlide();
}

function updateSliderPosition() {
    const track = document.getElementById("bannerSliderTrack");
    const dots = document.querySelectorAll(".banner-dot");
    if (!track || bannerImages.length === 0) return;

    track.style.transform = `translateX(-${currentSlideIndex * 100}%)`;

    dots.forEach((dot, index) => {
        dot.classList.toggle("active", index === currentSlideIndex);
    });
}

function nextSlide() {
    if (bannerImages.length === 0) return;
    currentSlideIndex = (currentSlideIndex + 1) % bannerImages.length;
    updateSliderPosition();
}

function goToSlide(index) {
    currentSlideIndex = index;
    updateSliderPosition();
}

function startAutoSlide() {
    if (bannerImages.length <= 1) return;
    slideInterval = setInterval(nextSlide, 4000); // สลับภาพอัตโนมัติทุกๆ 4 วินาที
}

function resetInterval() {
    clearInterval(slideInterval);
    startAutoSlide();
}
// ---------------------------------

function parseCSV(text) {
    let lines = text.split('\n');
    if (lines.length < 2) return [];

    let headers = parseCSVLine(lines[0]).map(h => h.trim());
    let result = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        let currentLine = parseCSVLine(lines[i]);
        let obj = {};
        for (let j = 0; j < headers.length; j++) {
            let key = headers[j];
            obj[key] = currentLine[j] ? currentLine[j].trim() : '';
        }
        result.push(obj);
    }
    return result;
}

function parseCSVLine(text) {
    let result = [];
    let insideQuotes = false;
    let entry = '';
    for (let i = 0; i < text.length; i++) {
        let c = text[i];
        if (c === '"') {
            insideQuotes = !insideQuotes;
        } else if (c === ',' && !insideQuotes) {
            result.push(entry);
            entry = '';
        } else {
            entry += c;
        }
    }
    result.push(entry);
    return result.map(item => item.replace(/^"|"$/g, '').trim());
}

function switchTab(tabName, event) {
    currentTab = tabName;
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if(event && event.target) {
        event.target.classList.add('active');
    }

    renderCurrentTab();
}

function parseLocalDate(dateString) {
    if (!dateString) return null;
    let cleanStr = dateString.trim();
    
    let slashParts = cleanStr.split('/');
    if (slashParts.length === 3) {
        let d = parseInt(slashParts[0], 10);
        let m = parseInt(slashParts[1], 10) - 1;
        let y = parseInt(slashParts[2], 10);
        if (y > 2500) y -= 543; 
        if (y < 100) y += 2000; 
        let dateObj = new Date(y, m, d);
        if (!isNaN(dateObj.getTime())) return dateObj;
    }

    let dashParts = cleanStr.split('-');
    if (dashParts.length === 3) {
        let y = parseInt(dashParts[0], 10);
        let m = parseInt(dashParts[1], 10) - 1;
        let d = parseInt(dashParts[2], 10);
        if (y > 2500) y -= 543;
        let dateObj = new Date(y, m, d);
        if (!isNaN(dateObj.getTime())) return dateObj;
    }

    let fallback = new Date(cleanStr);
    return isNaN(fallback.getTime()) ? null : fallback;
}

function renderCurrentTab() {
    let today = new Date();
    today.setHours(0, 0, 0, 0);

    let filteredData = [];

    const getVal = (item, keyName) => {
        let foundKey = Object.keys(item).find(k => k.trim().toLowerCase() === keyName.toLowerCase());
        return foundKey ? item[foundKey] : '';
    };

    if (currentTab === 'today') {
        filteredData = allActivities.filter(item => {
            let dateStr = getVal(item, 'Date');
            let eventDate = parseLocalDate(dateStr);
            if (!eventDate) return false;
            eventDate.setHours(0, 0, 0, 0);
            return eventDate.getTime() === today.getTime();
        });
    } else if (currentTab === 'archive') {
        filteredData = allActivities.filter(item => {
            let dateStr = getVal(item, 'Date');
            let eventDate = parseLocalDate(dateStr);
            if (!eventDate) return false;
            eventDate.setHours(0, 0, 0, 0);
            return eventDate.getTime() < today.getTime();
        });
        filteredData.sort((a, b) => parseLocalDate(getVal(b, 'Date')) - parseLocalDate(getVal(a, 'Date')));
    }

    renderCards(filteredData);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    let d = parseLocalDate(dateString);
    if (!d) return dateString;
    return d.toLocaleDateString('th-TH', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function formatTime(timeString) {
    if (!timeString) return '-';
    return timeString.includes('น.') ? timeString : `${timeString} น.`;
}

function getActivityClass(activityName) {
    if (!activityName) return 'act-default';
    let name = activityName.toLowerCase();
    if (name.includes('battle royal')) return 'act-pk-battle';
    if (name.includes('super pk')) return 'act-super-pk';
    if (name.includes('family')) return 'act-family-pk';
    return 'act-default';
}

function getStatusInfo(status) {
    if (!status) return { text: 'รออัปเดต', class: 'status-waiting' };
    let s = status.trim();
    if (s.includes('สำเร็จ')) return { text: s, class: 'status-success' };
    if (s.includes('ได้ตารางแล้ว')) return { text: s, class: 'status-scheduled' };
    if (s.includes('ลงทะเบียนแล้ว') || s.includes('รอ')) return { text: s, class: 'status-waiting' };
    return { text: s, class: 'status-failed' };
}

function renderCards(data) {
    let cardList = document.getElementById("cardList");
    cardList.innerHTML = "";

    if (data.length === 0) {
        let emptyMsg = "ยังไม่มีคำขอลงกิจกรรมในวันนี้";
        if(currentTab === 'archive') emptyMsg = "ยังไม่มีประวัติกิจกรรมย้อนหลัง";

        cardList.innerHTML = `<div class="no-data">📌 ${emptyMsg}</div>`;
        return;
    }

    const getVal = (item, keyName) => {
        let foundKey = Object.keys(item).find(k => k.trim().toLowerCase() === keyName.toLowerCase());
        return foundKey ? item[foundKey] : '';
    };

    data.forEach(item => {
        let actName = getVal(item, 'ActivityName');
        let dateVal = getVal(item, 'Date');
        let timeVal = getVal(item, 'Time');
        let statusVal = getVal(item, 'Status');
        let nameVal = getVal(item, 'Name');
        let bigoIdVal = getVal(item, 'BigoID');
        let ourImgVal = getVal(item, 'OurImage');
        let oppIdVal = getVal(item, 'OpponentID');
        let oppAgencyVal = getVal(item, 'OpponentAgency');
        let oppImgVal = getVal(item, 'OpponentImage');

        let actClass = getActivityClass(actName);
        let statusInfo = getStatusInfo(statusVal);
        let formattedDate = formatDate(dateVal);
        let formattedTime = formatTime(timeVal);
        
        let ourAvatarHTML = ourImgVal 
            ? `<img src="${ourImgVal}" alt="Our VJ" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\'avatar-placeholder-cute\'>?</div>';">` 
            : `<div class="avatar-placeholder-cute">?</div>`;

        let oppAvatarHTML = oppImgVal 
            ? `<img src="${oppImgVal}" alt="Opponent VJ" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\'avatar-placeholder-cute\'>?</div>';">` 
            : `<div class="avatar-placeholder-cute">?</div>`;

        let cardHTML = `
            <div class="activity-card">
                <div class="card-top">
                    <span class="activity-badge ${actClass}">${actName || 'กิจกรรมทั่วไป'}</span>
                    <span style="font-size: 11px; color: var(--text-muted);">${formattedDate} | ${formattedTime}</span>
                </div>

                <div class="pk-match-container">
                    <!-- ฝั่งซ้าย: ของเรา (โทนอุ่น/ทอง) -->
                    <div class="vj-profile-side">
                        <div class="profile-avatar">${ourAvatarHTML}</div>
                        <div class="vj-info-details">
                            <div class="vj-name" title="${nameVal || '-'}">${nameVal || '-'}</div>
                            <div class="vj-id-row">
                                ID: ${bigoIdVal || '-'} 
                                ${bigoIdVal ? `<button class="copy-btn" onclick="copyToClipboard('${bigoIdVal}', this)" title="คัดลอก VJ ID">📋</button>` : ''}
                            </div>
                            <span class="agency-tag">MARS Agency</span>
                        </div>
                    </div>

                    <div class="vs-badge">VS</div>

                    <!-- ฝั่งขวา: คู่แข่ง (โทนเย็น/ฟ้า) -->
                    <div class="vj-profile-side opponent-side">
                        <div class="profile-avatar">${oppAvatarHTML}</div>
                        <div class="vj-info-details">
                            <div class="vj-name" style="color: var(--text-muted);">คู่แข่ง</div>
                            <div class="vj-id-row">
                                ID: ${oppIdVal || '-'} 
                                ${oppIdVal ? `<button class="copy-btn" onclick="copyToClipboard('${oppIdVal}', this)" title="คัดลอก ID คู่แข่ง">📋</button>` : ''}
                            </div>
                            <span class="agency-tag" style="color: #64b5f6; background: rgba(100, 181, 246, 0.1);">${oppAgencyVal || 'ระบุสังกัด'}</span>
                        </div>
                    </div>
                </div>

                <div class="card-bottom-grid">
                    <div class="status-badge ${statusInfo.class}">
                        ${statusInfo.text}
                    </div>
                </div>
            </div>
        `;
        cardList.innerHTML += cardHTML;
    });
}

function renderExternalLinks() {
    let container = document.getElementById("externalLinksContainer");
    if (!container) return;
    container.innerHTML = "";

    if (!externalLinks || externalLinks.length === 0) {
        container.innerHTML = `<div style="font-size: 11.5px; color: var(--text-muted); text-align: left;">ยังไม่มีลิงก์เพิ่มเติม</div>`;
        return;
    }

    let linksListHTML = `<div style="display: flex; flex-direction: column; align-items: flex-start; gap: 8px;">`;
    
    externalLinks.forEach(link => {
        linksListHTML += `
            <a href="${link.url}" target="_blank" class="external-link-card">
                <span class="external-link-name">📌 ${link.name}</span>
            </a>
        `;
    });
    
    linksListHTML += `</div>`;
    container.innerHTML = linksListHTML;
}

function filterCards() {
    let keyword = document.getElementById("searchInput").value.toLowerCase();
    const getVal = (item, keyName) => {
        let foundKey = Object.keys(item).find(k => k.trim().toLowerCase() === keyName.toLowerCase());
        return foundKey ? item[foundKey] : '';
    };

    let filtered = allActivities.filter(item => {
        let name = getVal(item, 'Name').toLowerCase();
        let id = getVal(item, 'BigoID').toLowerCase();
        let oppId = getVal(item, 'OpponentID').toLowerCase();
        return name.includes(keyword) || id.includes(keyword) || oppId.includes(keyword);
    });
    renderCards(filtered);
}

function copyToClipboard(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
        let originalHTML = btn.innerHTML;
        btn.innerHTML = "✅";
        setTimeout(() => {
            btn.innerHTML = originalHTML;
        }, 1200);
    }).catch(err => {
        console.error('คัดลอกไม่สำเร็จ: ', err);
    });
}

window.onload = loadData;