// Cloudflare Worker: 代理后端 API
// 部署地址: https://ai-search-proxy.your-subdomain.workers.dev

export default {
  async fetch(request, env, ctx) {
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,OPTIONS,POST',
          'Access-Control-Allow-Headers': 'Content-Type, X-Skip-Clarify, X-Clarify-Answers',
        }
      });
    }

    const backendUrl = 'http://47.86.191.93:3000' + new URL(request.url).pathname;

    try {
      const backendRequest = new Request(backendUrl, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: request.method === 'POST' ? request.body : null
      });

      const backendResponse = await fetch(backendRequest);

      // 返回响应，添加 CORS 头
      return new Response(backendResponse.body, backendResponse, {
        headers: {
          ...Object.fromEntries(backendResponse.headers),
          'Access-Control-Allow-Origin': '*',
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: '代理请求失败', message: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
