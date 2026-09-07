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
import {
    InstantSearch,
    Configure,
    Hits,
    RefinementList,
    Pagination,
    useStats,
    useInstantSearch,
} from 'react-instantsearch';
import { useConfig } from '@salesforce/storefront-next-runtime/config';
import { useTranslation } from 'react-i18next';
import { useMemo, useRef } from 'react';
import { createAlgoliaClient } from '@/lib/algolia-client';
import AlgoliaProductHits, {
    AlgoliaProductHitSkeleton,
} from '@/components/product-grid/algolia-product-hit';

const HITS_GRID_CLASS_NAMES = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-8';
const SKELETON_COUNT = 8;

const PAGINATION_CLASS_NAMES = {
    root: 'mt-10 mb-4 flex justify-center',
    list: 'flex items-center gap-1',
    item: 'flex',
    link: 'flex size-9 items-center justify-center rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer',
    selectedItem: '[&>a]:border [&>a]:border-input [&>a]:bg-background [&>a]:hover:bg-background',
    disabledItem: 'opacity-50 pointer-events-none',
    previousPageItem: '[&>a]:px-2.5 [&>a]:w-auto [&>a]:gap-1',
    nextPageItem: '[&>a]:px-2.5 [&>a]:w-auto [&>a]:gap-1',
};

/** Results heading — mirrors `_app.search.tsx`'s `{searchTerm} ({total})` heading pattern. */
function ResultsHeading({ query }: { query: string }) {
    const { t } = useTranslation('search');
    const { nbHits } = useStats();

    return (
        <div className="mb-8">
            <p>{t('results', { defaultValue: 'Results' })}</p>
            <h1 className="text-3xl font-bold leading-none tracking-[-0.75px] text-card-foreground">
                {query} ({nbHits})
            </h1>
        </div>
    );
}

function NoResults() {
    const { t } = useTranslation('common');
    return (
        <div className="col-span-full text-center py-12">
            <p className="text-sm text-muted-foreground">{t('noProductsFound')}</p>
        </div>
    );
}

/**
 * Hits grid. Shows the skeleton only until the FIRST response ever settles, then always renders
 * `<Hits>`/`<Pagination>` from then on — including while later refinements are `loading`/
 * `stalled` (Hits just updates its own contents in place once the new response arrives).
 *
 * Earlier this swapped between a skeleton `<div>` and `<Hits>` on every `loading`/`stalled`
 * transition, which unmounts and remounts the `<Hits>` widget itself on every refinement.
 * Unmounting an active react-instantsearch widget deregisters it from the underlying
 * instantsearch.js instance and remounting re-registers it, and toggling a `RefinementList`
 * checkbox down to zero selected values causes an unusually long `stalled` window (recomputing
 * facet counts/ordering) — the combination produced a mount/unmount/re-register feedback loop
 * that froze the tab. Keeping the widgets permanently mounted after their first render avoids it.
 *
 * `nbHits` (from `useStats`) is checked only once `hasSettledOnce` is true, since it reads 0 both
 * before the first response arrives and after a genuine zero-result search.
 */
function ResultsGrid() {
    const { status } = useInstantSearch();
    const { nbHits } = useStats();
    const hasSettledOnce = useRef(false);
    if (status === 'idle') {
        hasSettledOnce.current = true;
    }

    if (!hasSettledOnce.current) {
        return (
            <div className={HITS_GRID_CLASS_NAMES}>
                {Array.from({ length: SKELETON_COUNT }, (_, index) => (
                    <AlgoliaProductHitSkeleton key={index} />
                ))}
            </div>
        );
    }

    return (
        <>
            {nbHits === 0 && <NoResults />}
            <Hits
                hitComponent={AlgoliaProductHits}
                classNames={{ list: HITS_GRID_CLASS_NAMES, item: 'contents' }}
            />
            <Pagination showFirst={false} showLast={false} classNames={PAGINATION_CLASS_NAMES} />
        </>
    );
}

export default function AlgoliaSearchResults({ initialQuery = '' }: { initialQuery?: string }) {
    const config = useConfig();
    const searchClient = useMemo(
        () => createAlgoliaClient(config.algolia.appId, config.algolia.searchApiKey),
        [config.algolia.appId, config.algolia.searchApiKey]
    );

    return (
        <InstantSearch searchClient={searchClient} indexName={config.algolia.indexName}>
            {/* No on-page SearchBox widget (query is entered once via the header search bar and
                landed on via the URL), so nothing else owns the `query` UI state — Configure sets
                it as a raw Algolia search parameter instead. */}
            <Configure query={initialQuery} />
            <ResultsHeading query={initialQuery} />
            <div className="flex flex-col lg:flex-row gap-8">
                <aside className="w-full lg:w-64 lg:flex-shrink-0">
                    <RefinementList attribute="categories" />
                    <RefinementList attribute="brand" />
                </aside>
                <div className="flex-grow">
                    <ResultsGrid />
                </div>
            </div>
        </InstantSearch>
    );
}
