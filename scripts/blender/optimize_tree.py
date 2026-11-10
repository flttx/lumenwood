"""Blender step of docs/MESHY_PIPELINE.md for instanced trees: scale to game size, re-origin, shrink textures, add LOD1.

  blender --background --factory-startup --python scripts/blender/optimize_tree.py -- \
      <raw.glb> <out.glb> <out.blend> <asset-id> <height-m> <texture-px> <lod1-max-tris>

Output GLB (Y up, metres, origin at the trunk base) holds two meshes sharing one material: <id>_LOD0 and <id>_LOD1.
A JSON report with measured sizes is printed on the line starting with REPORT.
"""
import json
import sys

import bpy

src, dst, blend, asset_id, height, texture_px, lod1_max = sys.argv[sys.argv.index('--') + 1:]
height, texture_px, lod1_max = float(height), int(texture_px), int(lod1_max)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
if len(meshes) != 1:
    raise SystemExit(f'Expected exactly one mesh, found {len(meshes)}')
lod0 = meshes[0]
bpy.context.view_layer.objects.active = lod0
lod0.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def triangles(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


# Blender is Z up here; the exporter converts back to Y up.
verts = lod0.data.vertices
z_min = min(v.co.z for v in verts)
raw_height = max(v.co.z for v in verts) - z_min
scale = height / raw_height
# Centre on the bare trunk (above the root flare, below the foliage) so instances rotate around the trunk.
trunk = [v.co for v in verts if 0.12 * raw_height <= v.co.z - z_min <= 0.2 * raw_height]
cx, cy = sum(c.x for c in trunk) / len(trunk), sum(c.y for c in trunk) / len(trunk)
for v in verts:
    v.co = ((v.co.x - cx) * scale, (v.co.y - cy) * scale, (v.co.z - z_min) * scale)
lod0.data.update()


def radius_between(low, high):
    return max((v.co.x ** 2 + v.co.y ** 2) ** 0.5 for v in verts if low <= v.co.z <= high)


report = {
    'asset': asset_id, 'scale': round(scale, 5), 'height': round(max(v.co.z for v in verts), 3),
    # Max distance from the trunk axis per height band (metres): roots, trunk, then canopy.
    'radiusByHeight': {f'{low:.1f}-{low + 0.2:.1f}': round(radius_between(low, low + 0.2), 3) for low in [i * 0.2 for i in range(int(height / 0.2))]},
    'maxRadius': round(radius_between(0, height), 3),
}

for image in bpy.data.images:
    if max(image.size) > texture_px:
        image.scale(texture_px, texture_px)
report['images'] = {image.name: list(image.size) for image in bpy.data.images if image.size[0]}

lod0.name = lod0.data.name = f'{asset_id}_LOD0'
lod1 = lod0.copy()
lod1.data = lod0.data.copy()
lod1.name = lod1.data.name = f'{asset_id}_LOD1'
bpy.context.scene.collection.objects.link(lod1)
bpy.ops.object.select_all(action='DESELECT')
bpy.context.view_layer.objects.active = lod1
lod1.select_set(True)
decimate = lod1.modifiers.new('lod1', 'DECIMATE')
decimate.ratio = lod1_max / triangles(lod0) * 0.98
bpy.ops.object.modifier_apply(modifier=decimate.name)
report['triangles'] = {'lod0': triangles(lod0), 'lod1': triangles(lod1)}
if report['triangles']['lod1'] > lod1_max:
    raise SystemExit(f"LOD1 has {report['triangles']['lod1']} triangles, over {lod1_max}")
report['materials'] = [m.name for m in bpy.data.materials if m.users]

bpy.ops.wm.save_as_mainfile(filepath=blend)
bpy.ops.export_scene.gltf(
    filepath=dst, export_format='GLB', export_yup=True, export_apply=True, export_image_format='JPEG', export_image_quality=85,
    export_tangents=False, export_animations=False, export_cameras=False, export_lights=False, export_extras=False,
)
print('REPORT ' + json.dumps(report))
