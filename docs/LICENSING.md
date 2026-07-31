# Licensing

Greenlight uses a **source-available** model, not an OSI-approved open source
license for the current community edition.

This document is informational and **not legal advice**. Have a lawyer review
the [LICENSE](../LICENSE) before you rely on it commercially.

## Editions

| Edition    | Location | License     | What you get |
| ---------- | -------- | ----------- | ------------ |
| Community  | `core/`, `ui/`, `docs-site/` (this repo) | [BUSL-1.1](../LICENSE) | Full self-host product for community features |
| Enterprise | Commercial license (contact Licensor) | Proprietary | Audit log, multi-user admin, RBAC, SSO (OIDC) |
| Cloud      | Commercial license (contact Licensor) | Proprietary | Official hosted subscription (vendor only) |

## What you may do (community / BUSL-1.1)

- Self-host Greenlight for yourself or your organization
- Modify and redistribute under BUSL-1.1 (display the license)
- Contribute patches under the same BUSL-1.1 (see [CONTRIBUTING.md](../CONTRIBUTING.md))

## What you may not do

- Offer Greenlight (or a substantially similar product) to third parties as a
  **commercial hosted, managed, or subscription service** that competes with the
  Licensor’s paid hosted offerings (see Additional Use Grant in [LICENSE](../LICENSE))
- Use or distribute proprietary enterprise software without a paid commercial agreement
- Use the Greenlight name/trademarks except as allowed by the license

## Who may sell subscriptions

| Party                                                         | Sell Greenlight as a hosted subscription |
| ------------------------------------------------------------- | ---------------------------------------- |
| Licensor (Marko Kostic / official Greenlight cloud)           | Yes                                      |
| Anyone else (with or without an enterprise self-host license) | **No** under BUSL / enterprise terms     |

Paying for an **enterprise self-host license** lets a company run Greenlight with
enterprise features **for themselves**. It does **not** allow them to resell
Greenlight Cloud to others.

## Change Date

Under BUSL-1.1, each version eventually converts to the **Change License**
(Apache License 2.0). For this distribution, the Change Date is four years from
first public publication of that version, and no earlier than **2030-07-25**.
See [NOTICE](../NOTICE).

After the Change Date, that vintage of the community edition becomes Apache-2.0.
Enterprise proprietary code is separate and does not automatically become
Apache-2.0.

## FAQ for contributors

**Is this open source?**  
No. It is source-available under BUSL-1.1 until the Change Date.

**Can I run it at work for our own agents?**  
Yes, for internal / self-hosted use under the Additional Use Grant.

**Can I start a competing “Greenlight as a Service”?**  
No, not under BUSL-1.1 while the Additional Use Grant restrictions apply.

**Where do I send community contributions?**  
`core/`, `ui/`, and `docs-site/` via pull requests. Do not expect proprietary
enterprise or SaaS work to be merged into this repository.

**Where is enterprise / cloud code?**  
Not in this repository. Enterprise and Cloud are proprietary commercial offerings.
Self-hosters use the same `greenlight` / `greenlight-ui` images with a license to
unlock enterprise features. Contact the Licensor for access.

See [Editions & admin identity](docs-site/content/getting-started/editions.mdx) and
[Community scope](COMMUNITY-SCOPE.md) for what is in this repo.

Contact the Licensor for commercial licensing.
