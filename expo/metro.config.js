const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const blockedModules = ['ws', 'stream', 'events', 'https', 'http', 'net', 'tls', 'fs', 'crypto', 'zlib', 'url', 'buffer'];

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (blockedModules.includes(moduleName)) {
    return {
      type: 'empty',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
