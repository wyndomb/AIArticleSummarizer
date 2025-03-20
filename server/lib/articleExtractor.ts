import axios from "axios";
import * as cheerio from "cheerio";
import { URL } from "url";

// Regular expressions for cleaning text
const WHITESPACE_REGEX = /\s+/g;
const MULTIPLE_NEWLINES_REGEX = /\n\s*\n/g;

// Content tags that are likely to contain article content
const CONTENT_TAGS = [
  "article",
  "main",
  '[role="main"]',
  ".article",
  ".post",
  ".content",
  ".post-content",
  ".article-content",
  ".entry-content",
  "#content",
  "#main",
  '[itemprop="articleBody"]',
];

// Tags that are likely to be noise and should be removed
const NOISE_TAGS = [
  "nav",
  "header",
  "footer",
  "aside",
  ".nav",
  ".menu",
  ".sidebar",
  ".comment",
  ".comments",
  ".social",
  ".share",
  ".related",
  ".ad",
  ".advertisement",
  ".advert",
  ".promo",
  ".promotion",
  ".cta",
  ".widget",
  ".meta",
  ".author-bio",
  ".footer",
  ".header",
  ".navbar",
  ".navigation",
  ".toolbar",
  "script",
  "style",
  "noscript",
  "iframe",
  "svg",
  "form",
];

interface ArticleData {
  title: string;
  content: string;
  author?: string;
  date?: string;
  description?: string;
}

// Create an axios instance with optimized settings
const httpClient = axios.create({
  timeout: 15000, // 15 seconds timeout
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  },
  maxContentLength: 10 * 1024 * 1024, // 10MB max content size
  validateStatus: (status) => status < 400, // Only accept status codes less than 400
});

// Simple in-memory article cache to avoid repeated fetches
const articleCache: Record<string, { data: ArticleData; timestamp: number }> =
  {};
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes cache TTL

/**
 * Extracts article content from a URL
 */
export async function extractArticle(url: string): Promise<ArticleData> {
  // Normalize URL
  const normalizedUrl = normalizeUrl(url);

  // Check cache first
  const now = Date.now();
  const cachedArticle = articleCache[normalizedUrl];
  if (cachedArticle && now - cachedArticle.timestamp < CACHE_TTL) {
    console.log(`Using cached article for URL: ${normalizedUrl}`);
    return cachedArticle.data;
  }

  try {
    // Fetch the webpage content with timeout
    console.log(`Fetching article from URL: ${normalizedUrl}`);
    const response = await httpClient.get(normalizedUrl);

    const html = response.data;

    // Parse the HTML
    const $ = cheerio.load(html);

    // Remove noise elements first for better performance
    $(NOISE_TAGS.join(",")).remove();

    // Extract article metadata
    const title = extractTitle($) || "";
    const author = extractAuthor($);
    const date = extractDate($);
    const description = extractDescription($);

    // Extract article content
    const content = extractContent($);

    // Create result
    const article: ArticleData = {
      title,
      content,
      author,
      date,
      description,
    };

    // Cache the result
    articleCache[normalizedUrl] = {
      data: article,
      timestamp: now,
    };

    return article;
  } catch (error) {
    console.error(`Failed to extract article from ${normalizedUrl}:`, error);
    // Check if it's a timeout error
    if (axios.isAxiosError(error) && error.code === "ECONNABORTED") {
      throw new Error(
        `Timeout while fetching article from URL. The site might be slow or unresponsive.`
      );
    }
    throw new Error(
      `Failed to extract article from URL: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Normalize URL to ensure consistent format
 */
function normalizeUrl(urlString: string): string {
  try {
    const url = new URL(urlString);
    // Remove fragments (hashtags) as they don't affect content
    url.hash = "";
    return url.toString();
  } catch (error) {
    throw new Error("Invalid URL format");
  }
}

/**
 * Extract the article title
 */
function extractTitle($: cheerio.CheerioAPI): string | null {
  // Try to find the best title candidate
  const titleSelectors = [
    "h1",
    "h1.entry-title",
    "h1.post-title",
    "h1.article-title",
    '[itemprop="headline"]',
    ".article-title",
    ".post-title",
    ".entry-title",
    ".headline",
    "#article-title",
    "title",
  ];

  for (const selector of titleSelectors) {
    const titleElement = $(selector).first();
    if (titleElement.length && titleElement.text().trim()) {
      return titleElement.text().trim();
    }
  }

  // Use the document title as fallback
  return $("title").text().trim() || null;
}

/**
 * Extract the article content more efficiently
 */
function extractContent($: cheerio.CheerioAPI): string {
  // Try to find article content by looking for content containers
  let content = "";
  let contentFound = false;

  // Try to find the main content container
  for (const selector of CONTENT_TAGS) {
    if (contentFound) break;

    const contentElement = $(selector).first();
    if (contentElement.length) {
      // Extract paragraphs and headers
      const textElements = contentElement.find(
        "p, h2, h3, h4, h5, h6, li, blockquote"
      );
      if (textElements.length > 5) {
        // Ensure there's a significant amount of content
        content = extractTextFromElements(textElements);
        contentFound = true;
      }
    }
  }

  // If no content found, fall back to extracting all paragraphs
  if (!contentFound) {
    const paragraphs = $("p");
    if (paragraphs.length > 0) {
      content = extractTextFromElements(paragraphs);
    }
  }

  // As a last resort, get the body text
  if (!content.trim()) {
    content = $("body").text().trim();

    // Clean up the text
    content = content
      .replace(WHITESPACE_REGEX, " ")
      .replace(MULTIPLE_NEWLINES_REGEX, "\n\n")
      .trim();
  }

  return content;
}

/**
 * Extract text from a collection of HTML elements more efficiently
 */
function extractTextFromElements(elements: cheerio.Cheerio<any>): string {
  // Use a StringBuilder approach for better performance with large texts
  const texts: string[] = [];

  elements.each((_, element) => {
    const tagName = element.tagName.toLowerCase();
    const text = cheerio.load(element).text().trim();

    if (text) {
      // Add extra formatting based on tag type
      if (tagName.startsWith("h")) {
        // Add newlines around headers
        texts.push(`\n\n${text}\n\n`);
      } else if (tagName === "blockquote") {
        // Format blockquotes
        texts.push(`\n\n> ${text}\n\n`);
      } else if (tagName === "li") {
        // Format list items
        texts.push(`• ${text}\n`);
      } else {
        // Regular paragraph
        texts.push(`${text}\n\n`);
      }
    }
  });

  // Clean up the final text efficiently
  let result = texts.join("");

  // Apply regex replacements in one pass each
  result = result.replace(WHITESPACE_REGEX, " ");
  result = result.replace(MULTIPLE_NEWLINES_REGEX, "\n\n");

  return result.trim();
}

/**
 * Extract the article author
 */
function extractAuthor($: cheerio.CheerioAPI): string | undefined {
  const authorSelectors = [
    '[rel="author"]',
    ".author",
    ".byline",
    '[itemprop="author"]',
    ".entry-author",
    ".post-author",
    ".article-author",
    ".meta-author",
  ];

  for (const selector of authorSelectors) {
    const authorElement = $(selector).first();
    if (authorElement.length && authorElement.text().trim()) {
      return authorElement.text().trim();
    }
  }

  return undefined;
}

/**
 * Extract the article publication date
 */
function extractDate($: cheerio.CheerioAPI): string | undefined {
  const dateSelectors = [
    '[itemprop="datePublished"]',
    '[property="article:published_time"]',
    "time",
    ".date",
    ".published",
    ".post-date",
    ".entry-date",
    ".article-date",
    ".meta-date",
  ];

  for (const selector of dateSelectors) {
    const dateElement = $(selector).first();
    if (dateElement.length) {
      // Check for datetime attribute first
      const datetime = dateElement.attr("datetime");
      if (datetime) return datetime;

      // Otherwise get the text content
      const text = dateElement.text().trim();
      if (text) return text;
    }
  }

  return undefined;
}

/**
 * Extract the article description/meta description
 */
function extractDescription($: cheerio.CheerioAPI): string | undefined {
  const descriptionSelectors = [
    'meta[name="description"]',
    'meta[property="og:description"]',
    'meta[name="twitter:description"]',
    ".article-description",
    ".entry-description",
    ".post-description",
    ".summary",
  ];

  for (const selector of descriptionSelectors) {
    const element = $(selector).first();
    if (element.length) {
      const content = element.attr("content");
      if (content) return content.trim();

      const text = element.text().trim();
      if (text) return text;
    }
  }

  return undefined;
}
