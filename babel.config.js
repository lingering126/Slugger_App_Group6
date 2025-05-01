module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@': './app',
            '@components': './app/components',
            '@screens': './app/screens',
            '@constants': './app/constants',
            '@config': './app/config',
            '@services': './app/services',
            '@utils': './app/_utils',
            '@assets': './assets',
          },
        },
      ],
    ],
  };
};
