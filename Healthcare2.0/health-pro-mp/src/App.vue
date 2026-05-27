<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
// @ts-ignore - 开发配置文件
import { devConfig, filterDevelopmentErrors } from "@/config/development";

const ensureWebAdminAccess = () => {
  const userInfo = uni.getStorageSync("userInfo");
  if (!userInfo || !userInfo.role || userInfo.role === "admin") return;
  const hash = typeof window !== "undefined" ? window.location.hash || "" : "";
  if (hash.includes("/pages/common/login/index")) return;
  uni.removeStorageSync("token");
  uni.removeStorageSync("userInfo");
  uni.showToast({ title: "Web端仅支持营养顾问", icon: "none" });
  uni.reLaunch({ url: "/pages/common/login/index" });
};

onLaunch(() => {
  console.log("App Launch");
  // 开发模式配置
  if (devConfig.logging.verbose) {
    console.log("🚀 开发模式已启用");
    console.log("📡 WebSocket真实连接已禁用");
  }
  ensureWebAdminAccess();
});

onShow(() => {
  console.log("App Show");
  ensureWebAdminAccess();
});

onHide(() => {
  console.log("App Hide");
});
</script>
<style>
:root {
  --mp-bg-base: #eef3fb;
  --mp-bg-top: #f4f8ff;
  --mp-bg-bottom: #e9f0fa;
  --mp-ring-client: rgba(16, 185, 129, 0.16);
  --mp-ring-advisor: rgba(99, 102, 241, 0.14);
  --mp-ring-bridge: rgba(45, 212, 191, 0.14);
}

@media (prefers-color-scheme: dark) {
  :root {
    --mp-bg-base: #0b1120;
    --mp-bg-top: #111a2f;
    --mp-bg-bottom: #0a1224;
    --mp-ring-client: rgba(16, 185, 129, 0.2);
    --mp-ring-advisor: rgba(99, 102, 241, 0.18);
    --mp-ring-bridge: rgba(14, 116, 144, 0.22);
  }
}

.mp-page-shell {
  position: relative;
  min-height: 100vh;
  background-color: var(--mp-bg-base);
  background-image:
    radial-gradient(circle at 85% -10%, var(--mp-ring-bridge) 0, var(--mp-ring-bridge) 34%, transparent 65%),
    radial-gradient(circle at -18% 84%, var(--mp-ring-advisor) 0, var(--mp-ring-advisor) 32%, transparent 66%),
    radial-gradient(circle at 72% 78%, var(--mp-ring-client) 0, var(--mp-ring-client) 30%, transparent 62%),
    linear-gradient(180deg, var(--mp-bg-top) 0%, var(--mp-bg-bottom) 100%);
  background-repeat: no-repeat;
}
</style>
