import { View, Text, Button } from '@tarojs/components'
import './DailyActionCard.scss'

interface DailyActionCardProps {
  timeSlot: string; // '晨起' | '午后' | '睡前'
  products: string[];
  status: 'pending' | 'completed' | 'locked';
  onCheckin: () => void;
  onSymptomReport?: () => void;
  insight?: string;
}

export default function DailyActionCard({ timeSlot, products, status, onCheckin, onSymptomReport, insight }: DailyActionCardProps) {
  const isPending = status === 'pending';
  const isCompleted = status === 'completed';

  return (
    <View className={`action-card ${status}`}>
      <View className='card-header'>
        <View className='slot-badge'>{timeSlot}</View>
        <Text className='status-text'>{isCompleted ? '已完成' : isPending ? '待执行' : '未开启'}</Text>
      </View>
      
      <View className='product-list'>
        {products.map((p, i) => (
          <Text key={i} className='product-item'>{p}</Text>
        ))}
      </View>

      {insight && isCompleted && (
        <View className='insight-tip'>
          <Text className='icon'>💡</Text>
          <Text className='text'>{insight}</Text>
        </View>
      )}

      {isPending && (
        <Button className='checkin-btn' onClick={onCheckin}>
          一键服用
        </Button>
      )}

      {(isPending || isCompleted) && onSymptomReport && (
        <View className='symptom-link' onClick={onSymptomReport}>
          有不适体感？
        </View>
      )}

      {isCompleted && (
        <View className='completed-badge'>
          <Text className='check-icon'>✓</Text>
        </View>
      )}
    </View>
  )
}
