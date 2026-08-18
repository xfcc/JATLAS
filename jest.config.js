module.exports = {
  preset: 'ts-jest/presets/js-with-ts',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
};
