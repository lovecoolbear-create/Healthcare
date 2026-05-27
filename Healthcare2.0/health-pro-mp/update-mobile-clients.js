const fs = require('fs');
const file = '/Users/blair/HealthCare/Healthcare2.0/health-pro-mp/src/pages/admin/clients/index.vue';
let content = fs.readFileSync(file, 'utf8');

// 1. Insert Target Card in Plan Content tab
const insertMarker1 = `               </view>

              <view v-if="isDetailLoading" class="flex flex-col items-center justify-center py-20">`;
const insertIndex1 = content.indexOf(insertMarker1);

if (insertIndex1 === -1) {
  console.log('marker 1 not found!');
  process.exit(1);
}

const targetCardHtml = `               </view>

               <!-- 健康目标 -->
               <view class="bg-white rounded-xl border border-slate-100 p-3 mt-3">
                 <view class="flex items-center justify-between mb-2">
                   <text class="text-xs font-bold text-slate-700">阶段健康目标</text>
                   <text class="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded mp-pressable" @click="openTargetsEditor">设定目标</text>
                 </view>
                 <view class="grid grid-cols-2 gap-y-2 text-xs">
                   <text class="text-slate-400">目标体重</text><text class="text-slate-700 text-right font-bold">{{ clientDetail?.user?.health_targets?.weight || '60.0 KG' }}</text>
                   <text class="text-slate-400">目标体脂率</text><text class="text-slate-700 text-right font-bold">{{ clientDetail?.user?.health_targets?.body_fat || '< 20%' }}</text>
                   <text class="text-slate-400">目标内脏脂肪</text><text class="text-slate-700 text-right font-bold">{{ clientDetail?.user?.health_targets?.visceral_fat || '< 5' }}</text>
                   <text class="text-slate-400">目标血糖</text><text class="text-slate-700 text-right font-bold">{{ clientDetail?.user?.health_targets?.glucose || '4.4-6.1' }}</text>
                   <text class="text-slate-400">每日饮水量</text><text class="text-slate-700 text-right font-bold">{{ clientDetail?.user?.health_targets?.water_glasses || '8' }} 杯</text>
                 </view>
              <view v-if="isDetailLoading" class="flex flex-col items-center justify-center py-20">`;
content = content.replace(insertMarker1, targetCardHtml);

// 2. Insert Target Modal at the end of template
const templateEndMarker = `</template>`;
const templateEndIndex = content.lastIndexOf(templateEndMarker);
const targetModalHtml = `  <!-- 健康目标编辑弹窗 (Mobile) -->
  <view v-if="showTargetsEditor" class="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm" @click.self="showTargetsEditor = false">
    <view class="bg-white w-full max-w-[90%] rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
      <view class="flex justify-between items-center mb-4">
        <text class="font-bold text-slate-900">设定健康目标</text>
        <text class="text-slate-400 text-xl mp-pressable" @click="showTargetsEditor = false">×</text>
      </view>
      
      <view class="space-y-3">
        <view class="space-y-1">
          <text class="text-xs font-bold text-slate-700">目标体重</text>
          <input v-model="editTargets.weight" type="text" placeholder="例: 60.0 KG" class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-emerald-500" />
        </view>
        <view class="space-y-1">
          <text class="text-xs font-bold text-slate-700">目标体脂率</text>
          <input v-model="editTargets.body_fat" type="text" placeholder="例: < 20%" class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-emerald-500" />
        </view>
        <view class="space-y-1">
          <text class="text-xs font-bold text-slate-700">目标内脏脂肪</text>
          <input v-model="editTargets.visceral_fat" type="text" placeholder="例: < 5" class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-emerald-500" />
        </view>
        <view class="space-y-1">
          <text class="text-xs font-bold text-slate-700">目标血糖 (mmol/L)</text>
          <input v-model="editTargets.glucose" type="text" placeholder="例: 4.4-6.1" class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-emerald-500" />
        </view>
        <view class="space-y-1">
          <text class="text-xs font-bold text-slate-700">每日饮水量 (杯)</text>
          <input v-model.number="editTargets.water_glasses" type="number" placeholder="例: 8" class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-emerald-500" />
        </view>
      </view>
      
      <view class="mt-6 flex gap-3">
        <button @click="showTargetsEditor = false" class="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold active:bg-slate-200">取消</button>
        <button @click="saveTargets" :disabled="savingTargets" class="flex-1 py-3 rounded-xl bg-emerald-500 text-white text-sm font-bold active:bg-emerald-600 disabled:opacity-50">
          {{ savingTargets ? '保存中...' : '确认保存' }}
        </button>
      </view>
    </view>
  </view>

`;
content = content.substring(0, templateEndIndex) + targetModalHtml + content.substring(templateEndIndex);

// 3. Add script logic
const scriptInsertMarker = `// Client Detail Logic`;
const scriptInsertIndex = content.indexOf(scriptInsertMarker);

const targetScriptLogic = `// 健康目标编辑逻辑
const showTargetsEditor = ref(false)
const savingTargets = ref(false)
const editTargets = ref({
  weight: '',
  body_fat: '',
  glucose: '',
  visceral_fat: '',
  water_glasses: 8
})

const openTargetsEditor = () => {
  const currentTargets = clientDetail.value?.user?.health_targets || {}
  editTargets.value = {
    weight: currentTargets.weight || '60.0 KG',
    body_fat: currentTargets.body_fat || '< 20%',
    glucose: currentTargets.glucose || '4.4-6.1',
    visceral_fat: currentTargets.visceral_fat || '< 5',
    water_glasses: currentTargets.water_glasses || 8
  }
  showTargetsEditor.value = true
}

const saveTargets = async () => {
  if (!currentClient.value?.id) return
  savingTargets.value = true
  try {
    const userInfo = getUserInfo()
    const res = await callCloud<any>('admin-api', {
      action: 'updateClientTargets',
      payload: {
        clientId: currentClient.value.id,
        targets: editTargets.value
      }
    }, { showLoading: false, token: userInfo.token })

    if (res.code === 0) {
      uni.showToast({ title: '目标已保存', icon: 'success' })
      showTargetsEditor.value = false
      if (clientDetail.value && clientDetail.value.user) {
        clientDetail.value.user.health_targets = { ...editTargets.value }
      }
    } else {
      uni.showToast({ title: res.msg || '保存失败', icon: 'none' })
    }
  } catch (err) {
    uni.showToast({ title: '保存出错', icon: 'none' })
  } finally {
    savingTargets.value = false
  }
}

`;
content = content.substring(0, scriptInsertIndex) + targetScriptLogic + content.substring(scriptInsertIndex);

fs.writeFileSync(file, content, 'utf8');
console.log('Mobile index.vue updated.');
