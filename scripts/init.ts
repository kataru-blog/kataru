#!/usr/bin/env bun
import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'

const execAsync = promisify(exec)

const init = async () => {
  console.log('🚀 DB 초기화 및 마이그레이션 시작...')

  try {
    // Drizzle 설정 파일 생성 (없는 경우)
    if (!existsSync('./drizzle.config.ts')) {
      const drizzleConfig = `import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './entities/*.schema.ts',
  out: './migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/22272691-bf6b-4057-b6fe-3ec4dbf2c58e.sqlite',
  },
})`
      
      await Bun.write('./drizzle.config.ts', drizzleConfig)
      console.log('✅ Drizzle 설정 파일 생성 완료')
    }

    // 마이그레이션 파일 생성
    console.log('📝 마이그레이션 파일 생성 중...')
    const { stdout: genOutput, stderr: genError } = await execAsync('bunx drizzle-kit generate')
    if (genError && !genError.includes('warn')) {
      throw new Error(genError)
    }
    console.log('✅ 마이그레이션 파일 생성 완료')

    // D1 로컬 데이터베이스 생성 및 마이그레이션 적용
    console.log('🗄️ D1 로컬 데이터베이스 설정 중...')
    const { stderr: d1LocalError } = await execAsync('bunx wrangler d1 migrations apply kataru --local')
    if (d1LocalError && !d1LocalError.includes('warn')) {
      console.log('⚠️ D1 로컬 마이그레이션 경고:', d1LocalError)
    }
    console.log('✅ 로컬 DB 초기화 완료')
    
    // D1 프로덕션 데이터베이스 마이그레이션 적용
    console.log('☁️ D1 프로덕션 데이터베이스 설정 중...')
    const { stderr: d1RemoteError } = await execAsync('bunx wrangler d1 migrations apply kataru --remote')
    if (d1RemoteError && !d1RemoteError.includes('warn')) {
      console.log('⚠️ D1 프로덕션 마이그레이션 경고:', d1RemoteError)
    }
    console.log('✅ 프로덕션 DB 초기화 완료')
    
    console.log('🎉 모든 DB 초기화 완료!')
  } catch (error) {
    console.error('❌ DB 초기화 실패:', error)
    process.exit(1)
  }
}

init()