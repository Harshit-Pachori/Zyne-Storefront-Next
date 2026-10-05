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
import { useEffect, useMemo, useRef, useState } from 'react';
import { useConfig } from '@salesforce/storefront-next-runtime/config';
import { useSite } from '@salesforce/storefront-next-runtime/site-context';
import { createAlgoliaClient } from '@/lib/algolia-client';
import { type AlgoliaProductRecord, findAlgoliaImage, resolveAlgoliaProductId } from '@/lib/product/algolia-product';

export interface AlgoliaProductSuggestion {
    name: string;
    link: string;
    type: 'product';
    image?: string;
    price?: number;
    currency?: string;
}

export interface UseAlgoliaProductSuggestionsOptions {
    query: string;
    enabled: boolean;
    limit?: number;
}

const DEFAULT_LIMIT = 5;

/**
 * Live product-suggestion source for the header's autocomplete dropdown, backed directly by
 * Algolia rather than SCAPI's `getSearchSuggestions`. Deliberately narrow in scope: this only
 * replaces the "matching products while typing" slot. Recent searches, popular searches, and
 * phrase corrections stay on `useSearchSuggestions`/SCAPI — Algolia's index has no equivalent
 * for those, and the recent-searches feature already correctly uses `sessionStorage` per
 * CLAUDE.md's cookies/sessions-not-localStorage rule, which `react-instantsearch`'s own
 * `Autocomplete` widget would violate (its `showRecent` option is `localStorage`-backed).
 *
 * Output shape matches `useTransformSearchSuggestions`'s `productSuggestions` exactly, so
 * `Suggestions`/`SuggestionsList` render it with zero changes.
 *
 * Self-contained debounce (does not hook into `SearchBar`'s SCAPI-suggestions debounce
 * timer): reacts to `query`/`enabled` directly rather than requiring an imperative `refetch()`
 * call, since a client-side Algolia search has no server round trip to coordinate through a
 * React Router fetcher.
 */
export function useAlgoliaProductSuggestions({
    query,
    enabled,
    limit = DEFAULT_LIMIT,
}: UseAlgoliaProductSuggestionsOptions): { data: AlgoliaProductSuggestion[]; isLoading: boolean } {
    const config = useConfig();
    const { currency } = useSite();
    const { appId, searchApiKey, indexName } = config.algolia;
    // Empty strings mean Algolia is unconfigured (integration inactive) — same convention as
    // the `algolia` CSP contributor and `AlgoliaSearchResults`. `SearchBar` renders globally on
    // every page, so this must no-op cleanly rather than let `algoliasearch()` throw on a
    // missing appId.
    const isAlgoliaConfigured = Boolean(appId && searchApiKey && indexName);
    const debounceMs = config.pages.search.suggestionsDebounce;
    const [data, setData] = useState<AlgoliaProductSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const requestIdRef = useRef(0);

    const client = useMemo(
        () => (isAlgoliaConfigured ? createAlgoliaClient(appId, searchApiKey) : null),
        [isAlgoliaConfigured, appId, searchApiKey]
    );

    useEffect(() => {
        if (!client || !enabled || !query.trim()) {
            setData([]);
            setIsLoading(false);
            return;
        }

        const requestId = ++requestIdRef.current;
        setIsLoading(true);

        const timer = setTimeout(() => {
            void client
                .searchSingleIndex<AlgoliaProductRecord>({
                    indexName,
                    searchParams: { query, hitsPerPage: limit },
                })
                .then((response) => {
                    // Ignore stale responses from a superseded query/keystroke.
                    if (requestId !== requestIdRef.current) return;
                    setData(
                        response.hits.map((hit) => ({
                            name: hit.name,
                            link: `/product/${resolveAlgoliaProductId(hit)}`,
                            type: 'product',
                            image: findAlgoliaImage(hit.image_groups, 'large') ?? findAlgoliaImage(hit.image_groups, 'small'),
                            price: hit.variants?.[0]?.price?.[currency],
                            currency,
                        }))
                    );
                    setIsLoading(false);
                })
                .catch(() => {
                    if (requestId !== requestIdRef.current) return;
                    setData([]);
                    setIsLoading(false);
                });
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [client, indexName, currency, debounceMs, enabled, limit, query]);

    return { data, isLoading };
}
