import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://business.loji.co.tz';

  return {
    rules: {
      userAgent: '*',
      allow: [
        '/',
        '/login',
        '/learn-more',
        '/privacy',
        '/terms',
      ],
      disallow: [
        '/dashboard',
        '/bookings',
        '/rooms',
        '/more',
        '/onboarding',
        '/properties',
        '/inactive',
        '/auth',
        '/api',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
