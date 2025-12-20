addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * 配置域名跳转规则（端口可选）
 */
const DOMAIN_CONFIG = {
  "a.example.com": {
    ipv4: "https://a1.example.com",
    ipv6: "http://[2001:db8::1]:8080"
  },
  "b.example.com": {
    ipv4: "https://b1.example.com:8443",
    ipv6: "https://b2.example.com"
  }
};

/**
 * 判断IP协议类型（IPv4/IPv6）
 */
function getIPVersion(request) {
  const clientIP = request.headers.get('CF-Connecting-IP') || '';
  return clientIP.includes(':') && !clientIP.match(/\d+\.\d+\.\d+\.\d+/) ? 'ipv6' : 'ipv4';
}

/**
 * 生成带倒计时提示的HTML页面
 */
function createRedirectHTML(ipType, targetUrl) {
  const tipText = `您的IP是${ipType.toUpperCase()}，正在跳转至${ipType.toUpperCase()}专属网站...`;
  // 2秒后自动跳转，同时支持手动点击跳转
  return `
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <title>跳转中...</title>
    <style>
      body { text-align: center; padding: 50px; font-family: Arial; }
      .tip { font-size: 18px; color: #333; margin: 20px 0; }
      .target { color: #0066cc; }
      .countdown { color: #ff6600; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="tip">${tipText}</div>
    <div>目标地址：<span class="target">${targetUrl}</span></div>
    <div class="countdown">2秒后自动跳转，若未跳转请<a href="${targetUrl}">点击此处</a></div>
    <script>
      setTimeout(() => { window.location.href = "${targetUrl}"; }, 2000);
    </script>
  </body>
  </html>
  `;
}

/**
 * 处理请求并执行跳转
 */
async function handleRequest(request) {
  try {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();

    if (!DOMAIN_CONFIG[host]) {
      return new Response('域名未配置', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    const ipVersion = getIPVersion(request);
    const targetUrl = DOMAIN_CONFIG[host][ipVersion];

    // 校验目标URL格式
    let target;
    try {
      target = new URL(targetUrl);
    } catch (e) {
      return new Response(`跳转地址格式错误：${targetUrl}`, {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // 保留原请求路径和参数
    target.pathname = url.pathname;
    target.search = url.search;
    const finalUrl = target.href;

    // 返回带倒计时提示的页面（替代直接301跳转）
    return new Response(createRedirectHTML(ipVersion, finalUrl), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });

  } catch (error) {
    return new Response(`跳转失败：${error.message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}
