import { View, Text } from '@tarojs/components'
import './TrendChart.scss'

interface DataPoint {
  label: string;
  value: number;
}

interface TrendChartProps {
  title: string;
  data: DataPoint[];
  color?: string;
}

export default function TrendChart({ title, data, color = '#10b981' }: TrendChartProps) {
  const maxVal = Math.max(...data.map(d => d.value), 10);
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (d.value / maxVal) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <View className='trend-chart-container'>
      <Text className='chart-title'>{title}</Text>
      <View className='chart-wrapper'>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className='svg-chart'>
          {/* 网格线 */}
          <line x1="0" y1="25" x2="100" y2="25" stroke="#f1f5f9" strokeWidth="0.5" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="#f1f5f9" strokeWidth="0.5" />
          <line x1="0" y1="75" x2="100" y2="75" stroke="#f1f5f9" strokeWidth="0.5" />
          
          {/* 折线 */}
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
          
          {/* 数据点 */}
          {data.map((d, i) => (
            <circle
              key={i}
              cx={(i / (data.length - 1)) * 100}
              cy={100 - (d.value / maxVal) * 100}
              r="2"
              fill={color}
            />
          ))}
        </svg>
      </View>
      <View className='chart-labels'>
        {data.map((d, i) => (
          <Text key={i} className='label'>{d.label}</Text>
        ))}
      </View>
    </View>
  )
}
