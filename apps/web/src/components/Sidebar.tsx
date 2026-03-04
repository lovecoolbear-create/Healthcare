'use client';

import React from 'react';
import { 
  Database, 
  Users, 
  Package, 
  Layers, 
  ShieldAlert, 
  LogOut,
  LayoutDashboard,
  BarChart3,
  FlaskConical
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

import { ActiveTab } from '../types';

interface SidebarProps {
  activeTab?: ActiveTab;
  onTabChange?: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps & { className?: string }> = ({ activeTab, onTabChange, className }) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleNav = (tab: ActiveTab, path: string) => {
    if (onTabChange) {
      onTabChange(tab);
    }
    // 如果已经在首页，则只需切换 tab
    if (pathname === '/' && path === '/') {
      return;
    }
    // 如果在其他页面（如详情页），则跳转回首页并带上 tab 参数
    router.push(`${path}?tab=${tab}`);
  };

  // 根据当前路径和 activeTab 确定按钮高亮状态
  const isTabActive = (tab: string) => {
    if (pathname !== '/') return false;
    if (tab === 'dashboard') return activeTab === 'dashboard' || !activeTab;
    return activeTab === tab;
  };

  const defaultClasses = "w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 h-screen sticky top-0";

  return (
    <div className={className || defaultClasses}>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">HealthCare</h1>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Data Hub</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 italic mt-2">精准营养元数据中心</p>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-2">核心管理</div>
        
        <button 
          onClick={() => handleNav('dashboard', '/')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isTabActive('dashboard') ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'hover:bg-slate-800'}`}
        >
          <LayoutDashboard className="w-5 h-5" />
          工作台 Dashboard
        </button>

        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mt-8 mb-2">数据维度维护</div>
        
        <button 
          onClick={() => handleNav('clients', '/')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isTabActive('clients') ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'hover:bg-slate-800'}`}
        >
          <Users className="w-5 h-5" />
          客户档案库
        </button>

        <button 
          onClick={() => handleNav('products', '/')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isTabActive('products') ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'hover:bg-slate-800'}`}
        >
          <Package className="w-5 h-5" />
          产品库
        </button>

        <button 
          onClick={() => handleNav('templates', '/')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isTabActive('templates') ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'hover:bg-slate-800'}`}
        >
          <Layers className="w-5 h-5" />
          健康调理配方库
        </button>
        
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mt-8 mb-2">系统支撑</div>
        <button 
          onClick={() => handleNav('triggers', '/')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isTabActive('triggers') ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'hover:bg-slate-800'}`}
        >
          <ShieldAlert className="w-5 h-5" />
          干预触发器配置
        </button>

        <button 
          onClick={() => handleNav('reports', '/')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isTabActive('reports') ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'hover:bg-slate-800'}`}
        >
          <BarChart3 className="w-5 h-5" />
          数据分析报告
        </button>

        <button 
          onClick={() => handleNav('knowledge', '/')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isTabActive('knowledge') ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'hover:bg-slate-800'}`}
        >
          <Database className="w-5 h-5" />
          营养学知识库
        </button>
      </nav>

      <div className="p-4 border-t border-slate-800 shrink-0">
        <div 
          onClick={logout}
          className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white">
            {user?.name?.[0] || '张'}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="text-sm font-medium text-white truncate">{user?.name || '张营养师'}</div>
            <div className="text-[10px] text-slate-500 truncate">{user?.role || '高级营养师'}</div>
          </div>
          <LogOut className="w-4 h-4 text-slate-500 group-hover:text-red-400 transition-colors" />
        </div>
      </div>
    </div>
  );
};
