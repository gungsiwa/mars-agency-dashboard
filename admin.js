// --- admin.js: จัดการระบบหลังบ้าน, แบนเนอร์, ลิงก์, ประกาศ และ Visual Editor หน้ากระดาษเรตโบนัสแบบแผ่นยาวพิมพ์สด ---

let activeManagerType = '';

window.initAdminModule = function(supabaseClient) {
    const trigger = document.getElementById('secret-admin-trigger');
    const popup = document.getElementById('admin-menu-popup');
    const loginModal = document.getElementById('login-modal');
    const closeBtn = document.getElementById('close-modal-btn');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (trigger && popup) {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isLogged = localStorage.getItem('mars_admin_logged') === 'true';
            if (isLogged) {
                popup.style.display = popup.style.display === 'block' ? 'none' : 'block';
            } else {
                if (loginModal) loginModal.style.display = 'flex';
            }
        });
    }

    document.addEventListener('click', () => {
        if (popup) popup.style.display = 'none';
    });

    if (closeBtn && loginModal) {
        closeBtn.addEventListener('click', () => {
            loginModal.style.display = 'none';
        });
    }

    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const emailInput = document.getElementById('admin-email').value.trim();
            const passInput = document.getElementById('admin-password').value.trim();
            const errBox = document.getElementById('login-error');

            try {
                const { error } = await supabaseClient.auth.signInWithPassword({
                    email: emailInput,
                    password: passInput
                });

                if (error) throw error;

                localStorage.setItem('mars_admin_logged', 'true');
                if (loginModal) loginModal.style.display = 'none';
                alert('🎉 เข้าสู่ระบบแอดมินสำเร็จ!');
                location.reload();
            } catch (err) {
                if (errBox) {
                    errBox.innerText = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
                    errBox.style.display = 'block';
                }
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            localStorage.removeItem('mars_admin_logged');
            alert('ออกจากระบบเรียบร้อย');
            location.reload();
        });
    }

    // ฟังก์ชันเปิด Manager Modal
    window.openAdminManager = function(type) {
        activeManagerType = type;
        const modal = document.getElementById('admin-manager-modal');
        const titleEl = document.getElementById('manager-title');
        const fieldsContainer = document.getElementById('form-fields-container');
        const listSection = document.getElementById('manager-list-section');
        const defaultSaveBtn = document.getElementById('manager-save-btn');
        
        if (!modal) return;
        modal.style.display = 'flex';
        
        if (listSection) listSection.style.display = 'block';
        if (defaultSaveBtn) defaultSaveBtn.style.display = 'block';

        if (type === 'banner') {
            titleEl.innerText = '🖼️ จัดการแบนเนอร์ภาพสไลด์';
            fieldsContainer.innerHTML = `
                <div style="margin-bottom: 8px;">
                    <label style="display: block; font-size: 12px; color: #aaa; margin-bottom: 4px;">เลือกไฟล์รูปภาพจากเครื่อง/มือถือ:</label>
                    <input type="file" id="m-banner-file" accept="image/*" style="width:100%; padding:6px; background:#1e1e1e; border:1px solid #444; color:#ccc; border-radius:4px; font-size:13px;">
                </div>
                <div>
                    <label style="display: block; font-size: 12px; color: #aaa; margin-bottom: 4px;">URL ลิงก์เมื่อคลิกภาพ (ถ้ามี):</label>
                    <input type="text" id="m-banner-link" placeholder="https://..." style="width:100%; padding:8px; background:#1e1e1e; border:1px solid #444; color:#fff; border-radius:4px; font-size:13px;">
                </div>
            `;
            loadManagerItemList(supabaseClient, type);
        } else if (type === 'link') {
            titleEl.innerText = '🔗 จัดการลิงก์ภายนอก';
            fieldsContainer.innerHTML = `
                <input type="text" id="m-link-title" placeholder="ชื่อลิงก์" style="width:100%; padding:8px; margin-bottom:8px; background:#1e1e1e; border:1px solid #444; color:#fff; border-radius:4px;">
                <input type="text" id="m-link-url" placeholder="URL ปลายทาง" style="width:100%; padding:8px; background:#1e1e1e; border:1px solid #444; color:#fff; border-radius:4px;">
            `;
            loadManagerItemList(supabaseClient, type);
        } else if (type === 'notice') {
            titleEl.innerText = '📢 จัดการข้อความแจ้งเตือน';
            fieldsContainer.innerHTML = `
                <textarea id="m-notice-text" placeholder="ข้อความประกาศด่วน..." style="width:100%; padding:8px; height:80px; background:#1e1e1e; border:1px solid #444; color:#fff; border-radius:4px;"></textarea>
            `;
            loadManagerItemList(supabaseClient, type);
        } else if (type === 'bonus') {
            // 📝 ระบบ Visual Editor หน้ากระดาษเรตโบนัสแบบแผ่นยาวพิมพ์สด (Rich Text)
            titleEl.innerText = '📝 จัดการหน้ากระดาษเรตโบนัส (Visual Editor)';
            fieldsContainer.innerHTML = `
                <!-- แถบเครื่องมือช่วยพิมพ์ (ใช้งานกับข้อความที่คลุมดำ หรือตำแหน่งเคอร์เซอร์) -->
                <div style="background: #0f172a; padding: 10px 14px; border-radius: 8px 8px 0 0; border: 1px solid #334155; border-bottom: none; display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                    <button type="button" onclick="document.execCommand('bold', false, null)" style="padding: 5px 12px; background: #334155; color: #fff; border: 1px solid #475569; border-radius: 4px; cursor: pointer; font-weight: bold;">B</button>
                    <button type="button" onclick="document.execCommand('italic', false, null)" style="padding: 5px 12px; background: #334155; color: #fff; border: 1px solid #475569; border-radius: 4px; cursor: pointer; font-style: italic;">I</button>
                    
                    <span style="color: #475569;">|</span>
                    
                    <select onchange="document.execCommand('fontSize', false, this.value); this.selectedIndex=0;" style="padding: 5px; background: #1e293b; color: #fff; border: 1px solid #475569; border-radius: 4px; font-size: 13px;">
                        <option value="" disabled selected>ขนาดตัวอักษร</option>
                        <option value="3">ปกติ</option>
                        <option value="5">หัวข้อรอง</option>
                        <option value="7">หัวข้อใหญ่</option>
                    </select>

                    <span style="color: #475569;">|</span>

                    <button type="button" onclick="document.execCommand('justifyLeft', false, null)" style="padding: 5px 10px; background: #334155; color: #fff; border: 1px solid #475569; border-radius: 4px; cursor: pointer; font-size: 13px;">⬅️ ซ้าย</button>
                    <button type="button" onclick="document.execCommand('justifyCenter', false, null)" style="padding: 5px 10px; background: #334155; color: #fff; border: 1px solid #475569; border-radius: 4px; cursor: pointer; font-size: 13px;">↔️ กลาง</button>
                    <button type="button" onclick="document.execCommand('justifyRight', false, null)" style="padding: 5px 10px; background: #334155; color: #fff; border: 1px solid #475569; border-radius: 4px; cursor: pointer; font-size: 13px;">➡️ ขวา</button>

                    <span style="color: #475569;">|</span>

                    <button type="button" onclick="window.insertImageToCanvas()" style="padding: 5px 14px; background: #38bdf8; color: #0f172a; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 13px;">🖼️ แทรกรูปภาพ</button>
                </div>

                <!-- หน้ากระดาษขาวยาวแผ่นเดียวสำหรับพิมพ์เนื้อหา -->
                <div id="bonus-paper-editor" contenteditable="true" style="background: #ffffff; color: #1e293b; width: 100%; min-height: 500px; max-height: 65vh; border-radius: 0 0 8px 8px; padding: 35px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.1); overflow-y: auto; border: 1px solid #cbd5e1; outline: none; font-family: 'Prompt', sans-serif; font-size: 16px; line-height: 1.6;">
                    กำลังโหลดข้อมูลหน้ากระดาษ...
                </div>

                <div style="margin-top: 15px; text-align: right;">
                    <button type="button" onclick="window.saveVisualCanvas()" style="background: #10b981; color: #fff; border: none; padding: 10px 24px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 15px;">💾 บันทึกหน้ากระดาษทั้งหมด</button>
                </div>
            `;
            if (listSection) listSection.style.display = 'none';
            if (defaultSaveBtn) defaultSaveBtn.style.display = 'none';
            
            loadVisualCanvasData(supabaseClient);
        }
    };

    window.closeAdminManager = function() {
        const modal = document.getElementById('admin-manager-modal');
        if (modal) modal.style.display = 'none';
    };

    window.saveNewItem = async function() {
        let tableName = activeManagerType === 'banner' ? 'site_banners' : (activeManagerType === 'link' ? 'external_links' : 'site_notices');
        try {
            if (activeManagerType === 'banner') {
                const fileInput = document.getElementById('m-banner-file');
                const linkInput = document.getElementById('m-banner-link');
                if (!fileInput.files || fileInput.files.length === 0) {
                    alert('กรุณาเลือกไฟล์รูปภาพ');
                    return;
                }

                const file = fileInput.files[0];
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
                const filePath = `banners/${fileName}`;

                const { error: uploadError } = await supabaseClient.storage.from('site-assets').upload(filePath, file);
                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabaseClient.storage.from('site-assets').getPublicUrl(filePath);
                const imageUrl = publicUrlData.publicUrl;
                const linkUrl = linkInput ? linkInput.value.trim() : '';

                await supabaseClient.from(tableName).insert([{ image_url: imageUrl, link_url: linkUrl }]);
                alert('อัปโหลดและบันทึกแบนเนอร์สำเร็จ!');
            } else if (activeManagerType === 'link') {
                const title = document.getElementById('m-link-title').value;
                const url = document.getElementById('m-link-url').value;
                await supabaseClient.from(tableName).insert([{ title, url }]);
                alert('บันทึกข้อมูลสำเร็จ!');
            } else if (activeManagerType === 'notice') {
                const message = document.getElementById('m-notice-text').value;
                await supabaseClient.from(tableName).delete().neq('id', 0);
                await supabaseClient.from(tableName).insert([{ message }]);
                alert('บันทึกข้อความแจ้งเตือนสำเร็จ!');
            }
            loadManagerItemList(supabaseClient, activeManagerType);
            location.reload();
        } catch (err) {
            console.error('Save error:', err);
            alert('เกิดข้อผิดพลาด: ' + err.message);
        }
    };

    window.deleteItem = async function(table, id) {
        if (!confirm('ต้องการลบรายการนี้ใช่หรือไม่?')) return;
        try {
            await supabaseClient.from(table).delete().eq('id', id);
            loadManagerItemList(supabaseClient, activeManagerType);
            location.reload();
        } catch (err) {
            alert('ลบไม่สำเร็จ');
        }
    };
};

async function loadManagerItemList(supabaseClient, type) {
    const listContainer = document.getElementById('manager-item-list');
    if (!listContainer || !supabaseClient) return;
    listContainer.innerHTML = '<div style="color:#888; text-align:center;">กำลังโหลด...</div>';

    let tableName = type === 'banner' ? 'site_banners' : (type === 'link' ? 'external_links' : 'site_notices');
    try {
        const { data } = await supabaseClient.from(tableName).select('*');
        if (!data || data.length === 0) {
            listContainer.innerHTML = '<div style="color:#888; text-align:center;">ไม่มีข้อมูล</div>';
            return;
        }
        let html = '';
        data.forEach(item => {
            const label = item.message || item.link_url || item.title || item.url || 'รายการ';
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:6px; border-bottom:1px solid #333; font-size:12px;">
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:320px;">${escapeHtml(label)}</span>
                    <button onclick="deleteItem('${tableName}', ${item.id})" style="background:#dc3545; color:#fff; border:none; padding:2px 6px; border-radius:4px; cursor:pointer; font-size:11px;">ลบ</button>
                </div>
            `;
        });
        listContainer.innerHTML = html;
    } catch (e) {
        listContainer.innerHTML = '<div style="color:#f87171; text-align:center;">โหลดไม่สำเร็จ</div>';
    }
}

// ================= 📝 ระบบจัดการหน้ากระดาษเรตโบนัส (Rich Text Editor) =================
async function loadVisualCanvasData(supabaseClient) {
    if (!supabaseClient) return;
    const paper = document.getElementById('bonus-paper-editor');
    if (!paper) return;

    try {
        const { data, error } = await supabaseClient.from('agency_bonus_page').select('*').limit(1);
        if (!error && data && data.length > 0) {
            paper.innerHTML = data[0].content || 'พิมพ์รายละเอียดเรตโบนัสประจำสังกัดที่นี่...';
        } else {
            paper.innerHTML = '<p>พิมพ์รายละเอียดเรตโบนัสประจำสังกัดที่นี่...</p>';
        }
    } catch (err) {
        paper.innerHTML = '<p>พิมพ์รายละเอียดเรตโบนัสประจำสังกัดที่นี่...</p>';
    }
}

window.insertImageToCanvas = function() {
    const url = prompt('กรุณาวาง URL ของรูปภาพ (เช่น https://...):');
    if (url) {
        document.execCommand('insertImage', false, url);
    }
};

window.saveVisualCanvas = async function() {
    const supabaseClient = window.supabase ? window.supabase.createClient('https://ngdshyexremewbpnlrae.supabase.co', 'sb_publishable_NcBG60jTTDqonaFiD1RwKw_etSq5A2o') : null;
    const paper = document.getElementById('bonus-paper-editor');
    if (!supabaseClient || !paper) return;

    try {
        const htmlContent = paper.innerHTML;
        await supabaseClient.from('agency_bonus_page').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabaseClient.from('agency_bonus_page').insert([{ content: htmlContent, element_type: 'html' }]);

        alert('💾 บันทึกหน้ากระดาษเรตโบนัสเรียบร้อยแล้ว!');
        closeAdminManager();
    } catch (err) {
        console.error("Save error:", err);
        alert('เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
    }
};

function escapeHtml(str) {
    if (!str) return '';
    return str.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}