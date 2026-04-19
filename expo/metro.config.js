const { getDefaultConfig } = require("expo/metro-config");
const { withRorkMetro } = require("@rork-ai/toolkit-sdk/metro");

const EMPTY_MODULES = new Set([
  "stream",
  "events",
  "https",
  "http",
  "net",
  "tls",
  "fs",
  "crypto",
  "zlib",
  "ws",
]);

const config = getDefaultConfig(__dirname);
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (EMPTY_MODULES.has(moduleName)) {
    return { type: "empty" };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withRorkMetro(config);
