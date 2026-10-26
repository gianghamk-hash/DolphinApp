"""Blender 4.x: Create authoring structure, humanoid armature and sword mount.
DOES NOT synthesize a final character sculpt or animations.
Run inside Blender's Scripting editor.
"""
import bpy
from mathutils import Vector

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def collection(name):
    c=bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    return c

collections={n:collection(n) for n in (
    'Saber_Body','Saber_Hair','Saber_Armor','Saber_Tabard',
    'Saber_Sword','Saber_VFX_Anchors'
)}

bpy.ops.object.armature_add(enter_editmode=True, location=(0,0,0))
rig=bpy.context.object
rig.name='Saber_Armature'
data=rig.data
data.name='Saber_Skeleton'
data.edit_bones.remove(data.edit_bones[0])

bones=[
 ('root',None,(0,0,.02),(0,0,.13)),
 ('hips','root',(0,0,.14),(0,0,.27)),
 ('spine','hips',(0,0,.27),(0,0,.43)),
 ('chest','spine',(0,0,.43),(0,0,.58)),
 ('neck','chest',(0,0,.58),(0,0,.64)),
 ('head','neck',(0,0,.64),(0,0,.91)),
 ('jaw','head',(0,-.05,.70),(0,-.09,.67)),
 ('hair.front','head',(0,-.07,.92),(0,-.15,.98)),
 ('hair.back','head',(0,.08,.91),(0,.16,.85)),
 ('tabard.front','hips',(0,-.09,.25),(0,-.13,.08)),
 ('tabard.back','hips',(0,.10,.25),(0,.14,.07)),
 ('weapon_socket.R','hand.R',(0,0,0),(0,0,0))
]
# socket is resolved after hand creation
bones=bones[:-1]
for side,sign in [('L',1),('R',-1)]:
    x=.13*sign
    bones.extend([
      (f'clavicle.{side}','chest',(0,0,.54),(x,0,.54)),
      (f'upper_arm.{side}',f'clavicle.{side}',(x,0,.54),(.28*sign,0,.46)),
      (f'forearm.{side}',f'upper_arm.{side}',(.28*sign,0,.46),(.40*sign,-.025,.37)),
      (f'hand.{side}',f'forearm.{side}',(.40*sign,-.025,.37),(.46*sign,-.045,.33)),
      (f'thumb.{side}',f'hand.{side}',(.43*sign,-.08,.33),(.46*sign,-.12,.30)),
      (f'index.{side}',f'hand.{side}',(.46*sign,-.05,.33),(.52*sign,-.07,.30)),
      (f'finger.{side}',f'hand.{side}',(.46*sign,-.03,.33),(.52*sign,-.04,.29)),
      (f'thigh.{side}','hips',(.09*sign,0,.19),(.11*sign,0,.10)),
      (f'shin.{side}',f'thigh.{side}',(.11*sign,0,.10),(.11*sign,-.015,.035)),
      (f'foot.{side}',f'shin.{side}',(.11*sign,-.015,.035),(.11*sign,-.10,.025)),
      (f'toe.{side}',f'foot.{side}',(.11*sign,-.10,.025),(.11*sign,-.16,.025)),
      (f'shoulder_plate.{side}',f'clavicle.{side}',(.15*sign,0,.54),(.26*sign,0,.58)),
    ])
bones.append(('weapon_socket.R','hand.R',(-.46,-.045,.33),(-.51,-.045,.29)))
for name,parent,head,tail in bones:
    b=data.edit_bones.new(name)
    b.head=head;b.tail=tail
    if parent:b.parent=data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
rig.show_in_front=True
# Export-compatible bone child; content artists replace this locator with sword model
empty=bpy.data.objects.new('Saber_EnergySword__REPLACE_WITH_SCULPT',None)
collections['Saber_Sword'].objects.link(empty)
empty.parent=rig
empty.parent_type='BONE'
empty.parent_bone='weapon_socket.R'
empty.empty_display_type='ARROWS'
empty.empty_display_size=.1
for collection_name in ('Saber_Body','Saber_Hair','Saber_Armor','Saber_Tabard'):
    marker=bpy.data.objects.new(collection_name+'__SCULPT_REQUIRED',None)
    collections[collection_name].objects.link(marker)
    marker.empty_display_size=.05
bpy.context.scene.unit_settings.system='METRIC'
bpy.context.scene.render.fps=30
print('Saber authoring scene created. Sculpt, skin and animate before export.')
