// 开发环境配置类型声明
export interface DevConfig {
  websocket: {
    disableRealConnection: boolean;
    mockResponseDelay: number;
    maxRetries: number;
  };
  errorHandling: {
    suppressWebsocketErrors: boolean;
    showDetailedErrors: boolean;
    autoRetry: boolean;
  };
  logging: {
    verbose: boolean;
    filterErrors: string[];
  };
}

export declare const isDevelopment: boolean;
export declare const devConfig: DevConfig;
export declare const filterDevelopmentErrors: (error: any) => boolean;
