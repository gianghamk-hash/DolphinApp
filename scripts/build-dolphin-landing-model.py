"""Export the landing companion GLB from the hand-tuned sculpt and evolution palettes."""

import json
import math
import struct
import sys
from collections import defaultdict
from pathlib import Path

TAU = math.tau


def plus(a, b):
    return tuple(x + y for x, y in zip(a, b))


def minus(a, b):
    return tuple(x - y for x, y in zip(a, b))


def scale(v, s):
    return tuple(n * s for n in v)


def cross(a, b):
    return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])


def unit(v):
    return scale(v, 1 / (math.hypot(*v) or 1))


def rgb(hex_value):
    srgb = [int(hex_value[i:i+2], 16) / 255 for i in (0, 2, 4)]
    return [((v + .055) / 1.055) ** 2.4 if v > .04045 else v / 12.92 for v in srgb]


def curve(knots, u):
    """Interpolate cross sections through their anchors."""
    index = min(int(u), len(knots)-2)
    t = u-index
    p, a, b, q = (knots[max(0, index-1)], knots[index],
                  knots[index+1], knots[min(index+2, len(knots)-1)])
    return tuple(y + .5*t*((z-x) + t*((2*x-5*y+4*z-w) + t*(3*y-3*z+w-x)))
                 for x, y, z, w in zip(p, a, b, q))


class Surface:
    def __init__(self):
        self.points = []
        self.normals = []
        self.weights = []
        self.faces = defaultdict(list)

    def sweep(self, knots, material, binding=0, *, around=16, subdivisions=3,
              dorsal=False, belly=False):
        # Each section stores the center and the two radii of an elliptical skin.
        rings = (len(knots)-1)*subdivisions
        start = len(self.points)
        for ring in range(rings+1):
            u = ring / subdivisions
            x, y, z, width, depth = curve(knots, u)
            center = (x, y, z)
            if dorsal:
                side, normal = (0, 1, 0), (0, 0, 1)
            else:
                before = curve(knots, max(0, u-.02))[:3]
                after = curve(knots, min(len(knots)-1, u+.02))[:3]
                direction = unit(minus(after, before))
                ref = (0, 1, 0) if abs(direction[2]) > .94 else (0, 0, 1)
                side = unit(cross(ref, direction))
                normal = cross(direction, side)
            for j in range(around):
                angle = j*TAU/around
                radial = plus(scale(side, math.cos(angle)*max(.002, width)),
                              scale(normal, math.sin(angle)*max(.002, depth)))
                self.points.append(plus(center, radial))
                self.normals.append((0, 0, 0))
                self.weights.append(binding(x) if callable(binding) else (binding, 0, 1))
        for row in range(rings):
            for j in range(around):
                side = math.cos((j+.5)*TAU/around)
                color = "belly" if belly and side < -.27 else material
                a = start + row*around+j
                b = start + row*around+(j+1)%around
                self.triangle(color, a, b, a+around)
                self.triangle(color, b, b+around, a+around)
        for row, reverse in ((0, True), (rings, False)):
            base = start + row*around
            for j in range(1, around-1):
                ids = (base, base+j, base+j+1)
                self.triangle(material, *(ids[::-1] if reverse else ids))

    def triangle(self, material, a, b, c):
        self.faces[material].extend((a, b, c))
        n = cross(minus(self.points[b], self.points[a]), minus(self.points[c], self.points[a]))
        for index in (a, b, c):
            self.normals[index] = plus(self.normals[index], n)

    def ellipse(self, center, radii, material, joint=0):
        x, y, z = center
        rx, ry, rz = radii
        self.sweep([(x-rx*math.cos(a), y, z, ry*math.sin(a), rz*math.sin(a))
                    for a in (0, .31, .65, 1.1, 1.57, 2.04, 2.49, 2.83, math.pi)],
                   material, joint, around=16, subdivisions=1, dorsal=True)


def trunk_skin(x):
    if x < .12:
        return (0, 1, 1)
    if x < .70:
        t = min(1, (x-.12)/.46)
        return (0, 1, 1-t*t*(3-2*t))
    t = min(1, (x-.70)/.47)
    return (1, 2, 1-t*t*(3-2*t))


def ribbon(surface, controls, material, joint, *, plane=True):
    surface.sweep(controls, material, joint, subdivisions=3, around=10, dorsal=plane)


def base_dolphin():
    surf = Surface()
    surf.sweep([
        (-1.44,-.08,0,.015,.045),(-1.36,-.035,0,.105,.19),
        (-1.14,.052,0,.218,.265),(-.91,.215,0,.382,.345),
        (-.56,.225,0,.466,.425),(-.23,.115,0,.375,.375),
        (.14,.006,0,.27,.30),(.48,-.12,0,.19,.22),
        (.79,-.25,0,.107,.13),(1.06,-.33,0,.062,.078),
        (1.28,-.31,0,.023,.043),(1.33,-.29,0,.004,.008)
    ], "body", trunk_skin, around=32, subdivisions=3, dorsal=True, belly=True)
    for side in (-1, 1):
        z = side
        # Smile follows the curve of the lower rostrum, under the cheek.
        ribbon(surf, [(-1.408,-.071,z*.091,.008,.008),
                      (-1.32,-.104,z*.174,.037,.017),
                      (-1.17,-.113,z*.218,.044,.020),
                      (-1.04,-.071,z*.251,.026,.023),
                      (-.985,-.030,z*.278,.005,.006)], "mouth", 0)
        surf.ellipse((-.810,.207,z*.343), (.176,.188,.082), "eyeRim")
        surf.ellipse((-.840,.210,z*.401), (.145,.159,.045), "iris")
        surf.ellipse((-.854,.231,z*.436), (.102,.115,.027), "pupil")
        surf.ellipse((-.893,.284,z*.457), (.047,.045,.016), "light")
        surf.ellipse((-.814,.175,z*.455), (.019,.022,.010), "light")
        # Fin and tail use a rounded leading edge and tapered trailing edge.
        ribbon(surf, [(-.28,-.088,z*.254,.08,.058),
                      (-.13,-.211,z*.371,.123,.063),
                      (.049,-.343,z*.474,.099,.047),
                      (.241,-.426,z*.555,.03,.022),
                      (.30,-.433,z*.574,.002,.004)], "fin", 3 if side>0 else 4)
        ribbon(surf, [(1.11,-.31,z*.008,.032,.055),
                      (1.225,-.289+z*.035,z*.166,.097,.086),
                      (1.359,-.322+z*.105,z*.315,.110,.080),
                      (1.47,-.410+z*.13,z*.444,.060,.035),
                      (1.535,-.482+z*.15,z*.489,.003,.006)], "fin", 2)
    ribbon(surf, [(-.31,.25,0,.054,.105),(-.16,.542,0,.155,.075),
                  (.034,.657,0,.132,.045),(.229,.677,0,.057,.019),
                  (.301,.68,0,.002,.003)], "fin", 0, plane=False)
    return surf


def sea_crests():
    surf = Surface()
    for i in range(3):
        ribbon(surf, [(-.29+i*.13,.436,0,.045,.065),
                      (-.214+i*.13,.645+i*.018,0,.06,.054),
                      (-.017+i*.13,.742+i*.018,0,.075,.050),
                      (.10+i*.13,.712+i*.018,0,.006,.007)], "trim", 0, plane=False)
    return surf


def wings():
    surf = Surface()
    for side, bone in ((1, 5), (-1, 6)):
        for layer in range(2):
            for feather in reversed(range(6)):
                t = feather/5
                root = (-.20+t*.18, .12+t*.054, side*(.30+t*.08))
                span = 1-layer*.31
                tip = (root[0]+(.46+t*.64)*span, root[1]+(1.16-t*.81)*span,
                       root[2]+side*(.40+t*.17)*span)
                middle = plus(root, scale(minus(tip, root), .59))
                bend = plus(middle, (-.075,.105,side*.044))
                color = ("wing", "wingLight", "wingTip")[(feather+layer)%3]
                shoulder = plus(root, scale(minus(bend, root), .48))
                ribbon(surf, [(*root,.036,.047), (*shoulder,.085-layer*.025,.052),
                              (*bend,.131-layer*.030,.044), (*tip,.003,.005)], color, bone)
                if layer==0 and feather%2==0:
                    ridge = plus(bend, (.005,.008,side*.040))
                    end = plus(ridge, scale(minus(tip,ridge), .72))
                    ribbon(surf, [(*plus(shoulder,(0,0,side*.04)),.009,.009),
                                  (*ridge,.020,.016), (*end,.002,.003)], "wingLight", bone)
    return surf


def tiara():
    surf = Surface()
    ribbon(surf, [(-1.003,.408,0,.02,.058),(-.895,.532,0,.102,.24),
                  (-.745,.624,0,.106,.30),(-.556,.642,0,.057,.29),
                  (-.441,.636,0,.013,.17)], "trim", 0)
    for z, height in [(0,1.064),(-.252,.889),(.252,.889)]:
        ribbon(surf, [(-.82,.479,z,.046,.062),(-.78,height-.145,z,.073,.054),
                      (-.744,height,z,.005,.006)], "trim", 0)
        surf.ellipse((-.796,height-.134,z), (.084,.102,.072), "gem")
    for z in [-.287,.287]:
        surf.ellipse((-.667,.614,z), (.114,.052,.050), "gem")
    return surf


def regalia():
    """Raised settings and gold filigree that move with the fins and body."""
    surf = Surface()
    for z, wing_joint, fin_joint in ((1,5,3),(-1,6,4)):
        for y, station in ((.69,-.75),(.79,-.81),(.88,-.85)):
            surf.ellipse((station,y,z*.323),(.063,.049,.046),"trim")
            surf.sweep([(station-.04,y,z*.355,.005,.006),(station,y,z*.381,.062,.052),
                        (station+.04,y,z*.356,.006,.005)],"gem",0,around=8,subdivisions=1,dorsal=True)
        ribbon(surf,[(-.32,.30,z*.362,.013,.014),(-.19,.39,z*.434,.033,.024),
                     (-.03,.28,z*.456,.026,.020),(.11,.19,z*.412,.007,.008)],"trim",wing_joint)
        surf.ellipse((-.145,.336,z*.466),(.061,.070,.044),"gem",wing_joint)
        ribbon(surf,[(-.21,-.198,z*.405,.006,.010),(-.077,-.256,z*.482,.028,.017),
                     (.065,-.348,z*.542,.020,.017),(.185,-.40,z*.555,.004,.005)],"trim",fin_joint)
    return surf


def coral():
    surf = Surface()
    for side, bone in ((1, 5), (-1, 6)):
        for point in range(7):
            angle = point*TAU/7
            x, y = math.cos(angle), math.sin(angle)
            ribbon(surf, [(-.28,.42,side*.30,.028,.045),
                          (-.28+x*.14,.42+y*.14,side*.35,.055,.048),
                          (-.28+x*.24,.42+y*.24,side*.38,.004,.006)], "trim", bone)
        surf.ellipse((-.28,.42,side*.386), (.075,.075,.051), "gem", bone)
    return surf


def eternal_aura():
    surf = Surface()
    for start, end in ((2.71,4.42),(5.22,6.94),(.89,1.93)):
        arc = []
        for i in range(11):
            a = start+(end-start)*i/10
            x = 1.46*math.cos(a)
            y = .14+.86*math.sin(a)+.22*x
            z = .41*math.cos(a+.26)
            thickness = .009+.009*math.sin(math.pi*i/10)
            arc.append((x,y,z,thickness,thickness))
        ribbon(surf,arc,"starlight",0,plane=False)
        x,y,z,*_ = arc[4]
        surf.ellipse((x,y,z),(.060,.024,.028),"starlight")
        surf.ellipse((x,y,z),(.023,.073,.028),"starlight")
    return surf


FORMS = [
    # level, body, belly, fins, feathers (base/light/tip), trim, jewel, accessories
    (1, "55a6e7","e0f6ff","397dcd", "74c3f2","c9eeff","2d81d7","69caff","9cf1ff", []),
    (10,"18b8d4","e2fcff","1388b4", "34dfe5","e4ffff","2694ca","92f1ee","dbffff", ["crest"]),
    (20,"399fe0","fff1eb","e773a5", "ea659c","ffcfba","f29189","ffbc78","ffd7e8", ["wings","coral"]),
    (30,"2f7cda","e7f2ff","2856b8", "245ebb","55c3ff","4d50d8","b9d8ff","087dff", ["tiara"]),
    (40,"7776df","f2ebff","6745d3", "7a50f2","d4acff","b966fa","ae82ff","f19bff", ["wings","tiara"]),
    (50,"459add","fef4dd","de982d", "ee9a28","ffebb2","ffcc5f","ffce68","ffefbc", ["wings","tiara"]),
    (60,"3d9bdc","e7fbff","54babf", "4bbace","bbfaff","8773ea","b9ecff","a6ffef", ["wings","coral"]),
    (70,"446adc","ecf0ff","3e409c", "394ccf","8996ff","d360f9","f9b84f","5965ff", ["wings","tiara"]),
    (90,"4394df","f4f5ff","699ee1", "e5a747","fff1bf","6baff7","ffc75a","226ffb", ["wings","tiara","regalia"]),
    (100,"c3dcff","fcf2ff","9d98f5", "75d6fe","ebeaff","c179fc","ffca5b","42d3ff", ["wings","tiara","regalia","aura"]),
]
PALETTE = ["body","belly","fin","wing","wingLight","wingTip","trim","gem"]
REST = [(0,0,0),(.349,-.105,0),(.91,-.29,0),(-.287,-.07,.27),
        (-.287,-.07,-.27),(-.203,.23,.30),(-.203,.23,-.30)]
JOINTS = ["Spine","Tail","Flukes","FinNear","FinFar","WingNear","WingFar"]
PARENT = [None,0,1,0,0,0,0]


def build(path):
    materials = {
        **dict(zip(PALETTE, FORMS[-1][1:-1])),
        "eyeRim":"c8f1ff", "iris":"2375c5", "pupil":"102450", "light":"f5ffff",
        "mouth":"682a58", "starlight":"dc9f46"
    }
    forms = [{"level": row[0], "colors": dict(zip(PALETTE, map(rgb, row[1:-1]))),
              "parts": row[-1]} for row in FORMS]
    doc = {"asset":{"version":"2.0","generator":"DolphinApp companion sculpt"},
           "scene":0,"scenes":[{"nodes":[0]}],"nodes":[],
           "buffers":[],"bufferViews":[],"accessors":[],"meshes":[],
           "skins":[],"animations":[],"materials":[],
           "extensionsUsed":["KHR_materials_clearcoat"]}
    binary = bytearray()

    def node(**props):
        doc["nodes"].append(props)
        return len(doc["nodes"])-1

    def write(values, fmt, count, dimension, bounds=None, target=None):
        binary.extend(b"\0"*((-len(binary))%4))
        data = struct.pack("<"+fmt*len(values), *values)
        view = {"buffer":0,"byteOffset":len(binary),"byteLength":len(data)}
        if target:
            view["target"] = target
        binary.extend(data)
        doc["bufferViews"].append(view)
        attr = {"bufferView":len(doc["bufferViews"])-1,
                "componentType":{"f":5126,"H":5123,"B":5121}[fmt],
                "count":count,"type":dimension}
        if bounds:
            attr["min"], attr["max"] = bounds
        doc["accessors"].append(attr)
        return len(doc["accessors"])-1

    def vectors(items, fmt, dimension, *, bounds=False, target=None):
        minmax = [list(map(method, zip(*items))) for method in (min,max)] if bounds else None
        return write([v for row in items for v in row],fmt,len(items),dimension,minmax,target)

    indices = {}
    for name, hex_value in materials.items():
        indices[name] = len(doc["materials"])
        doc["materials"].append({"name":name,"pbrMetallicRoughness":{
            "baseColorFactor":[*rgb(hex_value),1],
            "roughnessFactor": .25 if name in ("iris","trim","gem") else .39,
            "metallicFactor": .39 if name=="trim" else .03
        }})
        if name in ("body","fin","wing","wingLight","wingTip","gem"):
            doc["materials"][-1]["extensions"] = {"KHR_materials_clearcoat":{
                "clearcoatFactor": .59 if name=="gem" else .32,
                "clearcoatRoughnessFactor": .16
            }}
        if name=="starlight":
            doc["materials"][-1]["emissiveFactor"] = rgb("a7631f")

    model = node(name="Dolphin", children=[], extras={"forms":forms})
    joints = [node(name=name, translation=minus(REST[i], REST[PARENT[i]]) if i else REST[i])
              for i, name in enumerate(JOINTS)]
    for i in range(1,len(joints)):
        doc["nodes"][joints[PARENT[i]]].setdefault("children",[]).append(joints[i])
    doc["nodes"][model]["children"].append(joints[0])
    matrices = [(1,0,0,0, 0,1,0,0, 0,0,1,0, -x,-y,-z,1) for x,y,z in REST]
    doc["skins"].append({"name":"Swim rig","skeleton":joints[0],"joints":joints,
                         "inverseBindMatrices":vectors(matrices,"f","MAT4")})

    for label, mesh in [("dolphin",base_dolphin()),("crest",sea_crests()),("wings",wings()),
                        ("tiara",tiara()),("coral",coral()),("regalia",regalia()),
                        ("aura",eternal_aura())]:
        attributes = {
            "POSITION":vectors(mesh.points,"f","VEC3",bounds=True,target=34962),
            "NORMAL":vectors([unit(n) for n in mesh.normals],"f","VEC3",target=34962),
            "JOINTS_0":vectors([(j if w else 0,k if w<1 else 0,0,0)
                                for j,k,w in mesh.weights],"B","VEC4",target=34962),
            "WEIGHTS_0":vectors([(w,1-w,0,0) for j,k,w in mesh.weights],"f","VEC4",target=34962),
        }
        primitives = [{"attributes":attributes, "material":indices[name],
                       "indices":write(ids,"H",len(ids),"SCALAR",target=34963)}
                      for name, ids in mesh.faces.items()]
        doc["meshes"].append({"name":label, "primitives":primitives})
        extra = {} if label=="dolphin" else {"part":label}
        doc["scenes"][0]["nodes"].append(node(name=label+"-mesh", mesh=len(doc["meshes"])-1,
                                              skin=0, extras=extra))

    duration = 1.12
    time = write([duration*i/16 for i in range(17)],"f",17,"SCALAR",[[0],[duration]])
    clips = [(.055,.0,(0,0,1)),(.215,.5,(0,0,1)),(.32,1.2,(0,0,1)),
             (.15,.7,(1,0,0)),(.15,-.7,(-1,0,0)),
             (.20,.1,(1,0,0)),(.20,.1,(-1,0,0))]
    animation = {"name":"Swim","samplers":[],"channels":[]}
    for joint, (amplitude, phase, axis) in zip(joints, clips):
        values = []
        for step in range(17):
            half = math.sin(TAU*(step%16)/16-phase)*amplitude/2
            values.append((*scale(axis, math.sin(half)), math.cos(half)))
        sampler = len(animation["samplers"])
        animation["samplers"].append({"input":time,"output":vectors(values,"f","VEC4"),
                                      "interpolation":"LINEAR"})
        animation["channels"].append({"sampler":sampler,"target":{"node":joint,"path":"rotation"}})
    doc["animations"].append(animation)
    binary.extend(b"\0"*((-len(binary))%4))
    doc["buffers"].append({"byteLength":len(binary)})
    data = json.dumps(doc,separators=(",",":")).encode()
    data += b" "*((-len(data))%4)
    path.write_bytes(struct.pack("<4sII",b"glTF",2,28+len(data)+len(binary))+
                     struct.pack("<I4s",len(data),b"JSON")+data+
                     struct.pack("<I4s",len(binary),b"BIN\0")+binary)


if __name__=="__main__":
    build(Path(sys.argv[1]))
