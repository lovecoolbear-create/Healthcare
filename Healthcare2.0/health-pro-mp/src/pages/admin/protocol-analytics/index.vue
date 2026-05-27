<template>
  <div class="min-h-screen bg-slate-50">
    <!-- H5 Web端布局 -->
    <!-- #ifdef H5 -->
    <div class="flex h-screen">
      <Sidebar />
      
      <div class="flex-1 overflow-auto">
        <!-- 顶部标题栏 -->
        <div class="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-10">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-xl font-bold text-slate-900">配方效果分析</h1>
              <p class="text-sm text-slate-500 mt-1">追踪配方使用效果，优化配方库质量</p>
            </div>
            <div class="flex gap-3">
              <select v-model="selectedPeriod" class="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm">
                <option value="30">近30天</option>
                <option value="90">近90天</option>
                <option value="180">近180天</option>
                <option value="all">全部</option>
              </select>
              <button @click="exportReport" class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
                导出报告
              </button>
            </div>
          </div>
        </div>

        <div class="p-8">
          <!-- 概览卡片 -->
          <div class="grid grid-cols-4 gap-6 mb-8">
            <div class="bg-white rounded-2xl p-6 border border-slate-200">
              <div class="flex items-center gap-3 mb-2">
                <div class="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                  <span class="text-xl">📋</span>
                </div>
                <span class="text-sm text-slate-500">总配方使用次数</span>
              </div>
              <div class="text-2xl font-bold text-slate-900">{{ statsOverview.totalProtocols }}</div>
              <div class="text-xs text-emerald-600 mt-1">+{{ statsOverview.protocolGrowth }}% 较上期</div>
            </div>

            <div class="bg-white rounded-2xl p-6 border border-slate-200">
              <div class="flex items-center gap-3 mb-2">
                <div class="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                  <span class="text-xl">✓</span>
                </div>
                <span class="text-sm text-slate-500">平均依从性</span>
              </div>
              <div class="text-2xl font-bold text-slate-900">{{ statsOverview.avgAdherence }}%</div>
              <div class="text-xs" :class="statsOverview.adherenceChange >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                {{ statsOverview.adherenceChange >= 0 ? '+' : '' }}{{ statsOverview.adherenceChange }}% 较上期
              </div>
            </div>

            <div class="bg-white rounded-2xl p-6 border border-slate-200">
              <div class="flex items-center gap-3 mb-2">
                <div class="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                  <span class="text-xl">📈</span>
                </div>
                <span class="text-sm text-slate-500">WROM平均提升</span>
              </div>
              <div class="text-2xl font-bold text-slate-900">+{{ statsOverview.avgWromImprovement }}</div>
              <div class="text-xs text-emerald-600 mt-1">显著改善</div>
            </div>

            <div class="bg-white rounded-2xl p-6 border border-slate-200">
              <div class="flex items-center gap-3 mb-2">
                <div class="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                  <span class="text-xl">😊</span>
                </div>
                <span class="text-sm text-slate-500">客户满意度</span>
              </div>
              <div class="text-2xl font-bold text-slate-900">{{ statsOverview.avgSatisfaction }}</div>
              <div class="text-xs text-emerald-600 mt-1">{{ statsOverview.satisfactionRate }}% 愿意续订</div>
            </div>
          </div>

          <!-- 配方效果排行榜 -->
          <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-8">
            <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 class="font-bold text-slate-900">配方效果排行榜</h2>
              <div class="flex gap-2">
                <button 
                  v-for="tab in ['依从性', 'WROM提升', '满意度']" 
                  :key="tab"
                  @click="sortBy = tab"
                  class="px-3 py-1.5 text-xs rounded-lg transition-colors"
                  :class="sortBy === tab ? 'bg-emerald-100 text-emerald-700 font-medium' : 'text-slate-500 hover:bg-slate-100'"
                >
                  {{ tab }}
                </button>
              </div>
            </div>

            <div class="divide-y divide-slate-100">
              <div 
                v-for="(protocol, index) in sortedProtocolRankings" 
                :key="protocol.templateId"
                class="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
              >
                <!-- 排名 -->
                <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm" :class="getRankingClass(index)">
                  {{ index + 1 }}
                </div>

                <!-- 配方信息 -->
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <h3 class="font-bold text-slate-900">{{ protocol.name }}</h3>
                    <span class="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">{{ protocol.category }}</span>
                  </div>
                  <p class="text-xs text-slate-500 mt-1">
                    使用 {{ protocol.usageCount }} 次 · 平均使用 {{ protocol.avgDuration }} 天
                  </p>
                </div>

                <!-- 指标 -->
                <div class="flex items-center gap-8 text-sm">
                  <div class="text-center">
                    <div class="font-bold" :class="getScoreColor(protocol.adherence)">{{ protocol.adherence }}%</div>
                    <div class="text-xs text-slate-400">依从性</div>
                  </div>
                  <div class="text-center">
                    <div class="font-bold text-emerald-600">+{{ protocol.wromImprovement }}</div>
                    <div class="text-xs text-slate-400">WROM</div>
                  </div>
                  <div class="text-center">
                    <div class="font-bold text-amber-600">{{ protocol.satisfaction }}</div>
                    <div class="text-xs text-slate-400">满意度</div>
                  </div>
                </div>

                <!-- 操作 -->
                <button 
                  @click="viewProtocolDetail(protocol)"
                  class="px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                >
                  详情
                </button>
              </div>
            </div>
          </div>

          <!-- 客户配方历史列表 -->
          <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 class="font-bold text-slate-900">客户配方记录</h2>
              <div class="flex gap-2">
                <input 
                  v-model="searchQuery"
                  type="text" 
                  placeholder="搜索客户姓名..."
                  class="px-3 py-1.5 text-sm border border-slate-300 rounded-lg w-48"
                >
                <select v-model="filterStatus" class="px-3 py-1.5 text-sm border border-slate-300 rounded-lg">
                  <option value="">全部状态</option>
                  <option value="active">进行中</option>
                  <option value="completed">已完成</option>
                </select>
              </div>
            </div>

            <table class="w-full">
              <thead class="bg-slate-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500">客户</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500">当前/最近配方</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500">使用周期</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500">依从性</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500">WROM变化</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500">状态</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500">操作</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr 
                  v-for="record in filteredClientRecords" 
                  :key="record.id"
                  class="hover:bg-slate-50"
                >
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm">
                        {{ record.clientName.charAt(0) }}
                      </div>
                      <div>
                        <div class="font-medium text-slate-900">{{ record.clientName }}</div>
                        <div class="text-xs text-slate-500">{{ record.clientPhone }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="font-medium text-slate-900">{{ record.protocolName }}</div>
                    <div class="text-xs text-slate-500">{{ record.protocolType === 'template' ? '模板配方' : '自定义配方' }}</div>
                  </td>
                  <td class="px-6 py-4 text-sm text-slate-600">
                    {{ formatDate(record.startDate) }} ~ {{ record.endDate ? formatDate(record.endDate) : '至今' }}
                    <div v-if="record.duration" class="text-xs text-slate-400">{{ record.duration }} 天</div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                      <div class="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          class="h-full rounded-full" 
                          :class="getProgressColor(record.adherence)"
                          :style="{ width: record.adherence + '%' }"
                        ></div>
                      </div>
                      <span class="text-sm font-medium" :class="getScoreColor(record.adherence)">{{ record.adherence }}%</span>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <span 
                      class="text-sm font-medium"
                      :class="record.wromChange >= 0 ? 'text-emerald-600' : 'text-rose-600'"
                    >
                      {{ record.wromChange >= 0 ? '+' : '' }}{{ record.wromChange }}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <span 
                      class="text-xs px-2 py-1 rounded font-medium"
                      :class="getStatusBadgeClass(record.status)"
                    >
                      {{ getStatusText(record.status) }}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <button 
                      @click="viewClientProtocolDetail(record)"
                      class="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      查看详情
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    <!-- #endif -->

    <!-- 配方详情抽屉 -->
    <div v-if="showDetailDrawer" class="fixed inset-0 z-50">
      <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" @click="closeDetailDrawer"></div>
      <div class="absolute right-0 top-0 bottom-0 w-[600px] bg-white shadow-2xl overflow-auto animate-in slide-in-from-right duration-300">
        <!-- 抽屉内容 -->
        <div class="p-6" v-if="selectedProtocolDetail">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-slate-900">{{ selectedProtocolDetail.name }}</h2>
            <button @click="closeDetailDrawer" class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600">
              <span>✕</span>
            </button>
          </div>

          <!-- 详细效果数据 -->
          <div class="space-y-6">
            <!-- 概览 -->
            <div class="bg-slate-50 rounded-xl p-4">
              <h3 class="font-bold text-slate-900 mb-4">效果概览</h3>
              <div class="grid grid-cols-3 gap-4">
                <div class="text-center">
                  <div class="text-2xl font-bold" :class="getScoreColor(selectedProtocolDetail.adherence)">
                    {{ selectedProtocolDetail.adherence }}%
                  </div>
                  <div class="text-xs text-slate-500">平均依从性</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-emerald-600">
                    +{{ selectedProtocolDetail.wromImprovement }}
                  </div>
                  <div class="text-xs text-slate-500">WROM平均提升</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-amber-600">
                    {{ selectedProtocolDetail.satisfaction }}
                  </div>
                  <div class="text-xs text-slate-500">客户满意度</div>
                </div>
              </div>
            </div>

            <!-- 使用分布 -->
            <div>
              <h3 class="font-bold text-slate-900 mb-4">使用分布</h3>
              <div class="space-y-3">
                <div class="flex items-center gap-3">
                  <span class="text-xs text-slate-500 w-20">优秀 (>90%)</span>
                  <div class="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full bg-emerald-500" :style="{ width: selectedProtocolDetail.distribution?.excellent + '%' }"></div>
                  </div>
                  <span class="text-xs font-medium w-8">{{ selectedProtocolDetail.distribution?.excellent }}%</span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-xs text-slate-500 w-20">良好 (70-90%)</span>
                  <div class="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full bg-blue-500" :style="{ width: selectedProtocolDetail.distribution?.good + '%' }"></div>
                  </div>
                  <span class="text-xs font-medium w-8">{{ selectedProtocolDetail.distribution?.good }}%</span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-xs text-slate-500 w-20">一般 (50-70%)</span>
                  <div class="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full bg-amber-500" :style="{ width: selectedProtocolDetail.distribution?.fair + '%' }"></div>
                  </div>
                  <span class="text-xs font-medium w-8">{{ selectedProtocolDetail.distribution?.fair }}%</span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-xs text-slate-500 w-20">需关注 (<50%)</span>
                  <div class="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full bg-rose-500" :style="{ width: selectedProtocolDetail.distribution?.poor + '%' }"></div>
                  </div>
                  <span class="text-xs font-medium w-8">{{ selectedProtocolDetail.distribution?.poor }}%</span>
                </div>
              </div>
            </div>

            <!-- 客户反馈摘要 -->
            <div>
              <h3 class="font-bold text-slate-900 mb-4">客户反馈摘要</h3>
              <div class="space-y-3">
                <div 
                  v-for="(feedback, idx) in selectedProtocolDetail.feedbackSamples" 
                  :key="idx"
                  class="bg-slate-50 rounded-lg p-3"
                >
                  <div class="flex items-center gap-2 mb-2">
                    <div class="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs text-emerald-600">
                      {{ feedback.clientName.charAt(0) }}
                    </div>
                    <span class="text-sm font-medium text-slate-900">{{ feedback.clientName }}</span>
                    <span class="text-xs text-amber-600">{{ '★'.repeat(feedback.rating) }}</span>
                  </div>
                  <p class="text-sm text-slate-600">{{ feedback.comment }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getUserInfo } from '@/utils/storage';
import { callCloud, getAuthToken } from '@/utils/cloud';
import { ref, computed, onMounted } from 'vue';
// #ifdef H5
import Sidebar from '@/components/Sidebar.vue';
// #endif

// 数据
const selectedPeriod = ref('90');
const sortBy = ref('依从性');
const searchQuery = ref('');
const filterStatus = ref('');
const showDetailDrawer = ref(false);
const selectedProtocolDetail = ref<any>(null);

const advisorId = getUserInfo()?._id;

// 概览统计
const statsOverview = ref({
  totalProtocols: 156,
  protocolGrowth: 12,
  avgAdherence: 84,
  adherenceChange: 5,
  avgWromImprovement: 18,
  avgSatisfaction: 4.3,
  satisfactionRate: 87
});

// 配方排行榜
const protocolRankings = ref([
  {
    templateId: 'template_001',
    name: '基础免疫增强方案',
    category: '免疫调节',
    usageCount: 45,
    avgDuration: 88,
    adherence: 92,
    wromImprovement: 22,
    satisfaction: 4.6,
    distribution: { excellent: 55, good: 30, fair: 10, poor: 5 },
    feedbackSamples: [
      { clientName: '张三', rating: 5, comment: '换季不再感冒了，效果很好' },
      { clientName: '李四', rating: 5, comment: '精力充沛，强烈推荐' }
    ]
  },
  {
    templateId: 'template_002',
    name: '肠道健康调理方案',
    category: '消化系统',
    usageCount: 38,
    avgDuration: 60,
    adherence: 88,
    wromImprovement: 19,
    satisfaction: 4.4,
    distribution: { excellent: 45, good: 35, fair: 15, poor: 5 },
    feedbackSamples: [
      { clientName: '王五', rating: 4, comment: '肠胃舒适了很多' }
    ]
  },
  {
    templateId: 'template_003',
    name: '睡眠质量改善方案',
    category: '睡眠健康',
    usageCount: 32,
    avgDuration: 45,
    adherence: 79,
    wromImprovement: 15,
    satisfaction: 4.2,
    distribution: { excellent: 30, good: 40, fair: 20, poor: 10 },
    feedbackSamples: [
      { clientName: '赵六', rating: 4, comment: '入睡变快了，深度睡眠增加' }
    ]
  }
]);

// 客户记录
const clientRecords = ref([
  {
    id: 'record_001',
    clientId: 'user_001',
    clientName: '张三',
    clientPhone: '138****8888',
    protocolName: '基础免疫增强方案',
    protocolType: 'template',
    startDate: '2026-01-15',
    endDate: '2026-04-15',
    duration: 90,
    adherence: 95,
    wromChange: 25,
    status: 'completed'
  },
  {
    id: 'record_002',
    clientId: 'user_002',
    clientName: '李四',
    clientPhone: '139****9999',
    protocolName: '肠道健康调理方案',
    protocolType: 'template',
    startDate: '2026-02-01',
    endDate: null,
    duration: 60,
    adherence: 82,
    wromChange: 18,
    status: 'active'
  }
]);

// 计算属性
const sortedProtocolRankings = computed(() => {
  const sorted = [...protocolRankings.value];
  switch (sortBy.value) {
    case '依从性':
      return sorted.sort((a, b) => b.adherence - a.adherence);
    case 'WROM提升':
      return sorted.sort((a, b) => b.wromImprovement - a.wromImprovement);
    case '满意度':
      return sorted.sort((a, b) => b.satisfaction - a.satisfaction);
    default:
      return sorted;
  }
});

const filteredClientRecords = computed(() => {
  return clientRecords.value.filter(record => {
    const matchesSearch = record.clientName.includes(searchQuery.value) || 
                         record.clientPhone.includes(searchQuery.value);
    const matchesStatus = !filterStatus.value || record.status === filterStatus.value;
    return matchesSearch && matchesStatus;
  });
});

// 方法
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const getRankingClass = (index: number) => {
  if (index === 0) return 'bg-amber-100 text-amber-700';
  if (index === 1) return 'bg-slate-200 text-slate-700';
  if (index === 2) return 'bg-orange-100 text-orange-700';
  return 'bg-slate-100 text-slate-600';
};

const getScoreColor = (score: number) => {
  if (score >= 90) return 'text-emerald-600';
  if (score >= 70) return 'text-blue-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-rose-600';
};

const getProgressColor = (score: number) => {
  if (score >= 90) return 'bg-emerald-500';
  if (score >= 70) return 'bg-blue-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-rose-500';
};

const getStatusBadgeClass = (status: string) => {
  const classes: Record<string, string> = {
    'active': 'bg-emerald-100 text-emerald-700',
    'completed': 'bg-slate-100 text-slate-700',
    'pending': 'bg-amber-100 text-amber-700',
    'cancelled': 'bg-rose-100 text-rose-700'
  };
  return classes[status] || 'bg-slate-100 text-slate-700';
};

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    'active': '进行中',
    'completed': '已完成',
    'pending': '待开始',
    'cancelled': '已取消'
  };
  return texts[status] || status;
};

const viewProtocolDetail = (protocol: any) => {
  selectedProtocolDetail.value = protocol;
  showDetailDrawer.value = true;
};

const closeDetailDrawer = () => {
  showDetailDrawer.value = false;
  selectedProtocolDetail.value = null;
};

const viewClientProtocolDetail = (record: any) => {
  uni.navigateTo({
    url: `/pages/admin/client-protocol-detail?id=${record.id}`
  });
};

const exportReport = () => {
  uni.showToast({ title: '报告导出中...', icon: 'none' });
  // 实际导出逻辑
};

// 加载数据
const loadData = async () => {
  if (!advisorId || !getAuthToken()) return;

  try {
    // 获取顾问配方统计
    const res = await callCloud('protocol-effectiveness', {
      action: 'getAdvisorProtocolStats',
      payload: { advisorId }
    });

    if (res.ok) {
      // 更新数据
      console.log('配方统计数据:', res.data);
    }
  } catch (error) {
    console.error('加载配方统计数据失败:', error);
  }
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
/* 动画 */
.animate-in {
  animation-fill-mode: both;
}

.slide-in-from-right {
  animation-name: slideInFromRight;
}

@keyframes slideInFromRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
