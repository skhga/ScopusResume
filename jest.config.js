// Standalone Jest config so `npx jest` runs without react-scripts.
// react-scripts is currently a stub in node_modules (see CLAUDE.md notes);
// this file restores test-runnability by wiring jest directly to a sucrase-
// based transformer (sucrase ships with tailwindcss and is already installed).
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}',
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': '<rootDir>/jest.transform.js',
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/jest.style-mock.js',
    '\\.(png|jpg|jpeg|gif|svg|webp)$': '<rootDir>/jest.style-mock.js',
    '^react-router-dom$': '<rootDir>/node_modules/react-router-dom/dist/index.js',
    '^react-router/dom$': '<rootDir>/node_modules/react-router/dist/development/dom-export.js',
    '^react-router$': '<rootDir>/node_modules/react-router/dist/development/index.js',
  },
};
