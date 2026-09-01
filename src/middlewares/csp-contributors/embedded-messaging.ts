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
import type { AppConfig } from '@/types/config';
import { toCspOrigin } from './to-csp-origin.js';

type EmbeddedMessagingConfig = AppConfig['embeddedMessaging'];

const isEnabled = (e: string | boolean | undefined): boolean => e === true || e === 'true';

function origins(...urls: (string | undefined)[]): string[] {
    const out: string[] = [];
    for (const u of urls) {
        const o = u ? toCspOrigin(u) : null;
        if (o && !out.includes(o)) out.push(o);
    }
    return out;
}

/**
 * CSP contributor for the native Salesforce Embedded Messaging (MIAW) widget.
 * Boot-static: derives EXACT origins from the merchant's embeddedMessaging config.
 * Inactive (contributes nothing) when disabled or unconfigured.
 */
export function createEmbeddedMessagingCspContributor(config: EmbeddedMessagingConfig): CspContributor {
    return {
        id: 'embedded-messaging',
        isActive: () => isEnabled(config?.enabled),
        contribute: (): CspContribution => {
            if (!isEnabled(config?.enabled)) return {};

            const siteOrigin = origins(config?.siteUrl, config?.bootstrapScriptUrl);
            const scrt2Origin = origins(config?.scrt2Url);
            const combined = [...new Set([...siteOrigin, ...scrt2Origin])];

            const out: CspContribution = {};
            if (siteOrigin.length) out['script-src'] = siteOrigin;
            if (combined.length) out['connect-src'] = combined;
            if (siteOrigin.length) out['img-src'] = siteOrigin;
            if (siteOrigin.length) out['style-src'] = siteOrigin;
            if (siteOrigin.length) out['font-src'] = siteOrigin;
            if (combined.length) out['frame-src'] = combined;
            return out;
        },
    };
}
