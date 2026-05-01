const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// 啟用 CORS，允許前端跨域請求
app.use(cors());
app.use(express.json());

// 【核心修改】將官方 API 替換為 RoyaleAPI Proxy，完美繞過 IP 白名單限制！
const CR_API_BASE = 'https://proxy.royaleapi.dev/v1';

// 直接將您的官方 API Token 填寫在下方的引號內 (RoyaleAPI Proxy 也是吃這把鑰匙)
const API_KEY = '你的_CLASH_ROYALE_官方_API_TOKEN_貼在這裡';

// 建立前端呼叫的 API 路由
app.get('/api/clash-proxy', async (req, res) => {
    try {
        let { tag } = req.query;
        if (!tag) {
            return res.status(400).json({ error: 'System Error: 缺少玩家標籤 (Player Tag)' });
        }

        // 清理 Tag：確保沒有 # 號，並且全部大寫
        tag = tag.replace('#', '').toUpperCase();

        const headers = {
            'Authorization': `Bearer ${API_KEY}`,
            'Accept': 'application/json'
        };

        console.log(`[MAXIMA-PROXY] 正在攔截並解析目標數據: #${tag}`);

        // 1. 平行發送請求：同時獲取「玩家個資」與「近期對戰紀錄」
        const [profileRes, battlelogRes] = await Promise.allSettled([
            axios.get(`${CR_API_BASE}/players/%23${tag}`, { headers }),
            axios.get(`${CR_API_BASE}/players/%23${tag}/battlelog`, { headers })
        ]);

        if (profileRes.status === 'rejected') {
            throw new Error(`無法取得玩家資料: ${profileRes.reason.response?.status}`);
        }

        const profileData = profileRes.value.data;
        let avgTowerHP = null;

        // 2. 解析對戰紀錄以計算「平均塔剩餘血量」(AEGIS 模組核心)
        if (battlelogRes.status === 'fulfilled') {
            const battlelogData = battlelogRes.value.data;
            let totalHp = 0;
            let validMatches = 0;

            battlelogData.forEach(battle => {
                // battle.team[0] 通常是玩家自己的隊伍
                if (battle.team && battle.team.length > 0) {
                    const myTeam = battle.team[0];
                    let matchHp = 0;
                    let hasHpData = false;

                    // 加總國王塔血量
                    if (myTeam.kingTowerHitPoints !== undefined) {
                        matchHp += myTeam.kingTowerHitPoints;
                        hasHpData = true;
                    }
                    // 加總公主塔血量 (陣列形式)
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

        // 3. 防呆機制：如果 API 沒給對戰血量，套用模擬演算法給前端
        if (avgTowerHP === null) {
            const winRate = profileData.wins / (profileData.wins + profileData.losses || 1);
            avgTowerHP = Math.floor(1200 + (winRate * 1800)); // 基礎推演公式
            console.log(`[MAXIMA-PROXY] 未取得實際塔血，已啟動預測演算法: ${avgTowerHP}`);
        }

        // 4. 重組前端需要的輕量化 JSON 格式
        const payload = {
            name: profileData.name,
            wins: profileData.wins,
            losses: profileData.losses,
            trophies: profileData.trophies,
            avgTowerHP: avgTowerHP
        };

        // 回傳給前端
        res.json(payload);

    } catch (error) {
        console.error('[MAXIMA-PROXY] API 請求失敗:', error.response ? error.response.data : error.message);
        res.status(error.response ? error.response.status : 500).json({
            error: 'Clash Royale API 端點無回應或連線受阻',
            details: error.response ? error.response.data : error.message
        });
    }
});

app.listen(port, () => {
    console.log(`=========================================`);
    console.log(`[MAXIMA_DATACENTER] 代理伺服器已上線 (RoyaleAPI Proxy 模式)`);
    console.log(`[SYS] 監聽端口: http://localhost:${port}`);
    console.log(`=========================================`);
});