import { InstantSearch, SearchBox, Hits, RefinementList, Pagination } from 'react-instantsearch';
import { useConfig } from '@salesforce/storefront-next-runtime/config'; // adjust once we confirm the real path
import { createAlgoliaClient } from '@/lib/algolia-client';
import { useMemo } from 'react';
import AlgoliaProductHits from '../product-grid/algolia-product-hit';

export default function AlgoliaSearchResults() {
    const config = useConfig();
    const searchClient = useMemo(
        () => createAlgoliaClient(config.algolia.appId, config.algolia.searchApiKey),
        [config.algolia.appId, config.algolia.searchApiKey]
    );

    return (
        <InstantSearch searchClient={searchClient} indexName={config.algolia.indexName}>
            <div className="flex gap-6">
                <aside className="w-64">
                    <RefinementList attribute="categories" />
                    <RefinementList attribute="brand" />
                </aside>
                <div className="flex-1">
                    <SearchBox placeholder="Search products..." />
                    <Hits hitComponent={AlgoliaProductHits} />
                    <Pagination />
                </div>
            </div>
        </InstantSearch>
    );
}