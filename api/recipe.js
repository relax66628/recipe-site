// Vercel 服务端中转函数：密钥放在环境变量里，前端看不到，不会被盗刷
// 路径：/api/recipe  （前端 index.html 已按这个地址调用）

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  const { ing } = req.body || {};
  if (!ing) {
    res.status(400).json({ error: "缺少食材" });
    return;
  }

  const key = process.env.DEEPSEEK_KEY;
  if (!key) {
    res.status(500).json({ error: "服务端未配置 DEEPSEEK_KEY 环境变量" });
    return;
  }

  const upstream = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + key
    },
    body: JSON.stringify({
      model: "deepseek-flash", // 最便宜的快模型，做菜谱够用；想换更强可改 deepseek-chat
      stream: true,
      messages: [
        {
          role: "system",
          content: "你是家常菜谱助手。根据用户给的食材，输出：菜名、食材清单、详细步骤、小贴士，语言简短清楚，适合家里做饭。"
        },
        {
          role: "user",
          content: "我有食材：" + ing + "，帮我生成一道家常菜谱。"
        }
      ]
    })
  });

  res.status(upstream.status);
  res.setHeader("Content-Type", upstream.headers.get("content-type") || "text/event-stream; charset=utf-8");

  const reader = upstream.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(value);
  }
  res.end();
}
