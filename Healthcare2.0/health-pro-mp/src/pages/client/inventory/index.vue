<template>
  <view class="mp-page-shell min-h-screen bg-slate-50 pb-32">
    <!-- Header -->
    <view class="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md px-4 pb-3 border-b border-slate-100 flex items-center justify-between"
      :style="{ paddingTop: `calc(${statusBarHeight}px + 12px)` }">
      <view class="flex items-center h-10 gap-2">
        <view @click="goBack" class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center active:bg-slate-100 transition-colors mp-pressable">
          <text class="text-slate-500 text-lg">←</text>
        </view>
        <text class="text-lg font-black text-slate-800">我的产品</text>
      </view>
      <!-- 购物车按钮 - 放在左侧避免被胶囊按钮遮挡 -->
      <view @click="openCart" class="relative w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center active:bg-slate-100 transition-colors mp-pressable mr-auto ml-2">
        <text class="text-lg">🛒</text>
        <view v-if="cartItemCount > 0" class="absolute -top-1 -right-1 min-w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center px-1">
          <text class="text-white text-[10px] font-bold">{{ cartItemCount > 99 ? '99+' : cartItemCount }}</text>
        </view>
      </view>
    </view>

    <!-- 占位高度 -->
    <view class="h-28"></view>

    <view class="px-6 space-y-6">
      <!-- 1. 正在进行的补货 (Active Orders) -->
      <view v-if="activeOrders.length > 0" class="space-y-4">
        <text class="text-xs font-black text-slate-400 uppercase tracking-widest px-2 block">正在进行的补货</text>
        <view v-for="order in activeOrders" :key="order._id" class="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/40 border border-slate-50 relative overflow-hidden">
          <view class="flex justify-between items-start mb-4">
            <view class="flex items-center gap-2">
              <view class="w-2 h-2 rounded-full animate-pulse" :class="order.status === 0 ? 'bg-amber-400' : 'bg-emerald-500'"></view>
              <text class="text-xs font-bold" :class="order.status === 0 ? 'text-amber-600' : order.status === 1 ? 'text-blue-600' : 'text-emerald-600'">
                {{ order.status === 0 ? '等待发货' : order.status === 1 ? '部分发货' : order.status === 2 ? '已完成' : '处理中' }}
              </text>
              <text v-if="order.isCartOrder" class="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-500">合并订单</text>
            </view>
            <text class="text-[10px] font-bold text-slate-300">{{ formatOrderDisplayNo(order) }}</text>
          </view>
          
          <view class="space-y-3 mb-6">
            <!-- 每个产品单独显示状态和操作 -->
            <view v-for="(item, idx) in order.items" :key="idx" class="flex items-center gap-3 p-3 rounded-2xl" :class="item.status === 0 ? 'bg-slate-50' : item.status === 1 ? 'bg-amber-50' : item.status === 2 ? 'bg-emerald-50' : 'bg-rose-50'">
              <view class="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" :class="item.status === 0 ? 'bg-slate-100' : item.status === 1 ? 'bg-amber-100' : item.status === 2 ? 'bg-emerald-100' : 'bg-rose-100'">
                {{ item.icon || '💊' }}
              </view>
              <view class="flex-1 min-w-0">
                <text class="text-sm font-bold text-slate-800 block truncate">{{ item.name }}</text>
                <view class="flex items-center gap-2">
                  <text class="text-[10px] text-slate-400">数量: {{ item.quantity }} {{ (item.unit === '粒' || !item.unit) ? '瓶' : item.unit }}</text>
                  <!-- 子订单状态标签 -->
                  <text class="text-[10px] px-1.5 py-0.5 rounded-full font-bold" :class="getSubOrderStatusStyle(item.status)">
                    {{ getSubOrderStatusText(item.status) }}
                  </text>
                </view>
                <!-- 已发货或已取消时显示物流信息 -->
                <view v-if="item.status === 1 || item.status === 2 || item.status === 3" class="mt-1 flex items-center justify-between">
                  <view v-if="item.status === 3">
                    <text class="text-[10px] text-rose-500 font-bold">已取消</text>
                  </view>
                  <view v-else class="flex-1 flex items-center justify-between">
                    <view class="flex-1 min-w-0" @click.stop="copyTrackingNo(item.tracking_no)">
                      <text class="text-[10px] text-slate-400 block truncate">快递: {{ item.tracking_no || '暂无' }} (点击复制)</text>
                    </view>
                    
                    <!-- 查看照片按钮 -->
                    <view 
                      v-if="item.tracking_image || item.tracking_image_url" 
                      @click.stop="previewImage(item.tracking_image_url || item.tracking_image)"
                      class="ml-2 flex items-center gap-1 px-1.5 py-0.5 bg-white rounded-lg shadow-sm border border-emerald-100 active:scale-95 transition-all"
                    >
                      <text class="text-[10px]">📸</text>
                      <text class="text-[10px] font-bold text-emerald-600">查看照片</text>
                    </view>
                  </view>
                </view>
              </view>
              
              <!-- 单个产品操作按钮 -->
              <view v-if="item.status === 1" class="shrink-0">
                <button @click="confirmSubOrderReceipt(order, item)" class="px-3 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 active:scale-95 mp-pressable">
                  确认收货
                </button>
              </view>
              <!-- 已取消的产品显示取消标签 -->
              <view v-else-if="item.status === 3" class="shrink-0">
                <text class="text-[10px] text-rose-500 font-bold">已取消</text>
              </view>
            </view>
            
            <!-- 整体物流信息（向后兼容） -->
            <view v-if="order.status === 1 && order.tracking_no && !order.items.some(i => i.tracking_no)" class="mt-3 pt-3 border-t border-slate-100">
              <view class="flex items-center justify-between mb-2">
                <text class="text-[10px] text-slate-400">整体快递单号</text>
                <text class="text-xs text-slate-600">{{ order.tracking_no }}</text>
              </view>
              <view v-if="order.tracking_image" class="mt-2">
                <image 
                  :src="convertCloudUrl(order.tracking_image) || '/static/placeholder.png'" 
                  class="w-24 h-24 rounded-xl object-cover"
                  mode="aspectFill"
                  @click="previewImage(order.tracking_image)"
                />
              </view>
            </view>
          </view>

          <view class="flex gap-2" v-if="order.items && order.items.length > 0">
            <!-- 只要还有未发货的产品，就可以取消（部分取消） -->
            <!-- 兼容旧数据：如果items不是对象数组（数据损坏），只要有产品就显示取消按钮 -->
            <button v-if="order.items.some((i: any) => typeof i === 'object' ? i.status === 0 : true)" @click="cancelOrder(order)" class="flex-1 py-3 rounded-2xl bg-slate-50 text-slate-400 text-xs font-bold active:bg-slate-100 mp-pressable">
              取消未发货
            </button>
            <!-- 当所有子订单都已发货但未全部收货时，显示整体确认收货按钮 -->
            <button v-if="order.items.every(i => i.status === 1)" @click="confirmReceipt(order)" class="flex-1 py-3 rounded-2xl bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 active:scale-95 mp-pressable">
              全部确认收货
            </button>
          </view>
        </view>
      </view>

      <!-- 2. 库存预警 (Low Stock Alert) - 包括已有库存低库存和缺失库存的产品 -->
      <!-- 2a. 需要补货（无进行中的订单）-->
      <view class="bg-rose-50 rounded-2xl p-4 border border-rose-100 flex items-center justify-between gap-3" v-if="lowStockItems.length > 0">
        <view class="flex items-start gap-3">
          <view class="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center shrink-0">
            <text class="text-sm">⚠️</text>
          </view>
          <view>
            <text class="text-sm font-bold text-rose-700 mb-1 block">库存预警</text>
            <text class="text-xs text-rose-500 font-medium block">
              <text v-for="(item, idx) in lowStockItems.slice(0, 2)" :key="item._id">
                <text v-if="item.isMissing">{{ item.name }} 未入库</text>
                <text v-else>{{ item.name }} 仅够 {{ getCoverDays(item) }} 天</text>
                <text v-if="idx < Math.min(lowStockItems.length, 2) - 1">、</text>
              </text>
              <text v-if="lowStockItems.length > 2">等 {{ lowStockItems.length }} 种产品</text>
              <text class="text-rose-600 ml-1">👉 点击🛒加入购物车</text>
            </text>
          </view>
        </view>
      </view>

      <!-- 2b. 补货中（有等待发货的订单）-->
      <view class="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-center justify-between gap-3" v-if="pendingRefillItems.some(i => i.orderStatus.status === 0)">
        <view class="flex items-start gap-3">
          <view class="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
            <text class="text-sm">📦</text>
          </view>
          <view>
            <text class="text-sm font-bold text-amber-700 mb-1 block">补货中</text>
            <text class="text-xs text-amber-500 font-medium block">
              <text v-for="(p, idx) in pendingRefillItems.filter(i => i.orderStatus.status === 0).slice(0, 2)" :key="p.item._id">
                {{ p.item.name }}{{ idx < Math.min(pendingRefillItems.filter(i => i.orderStatus.status === 0).length, 2) - 1 ? '、' : '' }}
              </text>
              <text v-if="pendingRefillItems.filter(i => i.orderStatus.status === 0).length > 2">
                等 {{ pendingRefillItems.filter(i => i.orderStatus.status === 0).length }} 种产品
              </text>
              <text>等待顾问发货</text>
            </text>
          </view>
        </view>
      </view>

      <!-- 2c. 已发货 -->
      <view class="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-center gap-3" v-if="pendingRefillItems.some(i => i.orderStatus.status === 1)">
        <view class="flex items-start gap-3">
          <view class="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
            <text class="text-sm">🚚</text>
          </view>
          <view>
            <text class="text-sm font-bold text-emerald-700 mb-1 block">已发货</text>
            <text class="text-xs text-emerald-500 font-medium block">
              <text v-for="(p, idx) in pendingRefillItems.filter(i => i.orderStatus.status === 1).slice(0, 2)" :key="p.item._id">
                {{ p.item.name }}{{ idx < Math.min(pendingRefillItems.filter(i => i.orderStatus.status === 1).length, 2) - 1 ? '、' : '' }}
              </text>
              <text v-if="pendingRefillItems.filter(i => i.orderStatus.status === 1).length > 2">
                等 {{ pendingRefillItems.filter(i => i.orderStatus.status === 1).length }} 种产品
              </text>
              <text>等待确认收货</text>
            </text>
          </view>
        </view>
      </view>

      <!-- 3. 我的产品 (Inventory List - 只显示方案中的产品) -->
      <view class="space-y-4">
        <text class="text-xs font-black text-slate-400 uppercase tracking-widest px-2 block">我的产品</text>
        <!-- 方案有产品但库存为空的情况 -->
        <view v-if="displayInventory.length === 0 && !isLoading && !lowStockItems.length" class="bg-white rounded-[32px] p-12 text-center shadow-xl shadow-slate-200/40 border border-slate-50">
          <view class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 grayscale opacity-30">
            <text class="text-4xl">💊</text>
          </view>
          <text class="text-sm font-bold text-slate-400 block">暂无库存记录</text>
          <text class="text-[10px] text-slate-300 mt-2 block">点击下方按钮根据方案自动生成初始库存</text>
          <view 
            @click="initInventoryFromProtocol"
            class="mt-4 bg-emerald-500 text-white px-6 py-2 rounded-xl text-xs font-bold active:scale-95 shadow-lg shadow-emerald-500/20 flex items-center justify-center"
          >
            从方案初始化库存
          </view>
        </view>

        <view v-else class="space-y-3">
          <view v-for="item in displayInventory" :key="item._id" class="bg-white rounded-[32px] p-5 flex items-center gap-4 shadow-xl shadow-slate-200/40 border border-slate-50 active:bg-slate-50/50 transition-colors">
            <view class="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl shrink-0 border border-slate-100 shadow-sm relative">
              {{ item.icon || '💊' }}
            </view>
            <view class="flex-1 min-w-0">
              <text class="text-sm font-black text-slate-800 block truncate mb-1">{{ item.name }}</text>
              <view class="flex items-center gap-2">
                <text class="text-xs font-bold" :class="getInventoryStatusOnly(item).textColor">
                  当前余量: {{ formatStock(item) }}
                </text>
                <text 
                  class="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  :class="[getInventoryStatusOnly(item).bgColor, getInventoryStatusOnly(item).textColor]"
                >
                  {{ getInventoryStatusOnly(item).text }}
                </text>
                <text v-if="hasNearExpiry(item)" class="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-rose-50 text-rose-500 border border-rose-100">
                  临期提醒
                </text>
              </view>
              <view class="flex items-center gap-2 mt-1">
                <text v-if="getCoverDays(item) !== null" class="text-[10px] text-slate-400">
                  可用{{ getCoverDays(item) }}天
                </text>
                <text class="text-[10px] text-slate-400">
                  {{ getPlannedDailyUsage(item) > 0 ? `| 计划用量: ${getPlannedDailyUsage(item)}${item.sub_unit || '粒'}/日` : '| 暂无执行计划' }}
                </text>
                <text @click="openAdjustStockModal(item)" class="text-[10px] text-emerald-500 underline active:opacity-60">调整</text>
              </view>
            </view>
            <!-- 始终显示加入购物车按钮，不随物流状态变化 -->
            <view 
              @click.stop="addToCart(item)"
              class="w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all shadow-sm shrink-0 mp-pressable active:scale-95"
              :class="[
                isLowStock(item) 
                  ? 'bg-rose-500 text-white shadow-rose-500/20' 
                  : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
              ]"
            >
              🛒
            </view>
          </view>
        </view>
      </view>

      <!-- 库存变动记录 - 可折叠 -->
      <view v-if="inventoryHistory.length > 0" class="mt-8 mb-12">
        <view class="flex items-center justify-between px-2 mb-4" @click="showHistory = !showHistory">
          <text class="text-xs font-black text-slate-400 uppercase tracking-widest">库存变动记录</text>
          <text class="text-xs text-slate-400">{{ showHistory ? '收起 ▲' : '展开 ▼' }}</text>
        </view>
        
        <view v-show="showHistory" class="space-y-4">
          <!-- 1. 手动调整记录 -->
          <view class="bg-white rounded-[32px] p-2 shadow-xl shadow-slate-200/40 border border-slate-50 overflow-hidden">
            <text class="text-xs font-black text-slate-400 px-4 py-2 block border-b border-slate-50">手动调整记录</text>
            <view v-if="manualAdjustHistory.length === 0" class="p-4 text-center text-xs text-slate-400">暂无记录</view>
            <view v-for="log in manualAdjustHistory" :key="log._id" 
                 class="p-4 flex items-center justify-between border-b border-slate-50 last:border-0">
              <view class="flex items-center gap-3">
                <view class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-xs">⚙️</view>
                <view>
                  <text class="text-xs font-bold text-slate-800 block">{{ log.item_name || '系统调整' }}</text>
                  <text class="text-[10px] text-slate-400 mt-0.5 block">{{ formatDate(log.created_at) }}</text>
                </view>
              </view>
              <view class="text-right">
                <text class="text-xs font-black block" :class="log.delta > 0 ? 'text-emerald-500' : 'text-slate-400'">
                  {{ log.delta > 0 ? '增加' : '减少' }} {{ formatDeltaForLog(log) }}
                </text>
                <text class="text-[10px] text-slate-300 block">余额: {{ formatStockForLog(log) }}</text>
              </view>
            </view>
          </view>

          <!-- 2. 收货记录 -->
          <view class="bg-white rounded-[32px] p-2 shadow-xl shadow-slate-200/40 border border-slate-50 overflow-hidden">
            <text class="text-xs font-black text-slate-400 px-4 py-2 block border-b border-slate-50">收货记录</text>
            <view v-if="receiptHistory.length === 0" class="p-4 text-center text-xs text-slate-400">暂无记录</view>
            <view v-for="log in receiptHistory" :key="log._id" 
                 class="p-4 flex items-center justify-between border-b border-slate-50 last:border-0">
              <view class="flex items-center gap-3">
                <view class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-xs">📦</view>
                <view>
                  <text class="text-xs font-bold text-slate-800 block">{{ log.item_name }}</text>
                  <text class="text-[10px] text-slate-400 mt-0.5 block">{{ formatDate(log.created_at) }}</text>
                  <text class="text-[10px] text-slate-400 block">订单号码: {{ getOrderNoForLog(log) }}</text>
                </view>
              </view>
              <view class="text-right">
                <text class="text-xs font-black block text-emerald-500">+{{ formatDeltaForLog(log) }}</text>
                <text class="text-[10px] text-slate-300 block">余额: {{ formatStockForLog(log) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- Refill Modal Overlay -->
    <view v-if="showRefillDialog && currentRefillItem" class="fixed inset-0 z-[110] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity" @click.self="showRefillDialog = false">
      <view class="bg-white w-full rounded-t-[40px] p-6 pb-12 shadow-2xl" @click.stop>
        <view class="flex items-center justify-between mb-6">
          <text class="text-lg font-black text-slate-800">申请补货</text>
          <view @click="showRefillDialog = false" class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mp-pressable">✕</view>
        </view>
        
        <view class="flex items-center gap-4 mb-8">
          <view class="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-3xl">
            {{ currentRefillItem?.icon }}
          </view>
          <view>
            <text class="text-sm text-slate-500 mb-1 block">正在申请</text>
            <text class="font-bold text-slate-900 text-lg block">{{ currentRefillItem?.name }}</text>
            <text v-if="getCoverDays(currentRefillItem!) !== null" class="text-xs text-rose-500 mt-1 block">
              当前仅够 {{ getCoverDays(currentRefillItem!) }} 天
            </text>
          </view>
        </view>

        <view class="flex items-center justify-between bg-slate-50 rounded-2xl p-4 mb-8">
          <text class="text-sm font-bold text-slate-600">订购数量</text>
          <view class="flex items-center gap-4">
            <view @click.stop="changeQuantity(-1)" class="w-8 h-8 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-600 font-bold active:scale-95" :class="{'opacity-50': refillQuantity <= (currentRefillItem?.min_purchase_qty || 1)}">-</view>
            <view class="flex items-baseline gap-1 min-w-[3rem] justify-center">
              <text class="text-xl font-black text-slate-800">{{ refillQuantity }}</text>
              <text class="text-xs font-bold text-slate-400">{{ currentRefillItem?.unit || '瓶' }}</text>
            </view>
            <view @click.stop="changeQuantity(1)" class="w-8 h-8 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-600 font-bold active:scale-95" :class="{'opacity-50': refillQuantity >= ((currentRefillItem?.min_purchase_qty || 1) * 10)}">+</view>
          </view>
        </view>

        <button @click.stop="submitRefillOrder" class="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-emerald-500/30 active:scale-95 transition-all mp-pressable">
          确认订购
        </button>
      </view>
    </view>

    <!-- Adjust Stock Modal Overlay -->
    <view v-if="showAdjustStockDialog && adjustStockItem" class="fixed inset-0 z-[110] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity" @click.self="showAdjustStockDialog = false">
      <view class="bg-white w-full rounded-t-[40px] p-6 pb-12 shadow-2xl" @click.stop>
        <view class="flex items-center justify-between mb-6">
          <text class="text-lg font-black text-slate-800">调整库存</text>
          <view @click="showAdjustStockDialog = false" class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mp-pressable">✕</view>
        </view>
        
        <view class="flex items-center gap-4 mb-8">
          <view class="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-3xl">
            {{ adjustStockItem?.icon }}
          </view>
          <view>
            <text class="text-sm text-slate-500 mb-1 block">正在调整</text>
            <text class="font-bold text-slate-900 text-lg block">{{ adjustStockItem?.name }}</text>
            <text class="text-xs text-amber-500 mt-1 block">
              当前库存: {{ formatStock(adjustStockItem!) }}
            </text>
          </view>
        </view>

        <view class="flex items-center justify-between bg-slate-50 rounded-2xl p-4 mb-8">
          <text class="text-sm font-bold text-slate-600">库存数量</text>
          <view class="flex items-center gap-4">
            <view @click="changeAdjustStock(-1)" class="w-8 h-8 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-600 font-bold active:scale-95 disabled:opacity-50" :disabled="adjustStockValue <= 0">-</view>
            <view class="flex items-baseline gap-1 min-w-[3rem] justify-center">
              <text class="text-xl font-black text-slate-800">{{ adjustStockValue }}</text>
              <text class="text-xs font-bold text-slate-400">{{ adjustStockItem?.unit || '瓶' }}</text>
            </view>
            <view @click="changeAdjustStock(1)" class="w-8 h-8 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-600 font-bold active:scale-95 disabled:opacity-50" :disabled="adjustStockValue >= 99">+</view>
          </view>
        </view>

        <button @click="submitAdjustStock" class="w-full bg-amber-500 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-amber-500/30 active:scale-95 transition-all mp-pressable">
          确认调整
        </button>
      </view>
    </view>

    <!-- Cart Modal Overlay -->
    <view v-if="showCartDialog" class="fixed inset-0 z-[120] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity" @click.self="showCartDialog = false">
      <view class="bg-white w-full rounded-t-[40px] p-6 pb-24 shadow-2xl max-h-[80vh] flex flex-col" @click.stop>
        <!-- 头部 -->
        <view class="flex items-center justify-between mb-6">
          <view class="flex items-center gap-2">
            <text class="text-xl">🛒</text>
            <text class="text-lg font-black text-slate-800">购物车</text>
            <text class="text-sm text-slate-400">({{ cart.length }} 种商品)</text>
          </view>
          <view class="flex items-center gap-2">
            <text v-if="cart.length > 0" @click="clearCart" class="text-sm text-rose-500 px-3 py-1 rounded-full bg-rose-50 active:bg-rose-100">清空</text>
            <view @click="showCartDialog = false" class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mp-pressable">✕</view>
          </view>
        </view>
        
        <!-- 购物车商品列表 -->
        <scroll-view scroll-y class="flex-1 max-h-[50vh] mb-4">
          <view v-if="cart.length === 0" class="flex flex-col items-center justify-center py-12 text-slate-400">
            <text class="text-4xl mb-2">🛒</text>
            <text class="text-sm">购物车是空的</text>
            <text class="text-xs mt-1">点击产品旁边的🛒加入购物车</text>
          </view>
          
          <view v-else class="space-y-3">
            <view v-for="(item, index) in cart" :key="item.inventory_id" class="flex items-center gap-3 p-3 rounded-2xl" :class="item.isLowStock ? 'bg-rose-50 border border-rose-100' : 'bg-slate-50 border border-slate-100'">
              <!-- 商品图标 -->
              <view class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" :class="item.isLowStock ? 'bg-rose-100' : 'bg-emerald-100'">
                {{ item.icon || '💊' }}
              </view>
              
              <!-- 商品信息 -->
              <view class="flex-1 min-w-0">
                <text class="text-sm font-bold text-slate-800 block truncate">{{ item.name }}</text>
                <text v-if="item.isLowStock" class="text-xs text-rose-500">库存紧张</text>
              </view>
              
              <!-- 数量调整 -->
              <view class="flex items-center gap-2">
                <view @click="changeCartQuantity(index, -(item.min_purchase_qty || 1))" class="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:bg-slate-100" :class="{ 'opacity-50': item.quantity <= (item.min_purchase_qty || 1) }">-</view>
                <text class="text-sm font-bold text-slate-800 min-w-[3rem] text-center">{{ item.quantity }}{{ item.unit || '瓶' }}</text>
                <view @click="changeCartQuantity(index, item.min_purchase_qty || 1)" class="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 active:bg-slate-100">+</view>
              </view>
              
              <!-- 删除按钮 -->
              <view @click="removeFromCart(index)" class="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 text-sm active:bg-rose-200 ml-1">🗑️</view>
            </view>
          </view>
        </scroll-view>
        
        <!-- 底部操作栏 -->
        <view v-if="cart.length > 0" class="border-t border-slate-100 pt-4">
          <view class="flex items-center justify-between mb-4">
            <text class="text-sm text-slate-500">共 {{ cartItemCount }} 件商品</text>
            <text class="text-sm text-slate-400">可合并下单</text>
          </view>
          <button @click="submitCartOrder" class="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-emerald-500/30 active:scale-95 transition-all mp-pressable flex items-center justify-center gap-2">
            <text>提交订单</text>
            <text class="text-emerald-200">|</text>
            <text class="text-sm font-normal">合并购买 {{ cart.length }} 种产品</text>
          </button>
        </view>
      </view>
    </view>

    <!-- 自定义底部导航栏 -->
    <ClientTabBar :current="3" />
  </view>
</template>

<script setup lang="ts">
import { getUserInfo } from '@/utils/storage';
import ClientTabBar from '@/components/ClientTabBar.vue'
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { callCloud } from '@/utils/cloud';
import { formatOrderDisplayNo } from '@/utils/orderDisplay';

const statusBarHeight = ref(uni.getSystemInfoSync().statusBarHeight || 44);

interface InventoryBatch {
  batch_no: string;
  quantity: number;
  expiry_date?: number | null;
}

interface InventoryItem {
  _id: string;
  name: string;
  product_id?: string;
  stock: number;
  batches?: InventoryBatch[];
  unit: string;
  icon?: string;
  low_stock_threshold?: number;
  capacity?: number;
  sub_unit?: string;
  daily_usage?: number;
  min_purchase_qty?: number; // 最小购买数量（从product库继承）
  isMissing?: boolean; // 标记为方案中有但库存中缺失的产品
}

interface Order {
  _id: string;
  order_no?: string;
  status: number;
  items: any[];
  tracking_no?: string;
  tracking_image?: string;
  created_at: number;
  isCartOrder?: boolean;
}

const inventory = ref<InventoryItem[]>([]);
const orders = ref<Order[]>([]);
const inventoryHistory = ref<any[]>([]);
const ownProtocol = ref<any>(null);
const isLoading = ref(true);
const showHistory = ref(false);

const showRefillDialog = ref(false);
const refillQuantity = ref(1);
const currentRefillItem = ref<InventoryItem | null>(null);
const isSubmittingOrder = ref(false); // 防止重复提交

// 手动调整库存
const showAdjustStockDialog = ref(false);
const adjustStockItem = ref<InventoryItem | null>(null);
const adjustStockValue = ref(0);

// 购物车功能
interface CartItem {
  inventory_id: string;
  product_id?: string;
  name: string;
  quantity: number;
  unit: string;
  icon?: string;
  isLowStock: boolean;
  min_purchase_qty: number;
}

const cart = ref<CartItem[]>([]);
const showCartDialog = ref(false);

// 从本地存储加载购物车
const loadCartFromStorage = () => {
  try {
    const userId = getUserId();
    const storageKey = `shopping_cart_${userId}`;
    const stored = uni.getStorageSync(storageKey);
    if (stored) {
      cart.value = JSON.parse(stored);
      console.log('🛒 从本地存储加载购物车:', cart.value.length, '件商品');
    }
  } catch (e) {
    console.error('加载购物车失败:', e);
  }
};

// 保存购物车到本地存储
const saveCartToStorage = () => {
  try {
    const userId = getUserId();
    const storageKey = `shopping_cart_${userId}`;
    uni.setStorageSync(storageKey, JSON.stringify(cart.value));
    console.log('🛒 购物车已保存到本地存储:', cart.value.length, '件商品');
  } catch (e) {
    console.error('保存购物车失败:', e);
  }
};

// 添加商品到购物车
const addToCart = (item: InventoryItem) => {
  console.log('🔍 addToCart called:', item.name, 'inventory_id:', item._id, 'product_id:', item.product_id);
  
  if (!item._id) {
    console.error('❌ 商品缺少inventory_id:', item);
    uni.showToast({ title: '添加失败，商品ID缺失', icon: 'none' });
    return;
  }
  
  const existingIndex = cart.value.findIndex(c => c.inventory_id === item._id);
  const minQty = item.min_purchase_qty || 1;
  
  console.log('🔍 查找现有商品:', existingIndex, '购物车当前数量:', cart.value.length);
  
  if (existingIndex > -1) {
    // 已存在，增加数量
    cart.value[existingIndex].quantity += minQty;
    uni.showToast({ title: '已增加数量', icon: 'success' });
    console.log('🔍 增加数量:', item.name, '新数量:', cart.value[existingIndex].quantity);
  } else {
    // 新添加
    const cartItem = {
      inventory_id: item._id,
      product_id: item.product_id,
      name: item.name,
      quantity: minQty,
      unit: (item.unit === '粒' || !item.unit) ? '瓶' : item.unit,
      icon: item.icon,
      isLowStock: isLowStock(item),
      min_purchase_qty: minQty
    };
    console.log('🔍 新添加商品:', cartItem);
    cart.value.push(cartItem);
    uni.showToast({ title: '已加入购物车', icon: 'success' });
  }
  
  saveCartToStorage();
  console.log('🛒 添加完成，当前购物车:', cart.value.map(c => ({name: c.name, qty: c.quantity})));
};

// 从购物车移除商品
const removeFromCart = (index: number) => {
  const removed = cart.value.splice(index, 1);
  saveCartToStorage();
  uni.showToast({ title: `已移除 ${removed[0]?.name}`, icon: 'none' });
};

// 修改购物车商品数量
const changeCartQuantity = (index: number, delta: number) => {
  const item = cart.value[index];
  const newQty = item.quantity + delta;
  const minQty = item.min_purchase_qty || 1;
  
  if (newQty >= minQty) {
    item.quantity = newQty;
    saveCartToStorage();
  }
};

// 清空购物车
const clearCart = () => {
  cart.value = [];
  saveCartToStorage();
};

// 打开购物车弹窗
const openCart = () => {
  showCartDialog.value = true;
  console.log('🛒 打开购物车, 商品数:', cart.value.length);
};

// 提交购物车订单（合并下单）
const submitCartOrder = async () => {
  if (cart.value.length === 0) {
    uni.showToast({ title: '购物车为空', icon: 'none' });
    return;
  }
  
  if (isSubmittingOrder.value) return;
  isSubmittingOrder.value = true;
  
  uni.showLoading({ title: '提交订单...' });
  
  const userId = getUserId();
  if (!userId) {
    isSubmittingOrder.value = false;
    uni.hideLoading();
    return;
  }
  
  try {
    // 构建订单商品列表
    const orderItems = cart.value.map(item => ({
      inventory_id: item.inventory_id,
      product_id: item.product_id,
      product_name: item.name,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      icon: item.icon || ''
    }));
    
    console.log('🛒 提交购物车订单, items:', orderItems);
    
    const res = await callCloud<any>('client-api', {
      action: 'createRefillOrder',
      payload: {
        userId,
        items: orderItems,
        isCartOrder: true,  // 标记为购物车订单
        debugAutoShip: false
      }
    });
    
    if (res.ok) {
      const tip = (res.data as { order_no?: string } | null)?.order_no
        ? `下单成功 ${(res.data as { order_no: string }).order_no}`
        : '订单创建成功';
      uni.showToast({ title: tip, icon: 'success', duration: 2500 });
      clearCart();
      showCartDialog.value = false;
      fetchData(); // 刷新数据
    } else {
      uni.showToast({ title: res.msg || '订单创建失败', icon: 'none' });
    }
  } catch (err) {
    console.error('❌ 提交购物车订单失败:', err);
    uni.showToast({ title: '网络错误', icon: 'none' });
  } finally {
    uni.hideLoading();
    isSubmittingOrder.value = false;
  }
};

// 购物车商品总数
const cartItemCount = computed(() => cart.value.reduce((sum, item) => sum + item.quantity, 0));

// 获取子订单状态文本
const getSubOrderStatusText = (status?: number) => {
  switch (status) {
    case 0: return '待发货';
    case 1: return '已发货';
    case 2: return '已收货';
    case 3: return '已取消';
    default: return '待发货'; // 默认也是待发货
  }
};

// 获取子订单状态样式
const getSubOrderStatusStyle = (status?: number) => {
  switch (status) {
    case 0: return 'bg-slate-200 text-slate-600';
    case 1: return 'bg-amber-100 text-amber-600';
    case 2: return 'bg-emerald-100 text-emerald-600';
    case 3: return 'bg-rose-100 text-rose-600';
    default: return 'bg-slate-200 text-slate-600';
  }
};

// 确认单个产品/子订单收货
const confirmSubOrderReceipt = async (order: Order, item: any) => {
  console.log('🔍 确认子订单收货:', item.name, 'sub_order_id:', item.sub_order_id);
  
  uni.showModal({
    title: '确认收货',
    content: `确认收到 ${item.name} × ${item.quantity}${item.unit || '瓶'}？`,
    confirmColor: '#10b981',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '处理中...' });
        try {
          const userId = getUserId();
          const cloudRes = await callCloud('client-api', {
            action: 'confirmSubOrderReceipt',
            payload: {
              userId,
              orderId: order._id,
              subOrderId: item.sub_order_id,
              inventoryId: item.inventory_id
            }
          });
          
          if (cloudRes.ok) {
            uni.showToast({ title: cloudRes.msg || '收货成功', icon: 'success' });
            fetchData();
          } else {
            uni.showToast({ title: cloudRes.msg || '收货失败', icon: 'none' });
          }
        } catch (err) {
          console.error('❌ 确认收货失败:', err);
          uni.showToast({ title: '网络错误', icon: 'none' });
        } finally {
          uni.hideLoading();
        }
      }
    }
  });
};

const normalizeText = (text?: string) => String(text || '').trim().toLowerCase();

const goBack = () => {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
  } else {
    uni.redirectTo({ url: '/pages/client/home/index' });
  }
};

const isInProtocol = (item: InventoryItem) => {
  const items = ownProtocol.value?.items || [];
  if (!items.length) return false;
  const itemProductId = normalizeText(item.product_id);
  const itemName = normalizeText(item.name);
  return items.some((protocolItem: any) => {
    const protocolProductId = normalizeText(protocolItem.product_id);
    const protocolName = normalizeText(protocolItem.product_name);
    if (itemProductId && protocolProductId) return itemProductId === protocolProductId;
    if (!itemProductId && itemName && protocolName) return itemName === protocolName;
    return false;
  });
};

const getPlannedDailyUsage = (item: InventoryItem) => {
  const items = ownProtocol.value?.items || [];
  const itemProductId = normalizeText(item.product_id);
  const itemName = normalizeText(item.name);
  const matched = items.find((protocolItem: any) => {
    const protocolProductId = normalizeText(protocolItem.product_id);
    const protocolName = normalizeText(protocolItem.product_name);
    if (itemProductId && protocolProductId) return itemProductId === protocolProductId;
    if (!itemProductId && itemName && protocolName) return itemName === protocolName;
    return false;
  });
  return Number(matched?.daily_usage || item.daily_usage || 0);
};

const getStockValue = (item: InventoryItem) => {
  if (item.batches && item.batches.length > 0) {
    return item.batches.reduce((sum, b) => sum + Number(b.quantity || 0), 0);
  }
  return Number(item.stock || 0);
};

const hasNearExpiry = (item: InventoryItem) => {
  if (!item.batches || item.batches.length === 0) return false;
  const now = Date.now();
  // 近期预警：小于 30 天 (30 * 24 * 60 * 60 * 1000 = 2592000000)
  return item.batches.some(b => b.quantity > 0 && b.expiry_date && (b.expiry_date - now < 2592000000));
};

const isLowStock = (item: InventoryItem) => {
  // PDR 3.2: 仅在健康计划内的产品才计算低库存预警
  if (!isInProtocol(item)) return false;
  
  // 如果已有补货订单（进行中），则不显示预警
  const orderStatus = getItemOrderStatus(item);
  if (orderStatus && (orderStatus.status === 0 || orderStatus.status === 1)) {
    return false;
  }
  
  // stock为0或负数时一定是低库存
  const stock = getStockValue(item);
  if (stock <= 0) return true;
  
  // PDR 3.4: 基于"覆盖天数"计算 (cover days = stock * capacity / daily_usage)
  const capacity = Number(item.capacity || 30);
  const dailyUsage = getPlannedDailyUsage(item);
  
  if (dailyUsage <= 0) return false; // 无每日用量不预警
  
  const totalPills = stock;
  const coverDays = totalPills / dailyUsage;
  
  // PDR 3.4: <7天为缺货风险
  return coverDays < 7;
};

const getCoverDays = (item: InventoryItem) => {
  const capacity = Number(item.capacity || 30);
  const dailyUsage = getPlannedDailyUsage(item);
  const stock = getStockValue(item);
  if (dailyUsage <= 0) return null;
  if (stock <= 0) return 0; // 库存为0时返回0天
  return Math.floor(stock / dailyUsage);
};

// 获取产品的补货订单状态
const getItemOrderStatus = (item: InventoryItem) => {
  // 查找包含该产品的订单
  const itemOrder = orders.value.find(order => 
    order.items.some((orderItem: any) => orderItem.inventory_id === item._id || orderItem.name === item.name)
  );
  
  console.log('📦 getItemOrderStatus:', {
    itemName: item.name,
    itemId: item._id,
    foundOrder: itemOrder ? { orderId: itemOrder._id, status: itemOrder.status, items: itemOrder.items.map((i: any) => ({ name: i.name, inventory_id: i.inventory_id })) } : null,
    allOrders: orders.value.map(o => ({ id: o._id, status: o.status, itemCount: o.items.length }))
  });
  
  if (!itemOrder) return null;
  
  // 0: 待发货(黄色), 1: 已发货(绿色), 2: 已完成(不显示)
  return {
    status: itemOrder.status,
    orderId: itemOrder._id,
    trackingNo: itemOrder.tracking_no,
    trackingImage: itemOrder.tracking_image,
    createdAt: itemOrder.created_at
  };
};

// 获取产品状态颜色：红色(低库存无订单) -> 黄色(补货中) -> 绿色(已发货) -> 无色(已完成/库存充足)
const getItemStatusColor = (item: InventoryItem) => {
  const orderStatus = getItemOrderStatus(item);
  
  if (orderStatus) {
    if (orderStatus.status === 0) return { color: 'amber', text: '补货中', bgColor: 'bg-amber-100', textColor: 'text-amber-600', dotColor: 'bg-amber-500' };
    if (orderStatus.status === 1) return { color: 'emerald', text: '已发货', bgColor: 'bg-emerald-100', textColor: 'text-emerald-600', dotColor: 'bg-emerald-500' };
    if (orderStatus.status === 2) return { color: 'slate', text: '已完成', bgColor: 'bg-slate-100', textColor: 'text-slate-500', dotColor: 'bg-slate-400' };
  }
  
  // 无订单时根据库存判断
  if (isLowStock(item)) {
    return { color: 'rose', text: '库存不足', bgColor: 'bg-rose-100', textColor: 'text-rose-600', dotColor: 'bg-rose-500' };
  }
  
  return { color: 'emerald', text: '库存充足', bgColor: 'bg-emerald-100', textColor: 'text-emerald-600', dotColor: 'bg-emerald-500' };
};

// 仅根据库存判断状态，不考虑物流
const getInventoryStatusOnly = (item: InventoryItem) => {
  const stock = getStockValue(item);
  if (stock <= 0) {
    return { color: 'rose', text: '库存不足', bgColor: 'bg-rose-100', textColor: 'text-rose-600', dotColor: 'bg-rose-500' };
  }
  
  const capacity = Number(item.capacity || 30);
  const dailyUsage = getPlannedDailyUsage(item);
  if (dailyUsage > 0) {
    const daysRem = stock / dailyUsage;
    // 默认阈值 7 天
    const threshold = 7; 
    if (daysRem <= threshold) {
      return { color: 'rose', text: '库存不足', bgColor: 'bg-rose-100', textColor: 'text-rose-600', dotColor: 'bg-rose-500' };
    }
  }
  
  return { color: 'emerald', text: '库存充足', bgColor: 'bg-emerald-100', textColor: 'text-emerald-600', dotColor: 'bg-emerald-500' };
};

const activeOrders = computed(() => orders.value.filter(o => o.status === 0 || o.status === 1));
// 只显示当前方案中的产品
const protocolInventory = computed(() => {
  const result = inventory.value.filter(item => isInProtocol(item));
  console.log('📦 protocolInventory computed:', {
    inventoryCount: inventory.value.length,
    protocolCount: result.length,
    inventory: inventory.value.map(i => ({ name: i.name, product_id: i.product_id })),
    protocolItems: ownProtocol.value?.items?.map((p: any) => ({ product_name: p.product_name, product_id: p.product_id }))
  });
  return result;
});
// 基于方案内所有产品计算低库存预警（包括缺失库存的产品）
// 计算方案内所有产品的库存状态（包括有库存和缺失的）
const allProtocolItemsStatus = computed(() => {
  console.log('📊 ownProtocol:', ownProtocol.value);
  const rawProtocolItems = ownProtocol.value?.items || [];
  // 【去重】优先用产品 ID 去重，没有 ID 时用名称兜底
  const seenKeys = new Set();
  const protocolItems = rawProtocolItems.filter((p: any) => {
    const key = p.product_id || p.product_name || p.name;
    if (!key || seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });
  console.log('📊 protocolItems (deduplicated):', protocolItems.length, protocolItems);
  if (!protocolItems.length) return [];
  
  return protocolItems.map((pItem: any) => {
    // 查找对应库存记录
    const invItem = inventory.value.find((inv: InventoryItem) => {
      const pName = normalizeText(pItem.product_name);
      const pId = normalizeText(pItem.product_id);
      const invName = normalizeText(inv.name);
      const invProdId = normalizeText(inv.product_id);
      
      if (pId && invProdId) return pId === invProdId;
      if (pName && invName) return pName === invName;
      return false;
    });
    
    const item = invItem || {
      _id: `missing_${pItem.product_id || pItem.product_name}`,
      name: pItem.product_name,
      product_id: pItem.product_id,
      stock: 0,
      unit: '瓶', // 统一使用产品库购买单位
      icon: '💊',
      capacity: pItem.capacity || 30,
      daily_usage: pItem.daily_usage || 1,
      min_purchase_qty: pItem.min_purchase_qty || 1, // 从方案传递最小购买数量
      isMissing: true
    } as InventoryItem;
    
    const orderStatus = getItemOrderStatus(item);
    
    return {
      item,
      isLowStock: invItem ? isLowStock(invItem) : true, // 无库存视为低库存
      orderStatus
    };
  });
});

// 需要补货的产品（无进行中的订单）
const lowStockItems = computed(() => {
  return allProtocolItemsStatus.value
    .filter(({ isLowStock, orderStatus }) => isLowStock && !orderStatus)
    .map(({ item }) => item);
});

// 补货中的产品（有进行中的订单）
const pendingRefillItems = computed(() => {
  return allProtocolItemsStatus.value
    .filter(({ orderStatus }) => orderStatus && (orderStatus.status === 0 || orderStatus.status === 1))
    .map(({ item, orderStatus }) => ({ item, orderStatus }));
});

// 用于显示的完整库存列表（包括方案中缺失的产品）
const displayInventory = computed(() => {
  return allProtocolItemsStatus.value.map(({ item }) => item);
});

// 手动调整记录
const manualAdjustHistory = computed(() => {
  return inventoryHistory.value.filter(log => log.change_type === 'manual_adjust');
});

// 收货记录
const receiptHistory = computed(() => {
  return inventoryHistory.value.filter(log => log.change_type === 'order_receipt');
});

// 获取日志关联的订单号
const getOrderNoForLog = (log: any) => {
  if (log.reference_type === 'order' || log.reference_type === 'sub_order') {
    const order = orders.value.find(o => o._id === log.reference_id);
    if (order) {
      const orderNo = formatOrderDisplayNo(order);
      let trackingNo = order.tracking_no;
      if (!trackingNo && order.items) {
        const itemWithTracking = order.items.find((i: any) => i.tracking_no);
        if (itemWithTracking) trackingNo = itemWithTracking.tracking_no;
      }
      return trackingNo ? `${orderNo} (快递: ${trackingNo})` : orderNo;
    }
    return log.reference_id ? log.reference_id.slice(-6).toUpperCase() : '-';
  }
  return '-';
};

const getInventoryItemForLog = (log: any) => {
  return inventory.value.find(inv => inv.product_id === log.product_id || inv._id === log.inventory_id);
};

const formatStockForLog = (log: any) => {
  const item = getInventoryItemForLog(log);
  if (item) {
    const dummyItem = { ...item, stock: log.after_stock };
    return formatStock(dummyItem);
  }
  return `${log.after_stock}粒`;
};

const formatDeltaForLog = (log: any) => {
  const item = getInventoryItemForLog(log);
  const delta = Math.abs(log.delta);
  if (item && item.capacity && item.capacity > 1) {
    const fullUnits = Math.floor(delta / item.capacity);
    const remSubUnits = delta % item.capacity;
    const unit = (item.unit === '粒' || !item.unit) ? '瓶' : item.unit;
    const subUnit = item.sub_unit || '粒';
    
    let result = '';
    if (fullUnits > 0) result += `${fullUnits}${unit}`;
    if (remSubUnits > 0) result += (fullUnits > 0 ? '零' : '') + `${remSubUnits}${subUnit}`;
    
    return result || `0${subUnit}`;
  }
  return `${delta}粒`;
};

const getUserId = () => uni.getStorageSync('userId') || getUserInfo()?._id;

const formatStock = (item: InventoryItem) => {
  const stock = getStockValue(item);
  const unit = (item.unit === '粒' || !item.unit) ? '瓶' : item.unit;
  const subUnit = item.sub_unit || '粒';
  const capacity = item.capacity || 30;
  
  if (capacity > 1) {
    const fullUnits = Math.floor(stock / capacity);
    const remSubUnits = stock % capacity;
    if (fullUnits > 0 && remSubUnits > 0) return `${fullUnits}${unit}零${remSubUnits}${subUnit}`;
    if (fullUnits > 0) return `${fullUnits}${unit}`;
    return `${remSubUnits}${subUnit}`;
  }
  return `${stock}${subUnit}`;
};

const formatDate = (ts: number) => {
  if (!ts) return '-';
  const date = new Date(ts);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
};


const openRefillModal = (item: InventoryItem) => {
  console.log('🔍 openRefillModal 被调用，产品:', item.name, 'id:', item._id, 'product_id:', item.product_id);
  currentRefillItem.value = item;
  // 使用产品的最小购买数量，默认为1
  const minQty = item.min_purchase_qty || 1;
  refillQuantity.value = minQty;
  showRefillDialog.value = true;
  console.log('🔍 currentRefillItem 已设置:', currentRefillItem.value.name);
};

// 打开调整库存弹窗
const openAdjustStockModal = (item: InventoryItem) => {
  adjustStockItem.value = item;
  adjustStockValue.value = item.stock || 0;
  showAdjustStockDialog.value = true;
};

const changeAdjustStock = (delta: number) => {
  const newValue = adjustStockValue.value + delta;
  if (newValue >= 0 && newValue <= 99) {
    adjustStockValue.value = newValue;
  }
};

const submitAdjustStock = async () => {
  if (!adjustStockItem.value) return;
  
  const item = adjustStockItem.value;
  const userId = getUserId();
  if (!userId) return;
  
  uni.showLoading({ title: '更新中...' });
  try {
    const res = await callCloud<any>('client-api', {
      action: 'updateInventory',
      payload: { userId, itemId: item._id, stock: adjustStockValue.value }
    });
    
    if (res.ok) {
      uni.showToast({ title: '库存已更新', icon: 'success' });
      fetchData();
    } else {
      uni.showToast({ title: res.msg || '更新失败', icon: 'none' });
    }
  } catch (err) {
    uni.showToast({ title: '网络错误', icon: 'none' });
  } finally {
    uni.hideLoading();
    showAdjustStockDialog.value = false;
  }
};

const changeQuantity = (delta: number) => {
  const item = currentRefillItem.value;
  if (!item) return;
  
  const minQty = item.min_purchase_qty || 1;
  const step = minQty; // 增减步长为最小购买数量
  const maxQty = minQty * 10; // 最大数量为最小单位的10倍
  
  const newValue = refillQuantity.value + (delta * step);
  if (newValue >= minQty && newValue <= maxQty) {
    refillQuantity.value = newValue;
  }
};

const submitRefillOrder = async () => {
  if (!currentRefillItem.value) return;
  
  // 防止重复提交
  if (isSubmittingOrder.value) {
    console.log('⚠️ 防止重复提交，忽略此次点击');
    return;
  }
  
  console.log('🔍 submitRefillOrder called for:', currentRefillItem.value.name, 'productId:', currentRefillItem.value._id);
  console.log('🔍 当前产品:', currentRefillItem.value.name, '数量:', refillQuantity.value);
  
  isSubmittingOrder.value = true;
  showRefillDialog.value = false;
  
  const item = currentRefillItem.value;
  const userId = getUserId();
  if (!userId) {
    isSubmittingOrder.value = false;
    return;
  }
  
  uni.showLoading({ title: '提交中...' });
  
  try {
    const orderItem = {
      inventory_id: item._id,
      product_id: item.product_id,
      product_name: item.name,
      name: item.name,
      quantity: refillQuantity.value,
      unit: '瓶',
      icon: item.icon
    };

    console.log('🔍 Creating order with item:', orderItem);
    console.log('🔍 currentRefillItem:', JSON.stringify(currentRefillItem.value));
    console.log('🔍 订单items数组:', [orderItem]);
    console.log('🔍 发送的产品:', item.name, 'product_id:', item.product_id, 'inventory_id:', item._id);

    const res = await callCloud<any>('client-api', {
      action: 'createRefillOrder',
      payload: { 
        userId,
        items: [orderItem],
        debugAutoShip: false 
      }
    });

    console.log('🔍 Order created:', res);

    if (res.ok) {
      const tip = (res.data as { order_no?: string } | null)?.order_no
        ? `申请成功 ${(res.data as { order_no: string }).order_no}`
        : '申请成功';
      uni.showToast({ title: tip, icon: 'success', duration: 2500 });
      fetchData();
    } else {
      uni.showToast({ title: res.msg || '申请失败', icon: 'none' });
    }
  } catch (err) {
    uni.showToast({ title: '网络错误', icon: 'none' });
  } finally {
    uni.hideLoading();
    isSubmittingOrder.value = false;
  }
};

// 一键补货功能已改为购物车模式，用户可以点击产品旁边的🛒按钮添加到低库存商品到购物车
// 然后统一提交购物车订单

const cancelOrder = async (order: Order) => {
  const userId = getUserId();
  uni.showModal({
    title: '取消订单',
    content: '确认取消该补货订单吗？',
    success: async (modalRes) => {
      if (!modalRes.confirm) return;
      uni.showLoading({ title: '处理中...' });
      try {
        const res = await callCloud<any>('client-api', {
          action: 'cancelOrder',
          payload: { orderId: order._id, userId }
        });
        if (res.ok) {
          uni.showToast({ title: '订单已取消', icon: 'success' });
          fetchData();
        }
      } catch (err) {
        uni.showToast({ title: '网络错误', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    }
  });
};

const confirmReceipt = async (order: Order) => {
  const userId = getUserId();
  uni.showModal({
    title: '确认收货',
    content: '确认已收到产品并将其加入药箱吗？',
    confirmColor: '#10b981',
    success: async (modalRes) => {
      if (!modalRes.confirm) return;
      uni.showLoading({ title: '处理中...' });
      try {
        const res = await callCloud<any>('client-api', {
          action: 'confirmOrderReceipt',
          payload: { orderId: order._id, userId }
        });
        if (res.ok) {
          uni.showToast({ title: '收货成功，库存已更新', icon: 'success' });
          fetchData();
        }
      } catch (err) {
        uni.showToast({ title: '网络错误', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    }
  });
};

// 批量确认所有已发货订单
const confirmAllReceipt = async () => {
  const shippedOrders = activeOrders.value.filter(o => o.status === 1);
  if (shippedOrders.length === 0) return;
  
  const userId = getUserId();
  uni.showModal({
    title: '确认收货',
    content: `确认已收到 ${shippedOrders.length} 个发货单中的所有产品吗？`,
    confirmColor: '#10b981',
    success: async (modalRes) => {
      if (!modalRes.confirm) return;
      uni.showLoading({ title: '处理中...' });
      try {
        // 批量确认所有已发货订单
        for (const order of shippedOrders) {
          await callCloud<any>('client-api', {
            action: 'confirmOrderReceipt',
            payload: { orderId: order._id, userId }
          });
        }
        uni.showToast({ title: '收货成功，库存已更新', icon: 'success' });
        fetchData();
      } catch (err) {
        uni.showToast({ title: '网络错误', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    }
  });
};

// 从产品项确认收货（使用子订单确认API）
const confirmReceiptForItem = async (item: InventoryItem) => {
  const orderStatus = getItemOrderStatus(item);
  if (!orderStatus || orderStatus.status !== 1) return;
  
  // 找到对应的子订单信息
  const order = orders.value.find(o => o._id === orderStatus.orderId);
  if (!order) return;
  
  const orderItem = order.items.find((i: any) => i.inventory_id === item._id);
  if (!orderItem) return;
  
  // 调用子订单确认收货
  await confirmSubOrderReceipt(order, orderItem);
};

// 转换云存储 URL 为 HTTPS 临时链接
const convertCloudUrl = (url: string): string => {
  if (!url) return '';
  // 如果已经是 https 开头，直接返回
  if (url.startsWith('https://') || url.startsWith('http://')) {
    return url;
  }
  // 如果是 cloud:// 开头，需要调用云函数获取临时 URL
  // 这里暂时返回空，实际应该在获取订单数据时一并转换
  return url;
};

// 复制快递单号
const copyTrackingNo = (no?: string) => {
  if (!no) return;
  uni.setClipboardData({
    data: no,
    success: () => {
      uni.showToast({ title: '单号已复制', icon: 'success' });
    }
  });
};

// 预览快递单图片
const previewImage = (url?: string) => {
  if (!url) return;
  uni.previewImage({
    urls: [url],
    current: url
  });
};

const fetchData = async () => {
  const userId = getUserId();
  if (!userId) return;
  isLoading.value = true;
  console.log('🔄 fetchData called, userId:', userId);
  try {
    const [invRes, orderRes, protocolRes, historyRes] = await Promise.all([
      callCloud<any>('client-api', { action: 'getInventory', payload: { userId } }),
      callCloud<any>('client-api', { action: 'getOrders', payload: { userId } }),
      callCloud<any>('client-api', { action: 'getOwnProtocol', payload: { userId } }),
      callCloud<any>('client-api', { action: 'getInventoryHistory', payload: { userId, limit: 50 } })
    ]);
    console.log('📦 fetchData results:', { invRes, orderRes, protocolRes, historyRes });
    if (invRes.ok) inventory.value = invRes.data;
    if (orderRes.ok) {
      orders.value = orderRes.data;
      console.log('✅ orders updated:', orders.value);
      // 调试：打印每个订单的 items
      orders.value.forEach((order, idx) => {
        console.log(`📦 Order ${idx}:`, {
          id: order._id,
          status: order.status,
          itemsCount: order.items?.length,
          items: order.items?.map(i => ({ name: i.name, status: i.status }))
        });
      });
    } else {
      console.error('❌ getOrders failed:', orderRes);
    }
    console.log('🔍 protocolRes.ok:', protocolRes.ok, 'data:', protocolRes.data);
    if (protocolRes.ok) {
      ownProtocol.value = protocolRes.data?.protocol || protocolRes.data;
      console.log('✅ ownProtocol set:', ownProtocol.value);
    } else {
      console.error('❌ protocolRes not ok:', protocolRes);
    }
    if (historyRes.ok) inventoryHistory.value = historyRes.data;
  } catch (e) {
    console.error('❌ fetchData error:', e);
  } finally {
    isLoading.value = false;
  }
};

const initInventoryFromProtocol = async () => {
  const userId = getUserId();
  if (!userId) return;
  
  console.log('🔍 initInventoryFromProtocol clicked, userId:', userId);
  console.log('🔍 ownProtocol:', ownProtocol.value);
  console.log('🔍 protocol items:', ownProtocol.value?.items);
  
  uni.showLoading({ title: '初始化中...' });
  try {
    const res = await callCloud<any>('client-api', {
      action: 'initInventoryFromProtocol',
      payload: { userId }
    });
    
    console.log('✅ initInventoryFromProtocol result:', JSON.stringify(res, null, 2));
    
    if (res.ok) {
      uni.showToast({ title: res.msg || '初始化成功', icon: 'success' });
      fetchData();
    } else {
      uni.showToast({ title: res.msg || '初始化失败', icon: 'none' });
      console.error('❌ initInventoryFromProtocol failed:', res);
    }
  } catch (err) {
    console.error('❌ initInventoryFromProtocol error:', err);
    uni.showToast({ title: '网络错误', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
};

onShow(() => {
  fetchData();
  loadCartFromStorage(); // 加载购物车数据
});
</script>

<style scoped>
.mp-pressable:active {
  opacity: 0.7;
  transform: scale(0.98);
}
.animate-spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
