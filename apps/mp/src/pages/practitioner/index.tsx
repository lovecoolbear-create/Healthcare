import { View, Text, ScrollView, Image, Input } from '@tarojs/components'
import { useState, useMemo } from 'react'
import Taro from '@tarojs/taro'
import { mockClients, mockGlobalTriggers } from '../../mocks/data'
import './index.scss'

export default function PractitionerIndex() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all') // all, stock, compliance, risk, loyalty

  // 1. Critical Triggers (Banner)
  const criticalTriggers = useMemo(() => {
     const triggers = [...mockGlobalTriggers]
     
     // Proactively find clients with issues from mockClients
     mockClients.forEach(client => {
       if ((client.missed_days || 0) >= 3) {
         triggers.push({
           id: `streak-break-${client.id}`,
           name: '连续断服预警',
           type: 'non_compliance',
           category: 'compliance',
           condition_json: '',
           action_type: 'alert_practitioner',
           priority: 'critical',
           action_payload: `${client.name} 已连续 ${client.missed_days} 天未打卡，建议立即沟通。`
         })
       }
       // Check for recent symptoms in evidence_chain (mocking symptom alerts)
       const recentSymptom = client.evidence_chain?.find(e => e.title.includes('不适') || e.title.includes('反应'))
       if (recentSymptom) {
         triggers.push({
           id: `symptom-${client.id}`,
           name: '不适反馈预警',
           type: 'side_effect',
           category: 'symptom',
           condition_json: '',
           action_type: 'alert_practitioner',
           priority: 'critical',
           action_payload: `${client.name} 反馈了“${recentSymptom.title}”，请查看详情并调整方案。`
         })
       }
     })
     
     return triggers.filter(t => t.priority === 'critical')
   }, [])

  // 2. Client Sorting & Filtering Logic
  const filteredClients = useMemo(() => {
    let result = [...mockClients]

    // Search
    if (searchTerm) {
      result = result.filter(c => c.name.includes(searchTerm) || (c.phone && c.phone.includes(searchTerm)))
    }

    // Filter
    if (filterType === 'stock') {
      result = result.filter(c => c.inventory_status && c.inventory_status.some(i => i.remaining_days <= 3))
    } else if (filterType === 'compliance') {
      result = result.filter(c => (c.adherence_score || 0) < 70 || (c.missed_days || 0) >= 3)
    } else if (filterType === 'risk') {
      result = result.filter(c => c.risk_level === 'high' || (c.missed_days || 0) >= 3)
    } else if (filterType === 'loyalty') {
      result = result.sort((a, b) => (b.loyalty_points || 0) - (a.loyalty_points || 0))
      return result
    }

    // Priority Sort: Risk High > Missed 3+ Days > Stock Low > Adherence Low
    return result.sort((a, b) => {
      const aRisk = a.risk_level === 'high' ? 10 : 0
      const bRisk = b.risk_level === 'high' ? 10 : 0
      const aMissed = (a.missed_days || 0) >= 3 ? 8 : 0
      const bMissed = (b.missed_days || 0) >= 3 ? 8 : 0
      const aStock = (a.inventory_status && a.inventory_status.some(i => i.remaining_days <= 3)) ? 5 : 0
      const bStock = (b.inventory_status && b.inventory_status.some(i => i.remaining_days <= 3)) ? 5 : 0
      const aAdherence = (a.adherence_score || 0) < 70 ? 3 : 0
      const bAdherence = (b.adherence_score || 0) < 70 ? 3 : 0
      
      return (bRisk + bMissed + bStock + bAdherence) - (aRisk + aMissed + aStock + aAdherence)
    })
  }, [searchTerm, filterType])

  const switchToClient = () => {
    Taro.reLaunch({ url: '/pages/index/index' })
  }

  const navigateToClientDetail = (id: string) => {
    Taro.navigateTo({ url: `/pages/practitioner/clientDetail/index?id=${id}` })
    console.log('Navigating to client detail:', id)
  }

  return (
    <View className='practitioner-container'>
      <View className='role-switcher' onClick={switchToClient}>
        <Text>切换至客户模式</Text>
      </View>

      <View className='header'>
        <Text className='title'>工作台</Text>
        <Text className='subtitle'>PDR 驱动 · 数字化干预</Text>
      </View>

      {/* 紧急预警轮播/横滑 */}
      {criticalTriggers.length > 0 && (
        <View className='alert-banner-container'>
          <ScrollView scrollX className='alert-banner'>
            {criticalTriggers.map(trigger => (
              <View key={trigger.id} className='alert-card'>
                <View className='alert-icon'>🚨</View>
                <View className='alert-content'>
                  <Text className='alert-title'>{trigger.name}</Text>
                  <Text className='alert-desc'>{trigger.action_payload}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 搜索与筛选 */}
      <View className='search-filter-section'>
        <View className='search-bar'>
          <Text className='search-icon'>🔍</Text>
          <Input 
            placeholder='搜索客户姓名/手机号' 
            value={searchTerm} 
            onInput={(e) => setSearchTerm(e.detail.value)}
          />
        </View>
        <ScrollView scrollX className='filter-tabs'>
          <View 
            className={`filter-tab ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >全部客户</View>
          <View 
            className={`filter-tab ${filterType === 'stock' ? 'active' : ''}`}
            onClick={() => setFilterType('stock')}
          >库存预警</View>
          <View 
            className={`filter-tab ${filterType === 'compliance' ? 'active' : ''}`}
            onClick={() => setFilterType('compliance')}
          >依从性低</View>
          <View 
            className={`filter-tab ${filterType === 'risk' ? 'active' : ''}`}
            onClick={() => setFilterType('risk')}
          >高风险</View>
          <View 
            className={`filter-tab ${filterType === 'loyalty' ? 'active' : ''}`}
            onClick={() => setFilterType('loyalty')}
          >积分排行</View>
        </ScrollView>
      </View>

      <View className='section-header-row'>
        <Text className='section-title'>客户列表 ({filteredClients.length})</Text>
        <Text className='sort-info'>优先级排序</Text>
      </View>
      
      <ScrollView scrollY className='client-list'>
        {filteredClients.map(client => (
          <View key={client.id} className='client-card-pdr' onClick={() => navigateToClientDetail(client.id)}>
            <View className='client-main'>
              <Image className='avatar' src={client.avatar_url || ''} />
              <View className='info'>
                <View className='name-row'>
                  <Text className='name'>{client.name}</Text>
                  {client.risk_level === 'high' && <Text className='badge risk'>高风险</Text>}
                  {/* C. 积分高价值客户识别 */}
                  {client.loyalty_points && client.loyalty_points >= 1000 && (
                    <Text className='badge loyalty-high'>💎 高积分</Text>
                  )}
                  {/* A. 黄金复购窗口识别 */}
                  {client.adherence_score && client.adherence_score >= 80 && 
                   client.inventory_status && client.inventory_status.some(i => i.remaining_days <= 10) && (
                    <Text className='badge reup-gold'>💰 黄金复购期</Text>
                  )}
                </View>
                <Text className='baseline'>{client.health_baseline || '无基准描述'}</Text>
                <View className='tags'>
                  {client.tags?.map(tag => <Text key={tag} className='tag'>{tag}</Text>)}
                </View>
              </View>
            </View>
            
            <View className='metrics-strip'>
              <View className='metric'>
                <Text className='label'>依从性</Text>
                <Text className={`value ${client.adherence_score && client.adherence_score < 70 ? 'low' : ''}`}>
                  {client.adherence_score}%
                </Text>
              </View>
              <View className='metric'>
                <Text className='label'>库存</Text>
                <Text className={`value ${client.inventory_status && client.inventory_status.some(i => i.remaining_days <= 3) ? 'warning' : ''}`}>
                  {client.inventory_status?.length || 0} 品
                </Text>
              </View>
              <View className='metric'>
                <Text className='label'>积分</Text>
                <Text className='value'>{client.loyalty_points || 0}</Text>
              </View>
              <View className='metric'>
                <Text className='label'>状态</Text>
                <Text className='value'>Day {Math.floor((Date.now() - new Date(client.created_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24))}</Text>
              </View>
            </View>

            {/* B. 镜像视图：展示最新好转进展 (PDR 看板同步) */}
            {client.evidence_chain && client.evidence_chain.filter(e => !e.is_private).length > 0 && (
              <View className='latest-win-bubble'>
                <Text className='win-tag'>最新好转</Text>
                <Text className='win-text'>{client.evidence_chain.filter(e => !e.is_private)[0].title}</Text>
              </View>
            )}

            <View className='action-footer'>
              <View className='reason'>
                {(client.missed_days || 0) >= 3 ? (
                  <Text className='alert-text critical'>🚨 连续断服 {client.missed_days} 天</Text>
                ) : client.inventory_status && client.inventory_status.some(i => i.remaining_days <= 3) ? (
                  <Text className='alert-text'>📦 {client.inventory_status.find(i => i.remaining_days <= 3)?.remaining_days}天内断货</Text>
                ) : client.adherence_score && client.adherence_score < 70 ? (
                  <Text className='alert-text'>⚠️ 依从性连续下滑</Text>
                ) : (
                  <Text className='normal-text'>✨ 状态平稳</Text>
                )}
              </View>
              <View className='wechat-btn' onClick={(e) => {
                e.stopPropagation()
                Taro.showToast({ title: '正在打开微信...', icon: 'loading' })
              }}>
                <Text>去沟通</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}
