import React from 'react';

interface DataPoint {
  label: string;
  value: number;
}

interface TrendChartProps {
  title: string;
  data: DataPoint[];
  color?: string;
  unit?: string;
}

export function TrendChart({ title, data, color = '#10b981', unit = '' }: TrendChartProps) {
  if (!data || data.length === 0) return (
    <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100 h-64 flex items-center justify-center text-slate-300 text-xs font-black uppercase tracking-widest">
      暂无数据
    </div>
  );

  const maxVal = Math.max(...data.map(d => d.value), 10) * 1.1;
  const minVal = Math.min(...data.map(d => d.value), 0);
  const range = maxVal - minVal;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d.value - minVal) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm group hover:border-emerald-200 transition-all duration-500">
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }}></div>
          {title}
        </h4>
        <span className="text-xs font-black text-slate-900">
          {data[data.length - 1].value}
          <span className="text-[10px] text-slate-400 ml-0.5 font-normal uppercase">{unit}</span>
        </span>
      </div>
      
      <div className="relative h-40 w-full">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
          {/* 网格线 */}
          {[0, 25, 50, 75, 100].map(y => (
            <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#f1f5f9" strokeWidth="0.5" />
          ))}
          
          {/* 渐变填充 */}
          <defs>
            <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`M 0 100 L ${points} L 100 100 Z`}
            fill={`url(#gradient-${title})`}
          />
          
          {/* 折线 */}
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
            className="transition-all duration-1000"
          />
          
          {/* 数据点 */}
          {data.map((d, i) => (
            <circle
              key={i}
              cx={(i / (data.length - 1)) * 100}
              cy={100 - ((d.value - minVal) / range) * 100}
              r="2"
              fill="white"
              stroke={color}
              strokeWidth="2"
              className="hover:r-3 transition-all cursor-pointer"
            >
              <title>{`${d.label}: ${d.value}${unit}`}</title>
            </circle>
          ))}
        </svg>
      </div>
      
      <div className="flex justify-between mt-4">
        {data.filter((_, i) => i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2)).map((d, i) => (
          <span key={i} className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
