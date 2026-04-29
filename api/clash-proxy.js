const https = require('https');

export default async function handler(req, res) {
    // 取得前端傳來的 tag
    let { tag } = req.query;
    if (!tag) return res.status(400).json({ error: "缺少 Tag" });
    
    tag = tag.startsWith('#') ? tag.replace('#', '%23') : (tag.startsWith('%23') ? tag : '%23' + tag);

    const apiKey = process.env.CR_API_KEY; // 在 Vercel 後台設定

    const options = {
        hostname: 'api.clashroyale.com', // 建議用這個代理繞過 IP 限制
        path: `/v1/players/${tag}`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json'
        }
    };

    // 發送請求並回傳
    const request = https.get(options, (apiRes) => {
        let data = '';
        apiRes.on('data', chunk => data += chunk);
        apiRes.on('end', () => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.status(apiRes.statusCode).send(data);
        });
    });

    request.on('error', (e) => res.status(500).json({ error: e.message }));
}
