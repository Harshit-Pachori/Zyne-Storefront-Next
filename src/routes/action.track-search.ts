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
import type { Route } from './+types/action.track-search';
import { getAuth } from '@/middlewares/auth.server';
import { getLogger } from '@/lib/logger.server';
import { trackKlaviyoEvent } from '@/lib/klaviyo/track.server';

/**
 * Records a "Searched Site" Klaviyo event for the Algolia search page, which fetches results
 * directly from Algolia in the browser and has no server `loader` of its own to hook into.
 * Called via `useFetcher` from `_app.search.tsx` when the query changes — the search itself
 * still runs client-side against Algolia, only the Klaviyo call (which needs the private API
 * key) happens here on the server.
 */
export async function action({ request, context }: Route.ActionArgs): Promise<{ success: boolean }> {
    const logger = getLogger(context);
    const formData = await request.formData();
    const searchTerm = formData.get('q')?.toString().trim();

    if (!searchTerm) {
        return { success: false };
    }

    const auth = getAuth(context);
    if (!auth.customerId) {
        return { success: false };
    }

    void trackKlaviyoEvent(
        { metric: 'Searched Site', profile: { externalId: auth.customerId }, properties: { searchTerm } },
        logger
    );

    return { success: true };
}
