// Serverless Function for Vercel: Bilibili Auto-Sync
export default async function handler(req, res) {
    // 你的 B 站 UID
    const UID = '12201162';

    try {
        // 利用 RSSHub 和 rss2json 实现免签名的稳定 B 站数据源抓取
        const rssUrl = encodeURIComponent(`https://rsshub.app/bilibili/user/video/${UID}`);
        const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`);
        const data = await response.json();

        if (data.status !== 'ok') {
            throw new Error('无法连接到 B 站数据源，请稍后再试');
        }

        // 获取最新发布的视频（取前 12 个，避免网页被撑爆）
        const latestVideos = data.items.slice(0, 12);

        // 格式化数据，提取 BVID 和 破解图片防盗链
        const projects = latestVideos.map(item => {
            // 1. 从链接中提取 BVID
            const bvidMatch = item.link.match(/video\/(BV\w+)/);
            const bvid = bvidMatch ? bvidMatch[1] : '';

            // 2. 从 HTML 描述中提取封面图的原始链接
            const imgMatch = item.description.match(/src="([^"]+)"/);
            let coverUrl = imgMatch ? imgMatch[1] : '';

            // 3. 破解 B 站图片防盗链 (使用 weserv 全球图片代理缓存)
            if (coverUrl) {
                coverUrl = `https://images.weserv.nl/?url=${encodeURIComponent(coverUrl)}&w=800&fit=cover`;
            }

            // 4. 智能打标签系统：根据你的标题自动分类
            let tags = 'MOTION / LATEST WORK';
            const upperTitle = item.title.toUpperCase();
            if (upperTitle.includes('C4D')) tags = 'MOTION / C4D & MG';
            if (upperTitle.includes('AE') || item.title.includes('教程')) tags = 'MOTION / TUTORIAL';
            if (item.title.includes('成都') || item.title.includes('人文')) tags = 'MOTION / DOCUMENTARY';

            return {
                id: bvid,
                title: item.title,
                tags: tags,
                bvid: bvid,
                coverUrl: coverUrl
            };
        });

        // 加上缓存控制，告诉 Vercel 缓存 1 小时，避免被 B 站或 API 接口限流
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
        res.status(200).json(projects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
