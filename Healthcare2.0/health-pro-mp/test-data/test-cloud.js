// 测试云函数连接
uniCloud.callFunction({
  name: 'client-api',
  data: {
    action: 'getTemplates'
  }
}).then(res => {
  console.log('getTemplates 结果：', res);
}).catch(err => {
  console.error('getTemplates 错误：', err);
});

uniCloud.callFunction({
  name: 'client-api',
  data: {
    action: 'getProducts'
  }
}).then(res => {
  console.log('getProducts 结果：', res);
}).catch(err => {
  console.error('getProducts 错误：', err);
});
