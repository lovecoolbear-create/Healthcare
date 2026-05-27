const fs = require('fs');
const file = '/Users/blair/HealthCare/Healthcare2.0/health-pro-mp/src/pages/client/trends/index.vue';
let content = fs.readFileSync(file, 'utf8');

// 1. Target strings in template
content = content.replace(`目标: 8杯/天`, `目标: {{ targetWaterGlasses }}杯/天`);
content = content.replace(`每天8杯水，健康常相伴`, `每天{{ targetWaterGlasses }}杯水，健康常相伴`);

// 2. Make `metrics` reactive
const originalMetrics = `const metrics = [
  { key: 'weight', name: '体重', icon: '⚖️', unit: 'KG', target: '60.0 KG', colorClass: 'bg-indigo-500 text-white', lightColorClass: 'bg-indigo-50 text-indigo-500', chartColor: '#6366f1' },
  { key: 'body_fat', name: '体脂率', icon: '🔥', unit: '%', target: '< 20%', colorClass: 'bg-rose-500 text-white', lightColorClass: 'bg-rose-50 text-rose-500', chartColor: '#f43f5e' },
  { key: 'glucose', name: '血糖', icon: '🍬', unit: 'mmol/L', target: '4.4-6.1', colorClass: 'bg-amber-500 text-white', lightColorClass: 'bg-amber-50 text-amber-500', chartColor: '#f59e0b' },
  { key: 'visceral_fat', name: '内脏脂肪', icon: '🛡️', unit: '级', target: '< 5', colorClass: 'bg-purple-500 text-white', lightColorClass: 'bg-purple-50 text-purple-500', chartColor: '#a855f7' }
];`;

const newMetrics = `const targetWaterGlasses = ref(8);

const metrics = ref([
  { key: 'weight', name: '体重', icon: '⚖️', unit: 'KG', target: '60.0 KG', colorClass: 'bg-indigo-500 text-white', lightColorClass: 'bg-indigo-50 text-indigo-500', chartColor: '#6366f1' },
  { key: 'body_fat', name: '体脂率', icon: '🔥', unit: '%', target: '< 20%', colorClass: 'bg-rose-500 text-white', lightColorClass: 'bg-rose-50 text-rose-500', chartColor: '#f43f5e' },
  { key: 'glucose', name: '血糖', icon: '🍬', unit: 'mmol/L', target: '4.4-6.1', colorClass: 'bg-amber-500 text-white', lightColorClass: 'bg-amber-50 text-amber-500', chartColor: '#f59e0b' },
  { key: 'visceral_fat', name: '内脏脂肪', icon: '🛡️', unit: '级', target: '< 5', colorClass: 'bg-purple-500 text-white', lightColorClass: 'bg-purple-50 text-purple-500', chartColor: '#a855f7' }
]);`;
content = content.replace(originalMetrics, newMetrics);

// 3. Update usages of `metrics` to `metrics.value`
content = content.replace(`const meta = metrics.find(m => m.key === currentMetric.value) || metrics[0];`, `const meta = metrics.value.find(m => m.key === currentMetric.value) || metrics.value[0];`);

// 4. Add `fetchUserTargets` function before `onShow`
const onShowCode = `onShow(() => {`;
const fetchUserTargetsCode = `const fetchUserTargets = async () => {
  const token = uni.getStorageSync('token');
  if (!token) return;
  try {
    const res = await uniCloud.callFunction({
      name: 'client-api',
      data: { action: 'getUserInfo', token }
    });
    if (res.result.code === 0 && res.result.data) {
      const targets = res.result.data.health_targets;
      if (targets) {
        metrics.value.forEach(m => {
          if (m.key === 'weight' && targets.weight) m.target = targets.weight;
          if (m.key === 'body_fat' && targets.body_fat) m.target = targets.body_fat;
          if (m.key === 'glucose' && targets.glucose) m.target = targets.glucose;
          if (m.key === 'visceral_fat' && targets.visceral_fat) m.target = targets.visceral_fat;
        });
        if (targets.water_glasses) {
          targetWaterGlasses.value = targets.water_glasses;
        }
      }
    }
  } catch (err) {
    console.error('Failed to fetch user targets', err);
  }
};

onShow(() => {`;
content = content.replace(onShowCode, fetchUserTargetsCode);

// 5. call fetchUserTargets in onShow
const oldOnShowBody = `  fetchTrendData();
  fetchWaterData();
  fetchProtocolPhases();`;
const newOnShowBody = `  fetchUserTargets();
  fetchTrendData();
  fetchWaterData();
  fetchProtocolPhases();`;
content = content.replace(oldOnShowBody, newOnShowBody);

fs.writeFileSync(file, content, 'utf8');
console.log('trends/index.vue updated.');
