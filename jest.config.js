module.exports = {
  preset: 'jest-preset-angular',
  setupFiles: ['<rootDir>/src/setup-jest-highcharts.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/setup.jest.ts'],
  testEnvironment: 'jsdom',
  transformIgnorePatterns: [
  'node_modules/(?!.*\\.mjs$|uuid|d3|d3-[a-zA-Z0-9-]+|internmap|delaunator|robust-predicates|some-other-lib)'
],
globals: {
  'ts-jest': {
    diagnostics: true,
  },
},
   transform: {
    '^.+\\.html?$': 'jest-preset-angular',
  },
   moduleFileExtensions: ['ts', 'html', 'js', 'json'],
   testEnvironmentOptions: {
  serialize: false
}

};
