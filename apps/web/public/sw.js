const CACHE_NAME = 'healthcare-v2-debug';
const urlsToCache = [
  '/manifest.json'
  // 移除了 '/', 避免缓存主页 HTML 导致无法获取最新版本
];

// 安装阶段：强制跳过等待，立即接管
self.addEventListener('install', event => {
  self.skipWaiting(); // 关键：强制新 SW 立即激活
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 激活阶段：清理旧缓存，立即控制所有页面
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Clients claimed');
      return self.clients.claim(); // 关键：让新 SW 立即控制当前页面
    })
  );
});

self.addEventListener('fetch', event => {
  // 对于 HTML 导航请求，强制使用网络优先（Network First）
  // 确保用户总是看到最新的页面，只有离线时才用缓存
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // 其他资源（JS/CSS/Images）使用缓存优先，但后台更新（Stale-While-Revalidate）
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果缓存中有，先返回缓存
        if (response) {
          // 可以在这里发起后台更新，但为了简单起见，暂且直接返回
          // 对于 hashed 的静态资源，这通常是安全的
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('push', event => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png'
    };
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (e) {
    console.error('Push error:', e);
  }
});