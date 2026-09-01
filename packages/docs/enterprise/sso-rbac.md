# SSO & RBAC

Managing access at scale requires robust authentication and authorization. Sentinel Enterprise provides first-class support for Single Sign-On (SSO) and Role-Based Access Control (RBAC).

## Single Sign-On (SSO)

Sentinel supports SAML 2.0 and OpenID Connect (OIDC), allowing seamless integration with your existing Identity Provider (IdP):
- Okta
- Microsoft Entra ID (formerly Azure AD)
- Google Workspace
- PingIdentity

### Just-in-Time (JIT) Provisioning
When a user logs in for the first time via SSO, Sentinel can automatically provision their account and assign them to the correct teams based on their SAML attributes or OIDC claims.

## Role-Based Access Control (RBAC)

Sentinel provides granular permissions at the Organization, Team, and Project levels.

### Default Roles
- **Organization Admin:** Full control over billing, SSO configuration, and global policies.
- **Security Engineer:** Can view all projects, modify security rules, and override AI assessments.
- **Developer:** Can view scan results for their assigned projects, trigger manual scans, and request false-positive reviews.
- **Auditor (Read-Only):** Can view reports and compliance data but cannot modify configurations or trigger scans.

### Custom Roles
Enterprise administrators can compose Custom Roles by mixing and matching specific API permissions to fit their exact organizational structure.
