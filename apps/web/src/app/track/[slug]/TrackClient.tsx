'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  TrendingUp, 
  Activity, 
  Moon, 
  Zap, 
  ChevronRight,
  Plus,
  ArrowRight,
  ShieldCheck,
  Award,
  MessageSquare,
  Send,
  Scale,
  X
} from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { Feedback, WeightLog } from '@healthcare/shared';

export default function TrackClient({ slug }: { slug: string }) {
  const { 
    clients, 
    protocols, 
    feedbacks, 
    weightLogs, 
    addFeedback, 
    addWeightLog,
    updateFeedback 
  } = useData();
  
  const [activeTab, setActiveTab] = useState<'today' | 'trends' | 'messages' | 'me'>('today');
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newBodyFat, setNewBodyFat] = useState('');
  const [newMessage, setNewMessage] = useState('');

  // 基于 Slug 获取客户数据
  const client = useMemo(() => {
    return clients.find(c => c.slug === slug);
  }, [clients, slug]);

  // 如果客户不存在，显示加载或错误 (实际应用中应有 404)
  if (!client) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-slate-200 rounded-3xl mx-auto animate-pulse" />
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">正在接入加密频道...</p>
        </div>
      </div>
    );
  }

  const currentPhase = useMemo(() => {
    const protocol = protocols.find(p => p.id === client.protocol_id);
    if (!protocol) return null;
    // 简化逻辑：这里假设有一个正在执行的实例，实际应从 ClientProtocolInstance 获取
    return protocol.phases[0]; 
  }, [protocols, client.protocol_id]);

  const clientFeedbacks = useMemo(() => {
    return feedbacks
      .filter(f => f.client_id === client.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [feedbacks, client.id]);

  const latestWeightLog = useMemo(() => {
    const logs = weightLogs.filter(l => l.client_id === client.id);
    if (logs.length === 0) return null;
    return logs.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0];
  }, [weightLogs, client.id]);

  const unreadCount = useMemo(() => {
    return clientFeedbacks.filter(f => f.sender_type === 'practitioner' && !f.is_read).length;
  }, [clientFeedbacks]);

  const [tasks, setTasks] = useState([
    { id: 1, time: 'Morning', label: '益生菌强效装', completed: false, icon: Zap },
    { id: 2, time: 'Noon', label: '辅酶 Q10 200mg', completed: true, icon: Activity },
    { id: 3, time: 'Evening', label: '深海鱼油 1000mg', completed: false, icon: Moon },
  ]);

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleSendFeedback = async () => {
    if (!newMessage.trim()) return;
    
    const feedback: Feedback = {
      id: `msg-${Date.now()}`,
      client_id: client.id,
      practitioner_id: client.practitioner_id,
      content: newMessage,
      sender_type: 'client',
      is_read: false,
      created_at: new Date().toISOString()
    };

    await addFeedback(feedback);
    setNewMessage('');
  };

  const handleAddWeight = async () => {
    if (!newWeight) return;

    const log: WeightLog = {
      id: `weight-${Date.now()}`,
      client_id: client.id,
      weight_kg: parseFloat(newWeight),
      body_fat_percentage: newBodyFat ? parseFloat(newBodyFat) : undefined,
      recorded_at: new Date().toISOString(),
      source: 'manual'
    };

    await addWeightLog(log);
    setIsWeightModalOpen(false);
    setNewWeight('');
    setNewBodyFat('');
  };

  // 进入消息页时，将所有营养师消息标为已读
  useEffect(() => {
    if (activeTab === 'messages') {
      clientFeedbacks.forEach(f => {
        if (f.sender_type === 'practitioner' && !f.is_read) {
          updateFeedback(f.id, { is_read: true });
        }
      });
    }
  }, [activeTab, clientFeedbacks, updateFeedback]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24 select-none touch-manipulation">
      {/* 顶部状态栏装饰 */}
      <div className="h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-amber-500"></div>

      {/* 头部：客户激励看板 */}
      <header className="bg-white p-6 rounded-b-[40px] shadow-sm border-b border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-lg">
              {client.name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight">{client.name}</h1>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Day {(client.checkin_streak || 0) + 1} of Protocol</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-amber-500">
              <Award className="w-4 h-4" />
              <span className="text-lg font-black">{client.loyalty_points || 0}</span>
            </div>
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">Loyalty Points</span>
          </div>
        </div>

        {/* 连续打卡激励条 */}
        <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map(day => (
              <div 
                key={day} 
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black transition-all ${
                  day <= (client.checkin_streak || 0) 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' 
                    : day === (client.checkin_streak || 0) + 1
                    ? 'bg-white border-2 border-emerald-500 text-emerald-500'
                    : 'bg-white border border-slate-200 text-slate-300'
                }`}
              >
                {day}
              </div>
            ))}
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Next Milestone</div>
            <div className="text-xs font-black text-emerald-600">+50 Pts</div>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-8">
        {activeTab === 'today' && (
          <>
            {/* 今日方案执行 (Task List) */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  今日干预执行
                </h2>
                <span className="text-[10px] font-black text-slate-400 uppercase">
                  {tasks.filter(t => t.completed).length}/{tasks.length} Done
                </span>
              </div>
              <div className="space-y-3">
                {tasks.map(task => (
                  <div 
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className={`flex items-center justify-between p-4 rounded-[24px] border transition-all active:scale-95 ${
                      task.completed 
                        ? 'bg-emerald-50 border-emerald-100' 
                        : 'bg-white border-slate-100 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        task.completed ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-400'
                      }`}>
                        <task.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${
                          task.completed ? 'text-emerald-600/50' : 'text-slate-300'
                        }`}>
                          {task.time}
                        </div>
                        <div className={`text-sm font-black ${
                          task.completed ? 'text-emerald-900 line-through opacity-40' : 'text-slate-800'
                        }`}>
                          {task.label}
                        </div>
                      </div>
                    </div>
                    {task.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-200" />
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* 数据采集：体征录入 */}
            <section>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                生命体征记录
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">体重 (KG)</div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-black text-slate-900">
                      {latestWeightLog?.weight_kg || '--'}
                    </span>
                    {latestWeightLog && (
                      <span className="text-[8px] font-black text-slate-300 mb-1.5 uppercase">Latest</span>
                    )}
                  </div>
                </div>
                <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">体脂率 (%)</div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-black text-slate-900">
                      {latestWeightLog?.body_fat_percentage || '--'}
                    </span>
                    {latestWeightLog?.body_fat_percentage && (
                      <span className="text-[8px] font-black text-emerald-500 mb-1.5">RECORDED</span>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsWeightModalOpen(true)}
                className="w-full mt-4 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-xl shadow-slate-900/10 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                更新今日数据
              </button>
            </section>

            {/* 体感反馈 (Feeling) */}
            <section className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">今日体感反馈</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <span className="text-xs font-bold text-slate-500">精力状态</span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map(v => (
                      <div key={v} className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${v === 4 ? 'bg-amber-400 text-white' : 'bg-slate-50 text-slate-300'}`}>{v}</div>
                    ))}
                  </div>
                </div>
                <div className="relative">
                  <textarea 
                    placeholder="记录一下今天的体感变化（如：睡眠改善、胃部舒适度...）"
                    className="w-full h-24 bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-300 pr-12"
                  />
                  <button className="absolute bottom-3 right-3 w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === 'messages' && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                与营养师对话
              </h2>
            </div>
            
            {/* 消息列表 */}
            <div className="space-y-4 min-h-[400px]">
              {clientFeedbacks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300 space-y-4">
                  <MessageSquare className="w-12 h-12 opacity-10" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-center">
                    开始与你的营养师交流吧<br/>
                    获取更专业的建议与支持
                  </p>
                </div>
              ) : (
                clientFeedbacks.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] space-y-1`}>
                      <div className={`px-4 py-3 rounded-[24px] text-sm font-medium leading-relaxed ${
                        msg.sender_type === 'client' 
                          ? 'bg-slate-900 text-white rounded-tr-none' 
                          : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none shadow-sm'
                      }`}>
                        {msg.content}
                      </div>
                      <div className={`text-[8px] font-bold text-slate-400 px-2 flex items-center gap-2 ${
                        msg.sender_type === 'client' ? 'justify-end' : 'justify-start'
                      }`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {msg.sender_type === 'client' && (
                          <span className={msg.is_read ? 'text-emerald-500' : 'text-slate-300'}>
                            {msg.is_read ? '已读' : '送达'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 输入区域 */}
            <div className="fixed bottom-24 left-6 right-6">
              <div className="relative flex items-center gap-2">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendFeedback()}
                  placeholder="给营养师留言..."
                  className="flex-1 bg-white border border-slate-100 shadow-xl rounded-[24px] py-4 px-6 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
                <button 
                  onClick={handleSendFeedback}
                  disabled={!newMessage.trim()}
                  className="w-12 h-12 bg-slate-900 text-white rounded-[20px] flex items-center justify-center hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-slate-900/10"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'trends' && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300">
            <TrendingUp className="w-12 h-12 opacity-10" />
            <p className="text-[10px] font-black uppercase tracking-widest mt-4">数据趋势分析建设中...</p>
          </div>
        )}

        {activeTab === 'me' && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300">
            <Activity className="w-12 h-12 opacity-10" />
            <p className="text-[10px] font-black uppercase tracking-widest mt-4">个人档案管理建设中...</p>
          </div>
        )}
      </main>

      {/* 底部导航栏 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 p-4 flex justify-around items-center z-50">
        <button onClick={() => setActiveTab('today')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'today' ? 'text-emerald-600 scale-110' : 'text-slate-300'}`}>
          <Zap className="w-6 h-6" />
          <span className="text-[8px] font-black uppercase">Today</span>
        </button>
        <button onClick={() => setActiveTab('trends')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'trends' ? 'text-emerald-600 scale-110' : 'text-slate-300'}`}>
          <TrendingUp className="w-6 h-6" />
          <span className="text-[8px] font-black uppercase">Trends</span>
        </button>
        <button onClick={() => setActiveTab('messages')} className={`flex flex-col items-center gap-1 relative transition-all ${activeTab === 'messages' ? 'text-emerald-600 scale-110' : 'text-slate-300'}`}>
          <MessageSquare className="w-6 h-6" />
          <span className="text-[8px] font-black uppercase">Messages</span>
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
              <span className="text-[8px] text-white font-bold">{unreadCount}</span>
            </div>
          )}
        </button>
        <button onClick={() => setActiveTab('me')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'me' ? 'text-emerald-600 scale-110' : 'text-slate-300'}`}>
          <Activity className="w-6 h-6" />
          <span className="text-[8px] font-black uppercase">Me</span>
        </button>
      </nav>

      {/* 体征录入弹窗 */}
      {isWeightModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsWeightModalOpen(false)} />
          <div className="relative w-full bg-white rounded-t-[40px] p-8 space-y-8 animate-in slide-in-from-bottom-full duration-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <Scale className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black text-slate-900">更新今日体征</h3>
              </div>
              <button onClick={() => setIsWeightModalOpen(false)} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">体重 (KG)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  placeholder="00.0"
                  className="w-full bg-slate-50 border-none rounded-2xl p-5 text-xl font-black text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">体脂率 (%) - 可选</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={newBodyFat}
                  onChange={(e) => setNewBodyFat(e.target.value)}
                  placeholder="00.0"
                  className="w-full bg-slate-50 border-none rounded-2xl p-5 text-xl font-black text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>
            </div>

            <button 
              onClick={handleAddWeight}
              disabled={!newWeight}
              className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-slate-900/10 active:scale-95 disabled:opacity-50 transition-all"
            >
              确认并同步
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
