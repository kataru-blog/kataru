#!/usr/bin/env bun
import { exec } from 'child_process'
import { promisify } from 'util'
import { rm } from 'fs/promises'
import { existsSync } from 'fs'

const execAsync = promisify(exec)

const reset = async () => {
  console.log('🔄 DB 초기화 시작...')

  try {
    // 기존 마이그레이션 파일 삭제
    if (existsSync('./migrations')) {
      await rm('./migrations', { recursive: true, force: true })
      console.log('✅ 기존 마이그레이션 파일 삭제 완료')
    }

    // 로컬 D1 데이터베이스 초기화
    if (existsSync('.wrangler/state/v3/d1')) {
      await rm('.wrangler/state/v3/d1', { recursive: true, force: true })
      console.log('✅ D1 로컬 데이터베이스 삭제 완료')
    }

    // 프로덕션 D1 테이블 삭제 (모든 스키마 파일 기준)
    console.log('☁️ 프로덕션 DB 테이블 삭제 중...')
    const tables = [
      // better-auth 테이블들
      'account', 'session', 'user', 'verification',
      // 앱 테이블들
      'blogs', 'custom_domains', 'comments', 'likes', 'views', 
      'post_tags', 'posts', 'tags'
    ]
    
    for (const table of tables) {
      try {
        await execAsync(`bunx wrangler d1 execute kataru --remote --command "DROP TABLE IF EXISTS ${table}"`)
        console.log(`  ✅ ${table} 테이블 삭제 완료`)
      } catch (err) {
        console.log(`  ⚠️ ${table} 테이블 삭제 스킵 (존재하지 않을 수 있음)`)
      }
    }

    console.log('🎉 모든 DB 초기화 완료!')
    console.log('\n📌 다음 단계:')
    console.log('   1. bun run db:init - DB 재초기화')
    console.log('   2. bun run db:update - 스키마 업데이트')
  } catch (error) {
    console.error('❌ DB 초기화 실패:', error)
    process.exit(1)
  }
}

reset()