"""Run from Blender with finished Saber rig and meshes.
Export intentionally fails when placeholder-only scene is provided.
"""
import bpy
from pathlib import Path
out=Path(bpy.path.abspath('//saber.glb'))
meshes=[o for o in bpy.data.objects if o.type=='MESH' and o.visible_get()]
rig=bpy.data.objects.get('Saber_Armature')
if not rig or len(meshes)<2:
    raise RuntimeError('Saber production sculpt missing: author and skin body + sword first.')
if not any(m.find_armature()==rig for m in meshes):
    raise RuntimeError('No mesh bound to Saber_Armature; skin weights required.')
actions={a.name for a in bpy.data.actions}
missing={'Idle','Walk','Attack','Cast','Death'}-actions
if missing:
    raise RuntimeError('Missing animation actions: '+', '.join(sorted(missing)))
bpy.ops.object.select_all(action='DESELECT')
for o in meshes+[rig]:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(
    filepath=str(out),export_format='GLB',use_selection=True,
    export_animations=True,export_nla_strips=True,
    export_skins=True,export_morph=True,export_apply=False,
    export_materials='EXPORT'
)
print('Exported validated preconditions to',out)
