import type { Config } from 'jest'

export default async (): Promise<Config> => {
  return {
    verbose: true,
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: '.',
    testEnvironment: 'node',
    moduleNameMapper: { '^@app/(.*)$': '<rootDir>/src/$1' },
    testMatch: [
      '<rootDir>/src/**/*.(spec|test).ts',
      '<rootDir>/test/**/*.e2e-spec.ts',
    ],
    transform: {
      '^.+\\.(t|j)s$': 'ts-jest',
    },
  }
}
