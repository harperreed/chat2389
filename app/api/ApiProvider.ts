/**
 * API Provider for selecting and managing API clients
 */

import { ApiInterface } from './ApiInterface';
import { FirebaseApiClient } from './FirebaseApiClient';
import { MockApiClient } from './MockApiClient';
import { config } from './config';

// API client types
export type ApiType = 'firebase' | 'pocketbase' | 'flask' | 'mock';

export class ApiProvider {
  private static instance: ApiProvider;
  private apiClient: ApiInterface | null = null;
  private apiType: ApiType | null = null;
  
  private constructor() {
    // Private constructor for singleton
  }
  
  /**
   * Get the API provider instance
   */
  public static getInstance(): ApiProvider {
    if (!ApiProvider.instance) {
      ApiProvider.instance = new ApiProvider();
    }
    return ApiProvider.instance;
  }
  
  /**
   * Initialize with the specified API type
   */
  public async initialize(type: ApiType): Promise<ApiInterface> {
    // If we already have a client of this type, return it
    if (this.apiClient && this.apiType === type) {
      return this.apiClient;
    }
    
    // If we have a different client, disconnect it
    if (this.apiClient) {
      await this.apiClient.disconnect();
      this.apiClient = null;
      this.apiType = null;
    }
    
    // Create the new client
    switch (type) {
      case 'firebase':
        this.apiClient = new FirebaseApiClient(config.firebase);
        break;
      // Uncomment these when they are implemented
      // case 'pocketbase':
      //   this.apiClient = new PocketBaseApiClient(config.pocketbase);
      //   break;
      // case 'flask':
      //   this.apiClient = new FlaskApiClient(config.flask);
      //   break;
      case 'mock':
        this.apiClient = new MockApiClient();
        break;
      default:
        throw new Error(`Unknown API type: ${type}`);
    }
    
    // Connect to the API
    await this.apiClient.connect();
    this.apiType = type;
    
    return this.apiClient;
  }
  
  /**
   * Get the current API client
   */
  public getApiClient(): ApiInterface | null {
    return this.apiClient;
  }
  
  /**
   * Get the current API type
   */
  public getApiType(): ApiType | null {
    return this.apiType;
  }
}