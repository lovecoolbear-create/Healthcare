'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, User, LayoutDashboard, ShieldCheck, UserPlus } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    const success = await login(password);
    if (!success) {
      setError('密码错误，请重新输入 (提示: 123456)');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200 mb-4">
            <LayoutDashboard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">HealthCare Pro</h1>
          <p className="text-slate-500 mt-2">营养师专业工作台 · 数字化调理系统</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 p-8 border border-slate-100">
          <div className="flex items-center gap-2 mb-6 text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
            <span className="font-semibold text-sm">安全登录认证</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                账号
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  disabled
                  value="张营养师 (高级)"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-sm cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                登录密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  placeholder="请输入 6 位登录密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-11 pr-4 py-3 bg-white border ${error ? 'border-red-500' : 'border-slate-200'} rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all`}
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                  <span>⚠️</span> {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 rounded-xl font-bold text-sm text-white transition-all shadow-lg ${
                isLoading 
                  ? 'bg-slate-300 cursor-not-allowed' 
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 active:scale-[0.98]'
              }`}
            >
              {isLoading ? '正在认证...' : '立即登录'}
            </button>

            <div className="text-center mt-4">
              <Link 
                href="/register" 
                className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                还没有账号？申请注册
              </Link>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-50 text-center">
            <p className="text-xs text-slate-400">
              数据受 SSL 加密保护 · 仅限授权营养师访问
            </p>
          </div>
        </div>
        
        {/* Footer info */}
        <p className="text-center text-slate-400 text-[10px] mt-8 uppercase tracking-widest">
          © 2026 HealthCare Technology Group. All rights reserved.
        </p>
      </div>
    </div>
  );
}
