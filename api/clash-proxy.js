const axios = require('axios');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { tag } = req.query;
    if (!tag) return res.status(400).json({ error: 'Missing player tag' });

    const cleanTag = tag.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const CR_API_KEY = process.env.CR_API_KEY;

    if (!CR_API_KEY) return res.status(500).json({ error: 'System config error: API Key missing.' });

    try {
        const proxyUrl = `https://proxy.royaleapi.dev/v1/players/%23${cleanTag}/battlelog`;
        const response = await axios.get(proxyUrl, {
            headers: {
                'Authorization': `Bearer ${CR_API_KEY}`,
                'Accept': 'application/json'
            }
        });

        const logs = response.data;
        if (!logs || logs.length === 0) return res.status(404).json({ error: 'No battle logs.' });

        let totalHP = 0, wins = 0, validMatches = 0;
        let threeCrownWins = 0, clutchWins = 0, lowHpClutch = 0;
        let totalCrownsEarned = 0, totalCrownsLost = 0;
        let totalElixir = 0;
        let hpHistory = []; // 用於計算穩定度標準差

        logs.forEach(match => {
            if (match.team && match.team[0] && match.opponent && match.opponent[0]) {
                const me = match.team[0];
                const opponent = match.opponent[0];
                
                // 1. 塔血與生存數據
                const kingHP = me.kingTowerHitPoints || 0;
                const princessHP = (me.princessTowersHitPoints || []).reduce((a, b) => a + b, 0);
                const finalHP = kingHP + princessHP;
                totalHP += finalHP;
                hpHistory.push(finalHP);

                // 2. 皇冠與勝負數據
                const myCrowns = me.crowns || 0;
                const oppCrowns = opponent.crowns || 0;
                totalCrownsEarned += myCrowns;
                totalCrownsLost += oppCrowns;

                if (myCrowns > oppCrowns) {
                    wins++;
                    if (myCrowns === 3) threeCrownWins++;
                    if (myCrowns - oppCrowns === 1) clutchWins++;
                    // 職業級判定：主塔血量低於 1000 且獲勝 (極限反殺)
                    if (kingHP > 0 && kingHP < 1000) lowHpClutch++; 
                }

                // 3. 牌組均費計算 (APM 與節奏指標)
                if (me.cards && me.cards.length > 0) {
                    let deckElixirSum = 0;
                    let validCards = 0;
                    me.cards.forEach(c => {
                        // 排除沒有消耗的特殊卡片（如鏡像法術在某些 API 版本中顯示為 0）
                        if (c.elixirCost !== undefined && c.elixirCost > 0) {
                            deckElixirSum += c.elixirCost;
                            validCards++;
                        }
                    });
                    if (validCards > 0) {
                        totalElixir += (deckElixirSum / validCards);
                    }
                }
                validMatches++;
            }
        });

        res.status(200).json({
            tag: cleanTag,
            name: logs[0].team[0].name,
            battleCount: validMatches,
            avgTowerHP: Math.round(totalHP / validMatches),
            hpHistory: hpHistory, // 回傳給前端算標準差
            winRate: Math.round((wins / validMatches) * 100),
            avgCrownsEarned: (totalCrownsEarned / validMatches).toFixed(2),
            avgCrownsLost: (totalCrownsLost / validMatches).toFixed(2),
            threeCrownRate: (threeCrownWins / validMatches),
            clutchRate: (clutchWins / validMatches),
            lowHpClutchRate: (lowHpClutch / validMatches),
            avgDeckElixir: (totalElixir / validMatches).toFixed(2)
        });

    } catch (error) {
        res.status(error.response?.status || 500).json({
            error: 'Backend API Error',
            details: error.response?.data?.message || error.message
        });
    }
};