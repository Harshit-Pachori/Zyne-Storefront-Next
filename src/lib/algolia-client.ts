import { algoliasearch } from 'algoliasearch';

export function createAlgoliaClient(appId: string, searchApiKey: string) {
    return algoliasearch(appId, searchApiKey);
}