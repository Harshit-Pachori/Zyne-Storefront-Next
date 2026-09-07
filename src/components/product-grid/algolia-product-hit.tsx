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
import type { Hit } from 'algoliasearch';
import { useConfig } from '@salesforce/storefront-next-runtime/config';
import { useSite } from '@salesforce/storefront-next-runtime/site-context';
import { Link } from '@/components/link';
import { DynamicImage } from '@/components/dynamic-image';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { routes, routeHref } from '@/route-paths';

const HIT_IMAGE_WIDTHS = [200, 400];

/** Loading placeholder mirroring `AlgoliaProductHits`' layout, shown while a search is in flight. */
export function AlgoliaProductHitSkeleton() {
    return (
        <Card className="product-card w-full min-w-0 max-w-full overflow-hidden gap-0 py-0">
            <Skeleton className="aspect-square w-full" />
            <div className="p-4">
                <Skeleton className="h-4 w-12 mb-2" />
                <Skeleton className="h-5 w-full mb-1" />
                <Skeleton className="h-5 w-2/3 mb-2" />
                <Skeleton className="h-5 w-16" />
            </div>
        </Card>
    );
}

/**
 * Shape of a product record as indexed by the SFCC Algolia connector (bm_algolia /
 * int_algolia cartridges) — confirmed against a live query against
 * `zyne_002_dx__RefArch__products__en_US`. Prices live per-variant, not at the top level;
 * images are grouped by `view_type`. Doesn't carry the full SCAPI `ProductSearchHit` shape
 * (variation attributes, badges, ratings, inventory), so this tile mirrors `ProductTile`'s
 * visual language rather than reusing it — reusing it would wire Quick Add/wishlist to data
 * that isn't there.
 *
 * `objectID` is Algolia's own key, NOT a real SCAPI product id for variation groups — it's a
 * `<masterId>-<colorCode>`-style composite the connector invents, and no `master`/`masterId`
 * field is indexed to recover the real master id from it. `fetchProductById` 404s on it.
 * `variants[].variantID` / `defaultVariantID`, however, ARE real SCAPI variant product ids
 * (same id shape used by `?pid=` on the home/PLP tiles) and resolve directly with no `pid`
 * needed. Standalone (non-variation) products have null variantID/defaultVariantID and use
 * `objectID` as their real id.
 */
interface ProductRecord {
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

function findImage(imageGroups: ProductRecord['image_groups'], viewType: string): string | undefined {
    return imageGroups?.find((group) => group.view_type === viewType)?.images[0]?.dis_base_link;
}

export default function AlgoliaProductHits({ hit }: { hit: Hit<ProductRecord> }) {
    const config = useConfig();
    const { currency } = useSite();
    const imageUrl = findImage(hit.image_groups, 'large') ?? findImage(hit.image_groups, 'small');
    const price = hit.variants?.[0]?.price?.[currency];
    const productId = hit.variants?.[0]?.variantID ?? hit.defaultVariantID ?? hit.objectID;
    const productUrl = routeHref(routes.product, { productId });

    return (
        <Card className="product-card group w-full min-w-0 max-w-full cursor-pointer overflow-hidden gap-0 py-0">
            <div className="product-image relative">
                <div className="relative w-full aspect-square overflow-hidden">
                    {imageUrl ? (
                        <DynamicImage
                            src={imageUrl}
                            alt={hit.name}
                            className="w-full h-full"
                            imageProps={{ className: 'w-full h-full object-cover' }}
                            widths={HIT_IMAGE_WIDTHS}
                        />
                    ) : (
                        <div className="w-full h-full bg-muted" />
                    )}
                    <Link to={productUrl} className="absolute inset-0 z-[1] cursor-pointer" aria-hidden="true" tabIndex={-1} />
                    {/* Hover overlay — subtle dark tint, matching ProductTile */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-opacity duration-300 pointer-events-none" />
                </div>
            </div>
            <div className="relative p-4">
                <p className="text-sm font-normal leading-normal text-muted-foreground mb-1">
                    {config.global.branding.name}
                </p>
                <h3 className="text-lg font-semibold leading-[120%] tracking-[-0.45px] text-card-foreground mb-2">
                    <Link
                        to={productUrl}
                        className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1">
                        {hit.name}
                    </Link>
                </h3>
                {price !== undefined && (
                    <p className="text-lg font-semibold leading-[120%] tracking-[-0.45px] text-card-foreground">
                        {new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(price)}
                    </p>
                )}
            </div>
        </Card>
    );
}
