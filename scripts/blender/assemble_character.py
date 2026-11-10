"""Blender step of docs/ANIMATION_PIPELINE.md: merge a Meshy-rigged character and its animation GLBs into one game GLB.

  blender --background --factory-startup --python scripts/blender/assemble_character.py -- \
      <rigged.glb> <out.glb> <out.blend> <texture-px> <max-tris> <clip>=<anim.glb> [<clip>=<anim.glb> ...]

Each animation GLB carries the same armature; its single action is renamed to <clip> and kept on the rigged armature as an
NLA track, so the exported GLB has one skinned mesh and one animation per clip. Horizontal root (hip) motion is removed so the
game drives movement; the hip's start/end offset is reported. A JSON report is printed on the line starting with REPORT.
"""
import json
import sys

import bpy

src, dst, blend, texture_px, max_tris, *clips = sys.argv[sys.argv.index('--') + 1:]
texture_px, max_tris = int(texture_px), int(max_tris)
clips = [c.split('=', 1) for c in clips]

bpy.ops.wm.read_factory_settings(use_empty=True)


def import_glb(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before]


rig_objects = import_glb(src)
armature = next(o for o in rig_objects if o.type == 'ARMATURE')
# Only skinned meshes; the importer also adds an unexported Icosphere for bone display.
meshes = [o for o in rig_objects if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers)]
if len(meshes) != 1:
    raise SystemExit(f'Expected one skinned mesh, found {len(meshes)}')
# Drop the rig's own one-frame bind clip and the NLA track the importer made for it.
if armature.animation_data:
    for track in list(armature.animation_data.nla_tracks):
        armature.animation_data.nla_tracks.remove(track)
for action in list(bpy.data.actions):
    bpy.data.actions.remove(action)

ROOT = 'Hips'


def action_fcurves(action):
    """Blender 5 actions are layered: F-curves live in per-slot channel bags."""
    return [fc for layer in action.layers for strip in layer.strips for bag in strip.channelbags for fc in bag.fcurves]


report = {'bones': len(armature.data.bones), 'clips': {}}
for name, path in clips:
    before = set(bpy.data.actions)
    imported = import_glb(path)
    actions = [a for a in bpy.data.actions if a not in before]
    if len(actions) != 1:
        raise SystemExit(f'{path}: expected one action, found {len(actions)}')
    action = actions[0]
    action.name = name
    action.use_fake_user = True
    for obj in imported:
        bpy.data.objects.remove(obj, do_unlink=True)
    # Strip horizontal hip travel (bone-local X and Z here; Y is up in the source rig), keep vertical bob.
    travel = {}
    for fcurve in action_fcurves(action):
        if fcurve.data_path == f'pose.bones["{ROOT}"].location' and fcurve.array_index in (0, 2):
            values = [k.co[1] for k in fcurve.keyframe_points]
            travel['xz'[fcurve.array_index // 2]] = round(values[-1] - values[0], 3)
            first = values[0]
            for key in fcurve.keyframe_points:
                key.co[1] = first
                key.handle_left[1] = key.handle_right[1] = first
    frames = action.frame_range
    report['clips'][name] = {'frames': [round(frames[0]), round(frames[1])], 'hipTravelRemoved': travel}
    track = armature.animation_data_create().nla_tracks.new()
    track.name = name
    strip = track.strips.new(name, int(frames[0]), action)
    strip.action_slot = action.slots[0]
armature.animation_data.action = None

for image in bpy.data.images:
    if max(image.size) > texture_px:
        image.scale(texture_px, texture_px)
report['images'] = {image.name: list(image.size) for image in bpy.data.images if image.size[0]}
mesh = meshes[0]


def triangles():
    return sum(len(p.vertices) - 2 for p in mesh.data.polygons)


# Decimate keeps vertex groups, so skin weights survive the reduction.
report['trianglesRaw'] = triangles()
if report['trianglesRaw'] > max_tris:
    bpy.context.view_layer.objects.active = mesh
    decimate = mesh.modifiers.new('budget', 'DECIMATE')
    decimate.ratio = max_tris / report['trianglesRaw'] * 0.98
    # Apply before the Armature modifier, or the current pose would be baked into the rest mesh.
    bpy.ops.object.modifier_move_to_index(modifier=decimate.name, index=0)
    bpy.ops.object.modifier_apply(modifier=decimate.name)
report['triangles'] = triangles()
if report['triangles'] > max_tris:
    raise SystemExit(f"{report['triangles']} triangles, over {max_tris}")
mesh.name = mesh.data.name = 'CHR-001'

bpy.ops.wm.save_as_mainfile(filepath=blend)
bpy.ops.export_scene.gltf(
    filepath=dst, export_format='GLB', export_yup=True, export_image_format='JPEG', export_image_quality=85,
    export_animations=True, export_animation_mode='NLA_TRACKS', export_tangents=False, export_cameras=False, export_lights=False,
    export_extras=False,
)
print('REPORT ' + json.dumps(report))
