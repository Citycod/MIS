export interface SupersetGuestTokenRequest {
  dashboardId: string;
  user: {
    username: string;
    first_name: string;
    last_name: string;
  };
  resources: Array<{
    type: "dashboard";
    id: string;
  }>;
  rls: Array<{
    dataset?: number;
    clause: string;
  }>;
}

export interface SupersetGuestTokenResponse {
  token: string;
  expiration: number;
}

export interface SupersetDashboardConfig {
  id: string; // Dashboard UUID or numeric ID
  title: string;
  metricType: "portfolio-movement" | "product-mix" | "ro-comparison" | "regional-trend";
  height?: string;
}
