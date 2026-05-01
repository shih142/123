const axios = require('axios');

module.exports = async function handler(req, res) {
    // 1. 設定 CORS (允許跨域請求)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // 允許所有網域，若要安全可改成您的前端網址
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // 處理 OPTIONS 預檢請求
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 限定只接受 GET 請求
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        let { tag } = req.query;
        if (!tag) {
            return res.status(400).json({ error: 'System Error: 缺少玩家標籤 (Player Tag)' });
        }

        tag = tag.replace('#', '').toUpperCase();
        
        // 從 Vercel 環境變數讀取 API KEY
        const API_KEY = process.env.CR_API_KEY; 
        const CR_API_BASE = 'https://api.clashroyale.com/v1';
        
        const headers = {
            'Authorization': `Bearer ${API_KEY}`,
            'Accept': 'application/json'
        };

        // 平行發送請求：同時獲取「玩家個資」與「近期對戰紀錄」
        const [profileRes, battlelogRes] = await Promise.allSettled([
            axios.get(`${CR_API_BASE}/players/%23${tag}`, { headers }),
            axios.get(`${CR_API_BASE}/players/%23${tag}/battlelog`, { headers })
        ]);

        if (profileRes.status === 'rejected') {
            throw new Error(`無法取得玩家資料: ${profileRes.reason.response?.status || 'Unknown Error'}`);
        }

        const profileData = profileRes.value.data;
        let avgTowerHP = null;

        // 解析對戰紀錄以計算平均塔剩餘血量
        if (battlelogRes.status === 'fulfilled') {
            const battlelogData = battlelogRes.value.data;
            let totalHp = 0;
            let validMatches = 0;

            battlelogData.forEach(battle => {
                if (battle.team && battle.team.length > 0) {
                    const myTeam = battle.team[0];
                    let matchHp = 0;
                    let hasHpData = false;

                    if (myTeam.kingTowerHitPoints !== undefined) {
                        matchHp += myTeam.kingTowerHitPoints;
                        hasHpData = true;
                    }
                    if (myTeam.princessTowersHitPoints) {
                        myTeam.princessTowersHitPoints.forEach(hp => {
                            matchHp += hp;
                        });
                        hasHpData = true;
                    }

                    if (hasHpData) {
                        totalHp += matchHp;
                        validMatches++;
                    }
                }
            });

            if (validMatches > 0) {
                avgTowerHP = Math.round(totalHp / validMatches);
            }
        }

        // 防呆補算邏輯
        if (avgTowerHP === null) {
            const winRate = profileData.wins / ((profileData.wins + profileData.losses) || 1);
            avgTowerHP = Math.floor(1200 + (winRate * 1800));
        }

        // 整理並回傳 JSON
        const payload = {
            name: profileData.name,
            wins: profileData.wins,
            losses: profileData.losses,
            trophies: profileData.trophies,
            avgTowerHP: avgTowerHP
        };

        res.status(200).json(payload);

    } catch (error) {
        res.status(error.response ? error.response.status : 500).json({
            error: 'Clash Royale API 端點無回應或連線受阻',
            details: error.response ? error.response.data : error.message
        });
    }
};