// Minimal Jest transformer using sucrase (already installed via tailwindcss).
// Lets us run `npx jest` without pulling in a full Babel toolchain.
// Used by jest.config.js as the default transform for .js/.jsx/.ts/.tsx files.
const { transform } = require('sucrase');

module.exports = {
  process(src, filename) {
    const isTs = /\.tsx?$/.test(filename);
    // Enable JSX for .jsx/.tsx AND for .js/.ts files — test files often use JSX
    // even when named .js (e.g. App.test.js uses <App />).
    const transforms = ['imports', 'jsx'];
    if (isTs) transforms.push('typescript');
    const result = transform(src, {
      transforms,
      filePath: filename,
      production: false,
      jsxRuntime: 'automatic',
      jsxImportSource: 'react',
    });
    return { code: result.code };
  },
};
