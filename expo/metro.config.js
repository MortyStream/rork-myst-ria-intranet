const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const emptyModules = ['stream', 'events', 'https', 'http', 'net', 'tls', 'fs', 'crypto'];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (emptyModules.includes(moduleName)) {
    return { type: 'empty' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
