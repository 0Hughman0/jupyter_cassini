const jestJupyterLab = require('@jupyterlab/testutils/lib/jest-config');

const esModules = [
  '@codemirror',
  '@jupyter/ydoc',
  '@jupyterlab/',
  'lib0',
  'nanoid',
  'vscode-ws-jsonrpc',
  'y-protocols',
  'y-websocket',
  'yjs'
].join('|');

const baseConfig = jestJupyterLab(__dirname);
const { setupFiles } = baseConfig;

// structuredClone isn't available in the jsdom, but is in regular dom, this patch fixes this.
setupFiles.push('<rootDir>/src/tests/structuredclonepatch.js');

module.exports = {
  ...baseConfig,
  automock: false,
  restoreMocks: false, // this has to be false for jupyterlab mocks to work.
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/.ipynb_checkpoints/*'
  ],
  coverageReporters: ['lcov', 'text'],
  testRegex: 'src/.*/.*.spec.ts[x]?$',
  transformIgnorePatterns: [`/node_modules/(?!${esModules}).+`],
  setupFiles: setupFiles
};
