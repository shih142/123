const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const { tag } = req.query;
    const CR_API_KEY = process.env.CR_API_KEY;

    if (!tag) return res.status(400).json({ error: 'No tag provided' });

    try {
        // 重要：傳給 RoyaleAPI 時，# 必須是 %23
        const cleanTag = tag.replace('#', '').toUpperCase();
        const proxyUrl = `https://proxy.royaleapi.dev/v1/players/%23${cleanTag}/battlelog`;

        const response = await axios.get(proxyUrl, {
            headers: { 'Authorization': `Bearer ${CR_API_KEY}` }
        });

        // 資料處理邏輯...
        const logs = response.data;
        const me = logs[0].team[0];
        
        res.status(200).json({
            name: me.name,
            avgTowerHP: Math.round(logs.reduce((acc, m) => acc + (m.team[0].kingTowerHitPoints || 0), 0) / logs.length),
            winRate: 50 // 簡化示範
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};