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
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { SeoMeta } from '@/components/seo-meta';
import AlgoliaSearchResults from '@/components/header/algolia-search';

/**
 * Algolia-powered search results page. Deliberately client-rendered: `react-instantsearch`
 * fetches directly from Algolia's API in the browser, so this route has no server `loader`
 * and the product grid is not present in the initial SSR HTML. That's an accepted exception
 * to the app's server-load-everything rule for this integration — see the Algolia
 * integration writeup for the tradeoff. Kept on its own route (rather than embedded in the
 * header) so the always-visible facet sidebar + hits grid don't take over the header layout.
 */
export default function AlgoliaSearchPage() {
    const { t } = useTranslation('search');
    const [searchParams] = useSearchParams();
    const searchTerm = searchParams.get('q') ?? '';

    return (
        <>
            <SeoMeta
                title={
                    searchTerm
                        ? t('titleWithQuery', { query: searchTerm, defaultValue: `Results for "${searchTerm}"` })
                        : t('title', { defaultValue: 'Search' })
                }
            />
            <div className="section-container py-8">
                <AlgoliaSearchResults initialQuery={searchTerm} />
            </div>
        </>
    );
}
