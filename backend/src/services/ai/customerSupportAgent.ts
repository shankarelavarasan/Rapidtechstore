import { geminiAI, aiConfig } from './config';
import { GenerativeModel } from '@google/generative-ai';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sessionId: string;
}

export interface SupportContext {
  userId?: string;
  userType: 'customer' | 'vendor' | 'guest';
  currentPage?: string;
  recentActions?: string[];
  orderHistory?: any[];
}

export class CustomerSupportAgent {
  private model: GenerativeModel;
  private systemPrompt: string;

  constructor() {
    if (geminiAI) {
      this.model = geminiAI.getGenerativeModel({ model: 'gemini-pro' });
    }
    this.systemPrompt = this.buildSystemPrompt();
  }

  private buildSystemPrompt(): string {
    return `You are RapidBot, the AI customer support assistant for Rapid Tech Store - a comprehensive digital marketplace for software, SaaS, AI/AGI tools, IDE addons, plugins, and digital solutions.

ROLE & PERSONALITY:
- Friendly, professional, and knowledgeable tech support specialist
- Enthusiastic about helping users find the right digital tools
- Patient with technical questions and billing issues
- Proactive in suggesting relevant products

CAPABILITIES:
- Help with account issues, orders, and subscriptions
- Provide product recommendations based on user needs
- Assist with technical support for purchased software
- Guide users through the marketplace features
- Handle billing and payment inquiries
- Escalate complex issues to human support when needed

KNOWLEDGE BASE:
- Rapid Tech Store specializes in: Software, SaaS tools, AI/AGI applications, IDE extensions, plugins, digital solutions
- Support for vendors and customers
- Payment processing, subscriptions, and licensing
- Technical documentation and installation guides

RESPONSE GUIDELINES:
- Keep responses concise but helpful (max 200 words)
- Use bullet points for multiple steps or options
- Include relevant links or next steps when appropriate
- Ask clarifying questions if the user's request is unclear
- Always maintain a helpful and professional tone

If you cannot resolve an issue, offer to connect the user with human support.`;
  }

  async chat(message: string, context: SupportContext, chatHistory: ChatMessage[] = []): Promise<string> {
    try {
      // Check if AI model is available
      if (!this.model) {
        return 'AI support is currently unavailable. Please contact our human support team for assistance.';
      }

      // Build conversation context
      const conversationContext = this.buildConversationContext(context, chatHistory);
      
      // Prepare the prompt with context
      const fullPrompt = `${this.systemPrompt}

CURRENT CONTEXT:
${conversationContext}

CHAT HISTORY:
${chatHistory.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

USER MESSAGE: ${message}

RESPONSE:`;

      const result = await this.model.generateContent(fullPrompt);
      const response = result.response;
      
      return response.text() || 'I apologize, but I\'m having trouble processing your request right now. Please try again or contact our human support team.';
      
    } catch (error) {
      console.error('Customer Support AI Error:', error);
      return 'I\'m experiencing technical difficulties. Please contact our support team directly for immediate assistance.';
    }
  }

  private buildConversationContext(context: SupportContext, chatHistory: ChatMessage[]): string {
    let contextStr = `User Type: ${context.userType}`;
    
    if (context.currentPage) {
      contextStr += `\nCurrent Page: ${context.currentPage}`;
    }
    
    if (context.recentActions && context.recentActions.length > 0) {
      contextStr += `\nRecent Actions: ${context.recentActions.join(', ')}`;
    }
    
    if (context.orderHistory && context.orderHistory.length > 0) {
      contextStr += `\nRecent Orders: ${context.orderHistory.length} orders`;
    }
    
    return contextStr;
  }

  async categorizeQuery(message: string): Promise<{
    category: 'technical' | 'billing' | 'product' | 'account' | 'general';
    priority: 'low' | 'medium' | 'high';
    needsHuman: boolean;
  }> {
    try {
      // Check if AI model is available
      if (!this.model) {
        return {
          category: 'general',
          priority: 'medium',
          needsHuman: true
        };
      }

      const categorizationPrompt = `Categorize this customer support query:

Query: "${message}"

Respond with JSON format:
{
  "category": "technical|billing|product|account|general",
  "priority": "low|medium|high", 
  "needsHuman": true|false
}

Categories:
- technical: Software issues, installation, bugs
- billing: Payments, subscriptions, refunds
- product: Product recommendations, features
- account: Login, profile, settings
- general: Other inquiries

Priority:
- high: Urgent issues, payment problems, critical bugs
- medium: General support, product questions
- low: Information requests, general inquiries

needsHuman: true if requires human intervention (complex technical issues, billing disputes, etc.)`;

      const result = await this.model.generateContent(categorizationPrompt);
      const response = result.response.text();
      
      try {
        return JSON.parse(response);
      } catch {
        // Fallback categorization
        return {
          category: 'general',
          priority: 'medium',
          needsHuman: false
        };
      }
    } catch (error) {
      console.error('Query categorization error:', error);
      return {
        category: 'general',
        priority: 'medium',
        needsHuman: false
      };
    }
  }

  async generateProductRecommendations(userQuery: string, userContext: SupportContext): Promise<string[]> {
    try {
      // Check if AI model is available
      if (!this.model) {
        return [
          'Development Tools & IDEs',
          'AI/ML Tools & Platforms',
          'SaaS Business Solutions'
        ];
      }

      const recommendationPrompt = `Based on this user query, suggest 3-5 relevant product categories or specific tools from Rapid Tech Store:

User Query: "${userQuery}"
User Type: ${userContext.userType}

Available Categories:
- Development Tools & IDEs
- AI/ML Tools & Platforms
- SaaS Business Solutions
- Design & Creative Software
- Security & Privacy Tools
- Productivity & Automation
- Database & Analytics Tools
- DevOps & Deployment Tools

Respond with a simple list of recommendations, one per line.`;

      const result = await this.model.generateContent(recommendationPrompt);
      const response = result.response.text();
      
      return response.split('\n').filter(line => line.trim().length > 0).slice(0, 5);
    } catch (error) {
      console.error('Product recommendation error:', error);
      return ['Browse our featured software collection', 'Check out popular developer tools', 'Explore AI/ML solutions'];
    }
  }
}