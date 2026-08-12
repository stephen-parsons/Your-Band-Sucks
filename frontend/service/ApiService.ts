import Constants from "expo-constants";

export const SERVER_URL = Constants.expoConfig?.extra?.["apiUrl"];

export abstract class ApiService {
  protected readonly apiClient: typeof fetch;

  constructor(apiClient: typeof fetch) {
    this.apiClient = apiClient;
  }

  protected async fetch<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const response = await this.apiClient(`${SERVER_URL}${path}`, options);
    return (await response.json()) as T;
  }
}
