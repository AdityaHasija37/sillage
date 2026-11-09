export declare function matchKeys(brand: string, name: string): [string, string];
export declare function matchUnverified(
  unverified: { id: string; brand: string; name: string }[],
  catalog: { externalId: string; brand: string; name: string }[],
): { fromId: string; toExternalId: string; level: 1 | 2 }[];
