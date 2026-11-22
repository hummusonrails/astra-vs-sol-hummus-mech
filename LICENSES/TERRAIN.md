# Terrain attribution

Terrain data comes from [Mapzen Terrain Tiles](https://registry.opendata.aws/terrain-tiles/), distributed through the AWS Open Data Registry.

SRTM and GMTED2010 terrain data courtesy of the U.S. Geological Survey. Preserve applicable source credits. The tiles combine datasets; consult the provider’s [source-specific attribution](https://github.com/tilezen/joerd/blob/master/docs/attribution.md) before reusing a different geographic region.

Both apps use this Terrarium tile:

```text
https://s3.amazonaws.com/elevation-tiles-prod/terrarium/13/4892/3329.png
```

Original tile files: `apps/astra/data/terrain.png` and `apps/sol/data/dem.png`. Derived samples: `apps/astra/src/elevation.json` and the `terrain` field in `apps/sol/public/data/district.json`. Elevation data and source tiles are excluded from the repository’s MIT code license; retain the underlying provider terms and attribution.
