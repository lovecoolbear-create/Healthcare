<template>
  <div class="mp-page-shell min-h-screen bg-slate-100 flex flex-col">
    <!-- Header -->
    <div class="bg-white sticky top-0 z-50 shadow-sm">
      <div :style="{ height: statusBarHeight + 'px' }"></div>
      <div class="h-12 px-4 flex items-center justify-between border-b border-slate-100">
        <div class="flex items-center gap-3">
          <button @click="goBack" class="flex items-center gap-1 pl-2 pr-3 py-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 shadow-sm">
            <ArrowLeft class="w-4 h-4 text-slate-900" />
            <span class="text-xs font-bold text-slate-900">返回</span>
          </button>
          <h2 class="text-base font-bold text-slate-800">生成分享海报</h2>
        </div>
      </div>
    </div>

    <main class="flex-1 overflow-y-auto p-4">
      <!-- 隐私提示 -->
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
        <div class="flex items-start gap-2">
          <span class="text-amber-600 text-lg">🔒</span>
          <div>
            <p class="text-sm font-bold text-amber-800">隐私保护说明</p>
            <p class="text-xs text-amber-700 mt-1">
              海报已自动脱敏处理：客户姓名、电话、具体产品名称已隐藏，仅展示健康趋势和阶段成果。
            </p>
          </div>
        </div>
      </div>

      <!-- 海报预览区域 -->
      <div class="bg-white rounded-2xl shadow-lg p-4 mb-4">
        <canvas 
          canvas-id="posterCanvas" 
          id="posterCanvas"
          class="w-full rounded-xl"
          :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"
        ></canvas>
      </div>

      <!-- 数据预览（实际不显示在海报上） -->
      <div v-if="client" class="bg-white rounded-2xl p-4 mb-4 space-y-3">
        <h3 class="font-bold text-slate-900 text-sm">海报内容预览</h3>
        <div class="grid grid-cols-2 gap-3 text-xs">
          <div class="bg-slate-50 p-3 rounded-xl">
            <span class="text-slate-400">客户称呼</span>
            <p class="font-bold text-slate-900 mt-1">{{ maskName(client.name) }}</p>
          </div>
          <div class="bg-slate-50 p-3 rounded-xl">
            <span class="text-slate-400">当前WROM评分</span>
            <p class="font-bold text-emerald-600 mt-1">{{ client.wrom_score || 0 }} 分</p>
          </div>
          <div class="bg-slate-50 p-3 rounded-xl">
            <span class="text-slate-400">调理阶段</span>
            <p class="font-bold text-slate-900 mt-1">第 {{ getPhase() }} 阶段</p>
          </div>
          <div class="bg-slate-50 p-3 rounded-xl">
            <span class="text-slate-400">打卡坚持</span>
            <p class="font-bold text-slate-900 mt-1">{{ client.streak || 0 }} 天</p>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="space-y-3 pb-6">
        <button 
          @click="savePoster" 
          :disabled="generating"
          class="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Download v-if="!generating" class="w-5 h-5" />
          <span v-if="!generating">保存到相册</span>
          <span v-else>生成中...</span>
        </button>
        
        <button 
          @click="sharePoster" 
          :disabled="generating || !posterImage"
          class="w-full py-4 bg-slate-800 text-white font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          :class="{ 'opacity-50': !posterImage }"
        >
          <Share2 class="w-5 h-5" />
          <span>分享给客户</span>
        </button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { ArrowLeft, Download, Share2 } from 'lucide-vue-next';
import { callCloud } from '@/utils/cloud';

const statusBarHeight = ref(0);
const canvasWidth = ref(300);
const canvasHeight = ref(500);
const generating = ref(false);
const posterImage = ref('');
const client = ref<any>(null);
const clientId = ref('');

// 脱敏处理函数
const maskName = (name: string) => {
  if (!name || name.length === 0) return '某先生/女士';
  if (name.length === 1) return name + '先生/女士';
  return name[0] + '先生/女士';
};

const maskPhone = (phone: string) => {
  if (!phone || phone.length < 7) return '***********';
  return phone.slice(0, 3) + '****' + phone.slice(-4);
};

const getPhase = () => {
  const days = client.value?.streak || 0;
  if (days < 7) return 1;
  if (days < 21) return 2;
  if (days < 60) return 3;
  return 4;
};

const goBack = () => {
  uni.navigateBack();
};

// 获取客户数据
const fetchClientData = async () => {
  if (!clientId.value) return;
  
  try {
    const res = await callCloud('client-api', {
      action: 'getProtocolInfo',
      payload: { userId: clientId.value }
    });
    
    if (res.code === 0) {
      const data = res.data as { user?: any };
      client.value = data?.user || {};
      nextTick(() => {
        generatePoster();
      });
    }
  } catch (err) {
    console.error('获取客户数据失败:', err);
    uni.showToast({ title: '获取数据失败', icon: 'none' });
  }
};

// 生成海报
const generatePoster = () => {
  if (!client.value) return;
  
  generating.value = true;
  
  const ctx = uni.createCanvasContext('posterCanvas');
  const width = canvasWidth.value;
  const height = canvasHeight.value;
  
  // 背景渐变
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(1, '#f0fdf4');
  ctx.fillStyle = gradient as any;
  ctx.fillRect(0, 0, width, height);
  
  // 顶部装饰条
  ctx.fillStyle = '#10b981';
  ctx.fillRect(0, 0, width, 8);
  
  // 标题
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 20px sans-serif';
  ctx.setTextAlign('center');
  ctx.fillText('健康管理阶段报告', width / 2, 50);
  
  // 副标题 - 脱敏姓名
  ctx.fillStyle = '#64748b';
  ctx.font = '14px sans-serif';
  ctx.fillText(`客户：${maskName(client.value.name || '未知')}`, width / 2, 80);
  
  // 分隔线
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 100);
  ctx.lineTo(width - 40, 100);
  ctx.stroke();
  
  // WROM 评分卡片
  const wromScore = client.value.wrom_score || 0;
  const scoreColor = wromScore >= 80 ? '#10b981' : wromScore >= 60 ? '#f59e0b' : '#ef4444';
  
  // 卡片背景
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.1)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, 30, 120, width - 60, 100, 16);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  
  // 评分标签
  ctx.fillStyle = '#64748b';
  ctx.font = '12px sans-serif';
  ctx.setTextAlign('left');
  ctx.fillText('WROM 健康评分', 50, 150);
  
  // 评分值
  ctx.fillStyle = scoreColor;
  ctx.font = 'bold 36px sans-serif';
  ctx.setTextAlign('center');
  ctx.fillText(String(wromScore), width / 2, 185);
  
  // 评分等级
  let levelText = wromScore >= 80 ? '优秀' : wromScore >= 60 ? '良好' : '需关注';
  ctx.fillStyle = scoreColor;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(levelText, width / 2, 205);
  
  // 数据统计区域
  const statsY = 250;
  const stats = [
    { label: '调理天数', value: `${client.value.streak || 0}天`, icon: '📅' },
    { label: '当前阶段', value: `第${getPhase()}阶段`, icon: '📊' },
    { label: '打卡完成', value: `${client.value.checkin_rate || 0}%`, icon: '✅' }
  ];
  
  const cardWidth = (width - 80) / 3;
  stats.forEach((stat, index) => {
    const x = 30 + index * (cardWidth + 10);
    
    // 卡片背景
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.05)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    roundRect(ctx, x, statsY, cardWidth, 80, 12);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    
    // 图标
    ctx.font = '20px sans-serif';
    ctx.setTextAlign('center');
    ctx.fillText(stat.icon, x + cardWidth / 2, statsY + 30);
    
    // 数值
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(stat.value, x + cardWidth / 2, statsY + 55);
    
    // 标签
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.fillText(stat.label, x + cardWidth / 2, statsY + 72);
  });
  
  // 趋势图区域（简化版）
  const chartY = 360;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.05)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  roundRect(ctx, 30, chartY, width - 60, 100, 12);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  
  ctx.fillStyle = '#64748b';
  ctx.font = '12px sans-serif';
  ctx.setTextAlign('left');
  ctx.fillText('健康趋势', 45, chartY + 25);
  
  // 绘制简单的趋势曲线
  const trendData = client.value.wrom_history || [60, 65, 63, 68, 70, wromScore];
  const chartHeight = 50;
  const chartWidth = width - 100;
  const startX = 50;
  const startY = chartY + 70;
  
  // 绘制网格线
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y = startY - (i / 3) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(startX + chartWidth, y);
    ctx.stroke();
  }
  
  // 绘制趋势曲线
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 3;
  ctx.beginPath();
  
  const minVal = Math.min(...trendData) - 5;
  const maxVal = Math.max(...trendData) + 5;
  
  trendData.forEach((val: number, index: number) => {
    const x = startX + (index / (trendData.length - 1)) * chartWidth;
    const y = startY - ((val - minVal) / (maxVal - minVal)) * chartHeight;
    
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    
    // 绘制数据点
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.stroke();
  
  // 底部提示
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px sans-serif';
  ctx.setTextAlign('center');
  ctx.fillText('数据仅供参考，具体调理方案请咨询专业顾问', width / 2, height - 40);
  
  // 品牌标识
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('HealthCare Pro · 数字化健康管理', width / 2, height - 20);
  
  ctx.draw(false, () => {
    setTimeout(() => {
      canvasToImage();
    }, 500);
  });
};

// 圆角矩形绘制
const roundRect = (ctx: any, x: number, y: number, width: number, height: number, radius: number) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

// Canvas 转图片
const canvasToImage = () => {
  uni.canvasToTempFilePath({
    canvasId: 'posterCanvas',
    success: (res) => {
      posterImage.value = res.tempFilePath;
      generating.value = false;
    },
    fail: (err) => {
      console.error('生成图片失败:', err);
      generating.value = false;
      uni.showToast({ title: '生成图片失败', icon: 'none' });
    }
  });
};

// 保存到相册
const savePoster = () => {
  if (!posterImage.value) {
    uni.showToast({ title: '请等待海报生成', icon: 'none' });
    return;
  }
  
  uni.saveImageToPhotosAlbum({
    filePath: posterImage.value,
    success: () => {
      uni.showToast({ title: '保存成功', icon: 'success' });
    },
    fail: (err) => {
      console.error('保存失败:', err);
      uni.showModal({
        title: '需要权限',
        content: '保存图片需要访问相册权限',
        success: (res) => {
          if (res.confirm) {
            uni.openSetting();
          }
        }
      });
    }
  });
};

// 分享海报
const sharePoster = () => {
  if (!posterImage.value) return;
  
  uni.shareFileMessage({
    filePath: posterImage.value,
    fileName: '健康管理报告.png',
    success: () => {
      console.log('分享成功');
    },
    fail: (err) => {
      console.error('分享失败:', err);
      // 降级：复制图片路径
      uni.setClipboardData({
        data: posterImage.value,
        success: () => {
          uni.showToast({ title: '图片路径已复制', icon: 'none' });
        }
      });
    }
  });
};

onMounted(() => {
  // 获取状态栏高度
  const systemInfo = uni.getSystemInfoSync();
  statusBarHeight.value = systemInfo.statusBarHeight || 0;
  
  // 计算 canvas 尺寸（适配屏幕宽度）
  const screenWidth = systemInfo.windowWidth || 375;
  canvasWidth.value = screenWidth - 32; // 减去 padding
  canvasHeight.value = 500;
  
  // 获取客户ID
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const pageOptions = (currentPage as any).options || {};
  clientId.value = pageOptions.clientId || pageOptions.id || '';
  
  if (clientId.value) {
    fetchClientData();
  } else {
    uni.showToast({ title: '缺少客户信息', icon: 'none' });
  }
});
</script>

<style scoped>
.mp-page-shell {
  min-height: 100vh;
}
</style>
