'use client';

import React, { useRef, useState } from 'react';
import { Award, TrendingDown, Share2, X, Download, ShieldCheck } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Client, WeightLog } from '@healthcare/shared';

interface AchievementCardProps {
  client: Client;
  type: 'streak' | 'milestone';
  value: number; // days or percentage
  onClose: () => void;
  latestWeightLog?: WeightLog;
}

export const AchievementCard: React.FC<AchievementCardProps> = ({ 
  client, type, value, onClose, latestWeightLog 
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const desensitizedName = (client?.name || '').length > 1 
    ? client.name[0] + '＊' + (client.name.length > 2 ? client.name[client.name.length - 1] : '')
    : (client?.name || '健康用户');

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, quality: 0.95 });
      const link = document.createElement('a');
      link.download = `healthcare-achievement-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate image', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-sm">
        {/* Card Content (The part that will be captured) */}
        <div 
          ref={cardRef}
          className="bg-white rounded-[40px] overflow-hidden shadow-2xl border border-white/20"
        >
          {/* Header Background (统一为 Web 端翡翠绿渐变) */}
          <div className="h-32 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 relative overflow-hidden p-8 flex items-end">
            <div className="absolute top-0 right-0 p-6 opacity-20 rotate-12 scale-110">
              <Award className="w-32 h-32 text-white" />
            </div>
            <div className="relative z-10">
              <div className="text-[10px] font-black text-emerald-100/80 uppercase tracking-[0.2em] mb-1.5">今日战报 · ACHIEVEMENTS</div>
              <h2 className="text-2xl font-black text-white tracking-tight">恭喜你，{desensitizedName}！</h2>
            </div>
          </div>

          <div className="p-8 space-y-8 bg-white">
            {/* Main Stats */}
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-emerald-50 rounded-[28px] flex flex-col items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm shadow-emerald-100/50">
                {type === 'streak' ? (
                  <>
                    <span className="text-2xl font-black leading-none">{value}</span>
                    <span className="text-[9px] font-black uppercase mt-1 tracking-tighter">天连打</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-black leading-none">{value.toFixed(1)}</span>
                    <span className="text-[9px] font-black uppercase mt-1 tracking-tighter">体脂↓</span>
                  </>
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="text-lg font-black text-slate-900 tracking-tight leading-tight">
                  {type === 'streak' ? `成功连续打卡 ${value} 天` : `体脂率下降了 ${value.toFixed(1)}%`}
                </div>
                <p className="text-xs text-slate-400 font-bold leading-relaxed">
                  {type === 'streak' 
                    ? "坚持就是胜利，你已经战胜了 90% 的自律者。" 
                    : "每一克脂肪的消失，都是对健康的最高礼赞。"}
                </p>
              </div>
            </div>

            {/* Metrics Chart / Info */}
            <div className="bg-slate-50 rounded-[32px] p-6 border border-slate-100/50">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl shadow-sm shadow-emerald-100/50">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">体重趋势</span>
                </div>
                <div className="text-[10px] font-black text-emerald-700 bg-emerald-100/50 px-3 py-1 rounded-full border border-emerald-100/50">持续优化中</div>
              </div>
              
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-400 mb-1">当前体重</div>
                  <div className="text-2xl font-black text-slate-900">{latestWeightLog?.weight_kg || '--'} <span className="text-xs text-slate-400 ml-0.5">KG</span></div>
                </div>
                <div className="w-24 h-12 flex items-end gap-1">
                   {/* Simplified curve bars */}
                   {[40, 60, 50, 80, 70, 90, 85].map((h, i) => (
                     <div key={i} className="flex-1 bg-blue-500/20 rounded-t-sm" style={{ height: `${h}%` }}>
                        {i === 6 && <div className="w-full bg-blue-600 rounded-t-sm" style={{ height: '100%' }} />}
                     </div>
                   ))}
                </div>
              </div>
            </div>

            {/* Daily Quote */}
            <div className="pt-4 border-t border-slate-50">
               <p className="text-sm italic font-medium text-slate-600 leading-relaxed">
                 “真正的改变，发生在你决定不再回头的那一刻。”
               </p>
            </div>

            {/* Footer Watermark */}
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-slate-900 rounded-lg flex items-center justify-center text-[10px] font-black text-white">H</div>
                <span className="text-[10px] font-black text-slate-400 tracking-tighter">Powered by HealthCare</span>
              </div>
              <ShieldCheck className="w-4 h-4 text-slate-200" />
            </div>
          </div>
        </div>

        {/* Action Buttons (Not part of the capture) */}
        <div className="mt-8 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 h-14 bg-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] backdrop-blur-md border border-white/10 active:scale-95 transition-all"
          >
            稍后再说
          </button>
          <button 
            onClick={handleDownload}
            disabled={isGenerating}
            className="flex-[2] h-14 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            生成今日战报
          </button>
        </div>
      </div>
    </div>
  );
};
