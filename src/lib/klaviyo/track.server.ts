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
import type { Logger } from '@/lib/logger';

const KLAVIYO_EVENTS_URL = 'https://a.klaviyo.com/api/events/';
// https://developers.klaviyo.com/en/reference/api_overview#versioning
const KLAVIYO_API_REVISION = "2026-07-15";

/** Klaviyo profile identifiers. At least one of `email` or `externalId` should be set. */
export interface KlaviyoProfile {
    email?: string;
    externalId?: string;
    phoneNumber?: string;
}

export interface KlaviyoEventInput {
    /** Klaviyo metric name, e.g. "Added to Cart", "Placed Order". */
    metric: string;
    profile: KlaviyoProfile;
    /** Custom event properties (product info, order totals, etc.). */
    properties?: Record<string, unknown>;
    /** Monetary value associated with the event, if any. */
    value?: number;
    /** Dedupe key so retried actions don't double-count the event in Klaviyo. */
    uniqueId?: string;
}

/**
 * Sends a single event to the Klaviyo Events API from the server.
 *
 * This never throws — a Klaviyo outage must not fail the shopper-facing action
 * (login, add to cart, checkout) that triggered the event. Failures are logged
 * and swallowed.
 */
export async function trackKlaviyoEvent(event: KlaviyoEventInput, logger: Logger): Promise<void> {
    const apiKey = process.env.KLAVIYO_PRIVATE_API_KEY;
    if (!apiKey) {
        logger.debug('Klaviyo: KLAVIYO_PRIVATE_API_KEY not set, skipping event', { metric: event.metric });
        return;
    }

    if (!event.profile.email && !event.profile.externalId) {
        logger.warn('Klaviyo: event has no profile identifier, skipping', { metric: event.metric });
        return;
    }

    const profileAttributes: Record<string, unknown> = {};
    if (event.profile.email) profileAttributes.email = event.profile.email;
    if (event.profile.externalId) profileAttributes.external_id = event.profile.externalId;
    if (event.profile.phoneNumber) profileAttributes.phone_number = event.profile.phoneNumber;

    const body = {
        data: {
            type: 'event',
            attributes: {
                properties: event.properties ?? {},
                value: event.value,
                unique_id: event.uniqueId,
                metric: {
                    data: {
                        type: 'metric',
                        attributes: { name: event.metric },
                    },
                },
                profile: {
                    data: {
                        type: 'profile',
                        attributes: profileAttributes,
                    },
                },
            },
        },
    };

    try {
        const response = await fetch(KLAVIYO_EVENTS_URL, {
            method: 'POST',
            headers: {
                Authorization: `Klaviyo-API-Key ${apiKey}`,
                revision: KLAVIYO_API_REVISION,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.warn('Klaviyo: event request failed', {
                metric: event.metric,
                status: response.status,
                error: errorText,
            });
            return;
        }

        logger.debug('Klaviyo: event sent', { metric: event.metric });
    } catch (error) {
        logger.warn('Klaviyo: event request threw', { metric: event.metric, error });
    }
}
