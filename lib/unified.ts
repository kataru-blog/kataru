import type { Element, Root } from 'hast'
import { defaultSchema, type Schema } from 'hast-util-sanitize'
import { toString } from 'hast-util-to-string'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'

type TocItem = { depth: number; id: string; text: string }

export const toHTMLWithTOC = async (markdown: string) => {
    const toc: TocItem[] = []

    const schema: Schema = {
        ...defaultSchema,
        attributes: {
            ...defaultSchema.attributes,
            code: [...(defaultSchema.attributes?.code ?? []), ['className', /^language-/]],
            span: [...(defaultSchema.attributes?.span ?? []), ['className', /^hljs-?[\w-]*/]],
            a: [
                ...(defaultSchema.attributes?.a ?? []),
                'rel',
                ['rel', 'nofollow'],
                ['rel', 'noopener'],
                ['rel', 'noreferrer'],
                ['target', '_blank'],
                ['target', '_self'],
                ['target', '_parent'],
                ['target', '_top'],
                ['ariaHidden', 'true'],
                ['ariaHidden', 'false'],
                ['tabIndex', -1],
                ['tabIndex', 0],
                ['className', 'heading-link'],
            ],
            h1: ['id'],
            h2: ['id'],
            h3: ['id'],
            h4: ['id'],
            h5: ['id'],
            h6: ['id'],
        },
    }

    const rehypeCollectToc = () => (tree: Root) => {
        visit(tree, 'element', (node: Element) => {
            const tag = node.tagName
            if (typeof tag === 'string' && /^h[1-6]$/.test(tag)) {
                const id = node.properties?.id as string | undefined
                if (!id) return
                const depth = Number(tag.slice(1))
                const text = toString(node).trim()
                toc.push({ depth, id, text })
            }
        })
    }

    const rehypeWrapTables = () => (tree: Root) => {
        visit(tree, 'element', (node: Element, index: number | undefined, parent: Element | Root | undefined) => {
            if (node.tagName === 'table' && parent && Array.isArray(parent.children) && typeof index === 'number') {
                parent.children[index] = {
                    type: 'element',
                    tagName: 'div',
                    properties: {
                        className: ['table-wrapper'],
                    },
                    children: [node],
                } as Element
            }
        })
    }

    const file = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype, { allowDangerousHtml: false })
        .use(rehypeSlug)
        .use(rehypeExternalLinks, { target: '_blank', rel: ['nofollow', 'noopener', 'noreferrer'] })
        .use(rehypeSanitize, schema)
        .use(rehypeAutolinkHeadings, {
            behavior: 'wrap',
            properties: { className: ['heading-link'], ariaHidden: 'false', tabIndex: 0 },
        })

        .use(rehypeCollectToc)
        .use(rehypeWrapTables)
        .use(rehypeHighlight, { detect: true })
        .use(rehypeStringify)
        .process(markdown)

    const html = String(file)
    return { html, toc }
}
