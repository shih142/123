const https = require('https');

async function fetchFromCR(path, apiKey) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'proxy.royaleapi.dev', // 使用代理繞過 IP 限制
            path: path,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            }
        };
        https.get(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

export default async function handler(req, res) {
    let { tag } = req.query;
    if (!tag) return res.status(400).json({ error: "Missing tag" });

    const apiKey = process.env.CR_API_KEY;
    const cleanTag = tag.startsWith('#') ? tag.replace('#', '%23') : (tag.startsWith('%23') ? tag : '%23' + tag);

    try {
        // 同時發出兩個請求：基本資料 + 戰鬥紀錄
        const [playerData, battleLog] = await Promise.all([
            fetchFromCR(`/v1/players/${cleanTag}`, apiKey),
            fetchFromCR(`/v1/players/${cleanTag}/battlelog`, apiKey)
        ]);

        // 將兩者合併成一個物件回傳給前端
        const combinedData = {
            ...playerData,
            battleLog: battleLog
        };

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(200).json(combinedData);
    } catch (error) {
        res.status(500).json({ error: "API Fetch Failed", details: error.message });
    }
}
