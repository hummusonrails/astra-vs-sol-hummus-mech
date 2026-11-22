# Geographic data

The games depict overlapping districts in modern Modi’in, Israel. They are real-time procedural interpretations of geographic data, not complete city models or photographic facade reconstructions.

| | Astra | Sol |
| :--- | :--- | :--- |
| Center latitude, longitude | 31.9017, 35.0062 | 31.8996, 35.0061 |
| West / south | 35.0022 / 31.8984 | 35.0017 / 31.8958 |
| East / north | 35.0102 / 31.9050 | 35.0105 / 31.9034 |
| Road/path ways | 313 | 337 |
| Building footprints | 106 | 134 |
| Mapped open-space polygons | 37 | 34 |

## Streets and buildings

Source: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), under [ODbL 1.0](../LICENSES/ODbL-1.0.txt).

- [Astra’s source query](https://api.openstreetmap.org/api/0.6/map?bbox=35.0022,31.8984,35.0102,31.9050), geometry-only source at `apps/astra/data/source.osm`, derived database at `apps/astra/src/district.json`.
- [Sol’s source query](https://api.openstreetmap.org/api/0.6/map?bbox=35.0017,31.8958,35.0105,31.9034), geometry-only source at `apps/sol/public/data/district.osm`, derived database at `apps/sol/public/data/district.json`.

The public XML copies retain coordinates, feature IDs and rendering-relevant tags. They omit editor usernames, account IDs, edit timestamps, change sets and unrelated contact metadata. All derived road coordinate sequences, footprints and open-space polygons matched the original extracts in the recorded audit. A future live source query can differ as OpenStreetMap changes.

Astra has six mapped building level counts; Sol has five usable height/level tags. Remaining heights, floor spacing, facades, balconies, road widths, planted trees, street furniture and vehicles are inferred. These do not establish survey accuracy.

## Terrain

Both apps sampled the same public Terrarium tile from Mapzen Terrain Tiles. The raw tile and generated elevation samples are included. See [terrain source credits](../LICENSES/TERRAIN.md).

The grids are interpolated. Bridges, tunnels, retaining walls and street-level grading are simplified. A real street junction may have vertical separation that is not represented here. Do not use these games for navigation or geographic measurement.

## Reuse

The map databases are offered under ODbL 1.0 and are not covered by the code’s MIT license. Preserve source attribution, license notices and the availability of the derived database. Screenshots are produced works using the data; retain the associated map and terrain credits. See [NOTICE.md](../NOTICE.md).
