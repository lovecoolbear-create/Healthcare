<template>
  <div class="min-h-screen bg-slate-50 flex font-sans">
    <!-- Sidebar -->
    <Sidebar activeTab="courses" />
    
    <!-- Main Content -->
    <div class="flex-1 p-10 pb-24 overflow-y-auto h-screen">
      <!-- Header -->
      <div class="flex justify-between items-end mb-8">
        <div>
          <h1 class="text-3xl font-black text-slate-900 tracking-tight">课程管理</h1>
          <div class="flex items-center gap-2 mt-2">
            <span class="text-sm text-slate-500 font-medium">共 {{ courses.length }} 门课程</span>
            <span class="w-1 h-1 rounded-full bg-slate-300"></span>
            <span class="text-sm text-slate-500">用积分兑换吸引客户参与</span>
            <span class="w-1 h-1 rounded-full bg-slate-300"></span>
            <span class="text-xs text-slate-400">{{ lastUpdateTime || '加载中...' }}</span>
            <span v-if="isRefreshing" class="text-xs text-emerald-500 animate-pulse">更新中...</span>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <!-- 刷新按钮（带旋转动画） -->
          <button 
            @click="refreshData"
            :disabled="isRefreshing"
            class="flex items-center justify-center bg-white border border-slate-200 text-slate-500 w-10 h-10 rounded-xl hover:bg-slate-50 hover:text-emerald-600 active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="刷新列表"
          >
            <RefreshCw class="w-4 h-4" :class="{'animate-spin': isRefreshing}" />
          </button>
          
          <button 
            @click="openAddModal"
            class="flex items-center gap-2 bg-emerald-500 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 hover:shadow-emerald-600/30 active:scale-95 transition-all font-bold text-sm"
          >
            <Plus class="w-4 h-4" />
            <span>发布新课程</span>
          </button>
        </div>
      </div>

      <!-- Course List -->
      <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead class="bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th class="p-5 pl-8 text-xs font-black text-slate-500 uppercase tracking-wider">课程信息</th>
              <th class="p-5 text-xs font-black text-slate-500 uppercase tracking-wider">时间地点</th>
              <th class="p-5 text-xs font-black text-slate-500 uppercase tracking-wider text-center">积分要求</th>
              <th class="p-5 text-xs font-black text-slate-500 uppercase tracking-wider text-center">报名人数</th>
              <th class="p-5 text-xs font-black text-slate-500 uppercase tracking-wider">状态</th>
              <th class="p-5 pr-8 text-xs font-black text-slate-500 uppercase tracking-wider text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr 
              v-for="course in courses" 
              :key="course._id"
              class="hover:bg-slate-50/80 transition-colors"
            >
              <!-- Course Info -->
              <td class="p-5 pl-8">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-2xl">
                    {{ course.coverEmoji || '🎓' }}
                  </div>
                  <div>
                    <div class="font-bold text-slate-900">{{ course.title }}</div>
                    <div class="text-xs text-slate-500 mt-0.5">{{ course.lecturer }}</div>
                  </div>
                </div>
              </td>
              
              <!-- Time & Location -->
              <td class="p-5">
                <div class="text-sm text-slate-700">{{ formatDate(course.startTime) }}</div>
                <div class="text-xs text-slate-500 mt-0.5">{{ course.location || '线上直播' }}</div>
              </td>
              
              <!-- Points Required -->
              <td class="p-5 text-center">
                <div class="inline-flex items-center gap-1 bg-amber-50 px-3 py-1 rounded-lg">
                  <span class="text-amber-500">🏆</span>
                  <span class="font-bold text-amber-600">{{ course.pointsRequired }}</span>
                </div>
              </td>
              
              <!-- Enrollment -->
              <td class="p-5 text-center">
                <div class="text-sm font-bold text-slate-700">
                  {{ course.enrolledCount || 0 }}/{{ course.maxCapacity }}
                </div>
                <div class="text-xs text-slate-400">
                  {{ Math.round((course.enrolledCount || 0) / course.maxCapacity * 100) }}% 已满
                </div>
              </td>
              
              <!-- Status -->
              <td class="p-5">
                <span 
                  class="px-2.5 py-1 rounded-lg text-xs font-bold border"
                  :class="getStatusClass(course.status)"
                >
                  {{ getStatusLabel(course.status) }}
                </span>
              </td>
              
              <!-- Actions -->
              <td class="p-5 pr-8 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button 
                    @click="viewEnrollments(course)"
                    class="p-2 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                    title="查看报名名单"
                  >
                    <Users class="w-4 h-4" />
                  </button>
                  <button 
                    @click="editCourse(course)"
                    class="p-2 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all"
                    title="编辑"
                  >
                    <Pencil class="w-4 h-4" />
                  </button>
                  <button 
                    @click="deleteCourse(course)"
                    class="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
                    title="删除"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        
        <!-- Empty State -->
        <div v-if="courses.length === 0 && !loading" class="text-center py-20">
          <div class="relative w-24 h-24 mx-auto mb-6">
            <div class="absolute inset-0 bg-emerald-100 rounded-full animate-pulse"></div>
            <div class="relative w-full h-full bg-gradient-to-br from-emerald-50 to-teal-50 rounded-full flex items-center justify-center border-2 border-emerald-100">
              <span class="text-4xl">🎓</span>
            </div>
          </div>
          <h3 class="text-lg font-bold text-slate-700 mb-2">暂无课程</h3>
          <p class="text-slate-400 text-sm max-w-xs mx-auto">发布大健康行业专家课程，让客户用积分兑换入场券</p>
          <div class="mt-6 flex flex-col gap-2 items-center">
            <button 
              @click="initDb"
              v-if="showInitButton"
              class="px-6 py-2.5 bg-blue-500 text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
            >
              <span v-if="initing" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              {{ initing ? '初始化中...' : '🔧 初始化数据库' }}
            </button>
            <button 
              @click="openAddModal"
              class="px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
            >
              + 发布第一门课程
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Course Modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeModal"></div>
      <div class="relative bg-white rounded-2xl w-[600px] max-h-[90vh] overflow-y-auto shadow-2xl">
        <div class="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 class="text-xl font-black text-slate-900">{{ isEditing ? '编辑课程' : '发布新课程' }}</h3>
          <button @click="closeModal" class="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
            <X class="w-5 h-5" />
          </button>
        </div>
        
        <div class="p-6 space-y-5">
          <!-- Course Title -->
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-2">课程名称</label>
            <input 
              v-model="formData.title"
              type="text"
              placeholder="例如：大健康行业数字化营销实战"
              class="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          
          <!-- Lecturer -->
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-2">讲师</label>
            <input 
              v-model="formData.lecturer"
              type="text"
              placeholder="例如：张教授 · 营养学会专家"
              class="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          
          <!-- Description -->
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-2">课程简介</label>
            <textarea 
              v-model="formData.description"
              rows="3"
              placeholder="简要描述课程内容和目标..."
              class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
            ></textarea>
          </div>
          
          <!-- Time & Location -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-2">开课日期</label>
              <picker 
                mode="date" 
                :value="dateValue" 
                :start="today"
                @change="(e: any) => dateValue = e.detail.value"
              >
                <div class="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm flex items-center justify-between cursor-pointer hover:border-emerald-500 transition-colors">
                  <span :class="dateValue ? 'text-slate-700' : 'text-slate-400'">
                    {{ dateValue || '选择日期' }}
                  </span>
                  <span class="text-slate-400">📅</span>
                </div>
              </picker>
            </div>
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-2">具体时间</label>
              <picker 
                mode="time" 
                :value="timeValue"
                @change="(e: any) => timeValue = e.detail.value"
              >
                <div class="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm flex items-center justify-between cursor-pointer hover:border-emerald-500 transition-colors">
                  <span class="text-slate-700">{{ timeValue }}</span>
                  <span class="text-slate-400">🕐</span>
                </div>
              </picker>
            </div>
          </div>
          
          <!-- Location -->
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-2">地点</label>
            <input 
              v-model="formData.location"
              type="text"
              placeholder="线上直播 或 具体地址"
              class="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          
          <!-- Points & Capacity -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-2">积分要求</label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500">🏆</span>
                <input 
                  v-model.number="formData.pointsRequired"
                  type="number"
                  min="0"
                  placeholder="200"
                  class="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-2">名额上限</label>
              <input 
                v-model.number="formData.maxCapacity"
                type="number"
                min="1"
                placeholder="100"
                class="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>
          
          <!-- Cover Image -->
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-2">封面海报</label>
            <div class="flex gap-4">
              <!-- 预览区域 -->
              <div 
                v-if="formData.coverImage" 
                class="relative w-32 h-24 rounded-xl overflow-hidden border border-slate-200"
              >
                <img :src="formData.coverImage" class="w-full h-full object-cover" />
                <button 
                  @click="formData.coverImage = ''"
                  class="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                >
                  ×
                </button>
              </div>
              <!-- 上传按钮 -->
              <div 
                v-else
                @click="uploadCover"
                class="w-32 h-24 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all"
              >
                <span class="text-2xl mb-1">📷</span>
                <span class="text-xs text-slate-400">上传海报</span>
              </div>
              <!-- 提示 -->
              <div class="flex-1 flex items-center">
                <p class="text-xs text-slate-400">建议尺寸 16:9，支持 JPG/PNG 格式</p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="p-6 border-t border-slate-100 flex gap-3">
          <button 
            @click="closeModal"
            class="flex-1 h-11 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all flex items-center justify-center"
          >
            取消
          </button>
          <button 
            @click="saveCourse"
            class="flex-1 h-11 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-all flex items-center justify-center"
          >
            {{ isEditing ? '保存修改' : '发布课程' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Enrollment List Modal -->
    <div v-if="showEnrollmentModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showEnrollmentModal = false"></div>
      <div class="relative bg-white rounded-2xl w-[500px] max-h-[80vh] overflow-y-auto shadow-2xl">
        <div class="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 class="text-xl font-black text-slate-900">报名名单</h3>
            <p class="text-sm text-slate-500 mt-1">{{ selectedCourse?.title }}</p>
          </div>
          <button @click="showEnrollmentModal = false" class="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
            <X class="w-5 h-5" />
          </button>
        </div>
        
        <div class="p-6">
          <div v-if="enrollments.length === 0" class="text-center py-8">
            <p class="text-slate-400">暂无报名记录</p>
          </div>
          <div v-else class="space-y-3">
            <div 
              v-for="enrollment in enrollments" 
              :key="enrollment._id"
              class="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
            >
              <div>
                <div class="font-bold text-slate-900">{{ enrollment.userName || '未知用户' }}</div>
                <div class="text-xs text-slate-500">{{ enrollment.userPhone || '' }}</div>
              </div>
              <div class="text-right">
                <div class="text-xs font-mono text-emerald-600 font-bold">{{ enrollment.ticketCode }}</div>
                <div class="text-xs text-slate-400">{{ formatDateTime(enrollment.exchangedAt) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Sidebar from '@/components/Sidebar.vue';
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { 
  Plus, 
  Users, 
  Pencil, 
  Trash2,
  X,
  Calendar,
  MapPin,
  Award,
  RefreshCw
} from 'lucide-vue-next';

// API 响应类型
interface ApiResponse<T = unknown> {
  code: number;
  msg?: string;
  data?: T;
}

interface Course {
  _id?: string;
  id?: string; // 兼容后端返回
  title: string;
  lecturer: string;
  description: string;
  startTime: string | number; // 支持时间戳和字符串
  location: string;
  pointsRequired: number;
  maxCapacity: number;
  enrolledCount?: number;
  coverEmoji?: string;
  coverImage?: string;
  status: 'upcoming' | 'ongoing' | 'ended';
}

interface Enrollment {
  _id: string;
  userName: string;
  userPhone: string;
  ticketCode: string;
  exchangedAt: number;
}

const courses = ref<Course[]>([]);
const loading = ref(false);
const showModal = ref(false);
const isEditing = ref(false);
const showEnrollmentModal = ref(false);
const selectedCourse = ref<Course | null>(null);
const enrollments = ref<Enrollment[]>([]);
const showInitButton = ref(true);
const initing = ref(false);

// 智能刷新状态
const isRefreshing = ref(false);
const lastUpdateTime = ref('');
const lastRefreshTimestamp = ref(0);
const MIN_REFRESH_INTERVAL = 2000; // 2秒内禁止重复刷新
const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5分钟自动刷新;

const emojiOptions = ['🎓', '📚', '🥗', '💪', '🧠', '🌱', '🔬', '💊', '🏃', '🧘', '🤖', '💡'];

const formData = ref<Course>({
  title: '',
  lecturer: '',
  description: '',
  startTime: '',
  location: '线上直播',
  pointsRequired: 200,
  maxCapacity: 100,
  coverImage: '',
  status: 'upcoming'
});

// 日期和时间分开存储
const dateValue = ref('');
const timeValue = ref('09:00');

// 获取今天日期作为最小可选日期
const today = new Date().toISOString().split('T')[0];

// 获取课程列表
const fetchCourses = async (options?: { silent?: boolean }) => {
  if (!options?.silent) {
    loading.value = true;
  }
  
  try {
    const res = await callCloud('admin-api', {
      action: 'getCourses',
      payload: {}
    }) as ApiResponse<Course[]>;
    
    if (res.code === 0 && Array.isArray(res.data)) {
      courses.value = res.data;
      lastUpdateTime.value = formatUpdateTime(Date.now());
      lastRefreshTimestamp.value = Date.now();
    } else if (!options?.silent) {
      uni.showToast({ title: res.msg || '获取课程失败', icon: 'none' });
    }
  } catch (error) {
    console.error('获取课程失败:', error);
    if (!options?.silent) {
      uni.showToast({ title: '网络异常', icon: 'none' });
    }
  } finally {
    if (!options?.silent) {
      loading.value = false;
    }
  }
};

// 刷新数据（带防重复机制）
const refreshData = async () => {
  if (isRefreshing.value) {
    uni.showToast({ title: '刷新中，请稍候...', icon: 'none' });
    return;
  }
  
  const now = Date.now();
  if (now - lastRefreshTimestamp.value < MIN_REFRESH_INTERVAL) {
    uni.showToast({ title: '操作太频繁', icon: 'none' });
    return;
  }
  
  isRefreshing.value = true;
  
  try {
    await fetchCourses();
    uni.showToast({ title: '已更新', icon: 'success', duration: 1000 });
  } finally {
    isRefreshing.value = false;
  }
};

// 静默刷新（后台自动更新，无感知）
const silentRefresh = async () => {
  isRefreshing.value = true;
  try {
    await fetchCourses({ silent: true });
  } finally {
    isRefreshing.value = false;
  }
};

// 防抖函数
const debounce = (fn: Function, delay: number) => {
  let timer: any;
  return (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

// 格式化时间
const formatUpdateTime = (timestamp: number) => {
  if (!timestamp) return '从未更新';
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return new Date(timestamp).toLocaleString();
};

// ...其他函数和变量

let autoRefreshTimer: any = null;

onMounted(() => {
  fetchCourses();
  checkDbStatus();
  
  // 自动刷新（每5分钟静默刷新一次，无感知）
  autoRefreshTimer = setInterval(() => {
    // 只有页面可见时才刷新
    if (document.visibilityState === 'visible') {
      silentRefresh();
    }
  }, AUTO_REFRESH_INTERVAL);
});

onUnmounted(() => {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
});
</script>
