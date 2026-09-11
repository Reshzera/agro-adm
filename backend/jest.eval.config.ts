import type { Config } from 'jest';

const config: Config = {
  rootDir: '.',
  roots: ['<rootDir>/eval'],
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '\\.eval\\.ts$',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: { module: 'ES2022', moduleResolution: 'bundler' },
      },
    ],
  },
  setupFiles: ['<rootDir>/eval/setup/env.ts'],
  maxWorkers: 1,
  testTimeout: 900_000,
  watchman: false,
};

export default config;
