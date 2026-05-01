const axios = require('axios');

module.exports = async (req, res) => {
    // 設置 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { tag } = req.query;
    if (!tag) return res.status(400).json({ error: 'Missing tag' });

    // 格式化 Tag：去掉 # 並轉大寫
    const cleanTag = tag.replace('#', '').toUpperCase();
    const CR_API_KEY = process.env.CR_API_KEY;

    try {
        // 使用 RoyaleAPI Proxy，路徑需編碼 %23
        const proxyUrl = `https://proxy.royaleapi.dev/v1/players/%23${cleanTag}/battlelog`;
        
        const response = await axios.get(proxyUrl, {
            headers: { 
                'Authorization': `Bearer ${CR_API_KEY}`,
                'Accept': 'application/json'
            }
        });

        const logs = response.data;
        if (!logs || logs.length === 0) throw new Error('No battle logs found');

        // 計算數據
        let totalHP = 0;
        let wins = 0;
        const count = logs.length;

        logs.forEach(m => {
            const me = m.team[0];
            totalHP += (me.kingTowerHitPoints || 0) + (me.princessTowersHitPoints?.reduce((a, b) => a + b, 0) || 0);
            if (me.crowns > m.opponent[0].crowns) wins++;
        });

        res.status(200).json({
            name: logs[0].team[0].name,
            avgTowerHP: Math.round(totalHP / count),
            winRate: Math.round((wins / count) * 100),
            count: count
        });

    } catch (err) {
        console.error(err.message);
        res.status(err.response?.status || 500).json({ 
            error: 'Backend Error', 
            message: err.response?.data?.message || err.message 
        });
    }
};