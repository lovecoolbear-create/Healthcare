import { createSSRApp } from "vue";
import App from "./App.vue";
import "./styles/tailwind.css";

export function createApp() {
  const app = createSSRApp(App);
  return {
    app,
  };
}

if (typeof uniCloud !== 'undefined') {
  try {
    uniCloud.init({
      provider: 'alipay',
      spaceId: 'env-00jy5xpjho0v',
      spaceAppId: '2021006133638191',
      accessKey: 'cEj5CHKtHYeiHleT',
      secretKey: 'U1Iunhe54OaWZBc7'
    });
    console.log('[main] uniCloud 初始化成功');
  } catch (e) {
    console.error('[main] uniCloud 初始化失败:', e);
  }
}