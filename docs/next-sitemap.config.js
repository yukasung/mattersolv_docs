/** @type {import('next-sitemap').IConfig} */
export default {
  siteUrl: 'https://mattersolv-docs.vercel.app',
  changefreq: 'weekly',
  priority: '0.5',
  generateIndexSitemap: false,
  exclude: ['/icon.svg', '/opengraph-image']
}
