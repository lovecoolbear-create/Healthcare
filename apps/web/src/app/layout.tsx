import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "../context/AuthContext";
import { DataProvider } from "../context/DataContext";
import Script from "next/script";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HealthCare Practitioner Dashboard",
  description: "Productivity tool for nutritionists",
  manifest: "/manifest-v14.json?v=V14_FINAL",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HC Pro V14",
  },
  other: {
    "version": "1.2.1-V14",
    "apple-mobile-web-app-capable": "yes",
    "mobile-web-app-capable": "yes",
    "cache-control": "no-cache, no-store, must-revalidate, proxy-revalidate",
    "pragma": "no-cache",
    "expires": "0",
    "surrogate-control": "no-store"
  }
};

export const viewport = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <Script id="cache-buster" strategy="beforeInteractive">
          {`
            // 如果 URL 中包含 clear=true，强制清理所有缓存
            if (window.location.search.includes('clear=true')) {
              localStorage.clear();
              if ('caches' in window) {
                caches.keys().then(function(names) {
                  for (let name of names) caches.delete(name);
                });
              }
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(regs) {
                  for (let reg of regs) reg.unregister();
                });
              }
              // 清理完后去掉参数重新加载，防止死循环
              window.location.href = window.location.pathname;
            }
          `}
        </Script>
        <Script id="sw-registration" strategy="afterInteractive">
          {`
            // 彻底清理并停用旧的 Service Worker
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for(let registration of registrations) {
                  registration.unregister();
                  console.log('SW unregistered');
                }
              });
              
              // 重新注册一个只管清缓存的 SW
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw-v14.js?v=V14_FORCE_' + Date.now()).then(function(reg) {
                  console.log('New V14 SW registered');
                });
              });
            }
            
            // 彻底清理所有缓存存储
            if ('caches' in window) {
              caches.keys().then(function(names) {
                for (let name of names) {
                  caches.delete(name);
                }
              });
            }
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <DataProvider>
            {children}
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
