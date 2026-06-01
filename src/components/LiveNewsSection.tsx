import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  featured_image_url?: string;
  publish_date: string;
  source?: string;
  external_url?: string;
  category: string;
  tags?: string[];
}

/**
 * Deduplicate news articles based on title similarity
 */
function deduplicateNews(articles: NewsItem[]): NewsItem[] {
  const uniqueArticles: NewsItem[] = [];
  const seenTitles = new Set<string>();

  for (const article of articles) {
    const normalizedTitle = normalizeTitle(article.title);

    let isDuplicate = false;
    for (const seenTitle of seenTitles) {
      if (areTitlesSimilar(normalizedTitle, seenTitle)) {
        isDuplicate = true;

        const existingIndex = uniqueArticles.findIndex(
          a => normalizeTitle(a.title) === seenTitle
        );

        if (existingIndex !== -1) {
          const existing = uniqueArticles[existingIndex];
          if (article.featured_image_url && !existing.featured_image_url) {
            uniqueArticles[existingIndex] = article;
            seenTitles.delete(seenTitle);
            seenTitles.add(normalizedTitle);
          }
        }
        break;
      }
    }

    if (!isDuplicate) {
      uniqueArticles.push(article);
      seenTitles.add(normalizedTitle);
    }
  }

  return uniqueArticles;
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function areTitlesSimilar(title1: string, title2: string): boolean {
  const words1 = new Set(title1.split(' ').filter(w => w.length > 3));
  const words2 = new Set(title2.split(' ').filter(w => w.length > 3));

  if (words1.size === 0 || words2.size === 0) return false;

  let commonWords = 0;
  for (const word of words1) {
    if (words2.has(word)) commonWords++;
  }

  const similarity = commonWords / Math.min(words1.size, words2.size);
  return similarity >= 0.7;
}

const isBreaking = (publishedAt: string) => {
  const now = Date.now();
  const ts = new Date(publishedAt).getTime();
  return now - ts < 30 * 60 * 1000;
};

const CATEGORY_GRADIENT: Record<string, string> = {
  politics:      'linear-gradient(135deg,#0891B2,#3B82F6)',
  traffic:       'linear-gradient(135deg,#EA580C,#EAB308)',
  food:          'linear-gradient(135deg,#F97316,#7C2D12)',
  entertainment: 'linear-gradient(135deg,#DB2777,#831843)',
  default:       'linear-gradient(135deg,#27272A,#18181B)',
};

export const LiveNewsSection = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchNews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .not('external_url', 'is', null)
        .order('publish_date', { ascending: false })
        .limit(6);

      if (error) throw error;

      if (data && data.length > 0) {
        const validNews = data.filter(item => {
          if (!item.external_url) return false;
          const urlLower = item.external_url.toLowerCase();
          if (
            urlLower.includes('example.com') ||
            urlLower.includes('localhost') ||
            urlLower.includes('test.com') ||
            urlLower.includes('placeholder')
          ) {
            return false;
          }
          return item.external_url.startsWith('http');
        });

        const deduplicatedNews = deduplicateNews(validNews);
        setNews(deduplicatedNews);
      } else {
        setNews([]);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      toast({
        title: "Error",
        description: "Failed to load latest news",
        variant: "destructive",
      });
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const formatDate = (dateString: string) => {
    const now = new Date();
    const publishDate = new Date(dateString);
    const diffInMs = now.getTime() - publishDate.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return publishDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <section style={{ marginBottom: 24 }}>
        <h2 className="gc2-section-h" style={{ marginBottom: 14 }}>
          <span>
            Latest <span className="accent">Lagos</span> News 📰
          </span>
        </h2>
        <div className="gc2-rail" style={{ display: 'flex', gap: 12, padding: '4px 18px 8px' }}>
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              style={{
                flex: '0 0 auto',
                width: 260,
                height: 232,
                borderRadius: 14,
                background: '#0F0F12',
                border: '1px solid #27272A',
              }}
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section style={{ marginBottom: 24 }}>
      <h2 className="gc2-section-h" style={{ marginBottom: 14 }}>
        <span>
          Latest <span className="accent">Lagos</span> News 📰
        </span>
        <button className="seeall" onClick={() => fetchNews()}>
          See All
        </button>
      </h2>
      <div className="gc2-rail" style={{ display: 'flex', gap: 12, padding: '4px 18px 8px' }}>
        {news.map((article) => {
          const breaking = isBreaking(article.publish_date);
          const gradient =
            CATEGORY_GRADIENT[article.category?.toLowerCase()] || CATEGORY_GRADIENT.default;
          return (
            <button
              key={article.id}
              onClick={() => article.external_url && window.open(article.external_url, '_blank')}
              className="gc2-tap"
              style={{
                flex: '0 0 auto',
                width: 260,
                background: 'linear-gradient(180deg, #18181B 0%, #0F0F12 100%)',
                border: '1px solid #27272A',
                borderRadius: 14,
                overflow: 'hidden',
                padding: 0,
                textAlign: 'left',
                boxShadow: '0 10px 22px rgba(0,0,0,0.5)',
                cursor: 'pointer',
              }}
            >
              <div style={{ position: 'relative', height: 128, background: gradient }}>
                {article.featured_image_url && (
                  <img
                    src={article.featured_image_url}
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: 'saturate(1.2)',
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.7) 100%)',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    background: 'linear-gradient(180deg, #FDE047, #EAB308)',
                    color: '#18181B',
                    padding: '4px 9px',
                    borderRadius: 5,
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    boxShadow: '0 2px 8px rgba(234,179,8,0.45)',
                  }}
                >
                  {article.category}
                </span>
                {breaking && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      background: 'rgba(239,68,68,0.95)',
                      color: '#fff',
                      padding: '4px 8px',
                      borderRadius: 5,
                      fontSize: 9,
                      fontWeight: 900,
                      letterSpacing: '0.10em',
                      textTransform: 'uppercase',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#fff',
                        animation: 'gc2Blink 1.2s infinite',
                      }}
                    />
                    Breaking
                  </span>
                )}
                <span
                  style={{
                    position: 'absolute',
                    bottom: 10,
                    left: 10,
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#fff',
                    textShadow: '0 1px 2px rgba(0,0,0,0.7)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {formatDate(article.publish_date)}
                </span>
              </div>
              <div style={{ padding: '12px 14px 14px' }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: '#fff',
                    lineHeight: 1.32,
                    marginBottom: 6,
                    letterSpacing: '-0.005em',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {article.title}
                </div>
                {article.summary && (
                  <div
                    style={{
                      fontSize: 12,
                      color: '#9CA3AF',
                      lineHeight: 1.45,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {article.summary}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
