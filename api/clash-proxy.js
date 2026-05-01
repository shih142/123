const axios = require('axios');

export default async function handler(req, res) {
    const { tag } = req.query;
    const CR_API_KEY = process.env.CR_API_KEY;

    // 1. 設置標頭 (允許跨域)
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (!tag) return res.status(400).json({ error: 'Need Tag' });

    try {
        const cleanTag = tag.startsWith('#') ? tag : `#${tag}`;
        // 直接抓取戰鬥日誌 (包含玩家姓名與塔血量)
        const response = await axios.get(`https://api.clashroyale.com/v1/players/${encodeURIComponent(cleanTag)}/battlelog`, {
            headers: { 'Authorization': `Bearer ${CR_API_KEY}` }
        });

        // 簡化回傳：直接傳回最近一場的塔血
        const lastMatch = response.data[0];
        res.status(200).json({
            name: lastMatch.team[0].name,
            towerHP: (lastMatch.team[0].kingTowerHitPoints || 0) + 
                     (lastMatch.team[0].princessTowersHitPoints?.reduce((a, b) => a + b, 0) || 0)
        });
    } catch (e) {
        res.status(403).json({ error: 'Check IP 0.0.0.0 in CR Portal' });
    }
}