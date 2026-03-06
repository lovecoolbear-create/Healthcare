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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HealthCare",
    startupImage: [
      {
        url: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
        media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)',
      },
    ],
  },
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
        <Script id="unregister-sw-aggressive" strategy="beforeInteractive">
          {`
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for(let registration of registrations) {
                  registration.unregister();
                  console.log('[System] ServiceWorker Unregistered Aggressively');
                }
              });
            }
            // 终极 HTML 层级监控
            window.addEventListener('touchstart', function(e) {
              console.log('[HTML Touch]', e.target.tagName, e.target.className);
              const indicator = document.createElement('div');
              indicator.style.position = 'fixed';
              indicator.style.top = '10px';
              indicator.style.right = '10px';
              indicator.style.background = 'red';
              indicator.style.color = 'white';
              indicator.style.padding = '5px';
              indicator.style.zIndex = '999999';
              indicator.innerText = 'Touch: ' + e.target.tagName;
              document.body.appendChild(indicator);
              setTimeout(() => indicator.remove(), 1000);
            }, true);
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
