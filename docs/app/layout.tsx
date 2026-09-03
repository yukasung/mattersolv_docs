import type { Metadata } from 'next'
import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import type { FC } from 'react'
import { MermaidZoom } from './_components/mermaid-zoom'
import './globals.css'

export const dynamic = 'force-dynamic'

const productionUrl = 'https://mattersolv-docs.vercel.app'

export const metadata: Metadata = {
  description:
    'Documentation for MatterSolv workflows, modules, and administration.',
  metadataBase: new URL(productionUrl),
  keywords: [
    'MatterSolv',
    'legal operations',
    'case management',
    'matter management',
    'documentation'
  ],
  generator: 'Next.js',
  applicationName: 'MatterSolv Docs',
  appleWebApp: {
    title: 'MatterSolv Docs'
  },
  title: {
    default: 'MatterSolv Docs',
    template: '%s | MatterSolv Docs'
  },
  openGraph: {
    url: './',
    title: 'MatterSolv Docs',
    description:
      'Documentation for MatterSolv workflows, modules, and administration.',
    siteName: 'MatterSolv Docs',
    images: ['/opengraph-image'],
    locale: 'th_TH',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MatterSolv Docs',
    description:
      'Documentation for MatterSolv workflows, modules, and administration.',
    images: ['/opengraph-image']
  },
  other: {
    'msapplication-TileColor': '#fff'
  },
  alternates: {
    canonical: './'
  }
}

const navbar = (
  <Navbar
    logo={
      <span className="x:text-sm x:font-semibold x:tracking-normal x:sm:text-base">
        MatterSolv Docs
      </span>
    }
  />
)

const footer = (
  <Footer>
    <p className="text-xs">
      © {new Date().getFullYear()} MatterSolv Docs.
    </p>
  </Footer>
)

const RootLayout: FC<LayoutProps<'/'>> = async ({ children }) => {
  const resolvedChildren = await children
  const pageMap = await getPageMap()
  return (
    <html lang="th" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={navbar}
          pageMap={pageMap}
          docsRepositoryBase="https://github.com/yukasung/mattersolv_docs/tree/main/docs"
          editLink={null}
          feedback={{ content: <span hidden /> }}
          sidebar={{ defaultMenuCollapseLevel: 1 }}
          footer={footer}
        >
          {resolvedChildren}
        </Layout>
        <MermaidZoom />
      </body>
    </html>
  )
}

export default RootLayout
