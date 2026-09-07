/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { CspContributor, CspContribution } from '@salesforce/storefront-next-runtime/security';

type AlgoliaCspConfig = { appId?: string } | undefined;

/** The trimmed appId when configured, else null (inactive). */
const activeAppId = (config: AlgoliaCspConfig): string | null => {
    const appId = config?.appId?.trim().toLowerCase();
    return appId ? appId : null;
};

/**
 * Algolia's JS client queries the per-application `{appId}-dsn.algolia.net` host, falling
 * back to `{appId}-1/2/3.algolianet.com` on retry. The runtime CSP validator rejects
 * wildcard origins (`https://*.algolia.net`), so we emit the exact hosts derived from
 * `appId` rather than a wildcard.
 */
const algoliaOrigins = (appId: string): string[] => [
    `https://${appId}-dsn.algolia.net`,
    `https://${appId}-1.algolianet.com`,
    `https://${appId}-2.algolianet.com`,
    `https://${appId}-3.algolianet.com`,
    // Fixed host (not appId-scoped) that search-insights.js posts click/conversion events to.
    'https://insights.algolia.io',
];

/**
 * CSP contributor for the Algolia InstantSearch widget: `connect-src` for the search API
 * calls and `script-src` for the `search-insights` beacon it lazy-loads from jsDelivr for
 * click/conversion tracking. Contributes nothing when Algolia is unconfigured.
 */
export function createAlgoliaCspContributor(config: AlgoliaCspConfig): CspContributor {
    return {
        id: 'algolia',
        isActive: () => activeAppId(config) !== null,
        contribute: (): CspContribution => {
            const appId = activeAppId(config);
            if (!appId) return {};
            return {
                'connect-src': algoliaOrigins(appId),
                'script-src': ['https://cdn.jsdelivr.net'],
            };
        },
    };
}
