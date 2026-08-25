import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://business.loji.co.tz';
  const lastModified = new Date();

  const pages = [
    ['', 'weekly', 1],
    ['/login', 'monthly', 0.9],
    ['/learn-more', 'monthly', 0.8],
    ['/features', 'monthly', 0.85],
    ['/solutions', 'monthly', 0.8],
    ['/how-it-works', 'monthly', 0.8],
    ['/help', 'monthly', 0.75],
    ['/faq', 'monthly', 0.75],
    ['/security', 'monthly', 0.7],
    ['/updates', 'weekly', 0.65],
    ['/contact', 'monthly', 0.7],
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
