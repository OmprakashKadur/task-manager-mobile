// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    rules: {
      // Reanimated shared values mutate .value by design to drive native thread animations
      'react-hooks/immutability': 'off',
    },
  },
]);
