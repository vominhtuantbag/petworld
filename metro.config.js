const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;
const sharedCombat = path.resolve(projectRoot, 'shared/combat');
const sharedCombatDist = path.resolve(sharedCombat, 'dist');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

config.watchFolders = [...new Set([...(config.watchFolders ?? []), sharedCombat, projectRoot])];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  '@game/combat': sharedCombatDist,
};

const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Force compiled package — Metro cannot resolve NodeNext `.js` imports inside `.ts` sources.
  if (moduleName === '@game/combat' || moduleName.startsWith('@game/combat/')) {
    const sub = moduleName === '@game/combat' ? 'index.js' : `${moduleName.slice('@game/combat/'.length)}.js`;
    const filePath = path.join(sharedCombatDist, sub);
    if (fs.existsSync(filePath)) {
      return { type: 'sourceFile', filePath };
    }
  }
  if (upstream) return upstream(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
