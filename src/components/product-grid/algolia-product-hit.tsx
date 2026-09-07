import type { Hit } from "algoliasearch";

interface ProductRecord {
    name: string;
    image_url: string;
    price: number;
    url: string;
}

export default function AlgoliaProductHits({ hit }: { hit: Hit<ProductRecord> }) {
    return (
        <a href={hit.url} className="block border rounded p-3">
            <img src={hit.image_url} alt={hit.name} className="w-full h-40 object-cover" />
            <h3 className="mt-2 font-medium">{hit.name}</h3>
            <p className="text-gray-600">${hit.price}</p>
        </a>
    );
}