const fs = require('fs');
const file = '/Users/blair/HealthCare/Healthcare2.0/health-pro-mp/src/pages/admin/clients/components/DesktopClients.vue';
let content = fs.readFileSync(file, 'utf8');

// 1. Insert Target Card in Dashboard Tab
const dashboardInsertMarker = `            <!-- 历史打卡查询 -->`;
const dashboardInsertIndex = content.indexOf(dashboardInsertMarker);

const targetCardHtml = `            <!-- 健康目标设定 -->
            <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-slate-900">阶段健康目标</h3>
                <button @click="openTargetsEditor" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
                  设定目标
                </button>
              </div>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div class="text-[10px] text-slate-500 font-bold mb-1">目标体重</div>
                  <div class="text-sm font-black text-slate-800">{{ currentClientDetail?.user?.health_targets?.weight || '60.0 KG' }}</div>
                </div>
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div class="text-[10px] text-slate-500 font-bold mb-1">目标体脂率</div>
                  <div class="text-sm font-black text-slate-800">{{ currentClientDetail?.user?.health_targets?.body_fat || '< 20%' }}</div>
                </div>
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div class="text-[10px] text-slate-500 font-bold mb-1">目标内脏脂肪</div>
                  <div class="text-sm font-black text-slate-800">{{ currentClientDetail?.user?.health_targets?.visceral_fat || '< 5' }}</div>
                </div>
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div class="text-[10px] text-slate-500 font-bold mb-1">目标血糖</div>
                  <div class="text-sm font-black text-slate-800">{{ currentClientDetail?.user?.health_targets?.glucose || '4.4-6.1' }}</div>
                </div>
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div class="text-[10px] text-slate-500 font-bold mb-1">每日饮水</div>
                  <div class="text-sm font-black text-slate-800">{{ currentClientDetail?.user?.health_targets?.water_glasses || '8' }} 杯</div>
                </div>
              </div>
            </div>

`;
content = content.substring(0, dashboardInsertIndex) + targetCardHtml + content.substring(dashboardInsertIndex);

// 2. Insert Target Modal at the end of template
const templateEndMarker = `</template>`;
const templateEndIndex = content.lastIndexOf(templateEndMarker);
const targetModalHtml = `  <!-- 健康目标编辑弹窗 -->
  <AdminModal
    v-model="showTargetsEditor"
    title="设定客户健康目标"
    size="md"
    @close="showTargetsEditor = false"
  >
    <div class="p-6 space-y-4">
      <div class="space-y-1">
        <label class="text-xs font-bold text-slate-700">目标体重</label>
        <input v-model="editTargets.weight" type="text" placeholder="例: 60.0 KG" class="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
      </div>
      <div class="space-y-1">
        <label class="text-xs font-bold text-slate-700">目标体脂率</label>
        <input v-model="editTargets.body_fat" type="text" placeholder="例: < 20%" class="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
      </div>
      <div class="space-y-1">
        <label class="text-xs font-bold text-slate-700">目标内脏脂肪</label>
        <input v-model="editTargets.visceral_fat" type="text" placeholder="例: < 5" class="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
      </div>
      <div class="space-y-1">
        <label class="text-xs font-bold text-slate-700">目标血糖 (mmol/L)</label>
        <input v-model="editTargets.glucose" type="text" placeholder="例: 4.4-6.1" class="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
      </div>
      <div class="space-y-1">
        <label class="text-xs font-bold text-slate-700">每日饮水量 (杯)</label>
        <input v-model.number="editTargets.water_glasses" type="number" placeholder="例: 8" class="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
      </div>
      
      <div class="pt-4 flex gap-3">
        <button @click="showTargetsEditor = false" class="flex-1 h-10 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors">取消</button>
        <button @click="saveTargets" :disabled="savingTargets" class="flex-1 h-10 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors shadow-md disabled:opacity-50">
          {{ savingTargets ? '保存中...' : '确认保存' }}
        </button>
      </div>
    </div>
  </AdminModal>

`;
content = content.substring(0, templateEndIndex) + targetModalHtml + content.substring(templateEndIndex);

// 3. Add script logic
const scriptEndMarker = `const showMonthView = ref(false)`;
const scriptEndIndex = content.indexOf(scriptEndMarker);

const targetScriptLogic = `// 阶段健康目标逻辑
const showTargetsEditor = ref(false);
const savingTargets = ref(false);
const editTargets = ref({
  weight: '',
  body_fat: '',
  glucose: '',
  visceral_fat: '',
  water_glasses: 8
});

const openTargetsEditor = () => {
  const currentTargets = currentClientDetail.value?.user?.health_targets || {};
  editTargets.value = {
    weight: currentTargets.weight || '60.0 KG',
    body_fat: currentTargets.body_fat || '< 20%',
    glucose: currentTargets.glucose || '4.4-6.1',
    visceral_fat: currentTargets.visceral_fat || '< 5',
    water_glasses: currentTargets.water_glasses || 8
  };
  showTargetsEditor.value = true;
};

const saveTargets = async () => {
  if (!currentClient.value?._id) return;
  savingTargets.value = true;
  try {
    const userInfo = getUserInfo();
    const res = await callCloud('admin-api', {
      action: 'updateClientTargets',
      payload: {
        clientId: currentClient.value._id,
        targets: editTargets.value
      }
    }, { showLoading: false, token: userInfo.token });

    if (res.code === 0) {
      uni.showToast({ title: '目标已保存', icon: 'success' });
      showTargetsEditor.value = false;
      // 局部更新视图数据
      if (currentClientDetail.value && currentClientDetail.value.user) {
        currentClientDetail.value.user.health_targets = { ...editTargets.value };
      }
    } else {
      uni.showToast({ title: res.msg || '保存失败', icon: 'none' });
    }
  } catch (err) {
    console.error(err);
    uni.showToast({ title: '保存出错', icon: 'none' });
  } finally {
    savingTargets.value = false;
  }
};

`;
content = content.substring(0, scriptEndIndex) + targetScriptLogic + content.substring(scriptEndIndex);

fs.writeFileSync(file, content, 'utf8');
console.log('DesktopClients.vue updated.');
