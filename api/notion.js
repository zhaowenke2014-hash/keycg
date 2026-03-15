// Serverless Function for Vercel
export default async function handler(req, res) {
    const NOTION_TOKEN = process.env.NOTION_TOKEN;
    const DATABASE_ID = process.env.NOTION_DB_ID;

    if (!NOTION_TOKEN || !DATABASE_ID) {
        return res.status(500).json({ error: "Missing Notion API keys in Vercel environment variables." });
    }

    try {
        const response = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_TOKEN}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Notion API Error: ${errorData.message}`);
        }

        const data = await response.json();

        // 格式化 Notion 数据，容错处理（应对某一行没填全的情况）
        const projects = data.results.map(page => {
            const props = page.properties;
            return {
                id: page.id,
                title: props.Name?.title?.[0]?.plain_text || '未命名作品',
                tags: props.Tags?.select?.name || 'MOTION',
                bvid: props.BVID?.rich_text?.[0]?.plain_text || '',
                coverUrl: props.CoverURL?.url || ''
            };
        });

        res.status(200).json(projects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
