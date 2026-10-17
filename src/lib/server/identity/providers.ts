import "server-only";
import type { IdentityProvider } from "./types";
import { providerIsEnabled } from "./store";

export interface ExternalIdentityClaims {
  provider: Exclude<IdentityProvider, "local">;
  subject: string;
  issuer: string;
  audience: string;
  tenantId?: string;
  email?: string;
  emailVerified: boolean;
  nonceVerified: boolean;
}

export interface AuthenticationProviderAdapter {
  readonly type: IdentityProvider;
  readonly displayName: string;
  readonly protocol: "local_password" | "oidc" | "saml";
  isEnabled(): boolean;
  validateConfiguration(): void;
}

export class DisabledIdentityProviderError extends Error {
  constructor(provider: IdentityProvider) { super(`${provider} authentication is disabled until approved configuration and security validation are complete.`); }
}

class ReservedProviderAdapter implements AuthenticationProviderAdapter {
  constructor(
    public readonly type: Exclude<IdentityProvider, "local">,
    public readonly displayName: string,
    public readonly protocol: "oidc" | "saml",
  ) {}

  isEnabled(): boolean { return providerIsEnabled(this.type); }

  validateConfiguration(): void {
    if (!this.isEnabled()) throw new DisabledIdentityProviderError(this.type);
    throw new Error(`${this.displayName} requires an approved adapter using a vetted ${this.protocol.toUpperCase()} library and validated tenant configuration.`);
  }
}

const adapters: Record<IdentityProvider, AuthenticationProviderAdapter> = {
  local: {
    type: "local", displayName: "MIS staff credentials", protocol: "local_password",
    isEnabled: () => providerIsEnabled("local"),
    validateConfiguration() { if (!this.isEnabled()) throw new DisabledIdentityProviderError("local"); },
  },
  microsoft_entra: new ReservedProviderAdapter("microsoft_entra", "Microsoft Entra ID", "oidc"),
  odoo_federation: new ReservedProviderAdapter("odoo_federation", "Odoo federation", "oidc"),
  enterprise_oidc: new ReservedProviderAdapter("enterprise_oidc", "Enterprise OpenID Connect", "oidc"),
  enterprise_saml: new ReservedProviderAdapter("enterprise_saml", "Enterprise SAML", "saml"),
};

export function getAuthenticationProvider(type: IdentityProvider): AuthenticationProviderAdapter {
  return adapters[type];
}

export function validateExternalIdentityClaims(claims: ExternalIdentityClaims, expected: {
  issuer: string;
  audience: string;
  allowedTenantIds?: string[];
}): void {
  const adapter = getAuthenticationProvider(claims.provider);
  adapter.validateConfiguration();
  if (claims.issuer !== expected.issuer || claims.audience !== expected.audience) throw new Error("External issuer or audience is not approved.");
  if (!claims.nonceVerified) throw new Error("External authentication nonce verification failed.");
  if (expected.allowedTenantIds?.length && (!claims.tenantId || !expected.allowedTenantIds.includes(claims.tenantId))) throw new Error("External tenant is not approved.");
}
