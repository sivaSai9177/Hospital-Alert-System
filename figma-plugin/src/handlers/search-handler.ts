import { getQdrantService } from '../services/qdrant';
import { MessageType } from '../types/messages';

export class SearchHandler {
  private qdrant = getQdrantService();
  
  async handleSearch(query: string, type: string = 'all'): Promise<void> {
    try {
      let results: any[] = [];
      
      switch (type) {
        case 'all':
          results = await this.searchAll(query);
          break;
        case 'documentation':
          results = await this.searchDocumentation(query);
          break;
        case 'code':
          results = await this.searchCode(query);
          break;
        case 'pattern':
          results = await this.searchPatterns(query);
          break;
        case 'error':
          results = await this.searchErrors(query);
          break;
      }
      
      // Send results back to UI
      figma.ui.postMessage({
        type: MessageType.SEARCH_RESULTS,
        data: { results }
      });
    } catch (error) {
      console.error('Search error:', error);
      figma.ui.postMessage({
        type: MessageType.ERROR,
        data: { message: 'Search failed', error: error.message }
      });
    }
  }
  
  private async searchAll(query: string): Promise<any[]> {
    const [docs, code, patterns, errors] = await Promise.all([
      this.searchDocumentation(query, 3),
      this.searchCode(query, 3),
      this.searchPatterns(query, 2),
      this.searchErrors(query, 2)
    ]);
    
    return [...docs, ...code, ...patterns, ...errors]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }
  
  private async searchDocumentation(query: string, limit: number = 10): Promise<any[]> {
    const results = await this.qdrant.searchDocuments(query, limit);
    
    return results.map(result => ({
      id: result.id,
      type: 'documentation',
      title: result.payload.title,
      content: this.truncateContent(result.payload.content),
      path: result.payload.path,
      score: result.score,
      metadata: {
        type: result.payload.type,
        tags: result.payload.tags
      }
    }));
  }
  
  private async searchCode(query: string, limit: number = 5): Promise<any[]> {
    const results = await this.qdrant.findSimilarCode(query, limit);
    
    return results.map(result => ({
      id: result.id,
      type: 'code',
      title: result.metadata.functionName || result.metadata.fileName,
      content: this.truncateCode(result.code),
      path: result.metadata.fileName,
      score: 0.8, // Qdrant doesn't return score in findSimilarCode
      metadata: {
        language: result.language,
        description: result.metadata.description,
        tags: result.metadata.tags
      }
    }));
  }
  
  private async searchPatterns(query: string, limit: number = 3): Promise<any[]> {
    const results = await this.qdrant.suggestPatterns(query, limit);
    
    return results.map((result, index) => ({
      id: result.id,
      type: 'pattern',
      title: result.name,
      content: result.description,
      score: 0.9 - (index * 0.1), // Descending score
      metadata: {
        useCase: result.useCase,
        code: result.code,
        tags: result.tags
      }
    }));
  }
  
  private async searchErrors(query: string, limit: number = 3): Promise<any[]> {
    const results = await this.qdrant.findErrorSolution(query);
    
    return results.slice(0, limit).map((result, index) => ({
      id: result.id,
      type: 'error',
      title: result.error,
      content: result.solution,
      score: 0.85 - (index * 0.1),
      metadata: {
        context: result.context,
        tags: result.tags
      }
    }));
  }
  
  async handleOpenResult(result: any): Promise<void> {
    switch (result.type) {
      case 'documentation':
        // Open documentation in browser
        if (result.path) {
          figma.ui.postMessage({
            type: MessageType.NAVIGATE_TO_TAB,
            data: { tab: 'docs', path: result.path }
          });
        }
        break;
        
      case 'code':
        // Show code in a modal or copy to clipboard
        figma.ui.postMessage({
          type: MessageType.AGENT_MESSAGE,
          data: {
            action: 'show-code',
            code: result.metadata.code,
            language: result.metadata.language
          }
        });
        break;
        
      case 'pattern':
        // Apply pattern or show example
        figma.ui.postMessage({
          type: MessageType.AGENT_MESSAGE,
          data: {
            action: 'apply-pattern',
            pattern: result.metadata
          }
        });
        break;
        
      case 'error':
        // Show error solution
        figma.notify(`Solution: ${result.content}`, { timeout: 10000 });
        break;
    }
  }
  
  private truncateContent(content: string, maxLength: number = 150): string {
    if (content.length <= maxLength) return content;
    
    // Try to truncate at sentence boundary
    const truncated = content.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('.');
    
    if (lastPeriod > maxLength * 0.7) {
      return truncated.substring(0, lastPeriod + 1);
    }
    
    return truncated.trim() + '...';
  }
  
  private truncateCode(code: string, maxLines: number = 5): string {
    const lines = code.split('\n');
    if (lines.length <= maxLines) return code;
    
    return lines.slice(0, maxLines).join('\n') + '\n// ...';
  }
}

// Export singleton
export const searchHandler = new SearchHandler();