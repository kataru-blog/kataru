import { readFile } from 'fs/promises'

const debugParse = async () => {
    const content = await readFile('./entities/image.schema.ts', 'utf-8')
    
    const tableRegex = /export const (\w+) = sqliteTable\(\s*['"][\w_]+['"]\s*,\s*\{([\s\S]*?)\}(?:\s*,[\s\S]*?)?\)/g
    const match = tableRegex.exec(content)
    
    if (match) {
        const [, tableName, tableBody] = match
        console.log('Table name:', tableName)
        console.log('Table body:', tableBody)
        console.log('\n---\n')
        
        const columnDefinitions: string[] = []
        let currentColumn = ''
        let braceDepth = 0
        let parenDepth = 0
        
        for (let i = 0; i < tableBody.length; i++) {
            const char = tableBody[i]
            
            if (char === '{') braceDepth++
            else if (char === '}') braceDepth--
            else if (char === '(') parenDepth++
            else if (char === ')') parenDepth--
            
            if (char === ',' && braceDepth === 0 && parenDepth === 0) {
                if (currentColumn.trim()) {
                    columnDefinitions.push(currentColumn.trim())
                }
                currentColumn = ''
            } else {
                currentColumn += char
            }
        }
        
        if (currentColumn.trim()) {
            columnDefinitions.push(currentColumn.trim())
        }
        
        console.log('Found columns:')
        columnDefinitions.forEach((col, i) => {
            const nameMatch = col.match(/^(\w+):/)
            if (nameMatch) {
                console.log(`${i + 1}. ${nameMatch[1]}`)
                console.log('   Definition:', col.substring(0, 100) + (col.length > 100 ? '...' : ''))
            }
        })
    }
}

debugParse()