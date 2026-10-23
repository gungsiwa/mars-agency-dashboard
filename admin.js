// --- admin.js: จัดการระบบหลังบ้าน, แบนเนอร์, ลิงก์, ประกาศ (Full Page) และ Visual Editor หน้ากระดาษเรตโบนัส ---

let activeManagerType = '';
let currentSupabaseClient = null;
let currentEditingId = null; 
let tempEditingImageUrl = ''; 

// ฟังก์ชันลบแถบเครื่องมือรูปภาพ
function removeImageToolbar() {
    const existing = document.getElementById('custom-img-toolbar');
    if (existing) existing.remove();
}

// ฟังก์ชันแสดงแถบเมนูลอยปรับขนาดรูปภาพเมื่อคลิกที่รูปใน Editor
function showImageToolbar(img) {
    removeImageToolbar();
    const rect = img.getBoundingClientRect();
    const toolbar = document.createElement('div');
    toolbar.id = 'custom-img-toolbar';
    toolbar.style.position = 'absolute';
    toolbar.style.top = (window.scrollY + rect.top - 45) + 'px';
    toolbar.style.left = (window.scrollX + rect.left) + 'px';
    toolbar.style.background = '#0f172a';
    toolbar.style.border = '1px solid #334155';
    toolbar.style.borderRadius = '6px';
    toolbar.style.padding = '5px 8px';
    toolbar.style.display = 'flex';
    toolbar.style.gap = '5px';
    toolbar.style.zIndex = '100000';
    toolbar.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    toolbar.style.alignItems = 'center';

    const sizes = [
        { label: '100%', val: '100%' },
        { label: '75%', val: '75%' },
        { label: '50%', val: '50%' },
        { label: '25%', val: '25%' }
    ];

    sizes.forEach(s => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.innerText = s.label;
        btn.style.background = '#334155';
        btn.style.color = '#fff';
        btn.style.border = 'none';
        btn.style.padding = '3px 8px';
        btn.style.borderRadius = '4px';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '12px';
        btn.onclick = () => {
            img.style.width = s.val;
            img.style.height = 'auto';
            removeImageToolbar();
        };
        toolbar.appendChild(btn);
    });

    // ปุ่มกำหนดขนาดเอง
    const customBtn = document.createElement('button');
    customBtn.type = 'button';
    customBtn.innerText = '⚙️ กำหนดเอง';
    customBtn.style.background = '#0284c7';
    customBtn.style.color = '#fff';
    customBtn.style.border = 'none';
    customBtn.style.padding = '3px 8px';
    customBtn.style.borderRadius = '4px';
    customBtn.style.cursor = 'pointer';
    customBtn.style.fontSize = '12px';
    customBtn.onclick = () => {
        const val = prompt('กรอกขนาดความกว้าง (เช่น 80%, 400px):', img.style.width || '100%');
        if (val) {
            img.style.width = val.trim();
            img.style.height = 'auto';
        }
        removeImageToolbar();
    };
    toolbar.appendChild(customBtn);

    // ปุ่มลบรูปภาพ
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.innerText = '🗑️ ลบภาพ';
    delBtn.style.background = '#dc2626';
    delBtn.style.color = '#fff';
    delBtn.style.border = 'none';
    delBtn.style.padding = '3px 8px';
    delBtn.style.borderRadius = '4px';
    delBtn.style.cursor = 'pointer';
    delBtn.style.fontSize = '12px';
    delBtn.onclick = () => {
        if (confirm('ต้องการลบรูปภาพนี้ใช่หรือไม่?')) {
            img.remove();
        }
        removeImageToolbar();
    };
    toolbar.appendChild(delBtn);

    document.body.appendChild(toolbar);
}

window.initAdminModule = function(supabaseClient) {
    currentSupabaseClient = supabaseClient;
    
    // จัดการคลิกรูปภาพเพื่อเปิด Floating Toolbar
    if (!window._imageResizeListenerAdded) {
        window._imageResizeListenerAdded = true;
        document.addEventListener('click', function(e) {
            const img = e.target.closest('#announcement-editor img, #bonus-paper-editor img');
            if (img) {
                e.stopPropagation();
                showImageToolbar(img);
                return;
            }
            if (!e.target.closest('#custom-img-toolbar')) {
                removeImageToolbar();
            }
        });
    }

    // ฉีด Style ให้รูปภาพย่อตัวไม่ให้ล้นมือถือ และแสดงกรอบเมื่อเอาเมาส์ชี้
    if (!document.getElementById('admin-editor-responsive-style')) {
        const style = document.createElement('style');
        style.id = 'admin-editor-responsive-style';
        style.innerHTML = `
            #announcement-editor, #bonus-paper-editor {
                overflow-x: hidden !important;
                word-break: break-word;
            }
            #announcement-editor img, #bonus-paper-editor img {
                max-width: 100% !important;
                height: auto;
                display: block;
                margin: 10px auto;
                cursor: pointer;
            }
            #announcement-editor img:hover, #bonus-paper-editor img:hover {
                outline: 2px dashed #38bdf8;
            }
        `;
        document.head.appendChild(style);
    }
    
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
        
        if (!window._isEditingTriggered) {
            currentEditingId = null;
            tempEditingImageUrl = '';
        }
        window._isEditingTriggered = false;

        const modal = document.getElementById('admin-manager-modal');
        const titleEl = document.getElementById('manager-title');
        const fieldsContainer = document.getElementById('form-fields-container');
        const listSection = document.getElementById('manager-list-section');
        const defaultSaveBtn = document.getElementById('manager-save-btn');
        
        if (!modal) return;
        
        modal.style.display = 'block';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        modal.style.zIndex = '99999';
        modal.style.overflowY = 'auto';
        modal.style.padding = '20px 10px';
        modal.style.boxSizing = 'border-box';
        
        const modalContentBox = modal.querySelector('div') || modal;
        modalContentBox.style.width = '100%';
        modalContentBox.style.maxWidth = '650px';
        modalContentBox.style.margin = '0 auto';
        modalContentBox.style.boxSizing = 'border-box';
        modalContentBox.style.height = 'auto';
        modalContentBox.style.maxHeight = 'none';
        modalContentBox.style.overflow = 'visible';
        modalContentBox.style.position = 'relative';

        document.body.style.overflow = 'hidden';
        
        if (listSection) listSection.style.display = 'block';
        if (defaultSaveBtn) {
            defaultSaveBtn.style.display = 'block';
            defaultSaveBtn.innerText = currentEditingId ? '💾 บันทึกการแก้ไข' : '💾 บันทึกข้อมูล';
        }

        if (type === 'banner') {
            titleEl.innerText = currentEditingId ? '✏️ แก้ไขแบนเนอร์ภาพสไลด์' : '🖼️ จัดการแบนเนอร์ภาพสไลด์';
            fieldsContainer.innerHTML = `
                <div style="margin-bottom: 8px;">
                    <label style="display: block; font-size: 12px; color: #aaa; margin-bottom: 4px;">เลือกไฟล์รูปภาพใหม่ (ถ้าต้องการเปลี่ยน):</label>
                    <input type="file" id="m-banner-file" accept="image/*" style="width:100%; box-sizing: border-box; padding:6px; background:#1e1e1e; border:1px solid #444; color:#ccc; border-radius:4px; font-size:13px;">
                </div>
                <div>
                    <label style="display: block; font-size: 12px; color: #aaa; margin-bottom: 4px;">URL ลิงก์เมื่อคลิกภาพ (ถ้ามี):</label>
                    <input type="text" id="m-banner-link" placeholder="https://..." style="width:100%; box-sizing: border-box; padding:8px; background:#1e1e1e; border:1px solid #444; color:#fff; border-radius:4px; font-size:13px;">
                </div>
            `;
            loadManagerItemList(supabaseClient, type);
        } else if (type === 'link') {
            titleEl.innerText = currentEditingId ? '✏️ แก้ไขลิงก์ภายนอก' : '🔗 จัดการลิงก์ภายนอก';
            fieldsContainer.innerHTML = `
                <input type="text" id="m-link-title" placeholder="ชื่อลิงก์" style="width:100%; box-sizing: border-box; padding:8px; margin-bottom:8px; background:#1e1e1e; border:1px solid #444; color:#fff; border-radius:4px;">
                <input type="text" id="m-link-url" placeholder="URL ปลายทาง" style="width:100%; box-sizing: border-box; padding:8px; background:#1e1e1e; border:1px solid #444; color:#fff; border-radius:4px;">
            `;
            loadManagerItemList(supabaseClient, type);
        } else if (type === 'notice') {
            titleEl.innerText = currentEditingId ? '✏️ แก้ไขข้อความแจ้งเตือน' : '📢 จัดการข้อความแจ้งเตือน';
            fieldsContainer.innerHTML = `
                <textarea id="m-notice-text" placeholder="ข้อความประกาศด่วน..." style="width:100%; box-sizing: border-box; padding:8px; height:80px; background:#1e1e1e; border:1px solid #444; color:#fff; border-radius:4px;"></textarea>
            `;
            loadManagerItemList(supabaseClient, type);
        } else if (type === 'announcement') {
            titleEl.innerText = currentEditingId ? '✏️ แก้ไขประกาศและกิจกรรมหน้าเว็บไซต์' : '📢 จัดการประกาศและกิจกรรมหน้าเว็บไซต์';
            fieldsContainer.innerHTML = `
                <div style="margin-bottom: 10px;">
                    <label style="display: block; font-size: 12px; color: #aaa; margin-bottom: 4px;">หัวข้อประกาศ:</label>
                    <input type="text" id="m-ann-title" placeholder="ชื่อหัวข้อประกาศ..." style="width:100%; box-sizing: border-box; padding:8px; background:#1e1e1e; border:1px solid #444; color:#fff; border-radius:4px; font-size:13px;">
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; font-size: 12px; color: #aaa; margin-bottom: 4px;">รูปภาพหน้าปกหลัก (เลือกไฟล์ใหม่ถ้าต้องการเปลี่ยน):</label>
                    <input type="file" id="m-ann-file" accept="image/*" style="width:100%; box-sizing: border-box; padding:6px; background:#1e1e1e; border:1px solid #444; color:#ccc; border-radius:4px; font-size:13px;">
                </div>
                <label style="display: block; font-size: 12px; color: #aaa; margin-bottom: 4px;">เนื้อหาหน้ารายละเอียดประกาศ (คลิกที่รูปเพื่อปรับขนาดด่วน):</label>
                <!-- แถบเครื่องมือช่วยพิมพ์ -->
                <div style="background: #0f172a; padding: 8px 12px; border-radius: 8px 8px 0 0; border: 1px solid #334155; border-bottom: none; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; box-sizing: border-box;">
                    <button type="button" onclick="document.execCommand('bold', false, null)" style="padding: 4px 10px; background: #334155; color: #fff; border: 1px solid #475569; border-radius: 4px; cursor: pointer; font-weight: bold;">B</button>
                    <button type="button" onclick="document.execCommand('italic', false, null)" style="padding: 4px 10px; background: #334155; color: #fff; border: 1px solid #475569; border-radius: 4px; cursor: pointer; font-style: italic;">I</button>
                    <select onchange="document.execCommand('fontSize', false, this.value); this.selectedIndex=0;" style="padding: 4px; background: #1e293b; color: #fff; border: 1px solid #475569; border-radius: 4px; font-size: 12px;">
                        <option value="" disabled selected>ขนาดตัวอักษร</option>
                        <option value="3">ปกติ</option>
                        <option value="5">หัวข้อรอง</option>
                        <option value="7">หัวข้อใหญ่</option>
                    </select>
                    <span style="color: #475569;">|</span>
                    <button type="button" onclick="document.execCommand('justifyLeft', false, null)" style="padding: 4px 8px; background: #334155; color: #fff; border: 1px solid #475569; border-radius: 4px; cursor: pointer; font-size: 12px;">⬅️ ซ้าย</button>
                    <button type="button" onclick="document.execCommand('justifyCenter', false, null)" style="padding: 4px 8px; background: #334155; color: #fff; border: 1px solid #475569; border-radius: 4px; cursor: pointer; font-size: 12px;">↔️ กลาง</button>
                    <button type="button" onclick="document.execCommand('justifyRight', false, null)" style="padding: 4px 8px; background: #334155; color: #fff; border: 1px solid #475569; border-radius: 4px; cursor: pointer; font-size: 12px;">➡️ ขวา</button>
                    <span style="color: #475569;">|</span>
                    <button type="button" onclick="window.insertImageToCanvas()" style="padding: 4px 10px; background: #38bdf8; color: #0f172a; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 12px;">🖼️ แทรกรูป</button>
                    <button type="button" onclick="window.insertLinkToCanvas()" style="padding: 4px 10px; background: #f59e0b; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 12px;">🔗 แทรก ลิงก์</button>
                </div>
                <!-- พื้นที่พิมพ์เนื้อหา -->
                <div id="announcement-editor" contenteditable="true" style="background: #ffffff; color: #1e293b; width: 100%; box-sizing: border-box; min-height: 250px; border-radius: 0 0 8px 8px; padding: 20px; border: 1px solid #cbd5e1; outline: none; font-family: 'Prompt', sans-serif; font-size: 15px; line-height: 1.6;">
                    พิมพ์รายละเอียดกิจกรรมหรือเนื้อหาประกาศที่นี่...
                </div>
            `;
            loadManagerItemList(supabaseClient, type);
        } else if (type === 'bonus') {
            titleEl.innerText = '📝 จัดการหน้ากระดาษเรตโบนัส (Visual Editor)';
            fieldsContainer.innerHTML = `
                <!-- แถบเครื่องมือช่วยพิมพ์ -->
                <div style="background: #0f172a; padding: 10px 14px; border-radius: 8px 8px 0 0; border: 1px solid #334155; border-bottom: none; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; box-sizing: border-box;">
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
                    <button type="button" onclick="window.loadVisualCanvasData()" style="padding: 5px 12px; background: #10b981; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 13px; margin-left: auto;">🔄 ดึงข้อมูลใหม่</button>
                </div>

                <!-- หน้ากระดาษขาวยาวแผ่นเดียวสำหรับพิมพ์เนื้อหา -->
                <div id="bonus-paper-editor" contenteditable="true" style="background: #ffffff; color: #1e293b; width: 100%; box-sizing: border-box; min-height: 500px; border-radius: 0 0 8px 8px; padding: 35px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.1); border: 1px solid #cbd5e1; outline: none; font-family: 'Prompt', sans-serif; font-size: 16px; line-height: 1.6;">
                    กำลังโหลดข้อมูลหน้ากระดาษ...
                </div>

                <div style="margin-top: 15px; text-align: right;">
                    <button type="button" onclick="window.saveVisualCanvas()" style="background: #10b981; color: #fff; border: none; padding: 10px 24px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 15px;">💾 บันทึกหน้ากระดาษทั้งหมด</button>
                </div>
            `;
            if (listSection) listSection.style.display = 'none';
            if (defaultSaveBtn) defaultSaveBtn.style.display = 'none';
            
            window.loadVisualCanvasData();
        }
    };

    window.closeAdminManager = function() {
        removeImageToolbar();
        const modal = document.getElementById('admin-manager-modal');
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        currentEditingId = null;
        tempEditingImageUrl = '';
    };

    window.saveNewItem = async function() {
        let tableName = activeManagerType === 'banner' ? 'site_banners' : 
                        (activeManagerType === 'link' ? 'external_links' : 
                        (activeManagerType === 'notice' ? 'site_notices' : 'announcements'));
        try {
            if (activeManagerType === 'announcement') {
                const titleInput = document.getElementById('m-ann-title').value.trim();
                const fileInput = document.getElementById('m-ann-file');
                const editor = document.getElementById('announcement-editor');
                const contentHtml = editor ? editor.innerHTML : '';

                if (!titleInput) {
                    alert('กรุณากรอกหัวข้อประกาศ');
                    return;
                }

                let popupImageUrl = tempEditingImageUrl;
                if (fileInput.files && fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    const fileExt = file.name.split('.').pop();
                    const fileName = `ann_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
                    const filePath = `announcements/${fileName}`;

                    const { error: uploadError } = await supabaseClient.storage.from('site-assets').upload(filePath, file);
                    if (uploadError) throw uploadError;

                    const { data: publicUrlData } = supabaseClient.storage.from('site-assets').getPublicUrl(filePath);
                    popupImageUrl = publicUrlData.publicUrl;
                }

                if (currentEditingId) {
                    const { error: updateError } = await supabaseClient.from(tableName).update({
                        title: titleInput,
                        popup_image: popupImageUrl,
                        content: contentHtml
                    }).eq('id', currentEditingId);
                    if (updateError) throw updateError;
                    alert('✏️ อัปเดตประกาศสำเร็จ!');
                } else {
                    const { error: insertError } = await supabaseClient.from(tableName).insert([{
                        title: titleInput,
                        popup_image: popupImageUrl,
                        content: contentHtml,
                        is_active: true // ค่าเริ่มต้นให้เปิดใช้งานเมื่อสร้างใหม่
                    }]);
                    if (insertError) throw insertError;
                    alert('🎉 บันทึกประกาศสำเร็จ!');
                }
            } else if (activeManagerType === 'banner') {
                const fileInput = document.getElementById('m-banner-file');
                const linkInput = document.getElementById('m-banner-link');
                
                let imageUrl = tempEditingImageUrl;
                if (fileInput.files && fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
                    const filePath = `banners/${fileName}`;

                    const { error: uploadError } = await supabaseClient.storage.from('site-assets').upload(filePath, file);
                    if (uploadError) throw uploadError;

                    const { data: publicUrlData } = supabaseClient.storage.from('site-assets').getPublicUrl(filePath);
                    imageUrl = publicUrlData.publicUrl;
                }

                if (!currentEditingId && !imageUrl) {
                    alert('กรุณาเลือกไฟล์รูปภาพ');
                    return;
                }

                const linkUrl = linkInput ? linkInput.value.trim() : '';

                if (currentEditingId) {
                    await supabaseClient.from(tableName).update({ image_url: imageUrl, link_url: linkUrl }).eq('id', currentEditingId);
                    alert('อัปเดตแบนเนอร์สำเร็จ!');
                } else {
                    await supabaseClient.from(tableName).insert([{ image_url: imageUrl, link_url: linkUrl }]);
                    alert('อัปโหลดและบันทึกแบนเนอร์สำเร็จ!');
                }
            } else if (activeManagerType === 'link') {
                const title = document.getElementById('m-link-title').value;
                const url = document.getElementById('m-link-url').value;

                if (currentEditingId) {
                    await supabaseClient.from(tableName).update({ title, url }).eq('id', currentEditingId);
                    alert('อัปเดตลิงก์สำเร็จ!');
                } else {
                    await supabaseClient.from(tableName).insert([{ title, url }]);
                    alert('บันทึกข้อมูลสำเร็จ!');
                }
            } else if (activeManagerType === 'notice') {
                const message = document.getElementById('m-notice-text').value;
                await supabaseClient.from(tableName).delete().neq('id', 0);
                await supabaseClient.from(tableName).insert([{ message }]);
                alert('บันทึกข้อความแจ้งเตือนสำเร็จ!');
            }

            currentEditingId = null;
            tempEditingImageUrl = '';
            loadManagerItemList(supabaseClient, activeManagerType);
            location.reload();
        } catch (err) {
            console.error('Save error:', err);
            alert('เกิดข้อผิดพลาด: ' + err.message);
        }
    };

    window.editItem = async function(table, id) {
        if (!supabaseClient) return;
        try {
            const { data, error } = await supabaseClient.from(table).select('*').eq('id', id).single();
            if (error) throw error;
            if (!data) return;

            currentEditingId = id;
            window._isEditingTriggered = true;

            let type = 'announcement';
            if (table === 'site_banners') type = 'banner';
            else if (table === 'external_links') type = 'link';
            else if (table === 'site_notices') type = 'notice';

            openAdminManager(type);

            setTimeout(() => {
                if (type === 'announcement') {
                    document.getElementById('m-ann-title').value = data.title || '';
                    const editor = document.getElementById('announcement-editor');
                    if (editor) editor.innerHTML = data.content || '';
                    tempEditingImageUrl = data.popup_image || '';
                } else if (type === 'banner') {
                    document.getElementById('m-banner-link').value = data.link_url || '';
                    tempEditingImageUrl = data.image_url || '';
                } else if (type === 'link') {
                    document.getElementById('m-link-title').value = data.title || '';
                    document.getElementById('m-link-url').value = data.url || '';
                } else if (type === 'notice') {
                    document.getElementById('m-notice-text').value = data.message || '';
                }

                const saveBtn = document.getElementById('manager-save-btn');
                if (saveBtn) saveBtn.innerText = '💾 บันทึกการแก้ไข';
            }, 100);

        } catch (err) {
            console.error('Edit load error:', err);
            alert('ไม่สามารถโหลดข้อมูลมาแก้ไขได้: ' + err.message);
        }
    };

    window.deleteItem = async function(table, id) {
        if (!confirm('⚠️ คุณต้องการลบรายการนี้ใช่หรือไม่?')) return;
        try {
            const { error } = await supabaseClient.from(table).delete().eq('id', id);
            if (error) throw error;
            
            alert('🗑️ ลบข้อมูลสำเร็จ!');
            loadManagerItemList(supabaseClient, activeManagerType);
            location.reload();
        } catch (err) {
            console.error('Delete error:', err);
            alert('ลบไม่สำเร็จ: ' + err.message);
        }
    };

    // ฟังก์ชันสำหรับเปิด-ปิดสถานะ Active โดยตรงจากรายการปัจจุบัน
    window.toggleItemActive = async function(table, id, currentStatus) {
        if (!supabaseClient) return;
        try {
            const newStatus = !currentStatus;
            const { error } = await supabaseClient.from(table).update({ is_active: newStatus }).eq('id', id);
            if (error) throw error;
            
            loadManagerItemList(supabaseClient, activeManagerType);
            // รีโหลดหน้าหลักเพื่อให้ Sidebar และ Popup อัปเดตตามทันที
            setTimeout(() => location.reload(), 500);
        } catch (err) {
            console.error('Toggle active error:', err);
            alert('เปลี่ยนสถานะไม่สำเร็จ: ' + err.message);
        }
    };
};

async function loadManagerItemList(supabaseClient, type) {
    const listContainer = document.getElementById('manager-item-list');
    if (!listContainer || !supabaseClient) return;
    listContainer.innerHTML = '<div style="color:#888; text-align:center;">กำลังโหลด...</div>';

    let tableName = type === 'banner' ? 'site_banners' : (type === 'link' ? 'external_links' : (type === 'notice' ? 'site_notices' : 'announcements'));
    try {
        const { data, error } = await supabaseClient.from(tableName).select('*').order('created_at', { ascending: false });
        if (error) throw error;

        if (!data || data.length === 0) {
            listContainer.innerHTML = '<div style="color:#888; text-align:center;">ไม่มีข้อมูล</div>';
            return;
        }

        let html = '';
        data.forEach(item => {
            const label = item.title || item.message || item.link_url || item.url || 'รายการ';
            
            const imgUrl = item.image_url || item.popup_image || '';
            let thumbHtml = '';
            if (imgUrl) {
                thumbHtml = `<img src="${imgUrl}" alt="Preview" style="width: 28px; height: 28px; object-fit: cover; border-radius: 4px; border: 1px solid #555; flex-shrink: 0;">`;
            } else {
                thumbHtml = `<span style="font-size: 16px; flex-shrink: 0;">📄</span>`;
            }

            // ถ้าเป็นตาราง announcements ให้แสดง Checkbox เปิด-ปิด Active ไว้ที่แถวด้วย
            let activeControlHtml = '';
            if (tableName === 'announcements') {
                const isActive = item.is_active ? 'checked' : '';
                activeControlHtml = `
                    <label style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: #4ade80; cursor: pointer; margin-right: 4px;" title="ติ๊กเพื่อเปิด/ปิดใช้งานประกาศนี้">
                        <input type="checkbox" ${isActive} onchange="toggleItemActive('${tableName}', '${item.id}', ${item.is_active})" style="width: 13px; height: 13px; accent-color: #10b981; cursor: pointer;">
                        Active
                    </label>
                `;
            }

            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 6px; border-bottom:1px solid #333; font-size:12px; gap: 8px; box-sizing: border-box;">
                    <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; flex: 1; min-width: 0;">
                        ${thumbHtml}
                        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color: #fff; width: 100%;">${escapeHtml(label)}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
                        ${activeControlHtml}
                        <button onclick="editItem('${tableName}', '${item.id}')" style="background:#f59e0b; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:11px;">แก้ไข</button>
                        <button onclick="deleteItem('${tableName}', '${item.id}')" style="background:#dc3545; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:11px;">ลบ</button>
                    </div>
                </div>
            `;
        });
        listContainer.innerHTML = html;
    } catch (e) {
        console.error('Load list error:', e);
        listContainer.innerHTML = '<div style="color:#f87171; text-align:center;">โหลดไม่สำเร็จ</div>';
    }
}

// ================= 📝 ระบบจัดการหน้ากระดาษเรตโบนัส (Visual Editor) =================
window.loadVisualCanvasData = async function() {
    const paper = document.getElementById('bonus-paper-editor');
    if (!paper) return;

    paper.innerHTML = '<p style="color: #94a3b8; text-align: center; margin-top: 50px;">กำลังโหลดข้อมูล...</p>';

    let client = currentSupabaseClient;
    if (!client && window.supabase) {
        client = window.supabase.createClient('https://ngdshyexremewbpnlrae.supabase.co', 'sb_publishable_NcBG60jTTDqonaFiD1RwKw_etSq5A2o');
    }

    if (!client) {
        paper.innerHTML = '<p style="color: #ef4444; text-align: center;">ไม่พบการเชื่อมต่อฐานข้อมูล</p>';
        return;
    }

    try {
        const { data, error } = await client
            .from('agency_bonus_page')
            .select('*');

        if (error) throw error;

        if (data && data.length > 0) {
            const validRow = data.find(item => item.content) || data[0];
            if (validRow && validRow.content) {
                paper.innerHTML = validRow.content;
            } else {
                paper.innerHTML = '<p>พิมพ์รายละเอียดเรตโบนัสประจำสังกัดที่นี่...</p>';
            }
        } else {
            paper.innerHTML = '<p>พิมพ์รายละเอียดเรตโบนัสประจำสังกัดที่นี่...</p>';
        }
    } catch (err) {
        console.error("Load error:", err);
        paper.innerHTML = '<p style="color: #ef4444; text-align: center;">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
};

// ฟังก์ชันเลือกไฟล์ภาพจากเครื่องแล้วอัปโหลดขึ้น Supabase Storage อัตโนมัติสำหรับ Rich Text Editor
window.insertImageToCanvas = function() {
    let client = currentSupabaseClient;
    if (!client && window.supabase) {
        client = window.supabase.createClient('https://ngdshyexremewbpnlrae.supabase.co', 'sb_publishable_NcBG60jTTDqonaFiD1RwKw_etSq5A2o');
    }

    if (!client) {
        alert('ไม่พบการเชื่อมต่อฐานข้อมูล');
        return;
    }

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    fileInput.click();

    fileInput.onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) {
            fileInput.remove();
            return;
        }

        try {
            alert('⏳ กำลังอัปโหลดรูปภาพ กรุณารอสักครู่...');
            const fileExt = file.name.split('.').pop();
            const fileName = `editor_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
            const filePath = `editor-images/${fileName}`;

            const { error: uploadError } = await client.storage.from('site-assets').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data: publicUrlData } = client.storage.from('site-assets').getPublicUrl(filePath);
            const imageUrl = publicUrlData.publicUrl;

            document.execCommand('insertImage', false, imageUrl);
            alert('✅ อัปโหลดและแทรกรูปภาพสำเร็จ!');
        } catch (err) {
            console.error('Image upload error:', err);
            alert('อัปโหลดรูปภาพไม่สำเร็จ: ' + err.message);
        } finally {
            fileInput.remove();
        }
    };
};

window.insertLinkToCanvas = function() {
    const url = prompt('กรุณาใส่ URL ปลายทาง (เช่น https://...):');
    if (url) {
        document.execCommand('createLink', false, url);
    }
};

window.saveVisualCanvas = async function() {
    removeImageToolbar();
    let client = currentSupabaseClient;
    if (!client && window.supabase) {
        client = window.supabase.createClient('https://ngdshyexremewbpnlrae.supabase.co', 'sb_publishable_NcBG60jTTDqonaFiD1RwKw_etSq5A2o');
    }

    const paper = document.getElementById('bonus-paper-editor');
    if (!client || !paper) return;

    try {
        const htmlContent = paper.innerHTML;

        const { data: existingRows } = await client.from('agency_bonus_page').select('id');
        if (existingRows && existingRows.length > 0) {
            const idsToDelete = existingRows.map(row => row.id);
            await client.from('agency_bonus_page').delete().in('id', idsToDelete);
        }

        const { error } = await client.from('agency_bonus_page').insert([{ 
            content: htmlContent, 
            element_type: 'html' 
        }]);

        if (error) throw error;

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