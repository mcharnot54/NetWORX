// Perplexity API integration for real-time market data
// API Key: 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

interface PerplexityResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  choices: {
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta?: {
      role?: string;
      content?: string;
    };
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface MarketDataRequest {
  city: string;
  state: string;
  data_types: ('warehouse_lease' | 'office_lease' | 'hourly_wage' | 'burdened_rate')[];
}

interface MarketDataResponse {
  city: string;
  state: string;
  warehouse_lease_rate_per_sqft?: number;
  office_lease_rate_per_sqft?: number;
  hourly_wage_rate?: number;
  fully_burdened_rate?: number;
  confidence_score: number;
  data_source: string;
  last_updated: string;
  raw_response?: string;
}

class PerplexityAPIService {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor() {
    this.apiKey = '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';
    this.baseURL = 'https://api.perplexity.ai';
    this.model = 'llama-3.1-sonar-large-128k-online';
  }

  private async makeRequest(prompt: string): Promise<PerplexityResponse> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a real estate and labor market research assistant. Provide current, accurate market data with specific numbers. Always include confidence levels and data sources.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.1,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Perplexity API request failed:', error);
      throw error;
    }
  }

  private parseMarketDataResponse(content: string, city: string, state: string): MarketDataResponse {
    // Extract numeric values from the response
    const warehouseLeaseMatch = content.match(/warehouse.*lease.*rate.*?(\d+\.?\d*)/i);
    const officeLeaseMatch = content.match(/office.*lease.*rate.*?(\d+\.?\d*)/i);
    const hourlyWageMatch = content.match(/hourly.*wage.*?(\d+\.?\d*)/i);
    const burdendedRateMatch = content.match(/(?:fully.?burdened|burdened).*rate.*?(\d+\.?\d*)/i);
    
    // Extract confidence score
    const confidenceMatch = content.match(/confidence.*?(\d+)/i);
    
    const result: MarketDataResponse = {
      city,
      state,
      confidence_score: confidenceMatch ? parseInt(confidenceMatch[1]) : 75,
      data_source: 'perplexity_api',
      last_updated: new Date().toISOString().split('T')[0],
      raw_response: content
    };

    if (warehouseLeaseMatch) {
      result.warehouse_lease_rate_per_sqft = parseFloat(warehouseLeaseMatch[1]);
    }

    if (officeLeaseMatch) {
      result.office_lease_rate_per_sqft = parseFloat(officeLeaseMatch[1]);
    }

    if (hourlyWageMatch) {
      result.hourly_wage_rate = parseFloat(hourlyWageMatch[1]);
    }

    if (burdendedRateMatch) {
      result.fully_burdened_rate = parseFloat(burdendedRateMatch[1]);
    }

    return result;
  }

  async getWarehouseLeaseRates(city: string, state: string): Promise<MarketDataResponse> {
    const prompt = `
      What are the current industrial warehouse lease rates per square foot annually in ${city}, ${state}? 
      Please provide:
      1. Average warehouse/distribution center lease rate per square foot per year in USD
      2. Range of rates (low to high)
      3. Recent market trends
      4. Confidence level in the data (percentage)
      5. Data sources used
      
      Format your response with clear numbers and include "confidence: X%" in your answer.
      Focus on Class A and Class B industrial warehouse space suitable for distribution operations.
    `;

    try {
      const response = await this.makeRequest(prompt);
      const content = response.choices[0]?.message?.content || '';
      return this.parseMarketDataResponse(content, city, state);
    } catch (error) {
      console.error(`Failed to get warehouse lease rates for ${city}, ${state}:`, error);
      throw error;
    }
  }

  async getLaborRates(city: string, state: string): Promise<MarketDataResponse> {
    const prompt = `
      What are the current warehouse and distribution center labor rates in ${city}, ${state}?
      Please provide:
      1. Average hourly wage for warehouse workers (material handlers, forklift operators, pickers/packers)
      2. Fully burdened labor rate including benefits, taxes, insurance (typically 1.3-1.4x base wage)
      3. Recent wage trends and market conditions
      4. Confidence level in the data (percentage)
      5. Data sources used
      
      Format your response with clear dollar amounts and include "confidence: X%" in your answer.
      Focus on general warehouse labor, not specialized roles.
    `;

    try {
      const response = await this.makeRequest(prompt);
      const content = response.choices[0]?.message?.content || '';
      return this.parseMarketDataResponse(content, city, state);
    } catch (error) {
      console.error(`Failed to get labor rates for ${city}, ${state}:`, error);
      throw error;
    }
  }

  async getComprehensiveMarketData(city: string, state: string): Promise<MarketDataResponse> {
    const prompt = `
      Provide comprehensive real estate and labor market data for ${city}, ${state}:
      
      WAREHOUSE/INDUSTRIAL REAL ESTATE:
      1. Average warehouse lease rate per square foot annually (Class A & B industrial)
      2. Office space lease rates (for warehouse office areas)
      
      WAREHOUSE LABOR MARKET:
      3. Average hourly wage for warehouse workers (material handlers, pickers, forklift operators)
      4. Fully burdened labor rate including benefits, taxes, workers comp (typically 1.3-1.4x base wage)
      
      MARKET CONTEXT:
      5. Current market conditions and recent trends
      6. Confidence level in the data quality (percentage)
      7. Primary data sources used
      
      Please provide specific dollar amounts and percentages. Include "confidence: X%" in your response.
      Focus on current 2024 data for logistics and distribution operations.
    `;

    try {
      const response = await this.makeRequest(prompt);
      const content = response.choices[0]?.message?.content || '';
      
      // Parse the comprehensive response
      const result = this.parseMarketDataResponse(content, city, state);
      
      // If fully burdened rate wasn't found but hourly wage was, calculate it
      if (result.hourly_wage_rate && !result.fully_burdened_rate) {
        result.fully_burdened_rate = result.hourly_wage_rate * 1.35; // 35% burden factor
      }
      
      return result;
    } catch (error) {
      console.error(`Failed to get comprehensive market data for ${city}, ${state}:`, error);
      throw error;
    }
  }

  async batchGetMarketData(locations: { city: string; state: string }[]): Promise<MarketDataResponse[]> {
    const results: MarketDataResponse[] = [];
    
    // Process locations in batches to avoid rate limiting
    const batchSize = 3;
    for (let i = 0; i < locations.length; i += batchSize) {
      const batch = locations.slice(i, i + batchSize);
      
      const batchPromises = batch.map(location => 
        this.getComprehensiveMarketData(location.city, location.state)
          .catch(error => {
            console.error(`Failed to get data for ${location.city}, ${location.state}:`, error);
            // Return fallback data on error
            return {
              city: location.city,
              state: location.state,
              warehouse_lease_rate_per_sqft: 6.0, // Fallback national average
              hourly_wage_rate: 17.0, // Fallback national average
              fully_burdened_rate: 22.95, // 35% burden
              confidence_score: 25, // Low confidence for fallback
              data_source: 'fallback_data',
              last_updated: new Date().toISOString().split('T')[0],
              raw_response: `Error fetching data: ${error}`
            };
          })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < locations.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return results;
  }

  // Validate and clean market data
  validateMarketData(data: MarketDataResponse): MarketDataResponse {
    const validated = { ...data };
    
    // Validate warehouse lease rates (reasonable range: $3-$15 per sq ft annually)
    if (validated.warehouse_lease_rate_per_sqft && 
        (validated.warehouse_lease_rate_per_sqft < 3 || validated.warehouse_lease_rate_per_sqft > 15)) {
      console.warn(`Unusual warehouse lease rate for ${data.city}, ${data.state}: $${validated.warehouse_lease_rate_per_sqft}`);
      validated.confidence_score = Math.min(validated.confidence_score, 50);
    }
    
    // Validate hourly wages (reasonable range: $12-$30 per hour)
    if (validated.hourly_wage_rate && 
        (validated.hourly_wage_rate < 12 || validated.hourly_wage_rate > 30)) {
      console.warn(`Unusual hourly wage for ${data.city}, ${data.state}: $${validated.hourly_wage_rate}`);
      validated.confidence_score = Math.min(validated.confidence_score, 50);
    }
    
    // Validate fully burdened rate vs hourly wage ratio (should be 1.2-1.5x)
    if (validated.hourly_wage_rate && validated.fully_burdened_rate) {
      const ratio = validated.fully_burdened_rate / validated.hourly_wage_rate;
      if (ratio < 1.2 || ratio > 1.5) {
        console.warn(`Unusual burden ratio for ${data.city}, ${data.state}: ${ratio.toFixed(2)}x`);
        validated.confidence_score = Math.min(validated.confidence_score, 60);
      }
    }
    
    return validated;
  }
}

// Create singleton instance
export const perplexityAPI = new PerplexityAPIService();

// Export types
export type { MarketDataRequest, MarketDataResponse };
