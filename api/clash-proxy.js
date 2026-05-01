const axios = require('axios');

module.exports = async (req, res) => {
    // 1. 設定 CORS 標頭，允許前端跨域訪問
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { tag } = req.query;
    if (!tag) {
        return res.status(400).json({ error: '缺少玩家標籤 (Tag)' });
    }

    // 從 Vercel 環境變數獲取 Key
    const CR_API_KEY = process.env.CR_API_KEY; 
    const cleanTag = tag.startsWith('#') ? tag : `#${tag}`;
    const encodedTag = encodeURIComponent(cleanTag);

    try {
        // 使用 RoyaleAPI Proxy 代替官方直連，解決 403 IP 問題
        // 請求端點：近 25-50 場戰鬥日誌
        const response = await axios.get(`https://proxy.royaleapi.dev/v1/players/${encodedTag}/battlelog`, {
            headers: { 
                'Authorization': `Bearer ${CR_API_KEY}`,
                'Accept': 'application/json'
            }
        });

        const battleLogs = response.data;

        if (!battleLogs || battleLogs.length === 0) {
            return res.status(404).json({ error: '找不到該玩家的戰鬥紀錄' });
        }

        // --- 核心邏輯：計算數據 ---
        let totalHP = 0;
        let winCount = 0;
        const totalMatches = battleLogs.length;

        battleLogs.forEach(match => {
            if (match.team && match.team[0]) {
                const me = match.team[0];
                const opponent = match.opponent[0];

                // 塔血量計算 (國王塔 + 所有公主塔)
                const king = me.kingTowerHitPoints || 0;
                const princess = (me.princessTowersHitPoints || []).reduce((a, b) => a + b, 0);
                totalHP += (king + princess);

                // 勝率計算
                if (me.crowns > opponent.crowns) winCount++;
            }
        });

        const avgTowerHP = Math.round(totalHP / totalMatches);
        const winRate = Math.round((winCount / totalMatches) * 100);

        // 回傳給前端的簡化格式
        res.status(200).json({
            name: battleLogs[0].team[0].name,
            avgTowerHP: avgTowerHP,
            winRate: winRate,
            battleCount: totalMatches,
            tag: cleanTag
        });

    } catch (error) {
        console.error("Proxy Error:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({ 
            error: '無法連線至 RoyaleAPI Proxy',
            details: error.response?.data?.message || error.message
        });
    }
};
