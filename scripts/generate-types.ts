import { readdir, readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const ENTITIES_DIR = './entities'
const TYPES_DIR = './entities/types'

const parseColumnType = (columnDef: string): string => {
    if (columnDef.includes('text(')) return 'string'
    if (columnDef.includes('integer(')) {
        if (columnDef.includes('mode: \'boolean\'') || columnDef.includes('mode: "boolean"')) return 'boolean'
        if (columnDef.includes('mode: \'timestamp\'') || columnDef.includes('mode: "timestamp"')) return 'Date'
        return 'number'
    }
    return 'unknown'
}

const extractTableDefinition = (content: string): Map<string, Array<{ name: string; type: string; optional: boolean }>> => {
    const tables = new Map<string, Array<{ name: string; type: string; optional: boolean }>>()
    
    // 테이블 정의 시작과 끝을 더 정확하게 찾기
    const tableMatches = content.matchAll(/export const (\w+) = sqliteTable\(/g)
    
    for (const tableMatch of tableMatches) {
        const tableName = tableMatch[1]
        const startIndex = tableMatch.index! + tableMatch[0].length
        
        // 테이블 이름 다음의 문자열 파싱
        let i = startIndex
        let depth = 1 // 이미 여는 괄호를 지나갔으므로 1로 시작
        let tableEnd = -1
        
        // sqliteTable( 이후의 모든 내용을 파싱하여 짝이 맞는 닫는 괄호 찾기
        for (; i < content.length && depth > 0; i++) {
            if (content[i] === '(') depth++
            else if (content[i] === ')') {
                depth--
                if (depth === 0) {
                    tableEnd = i
                    break
                }
            }
        }
        
        if (tableEnd === -1) continue
        
        const tableContent = content.substring(startIndex, tableEnd)
        
        // 테이블 본문에서 컬럼 정의 부분 추출
        const columnsMatch = tableContent.match(/['"][\w_]+['"]\s*,\s*\{([\s\S]*?)\}\s*(?:,|$)/)
        if (!columnsMatch) continue
        
        const columnsBody = columnsMatch[1]
        const columns: Array<{ name: string; type: string; optional: boolean }> = []
        
        // 각 컬럼 정의를 파싱
        const lines = columnsBody.split('\n')
        let currentColumn = ''
        let columnName = ''
        let inColumn = false
        
        for (const line of lines) {
            const trimmedLine = line.trim()
            
            // 새 컬럼 시작
            const columnStart = trimmedLine.match(/^(\w+):\s*(.*)/)
            if (columnStart) {
                // 이전 컬럼 처리
                if (inColumn && columnName && currentColumn) {
                    const type = parseColumnType(currentColumn)
                    if (type !== 'unknown') {
                        const isRequired = currentColumn.includes('.notNull(')
                        const hasDefault = currentColumn.includes('.default(') || currentColumn.includes('.$defaultFn(')
                        const optional = !isRequired || hasDefault
                        columns.push({ name: columnName, type, optional })
                    }
                }
                
                // 새 컬럼 시작
                columnName = columnStart[1]
                currentColumn = columnStart[2]
                inColumn = true
            } else if (inColumn && trimmedLine.startsWith('.')) {
                // 체이닝된 메서드
                currentColumn += ' ' + trimmedLine
            } else if (inColumn && trimmedLine === '') {
                // 빈 줄이면 컬럼 종료
                if (columnName && currentColumn) {
                    const type = parseColumnType(currentColumn)
                    if (type !== 'unknown') {
                        const isRequired = currentColumn.includes('.notNull(')
                        const hasDefault = currentColumn.includes('.default(') || currentColumn.includes('.$defaultFn(')
                        const optional = !isRequired || hasDefault
                        columns.push({ name: columnName, type, optional })
                    }
                }
                inColumn = false
                columnName = ''
                currentColumn = ''
            }
        }
        
        // 마지막 컬럼 처리
        if (inColumn && columnName && currentColumn) {
            const type = parseColumnType(currentColumn)
            if (type !== 'unknown') {
                const isRequired = currentColumn.includes('.notNull(')
                const hasDefault = currentColumn.includes('.default(') || currentColumn.includes('.$defaultFn(')
                const optional = !isRequired || hasDefault
                columns.push({ name: columnName, type, optional })
            }
        }
        
        if (columns.length > 0) {
            tables.set(tableName, columns)
        }
    }
    
    return tables
}

const generateTypes = async () => {
    try {
        if (!existsSync(TYPES_DIR)) {
            await mkdir(TYPES_DIR, { recursive: true })
            console.log(`✅ Created ${TYPES_DIR} directory`)
        }

        const files = await readdir(ENTITIES_DIR)
        const schemaFiles = files.filter(file => file.endsWith('.schema.ts'))

        console.log(`🔍 Found ${schemaFiles.length} schema files`)
        
        let totalInterfaces = 0
        let totalColumns = 0

        for (const schemaFile of schemaFiles) {
            const schemaPath = join(ENTITIES_DIR, schemaFile)
            const content = await readFile(schemaPath, 'utf-8')

            const tables = extractTableDefinition(content)
            
            if (tables.size === 0) {
                console.log(`⚠️  No tables found in ${schemaFile}`)
                continue
            }

            const types: string[] = []
            let fileColumns = 0
            
            for (const [tableName, columns] of tables) {
                const interfaceName = tableName.charAt(0).toUpperCase() + tableName.slice(1)
                const singularName = interfaceName.endsWith('s') ? interfaceName.slice(0, -1) : interfaceName
                
                types.push(`export interface ${singularName} {`)
                
                for (const column of columns) {
                    const optionalMark = column.optional ? '?' : ''
                    types.push(`    ${column.name}${optionalMark}: ${column.type}`)
                    totalColumns++
                    fileColumns++
                }
                
                types.push(`}`)
                types.push('')
                totalInterfaces++
            }

            if (types.length > 0) {
                const typeFileName = schemaFile.replace('.schema.ts', '.types.ts')
                const typePath = join(TYPES_DIR, typeFileName)
                
                await writeFile(typePath, types.join('\n'))
                console.log(`✅ Generated ${typeFileName} with ${tables.size} interface(s) and ${fileColumns} columns`)
            }
        }

        console.log(`\n🎉 Type generation completed!`)
        console.log(`   Created ${totalInterfaces} interfaces with ${totalColumns} total columns.`)
    } catch (error) {
        console.error('❌ Error generating types:', error)
        process.exit(1)
    }
}

generateTypes()