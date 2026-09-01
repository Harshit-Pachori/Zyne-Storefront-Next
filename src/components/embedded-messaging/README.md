# Embedded Messaging (Salesforce MIAW)

Native Salesforce Embedded Messaging ("Messaging for In-App and Web") integration. Free alternative to `src/components/cimulate/` — no third-party vendor script required, just Salesforce's own bootstrap script from a "Web" channel Embedded Service Deployment. The widget chunk is deferred via `requestIdleCallback` so it does not block hydration.

## Salesforce setup (one-time)

1. **Setup → Embedded Service Deployments → New Deployment → Enhanced (Messaging)**. Channel type must be **Web** (or **Mobile**), not **Custom Client** — Custom Client only gives API credentials with no widget UI.
2. Web/Mobile channels require **Digital Experiences** enabled on the org first (Setup → Digital Experiences → Settings). This is generally a one-way org setting — confirm before enabling on a production org.
3. Finish the deployment wizard (routing, fallback queue, message channel, Messaging Session custom fields, etc.).
4. On the deployment's generated snippet page, copy the **bootstrap script** block — it looks like:
   ```html
   <script src="https://<org>.my.site.com/<ESWDeployment>/assets/js/bootstrap.min.js" onload="initEmbeddedMessaging()"></script>
   ```
   Pull these four values out of it: `orgId`, `esDeveloperName` (the deployment developer name), `siteUrl` (the base URL hosting the deployment, same origin as the script), `scrt2Url` (from the `init()` call's `scrt2URL` option).

## Configuration

Set in `config.server.ts` under `app.embeddedMessaging`, or override per-environment via `PUBLIC__app__embeddedMessaging` as a JSON string:

```json
{
  "enabled": true,
  "orgId": "00Dxx0000000001",
  "esDeveloperName": "Customer_Support_Service",
  "siteUrl": "https://your-org.my.site.com/ESWCustomerSupportServi123",
  "scrt2Url": "https://your-org.my.salesforce-scrt.com",
  "bootstrapScriptUrl": "https://your-org.my.site.com/ESWCustomerSupportServi123/assets/js/bootstrap.min.js",
  "language": "en_US"
}
```

`bootstrapScriptUrl` and `siteUrl` must be same-origin — `validateEmbeddedMessagingConfig` rejects the config otherwise (sanity check against a mismatched deployment).

## Session context (hidden pre-chat fields)

`root.tsx` passes a `hiddenFields` map (SiteId, UserLocale, Currency, UsId, BasketId, DomainURL) into `<EmbeddedMessagingAgent>`. These are set via `embeddedservice_bootstrap.prechatAPI.setHiddenPrechatFields()` once the `onEmbeddedMessagingReady` event fires, and land on the Messaging Session record via the **hidden pre-chat field mapping** configured on the deployment (Setup → your deployment → Customize → pre-chat). Add/remove fields to match whatever custom Messaging Session attributes were created for this org (CsrfToken, QueryFacets, additionalRefinements, isCartMgntSupported, etc.) — wire additional live values into the `hiddenFields` object in `root.tsx` as needed.

Note: field names like `SfraAuthToken`/`RefreshToken` from a classic-SFRA-oriented setup guide don't map 1:1 to this headless app's SLAS-based auth — there is no server-rendered SFRA session token here. Map the *concept* (proof of the shopper's active session) rather than the literal field name if such a field exists on the Messaging Session object.

## Usage

- **Root layout** — `<EmbeddedMessagingAgent>` mounts when `appConfig.embeddedMessaging?.enabled` is truthy and config validates. No extra wiring needed.
- **Open the widget programmatically** — `openEmbeddedMessaging()` from `@/components/embedded-messaging`.

## Security

CSP origins (script/connect/frame/img/style/font-src) are contributed dynamically via `src/middlewares/csp-contributors/embedded-messaging.ts`, derived from `siteUrl`/`bootstrapScriptUrl`/`scrt2Url` — no wildcard trusted-domain list, since (unlike Cimulate) the origin is the merchant's own Salesforce org domain.
