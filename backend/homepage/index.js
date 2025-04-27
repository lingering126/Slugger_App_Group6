const routes = require('./routes');

module.exports = (app) => {
  // Mount all homepage-related routes under /api/homepage
  app.use('/api/homepage', routes);
}; 