module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
    // Strip tous les console.* des bundles de prod (EAS Build, expo export).
    // Reste actif en dev (api.env() === 'development') pour debugger.
    // Garde console.warn et console.error en prod pour les erreurs critiques.
    env: {
      production: {
        plugins: [
          ["transform-remove-console", { exclude: ["error", "warn"] }],
        ],
      },
    },
  };
};
