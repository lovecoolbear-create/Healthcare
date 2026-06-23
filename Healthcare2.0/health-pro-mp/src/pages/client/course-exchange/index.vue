<template>
  <div class="mp-page-shell min-h-screen bg-slate-50 pb-24">
    <!-- Header -->
    <div class="fixed top-0 left-0 right-0 z-50 bg-emerald-500 px-6 pt-12 pb-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div 
            @click="goBack"
            class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center active:bg-white/30"
          >
            <span class="text-white text-sm">←</span>
          </div>
          <h1 class="text-lg font-black text-white">积分兑换课程</h1>
        </div>
        <div class="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-lg">
          <span class="text-white text-xs">💎</span>
          <span class="text-white text-sm font-bold">{{ userPoints }}</span>
        </div>
      </div>
    </div>

    <!-- 占位高度 -->
    <div class="h-28"></div>

    <div class="px-4 space-y-4">
      <!-- 积分说明卡片 -->
      <div class="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-4 text-white shadow-lg">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs opacity-90">可用积分</p>
            <p class="text-2xl font-black">{{ userPoints }}</p>
          </div>
          <div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <span class="text-2xl">🏆</span>
          </div>
        </div>
        <p class="text-xs mt-2 opacity-90">积分可通过每日打卡、完成任务获得</p>
      </div>

      <!-- 课程列表 -->
      <div class="space-y-2">
        <div class="flex items-center justify-between px-1">
          <h2 class="text-sm font-bold text-slate-700">热门课程</h2>
          <span class="text-xs text-slate-400">{{ courses.length }} 门</span>
        </div>

        <!-- 课程卡片 - 紧凑可折叠 -->
        <div 
          v-for="course in courses" 
          :key="course._id"
          class="bg-white rounded-xl border border-slate-200 overflow-hidden"
        >
          <!-- 折叠状态头部 -->
          <div 
            @click="toggleExpand(course._id)"
            class="flex items-center gap-3 p-3 active:bg-slate-50 cursor-pointer"
          >
            <span class="text-xl">{{ course.coverEmoji || '📚' }}</span>
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-bold text-slate-800 truncate">{{ course.title }}</h3>
              <p class="text-xs text-slate-500 truncate">{{ course.lecturer }} · {{ formatDate(course.startTime) }}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-amber-600">{{ course.pointsRequired }}💎</span>
              <span class="text-xs text-slate-400 transform transition-transform" :class="{ 'rotate-180': expandedCourse === course._id }">▼</span>
            </div>
          </div>

          <!-- 展开详情 -->
          <div v-show="expandedCourse === course._id" class="px-3 pb-3 border-t border-slate-100">
            <!-- 状态标签 -->
            <div v-if="course.status === 'ended' || course.status === 'full'" class="mt-2">
              <span class="inline-block px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded">{{ course.status === 'ended' ? '已结束' : '已满员' }}</span>
            </div>
            
            <!-- 详细信息 -->
            <div class="mt-2 space-y-1 text-xs text-slate-600">
              <p><span class="text-slate-400">时间：</span>{{ formatDate(course.startTime) }} {{ formatTime(course.startTime) }}</p>
              <p><span class="text-slate-400">地点：</span>{{ course.location || '线上直播' }}</p>
              <p><span class="text-slate-400">名额：</span>{{ course.enrolledCount || 0 }}/{{ course.maxCapacity || 100 }} 人</p>
              <p class="text-slate-500 mt-1">{{ course.description }}</p>
            </div>

            <!-- 操作按钮 -->
            <div class="mt-3" @click.stop>
              <div 
                v-if="course.isExchanged"
                class="w-full py-2 bg-emerald-100 text-emerald-600 rounded-lg font-bold text-xs text-center"
              >
                ✓ 已报名
              </div>
              <button 
                v-else-if="course.status === 'upcoming' && userPoints >= course.pointsRequired"
                @click="doExchange(course)"
                :disabled="exchanging"
                class="w-full py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-lg font-bold text-xs active:opacity-90 disabled:opacity-50"
              >
                {{ exchanging ? '兑换中...' : `立即兑换 (${course.pointsRequired}积分)` }}
              </button>
              <button 
                v-else-if="course.status === 'upcoming' && userPoints < course.pointsRequired"
                disabled
                class="w-full py-2 bg-slate-200 text-slate-400 rounded-lg font-bold text-xs cursor-not-allowed"
              >
                积分不足
              </button>
              <button 
                v-else
                disabled
                class="w-full py-2 bg-slate-200 text-slate-400 rounded-lg font-bold text-xs cursor-not-allowed"
              >
                {{ course.status === 'ended' ? '已结束' : '已满员' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="courses.length === 0 && !loading" class="text-center py-12">
          <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span class="text-3xl">📚</span>
          </div>
          <p class="text-slate-500 text-sm">暂无课程</p>
          <p class="text-slate-400 text-xs mt-1">敬请期待精彩课程</p>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getUserInfo } from '@/utils/storage';
import { callCloud } from '@/utils/cloud';

interface Course {
  _id: string;
  title: string;
  lecturer: string;
  description: string;
  startTime: string;
  location?: string;
  pointsRequired: number;
  maxCapacity: number;
  enrolledCount: number;
  coverEmoji?: string;
  status: 'upcoming' | 'ongoing' | 'ended' | 'full';
  isExchanged?: boolean;
  ticketCode?: string;
}

const userPoints = ref(0);
const courses = ref<Course[]>([]);
const loading = ref(false);
const selectedCourse = ref<Course | null>(null);
const exchanging = ref(false);
const expandedCourse = ref<string | null>(null);

// 缓存配置
const CACHE_KEY = 'course_exchange_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

// 获取用户积分和课程列表（带缓存）
const fetchData = async (forceRefresh = false) => {
  const userInfo = getUserInfo();
  if (!userInfo) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    return;
  }

  // 尝试读取缓存
  if (!forceRefresh) {
    const cached = uni.getStorageSync(CACHE_KEY);
    if (cached && cached.userId === userInfo._id) {
      const isValid = Date.now() - cached.timestamp < CACHE_TTL;
      if (isValid) {
        courses.value = cached.courses;
        userPoints.value = cached.userPoints;
        // 后台静默刷新
        refreshData(userInfo._id);
        return;
      }
    }
  }

  // 无缓存或缓存过期，显示加载
  loading.value = true;
  await refreshData(userInfo._id);
  loading.value = false;
};

// 切换展开/折叠
const toggleExpand = (courseId: string) => {
  expandedCourse.value = expandedCourse.value === courseId ? null : courseId;
};

// 后台刷新数据
const refreshData = async (userId: string) => {
  try {
    console.log('Fetching courses for user:', userId);
    
    // 并行获取用户积分和课程列表
    const [userRes, courseRes] = await Promise.all([
      callCloud('client-api', { action: 'getUserInfo', payload: { userId } }),
      callCloud('client-api', { action: 'getCourses', payload: { userId } })
    ]);

    console.log('User response:', userRes);
    console.log('Course response:', courseRes);

    if (userRes.code === 0 && userRes.data) {
      userPoints.value = userRes.data.points || 0;
    }

    if (courseRes.code === 0 && courseRes.data) {
      courses.value = courseRes.data;
      console.log('Courses loaded:', courses.value.length, 'courses');

      // 更新缓存
      uni.setStorageSync(CACHE_KEY, {
        userId,
        userPoints: userPoints.value,
        courses: courses.value,
        timestamp: Date.now()
      });
    } else {
      console.warn('Failed to load courses:', courseRes);
    }
  } catch (e) {
    console.error('Failed to refresh data:', e);
    uni.showToast({ title: '加载失败', icon: 'none' });
  }
};

// 兑换课程 - 直接兑换不弹确认窗
const doExchange = async (course: Course) => {
  if (exchanging.value) return;
  if (userPoints.value < course.pointsRequired) {
    uni.showToast({ title: '积分不足', icon: 'none' });
    return;
  }

  exchanging.value = true;
  selectedCourse.value = course;
  uni.showLoading({ title: '兑换中...', mask: true });
  
  try {
    const userInfo = getUserInfo();
    const res = await callCloud('client-api', {
      action: 'exchangeCourse',
      payload: {
        userId: userInfo._id,
        courseId: course._id
      }
    });

    uni.hideLoading();

    if (res.code === 0) {
      uni.showToast({ title: '兑换成功！', icon: 'success' });
      userPoints.value -= course.pointsRequired;

      // 更新课程状态
      course.isExchanged = true;
      course.ticketCode = res.data?.ticketCode;

      await fetchData(true);

      // 兑换成功，自动折叠
      expandedCourse.value = null;
    } else {
      uni.showToast({ title: res.msg || '兑换失败', icon: 'none' });
    }
  } catch (e) {
    uni.hideLoading();
    console.error('Exchange failed:', e);
    uni.showToast({ title: '兑换失败，请重试', icon: 'none' });
  } finally {
    exchanging.value = false;
  }
};


// 工具函数
const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

const formatTime = (dateStr?: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const goBack = () => {
  uni.navigateBack();
};

onShow(() => {
  fetchData();
});
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
