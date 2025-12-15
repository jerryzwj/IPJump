addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * 配置域名跳转规则（端口可选）
 * 格式：{
 *   访问域名: {
 *     ipv4: "跳转的IPv4地址/域名（可选带端口，需完整URL）",
 *     ipv6: "跳转的IPv6地址/域名（可选带端口，需完整URL）"
 *   }
 * }
 */
const DOMAIN_CONFIG = {
  // 示例A域名：IPv4不带端口，IPv6带端口
  "1.zhangwenjun.eu.org": {ipv4: "https://baidu.com", ipv6: "https://bilibili.com" },
  "2.zhangwenjun.eu.org": {ipv4: "http://192.168.0.107:82",  ipv6: "http://192.168.0.107:3003" }
};

/**
 * 判断IP协议类型（IPv4/IPv6）
 * @param {Request} request - 请求对象
 * @returns {string} - "ipv4" 或 "ipv6"
 */
function getIPVersion(request) {
  // 获取客户端真实IP（Cloudflare专属请求头）
  const clientIP = request.headers.get('CF-Connecting-IP') || '';
  // IPv6地址包含冒号，以此区分（排除端口冒号的干扰）
  return clientIP.includes(':') && !clientIP.match(/\d+\.\d+\.\d+\.\d+/) ? 'ipv6' : 'ipv4';
}

/**
 * 处理请求并执行跳转（兼容带/不带端口）
 * @param {Request} request - 请求对象
 */
async function handleRequest(request) {
  try {
    // 解析请求域名（仅取hostname，忽略请求端的端口）
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();

    // 检查是否配置了该域名的跳转规则
    if (!DOMAIN_CONFIG[host]) {
      return new Response('域名未配置', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // 获取IP协议类型
    const ipVersion = getIPVersion(request);
    // 获取目标跳转地址（支持带/不带端口）
    const targetUrl = DOMAIN_CONFIG[host][ipVersion];

    // 校验目标地址格式（确保是合法URL）
    let target;
    try {
      target = new URL(targetUrl);
    } catch (e) {
      return new Response(`跳转地址格式错误：${targetUrl}，请检查是否包含http/https前缀`, {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // 可选：保留用户访问的路径和参数（如需关闭，注释这两行即可）
    target.pathname = url.pathname;
    target.search = url.search;

    // 301永久重定向（如需临时跳转，改为302）
    return Response.redirect(target.href, 301);

  } catch (error) {
    // 全局异常处理
    return new Response(`跳转失败：${error.message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}
