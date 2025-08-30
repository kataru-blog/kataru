#!/usr/bin/env bun
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const update = async () => {
  console.log('🔄 DB 스키마 업데이트 시작...')

  try {
    // 새로운 마이그레이션 파일 생성
    console.log('📝 변경된 스키마 확인 중...')
    const { stdout: genOutput, stderr: genError } = await execAsync('bunx drizzle-kit generate')
    
    if (genOutput.includes('No schema changes')) {
      console.log('ℹ️ 스키마 변경사항이 없습니다.')
      return
    }
    
    if (genError && !genError.includes('warn')) {
      throw new Error(genError)
    }
    console.log('✅ 마이그레이션 파일 생성 완료')

    // 마이그레이션 적용 (로컬)
    console.log('🗄️ 로컬 DB에 마이그레이션 적용 중...')
    const { stdout: localOutput, stderr: localError } = await execAsync('bunx wrangler d1 migrations apply kataru --local')
    if (localError && !localError.includes('warn')) {
      console.log('⚠️ 로컬 마이그레이션 경고:', localError)
    }
    console.log('✅ 로컬 DB 업데이트 완료')

    // 마이그레이션 적용 (프로덕션)
    console.log('☁️ 프로덕션 DB에 마이그레이션 적용 중...')
    const { stderr: remoteError } = await execAsync('bunx wrangler d1 migrations apply kataru --remote')
    if (remoteError && !remoteError.includes('warn')) {
      console.log('⚠️ 프로덕션 마이그레이션 경고:', remoteError)
    }
    console.log('✅ 프로덕션 DB 업데이트 완료')
    
    console.log('\n🎉 DB 업데이트 완료!')
  } catch (error) {
    console.error('❌ DB 업데이트 실패:', error)
    process.exit(1)
  }
}

update()