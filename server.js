// https://raw.githubusercontent.com/glenjamin/ultimate-hot-reloading-example/master/server.js
import chokidar from 'chokidar';
import config from './webpack.config';
import cssModulesRequireHook from 'css-modules-require-hook';
import express from 'express';
import http from 'http';
import webpack from 'webpack';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';

cssModulesRequireHook({generateScopedName: '[path][name]-[local]'});
const compiler = webpack(config);
const app = express();

// Serve hot-reloading bundle to client
app.use(webpackDevMiddleware(compiler, {
  noInfo: true, publicPath: config.output.publicPath
}));
app.use(webpackHotMiddleware(compiler));

// Include server routes as a middleware
app.use(function(req, res, next) {
  require('./server/app')(req, res, next);
});

// Do "hot-reloading" of express stuff on the server
// Throw away cached modules and re-require next time
// Ensure there's no important state in there!
const watcher = chokidar.watch('./server');

watcher.on('ready', function() {
  watcher.on('all', function() {
    console.log("Clearing /server/ module cache from server");
    Object.keys(require.cache).forEach(function(id) {
      if (/[\/\\]server[\/\\]/.test(id)) delete require.cache[id];
    });
  });
});

// Anything else gets passed to the client app's server rendering
app.get('*', function(req, res, next) {
  require('./client/server-render')(req.path, function(err, page) {
    if (err) return next(err);
    res.send(page);
  });
});

// Do "hot-reloading" of react stuff on the server
// Throw away the cached client modules and let them be re-required next time
compiler.plugin('done', function() {
  console.log("Clearing /client/ module cache from server");
  Object.keys(require.cache).forEach(function(id) {
    if (/[\/\\]client[\/\\]/.test(id)) delete require.cache[id];
  });
});

const server = http.createServer(app);
const PORT = 3000;
const HOST = '0.0.0.0';
server.listen(PORT, HOST, function(err) {
  if (err) throw err;

  console.log(`Running on http://${HOST}:${PORT}`);
});
