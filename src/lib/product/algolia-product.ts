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

/**
 * Shape of a product record as indexed by the SFCC Algolia connector (bm_algolia /
 * int_algolia cartridges) — confirmed against a live query against
 * `zyne_002_dx__RefArch__products__en_US`. Prices live per-variant, not at the top level;
 * images are grouped by `view_type`. Shared between the search-results grid tile
 * (`algolia-product-hit.tsx`) and the header autocomplete product suggestions
 * (`use-algolia-product-suggestions.ts`) so the id/image resolution logic can't drift
 * between the two call sites.
 */
export interface AlgoliaProductRecord {
    name: string;
    defaultVariantID?: string | null;
    image_groups?: Array<{
        view_type: string;
        images: Array<{ dis_base_link: string; alt?: string }>;
    }>;
    variants?: Array<{
        variantID?: string | null;
        price?: Record<string, number>;
    }>;
}

export function findAlgoliaImage(
    imageGroups: AlgoliaProductRecord['image_groups'],
    viewType: string
): string | undefined {
    return imageGroups?.find((group) => group.view_type === viewType)?.images[0]?.dis_base_link;
}

/**
 * `objectID` is Algolia's own key, NOT a real SCAPI product id for variation groups — it's a
 * `<masterId>-<colorCode>`-style composite the connector invents, and no `master`/`masterId`
 * field is indexed to recover the real master id from it (`fetchProductById` 404s on it).
 * `variants[].variantID` / `defaultVariantID`, however, ARE real SCAPI variant product ids
 * (same id shape used by `?pid=` on the home/PLP tiles) and resolve directly with no `pid`
 * needed. Standalone (non-variation) products have null variantID/defaultVariantID and use
 * `objectID` as their real id.
 */
export function resolveAlgoliaProductId(hit: { objectID: string } & AlgoliaProductRecord): string {
    return hit.variants?.[0]?.variantID ?? hit.defaultVariantID ?? hit.objectID;
}
