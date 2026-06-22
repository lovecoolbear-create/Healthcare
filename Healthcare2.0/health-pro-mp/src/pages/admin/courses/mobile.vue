<template>
  <view class="mp-page-shell h-screen flex flex-col overflow-hidden bg-transparent">
    <!-- 1. Top Fixed Bar -->
    <view class="bg-slate-900 px-5 pb-16 flex-none sticky top-0 z-40 shadow-lg shadow-slate-200/50"
      :style="{ paddingTop: `calc(${statusBarHeight}px + 12px)` }">
      <view class="flex items-center justify-between h-10">
        <view>
          <text class="text-xl font-black text-white block tracking-tight">课程管理</text>
          <text class="text-[10px] text-slate-400 font-medium mt-1 block">共 {{ courses.length }} 门课程</text>
        </view>
        <button 
          @click="openAddModal"
          class="flex items-center gap-1 bg-white text-slate-800 px-3 py-1.5 rounded-lg text-sm font-bold"
        >
          <text>+</text>
          <span>发布</span>
        </button>
      </view>
    </view>

    <!-- 2. Scrollable Content Area -->
    <scroll-view scroll-y class="flex-1 min-h-0 w-full">
      <view class="px-5 py-4 space-y-3">
        <!-- 课程列表 -->
        <view 
          v-for="course in courses" 
          :key="course._id"
          class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
        >
          <div class="p-4">
            <div class="flex items-start gap-3">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xl shrink-0">
                {{ course.coverEmoji || '🎓' }}
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-sm font-bold text-slate-800">{{ course.title }}</h3>
                <p class="text-xs text-slate-500 mt-0.5">{{ course.lecturer }}</p>
                <div class="flex items-center gap-3 mt-2">
                  <span class="text-xs text-slate-400">📅 {{ formatDate(course.startTime) }}</span>
                  <span class="text-xs text-slate-400">📍 {{ course.location || '线上直播' }}</span>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <div class="flex items-center gap-4">
                <span class="flex items-center gap-1 text-xs">
                  <span class="text-amber-500">🏆</span>
                  <span class="font-bold text-amber-600">{{ course.pointsRequired }}</span>
                </span>
                <span class="text-xs text-slate-500">
                  {{ course.enrolledCount || 0 }}/{{ course.maxCapacity }} 人报名
                </span>
              </div>
            <span 
              class="px-2 py-0.5 rounded text-[10px] font-bold"
              :class="getStatusClass(course.status)"
            >
              {{ getStatusLabel(course.status) }}
            </span>
          </div>

          <!-- 操作按钮 -->
          <div class="flex gap-2 mt-3">
            <button 
              @click="viewEnrollments(course)"
              class="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold"
            >
              查看报名
            </button>
            <button 
              @click="editCourse(course)"
              class="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold"
            >
              编辑
            </button>
            <button 
              @click="deleteCourse(course)"
              class="flex-1 py-2 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold"
            >
              删除
            </button>
          </div>
        </div>
      </view>

      <!-- 空状态 -->
      <div v-if="courses.length === 0 && !loading" class="text-center py-12">
        <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span class="text-3xl">🎓</span>
        </div>
        <p class="text-slate-500 text-sm">暂无课程</p>
        <p class="text-slate-400 text-xs mt-1">发布课程让客户用积分兑换</p>
        <button 
          @click="openAddModal"
          class="mt-4 px-6 py-2 bg-emerald-500 text-white rounded-xl font-bold text-sm"
        >
          + 发布第一门课程
        </button>
      </div>
      </view>
    </scroll-view>

    <!-- Add/Edit Course Modal -->
    <view v-if="showModal" class="fixed inset-0 z-[100] flex items-end justify-center">
      <view class="absolute inset-0 bg-black/50" @click="closeModal"></view>
      <view class="relative bg-white w-full rounded-t-[24px] max-h-[85vh] overflow-y-auto">
        <view class="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-slate-300 rounded-full z-20"></view>
        
        <div class="p-6 pt-8">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-black text-slate-900">{{ isEditing ? '编辑课程' : '发布新课程' }}</h3>
            <button @click="closeModal" class="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
              <span class="text-lg">×</span>
            </button>
          </div>
          
          <view class="space-y-4">
            <!-- Course Title -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">课程名称</label>
              <input 
                v-model="formData.title"
                type="text"
                placeholder="输入课程名称"
                class="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>
            
            <!-- Lecturer -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">讲师</label>
              <input 
                v-model="formData.lecturer"
                type="text"
                placeholder="输入讲师信息"
                class="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>
            
            <!-- Description -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">课程简介</label>
              <textarea 
                v-model="formData.description"
                rows="3"
                placeholder="简要描述课程内容..."
                class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none"
              ></textarea>
            </div>
            
            <!-- Time & Location -->
            <view class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">开课日期</label>
                <picker 
                  mode="date" 
                  :value="dateValue" 
                  :start="today"
                  @change="(e: any) => dateValue = e.detail.value"
                >
                  <view class="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm flex items-center justify-between">
                    <span :class="dateValue ? 'text-slate-700' : 'text-slate-400'">{{ dateValue || '选择日期' }}</span>
                    <span class="text-slate-400">📅</span>
                  </view>
                </picker>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">具体时间</label>
                <picker 
                  mode="time" 
                  :value="timeValue"
                  @change="(e: any) => timeValue = e.detail.value"
                >
                  <view class="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm flex items-center justify-between">
                    <span class="text-slate-700">{{ timeValue }}</span>
                    <span class="text-slate-400">🕐</span>
                  </view>
                </picker>
              </div>
            </view>
            
            <!-- Location -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">地点</label>
              <input 
                v-model="formData.location"
                type="text"
                placeholder="线上直播或具体地址"
                class="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>
            
            <!-- Points & Capacity -->
            <view class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">积分要求</label>
                <view class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500">🏆</span>
                  <input 
                    v-model.number="formData.pointsRequired"
                    type="number"
                    min="0"
                    placeholder="200"
                    class="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </view>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">名额上限</label>
                <input 
                  v-model.number="formData.maxCapacity"
                  type="number"
                  min="1"
                  placeholder="100"
                  class="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>
            </view>
          </view>
          
          <div class="flex gap-3 mt-6">
            <button 
              @click="closeModal"
              class="flex-1 h-12 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm"
            >
              取消
            </button>
            <button 
              @click="saveCourse"
              class="flex-1 h-12 bg-emerald-500 text-white rounded-xl font-bold text-sm"
            >
              {{ isEditing ? '保存修改' : '发布课程' }}
            </button>
          </div>
        </div>
      </view>
    </view>

    <!-- Enrollment List Modal -->
    <view v-if="showEnrollmentModal" class="fixed inset-0 z-[100] flex items-end justify-center">
      <view class="absolute inset-0 bg-black/50" @click="showEnrollmentModal = false"></view>
      <view class="relative bg-white w-full rounded-t-[24px] max-h-[70vh] overflow-y-auto">
        <view class="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-slate-300 rounded-full z-20"></view>
        
        <div class="p-6 pt-8">
          <div class="flex justify-between items-center mb-4">
            <div>
              <h3 class="text-lg font-black text-slate-900">报名名单</h3>
              <p class="text-sm text-slate-500 mt-0.5">{{ selectedCourse?.title }}</p>
            </div>
            <button @click="showEnrollmentModal = false" class="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
              <span class="text-lg">×</span>
            </button>
          </div>
          
          <div v-if="enrollments.length === 0" class="text-center py-8">
            <p class="text-slate-400">暂无报名记录</p>
          </div>
          <div v-else class="space-y-2">
            <div 
              v-for="enrollment in enrollments" 
              :key="enrollment._id"
              class="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
            >
              <div>
                <div class="font-bold text-slate-900 text-sm">{{ enrollment.userName || '未知用户' }}</div>
                <div class="text-xs text-slate-500">{{ enrollment.userPhone || '' }}</div>
              </div>
              <div class="text-right">
                <div class="text-xs font-mono text-emerald-600 font-bold">{{ enrollment.ticketCode }}</div>
                <div class="text-[10px] text-slate-400">{{ formatDateTime(enrollment.exchangedAt) }}</div>
              </div>
            </div>
          </div>
        </div>
      </view>
    </view>

    <AdminTabBar :current="3" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { callCloud } from '@/utils/cloud';
import AdminTabBar from '@/components/AdminTabBar.vue';

const statusBarHeight = ref(uni.getSystemInfoSync().statusBarHeight || 44);

interface Course {
  _id?: string;
  title: string;
  lecturer: string;
  description: string;
  startTime: string | number;
  location: string;
  pointsRequired: number;
  maxCapacity: number;
  enrolledCount?: number;
  coverEmoji?: string;
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

const formData = ref<Course>({
  title: '',
  lecturer: '',
  description: '',
  startTime: '',
  location: '线上直播',
  pointsRequired: 200,
  maxCapacity: 100,
  status: 'upcoming'
});

const dateValue = ref('');
const timeValue = ref('09:00');
const today = new Date().toISOString().split('T')[0];

const fetchCourses = async () => {
  loading.value = true;
  try {
    const res = await callCloud('client-api', {
      action: 'getCourses',
      payload: {}
    });
    
    if (res.code === 0 && Array.isArray(res.data)) {
      courses.value = res.data;
    }
  } catch (error) {
    console.error('获取课程失败:', error);
  } finally {
    loading.value = false;
  }
};

const openAddModal = () => {
  isEditing.value = false;
  formData.value = {
    title: '',
    lecturer: '',
    description: '',
    startTime: '',
    location: '线上直播',
    pointsRequired: 200,
    maxCapacity: 100,
    status: 'upcoming'
  };
  dateValue.value = '';
  timeValue.value = '09:00';
  showModal.value = true;
};

const editCourse = (course: Course) => {
  isEditing.value = true;
  formData.value = { ...course };
  const date = new Date(course.startTime);
  dateValue.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  timeValue.value = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const saveCourse = async () => {
  if (!formData.value.title || !formData.value.lecturer) {
    uni.showToast({ title: '请填写必填项', icon: 'none' });
    return;
  }

  if (!dateValue.value) {
    uni.showToast({ title: '请选择日期', icon: 'none' });
    return;
  }

  formData.value.startTime = `${dateValue.value}T${timeValue.value}:00`;

  const action = isEditing.value ? 'updateCourse' : 'createCourse';
  const payload = isEditing.value ? { ...formData.value, courseId: formData.value._id } : formData.value;

  try {
    const res = await callCloud('client-api', {
      action,
      payload
    });

    if (res.code === 0) {
      uni.showToast({ title: isEditing.value ? '修改成功' : '发布成功', icon: 'success' });
      closeModal();
      fetchCourses();
    } else {
      uni.showToast({ title: res.msg || '操作失败', icon: 'none' });
    }
  } catch (error) {
    console.error('保存课程失败:', error);
    uni.showToast({ title: '操作失败', icon: 'none' });
  }
};

const viewEnrollments = async (course: Course) => {
  selectedCourse.value = course;
  try {
    const res = await callCloud('client-api', {
      action: 'getCourseEnrollments',
      payload: { courseId: course._id }
    });
    
    if (res.code === 0) {
      enrollments.value = res.data || [];
    }
  } catch (error) {
    console.error('获取报名名单失败:', error);
    enrollments.value = [];
  }
  showEnrollmentModal.value = true;
};

const deleteCourse = (course: Course) => {
  uni.showModal({
    title: '删除课程',
    content: `确定要删除课程「${course.title}」吗？`,
    confirmColor: '#f43f5e',
    success: async (res) => {
      if (res.confirm) {
        try {
          const result = await callCloud('client-api', {
            action: 'deleteCourse',
            payload: { courseId: course._id }
          });
          
          if (result.code === 0) {
            uni.showToast({ title: '删除成功', icon: 'success' });
            fetchCourses();
          } else {
            uni.showToast({ title: result.msg || '删除失败', icon: 'none' });
          }
        } catch (error) {
          console.error('删除课程失败:', error);
          uni.showToast({ title: '删除失败', icon: 'none' });
        }
      }
    }
  });
};

const formatDate = (dateStr?: string | number) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

const formatDateTime = (timestamp?: number) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const getStatusClass = (status: string) => {
  switch (status) {
    case 'upcoming': return 'bg-emerald-100 text-emerald-600';
    case 'ongoing': return 'bg-blue-100 text-blue-600';
    case 'ended': return 'bg-slate-100 text-slate-500';
    default: return 'bg-slate-100 text-slate-500';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'upcoming': return '即将开始';
    case 'ongoing': return '进行中';
    case 'ended': return '已结束';
    default: return status;
  }
};

const goBack = () => {
  uni.navigateBack();
};

onShow(() => {
  fetchCourses();
});

onMounted(() => {
  fetchCourses();
});
</script>