# MIS identity runtime

The Management Information System uses one stable internal user ID and keeps authentication identities, organizational assignments, permissions and sessions separate. The `local` provider is enabled initially. `microsoft_entra`, `odoo_federation`, `enterprise_oidc` and `enterprise_saml` are registered but disabled.

## First start

For a controlled first start, set these environment variables only while the identity database is initialized:

```bash
MIS_BOOTSTRAP_ADMIN_USER_ID=USR-RM-001
MIS_BOOTSTRAP_PASSWORD='a unique temporary password'
MIS_IDENTITY_ENCRYPTION_KEY='32 bytes encoded as base64 or 64 hexadecimal characters'
pnpm start
```

Remove `MIS_BOOTSTRAP_PASSWORD` after initialization. The temporary password must be changed at first sign-in. If no bootstrap password is supplied outside production, the development runtime generates one and writes it with mode `0600` to `.local/mis-identity/bootstrap-credentials.txt`. No default password is stored in source.

The default database is `.local/mis-identity/<data-mode>.sqlite`. Set `MIS_IDENTITY_DB_PATH` to an approved persistent volume in deployment. SQL migrations under `dev/identity/migrations` are applied transactionally and recorded in `schema_migrations`.

## Security controls

- Passwords use Node's scrypt implementation with per-password random salts.
- Browser cookies contain opaque session tokens only. The database stores token hashes and supports idle expiry, absolute expiry and revocation.
- State-changing authentication and administration requests require same-origin CSRF tokens.
- Login attempts are throttled by a hashed username and network-address bucket.
- Privileged user administration requires verified TOTP MFA.
- Staff suspension and password recovery revoke active sessions.
- Sensitive authentication, lifecycle, assignment and permission events are recorded in `audit_events` without raw passwords, session tokens or network addresses.

Back up the identity database and encryption key through the approved disaster-recovery process. Losing the encryption key prevents recovery of enrolled TOTP factors.

## Future identity providers

Microsoft Entra must use an approved OpenID Connect library with validated issuer, audience, tenant, state, nonce and PKCE. External subjects must be explicitly linked to an existing internal user by an authorized administrator. Matching email or display name is never sufficient.

Odoo financial imports remain independent of authentication. Confirm the deployed Odoo version and its supported identity capabilities before implementing federation. Staff synchronization is not single sign-on and MIS must never store or reuse Odoo passwords.

No external provider should be enabled until its configuration, account-linking policy, group mapping, deactivation behavior and end-to-end security checks are approved.
