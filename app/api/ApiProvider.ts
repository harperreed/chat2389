/**
 * API Provider for selecting and managing API clients
 */

import { ApiInterface } from './ApiInterface';
import { FirebaseApiClient } from './FirebaseApiClient';
import { config } from './config';

// We only support Firebase
export type ApiType = 'firebase';

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
   * Initialize with Firebase (only supported option)
   */
  public async initialize(type: ApiType = 'firebase'): Promise<ApiInterface> {
    // If we already have a client of this type, return it
    if (this.apiClient && this.apiType === 'firebase') {
      return this.apiClient;
    }

    // If we have a different client, disconnect it
    if (this.apiClient) {
      await this.apiClient.disconnect();
      this.apiClient = null;
      this.apiType = null;
    }

    // Create the Firebase client
    this.apiClient = new FirebaseApiClient(config.firebase);

    // Connect to the API
    await this.apiClient.connect();
    this.apiType = 'firebase';

    return this.apiClient;
  }

  /**
   * Get the current API client
   */
  public getApiClient(): ApiInterface | null {
    if (!this.apiClient) {
      console.warn('[ApiProvider] No API client initialized. Call initialize() first.');
    }
    return this.apiClient;
  }

  /**
   * Get the current API type
   */
  public getApiType(): ApiType | null {
    return this.apiType;
  }
}
