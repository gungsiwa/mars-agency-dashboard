// --- admin.js: จัดการระบบหลังบ้าน (Supabase Auth & Admin Manager) ---

let activeManagerType = '';

export function initAdminModule(supabase, onDataChanged) {
    const trigger = document.getElementById('admin-trigger');
    const menuPopup = document.getElementById('admin-menu-popup');
    const modal = document.getElementById('login-modal');
    const closeBtn = document.getElementById('close-modal-btn');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const emailInput = document.getElementById('admin-email');
    const passwordInput = document.getElementById('admin-password');
    const errorMsg = document.getElementById('login-error');

    let isAdminLoggedIn = false;

    if (trigger) {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!isAdminLoggedIn) {
                if (modal) {
                    modal.style.display = 'flex';
                    if (emailInput) setTimeout(() => emailInput.focus(), 100);
                }
            } else {
                if (menuPopup) {
                    menuPopup.style.display = menuPopup.style.display === 'block' ? 'none' : 'block';
                }
            }
        });
    }

    document.addEventListener('click', () => {
        if (menuPopup) menuPopup.style.display = 'none';
    });

    if (menuPopup) menuPopup.addEventListener('click', (e) => e.stopPropagation());

    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            if (errorMsg) errorMsg.style.display = 'none';
        });
    }

    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (!email || !password) {
                errorMsg.textContent = 'กรุณากรอกอีเมลและรหัสผ่าน';
                errorMsg.style.display = 'block';
                return;
            }

            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                errorMsg.textContent = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
                errorMsg.style.display = 'block';
            } else {
                modal.style.display = 'none';
                emailInput.value = '';
                passwordInput.value = '';
                if (errorMsg) errorMsg.style.display = 'none';
                enableAdminMode(data.user?.email);
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();
            disableAdminMode();
            if (menuPopup) menuPopup.style.display = 'none';
        });
    }

    if (supabase && supabase.auth) {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) enableAdminMode(session.user?.email);
            else disableAdminMode();
        });
    }

    function enableAdminMode(email = 'Admin') {
        isAdminLoggedIn = true;
        if (trigger) {
            trigger.textContent = '🔓';
            trigger.style.opacity = '1';
            trigger.style.borderColor = '#4ade80';
        }
        const loggedUser = document.getElementById('admin-logged-user');
        if (loggedUser) loggedUser.textContent = email;
    }

    function disableAdminMode() {
        isAdminLoggedIn = false;
        if (trigger) {
            trigger.textContent = '🔒';
            trigger.style.opacity = '0.6';
            trigger.style.borderColor = '#444';
        }
        if (menuPopup) menuPopup.style.display = 'none';
    }

    // ผูกฟังก์ชันจัดการแอดมินไว้กับ window เพื่อเรียกจาก HTML ได้
    window.openAdminManager = function(type) {
        activeManagerType = type;
        const modal = document.getElementById('admin-manager-modal');
        const title = document.getElementById('manager-title');
        const fieldsContainer = document.getElementById('form-fields-container');
        const listSection = document.getElementById('manager-list-section');
        
        if (modal) modal.style.display = 'flex';
        if (listSection) listSection.style.display = 'block';
        
        if (type === 'banner') {
            if (title) title.textContent = '🖼️ จัดการแบนเนอร์ภาพสไลด์';
            if (fieldsContainer) {
                fieldsContainer.innerHTML = `
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-size: 12px; color: #aaa; margin-bottom: 4px;">เลือกไฟล์รูปภาพ:</label>
                        <input type="file" id="input-banner-file" accept="image/*" style="width: 100%; color: #ccc; font-size: 13px; background: #1e1e1e; padding: 6px; border: 1px solid #444; border-radius: 4px;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 12px; color: #aaa; margin-bottom: 4px;">URL ลิงก์เมื่อคลิกภาพ (ถ้ามี):</label>
                        <input type="text" id="input-banner-link" placeholder="https://example.com" style="width: 100%; padding: 8px; background: #1e1e1e; border: 1px solid #444; color: #fff; border-radius: 4px; font-size: 13px;">
                    </div>
                `;
            }
        } else if (type === 'link') {
            if (title) title.textContent = '🔗 จัดการลิงก์ภายนอก';
            if (fieldsContainer) {
                fieldsContainer.innerHTML = `
                    <div style="margin-bottom: 10px;">
                        <label style="display: block; font-size: 12px; color: #aaa; margin-bottom: 4px;">ชื่อหัวข้อปุ่ม:</label>
                        <input type="text" id="input-link-title" placeholder="เช่น กติกากิจกรรม, ติดต่อเรา" style="width: 100%; padding: 8px; background: #1e1e1e; border: 1px solid #444; color: #fff; border-radius: 4px; font-size: 13px;">
                    </div>
                    <div>
                        <label style="display: block; font-size: 12px; color: #aaa; margin-bottom: 4px;">URL ปลายทาง:</label>
                        <input type="text" id="input-link-url" placeholder="https://..." style="width: 100%; padding: 8px; background: #1e1e1e; border: 1px solid #444; color: #fff; border-radius: 4px; font-size: 13px;">
                    </div>
                `;
            }
        } else if (type === 'notice') {
            if (title) title.textContent = '📢 จัดการข้อความแจ้งเตือน (Marquee)';
            if (fieldsContainer) {
                fieldsContainer.innerHTML = `
                    <div>
                        <label style="display: block; font-size: 12px; color: #aaa; margin-bottom: 4px;">ข้อความประกาศวิ่ง:</label>
                        <textarea id="input-notice-text" rows="3" placeholder="พิมพ์ข้อความประกาศด่วนตรงนี้..." style="width: 100%; padding: 8px; background: #1e1e1e; border: 1px solid #444; color: #fff; border-radius: 4px; font-size: 13px; box-sizing: border-box;"></textarea>
                    </div>
                `;
            }
            if (listSection) listSection.style.display = 'none';
        }
        
        if (type !== 'notice') loadManagerItemList(supabase);
    };

    window.closeAdminManager = function() {
        const modal = document.getElementById('admin-manager-modal');
        if (modal) modal.style.display = 'none';
    };

    window.saveNewItem = async function() {
        try {
            if (activeManagerType === 'banner') {
                const fileInput = document.getElementById('input-banner-file');
                const linkInput = document.getElementById('input-banner-link');

                if (!fileInput.files || fileInput.files.length === 0) {
                    alert('กรุณาเลือกไฟล์รูปภาพจากเครื่อง');
                    return;
                }

                const file = fileInput.files[0];
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
                const filePath = `banners/${fileName}`;

                const { error: uploadError } = await supabase.storage.from('site-assets').upload(filePath, file);
                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage.from('site-assets').getPublicUrl(filePath);
                const imageUrl = publicUrlData.publicUrl;
                const linkUrl = linkInput.value.trim();

                const { error: dbError } = await supabase.from('site_banners').insert([{ image_url: imageUrl, link_url: linkUrl }]);
                if (dbError) throw dbError;

                alert('อัปโหลดและบันทึกแบนเนอร์สำเร็จ!');
                fileInput.value = '';
                linkInput.value = '';
                loadManagerItemList(supabase);
                if (onDataChanged) onDataChanged('banner');

            } else if (activeManagerType === 'link') {
                const title = document.getElementById('input-link-title').value.trim();
                const url = document.getElementById('input-link-url').value.trim();
                if (!title || !url) {
                    alert('กรุณากรอกชื่อหัวข้อและ URL ให้ครบถ้วน');
                    return;
                }

                const { error: dbError } = await supabase.from('external_links').insert([{ title: title, url: url }]);
                if (dbError) throw dbError;

                alert('บันทึกลิงก์สำเร็จ!');
                document.getElementById('input-link-title').value = '';
                document.getElementById('input-link-url').value = '';
                loadManagerItemList(supabase);
                if (onDataChanged) onDataChanged('link');

            } else if (activeManagerType === 'notice') {
                const message = document.getElementById('input-notice-text').value.trim();
                await supabase.from('site_notices').delete().neq('id', 0);
                const { error: dbError } = await supabase.from('site_notices').insert([{ message: message }]);
                if (dbError) throw dbError;

                alert('บันทึกข้อความแจ้งเตือนสำเร็จ!');
                if (onDataChanged) onDataChanged('notice');
                closeAdminManager();
            }
        } catch (err) {
            console.error("Error saving item:", err);
            alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + err.message);
        }
    };

    window.deleteItem = async function(id) {
        if (!confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) return;
        try {
            const tableName = activeManagerType === 'banner' ? 'site_banners' : 'external_links';
            const { error } = await supabase.from(tableName).delete().eq('id', id);
            if (error) throw error;

            loadManagerItemList(supabase);
            if (onDataChanged) onDataChanged(activeManagerType);
        } catch (err) {
            console.error("Error deleting item:", err);
            alert('เกิดข้อผิดพลาดในการลบข้อมูล');
        }
    };
}

async function loadManagerItemList(supabase) {
    const listContainer = document.getElementById('manager-item-list');
    if (!listContainer) return;
    listContainer.innerHTML = '<div style="text-align: center; color: #aaa; padding: 10px;">กำลังโหลด...</div>';

    try {
        const tableName = activeManagerType === 'banner' ? 'site_banners' : 'external_links';
        const { data, error } = await supabase.from(tableName).select('*').order('id', { ascending: false });
        if (error) throw error;

        if (!data || data.length === 0) {
            listContainer.innerHTML = '<div style="text-align: center; color: #aaa; padding: 10px; font-size: 13px;">ไม่มีข้อมูล</div>';
            return;
        }

        let html = '';
        data.forEach(item => {
            if (activeManagerType === 'banner') {
                html += `
                    <div style="display: flex; align-items: center; justify-content: space-between; background: #222; padding: 8px; margin-bottom: 6px; border-radius: 4px; border: 1px solid #333;">
                        <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
                            <img src="${item.image_url}" style="width: 40px; height: 30px; object-fit: cover; border-radius: 3px;">
                            <span style="font-size: 12px; color: #ccc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">${item.link_url || 'ไม่มีลิงก์'}</span>
                        </div>
                        <button onclick="deleteItem('${item.id}')" style="background: #dc3545; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">ลบ</button>
                    </div>
                `;
            } else {
                html += `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #222; padding: 8px; margin-bottom: 6px; border-radius: 4px; border: 1px solid #333; font-size: 13px;">
                        <div style="overflow: hidden;">
                            <div style="font-weight: 600; color: #fff;">${item.title}</div>
                            <div style="font-size: 11px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">${item.url}</div>
                        </div>
                        <button onclick="deleteItem('${item.id}')" style="background: #dc3545; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">ลบ</button>
                    </div>
                `;
            }
        });
        listContainer.innerHTML = html;
    } catch (err) {
        console.error("Error loading item list:", err);
        listContainer.innerHTML = '<div style="text-align: center; color: #ff6b6b; padding: 10px; font-size: 12px;">โหลดข้อมูลไม่สำเร็จ</div>';
    }
}