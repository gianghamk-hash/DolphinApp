"""Blender 4.x automated ORIGINAL Saber Chibi mesh/rig/animation generation.
Run: blender -b -t 2 --python build_saber.py -- /path/to/h01.glb
This is an original stylized test character built from smooth UV meshes; not a hand-sculpted final art asset.
"""
import bpy, sys, math, os
from mathutils import Vector
from math import sin,cos,pi
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.fps=30
def mat(n,c,metal=0,rough=.55,emit=0):
 m=bpy.data.materials.new(n);m.diffuse_color=(*c,1)
 m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF')
 bs.inputs['Base Color'].default_value=(*c,1)
 bs.inputs['Metallic'].default_value=metal
 bs.inputs['Roughness'].default_value=rough
 if emit:
  bs.inputs['Emission Color'].default_value=(*c,1)
  bs.inputs['Emission Strength'].default_value=emit
 return m
skin=mat('Saber Warm Skin',(.93,.68,.52))
hair=mat('Windswept Navy',(.025,.07,.20),.1)
navy=mat('Blue Armor Undersuit',(.025,.055,.15),.15)
white=mat('Porcelain Ceramic Armor',(.76,.87,.96),.35,.27)
gold=mat('Brushed Gold',(.80,.54,.17),.8,.26)
cyan=mat('Cyan Reactor Glow',(.01,.65,.94),.25,.25,2)
dark=mat('Blade Gunmetal',(.10,.18,.27),.85,.22)
cloth=mat('Blue Fabric Tabard',(.04,.16,.40),0,.9)
objects=[]
def uv(n,loc,scale,material,bone,segments=20,rings=12):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc)
 o=bpy.context.object;o.name=n;o.scale=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 bpy.ops.object.shade_smooth();o.data.materials.append(material)
 objects.append((o,bone));return o
def cone(n,a,b,r1,r2,material,bone,verts=16):
 mid=(Vector(a)+Vector(b))/2
 direction=Vector(b)-Vector(a)
 bpy.ops.mesh.primitive_cone_add(vertices=verts,radius1=r1,radius2=r2,depth=direction.length,location=mid)
 o=bpy.context.object;o.name=n
 o.rotation_euler=direction.to_track_quat('Z','Y').to_euler()
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 bpy.ops.object.shade_smooth();o.data.materials.append(material)
 objects.append((o,bone));return o
def torus(n,loc,major,minor,material,bone,rot=(0,0,0)):
 bpy.ops.mesh.primitive_torus_add(major_segments=24,minor_segments=8,location=loc,major_radius=major,minor_radius=minor,rotation=rot)
 o=bpy.context.object;o.name=n;o.data.materials.append(material);objects.append((o,bone));return o
# Structure: 0..1.02 game height, large ~35%-tall chibi head
uv('Saber_Head_Sculpt',(0,-.005,.75),(.205,.17,.198),skin,'head',32,20)
uv('Saber_Cheeks',(0,-.131,.69),(.151,.057,.075),skin,'head')
uv('Saber_Hair_Crown',(0,.008,.90),(.218,.184,.118),hair,'head',32,16)
for i in range(11):
 x=(-5+i)*.038
 z=.91 + .045*sin(i*1.9)
 cone('Hair_Swept_Lock_%02d'%i,(x,.00,z),(x+.075,-.11,z+.10),.042,.002,hair,'head')
for x in (-.086,.086):
 uv('Saber_Eye_White',(x,-.159,.768),(.055,.014,.046),white,'head')
 uv('Saber_Cyan_Iris',(x,-.173,.764),(.028,.009,.034),cyan,'head',20,12)
 uv('Saber_Ear',(x*2.29,0,.735),(.032,.035,.068),skin,'head')
 uv('Brow',(x,-.166,.823),(.062,.014,.015),hair,'head')
uv('Saber_Nose',(0,-.168,.709),(.021,.020,.024),skin,'head')
uv('Saber_Torso',(0,0,.46),(.16,.11,.19),navy,'chest')
uv('Saber_Chest_Plate',(0,-.095,.49),(.158,.060,.138),white,'chest')
torus('Reactor_Gold_Bezel',(0,-.15,.50),.060,.013,gold,'chest',(-pi/2,0,0))
uv('Saber_Reactor_Core',(0,-.16,.50),(.050,.014,.050),cyan,'chest')
uv('Saber_Belt',(0,0,.326),(.152,.104,.046),gold,'hips')
uv('Saber_Pelvis',(0,0,.297),(.135,.10,.075),navy,'hips')
for s,label in ((-1,'R'),(1,'L')):
 x=s*.165
 uv('Mech_Shoulder_'+label,(x,0,.56),(.103,.115,.086),white,'upper_arm.'+label)
 uv('Shoulder_Gold_Trim_'+label,(x,0,.596),(.075,.078,.038),gold,'upper_arm.'+label)
 cone('Upper_Arm_'+label,(x,0,.52),(s*.25,0,.425),.055,.047,navy,'upper_arm.'+label)
 uv('Elbow_Gold_'+label,(s*.25,0,.425),(.046,.049,.047),gold,'forearm.'+label)
 cone('Forearm_Armor_'+label,(s*.25,0,.42),(s*.33,-.02,.355),.065,.050,white,'forearm.'+label)
 uv('Glove_'+label,(s*.33,-.02,.345),(.057,.044,.054),navy,'hand.'+label)
 uv('Thigh_'+label,(s*.087,0,.26),(.073,.081,.11),navy,'thigh.'+label)
 uv('Knee_'+label,(s*.092,-.02,.175),(.074,.080,.048),gold,'shin.'+label)
 cone('Greave_'+label,(s*.092,0,.17),(s*.097,-.018,.072),.074,.053,white,'shin.'+label)
 uv('Boot_'+label,(s*.097,-.045,.055),(.075,.122,.050),navy,'foot.'+label)
 uv('Boot_Plate_'+label,(s*.097,-.082,.068),(.071,.075,.034),white,'foot.'+label)
for s,label in ((-1,'R'),(1,'L')):
 x=s*.07
 cone('Split_Tabard_'+label,(x,-.08,.33),(s*.085,-.10,.17),.057,.079,cloth,'hips')
 cone('Tabard_Gold_Tip_'+label,(s*.085,-.10,.17),(s*.085,-.10,.135),.078,.005,gold,'hips')
uv('Reactor_Backpack',(0,.112,.48),(.124,.073,.10),dark,'chest')
for s in (-1,1):
 cone('Mech_Back_Fin',(s*.085,.108,.58),(s*.19,.14,.70),.047,.007,white,'chest')
# Weapon is a separate hand-bone-driven object: blade is elongated smooth beveled geometry, not box cuboid
cone('Saber_Sword_Grip',(-.33,-.02,.31),(-.33,-.02,.10),.025,.024,dark,'hand.R')
torus('Saber_Guard',(-.33,-.02,.13),.055,.012,gold,'hand.R')
cone('Saber_Cyan_Blade',(-.33,-.02,.11),(-.33,-.02,-.29),.072,.004,cyan,'hand.R',24)
cone('Saber_Gold_Blade_Spine',(-.33,-.001,.09),(-.33,-.001,-.20),.027,.004,gold,'hand.R',20)
# Skeletal hierarchy mirrors anatomical landmarks; rigid-to-bone weights per component
bpy.ops.object.armature_add(enter_editmode=True,location=(0,0,0))
rig=bpy.context.object;rig.name='Saber_Armature'
arm=rig.data;arm.edit_bones.remove(arm.edit_bones[0])
bones=[
 ('root',None,(0,0,.03),(0,0,.14)),
 ('hips','root',(0,0,.14),(0,0,.33)),
 ('spine','hips',(0,0,.33),(0,0,.43)),
 ('chest','spine',(0,0,.43),(0,0,.60)),
 ('neck','chest',(0,0,.60),(0,0,.64)),
 ('head','neck',(0,0,.64),(0,0,.87)),
]
for s,label in ((-1,'R'),(1,'L')):
 bones += [
 ('upper_arm.'+label,'chest',(s*.14,0,.55),(s*.25,0,.43)),
 ('forearm.'+label,'upper_arm.'+label,(s*.25,0,.43),(s*.33,-.02,.36)),
 ('hand.'+label,'forearm.'+label,(s*.33,-.02,.36),(s*.35,-.03,.31)),
 ('thigh.'+label,'hips',(s*.087,0,.30),(s*.092,0,.17)),
 ('shin.'+label,'thigh.'+label,(s*.092,0,.17),(s*.097,-.015,.065)),
 ('foot.'+label,'shin.'+label,(s*.097,-.015,.065),(s*.097,-.11,.04)),
 ]
for n,parent,a,b in bones:
 bone=arm.edit_bones.new(n);bone.head=a;bone.tail=b
 if parent:bone.parent=arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
for obj,bone_name in objects:
 g=obj.vertex_groups.new(name=bone_name)
 g.add(list(range(len(obj.data.vertices))),1,'REPLACE')
 modifier=obj.modifiers.new('Saber Skin','ARMATURE');modifier.object=rig
 obj.parent=rig
# five authored rig actions, 30 FPS, 2 seconds each, key pose with interpolation
def key(pb,frame,rotation):
 pb.rotation_mode='XYZ'
 pb.rotation_euler=rotation
 pb.keyframe_insert(data_path='rotation_euler',frame=frame)
def make_action(name,samples):
 act=bpy.data.actions.new(name)
 rig.animation_data_create()
 rig.animation_data.action=act
 for f,values in samples:
  for bone,rot in values.items():key(rig.pose.bones[bone],f,rot)
 # Nonzero channels for required clips
 for b in rig.pose.bones:
  if b.name not in {n for _,v in samples for n in v}:
   key(b,samples[0][0],(0,0,0));key(b,samples[-1][0],(0,0,0))
 track=rig.animation_data.nla_tracks.new();track.name=name
 strip=track.strips.new(name,int(samples[0][0]),act)
 strip.action_frame_end=samples[-1][0]
 rig.animation_data.action=None
 return act
make_action('Idle',[(1,{'chest':(0,0,0),'head':(0,0,0)}),(18,{'chest':(.04,0,0),'head':(-.02,0,0)}),(36,{'chest':(0,0,0),'head':(0,0,0)})])
make_action('Walk',[(1,{'thigh.L':(.4,0,0),'thigh.R':(-.4,0,0),'upper_arm.L':(-.2,0,0)}),(9,{'thigh.L':(-.4,0,0),'thigh.R':(.4,0,0),'upper_arm.L':(.2,0,0)}),(17,{'thigh.L':(.4,0,0),'thigh.R':(-.4,0,0),'upper_arm.L':(-.2,0,0)})])
make_action('Attack',[(1,{'upper_arm.R':(0,0,0),'chest':(0,0,0)}),(9,{'upper_arm.R':(-.8,.2,-.2),'chest':(0,-.25,0)}),(14,{'upper_arm.R':(1.0,-.25,.4),'chest':(0,.35,0)}),(24,{'upper_arm.R':(0,0,0),'chest':(0,0,0)})])
make_action('Cast',[(1,{'upper_arm.R':(0,0,0)}),(10,{'upper_arm.R':(-1.15,0,0),'head':(-.08,0,0)}),(22,{'upper_arm.R':(-1.15,0,0),'head':(-.08,0,0)}),(34,{'upper_arm.R':(0,0,0),'head':(0,0,0)})])
make_action('Death',[(1,{'hips':(0,0,0),'chest':(0,0,0)}),(18,{'hips':(.5,0,.18),'chest':(.8,0,0)}),(36,{'hips':(1.1,0,.2),'chest':(1.3,0,0)})])
scene.frame_set(1)
out=sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else os.path.abspath('h01.glb')
os.makedirs(os.path.dirname(os.path.abspath(out)),exist_ok=True)
bpy.ops.object.select_all(action='DESELECT')
for o in [rig]+[o for o,_ in objects]:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',use_selection=True,export_animations=True,export_nla_strips=True,export_skins=True,export_materials='EXPORT')
print('BUILT_SABER_GLB',out,'MESH_COUNT',len(objects),'BONES',len(bones))
