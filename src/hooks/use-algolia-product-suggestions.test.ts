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
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAlgoliaProductSuggestions } from './use-algolia-product-suggestions';
import { createAlgoliaClient } from '@/lib/algolia-client';

const mockUseConfig = vi.fn();

vi.mock('@salesforce/storefront-next-runtime/config', () => ({
    useConfig: () => mockUseConfig(),
}));

vi.mock('@salesforce/storefront-next-runtime/site-context', () => ({
    useSite: () => ({ currency: 'USD' }),
}));

const mockSearchSingleIndex = vi.fn();

vi.mock('@/lib/algolia-client', () => ({
    createAlgoliaClient: vi.fn(() => ({ searchSingleIndex: mockSearchSingleIndex })),
}));

const mockCreateAlgoliaClient = createAlgoliaClient as unknown as ReturnType<typeof vi.fn>;

describe('useAlgoliaProductSuggestions', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mockSearchSingleIndex.mockReset();
        mockCreateAlgoliaClient.mockClear();
        mockUseConfig.mockReturnValue({
            algolia: { appId: 'test-app-id', searchApiKey: 'test-key', indexName: 'test-index' },
            pages: { search: { suggestionsDebounce: 100 } },
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('no-ops without constructing a client when Algolia is unconfigured (empty strings)', async () => {
        mockUseConfig.mockReturnValue({
            algolia: { appId: '', searchApiKey: '', indexName: '' },
            pages: { search: { suggestionsDebounce: 100 } },
        });

        const { result } = renderHook(() => useAlgoliaProductSuggestions({ query: 'bag', enabled: true }));

        await act(async () => {
            await vi.advanceTimersByTimeAsync(200);
        });

        expect(mockCreateAlgoliaClient).not.toHaveBeenCalled();
        expect(mockSearchSingleIndex).not.toHaveBeenCalled();
        expect(result.current.data).toEqual([]);
        expect(result.current.isLoading).toBe(false);
    });

    it('does not search when disabled', async () => {
        const { result } = renderHook(() => useAlgoliaProductSuggestions({ query: 'bag', enabled: false }));

        await act(async () => {
            await vi.advanceTimersByTimeAsync(200);
        });

        expect(mockSearchSingleIndex).not.toHaveBeenCalled();
        expect(result.current.data).toEqual([]);
    });

    it('does not search when query is empty', async () => {
        const { result } = renderHook(() => useAlgoliaProductSuggestions({ query: '   ', enabled: true }));

        await act(async () => {
            await vi.advanceTimersByTimeAsync(200);
        });

        expect(mockSearchSingleIndex).not.toHaveBeenCalled();
        expect(result.current.data).toEqual([]);
    });

    it('debounces then queries the configured index with the query', async () => {
        mockSearchSingleIndex.mockResolvedValue({ hits: [] });

        renderHook(() => useAlgoliaProductSuggestions({ query: 'bag', enabled: true }));

        // Not yet — still inside the debounce window.
        expect(mockSearchSingleIndex).not.toHaveBeenCalled();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(100);
        });

        expect(mockSearchSingleIndex).toHaveBeenCalledWith({
            indexName: 'test-index',
            searchParams: { query: 'bag', hitsPerPage: 5 },
        });
    });

    it('maps hits to the shape Suggestions/SuggestionsList expect, resolving the real product id', async () => {
        mockSearchSingleIndex.mockResolvedValue({
            hits: [
                {
                    objectID: '73910532M-G8E',
                    name: 'Basic Leg Trousers',
                    defaultVariantID: '883360352404M',
                    variants: [{ variantID: '883360352664M', price: { USD: 195 } }],
                    image_groups: [
                        { view_type: 'large', images: [{ dis_base_link: 'https://example.com/large.jpg' }] },
                    ],
                },
                {
                    objectID: 'womens-jewelry-bundleM',
                    name: 'Turquoise Jewelry Bundle',
                    defaultVariantID: null,
                    variants: [{ variantID: null, price: { USD: 113 } }],
                },
            ],
        });

        const { result } = renderHook(() => useAlgoliaProductSuggestions({ query: 'bag', enabled: true }));

        await act(async () => {
            await vi.advanceTimersByTimeAsync(100);
        });

        expect(result.current.data).toHaveLength(2);
        expect(result.current.data[0]).toEqual({
            name: 'Basic Leg Trousers',
            link: '/product/883360352664M',
            type: 'product',
            image: 'https://example.com/large.jpg',
            price: 195,
            currency: 'USD',
        });
        expect(result.current.data[1]).toEqual({
            name: 'Turquoise Jewelry Bundle',
            link: '/product/womens-jewelry-bundleM',
            type: 'product',
            image: undefined,
            price: 113,
            currency: 'USD',
        });
    });

    it('clears data when a search request rejects', async () => {
        mockSearchSingleIndex.mockRejectedValue(new Error('network error'));

        const { result } = renderHook(() => useAlgoliaProductSuggestions({ query: 'bag', enabled: true }));

        await act(async () => {
            await vi.advanceTimersByTimeAsync(100);
        });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.data).toEqual([]);
    });

    it('ignores a stale response superseded by a newer query', async () => {
        let resolveFirst!: (value: { hits: unknown[] }) => void;
        mockSearchSingleIndex.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    resolveFirst = resolve;
                })
        );

        const { result, rerender } = renderHook(({ query }) => useAlgoliaProductSuggestions({ query, enabled: true }), {
            initialProps: { query: 'ba' },
        });

        await act(async () => {
            await vi.advanceTimersByTimeAsync(100);
        });

        mockSearchSingleIndex.mockResolvedValueOnce({
            hits: [{ objectID: 'bag-1', name: 'Real Bag', variants: [{ price: { USD: 10 } }] }],
        });
        rerender({ query: 'bag' });

        await act(async () => {
            await vi.advanceTimersByTimeAsync(100);
        });
        expect(result.current.data).toHaveLength(1);

        // The first (now-superseded) request resolves late — must not clobber the second's result.
        act(() => {
            resolveFirst({ hits: [{ objectID: 'stale', name: 'Stale', variants: [] }] });
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(0);
        });

        expect(result.current.data).toEqual([
            {
                name: 'Real Bag',
                link: '/product/bag-1',
                type: 'product',
                image: undefined,
                price: 10,
                currency: 'USD',
            },
        ]);
    });
});
