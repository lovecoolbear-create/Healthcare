'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  user: { name: string; role: string } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      // 1. 如果在 PWA 独立模式下且有客户端 ID，立即跳过所有验证逻辑进入 /track
      const isStandalone = typeof window !== 'undefined' && (
        (window.navigator as any).standalone || 
        window.matchMedia('(display-mode: standalone)').matches
      );
      
      const savedClientId = typeof window !== 'undefined' ? localStorage.getItem('hc_client_id') : null;

      if (isStandalone && savedClientId) {
        console.log('[Auth] PWA 模式 + 存在 ID，直接进入应用');
        setLoading(false);
        return;
      }

      // 2. 原有的身份验证逻辑...
      try {
        const authStatus = localStorage.getItem('hc_practitioner_auth');
        if (authStatus === 'true') {
          setIsAuthenticated(true);
          setUser({ name: '张营养师', role: '高级营养师' });
        }

        const urlParams = new URLSearchParams(window.location.search);
        const urlClientId = urlParams.get('clientId');
        const finalClientId = urlClientId || savedClientId;

        if (finalClientId) {
          localStorage.setItem('hc_client_id', finalClientId);
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    // 强制放行所有客户打卡相关的路径 (使用 window.location 作为备份检测)
    const isStandalone = typeof window !== 'undefined' && (
      (window.navigator as any).standalone || 
      window.matchMedia('(display-mode: standalone)').matches
    );
    
    const isTrackPath = pathname?.startsWith('/track') || (typeof window !== 'undefined' && window.location.pathname.startsWith('/track'));
    
    // 如果是 PWA 模式且有客户端 ID，强制跳转到 /track
    if (isStandalone && !isTrackPath && typeof window !== 'undefined') {
      const clientId = localStorage.getItem('hc_client_id');
      if (clientId) {
        console.log('[Auth] PWA 模式检测到客户端 ID，正在重定向到 /track');
        router.push('/track');
        return;
      }
    }

    if (isTrackPath) {
      setLoading(false);
      return;
    }

    if (!loading && !isAuthenticated && pathname !== '/login') {
      router.push('/login');
    }
  }, [isAuthenticated, loading, pathname, router]);

  const login = async (password: string) => {
    // Mock login logic - any password works for now, or use 'admin123'
    if (password === 'admin123' || password === '123456') {
      localStorage.setItem('hc_practitioner_auth', 'true');
      setIsAuthenticated(true);
      setUser({ name: '张营养师', role: '高级营养师' });
      router.push('/');
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('hc_practitioner_auth');
    setIsAuthenticated(false);
    setUser(null);
    router.push('/login');
  };

  // 渲染逻辑：如果是打卡路径或者加载完成，渲染内容；否则在 PWA 模式下也放行以避免白屏
  const shouldRender = !loading || 
    pathname?.startsWith('/track') || 
    (typeof window !== 'undefined' && (
      (window.navigator as any).standalone || 
      window.matchMedia('(display-mode: standalone)').matches
    ));

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, user }}>
      <div id="auth-debug" style={{ display: 'none' }}>auth-ready</div>
      {shouldRender ? children : (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
