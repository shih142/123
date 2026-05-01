const axios = require('axios');

module.exports = async (req, res) => {
    // --- 1. CORS 與基礎設定 ---
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // --- 2. 參數驗證與清理 ---
    const { tag } = req.query;
    if (!tag) {
        return res.status(400).json({ error: 'Missing player tag' });
    }

    // 將參數中的非英數字元全部剔除，並轉為大寫，確保格式絕對安全
    const cleanTag = tag.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const CR_API_KEY = process.env.CR_API_KEY;

    if (!CR_API_KEY) {
        return res.status(500).json({ error: '伺服器未設定 API Key' });
    }

    try {
        // --- 3. 發送請求至 RoyaleAPI Proxy ---
        // 注意：RoyaleAPI 規定網址裡的 # 必須編碼為 %23
        const proxyUrl = `https://proxy.royaleapi.dev/v1/players/%23${cleanTag}/battlelog`;

        const response = await axios.get(proxyUrl, {
            headers: {
                'Authorization': `Bearer ${CR_API_KEY}`,
                'Accept': 'application/json'
            }
        });

        const logs = response.data;
        if (!logs || !Array.isArray(logs) || logs.length === 0) {
            return res.status(404).json({ error: '找不到該玩家的近期對戰紀錄' });
        }

        // --- 4. 戰鬥數據萃取 ---
        let totalHP = 0;
        let wins = 0;
        let validMatches = 0;

        logs.forEach(match => {
            // 確保資料結構完整 (排除特殊模式可能造成的結構異常)
            if (match.team && match.team[0] && match.opponent && match.opponent[0]) {
                const me = match.team[0];
                const opponent = match.opponent[0];

                // 計算塔血：國王塔 + 所有公主塔
                const kingHP = me.kingTowerHitPoints || 0;
                const princessHP = (me.princessTowersHitPoints || []).reduce((a, b) => a + b, 0);
                totalHP += (kingHP + princessHP);

                // 計算勝率
                if (me.crowns > opponent.crowns) wins++;
                
                validMatches++;
            }
        });

        if (validMatches === 0) {
            return res.status(404).json({ error: '沒有符合格式的對戰紀錄' });
        }

        // --- 5. 回傳精煉數據 ---
        res.status(200).json({
            name: logs[0].team[0].name,
            avgTowerHP: Math.round(totalHP / validMatches),
            winRate: Math.round((wins / validMatches) * 100),
            battleCount: validMatches,
            tag: cleanTag
        });

    } catch (error) {
        console.error("Backend Proxy Error:", error.message);
        res.status(error.response?.status || 500).json({
            error: '無法從數據中心取得資料',
            details: error.response?.data?.message || error.message
        });
    }
};