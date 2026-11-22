"""Project the bundled OSM extract and sample the public Terrarium DEM."""
import json, math, xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BOUNDS = [35.0017, 31.8958, 35.0105, 31.9034]
LON, LAT = 35.0061, 31.8996
MX, MZ = 111320 * math.cos(math.radians(LAT)), 110870

def xy(lon, lat):
    return [round((lon-LON)*MX, 2), round((LAT-lat)*MZ, 2)]

osm = ET.parse(ROOT / "public/data/district.osm").getroot()
nodes = {el.attrib["id"]: (float(el.attrib["lon"]), float(el.attrib["lat"])) for el in osm.findall("node")}
district = {"bounds": BOUNDS, "center": [LON, LAT], "metersPerDegree": [MX, MZ], "roads": [], "buildings": [], "water": [], "greens": []}
road_kinds = "primary secondary tertiary unclassified residential service living_street pedestrian footway path cycleway steps track".split()
for way in osm.findall("way"):
    tags = {t.get("k"): t.get("v") for t in way.findall("tag")}
    refs = [n.get("ref") for n in way.findall("nd")]
    if len(refs) < 2 or any(i not in nodes for i in refs):
        continue
    points = [xy(*nodes[i]) for i in refs]
    x0,z0=xy(BOUNDS[0],BOUNDS[3])
    x1,z1=xy(BOUNDS[2],BOUNDS[1])
    if not (min(p[0] for p in points)<x1 and max(p[0] for p in points)>x0 and min(p[1] for p in points)<z1 and max(p[1] for p in points)>z0):
        continue
    if tags.get("highway") in road_kinds and tags.get("tunnel") != "yes" and not tags.get("covered") == "yes" and tags.get("area") != "yes":
        district["roads"].append([tags["highway"], tags.get("name:en",tags.get("name","")), points, tags.get("bridge") == "yes"])
    if refs[0] != refs[-1] or len(points)<4:
        continue
    points=points[:-1]
    if tags.get("building") not in (None,"no","construction"):
        try:
            height = float(tags.get("height", "").replace(" m",""))
        except ValueError:
            try:
                height = float(tags.get("building:levels", "")) * 3.05
            except ValueError:
                height = 0
        district["buildings"].append([points,height,tags.get("building","yes")])
    if tags.get("natural")=="water" or tags.get("water"):
        district["water"].append(points)
    if tags.get("leisure") in ("park","garden","playground") or tags.get("landuse") in ("grass","forest") or tags.get("natural") in ("wood","scrub"):
        district["greens"].append(points)

dem = Image.open(ROOT / "data/dem.png").convert("RGB")
def elev(lon,lat):
    u=((lon+180)/360*8192-4892)*256
    v=((1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*8192-3329)*256
    return sum((dem.getpixel((int(u)+i,int(v)+j))[0]*256+dem.getpixel((int(u)+i,int(v)+j))[1]+dem.getpixel((int(u)+i,int(v)+j))[2]/256-32768) * ((u%1) if i else (1-u%1))*((v%1) if j else (1-v%1)) for i in range(2) for j in range(2))

size=65
# The grid extends beyond the play bounds to keep the horizon continuous.
half=610
district["terrain"]={"size":size,"half":half,"values":[round(elev(LON+((x/(size-1)*2-1)*half)/MX,LAT-((z/(size-1)*2-1)*half)/MZ),1) for z in range(size) for x in range(size)]}
(ROOT / "public/data/district.json").write_text(json.dumps(district, separators=(",",":"), ensure_ascii=False))
print({k:len(district[k]) for k in ("roads","buildings","water","greens")})
print(Counter(road[1] for road in district["roads"] if road[1]))
for kind,name,points,bridge in district["roads"]:
    if name and kind in ("primary","secondary","tertiary") and not bridge:
        print(kind,name,points[0],points[len(points)//2],points[-1])
print("elevation", min(district["terrain"]["values"]), max(district["terrain"]["values"]))
