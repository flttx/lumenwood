"""Blender step of docs/MESHY_PIPELINE.md for single static assets: scale to game height, origin at bottom centre,
shrink textures, cap the triangle count.

  blender --background --factory-startup --python scripts/blender/optimize_static.py -- \
      <raw.glb> <out.glb> <out.blend> <asset-id> <height-m> <texture-px> <max-tris>

Output GLB (Y up, metres) holds one mesh named <asset-id>. A JSON report is printed on the line starting with REPORT.
"""
import json
import sys

import bpy

src, dst, blend, asset_id, height, texture_px, max_tris = sys.argv[sys.argv.index('--') + 1:]
height, texture_px, max_tris = float(height), int(texture_px), int(max_tris)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
if len(meshes) != 1:
    raise SystemExit(f'Expected exactly one mesh, found {len(meshes)}')
obj = meshes[0]
bpy.context.view_layer.objects.active = obj
obj.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def triangles():
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


# Blender is Z up here; the exporter converts back to Y up.
verts = obj.data.vertices
xs, ys, zs = ([v.co[i] for v in verts] for i in range(3))
scale = height / (max(zs) - min(zs))
cx, cy, z_min = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, min(zs)
for v in verts:
    v.co = ((v.co.x - cx) * scale, (v.co.y - cy) * scale, (v.co.z - z_min) * scale)
obj.data.update()

report = {'asset': asset_id, 'scale': round(scale, 5), 'trianglesRaw': triangles()}
if report['trianglesRaw'] > max_tris:
    decimate = obj.modifiers.new('budget', 'DECIMATE')
    decimate.ratio = max_tris / report['trianglesRaw'] * 0.98
    bpy.ops.object.modifier_apply(modifier=decimate.name)
report['triangles'] = triangles()
if report['triangles'] > max_tris:
    raise SystemExit(f"{report['triangles']} triangles, over {max_tris}")
# Ground-plane footprint and height in game axes (x, height, z), metres.
report['size'] = [round((max(xs) - min(xs)) * scale, 3), round(height, 3), round((max(ys) - min(ys)) * scale, 3)]

for image in bpy.data.images:
    if max(image.size) > texture_px:
        image.scale(texture_px, texture_px)
report['images'] = {image.name: list(image.size) for image in bpy.data.images if image.size[0]}
obj.name = obj.data.name = asset_id
report['materials'] = [m.name for m in bpy.data.materials if m.users]

bpy.ops.wm.save_as_mainfile(filepath=blend)
bpy.ops.export_scene.gltf(
    filepath=dst, export_format='GLB', export_yup=True, export_apply=True, export_image_format='JPEG', export_image_quality=85,
    export_tangents=False, export_animations=False, export_cameras=False, export_lights=False, export_extras=False,
)
print('REPORT ' + json.dumps(report))
