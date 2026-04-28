// Minimal Jest transformer using sucrase (already installed via tailwindcss).
// Lets us run `npx jest` without pulling in a full Babel toolchain.
// Used by jest.config.js as the default transform for .js/.jsx/.ts/.tsx files.
const { transform } = require('sucrase');

module.exports = {
  process(src, filename) {
    const isTs = /\.tsx?$/.test(filename);
    const isJsx = /\.(jsx|tsx)$/.test(filename);
    const transforms = ['imports'];
    if (isJsx) transforms.push('jsx');
    if (isTs) transforms.push('typescript');
    const result = transform(src, {
      transforms,
      filePath: filename,
      production: false,
    });
    return { code: result.code };
  },
};
