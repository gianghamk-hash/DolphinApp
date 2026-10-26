"""Build unique stylized chibi GLBs for H02-H30 from the working Saber rig template.
Run inside Blender: blender -b --python build_remaining_heroes.py -- H02 output.glb
Original procedural stylized figures, NOT copyrighted game character mesh.
"""
import sys, json, math, re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[4]
TEMPLATE=Path(__file__).resolve().parent/'saber'/'build_saber.py'
# ID: name, primary palette, accent RGB, archetype, hair profile, silhouette accent
HEROES={
'H02':('Alucard','Void','Assassin','daggers','swept','shards'),
'H03':('Layla','Arcane','Ranger','cannon','twintails','runes'),
'H04':('Miya','Beast','Guardian','bow','braid','antlers'),
'H05':('Eudora','Shadow','Sorcerer','staff','bob','halo'),
'H06':('Nana','Celestial','Brawler','gauntlets','bob','halo'),
'H07':('Balmond','Mech','Assassin','axes','crest','vents'),
'H08':('Clint','Void','Ranger','cannon','hat','shards'),
'H09':('Gusion','Arcane','Guardian','daggers','swept','runes'),
'H10':('Johnson','Beast','Sorcerer','staff','crest','horns'),
'H11':('Cyclops','Shadow','Brawler','gauntlets','crest','halo'),
'H12':('Roger','Celestial','Assassin','claws','swept','wings'),
'H13':('Lesley','Mech','Ranger','cannon','ponytail','vents'),
'H14':('Hayabusa','Void','Guardian','daggers','crest','shards'),
'H15':('Kagura','Arcane','Sorcerer','staff','twintails','runes'),
'H16':('Irithel','Beast','Brawler','gauntlets','braid','antlers'),
'H17':('Karina','Shadow','Assassin','daggers','bob','shards'),
'H18':('Hanabi','Celestial','Ranger','bow','ponytail','halo'),
'H19':('Ruby','Mech','Guardian','scythe','twintails','vents'),
'H20':('Rafaela','Void','Sorcerer','staff','ponytail','wings'),
'H21':('Zhask','Arcane','Brawler','gauntlets','crest','horns'),
'H22':('Zilong','Beast','Assassin','spear','swept','horns'),
'H23':('Claude','Shadow','Ranger','cannon','swept','shards'),
'H24':('Thamuz','Celestial','Guardian','axes','crest','wings'),
'H25':('Gatotkaca','Mech','Sorcerer','staff','crest','vents'),
'H26':('Valir','Void','Brawler','gauntlets','swept','halo'),
'H27':('Lunox','Arcane','Assassin','daggers','twintails','wings'),
'H28':('Kadita','Beast','Ranger','bow','braid','horns'),
'H29':('Tigreal','Shadow','Guardian','sword','crest','shards'),
'H30':('Argus','Celestial','Sorcerer','staff','swept','wings')
}
PALETTES={
'Mech':((.04,.13,.28),(.80,.86,.92),(.95,.65,.21),(.03,.65,.95)),
'Void':((.09,.03,.16),(.25,.18,.35),(.63,.28,.75),(.87,.15,.97)),
'Arcane':((.08,.12,.36),(.81,.82,.97),(.82,.59,.24),(.26,.65,1.0)),
'Beast':((.05,.24,.16),(.77,.85,.62),(.66,.46,.22),(.21,.95,.44)),
'Shadow':((.10,.06,.16),(.31,.24,.35),(.70,.28,.53),(.97,.13,.59)),
'Celestial':((.11,.17,.36),(.95,.88,.72),(.96,.72,.25),(.29,.95,.99))
}
if __name__=='__main__':
 if '--' not in sys.argv or len(sys.argv[sys.argv.index('--')+1:])!=2:
  raise SystemExit('Usage blender -b --python build_remaining_heroes.py -- H02 /out/h02.glb')
 hero_id,out=sys.argv[sys.argv.index('--')+1:]
 if hero_id not in HEROES:raise ValueError(hero_id+' is not a remaining hero; H01 stays unchanged')
 name,origin,role,weapon,hair,feature=HEROES[hero_id]
 navy,white,gold,cyan=PALETTES[origin]
 src=TEMPLATE.read_text(encoding='utf-8')
 # Generated objects, the skeleton and clip names are distinct per hero.
 src=src.replace('Saber',name)
 for tag,color in [('navy',navy),('white',white),('gold',gold),('cyan',cyan)]:
  # materials created from the exact known Saber authoring source
  anchors={
   'navy':"(.025,.055,.15)",
   'white':"(.76,.87,.96)",
   'gold':"(.80,.54,.17)",
   'cyan':"(.01,.65,.94)"
  }
  src=src.replace(anchors[tag],repr(color))
 src=src.replace("(.025,.07,.20)",repr(tuple(min(.95,v*.9+.07) for v in navy)))
 # Rename any remaining hardcoded placeholder material names, rig, mesh.
 # Face/hair silhouette: differentiated by ponytails, braids, crest, etc.
 extras=[]
 extras.append("uv('Faction_Gem',(0,-.172,.49),(.044,.018,.042),cyan,'chest')")
 if hair in ('twintails','ponytail','braid'):
  for s in ((-1,1) if hair!='ponytail' else (1,)):
   extras.append("uv('Hair_Tail_%s'%(%s),(%s,.11,.70),(.095,.095,.22),hair,'head')" %(('R' if s==-1 else 'L'),repr('R' if s==-1 else 'L'),repr(s*.22)))
 elif hair=='bob':
  extras.append("uv('Bob_Hair_Left',(-.19,.04,.79),(.10,.12,.14),hair,'head')")
  extras.append("uv('Bob_Hair_Right',(.19,.04,.79),(.10,.12,.14),hair,'head')")
 elif hair in ('crest','hat'):
  extras.append("uv('Helmet_Crown',(0,0,1.00),(.19,.16,.065),gold,'head')")
  if hair=='hat':extras.append("torus('Ranger_Brim',(0,0,.97),.24,.028,navy,'head')")
 if feature in ('horns','antlers'):
  for s in (-1,1):extras.append("cone('Nature_Horn',(s*.13,.02,.95),(s*.28,.015,1.13),.038,.006,gold,'head')")
 elif feature=='halo':
  extras.append("torus('Magic_Halo',(0,0,1.10),.22,.015,gold,'head')")
 elif feature=='wings':
  for s in (-1,1):extras.append("cone('Wing_Fin',(s*.10,.14,.50),(s*.36,.23,.65),.07,.006,white,'chest')")
 elif feature=='vents':
  for s in (-1,1):extras.append("uv('Mech_Exhaust',(s*.13,.14,.48),(.04,.055,.11),dark,'chest')")
 elif feature in ('shards','runes'):
  for s in (-1,1):extras.append("cone('Arcane_Fin',(s*.18,.11,.52),(s*.26,.14,.68),.038,.006,cyan,'chest')")
 # Replace Saber's weapon block with archetype-specific geometry and bone-attached props.
 start=src.index('# Weapon is a separate hand-bone-driven object:')
 end=src.index('# Skeletal hierarchy mirrors anatomical landmarks')
 equip=["# Unique class weapon: "+weapon]
 if weapon in ('daggers','claws','axes','gauntlets'):
  for x,label in ((-.33,'R'),(.33,'L')):
   bone='hand.'+label
   if weapon=='gauntlets':
    equip += [f"uv('Star_Gauntlet_{label}',({x},-.045,.325),(.096,.085,.083),gold,'{bone}')",
              f"uv('Glow_Fist_{label}',({x},-.11,.335),(.072,.022,.069),cyan,'{bone}')"]
   else:
    equip += [f"cone('Weapon_Grip_{label}',({x},-.04,.32),({x},-.04,.20),.025,.020,dark,'{bone}')",
              f"cone('Weapon_Blade_{label}',({x},-.04,.21),({x-.04 if x<0 else x+.04},-.05,{-0.05 if weapon=='axes' else .06}),{.095 if weapon=='axes' else .046},.005,cyan,'{bone}')"]
 elif weapon in ('staff','spear'):
  equip += ["cone('Long_Weapon_Shaft',(-.33,-.02,.35),(-.33,-.02,-.32),.022,.019,dark,'hand.R')",
            "uv('Weapon_Orb',(-.33,-.02,.55),(.078,.078,.086),cyan,'hand.R')",
            "torus('Arcane_Weapon_Ring',(-.33,-.02,.54),.095,.015,gold,'hand.R')"] if weapon=='staff' else [
            "cone('Spear_Shaft',(-.33,-.02,.35),(-.33,-.02,-.27),.022,.02,dark,'hand.R')",
            "cone('Spear_Energy_Tip',(-.33,-.02,-.27),(-.33,-.02,-.53),.075,.005,cyan,'hand.R')"]
 elif weapon in ('bow','cannon'):
  if weapon=='bow':
   equip += ["cone('Bow_Lower',(-.33,-.04,.31),(-.49,-.04,.07),.025,.012,gold,'hand.R')",
             "cone('Bow_Upper',(-.33,-.04,.31),(-.49,-.04,.57),.025,.012,gold,'hand.R')",
             "cone('Bowstring',(-.49,-.04,.07),(-.49,-.04,.57),.003,.003,cyan,'hand.R')"]
  else:
   equip += ["cone('Railgun_Barrel',(-.33,-.07,.33),(-.33,-.47,.33),.068,.053,dark,'hand.R')",
             "torus('Railgun_Muzzle',(-.33,-.47,.33),.08,.022,cyan,'hand.R', (1.5708,0,0))",
             "uv('Railgun_Core',(-.33,-.20,.33),(.083,.16,.065),white,'hand.R')"]
 elif weapon=='scythe':
  equip += ["cone('Scythe_Shaft',(-.33,-.02,.35),(-.33,-.02,-.34),.024,.022,dark,'hand.R')",
            "cone('Scythe_Crescent',(-.33,-.02,-.31),(-.61,-.02,-.44),.090,.004,cyan,'hand.R')"]
 else:
  equip += ["cone('Sword_Grip',(-.33,-.02,.31),(-.33,-.02,.10),.026,.022,dark,'hand.R')",
            "cone('Sword_Blade',(-.33,-.02,.10),(-.33,-.02,-.35),.09,.005,cyan,'hand.R')"]
 src=src[:start]+chr(10).join(equip)+chr(10)+src[end:]
 # Insert unique mesh details BEFORE skinning so their vertex groups bind to bones.
 anchor='# Skeletal hierarchy mirrors anatomical landmarks'
 src=src.replace(anchor,chr(10).join(extras)+chr(10)+anchor)
 # Existing authoring code takes first arg after '--'. Rewrite argv so GLB exports to requested path.
 sys.argv=['blender','--',out]
 exec(compile(src,str(TEMPLATE),'exec'),{'__name__':'__main__','__file__':str(TEMPLATE)})
 print('BUILT_HERO',hero_id,name,origin,role,weapon,out)
