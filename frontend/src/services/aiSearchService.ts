import OpenAI from 'openai'
import { mockApps } from '../data/mockData'
import type { App } from '../types'



const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const IS_DEMO_KEY = OPENAI_API_KEY?.includes('demo') || OPENAI_API_KEY?.includes('test');

if (!OPENAI_API_KEY) {
  console.warn('OpenAI API key not found. AI search will use fallback responses.');
} else if (IS_DEMO_KEY) {
  console.info('Using demo OpenAI API key. AI search will provide realistic demo responses.');
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY || 'demo-key',
  dangerouslyAllowBrowser: true // For demo purposes only
})

export interface AISearchResult {
  apps: App[]
  explanation: string
  searchIntent: string
  suggestions: string[]
}

export interface SearchFilters {
  category?: string
  priceRange?: [number, number]
  rating?: number
  features?: string[]
}

class AISearchService {
  private apps: App[] = mockApps

  /**
   * Performs AI-powered search using OpenAI to understand user intent
   * and provide intelligent app recommendations
   */
  async searchApps(query: string, filters?: SearchFilters): Promise<AISearchResult> {
    try {
      // For demo purposes, if no API key is provided, use fallback logic
      if (!OPENAI_API_KEY || IS_DEMO_KEY) {
        return this.fallbackSearch(query, filters)
      }

      // Create a prompt for OpenAI to understand search intent
      const prompt = this.createSearchPrompt(query, filters)
      
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an AI assistant for a digital marketplace. Help users find the best apps based on their needs. Analyze the user's query and provide relevant app recommendations with explanations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })

      const aiResponse = completion.choices[0]?.message?.content || ''
      
      // Parse AI response and match with available apps
      const searchResults = this.parseAIResponse(aiResponse, query, filters)
      
      return searchResults
    } catch (error) {
      console.warn('AI search failed, falling back to traditional search:', error)
      return this.fallbackSearch(query, filters)
    }
  }

  /**
   * Creates a detailed prompt for OpenAI based on user query and available apps
   */
  private createSearchPrompt(query: string, filters?: SearchFilters): string {
    const appCategories = [...new Set(this.apps.map(app => app.category))]
    const appNames = this.apps.map(app => app.name).slice(0, 20) // Limit for token efficiency
    
    return `
User Query: "${query}"

Available App Categories: ${appCategories.join(', ')}
Sample Apps: ${appNames.join(', ')}

${filters ? `Filters Applied: ${JSON.stringify(filters)}` : ''}

Please analyze this search query and provide:
1. The user's search intent (what they're looking for)
2. Recommended app categories that match their needs
3. Key features or characteristics they might want
4. 3-5 search suggestions for similar or related needs

Format your response as JSON:
{
  "intent": "brief description of what user wants",
  "categories": ["category1", "category2"],
  "features": ["feature1", "feature2"],
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
}
`
  }

  /**
   * Parses AI response and matches with actual apps
   */
  private parseAIResponse(aiResponse: string, originalQuery: string, filters?: SearchFilters): AISearchResult {
    try {
      // Try to extract JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      const aiData = jsonMatch ? JSON.parse(jsonMatch[0]) : null

      if (aiData) {
        // Use AI insights to filter apps
        const filteredApps = this.filterAppsByAIInsights(aiData, originalQuery, filters)
        
        return {
          apps: filteredApps,
          explanation: `Based on your search for "${originalQuery}", I found ${filteredApps.length} apps that match your needs. ${aiData.intent || 'These apps should help with your requirements.'}`,
          searchIntent: aiData.intent || 'General app search',
          suggestions: aiData.suggestions || this.generateFallbackSuggestions(originalQuery)
        }
      }
    } catch (error) {
      console.warn('Failed to parse AI response:', error)
    }

    // Fallback to traditional search
    return this.fallbackSearch(originalQuery, filters)
  }

  /**
   * Filters apps based on AI insights and traditional search
   */
  private filterAppsByAIInsights(aiData: any, query: string, filters?: SearchFilters): App[] {
    let filteredApps = [...this.apps]

    // Text-based search
    const searchTerms = query.toLowerCase().split(' ')
    filteredApps = filteredApps.filter(app => {
      const searchableText = `${app.name} ${app.description} ${app.category.name} ${app.tags?.join(' ') || ''} ${app.features?.join(' ') || ''}`.toLowerCase()
      return searchTerms.some(term => searchableText.includes(term))
    })

    // AI category suggestions
    if (aiData.categories && aiData.categories.length > 0) {
      const categoryMatches = filteredApps.filter(app => 
        aiData.categories.some((cat: string) => 
          app.category.name.toLowerCase().includes(cat.toLowerCase()) ||
          cat.toLowerCase().includes(app.category.name.toLowerCase())
        )
      )
      if (categoryMatches.length > 0) {
        filteredApps = categoryMatches
      }
    }

    // AI feature suggestions
    if (aiData.features && aiData.features.length > 0) {
      const featureMatches = filteredApps.filter(app => 
        app.features?.some(feature => 
          aiData.features.some((aiFeature: string) => 
            feature.toLowerCase().includes(aiFeature.toLowerCase()) ||
            aiFeature.toLowerCase().includes(feature.toLowerCase())
          )
        )
      )
      if (featureMatches.length > 0) {
        filteredApps = featureMatches
      }
    }

    // Apply traditional filters
    if (filters) {
      filteredApps = this.applyFilters(filteredApps, filters)
    }

    // Sort by relevance (rating and downloads)
    filteredApps.sort((a, b) => {
      const scoreA = (a.rating * 0.7) + (Math.log(a.downloadCount || 1) * 0.3)
      const scoreB = (b.rating * 0.7) + (Math.log(b.downloadCount || 1) * 0.3)
      return scoreB - scoreA
    })

    return filteredApps.slice(0, 12) // Limit results
  }

  /**
   * Fallback search when AI is not available
   */
  private fallbackSearch(query: string, filters?: SearchFilters): AISearchResult {
    const searchTerms = query.toLowerCase().split(' ')
    
    let filteredApps = this.apps.filter(app => {
      const searchableText = `${app.name} ${app.description} ${app.category.name} ${app.tags?.join(' ') || ''} ${app.features?.join(' ') || ''}`.toLowerCase()
      return searchTerms.some(term => searchableText.includes(term))
    })

    if (filters) {
      filteredApps = this.applyFilters(filteredApps, filters)
    }

    // Sort by relevance
    filteredApps.sort((a, b) => {
      const scoreA = (a.rating * 0.7) + (Math.log(a.downloadCount || 1) * 0.3)
      const scoreB = (b.rating * 0.7) + (Math.log(b.downloadCount || 1) * 0.3)
      return scoreB - scoreA
    })

    return {
      apps: filteredApps.slice(0, 12),
      explanation: `Found ${filteredApps.length} apps matching "${query}". Results are sorted by popularity and rating.`,
      searchIntent: `Search for apps related to: ${query}`,
      suggestions: this.generateFallbackSuggestions(query)
    }
  }

  /**
   * Applies traditional filters to app list
   */
  private applyFilters(apps: App[], filters: SearchFilters): App[] {
    let filtered = [...apps]

    if (filters.category) {
      filtered = filtered.filter(app => app.category.name === filters.category || app.category.slug === filters.category)
    }

    if (filters.priceRange) {
      const [min, max] = filters.priceRange
      filtered = filtered.filter(app => app.price >= min && app.price <= max)
    }

    if (filters.rating !== undefined) {
      filtered = filtered.filter(app => app.rating >= filters.rating!)
    }

    if (filters.features && filters.features.length > 0) {
      filtered = filtered.filter(app => 
        app.features?.some(feature => 
          filters.features!.some(filterFeature => 
            feature.toLowerCase().includes(filterFeature.toLowerCase())
          )
        )
      )
    }

    return filtered
  }

  /**
   * Generates search suggestions based on query
   */
  private generateFallbackSuggestions(query: string): string[] {
    const suggestions = [
      'productivity tools',
      'design software',
      'development tools',
      'business apps',
      'AI-powered apps',
      'free alternatives',
      'mobile apps',
      'collaboration tools'
    ]

    // Filter suggestions based on query
    const relevantSuggestions = suggestions.filter(suggestion => 
      !suggestion.toLowerCase().includes(query.toLowerCase())
    )

    return relevantSuggestions.slice(0, 4)
  }

  /**
   * Gets AI-powered app recommendations based on user behavior
   */
  async getRecommendations(): Promise<App[]> {
    // For demo purposes, return popular apps from different categories
    const categories = [...new Set(this.apps.map(app => app.category))]
    const recommendations: App[] = []

    categories.forEach(category => {
      const categoryApps = this.apps
        .filter(app => app.category === category)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 2)
      
      recommendations.push(...categoryApps)
    })

    return recommendations.slice(0, 8)
  }
}

export const aiSearchService = new AISearchService()
export default aiSearchService