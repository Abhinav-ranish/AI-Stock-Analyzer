import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/login/', '/register/'],
    },
    sitemap: 'https://ai-stock-analyzer.example.com/sitemap.xml',
  }
}
