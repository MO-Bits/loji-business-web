import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://business.loji.co.tz';
  const lastModified = new Date();

  const pages = [
    ['', 'weekly', 1],
    ['/login', 'monthly', 0.9],
    ['/learn-more', 'monthly', 0.8],
    ['/faq', 'monthly', 0.75],
    ['/privacy', 'yearly', 0.4],
    ['/terms', 'yearly', 0.4],
  ] as const;

  return pages.map(([path, changeFrequency, priority]) => ({
    url: `${baseUrl}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
