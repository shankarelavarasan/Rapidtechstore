import axios from 'axios';
import cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import sharp from 'sharp';
import { createAppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

interface WebsiteMetadata {
  title: string;
  description: string;
  favicon: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  screenshots: string[];
  socialLinks: {
    twitter?: string;
    facebook?: string;
    linkedin?: string;
    instagram?: string;
  };
  contactInfo: {
    email?: string;
    phone?: string;
    address?: string;
  };
  features: string[];
  keywords: string[];
}

interface AppConfiguration {
  name: string;
  description: string;
  icon: string;
  splashScreen: string;
  primaryColor: string;
  secondaryColor: string;
  navigationStyle: 'bottom' | 'drawer' | 'top';
  features: string[];
  screenshots: string[];
  category: string;
  tags: string[];
}

interface ComplianceCheck {
  passed: boolean;
  issues: string[];
  warnings: string[];
  score: number;
}

export class AIConversionService {
  private readonly openaiApiKey: string;
  private readonly maxRetries = 3;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY!;
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key is required for AI conversion service');
    }
  }

  /**
   * Main conversion method - converts a website to a mobile app configuration
   */
  async convertWebsiteToApp(
    websiteUrl: string,
    developerId: string,
    appName?: string,
    appDescription?: string
  ): Promise<string> {
    try {
      logger.info(`Starting AI conversion for website: ${websiteUrl}`);

      // Step 1: Scrape website metadata
      const metadata = await this.scrapeWebsiteMetadata(websiteUrl);

      // Step 2: Run compliance pre-check
      const complianceCheck = await this.runComplianceCheck(websiteUrl, metadata);

      // Step 3: Generate app configuration using AI
      const appConfig = await this.generateAppConfiguration(
        metadata,
        appName,
        appDescription
      );

      // Step 4: Generate app assets (icon, splash screen)
      const assets = await this.generateAppAssets(appConfig, metadata);

      // Step 5: Create app record in database
      const app = await prisma.app.create({
        data: {
          developerId,
          name: appConfig.name,
          description: appConfig.description,
          websiteUrl,
          icon: assets.icon,
          splashScreen: assets.splashScreen,
          primaryColor: appConfig.primaryColor,
          secondaryColor: appConfig.secondaryColor,
          category: appConfig.category,
          tags: appConfig.tags,
          screenshots: appConfig.screenshots,
          features: appConfig.features,
          status: 'DRAFT',
          metadata: {
            originalMetadata: metadata,
            appConfig,
            complianceCheck,
            conversionTimestamp: new Date().toISOString(),
          },
          conversionStatus: 'COMPLETED',
        },
      });

      logger.info(`AI conversion completed for app: ${app.id}`);
      return app.id;
    } catch (error) {
      logger.error('AI conversion failed:', error);
      throw createAppError('Failed to convert website to app', 500);
    }
  }

  /**
   * Scrape website metadata and extract relevant information
   */
  private async scrapeWebsiteMetadata(websiteUrl: string): Promise<WebsiteMetadata> {
    try {
      const response = await axios.get(websiteUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      const $ = cheerio.load(response.data);

      // Extract basic metadata
      const title = $('title').text() || 
                   $('meta[property="og:title"]').attr('content') || 
                   $('meta[name="title"]').attr('content') || 
                   'Untitled App';

      const description = $('meta[name="description"]').attr('content') || 
                         $('meta[property="og:description"]').attr('content') || 
                         'No description available';

      // Extract favicon and logo
      const favicon = this.extractFavicon($, websiteUrl);
      const logo = this.extractLogo($, websiteUrl);

      // Extract colors from CSS
      const colors = await this.extractColors(response.data, websiteUrl);

      // Extract social links
      const socialLinks = this.extractSocialLinks($);

      // Extract contact information
      const contactInfo = this.extractContactInfo($);

      // Extract features and keywords
      const features = this.extractFeatures($);
      const keywords = this.extractKeywords($);

      // Extract screenshots (if available)
      const screenshots = this.extractScreenshots($, websiteUrl);

      return {
        title,
        description,
        favicon,
        logo,
        primaryColor: colors.primary,
        secondaryColor: colors.secondary,
        screenshots,
        socialLinks,
        contactInfo,
        features,
        keywords,
      };
    } catch (error) {
      logger.error(`Failed to scrape website metadata for ${websiteUrl}:`, error);
      throw createAppError('Failed to analyze website', 400);
    }
  }

  /**
   * Extract favicon from website
   */
  private extractFavicon($: cheerio.CheerioAPI, baseUrl: string): string {
    const faviconSelectors = [
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'link[rel="apple-touch-icon"]',
      'link[rel="apple-touch-icon-precomposed"]',
    ];

    for (const selector of faviconSelectors) {
      const href = $(selector).attr('href');
      if (href) {
        return this.resolveUrl(href, baseUrl);
      }
    }

    // Default favicon location
    return this.resolveUrl('/favicon.ico', baseUrl);
  }

  /**
   * Extract logo from website
   */
  private extractLogo($: cheerio.CheerioAPI, baseUrl: string): string {
    const logoSelectors = [
      'img[alt*="logo" i]',
      'img[class*="logo" i]',
      'img[id*="logo" i]',
      '.logo img',
      '#logo img',
      'header img:first',
    ];

    for (const selector of logoSelectors) {
      const src = $(selector).attr('src');
      if (src) {
        return this.resolveUrl(src, baseUrl);
      }
    }

    // Fallback to favicon
    return this.extractFavicon($, baseUrl);
  }

  /**
   * Extract primary and secondary colors from website
   */
  private async extractColors(html: string, websiteUrl: string): Promise<{ primary: string; secondary: string }> {
    try {
      // Use AI to analyze the website's color scheme
      const prompt = `Analyze this website HTML and extract the primary and secondary brand colors. Return only a JSON object with "primary" and "secondary" hex color codes:

${html.substring(0, 5000)}...`;

      const response = await this.callOpenAI(prompt, 'gpt-3.5-turbo');
      const colors = JSON.parse(response);

      return {
        primary: colors.primary || '#007AFF',
        secondary: colors.secondary || '#5856D6',
      };
    } catch (error) {
      logger.warn('Failed to extract colors, using defaults:', error);
      return {
        primary: '#007AFF',
        secondary: '#5856D6',
      };
    }
  }

  /**
   * Extract social media links
   */
  private extractSocialLinks($: cheerio.CheerioAPI): WebsiteMetadata['socialLinks'] {
    const socialLinks: WebsiteMetadata['socialLinks'] = {};

    $('a[href*="twitter.com"], a[href*="x.com"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) socialLinks.twitter = href;
    });

    $('a[href*="facebook.com"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) socialLinks.facebook = href;
    });

    $('a[href*="linkedin.com"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) socialLinks.linkedin = href;
    });

    $('a[href*="instagram.com"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) socialLinks.instagram = href;
    });

    return socialLinks;
  }

  /**
   * Extract contact information
   */
  private extractContactInfo($: cheerio.CheerioAPI): WebsiteMetadata['contactInfo'] {
    const contactInfo: WebsiteMetadata['contactInfo'] = {};

    // Extract email
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const text = $.text();
    const emailMatches = text.match(emailRegex);
    if (emailMatches && emailMatches.length > 0) {
      contactInfo.email = emailMatches[0];
    }

    // Extract phone
    const phoneRegex = /(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
    const phoneMatches = text.match(phoneRegex);
    if (phoneMatches && phoneMatches.length > 0) {
      contactInfo.phone = phoneMatches[0];
    }

    return contactInfo;
  }

  /**
   * Extract features from website content
   */
  private extractFeatures($: cheerio.CheerioAPI): string[] {
    const features: string[] = [];

    // Look for feature lists
    $('ul li, ol li').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 10 && text.length < 100) {
        features.push(text);
      }
    });

    // Look for headings that might describe features
    $('h2, h3, h4').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 5 && text.length < 50) {
        features.push(text);
      }
    });

    return features.slice(0, 10); // Limit to 10 features
  }

  /**
   * Extract keywords from website content
   */
  private extractKeywords($: cheerio.CheerioAPI): string[] {
    const keywords: string[] = [];

    // Extract from meta keywords
    const metaKeywords = $('meta[name="keywords"]').attr('content');
    if (metaKeywords) {
      keywords.push(...metaKeywords.split(',').map(k => k.trim()));
    }

    // Extract from headings
    $('h1, h2, h3').each((_, el) => {
      const text = $(el).text().trim();
      const words = text.split(' ').filter(word => word.length > 3);
      keywords.push(...words);
    });

    return [...new Set(keywords)].slice(0, 20); // Remove duplicates and limit
  }

  /**
   * Extract screenshots from website
   */
  private extractScreenshots($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const screenshots: string[] = [];

    $('img').each((_, el) => {
      const src = $(el).attr('src');
      const alt = $(el).attr('alt') || '';
      
      if (src && (alt.toLowerCase().includes('screenshot') || 
                  alt.toLowerCase().includes('preview') ||
                  src.toLowerCase().includes('screenshot'))) {
        screenshots.push(this.resolveUrl(src, baseUrl));
      }
    });

    return screenshots.slice(0, 5); // Limit to 5 screenshots
  }

  /**
   * Generate app configuration using AI
   */
  private async generateAppConfiguration(
    metadata: WebsiteMetadata,
    appName?: string,
    appDescription?: string
  ): Promise<AppConfiguration> {
    try {
      const prompt = `Based on the following website metadata, generate a mobile app configuration. Return only a JSON object:

Website Metadata:
- Title: ${metadata.title}
- Description: ${metadata.description}
- Features: ${metadata.features.join(', ')}
- Keywords: ${metadata.keywords.join(', ')}
- Primary Color: ${metadata.primaryColor}
- Secondary Color: ${metadata.secondaryColor}

${appName ? `Preferred App Name: ${appName}` : ''}
${appDescription ? `Preferred App Description: ${appDescription}` : ''}

Generate a JSON object with these fields:
- name: App name (use preferred name if provided, otherwise optimize the website title)
- description: App description (use preferred description if provided, otherwise create compelling description)
- category: Choose from ["Productivity", "Business", "Education", "Entertainment", "Finance", "Health", "Lifestyle", "News", "Photo", "Shopping", "Social", "Sports", "Travel", "Utilities", "Weather"]
- navigationStyle: Choose from ["bottom", "drawer", "top"] based on app type
- features: Array of key features (max 8)
- tags: Array of relevant tags (max 10)

Ensure the response is valid JSON only.`;

      const response = await this.callOpenAI(prompt, 'gpt-4');
      const config = JSON.parse(response);

      return {
        name: config.name || metadata.title,
        description: config.description || metadata.description,
        icon: metadata.logo || metadata.favicon,
        splashScreen: '', // Will be generated
        primaryColor: metadata.primaryColor,
        secondaryColor: metadata.secondaryColor,
        navigationStyle: config.navigationStyle || 'bottom',
        features: config.features || metadata.features.slice(0, 8),
        screenshots: metadata.screenshots,
        category: config.category || 'Utilities',
        tags: config.tags || metadata.keywords.slice(0, 10),
      };
    } catch (error) {
      logger.error('Failed to generate app configuration:', error);
      
      // Fallback configuration
      return {
        name: appName || metadata.title,
        description: appDescription || metadata.description,
        icon: metadata.logo || metadata.favicon,
        splashScreen: '',
        primaryColor: metadata.primaryColor,
        secondaryColor: metadata.secondaryColor,
        navigationStyle: 'bottom',
        features: metadata.features.slice(0, 8),
        screenshots: metadata.screenshots,
        category: 'Utilities',
        tags: metadata.keywords.slice(0, 10),
      };
    }
  }

  /**
   * Generate app assets (icon, splash screen)
   */
  private async generateAppAssets(
    config: AppConfiguration,
    metadata: WebsiteMetadata
  ): Promise<{ icon: string; splashScreen: string }> {
    try {
      // For now, use the existing logo/favicon as icon
      // In production, you might want to use AI image generation or image processing
      const icon = await this.processIcon(config.icon);
      const splashScreen = await this.generateSplashScreen(config);

      return { icon, splashScreen };
    } catch (error) {
      logger.error('Failed to generate app assets:', error);
      return {
        icon: config.icon,
        splashScreen: `data:image/svg+xml;base64,${Buffer.from(this.getDefaultSplashScreen(config)).toString('base64')}`,
      };
    }
  }

  /**
   * Process icon to ensure it meets app store requirements
   */
  private async processIcon(iconUrl: string): Promise<string> {
    try {
      const response = await axios.get(iconUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);

      // Resize to 512x512 (standard app icon size)
      const processedIcon = await sharp(buffer)
        .resize(512, 512)
        .png()
        .toBuffer();

      // Convert to base64 data URL
      return `data:image/png;base64,${processedIcon.toString('base64')}`;
    } catch (error) {
      logger.warn('Failed to process icon, using original:', error);
      return iconUrl;
    }
  }

  /**
   * Generate splash screen
   */
  private async generateSplashScreen(config: AppConfiguration): Promise<string> {
    const splashScreenSvg = this.getDefaultSplashScreen(config);
    return `data:image/svg+xml;base64,${Buffer.from(splashScreenSvg).toString('base64')}`;
  }

  /**
   * Get default splash screen SVG
   */
  private getDefaultSplashScreen(config: AppConfiguration): string {
    return `
      <svg width="375" height="812" viewBox="0 0 375 812" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${config.primaryColor};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${config.secondaryColor};stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="375" height="812" fill="url(#gradient)"/>
        <circle cx="187.5" cy="350" r="60" fill="white" opacity="0.2"/>
        <text x="187.5" y="450" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="24" font-weight="bold">
          ${config.name}
        </text>
        <text x="187.5" y="480" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" opacity="0.8">
          Loading...
        </text>
      </svg>
    `;
  }

  /**
   * Run compliance pre-check
   */
  private async runComplianceCheck(websiteUrl: string, metadata: WebsiteMetadata): Promise<ComplianceCheck> {
    const issues: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    try {
      // Check for HTTPS
      if (!websiteUrl.startsWith('https://')) {
        issues.push('Website must use HTTPS');
        score -= 20;
      }

      // Check for basic metadata
      if (!metadata.title || metadata.title.length < 3) {
        issues.push('Website title is missing or too short');
        score -= 10;
      }

      if (!metadata.description || metadata.description.length < 10) {
        warnings.push('Website description is missing or too short');
        score -= 5;
      }

      // Check for favicon/logo
      if (!metadata.favicon && !metadata.logo) {
        warnings.push('No favicon or logo found');
        score -= 5;
      }

      // Use AI to check for policy violations
      const aiComplianceCheck = await this.checkContentCompliance(websiteUrl);
      issues.push(...aiComplianceCheck.issues);
      warnings.push(...aiComplianceCheck.warnings);
      score -= aiComplianceCheck.penalty;

      return {
        passed: issues.length === 0,
        issues,
        warnings,
        score: Math.max(0, score),
      };
    } catch (error) {
      logger.error('Compliance check failed:', error);
      return {
        passed: false,
        issues: ['Failed to perform compliance check'],
        warnings: [],
        score: 0,
      };
    }
  }

  /**
   * Check content compliance using AI
   */
  private async checkContentCompliance(websiteUrl: string): Promise<{ issues: string[]; warnings: string[]; penalty: number }> {
    try {
      const response = await axios.get(websiteUrl, { timeout: 10000 });
      const $ = cheerio.load(response.data);
      const content = $.text().substring(0, 2000); // Limit content for AI analysis

      const prompt = `Analyze this website content for Google Play Store policy compliance. Check for:
1. Adult content
2. Violence or harmful content
3. Illegal activities
4. Spam or misleading content
5. Intellectual property violations
6. Privacy policy presence

Website content:
${content}

Return only a JSON object with:
- issues: Array of serious policy violations (strings)
- warnings: Array of potential concerns (strings)
- penalty: Number (0-50) representing severity of issues

Ensure the response is valid JSON only.`;

      const aiResponse = await this.callOpenAI(prompt, 'gpt-3.5-turbo');
      return JSON.parse(aiResponse);
    } catch (error) {
      logger.warn('AI compliance check failed:', error);
      return { issues: [], warnings: [], penalty: 0 };
    }
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(prompt: string, model: string = 'gpt-3.5-turbo'): Promise<string> {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 1000,
          temperature: 0.3,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      logger.error('OpenAI API call failed:', error);
      throw createAppError('AI service unavailable', 503);
    }
  }

  /**
   * Resolve relative URLs to absolute URLs
   */
  private resolveUrl(url: string, baseUrl: string): string {
    try {
      return new URL(url, baseUrl).href;
    } catch (error) {
      return url;
    }
  }

  /**
   * Regenerate app configuration
   */
  async regenerateApp(appId: string): Promise<void> {
    try {
      const app = await prisma.app.findUnique({
        where: { id: appId },
        include: { developer: true },
      });

      if (!app) {
        throw createAppError('App not found', 404);
      }

      // Re-run the conversion process
      const newAppId = await this.convertWebsiteToApp(
        app.websiteUrl,
        app.developerId,
        app.name,
        app.description
      );

      // Update the existing app with new data
      const newApp = await prisma.app.findUnique({
        where: { id: newAppId },
      });

      if (newApp) {
        await prisma.app.update({
          where: { id: appId },
          data: {
            icon: newApp.icon,
            splashScreen: newApp.splashScreen,
            primaryColor: newApp.primaryColor,
            secondaryColor: newApp.secondaryColor,
            features: newApp.features,
            screenshots: newApp.screenshots,
            metadata: newApp.metadata,
            conversionStatus: 'COMPLETED',
            updatedAt: new Date(),
          },
        });

        // Delete the temporary app
        await prisma.app.delete({
          where: { id: newAppId },
        });
      }

      logger.info(`App regenerated successfully: ${appId}`);
    } catch (error) {
      logger.error(`Failed to regenerate app ${appId}:`, error);
      throw error;
    }
  }
}

export const aiConversionService = new AIConversionService();