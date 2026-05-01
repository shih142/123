const axios = require('axios');

module.exports = async (req, res) => {
    // CORS 設置
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { tag } = req.query;
    if (!tag) {
        return res.status(400).json({ error: 'Missing player tag' });
    }

    const CR_API_KEY = process.env.CR_API_KEY; 
    const cleanTag = tag.startsWith('#') ? tag : `#${tag}`;
    const encodedTag = encodeURIComponent(cleanTag);

    try {
        // 同時發送兩個請求：基本資料 & 戰鬥日誌
        const [playerRes, battleRes] = await Promise.all([
            axios.get(`https://api.clashroyale.com/v1/players/${encodedTag}`, {
                headers: { 'Authorization': `Bearer ${CR_API_KEY}` }
            }),
            axios.get(`https://api.clashroyale.com/v1/players/${encodedTag}/battlelog`, {
                headers: { 'Authorization': `Bearer ${CR_API_KEY}` }
            })
        ]);

        const playerData = playerRes.data;
        const battleLogs = battleRes.data;

        // --- 核心邏輯：計算近 50 場平均塔血 ---
        let totalHPAccumulator = 0;
        let validMatches = 0;

        // 官方 API 預設回傳近 25~50 場
        battleLogs.forEach(match => {
            // 確保是 1v1 類型的比賽 (排除 2v2 或特殊模式可能導致的結構差異)
            if (match.team && match.team[0]) {
                const mySide = match.team[0];
                
                // 國王塔血量
                const kingHP = mySide.kingTowerHitPoints || 0;
                
                // 公主塔血量 (這是一個陣列，可能剩 0, 1, 或 2 座)
                const princessHP = (mySide.princessTowersHitPoints || []).reduce((a, b) => a + b, 0);
                
                totalHPAccumulator += (kingHP + princessHP);
                validMatches++;
            }
        });

        const avgTowerHP = validMatches > 0 ? Math.round(totalHPAccumulator / validMatches) : 0;

        // 組合前端需要的數據格式
        const combinedData = {
            name: playerData.name,
            wins: playerData.wins,
            losses: playerData.losses,
            trophies: playerData.trophies,
            avgTowerHP: avgTowerHP, // 這是 V10.4 核心指標
            battleCount: validMatches,
            // 也可以把最近一場的勝負傳回去做 Log
            lastMatchChange: battleLogs[0]?.team[0]?.crowns - battleLogs[0]?.opponent[0]?.crowns
        };

        res.status(200).json(combinedData);

    } catch (error) {
        console.error("Vercel Backend Error:", error.message);
        res.status(error.response?.status || 500).json({ 
            error: 'API Fetch Failed',
            message: error.response?.data?.message || error.message 
        });
    }
};