import { View, Text, ScrollView, Image, Button } from '@tarojs/components'
import { useMemo } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { Client, ClientInventory, FollowUpNote, ProtocolPhase, ProtocolAction } from '@healthcare/shared'
import { mockClients, mockInventory, mockProtocol, mockProtocolInstance } from '../../../mocks/data'
import TrendChart from '../../../components/TrendChart'
import './index.scss'

export default function ClientDetail() {
  const router = useRouter()
  const { id } = router.params
  
  const client = useMemo(() => 
    mockClients.find((c: Client) => c.id === id) || mockClients[0], 
    [id]
  )

  const inventoryItems = useMemo(() => 
    mockInventory.filter((i: ClientInventory) => i.client_id === client.id),
    [client.id]
  )

  // 1. Mirror Data (Sync with Client View)
  const energyTrend = useMemo(() => [
    { label: '周一', value: 4 },
    { label: '周二', value: 5 },
    { label: '周三', value: 4 },
    { label: '周四', value: 6 },
    { label: '周五', value: 7 },
    { label: '周六', value: 8 },
    { label: '今天', value: 8 },
  ], [])

  const weightTrend = useMemo(() => [
    { label: '1月', value: 78 },
    { label: '2月', value: 76.5 },
    { label: '3月', value: 75.5 },
  ], [])

  const sleepTrend = useMemo(() => [
    { label: '周一', value: 6.5 },
    { label: '周二', value: 7 },
    { label: '周三', value: 6 },
    { label: '周四', value: 7.5 },
    { label: '周五', value: 8 },
    { label: '周六', value: 8.5 },
    { label: '今天', value: 8 },
  ], [])

  const currentProtocol = useMemo(() => mockProtocol, [])
  const currentPhase = useMemo(() => 
    mockProtocol.phases.find((p: ProtocolPhase) => p.id === mockProtocolInstance.current_phase_id), 
    []
  )

  const latestEvidence = useMemo(() => 
    client.evidence_chain?.filter(e => !e.is_private)[0],
    [client.evidence_chain]
  )

  const handleGenerateReport = () => {
    Taro.showLoading({ title: '正在合成周报...' })
    setTimeout(() => {
      Taro.hideLoading()
      Taro.showModal({
        title: '好转周报已生成',
        content: '报告包含：精力提升 40%，依从性 95%，已同步至客户微信。',
        confirmText: '去查看',
        success: (res) => {
          if (res.confirm) {
            Taro.showToast({ title: '已发送至客户', icon: 'success' })
          }
        }
      })
    }, 1500)
  }

  const handleCopyTemplate = () => {
    const template = `Hi ${client.name}，我是你的营养师。看到你这周依从性达到了 ${client.adherence_score}%，表现非常棒！
精力评分也从之前的 4 分稳步提升到了 8 分。继续保持，我们的目标是让这种状态常态化。
对了，你的辅酶 Q10 还有大概 2 天的量，需要帮你提前安排补货吗？`
    
    Taro.setClipboardData({
      data: template,
      success: () => {
        Taro.showToast({ title: '话术已复制', icon: 'success' })
      }
    })
  }

  return (
    <ScrollView scrollY className='client-detail-container'>
      <View className='detail-header'>
        <View className='client-profile'>
          <Image className='avatar' src={client.avatar_url || ''} />
          <View className='info'>
            <Text className='name'>{client.name}</Text>
            <Text className='baseline'>{client.health_baseline}</Text>
          </View>
        </View>
        <View className='action-btns'>
          <Button className='copy-btn' onClick={handleCopyTemplate}>复制话术</Button>
          <Button className='report-btn' onClick={handleGenerateReport}>生成周报</Button>
          <Button className='wechat-btn' onClick={() => Taro.showToast({ title: '正在打开微信...', icon: 'loading' })}>微信沟通</Button>
        </View>
      </View>

      <View className='pdr-summary-card'>
        <View className='pdr-title'>PDR 干预摘要</View>
        <View className='summary-grid'>
          <View className='summary-item'>
            <Text className='label'>依从性</Text>
            <Text className='value highlight'>{client.adherence_score}%</Text>
          </View>
          <View className='summary-item'>
            <Text className='label'>风险等级</Text>
            <Text className={`value ${client.risk_level === 'high' ? 'danger' : ''}`}>
              {client.risk_level === 'high' ? '高风险' : '正常'}
            </Text>
          </View>
          <View className='summary-item'>
            <Text className='label'>积分余额</Text>
            <Text className='value'>{client.loyalty_points || 0}</Text>
          </View>
          <View className='summary-item'>
            <Text className='label'>连续打卡</Text>
            <Text className='value'>{client.checkin_streak || 0} 天</Text>
          </View>
        </View>

        <View className='safety-info'>
          <View className='safety-item'>
            <Text className='label'>过敏史</Text>
            <Text className={`value ${client.allergies ? 'warning' : ''}`}>{client.allergies || '无'}</Text>
          </View>
          <View className='safety-item'>
            <Text className='label'>禁忌症</Text>
            <Text className={`value ${client.contraindications ? 'danger' : ''}`}>{client.contraindications || '无'}</Text>
          </View>
          <View className='safety-item'>
            <Text className='label'>正在用药</Text>
            <Text className='value'>{client.current_medications || '无'}</Text>
          </View>
        </View>

        <View className='client-tags'>
          {client.tags?.map(tag => (
            <Text key={tag} className='tag-pill'>{tag}</Text>
          ))}
        </View>
      </View>

      <View className='section-header'>
        <Text className='section-title'>THE MIRROR · 好转进度条 (同步视图)</Text>
      </View>
      {latestEvidence && (
        <View className='latest-evidence-win'>
          <Text className='win-tag'>最新进展</Text>
          <View className='win-content'>
            <Text className='win-title'>{latestEvidence.title}</Text>
            <Text className='win-desc'>{latestEvidence.description}</Text>
          </View>
        </View>
      )}
      <View className='charts-container'>
        <TrendChart title='精力值变化 (主观)' data={energyTrend} color='#10b981' />
        <TrendChart title='睡眠质量 (主观)' data={sleepTrend} color='#8b5cf6' />
        <TrendChart title='体重趋势 (kg)' data={weightTrend} color='#3b82f6' />
      </View>

      <View className='section-header'>
        <Text className='section-title'>当前方案 (SOP 对齐)</Text>
        <Text className='phase-info'>{currentPhase?.name}</Text>
      </View>
      <View className='protocol-sop-card'>
        <View className='protocol-info'>
          <Text className='name'>{currentProtocol.name}</Text>
          <Text className='desc'>{currentProtocol.description}</Text>
        </View>
        <View className='action-list'>
          {currentPhase?.actions.map((action: ProtocolAction) => {
            const product = mockInventory.find(i => i.product_id === action.product_id)?.product
            return (
              <View key={action.id} className='action-item'>
                <Text className='time'>{action.time_slot === 'morning' ? '晨起' : action.time_slot === 'noon' ? '午间' : '晚间'}</Text>
                <Text className='product'>{product?.name}</Text>
                <Text className='dosage'>{action.dosage}{product?.dosage_unit}</Text>
              </View>
            )
          })}
        </View>
      </View>

      <View className='section-header'>
        <Text className='section-title'>库存状态 (补货识别)</Text>
      </View>
      <View className='inventory-list'>
        {inventoryItems.map((item: ClientInventory) => (
          <View key={item.id} className='inventory-item'>
            <View className='item-info'>
              <Text className='name'>{item.product?.name}</Text>
              <Text className='slot'>{item.time_slot === 'morning' ? '晨起' : item.time_slot === 'noon' ? '午间' : '晚间'}</Text>
            </View>
            <View className='stock-info'>
              <Text className='stock-label'>剩余量</Text>
              <Text className='stock-value'>{item.current_stock} {item.product?.dosage_unit}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* B. 结构化随访时间轴 */}
      <View className='section-header'>
        <Text className='section-title'>证据链 (效果验证)</Text>
      </View>
      <View className='evidence-chain'>
        {client.evidence_chain?.map(item => (
          <View key={item.id} className='evidence-item'>
            <View className='evidence-header'>
              <Text className='date'>{item.date}</Text>
              <Text className='title'>{item.title}</Text>
              {item.is_private && <Text className='private-tag'>私密</Text>}
            </View>
            <Text className='desc'>{item.description}</Text>
          </View>
        ))}
      </View>

      <View className='section-header'>
        <Text className='section-title'>结构化干预时间轴</Text>
      </View>
      <View className='timeline-container'>
        {/* 模拟时间轴节点 */}
        <View className='timeline-item active'>
          <View className='dot' />
          <View className='time-content'>
            <View className='time-header'>
              <Text className='date'>2024-03-02 (今天)</Text>
              <Text className='tag adjustment'>方案调整</Text>
            </View>
            <Text className='desc'>客户反馈精力评分已稳定在 8 分，建议将辅酶 Q10 减量至每日 1 粒，观察心率波动。</Text>
            <View className='metric-pill'>精力值: 8分 (+20%)</View>
          </View>
        </View>

        {client.follow_up_notes?.map((note: FollowUpNote) => (
          <View key={note.id} className='timeline-item'>
            <View className='dot' />
            <View className='time-content'>
              <View className='time-header'>
                <Text className='date'>{note.date}</Text>
                <Text className={`tag ${note.type}`}>{note.type === 'adjustment' ? '方案调整' : '阶段总结'}</Text>
              </View>
              <Text className='desc'>{note.content}</Text>
            </View>
          </View>
        ))}

        <View className='timeline-item'>
          <View className='dot' />
          <View className='time-content'>
            <View className='time-header'>
              <Text className='date'>2024-01-01</Text>
              <Text className='tag start'>方案启动</Text>
            </View>
            <Text className='desc'>开启“12周肝脏修复与代谢优化方案”。初始精力评分: 4分。</Text>
          </View>
        </View>

        <Button className='add-timeline-btn'>+ 添加随访记录</Button>
      </View>
    </ScrollView>
  )
}
