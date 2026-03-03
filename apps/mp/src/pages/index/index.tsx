import { useState, useMemo } from 'react'
import { View, Text, Slider, Button, ScrollView, Image } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import DailyActionCard from '../../components/DailyActionCard'
import TrendChart from '../../components/TrendChart'
import { 
  mockClient, 
  mockInventory, 
  mockGoals, 
  mockMetrics, 
  mockFeeds,
  mockProtocol,
  mockProtocolInstance 
} from '../../mocks/data'
import './index.scss'

export default function Index() {
  const currentPhase = useMemo(() => {
    return mockProtocol.phases.find(p => p.id === mockProtocolInstance.current_phase_id)
  }, [])

  const dayInPhase = useMemo(() => {
    const start = new Date(mockProtocolInstance.start_date)
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }, [])
  const [morningStatus, setMorningStatus] = useState<'pending' | 'completed' | 'locked'>('pending')
  const [noonStatus, setNoonStatus] = useState<'pending' | 'completed' | 'locked'>('locked')
  const [eveningStatus, setEveningStatus] = useState<'pending' | 'completed' | 'locked'>('locked')
  const [loyaltyPoints, setLoyaltyPoints] = useState(mockClient.loyalty_points || 0)
  const [checkinStreak, setCheckinStreak] = useState(mockClient.checkin_streak || 0)
  const [showEnergySlider, setShowEnergySlider] = useState(false)
  const [showInventoryCalibration, setShowInventoryCalibration] = useState(false)
  const [showPointsRedemption, setShowPointsRedemption] = useState(false)
  const [energyValue, setEnergyValue] = useState(5)
  const [calibratingInventory, setCalibratingInventory] = useState<any[]>([])

  // 1. The Daily Action Data Support (Protocol Driven)
  const morningTasks = useMemo(() => {
    if (!currentPhase) return []
    return currentPhase.actions
      .filter(a => a.time_slot === 'morning')
      .map(a => mockInventory.find(i => i.product_id === a.product_id)?.product?.name || '未知产品')
  }, [currentPhase])

  const noonTasks = useMemo(() => {
    if (!currentPhase) return []
    return currentPhase.actions
      .filter(a => a.time_slot === 'noon')
      .map(a => mockInventory.find(i => i.product_id === a.product_id)?.product?.name || '未知产品')
  }, [currentPhase])

  const eveningTasks = useMemo(() => {
    if (!currentPhase) return []
    return currentPhase.actions
      .filter(a => a.time_slot === 'evening')
      .map(a => mockInventory.find(i => i.product_id === a.product_id)?.product?.name || '未知产品')
  }, [currentPhase])

  // 2. The Mirror Data Support (Trends)
  const energyTrend = useMemo(() => [
    { label: '周一', value: 4 },
    { label: '周二', value: 5 },
    { label: '周三', value: 4 },
    { label: '周四', value: 6 },
    { label: '周五', value: 7 },
    { label: '周六', value: 8 },
    { label: '今天', value: mockMetrics.find(m => m.metric_type === 'Energy')?.metric_value || 8 },
  ], [])

  const weightTrend = useMemo(() => [
    { label: '1月', value: 78 },
    { label: '2月', value: 76.5 },
    { label: '3月', value: mockMetrics.find(m => m.metric_type === 'Weight')?.metric_value || 75.5 },
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

  const [showIntervention, setShowIntervention] = useState(false)

  useLoad(() => {
    console.log('Page loaded with data support.')
    setCalibratingInventory(mockInventory.map(item => ({ ...item })))
    
    // 模拟收到营养师的干预消息
    setTimeout(() => {
      setShowIntervention(true)
    }, 2000)
  })

  const handleMorningCheckin = () => {
    setMorningStatus('completed')
    setNoonStatus('pending')
    setShowEnergySlider(true)
    earnPoints(10, '晨起打卡')
  }

  const earnPoints = (amount: number, reason: string) => {
    setLoyaltyPoints(prev => prev + amount)
    Taro.showToast({
      title: `+${amount} 积分 (${reason})`,
      icon: 'success',
      duration: 1500
    })
  }

  const handleEveningCheckin = () => {
    setEveningStatus('completed')
    const newStreak = checkinStreak + 1
    setCheckinStreak(newStreak)
    earnPoints(10, '晚间打卡')
    
    // Milestone rewards
    if (newStreak === 3) {
      earnPoints(50, '3天连击达成')
    } else if (newStreak === 7) {
      earnPoints(150, '7天连击达成')
    } else if (newStreak === 14) {
      earnPoints(400, '14天连击达成')
    }
  }

  const handleEnergyChange = (e: any) => {
    setEnergyValue(e.detail.value)
  }

  const submitEnergy = () => {
    setShowEnergySlider(false)
    // Here we would call the API to update health_metrics in Supabase
    console.log('Submitting energy score to DB:', energyValue)
  }

  const handleInventoryChange = (id: string, newCount: number) => {
    setCalibratingInventory(prev => prev.map(item => 
      item.id === id ? { ...item, current_inventory: Math.max(0, newCount) } : item
    ))
  }

  const submitInventoryCalibration = () => {
    setShowInventoryCalibration(false)
    console.log('Calibrated inventory saved:', calibratingInventory)
  }

  const handleSymptomReport = () => {
    Taro.showModal({
      title: '不适反馈',
      content: '是否将当前体感不适发送给营养师？系统将自动调整后续方案。',
      confirmText: '发送',
      success: (res) => {
        if (res.confirm) {
          Taro.showToast({ title: '已同步至营养师', icon: 'success' })
        }
      }
    })
  }

  const handleRequestReup = (productName: string) => {
    Taro.showToast({
      title: `补货申请已发送: ${productName}`,
      icon: 'success'
    })
  }

  const handleShareProgress = () => {
    Taro.showLoading({ title: '生成分享海报...' })
    setTimeout(() => {
      Taro.hideLoading()
      Taro.showModal({
        title: '成就海报已生成',
        content: '你的依从性超过了 95% 的用户，精力评分稳步提升，快去分享你的“身体实验室”成果吧！',
        confirmText: '保存海报',
        success: (res) => {
          if (res.confirm) {
            Taro.showToast({ title: '已保存到相册', icon: 'success' })
          }
        }
      })
    }, 1200)
  }

  const handleRedeem = (item: { name: string, points: number }) => {
    if (loyaltyPoints < item.points) {
      Taro.showToast({ title: '积分不足', icon: 'error' })
      return
    }

    Taro.showModal({
      title: '确认兑换',
      content: `确定消耗 ${item.points} 积分兑换“${item.name}”吗？`,
      success: (res) => {
        if (res.confirm) {
          setLoyaltyPoints(prev => prev - item.points)
          Taro.showToast({ title: '兑换成功', icon: 'success' })
          setShowPointsRedemption(false)
        }
      }
    })
  }

  const switchToPractitioner = () => {
    Taro.reLaunch({ url: '/pages/practitioner/index' })
  }

  return (
    <View className='index'>
      {/* 营养师干预消息 (Silent Care) */}
      {showIntervention && (
        <View className='intervention-banner' onClick={() => setShowIntervention(false)}>
          <View className='content'>
            <Text className='icon'>💬</Text>
            <Text className='msg'>张营养师：看到你最近两天没打卡了，是忘带补剂了吗？</Text>
          </View>
          <Text className='close'>✕</Text>
        </View>
      )}

      {/* 角色切换测试按钮 */}
      <View className='role-switcher' onClick={switchToPractitioner}>
        <Text>切换至营养师模式</Text>
      </View>
      {/* 3. 数字化分身 (The Human Touch) - 顶部方案置顶 */}
      <View className='dimension-badge human-touch'>THE HUMAN TOUCH · 数字化分身</View>
      <View className='human-touch-header'>
        <View className='practitioner-info'>
          <View className='greeting-row'>
            <Text className='greeting'>你好，{mockClient.name}</Text>
            <View className='points-badge' onClick={() => setShowPointsRedemption(true)}>
              <View className='streak-info'>
                <Text className='streak-val'>{checkinStreak}</Text>
                <Text className='streak-label'>天连击</Text>
              </View>
              <View className='divider' />
              <Text className='icon'>💎</Text>
              <Text className='value'>{loyaltyPoints}</Text>
            </View>
          </View>
          <Text className='practitioner-note'>“今天也要记得多喝水哦！” —— 张营养师</Text>
        </View>
        <View className='header-actions'>
          {mockClient.adherence_score && mockClient.adherence_score >= 90 && (
            <View className='share-badge' onClick={handleShareProgress}>
              <Text className='icon'>🏆</Text>
              <Text className='text'>分享成就</Text>
            </View>
          )}
          <View className='quick-call'>
            <Text className='call-icon' onClick={() => Taro.showToast({ title: '拨号中...', icon: 'loading' })}>📞</Text>
          </View>
        </View>
      </View>

      <View className='human-touch-pinned'>
        <View className='protocol-header'>
          <Text className='protocol-name'>{mockProtocol.name}</Text>
          <Text className='phase-tag'>{currentPhase?.name}</Text>
        </View>
        <View className='progress-section'>
          <View className='progress-track'>
            <View className='progress-fill' style={{ width: `${(dayInPhase / (currentPhase?.duration_days || 14)) * 100}%` }} />
          </View>
          <View className='progress-text'>
            <Text className='day'>第 {dayInPhase} 天</Text>
            <Text className='total'>共 {currentPhase?.duration_days} 天</Text>
          </View>
        </View>
        <View className='pinned-item'>
          <Text className='label'>调理目标：</Text>
          <Text className='value'>{mockGoals.goal_title}</Text>
        </View>
        <View className='pinned-item'>
          <Text className='label'>喝水目标：</Text>
          <Text className='value'>{mockGoals.water_target_ml}ml (已完成 60%)</Text>
        </View>
      </View>

      {/* 证据墙 (Evidence Wall) */}
      <View className='evidence-wall'>
        <View className='section-header'>
          <Text className='section-title'>好转证据墙</Text>
          <Text className='more' onClick={() => Taro.showToast({ title: '更多记录即将开启', icon: 'none' })}>查看全部</Text>
        </View>
        <ScrollView scrollX className='evidence-scroll'>
          {mockClient.evidence_chain?.filter(e => !e.is_private).map(item => (
            <View key={item.id} className='evidence-card'>
              {item.images && item.images.length > 0 && (
                <Image className='evidence-img' src={item.images[0]} mode='aspectFill' />
              )}
              <View className='evidence-content'>
                <Text className='date'>{item.date}</Text>
                <Text className='title'>{item.title}</Text>
                <Text className='desc'>{item.description}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* 1. 极速对齐 (The Daily Action) - 核心打卡区域 */}
      <View className='daily-action-section'>
        <View className='section-header'>
          <View className='dimension-badge daily-action'>THE DAILY ACTION · 极速对齐</View>
          <View className='inventory-trigger' onClick={() => setShowInventoryCalibration(true)}>
            <Text className='icon'>📦</Text>
            <Text>库存校准</Text>
          </View>
        </View>
        
        <DailyActionCard 
          timeSlot='晨起' 
          products={morningTasks} 
          status={morningStatus}
          onCheckin={handleMorningCheckin}
          onSymptomReport={handleSymptomReport}
          insight='益生菌正在调节肠道屏障，为全天免疫力打底。'
        />

        <DailyActionCard 
          timeSlot='午间' 
          products={noonTasks} 
          status={noonStatus}
          onCheckin={() => {
            setNoonStatus('completed')
            setEveningStatus('pending')
            earnPoints(10, '午间打卡')
          }}
          onSymptomReport={handleSymptomReport}
          insight='辅酶 Q10 正在激活线粒体，优化心脏泵血效能。'
        />

        <DailyActionCard 
          timeSlot='晚间' 
          products={eveningTasks} 
          status={eveningStatus}
          onCheckin={handleEveningCheckin}
          onSymptomReport={handleSymptomReport}
          insight='镁元素正在协助神经舒缓，提升深度睡眠比例。'
        />

        {/* 精力滑块 (体感微调研) */}
        {showEnergySlider && (
          <View className='overlay'>
            <View className='modal-card'>
              <Text className='modal-title'>今日精力值校准</Text>
              <Text className='modal-subtitle'>滑动选择你现在的体感评分 (1-10)</Text>
              <Text className='value-large'>{energyValue} 分</Text>
              <Slider 
                min={1} 
                max={10} 
                step={1} 
                value={energyValue} 
                activeColor='#10b981' 
                onChange={handleEnergyChange}
              />
              <View className='slider-labels'>
                <Text>疲惫</Text>
                <Text>精力充沛</Text>
              </View>
              <Button className='primary-btn' onClick={submitEnergy}>
                确认提交
              </Button>
            </View>
          </View>
        )}

        {/* 库存校准弹窗 */}
        {showInventoryCalibration && (
          <View className='overlay'>
            <View className='modal-card inventory-modal'>
              <Text className='modal-title'>库存管理</Text>
              <Text className='modal-subtitle'>确认你手边剩余的产品数量</Text>
              
              <View className='inventory-list'>
                {calibratingInventory.map(item => (
                  <View key={item.id} className='inventory-item'>
                    <View className='item-info-row'>
                      <View className='item-meta'>
                        <Text className='name'>{item.product?.name}</Text>
                        <Text className='spec'>{item.product?.spec}</Text>
                      </View>
                      {item.current_inventory <= 5 && (
                        <View 
                          className='reup-btn' 
                          onClick={() => handleRequestReup(item.product?.name || '')}
                        >一键补货</View>
                      )}
                    </View>
                    <View className='counter'>
                      <View className='btn minus' onClick={() => handleInventoryChange(item.id, item.current_inventory - 1)}>-</View>
                      <Text className='count'>{item.current_inventory}</Text>
                      <View className='btn plus' onClick={() => handleInventoryChange(item.id, item.current_inventory + 1)}>+</View>
                    </View>
                  </View>
                ))}
              </View>

              <View className='modal-actions'>
                <Button className='secondary-btn' onClick={() => setShowInventoryCalibration(false)}>取消</Button>
                <Button className='primary-btn' onClick={submitInventoryCalibration}>保存校准结果</Button>
              </View>
            </View>
          </View>
        )}

        {/* 积分兑换弹窗 */}
        {showPointsRedemption && (
          <View className='overlay'>
            <View className='modal-card points-modal'>
              <View className='modal-header'>
                <Text className='modal-title'>积分兑换中心</Text>
                <View className='current-points'>
                  <Text className='label'>当前积分：</Text>
                  <Text className='value'>{loyaltyPoints}</Text>
                </View>
              </View>
              
              <View className='redeem-list'>
                {[
                  { id: '1', name: '营养学基础讲座门票', points: 500, icon: '🎫', desc: '由资深营养师主讲，在线互动解答' },
                  { id: '2', name: '肠道健康深度评测', points: 1200, icon: '🧬', desc: '包含 15 项核心指标深度解析' },
                  { id: '3', name: '营养师一对一语音咨询', points: 2000, icon: '🎧', desc: '15 分钟深度沟通，优化调理方案' },
                  { id: '4', name: '限定周边：身体实验室水杯', points: 3000, icon: '🥤', desc: '提醒你每天准时喝水的好伙伴' },
                ].map(item => (
                  <View key={item.id} className='redeem-item'>
                    <View className='item-icon'>{item.icon}</View>
                    <View className='item-info'>
                      <Text className='item-name'>{item.name}</Text>
                      <Text className='item-desc'>{item.desc}</Text>
                      <View className='item-footer'>
                        <Text className='item-points'>{item.points} 积分</Text>
                        <Button 
                          className={`redeem-btn ${loyaltyPoints < item.points ? 'disabled' : ''}`}
                          onClick={() => handleRedeem(item)}
                        >
                          立即兑换
                        </Button>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              <View className='modal-actions'>
                <Button className='secondary-btn' onClick={() => setShowPointsRedemption(false)}>返回</Button>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* 2. 好转进度条 (The Mirror) - 可视化 */}
      <View className='mirror-section'>
        <View className='dimension-badge mirror'>THE MIRROR · 好转进度条</View>
        
        <View className='dual-track-charts'>
          <TrendChart title='主观线：精力值变化' data={energyTrend} color='#10b981' />
          <TrendChart title='主观线：睡眠质量' data={sleepTrend} color='#8b5cf6' />
          <TrendChart title='客观线：体重趋势 (kg)' data={weightTrend} color='#3b82f6' />
        </View>

        <View className='science-insight-card'>
          <View className='insight-header'>
            <Text className='insight-title'>细胞修复进度</Text>
            <Text className='insight-badge'>Day 14</Text>
          </View>
          <Text className='insight-content'>
            你已连续服用 Q10 十四天，心脏线粒体供能正在优化中，预计本周末体感精力将进一步提升。
          </Text>
        </View>
      </View>

      {/* 专业投喂 */}
      <View className='feed-section'>
        <Text className='section-title'>专业投喂 (Expert Feed)</Text>
        {mockFeeds.map(feed => (
          <View className='feed-card' key={feed.id}>
            <Text className='feed-title'>{feed.title}</Text>
            <Text className='feed-desc'>{feed.summary}</Text>
            <View className='feed-footer'>
              <Text className='feed-time'>刚刚</Text>
              <Text className='read-more'>查看全文 →</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}
