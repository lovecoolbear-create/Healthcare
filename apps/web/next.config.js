/** @type {import('next').NextConfig} */
const nextConfig = {
  // ⚡️ 静态导出关键配置
  output: 'export',
  images: {
    unoptimized: true,
  },
  // 💡 Cloudflare Pages 默认部署在根目录，不需要 basePath
};

module.exports = nextConfig;
