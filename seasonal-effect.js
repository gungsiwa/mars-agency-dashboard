// --- seasonal-effect.js: เอฟเฟกต์ตกแต่งตามเทศกาล ---
(function() {
    // เลือกเทศกาล: 'halloween' หรือ 'winter'
    const currentSeason = 'halloween'; 

    const style = document.createElement('style');
    style.innerHTML = `
        .seasonal-particle {
            position: fixed;
            top: -50px;
            z-index: 999;
            user-select: none;
            pointer-events: none;
            animation: fallParticle linear infinite;
        }
        @keyframes fallParticle {
            0% { transform: translateY(0) rotate(0deg); opacity: 0; }
            10% { opacity: 0.8; }
            90% { opacity: 0.8; }
            100% { transform: translateY(105vh) rotate(360deg); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    // เปิดใช้งานคลาส CSS ที่ body อัตโนมัติ
    if (currentSeason === 'halloween') {
        document.body.classList.add('halloween-theme');
    } else if (currentSeason === 'winter') {
        document.body.classList.add('winter-theme');
    }

    // สร้างไอคอนตกลงมาเรื่อยๆ
    const items = currentSeason === 'halloween' ? ['🎃', '🦇', '👻', '🍬'] : ['❄️', '⛄', '✨', '🌨️'];
    
    setInterval(() => {
        const particle = document.createElement('div');
        particle.className = 'seasonal-particle';
        particle.innerText = items[Math.floor(Math.random() * items.length)];
        particle.style.left = Math.random() * window.innerWidth + 'px';
        particle.style.fontSize = (Math.random() * 16 + 14) + 'px';
        particle.style.animationDuration = (Math.random() * 5 + 5) + 's';
        
        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 10000);
    }, 800);
})();