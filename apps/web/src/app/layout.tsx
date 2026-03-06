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
  manifest: "/manifest-v12.json?v=FINAL_V5",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HC Pro V12",
  },
  other: {
    "version": "1.2.0-FINAL-V5",
    "apple-mobile-web-app-capable": "yes",
    "mobile-web-app-capable": "yes",
    "cache-control": "no-cache, no-store, must-revalidate",
    "pragma": "no-cache",
    "expires": "0"
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
                navigator.serviceWorker.register('/sw.js?v=V5_FINAL').then(function(reg) {
                  console.log('New SW registered');
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
