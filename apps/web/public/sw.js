/* 
  V1.2.0-FINAL-BYPASS
  这个 Service Worker 的唯一任务就是：彻底禁用缓存。
  确保 PWA (添加到桌面) 和 浏览器 看到的内容永远 100% 一致。
*/

const CACHE_NAME = 'hc-pro-bypass-cache-v5';

self.addEventListener('install', event => {
  // 立即接管，不等待旧的 SW 退出
  self.skipWaiting();
  console.log('SW: Installing V5 and skipping waiting...');
});

self.addEventListener('activate', event => {
  // 清理掉所有之前可能存在的旧缓存，一个都不留
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.map(key => caches.delete(key)));
    }).then(() => {
      console.log('SW: All old caches cleared.');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  // 核心逻辑：所有请求直接走网络 (Network First)
  // 如果没网，再尝试从缓存拿（作为兜底），但绝不主动存新缓存
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
