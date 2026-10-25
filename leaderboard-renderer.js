// leaderboard-renderer.js

function escapeHtml(str) {
    if (!str) return '';
    return str.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export function renderLeaderboard(data, podiumContainerId, tableBodyId, isLobby = false) {
    const podiumContainer = document.getElementById(podiumContainerId);
    const leaderboardBody = document.getElementById(tableBodyId);

    if (!data || data.length === 0) {
        const colSpan = isLobby ? 4 : 5;
        if (leaderboardBody) leaderboardBody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center; color:#94a3b8; padding:15px;">ยังไม่มีข้อมูลอันดับ</td></tr>`;
        if (podiumContainer) podiumContainer.innerHTML = '';
        return;
    }

    const uniquePlayers = [];
    const seenNames = new Set();
    for (const row of data) {
        const name = row.player_name || 'Anonymous';
        if (!seenNames.has(name)) {
            seenNames.add(name);
            uniquePlayers.push(row);
        }
        if (uniquePlayers.length >= 10) break;
    }

    // 1. Render Top 3 Podium
    if (podiumContainer) {
        let podiumHTML = '';
        const top3 = [uniquePlayers[1], uniquePlayers[0], uniquePlayers[2]];
        const medals = ['🥈', '👑', '🥉'];
        const rankClasses = ['rank-2', 'rank-1', 'rank-3'];
        const displayNumbers = ['2', '1', '3'];

        top3.forEach((row, i) => {
            if (row) {
                const isVIP = (row.user_type || '').toLowerCase() === 'vip';
                const nameClass = isVIP ? 'podium-name user-rainbow-text' : 'podium-name';
                const m = Math.floor(row.total_time / 60).toString().padStart(2, '0');
                const s = (row.total_time % 60).toString().padStart(2, '0');

                if (isLobby) {
                    // เลย์เอาต์สำหรับหน้าหลัก (Lobby)
                    podiumHTML += `
                        <div class="main-podium-column ${rankClasses[i]}">
                            <div class="podium-header-outside">
                                <div class="podium-medal">${medals[i]}</div>
                                <div class="${nameClass}" title="${escapeHtml(row.player_name)}">${escapeHtml(row.player_name)}</div>
                                <div class="podium-info-outside">Lv.${row.max_level} | 🖱️ ${row.total_clicks}คลิก</div>
                                <div class="podium-stat-outside">⏱️ ${m}:${s}</div>
                            </div>
                            <div class="podium-block">
                                <div class="podium-number">${displayNumbers[i]}</div>
                            </div>
                        </div>
                    `;
                } else {
                    // เลย์เอาต์สำหรับในเกม (Modal)
                    podiumHTML += `
                        <div class="podium-column ${rankClasses[i]}">
                            <div class="player-info-card">
                                <div class="podium-medal">${medals[i]}</div>
                                <div class="${nameClass}" title="${escapeHtml(row.player_name)}">${escapeHtml(row.player_name)}</div>
                                <div class="podium-info">Lvl ${row.max_level}</div>
                                <div class="podium-stat">⏱️ ${m}:${s}</div>
                            </div>
                            <div class="pedestal-base">${displayNumbers[i]}</div>
                        </div>
                    `;
                }
            } else {
                if (isLobby) {
                    podiumHTML += `
                        <div class="main-podium-column ${rankClasses[i]}" style="opacity: 0.3;">
                            <div class="podium-header-outside">
                                <div class="podium-medal">${medals[i]}</div>
                                <div class="podium-name">-</div>
                            </div>
                            <div class="podium-block">
                                <div class="podium-number">${displayNumbers[i]}</div>
                            </div>
                        </div>
                    `;
                } else {
                    podiumHTML += `
                        <div class="podium-column ${rankClasses[i]}" style="opacity: 0.3;">
                            <div class="player-info-card">
                                <div class="podium-medal">${medals[i]}</div>
                                <div class="podium-name">-</div>
                            </div>
                            <div class="pedestal-base">${displayNumbers[i]}</div>
                        </div>
                    `;
                }
            }
        });
        podiumContainer.innerHTML = podiumHTML;
    }

    // 2. Render Rank 4+ Table
    if (leaderboardBody) {
        let tableHTML = '';
        const restPlayers = uniquePlayers.slice(3);
        if (restPlayers.length === 0) {
            const colSpan = isLobby ? 4 : 5;
            leaderboardBody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center; color:#94a3b8; padding:8px;">ไม่มีอันดับเพิ่มเติม</td></tr>`;
        } else {
            restPlayers.forEach((item, index) => {
                const isVIP = (item.user_type || '').toLowerCase() === 'vip';
                const nameStyle = isVIP ? 'class="user-rainbow-text"' : '';
                const m = Math.floor(item.total_time / 60).toString().padStart(2, '0');
                const s = (item.total_time % 60).toString().padStart(2, '0');

                if (isLobby) {
                    tableHTML += `
                        <tr>
                            <td>${index + 4}</td>
                            <td><span ${nameStyle}>${escapeHtml(item.player_name)}</span></td>
                            <td>Lv.${item.max_level} (${item.total_clicks} คลิก)</td>
                            <td>${m}:${s}</td>
                        </tr>
                    `;
                } else {
                    tableHTML += `
                        <tr>
                            <td>${index + 4}</td>
                            <td><span ${nameStyle}>${escapeHtml(item.player_name)}</span></td>
                            <td>Lvl ${item.max_level}</td>
                            <td>${item.total_clicks}</td>
                            <td>${m}:${s}</td>
                        </tr>
                    `;
                }
            });
            leaderboardBody.innerHTML = tableHTML;
        }
    }
}