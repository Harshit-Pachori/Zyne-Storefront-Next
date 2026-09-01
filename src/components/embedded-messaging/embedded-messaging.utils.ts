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

import { createLogger } from '@/lib/logger';

const logger = createLogger();

const onClient = typeof window !== 'undefined';

export interface EmbeddedMessagingConfig {
    enabled: string | boolean;
    orgId: string;
    esDeveloperName: string;
    siteUrl: string;
    scrt2Url: string;
    bootstrapScriptUrl: string;
    language?: string;
}

/** Hidden pre-chat fields mapped (in the deployment's Setup > Customize page) to Messaging
 * Session custom fields — SiteId, UserLocale, UsId, Currency, BasketId, CsrfToken, DomainURL,
 * isCartMgntSupported, etc. Only include values that are actually available; omit the rest
 * rather than sending empty strings. */
export type EmbeddedMessagingHiddenFields = Record<string, string>;

export function isEmbeddedMessagingEnabled(enabled: string | boolean | undefined): boolean {
    return enabled === 'true' || enabled === true;
}

/**
 * Validates that config carries everything `embeddedservice_bootstrap.init()` requires, and
 * that the bootstrap script is served from the same site the deployment reports (same-origin
 * as `siteUrl`) — a basic sanity check against a misconfigured/mismatched deployment.
 */
export function validateEmbeddedMessagingConfig(config: unknown): config is EmbeddedMessagingConfig {
    if (!config || typeof config !== 'object') {
        logger.error('Embedded messaging configuration must be an object.');
        return false;
    }

    const c = config as Record<string, unknown>;
    const required: Record<string, unknown> = {
        orgId: c.orgId,
        esDeveloperName: c.esDeveloperName,
        siteUrl: c.siteUrl,
        scrt2Url: c.scrt2Url,
        bootstrapScriptUrl: c.bootstrapScriptUrl,
    };

    const isValid = Object.values(required).every((value) => typeof value === 'string' && value.trim() !== '');
    if (!isValid) {
        logger.error(
            'Invalid embedded messaging config. Required: orgId, esDeveloperName, siteUrl, scrt2Url, bootstrapScriptUrl.'
        );
        return false;
    }

    try {
        const scriptOrigin = new URL(c.bootstrapScriptUrl as string).origin;
        const siteOrigin = new URL(c.siteUrl as string).origin;
        if (scriptOrigin !== siteOrigin) {
            logger.error('Embedded messaging bootstrap script origin does not match the deployment site URL.', {
                scriptOrigin,
                siteOrigin,
            });
            return false;
        }
    } catch {
        logger.error('Embedded messaging siteUrl or bootstrapScriptUrl is not a valid URL.');
        return false;
    }

    return true;
}

/** Custom event to trigger the deferred bootstrap chunk load when a user interacts before idle. */
export const EMBEDDED_MESSAGING_LOAD_EVENT = 'embedded-messaging:load';

let pendingOpen = false;

/** Opens the messaging widget. Queues the request if the SDK has not finished loading yet. */
export function openEmbeddedMessaging(): void {
    if (!onClient) return;
    try {
        if (window.embeddedservice_bootstrap?.utilAPI?.launchChat) {
            window.embeddedservice_bootstrap.utilAPI.launchChat();
        } else {
            pendingOpen = true;
            window.dispatchEvent(new Event(EMBEDDED_MESSAGING_LOAD_EVENT));
        }
    } catch (error) {
        logger.error('Error opening embedded messaging widget', { error });
    }
}

/** Called once `onEmbeddedMessagingReady` fires, to flush an open request queued before then. */
export function flushPendingEmbeddedMessagingOpen(): void {
    if (pendingOpen) {
        pendingOpen = false;
        openEmbeddedMessaging();
    }
}

declare global {
    interface Window {
        embeddedservice_bootstrap?: {
            settings: Record<string, unknown>;
            init: (orgId: string, esDeveloperName: string, siteUrl: string, options?: Record<string, unknown>) => void;
            prechatAPI?: {
                setHiddenPrechatFields?: (fields: EmbeddedMessagingHiddenFields) => void;
            };
            utilAPI?: {
                launchChat?: () => void;
            };
        };
    }
}
