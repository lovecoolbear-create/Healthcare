const fs = require('fs');
const file = '/Users/blair/HealthCare/Healthcare2.0/health-pro-mp/src/pages/client/trends/index.vue';
let content = fs.readFileSync(file, 'utf8');

// The multi_replace accidentally inserted a broken string
// Let's find the broken part and restore it
const brokenIndex = content.indexOf(`  { key: 'weight', name: '体重', icon: '⚖️', unit: 'KG', target: '60.0 KG', colorC// 安全的本地日期格式化`);
if (brokenIndex !== -1) {
  const replaceWith = `  { key: 'weight', name: '体重', icon: '⚖️', unit: 'KG', target: '60.0 KG', colorClass: 'bg-indigo-500 text-white', lightColorClass: 'bg-indigo-50 text-indigo-500', chartColor: '#6366f1' },
  { key: 'body_fat', name: '体脂率', icon: '🔥', unit: '%', target: '< 20%', colorClass: 'bg-rose-500 text-white', lightColorClass: 'bg-rose-50 text-rose-500', chartColor: '#f43f5e' },
  { key: 'glucose', name: '血糖', icon: '🍬', unit: 'mmol/L', target: '4.4-6.1', colorClass: 'bg-amber-500 text-white', lightColorClass: 'bg-amber-50 text-amber-500', chartColor: '#f59e0b' },
  { key: 'visceral_fat', name: '内脏脂肪', icon: '🛡️', unit: '级', target: '< 5', colorClass: 'bg-purple-500 text-white', lightColorClass: 'bg-purple-50 text-purple-500', chartColor: '#a855f7' }
];

// 存储每个指标的图表数据和当前值
const metricData = ref<Record<string, any>>({});

// 安全的本地日期格式化（避免 toISOString 的 8 小时 UTC 时差坑）`;
  content = content.replace(`  { key: 'weight', name: '体重', icon: '⚖️', unit: 'KG', target: '60.0 KG', colorC// 安全的本地日期格式化（避免 toISOString 的 8 小时 UTC 时差坑）`, replaceWith);
}

// Check for duplicated generateChartPath
const doubleGen = content.split('const generateChartPath');
if (doubleGen.length > 2) {
  // It inserted it twice or malformed.
  // We should just use a clean regex to fix the file.
}
fs.writeFileSync(file, content, 'utf8');
console.log('Patch applied.');
