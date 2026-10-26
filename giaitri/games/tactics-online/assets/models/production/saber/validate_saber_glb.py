"""Validate production GLB against basic structural requirements.
Usage: python validate_saber_glb.py path/to/h01.glb
Requires pygltflib: pip install pygltflib
"""
import sys
from pygltflib import GLTF2
if len(sys.argv)<2:raise SystemExit('Usage: python validate_saber_glb.py h01.glb')
g=GLTF2().load(sys.argv[1])
errors=[]
if not g.meshes:errors.append('Missing meshes')
if not g.skins:errors.append('Missing skinned rig')
clips={a.name for a in (g.animations or [])}
required={'Idle','Walk','Attack','Cast','Death'}
if required-clips:errors.append('Missing clips: '+str(sorted(required-clips)))
if not g.materials:errors.append('No materials')
if not any(n.name and ('Saber' in n.name or 'Armature' in n.name) for n in g.nodes):
    errors.append('No Saber or Armature nodes')
if errors:
    for e in errors:print('FAIL:',e)
    sys.exit(1)
print('PASS: mesh, skin, PBR material list, clips and nodes present')
