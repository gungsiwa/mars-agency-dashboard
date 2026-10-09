// --- slider.js: จัดการระบบแบนเนอร์ภาพสไลด์และ Lightbox ---

let bannerImages = [];
let currentSlideIndex = 0;
let slideInterval;

export function setBannerData(data) {
    bannerImages = data ? data.map(item => ({ Image: item.image_url, Link: item.link_url || '#' })) : [];
    renderBannerSlider();
}

export function renderBannerSlider() {
    const sliderTrack = document.getElementById("bannerSliderTrack");
    if (!sliderTrack) return;
    const container = sliderTrack.parentElement;
    if (!container) return;
    let dotsContainer = document.getElementById("bannerDots");

    if (!document.getElementById("banner-lightbox")) {
        const lightboxHtml = `
            <div id="banner-lightbox" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; justify-content:center; align-items:center;">
                <button onclick="closeLightbox()" style="position:absolute; top:20px; right:20px; background:rgba(255,255,255,0.2); color:#fff; border:none; width:40px; height:40px; border-radius:50%; font-size:20px; cursor:pointer; z-index:10000; display:flex; justify-content:center; align-items:center;">&times;</button>
                <img id="lightbox-img" style="max-width:90%; max-height:90%; border-radius:8px; object-fit:contain;">
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', lightboxHtml);
    }

    if (bannerImages.length === 0) {
        sliderTrack.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">ไม่มีแบนเนอร์ในระบบ</div>';
        if (dotsContainer) dotsContainer.innerHTML = '';
        return;
    }

    let trackHtml = '';
    let dotsHtml = '';
    bannerImages.forEach((item, index) => {
        const imgUrl = item.Image || '';
        if (!imgUrl) return;
        trackHtml += `
            <div class="slide" style="min-width: 100%; box-sizing: border-box; display: flex; justify-content: center; align-items: center; background: rgba(0, 0, 0, 0.2); border-radius: 8px; overflow: hidden;">
                <div onclick="openLightbox('${imgUrl}')" style="display: flex; justify-content: center; align-items: center; width: 100%; height: 200px; cursor: pointer;">
                    <img src="${imgUrl}" alt="Banner ${index + 1}" style="max-height: 100%; max-width: 100%; height: 100%; width: auto; object-fit: contain; border-radius: 8px;">
                </div>
            </div>
        `;
        dotsHtml += `<span class="dot ${index === 0 ? 'active' : ''}" onclick="currentSlide(${index})"></span>`;
    });

    container.style.position = 'relative';
    let arrowsHtml = `
        <button onclick="prevSlide()" style="position: absolute; top: 50%; left: 10px; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: #fff; border: none; padding: 8px 12px; cursor: pointer; z-index: 10; border-radius: 4px;">&#10094;</button>
        <button onclick="nextSlide()" style="position: absolute; top: 50%; right: 10px; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: #fff; border: none; padding: 8px 12px; cursor: pointer; z-index: 10; border-radius: 4px;">&#10095;</button>
    `;
    container.querySelectorAll('.banner-arrow-btn').forEach(el => el.remove());
    const tempDiv = document.createElement('div');
    tempDiv.className = 'banner-arrow-btn';
    tempDiv.innerHTML = arrowsHtml;
    container.appendChild(tempDiv);

    sliderTrack.innerHTML = trackHtml;
    if (dotsContainer) dotsContainer.innerHTML = dotsHtml;
    currentSlideIndex = 0;
    updateSlidePosition();
    resetSlideInterval();
}

window.openLightbox = function(url) {
    const lightbox = document.getElementById("banner-lightbox");
    const img = document.getElementById("lightbox-img");
    if (lightbox && img) {
        img.src = url;
        lightbox.style.display = "flex";
        if (slideInterval) clearInterval(slideInterval);
    }
}

window.closeLightbox = function() {
    const lightbox = document.getElementById("banner-lightbox");
    if (lightbox) {
        lightbox.style.display = "none";
        resetSlideInterval();
    }
}

window.prevSlide = function() {
    if (bannerImages.length === 0) return;
    currentSlideIndex = (currentSlideIndex - 1 + bannerImages.length) % bannerImages.length;
    updateSlidePosition();
    resetSlideInterval();
}

window.nextSlide = function() {
    if (bannerImages.length === 0) return;
    currentSlideIndex = (currentSlideIndex + 1) % bannerImages.length;
    updateSlidePosition();
    resetSlideInterval();
}

function resetSlideInterval() {
    if (slideInterval) clearInterval(slideInterval);
    if (bannerImages.length > 1) {
        slideInterval = setInterval(nextSlide, 4000);
    }
}

function updateSlidePosition() {
    const sliderTrack = document.getElementById("bannerSliderTrack");
    if (!sliderTrack) return;
    sliderTrack.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
    const dots = document.querySelectorAll('#bannerDots .dot, .banner-dots .dot');
    dots.forEach((dot, idx) => {
        if (idx === currentSlideIndex) dot.classList.add('active');
        else dot.classList.remove('active');
    });
}

window.currentSlide = function(index) {
    currentSlideIndex = index;
    updateSlidePosition();
};