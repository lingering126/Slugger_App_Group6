const routes = require('./routes');

module.exports = (app) => {
  // 将所有homepage相关的路由挂载到/api/homepage下
  app.use('/api/homepage', routes);
}; 