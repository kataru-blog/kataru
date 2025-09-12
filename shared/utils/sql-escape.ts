export const escapeLikePattern = (str: string): string => {
    if (!str) return ''
    return str
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_')
        .replace(/'/g, "''")
}