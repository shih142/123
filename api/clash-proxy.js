/**
 * Vercel Serverless Function
 * MAXIMA 12D - RoyaleAPI Proxy (使用 proxy.royaleapi.dev)
 */

const axios = require('axios');

const BASE_URL = 'https://proxy.royaleapi.dev/v1';
const HEADERS = {
    'Accept': 'application/json'
};

function calculateAvgTowerHP(battlelog) {
    if (!battlelog || battlelog.length === 0) return 6500;

    let totalHP = 0;
    let count = 0;
    const recentBattles = battlelog.slice(0, 15);

    for (const battle of recentBattles) {
        const team = battle.team?.[0];
        if (!team || !team.towers) continue;

        const towers = team.towers;
        let battleHP = 0;
        let towerCount = 0;

        towers.forEach(tower => {
            if (tower.remainingHitpoints != null && tower.remainingHitpoints > 0) {
                battleHP += tower.remainingHitpoints;
                towerCount++;
            }
        });

        if (towerCount > 0) {
            totalHP += battleHP / towerCount;
            count++;
        }
    }

    return count === 0 ? 6500 : Math.round(totalHP / count);
}

function calculateRecentWinRate(battlelog) {
    if (!battlelog || battlelog.length === 0) return 50;

    const recent = battlelog.slice(0, 15);
    let wins = 0;

    for (const battle of recent) {
        const teamCrowns = battle.team?.[0]?.crowns || 0;
        const opponentCrowns = battle.opponent?.[0]?.crowns || 0;
        if (teamCrowns > opponentCrowns) wins++;
    }

    return Math.round((wins / recent.length) * 100);
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    const rawTag = req.query.tag;
    if (!rawTag) {
        return res.status(400).json({ error: '缺少 tag 參數' });
    }

    const cleanTag = rawTag.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const encodedTag = `%23${cleanTag}`;

    try {
        const playerRes = await axios.get(`${BASE_URL}/players/${encodedTag}`, { headers: HEADERS });
        const player = playerRes.data;

        let battlelog = [];
        try {
            const logRes = await axios.get(`${BASE_URL}/players/${encodedTag}/battles`, { headers: HEADERS });
            battlelog = logRes.data || [];
        } catch (logErr) {
            console.warn('無法取得 battles:', logErr.message);
        }

        const avgTowerHP = calculateAvgTowerHP(battlelog);
        const recentWinRate = calculateRecentWinRate(battlelog);
        const overallWinRate = player.wins && player.losses 
            ? Math.round((player.wins / (player.wins + player.losses)) * 100)
            : recentWinRate;

        const result = {
            name: player.name,
            tag: player.tag,
            level: player.level,
            trophies: player.trophies,
            bestTrophies: player.bestTrophies,
            wins: player.wins,
            losses: player.losses,
            winRate: overallWinRate,
            recentWinRate: recentWinRate,
            avgTowerHP: avgTowerHP,
            clan: player.clan ? {
                name: player.clan.name,
                tag: player.clan.tag,
                badgeId: player.clan.badgeId
            } : null,
            battleCount: battlelog.length,
            lastUpdated: new Date().toISOString()
        };

        res.json(result);

    } catch (error) {
        console.error('API 錯誤:', error.response?.data || error.message);

        if (error.response?.status === 404) {
            return res.status(404).json({ error: '找不到該玩家' });
        }

        res.status(500).json({ 
            error: '後端服務異常', 
            message: error.message 
        });
    }
};