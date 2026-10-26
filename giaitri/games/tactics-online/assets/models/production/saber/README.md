# Saber (H01) — Stylized Chibi 3D Production Setup

This is a **Blender authoring template**, not an approved final mesh. The game's H01 is **Saber / Mech / Brawler**. Never overwrite existing production assets with a proxy rig.

## Blender workflow
1. Open Blender 4.x, switch to Scripting and run `setup_saber.py`.
2. The script creates **named empty mesh collections**, a real humanoid **Armature** with 38+ deform/control bones, and a separate `Saber_EnergySword` locator. It intentionally does **not** invent a production sculpt or claim to auto-rig geometry.
3. Sculpt/retopologize Saber to approved concept: windswept navy hair, expressive turquoise eyes, white/navy gold mech armor, cyan chest reactor, layered tabard, and oversized energy broadsword. Keep chibi proportions; total model height target 1.02 game units.
4. Skin mesh to armature with max 4 bone weights per vertex; parent sword to `hand.R` using a Child Of/Copy Transforms constraint or export-compatible bone parenting. Test bends and clipping.
5. Create five actual animation **Actions** with names exactly `Idle`, `Walk`, `Attack`, `Cast`, `Death`, and push into NLA tracks for glTF export. Templates with empty keyframes are not finished animations.
6. Export GLB through `export_saber.py`. Verify with `validate_saber_glb.py` and preview on a real Android device **before** updating game manifest.

## Asset conventions
- Blender axes Z-up, GLB glTF Y-up (Blender exporter converts automatically). Faces game-forward +Z in Three.js after import.
- Origin at feet center. Export transforms applied; game loader normalizes to targetHeight 1.02.
- Mesh collections: `Saber_Body`, `Saber_Hair`, `Saber_Armor`, `Saber_Tabard`, `Saber_Sword`, `Saber_VFX_Anchors`.
- 25k–40k target triangles (production target, not a hard topology limitation), 1–3 materials, up to 2k textures.
- Preserve GLB animation names and `Armature` skeleton. Test repeated instances using `SkeletonUtils.clone` in Three.js.
- To enable final art, place **validated binary** at `assets/models/heroes/chibi/h01.glb` and update the root asset manifest `heroes.H01={file:"heroes/chibi/h01.glb",quality:"stylized-chibi",targetHeight:1.02,scale:1}`.
- Existing `h01.glb` is an old placeholder; never mark it `quality=stylized-chibi`.

## Production acceptance
Visual: clear Saber silhouette at 60% previous on-board scale; real sculpted hair/face and layered armor, no box geometry. Rig: arms, legs, hands, face and tabard deform cleanly. Animations: no popping; sword follows hand; death does not loop. Runtime: no T-pose, correct foot placement, FPS stable on Android, no WebGL leaks.
