const axios = require('axios');

module.exports = async (req, res) => {
    // 1. CORS 設置
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // 2. 取得並清理 Tag
    const { tag } = req.query;
    if (!tag) return res.status(400).json({ error: '缺少玩家標籤' });

    const cleanTag = tag.replace('#', '').toUpperCase().trim();
    const CR_API_KEY = process.env.CR_API_KEY;

    try {
        // 使用 RoyaleAPI Proxy，將 # 編碼為 %23
        const proxyUrl = `https://proxy.royaleapi.dev/v1/players/%23${cleanTag}/battlelog`;
        
        const response = await axios.get(proxyUrl, {
            headers: { 
                'Authorization': `Bearer ${CR_API_KEY}`,
                'Accept': 'application/json'
            }
        });

        const logs = response.data;
        if (!logs || !Array.isArray(logs) || logs.length === 0) {
            throw new Error('找不到戰鬥紀錄，請確認 Tag 是否正確且近期有進行對戰。');
        }

        // 3. 數據萃取邏輯
        let totalHP = 0;
        let wins = 0;
        const matchCount = logs.length;

        logs.forEach(match => {
            if (match.team && match.team[0]) {
                const me = match.team[0];
                const opponent = match.opponent[0];
                
                // 塔血計算
                const king = me.kingTowerHitPoints || 0;
                const princess = (me.princessTowersHitPoints || []).reduce((a, b) => a + b, 0);
                totalHP += (king + princess);

                // 勝負判斷
                if (me.crowns > opponent.crowns) wins++;
            }
        });

        res.status(200).json({
            name: logs[0].team[0].name,
            avgTowerHP: Math.round(totalHP / matchCount),
            winRate: Math.round((wins / matchCount) * 100),
            battleCount: matchCount
        });

    } catch (err) {
        console.error("Backend Error:", err.message);
        res.status(err.response?.status || 500).json({ 
            error: '數據擷取失敗', 
            message: err.response?.data?.message || err.message 
        });
    }
};
