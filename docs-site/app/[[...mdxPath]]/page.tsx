import { generateStaticParamsFor, importPage } from 'nextra/pages'
import { useMDXComponents as getMDXComponents } from '../../mdx-components'

export const generateStaticParams = generateStaticParamsFor('mdxPath')

export async function generateMetadata(props: { params: Promise<{ mdxPath?: string[] }> }) {
  const params = await props.params
  const { metadata } = await importPage(params.mdxPath)

  // The homepage has no MDX heading (it opens with the icon), so Nextra falls back to
  // deriving a title from the route itself ("Index") — override it with an absolute title
  // (bypassing the "%s | Greenlight Docs" template) to match the website homepage's
  // "Greenlight — <what it does>" tab title, with "Docs" appended to distinguish this site.
  const isHome = !params.mdxPath || params.mdxPath.length === 0
  if (isHome) {
    return {
      ...metadata,
      title: { absolute: 'Greenlight Docs — Human approval for AI agents, over chat' },
    }
  }

  return metadata
}

const Wrapper = getMDXComponents({}).wrapper

export default async function Page(props: { params: Promise<{ mdxPath?: string[] }> }) {
  const params = await props.params
  const { default: MDXContent, toc, metadata, sourceCode } = await importPage(params.mdxPath)

  return (
    <Wrapper toc={toc} metadata={metadata} sourceCode={sourceCode}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  )
}
