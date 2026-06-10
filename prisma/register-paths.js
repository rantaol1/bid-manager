/* eslint-disable @typescript-eslint/no-require-imports */
// Registers the "@/*" -> "src/*" path alias for ts-node (used by the Prisma seed).
// The root tsconfig has no baseUrl, so we register tsconfig-paths explicitly here.
const path = require('path')
require('tsconfig-paths').register({
  baseUrl: path.resolve(__dirname, '..'),
  paths: { '@/*': ['src/*'] },
})
