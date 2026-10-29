/* 30 signature animation identities; source names/abilities mirror hero catalog. */
(function(root){const PROFILES={
  "H01": {
    "name": "Thiết Vệ",
    "style": "bulwark",
    "weapon": "hammer",
    "color": 7651301,
    "impact": 1.2,
    "skill": "strike",
    "origin": "Mech"
  },
  "H02": {
    "name": "Sóng Xanh",
    "style": "tide-step",
    "weapon": "dagger",
    "color": 4839400,
    "impact": 1.5,
    "skill": "dash",
    "origin": "Void"
  },
  "H03": {
    "name": "Ma Nhãn",
    "style": "eye-beam",
    "weapon": "bow",
    "color": 10975231,
    "impact": 1.3,
    "skill": "bolt",
    "origin": "Arcane"
  },
  "H04": {
    "name": "Phong Nha",
    "style": "wild-bloom",
    "weapon": "shield",
    "color": 6610050,
    "impact": 1.1,
    "skill": "bolt",
    "origin": "Beast"
  },
  "H05": {
    "name": "Lôi Tướng",
    "style": "thunder-ward",
    "weapon": "staff",
    "color": 11706623,
    "impact": 1.5,
    "skill": "blast",
    "origin": "Shadow"
  },
  "H06": {
    "name": "Hoa Linh",
    "style": "flower-burst",
    "weapon": "fists",
    "color": 16752848,
    "impact": 1.2,
    "skill": "blast",
    "origin": "Celestial"
  },
  "H07": {
    "name": "Địa Quyền",
    "style": "earth-punch",
    "weapon": "claws",
    "color": 15382126,
    "impact": 1.5,
    "skill": "drain",
    "origin": "Mech"
  },
  "H08": {
    "name": "Hải Đao",
    "style": "ocean-bind",
    "weapon": "bow",
    "color": 4307439,
    "impact": 1.1,
    "skill": "stun",
    "origin": "Void"
  },
  "H09": {
    "name": "Hư Ảnh",
    "style": "mirror-guard",
    "weapon": "shield",
    "color": 9410280,
    "impact": 1.3,
    "skill": "strike",
    "origin": "Arcane"
  },
  "H10": {
    "name": "Cơ Giáp",
    "style": "mech-drive",
    "weapon": "staff",
    "color": 15318891,
    "impact": 1.4,
    "skill": "dash",
    "origin": "Beast"
  },
  "H11": {
    "name": "Pháp Sư",
    "style": "arcane-shot",
    "weapon": "fists",
    "color": 12351994,
    "impact": 1.2,
    "skill": "blast",
    "origin": "Shadow"
  },
  "H12": {
    "name": "Thú Vương",
    "style": "alpha-charge",
    "weapon": "claws",
    "color": 15903602,
    "impact": 1.6,
    "skill": "heal",
    "origin": "Celestial"
  },
  "H13": {
    "name": "Ngân Dực",
    "style": "silver-wing",
    "weapon": "bow",
    "color": 12640511,
    "impact": 1.5,
    "skill": "bolt",
    "origin": "Mech"
  },
  "H14": {
    "name": "Dạ Nhẫn",
    "style": "night-wave",
    "weapon": "shield",
    "color": 9332200,
    "impact": 1.3,
    "skill": "blast",
    "origin": "Void"
  },
  "H15": {
    "name": "Thủy Trượng",
    "style": "tidal-drain",
    "weapon": "staff",
    "color": 4443628,
    "impact": 1.4,
    "skill": "blast",
    "origin": "Arcane"
  },
  "H16": {
    "name": "Thiên Tiễn",
    "style": "sky-arrow",
    "weapon": "bow",
    "color": 16767110,
    "impact": 1.5,
    "skill": "stun",
    "origin": "Beast"
  },
  "H17": {
    "name": "Ám Hỏa",
    "style": "shadow-flare",
    "weapon": "dagger",
    "color": 16411000,
    "impact": 1.7,
    "skill": "strike",
    "origin": "Shadow"
  },
  "H18": {
    "name": "Ngọc Y",
    "style": "jade-dash",
    "weapon": "bow",
    "color": 6283442,
    "impact": 1.6,
    "skill": "blast",
    "origin": "Celestial"
  },
  "H19": {
    "name": "Lang Kỵ",
    "style": "wolf-bolt",
    "weapon": "shield",
    "color": 13166235,
    "impact": 1.3,
    "skill": "bolt",
    "origin": "Mech"
  },
  "H20": {
    "name": "Khải Thần",
    "style": "divine-spring",
    "weapon": "staff",
    "color": 16047239,
    "impact": 1.3,
    "skill": "teamHeal",
    "origin": "Void"
  },
  "H21": {
    "name": "Phệ Hồn",
    "style": "soul-barrier",
    "weapon": "fists",
    "color": 10973912,
    "impact": 1.4,
    "skill": "blast",
    "origin": "Arcane"
  },
  "H22": {
    "name": "Lôi Kiếm",
    "style": "lightning-edge",
    "weapon": "sword",
    "color": 7522047,
    "impact": 1.8,
    "skill": "aoe",
    "origin": "Beast"
  },
  "H23": {
    "name": "Tỏa Sáng",
    "style": "solar-barrage",
    "weapon": "bow",
    "color": 16765035,
    "impact": 1.8,
    "skill": "aoe",
    "origin": "Shadow"
  },
  "H24": {
    "name": "Hắc Long",
    "style": "dragon-flame",
    "weapon": "shield",
    "color": 15760243,
    "impact": 1.6,
    "skill": "aoe",
    "origin": "Celestial"
  },
  "H25": {
    "name": "Cự Thần",
    "style": "titan-surge",
    "weapon": "staff",
    "color": 14853628,
    "impact": 1.4,
    "skill": "aoe",
    "origin": "Mech"
  },
  "H26": {
    "name": "Phượng Nữ",
    "style": "phoenix-fire",
    "weapon": "claws",
    "color": 16749680,
    "impact": 1.8,
    "skill": "aoe",
    "origin": "Void"
  },
  "H27": {
    "name": "Tinh Không",
    "style": "cosmic-rift",
    "weapon": "dagger",
    "color": 9337337,
    "impact": 2,
    "skill": "aoe",
    "origin": "Arcane"
  },
  "H28": {
    "name": "Hải Hoàng",
    "style": "ocean-tide",
    "weapon": "bow",
    "color": 7067880,
    "impact": 1.7,
    "skill": "aoe",
    "origin": "Beast"
  },
  "H29": {
    "name": "Thần Cơ",
    "style": "divine-grid",
    "weapon": "shield",
    "color": 15189099,
    "impact": 1.6,
    "skill": "aoe",
    "origin": "Shadow"
  },
  "H30": {
    "name": "Hư Vương",
    "style": "void-collapse",
    "weapon": "staff",
    "color": 10975993,
    "impact": 2,
    "skill": "aoe",
    "origin": "Celestial"
  },
  "H31": {"name":"Diggie","style":"support-1","weapon":"staff","color":16766601,"impact":1,"skill":"teamShield","origin":"Mech"},
  "H32": {"name":"Angela","style":"support-2","weapon":"staff","color":16748923,"impact":1.1,"skill":"teamHaste","origin":"Celestial"},
  "H33": {"name":"Floryn","style":"support-3","weapon":"staff","color":7394455,"impact":1.2,"skill":"teamHeal","origin":"Beast"},
  "H34": {"name":"Mathilda","style":"support-4","weapon":"staff","color":7615461,"impact":1.3,"skill":"teamHaste","origin":"Arcane"},
  "H35": {"name":"Estes","style":"support-5","weapon":"staff","color":15251192,"impact":1.4,"skill":"teamHeal","origin":"Celestial"},
  "H36": {"name":"Faramis","style":"support-6","weapon":"staff","color":12423934,"impact":1.5,"skill":"teamShield","origin":"Shadow"}
};
root.DolphinTacticsHeroProfiles=Object.freeze(PROFILES);
if(typeof module!=='undefined'&&module.exports)module.exports=PROFILES;
})(typeof window!=='undefined'?window:globalThis);
