/* ============================================================
   DRINK CONFIG v2.1 — Menu thật từ Excel
   155 món · 5 nhóm chính · 20+ subcategories
   Cập nhật: Bổ sung đầy đủ bàn Sun View Restaurant tầng 2
   ============================================================ */
window.DRINK_CONFIG = (function(){
  'use strict';

  /* ═══════ TABLE GROUPS ═══════ */
  var TABLE_GROUPS = [
    {
      key: 'sunview-2',
      label: '🍽️ Sun View Restaurant · Tầng 2',
      area: 'restaurant',
      tables: [
        'J1','J1.5','J2','J2.5','J3','J3.5','J4','J4.5','J5','J5.5','J6','J6.5','J7',
        'Q1','Q1.5','Q2','Q2.5','Q3','Q3.5','Q4','Q4.5','Q5','Q5.5','Q6','Q6.5','Q7'
      ]
    },
    {
      key: 'zone-a',
      label: '🅰️ Khu A · Tầng 1',
      area: 'zone-a',
      tables: Array.from({length: 30}, function(_, i){ return 'A' + (i+1); })
    },
    {
      key: 'zone-b',
      label: '🅱️ Khu B · Tầng 1',
      area: 'zone-b',
      tables: Array.from({length: 20}, function(_, i){ return 'B' + (i+1); })
    },
    {
      key: 'zone-c',
      label: '🅲 Khu C · Tầng 1',
      area: 'zone-c',
      tables: Array.from({length: 15}, function(_, i){ return 'C' + (i+1); })
    },
    {
      key: 'zone-d',
      label: '🅳 Khu D · Tầng 1',
      area: 'zone-d',
      tables: Array.from({length: 20}, function(_, i){ return 'D' + (i+1); })
    },
    {
      key: 'zone-e',
      label: '🅴 Khu E · Tầng 1',
      area: 'zone-e',
      tables: Array.from({length: 30}, function(_, i){ return 'E' + (i+1); })
    },
    {
      key: 'lounge',
      label: '🍸 Premium Lounge',
      area: 'lounge',
      tables: Array.from({length: 20}, function(_, i){ return 'L' + (i+1); })
    },
    {
      key: 'bungalow-2',
      label: '🌴 Bungalow · Tầng 2',
      area: 'bungalow-2',
      tables: ['201','202','203','204']
    },
    {
      key: 'bungalow-3',
      label: '🌴 Bungalow · Tầng 3',
      area: 'bungalow-3',
      tables: ['301','302','303','304','305','306']
    },
    {
      key: 'bungalow-4',
      label: '🌴 Bungalow · Tầng 4',
      area: 'bungalow-4',
      tables: ['401','402','403','404','405','406']
    }
  ];

  function getGroupByTable(table){
    for (var i = 0; i < TABLE_GROUPS.length; i++){
      if (TABLE_GROUPS[i].tables.indexOf(table) >= 0) return TABLE_GROUPS[i];
    }
    return null;
  }

  /* ═══════ MAIN CATEGORIES ═══════ */
  var CATEGORIES = [
    { id: 'wine',      label: '🍷 Rượu Vang',      icon: '🍷' },
    { id: 'spirits',   label: '🥃 Rượu Mạnh',      icon: '🥃' },
    { id: 'cocktail',  label: '🍸 Cocktail',        icon: '🍸' },
    { id: 'beer',      label: '🍺 Bia',             icon: '🍺' },
    { id: 'other',     label: '🥤 Đồ Uống Khác',   icon: '🥤' }
  ];

  /* ═══════ SUBCATEGORIES ═══════ */
  var SUBCATS = {
    wine:     ['House Wine','Rose Wine','Sparkling Wine','Champagne','Red Wine','White Wine'],
    spirits:  ['Aperitifs','Vodka','Rum','Tequila','Gin','Whiskey','Brandy','Liquier'],
    cocktail: ['Aperitif Cocktail','Classic Cocktail','Dessert Cocktail','Special Cocktail','Shooter Cocktail'],
    beer:     ['Beer'],
    other:    ['Mixed Drink','Mocktail','Smoothies','Fresh Juice','Tea','Coffee & Matcha','Soft Drink & Water']
  };

  /* ═══════ FULL MENU ═══════ */
  var MENU = [
    /* ════════ WINE ════════ */
    { id:'w01', cat:'wine', sub:'House Wine', name:'De Bortoli, DB Family Selection (Red)', desc:'Shiraz, Cabernet Sauvignon - Riverina, Australia', pg:220000, pb:null },
    { id:'w02', cat:'wine', sub:'House Wine', name:'De Bortoli, DB Family Selection (White)', desc:'Semillon, Chardonnay - Riverina, Australia', pg:220000, pb:null },
    { id:'w03', cat:'wine', sub:'House Wine', name:'Santa Rita Tres Medallas (Red)', desc:'Cabernet Sauvignon, Central Valley', pg:220000, pb:null },
    { id:'w04', cat:'wine', sub:'House Wine', name:'Santa Rita Tres Medallas (White)', desc:'Chardonnay, Central Valley', pg:220000, pb:null },

    { id:'w05', cat:'wine', sub:'Rose Wine', name:'Maison Castel, Rose', desc:"Merlot - IGP d'Oc, France", pg:null, pb:1500000 },
    { id:'w06', cat:'wine', sub:'Rose Wine', name:'Vignerons Ardechois Les Classiques Gris', desc:'Grenache - Cabernet, Ardeche IGP', pg:null, pb:1800000 },

    { id:'w07', cat:'wine', sub:'Sparkling Wine', name:'Tintoretto, Extra Dry', desc:'Glera - Prosecco DOC, Italy', pg:null, pb:1700000 },
    { id:'w08', cat:'wine', sub:'Sparkling Wine', name:'De Bortoli, Emeri Pink Moscato Sparkling', desc:'Moscato - Australia', pg:null, pb:1900000 },
    { id:'w09', cat:'wine', sub:'Sparkling Wine', name:'Villa Sandi "Il Fresco" Treviso Prosecco Brut', desc:'Glera, Prosecco Treviso DOC', pg:null, pb:2600000 },

    { id:'w10', cat:'wine', sub:'Champagne', name:'Champagne Charles Mignon, Premier Cru, Brut Premium Reserve', desc:'Pinot Noir, Chardonnay - Vallee de la Marne, France', pg:null, pb:5000000 },

    { id:'w11', cat:'wine', sub:'Red Wine', name:'De Bortoli, DB Family Selection', desc:'Shiraz, Cabernet Sauvignon - Riverina, Australia', pg:null, pb:1300000 },
    { id:'w12', cat:'wine', sub:'Red Wine', name:'Tarquino', desc:'Malbec, Shiraz - Mendoza, Argentina', pg:null, pb:1300000 },
    { id:'w13', cat:'wine', sub:'Red Wine', name:'Santa Rita Tres Medallas', desc:'Cabernet Sauvignon, Central Valley', pg:null, pb:1300000 },
    { id:'w14', cat:'wine', sub:'Red Wine', name:'Purato, "Organic"', desc:"Nero d'Avola - DOC Sicilia, Italy", pg:null, pb:1600000 },
    { id:'w15', cat:'wine', sub:'Red Wine', name:'Maison Castel', desc:"Cabernet Sauvignon - IGP d'Oc, France", pg:null, pb:1700000 },
    { id:'w16', cat:'wine', sub:'Red Wine', name:'Welmoed, Heritage Selection', desc:'Cabernet Sauvignon - Stellenbosch, South Africa', pg:null, pb:1500000 },
    { id:'w17', cat:'wine', sub:'Red Wine', name:'Casillero Del Diablo Reserva', desc:'Cabernet Sauvignon - Central Valley, Chile', pg:null, pb:1800000 },
    { id:'w18', cat:'wine', sub:'Red Wine', name:'Moulin de Gassac, Classic', desc:"Blend - IGP Pays d'Herault, France", pg:null, pb:1800000 },
    { id:'w19', cat:'wine', sub:'Red Wine', name:'Masi, Modello', desc:'Merlot - IGT Rosso delle Venezie, Italy', pg:null, pb:1800000 },
    { id:'w20', cat:'wine', sub:'Red Wine', name:'Marques de Riscal, 1860', desc:'Tempranillo, Merlot, Syrah - VDT de Castilla y Leon, Spain', pg:null, pb:1900000 },
    { id:'w21', cat:'wine', sub:'Red Wine', name:'Chateau Tour Mondet', desc:'Merlot, Cabernet Sauvignon - Bordeaux Superieur, France', pg:null, pb:1900000 },
    { id:'w22', cat:'wine', sub:'Red Wine', name:'L de Laroche', desc:"Pinot Noir - IGP d'Oc, France", pg:null, pb:2000000 },
    { id:'w23', cat:'wine', sub:'Red Wine', name:"Cantina Tollo Pietrame Montepulciano d'Abruzzo", desc:"Montepulciano d'Abruzzo DOP", pg:null, pb:1800000 },
    { id:'w24', cat:'wine', sub:'Red Wine', name:'El Jamon Red', desc:'Garnacha, Carinena DO', pg:null, pb:2000000 },
    { id:'w25', cat:'wine', sub:'Red Wine', name:'Miguel Torres, Las Mulas, Organic', desc:'Cabernet Sauvignon - Central Valley, Chile', pg:null, pb:1900000 },

    { id:'w26', cat:'wine', sub:'White Wine', name:'De Bortoli, DB Family Selection', desc:'Semillon, Chardonnay - Riverina, Australia', pg:null, pb:1300000 },
    { id:'w27', cat:'wine', sub:'White Wine', name:'Tarquino', desc:'Pinot Grigio - Mendoza, Argentina', pg:null, pb:1300000 },
    { id:'w28', cat:'wine', sub:'White Wine', name:'Santa Rita Tres Medallas', desc:'Chardonnay, Central Valley', pg:null, pb:1300000 },
    { id:'w29', cat:'wine', sub:'White Wine', name:'Purato, "Organic"', desc:'Catarratto, Pinot Grigio - IGT Terre Sicilia, Italy', pg:null, pb:1600000 },
    { id:'w30', cat:'wine', sub:'White Wine', name:'Miguel Torres, Las Mulas, Organic', desc:'Sauvignon Blanc - Central Valley, Chile', pg:null, pb:1900000 },
    { id:'w31', cat:'wine', sub:'White Wine', name:'Maison Castel', desc:'Chardonnay - Vin de France, France', pg:null, pb:1700000 },
    { id:'w32', cat:'wine', sub:'White Wine', name:'Welmoed, Heritage Selection', desc:'Pinot Grigio - Stellenbosch, South Africa', pg:null, pb:1500000 },
    { id:'w33', cat:'wine', sub:'White Wine', name:'Casillero Del Diablo Reserva', desc:'Sauvignon Blanc - Wine of Chile, Chile', pg:null, pb:1800000 },
    { id:'w34', cat:'wine', sub:'White Wine', name:'Moulin de Gassac, Classic', desc:"Terret White, Carignan White - IGP Pays d'Herault, France", pg:null, pb:1800000 },
    { id:'w35', cat:'wine', sub:'White Wine', name:'Masi, Modello', desc:'Pinot Grigio - delle Venezie DOC, Italy', pg:null, pb:1800000 },
    { id:'w36', cat:'wine', sub:'White Wine', name:'Marques de Riscal', desc:'Sauvignon Blanc - Rueda DO', pg:null, pb:2100000 },
    { id:'w37', cat:'wine', sub:'White Wine', name:'Jean Luc Colombo, Les Abeilles de Colombo', desc:'Clairette, Roussanne - Cotes du Rhone AC, France', pg:null, pb:2200000 },
    { id:'w38', cat:'wine', sub:'White Wine', name:'Banrock Station Sauvignon Blanc', desc:'Sauvignon Blanc, South Australia', pg:null, pb:1800000 },
    { id:'w39', cat:'wine', sub:'White Wine', name:'Cantina Tollo Pietrame Pinot Grigio', desc:'Pinot Grigio, Terre di Chieti IGP', pg:null, pb:1800000 },
    { id:'w40', cat:'wine', sub:'White Wine', name:'Carpineto Dogajolo Bianco', desc:'Chardonnay, Grechetto, Sauvignon Blanc - Toscana IGT', pg:null, pb:3300000 },

    /* ════════ SPIRITS ════════ */
    { id:'s01', cat:'spirits', sub:'Aperitifs', name:'Martini Bianco', pg:159000, pb:1950000 },
    { id:'s02', cat:'spirits', sub:'Aperitifs', name:'Martini Rosso', pg:159000, pb:1950000 },
    { id:'s03', cat:'spirits', sub:'Aperitifs', name:'Martini Extra Dry', pg:159000, pb:1950000 },
    { id:'s04', cat:'spirits', sub:'Aperitifs', name:'Campari', pg:179000, pb:2300000 },

    { id:'s05', cat:'spirits', sub:'Vodka', name:'Smirnoff Vodka', pg:129000, pb:1390000 },
    { id:'s06', cat:'spirits', sub:'Vodka', name:'Grey Goose', pg:239000, pb:3900000 },
    { id:'s07', cat:'spirits', sub:'Vodka', name:'Vodka Absolute', pg:null, pb:1390000 },
    { id:'s08', cat:'spirits', sub:'Vodka', name:'Vodka Beluga', pg:null, pb:3900000 },

    { id:'s09', cat:'spirits', sub:'Rum', name:'Bacardi Light', pg:159000, pb:1590000 },
    { id:'s10', cat:'spirits', sub:'Rum', name:'Captain Morgan Dark', pg:159000, pb:1500000 },
    { id:'s11', cat:'spirits', sub:'Rum', name:'Havana Club Anejo 3', pg:null, pb:1290000 },

    { id:'s12', cat:'spirits', sub:'Tequila', name:'Jose Cuervo Gold', pg:159000, pb:1790000 },
    { id:'s13', cat:'spirits', sub:'Tequila', name:'Patron Silver', pg:null, pb:4390000 },
    { id:'s14', cat:'spirits', sub:'Tequila', name:'Patron Gold', pg:null, pb:5200000 },

    { id:'s15', cat:'spirits', sub:'Gin', name:'Gin Beefeater', pg:null, pb:1500000 },
    { id:'s16', cat:'spirits', sub:'Gin', name:'Gin Tanqueray No.10', pg:null, pb:3500000 },
    { id:'s17', cat:'spirits', sub:'Gin', name:'Gin Gordon', pg:159000, pb:1290000 },
    { id:'s18', cat:'spirits', sub:'Gin', name:'Gin Bombay Sapphire', pg:179000, pb:1900000 },

    { id:'s19', cat:'spirits', sub:'Whiskey', name:'Jack Daniels', pg:159000, pb:1900000 },
    { id:'s20', cat:'spirits', sub:'Whiskey', name:'Jim Beam', pg:159000, pb:1450000 },
    { id:'s21', cat:'spirits', sub:'Whiskey', name:'Chivas Regal 12 Yrs', pg:199000, pb:1990000 },
    { id:'s22', cat:'spirits', sub:'Whiskey', name:'Chivas Regal 18 Yrs', pg:null, pb:6200000 },
    { id:'s23', cat:'spirits', sub:'Whiskey', name:'Glenfiddich 12 Yrs', pg:null, pb:3500000 },
    { id:'s24', cat:'spirits', sub:'Whiskey', name:'Glenfiddich 21 Yrs', pg:null, pb:17900000 },
    { id:'s25', cat:'spirits', sub:'Whiskey', name:'Johnnie Walker Black Label', pg:199000, pb:2190000 },
    { id:'s26', cat:'spirits', sub:'Whiskey', name:'Johnnie Walker Gold Label', pg:null, pb:2800000 },
    { id:'s27', cat:'spirits', sub:'Whiskey', name:'Johnnie Walker Red Label', pg:159000, pb:1390000 },
    { id:'s28', cat:'spirits', sub:'Whiskey', name:'Macallan 12 Yrs', pg:null, pb:6900000 },
    { id:'s29', cat:'spirits', sub:'Whiskey', name:'Macallan 18 Yrs', pg:null, pb:35000000 },
    { id:'s30', cat:'spirits', sub:'Whiskey', name:'Ballantines 12Yo', pg:null, pb:2390000 },
    { id:'s31', cat:'spirits', sub:'Whiskey', name:'Ballantines 17Yo', pg:null, pb:4500000 },
    { id:'s32', cat:'spirits', sub:'Whiskey', name:'Jameson', pg:159000, pb:1390000 },

    { id:'s33', cat:'spirits', sub:'Brandy', name:'Martel XO', pg:null, pb:15000000 },
    { id:'s34', cat:'spirits', sub:'Brandy', name:'Martel V.S.O.P', pg:null, pb:4400000 },
    { id:'s35', cat:'spirits', sub:'Brandy', name:'Remy Martin V.S.O.P', pg:null, pb:4400000 },
    { id:'s36', cat:'spirits', sub:'Brandy', name:'Remy Martin XO', pg:null, pb:15900000 },
    { id:'s37', cat:'spirits', sub:'Brandy', name:'ST Remy VSOP', pg:159000, pb:1500000 },

    { id:'s38', cat:'spirits', sub:'Liquier', name:"Bailey's Irish Cream", pg:159000, pb:null },
    { id:'s39', cat:'spirits', sub:'Liquier', name:'Malibu', pg:159000, pb:null },
    { id:'s40', cat:'spirits', sub:'Liquier', name:'Amaretto', pg:179000, pb:null },
    { id:'s41', cat:'spirits', sub:'Liquier', name:'Kahlua', pg:159000, pb:null },
    { id:'s42', cat:'spirits', sub:'Liquier', name:'Triple Sec', pg:159000, pb:null },

    /* ════════ COCKTAIL ════════ */
    { id:'c01', cat:'cocktail', sub:'Aperitif Cocktail', name:'Negroni', desc:'Gin, Martini Rosso, Campari', pg:259000, pb:null },
    { id:'c02', cat:'cocktail', sub:'Aperitif Cocktail', name:'007 Martini', desc:'Vodka, Gin, Martini Extra Dry', pg:239000, pb:null },

    { id:'c03', cat:'cocktail', sub:'Classic Cocktail', name:'Amaretto Sour', desc:'Amaretto, Jim Beam, Lime, Egg White, Bitter', pg:239000, pb:null },
    { id:'c04', cat:'cocktail', sub:'Classic Cocktail', name:'Long Island Iced Tea', desc:'Gin, Rum, Vodka, Tequila, Triple sec, Coke, Lime', pg:239000, pb:null },
    { id:'c05', cat:'cocktail', sub:'Classic Cocktail', name:'Pina Colada', desc:'Rum, Malibu, Coconut Cream, Pineapple Juice, Sugar', pg:239000, pb:null },
    { id:'c06', cat:'cocktail', sub:'Classic Cocktail', name:'Old Fashion', desc:'Jim Beam, Sugar, Bitter', pg:219000, pb:null },
    { id:'c07', cat:'cocktail', sub:'Classic Cocktail', name:'Margarita', desc:'Tequila, Triple Sec, Lime, Sugar', pg:219000, pb:null },
    { id:'c08', cat:'cocktail', sub:'Classic Cocktail', name:'Mojito', desc:'Rum, Lime, Mint Leave, Sugar, Soda', pg:199000, pb:null },
    { id:'c09', cat:'cocktail', sub:'Classic Cocktail', name:'Mai Tai', desc:'White Rum, Dark Rum, Amaretto, Orange Curacao, Pineapple, Orange, Grenadine', pg:259000, pb:null },
    { id:'c10', cat:'cocktail', sub:'Classic Cocktail', name:'Whiskey Sour', desc:'Jim Beam, Lime, Sugar, Egg White', pg:199000, pb:null },

    { id:'c11', cat:'cocktail', sub:'Dessert Cocktail', name:'Espresso Martini', desc:'Vodka, Kahlua, Coffee', pg:179000, pb:null },
    { id:'c12', cat:'cocktail', sub:'Dessert Cocktail', name:'White Russian', desc:'Kahlua, Vodka, Whipping Cream', pg:199000, pb:null },

    { id:'c13', cat:'cocktail', sub:'Special Cocktail', name:'Dolphin On The Bay', desc:'Vodka, Midori, Triple Sec, Pineapple, Lime', pg:279000, pb:null },
    { id:'c14', cat:'cocktail', sub:'Special Cocktail', name:'The Dolphin Dream', desc:'Rum, Pineapple, Grenadine, Whipping Cream', pg:239000, pb:null },
    { id:'c15', cat:'cocktail', sub:'Special Cocktail', name:'Hạ Long Bay Illusion', desc:'Vodka, Peach Syrup, Red Dragon, Lime', pg:239000, pb:null },

    { id:'c16', cat:'cocktail', sub:'Shooter Cocktail', name:'B52', desc:"Kahlua, Bailey's, Triple Sec", pg:159000, pb:null },
    { id:'c17', cat:'cocktail', sub:'Shooter Cocktail', name:'Jager Bomb', desc:'Jagermeister, Redbull', pg:219000, pb:null },

    /* ════════ OTHER BEVERAGES ════════ */
    { id:'o01', cat:'other', sub:'Mixed Drink', name:'Campari w Soda', pg:219000, pb:null },
    { id:'o02', cat:'other', sub:'Mixed Drink', name:'Cuba Libre', pg:179000, pb:null },
    { id:'o03', cat:'other', sub:'Mixed Drink', name:'Jack w Coke', pg:199000, pb:null },
    { id:'o04', cat:'other', sub:'Mixed Drink', name:'Gin w Tonic', pg:179000, pb:null },
    { id:'o05', cat:'other', sub:'Mixed Drink', name:'Screwdriver', pg:179000, pb:null },
    { id:'o06', cat:'other', sub:'Mixed Drink', name:'Vodka w Soda', pg:179000, pb:null },

    { id:'o07', cat:'other', sub:'Mocktail', name:'Shirley Temple', desc:'Grenadine Syrup, Lime, Sprite', pg:139000, pb:null },
    { id:'o08', cat:'other', sub:'Mocktail', name:'Cinderella', desc:'Pineapple, Orange, Grenadine Syrup, Whipping Cream', pg:159000, pb:null },
    { id:'o09', cat:'other', sub:'Mocktail', name:'Virgin Colada', desc:'Pineapple, Coconut Cream, Sugar', pg:139000, pb:null },

    { id:'o10', cat:'other', sub:'Smoothies', name:'Mango With Passion', pg:159000, pb:null },
    { id:'o11', cat:'other', sub:'Smoothies', name:'Blueberry', pg:159000, pb:null },

    { id:'o12', cat:'other', sub:'Fresh Juice', name:'Lemonade', pg:99000, pb:null },
    { id:'o13', cat:'other', sub:'Fresh Juice', name:'Coconut Juice', pg:129000, pb:null },
    { id:'o14', cat:'other', sub:'Fresh Juice', name:'Orange Juice', pg:99000, pb:null },
    { id:'o15', cat:'other', sub:'Fresh Juice', name:'Passion Juice', pg:99000, pb:null },
    { id:'o16', cat:'other', sub:'Fresh Juice', name:'Pineapple Juice', pg:99000, pb:null },
    { id:'o17', cat:'other', sub:'Fresh Juice', name:'Watermelon Juice', pg:99000, pb:null },

    { id:'o18', cat:'other', sub:'Tea', name:'English Breakfast Tea', pg:70000, pb:null },
    { id:'o19', cat:'other', sub:'Tea', name:'Jasmine Tea', pg:70000, pb:null },
    { id:'o20', cat:'other', sub:'Tea', name:'Earl Grey Tea', pg:70000, pb:null },
    { id:'o21', cat:'other', sub:'Tea', name:'Peppermint Tea', pg:70000, pb:null },
    { id:'o22', cat:'other', sub:'Tea', name:'Vietnamese Green Tea', pg:120000, pb:null },
    { id:'o23', cat:'other', sub:'Tea', name:'Lemon Blueberry Tea', desc:'Trà việt quất chanh vàng', pg:165000, pb:null },
    { id:'o24', cat:'other', sub:'Tea', name:'Orange Lemongrass Peach Tea', desc:'Trà đào cam xả', pg:165000, pb:null },

    { id:'o25', cat:'other', sub:'Coffee & Matcha', name:'Americano', pg:105000, pb:null },
    { id:'o26', cat:'other', sub:'Coffee & Matcha', name:'Cappuccino', pg:135000, pb:null },
    { id:'o27', cat:'other', sub:'Coffee & Matcha', name:'Single Espresso', pg:89000, pb:null },
    { id:'o28', cat:'other', sub:'Coffee & Matcha', name:'Double Espresso', pg:105000, pb:null },
    { id:'o29', cat:'other', sub:'Coffee & Matcha', name:'Latte', pg:135000, pb:null },
    { id:'o30', cat:'other', sub:'Coffee & Matcha', name:'Hot Chocolate', pg:105000, pb:null },
    { id:'o31', cat:'other', sub:'Coffee & Matcha', name:'Matcha Latte', pg:105000, pb:null },
    { id:'o32', cat:'other', sub:'Coffee & Matcha', name:'Coco Matcha', pg:135000, pb:null },
    { id:'o33', cat:'other', sub:'Coffee & Matcha', name:'Matcha Nut Milk', pg:135000, pb:null },
    { id:'o34', cat:'other', sub:'Coffee & Matcha', name:'Vietnamese Coffee', pg:95000, pb:null },
    { id:'o35', cat:'other', sub:'Coffee & Matcha', name:'The Salt Coffee', pg:105000, pb:null },
    { id:'o36', cat:'other', sub:'Coffee & Matcha', name:'Coconut Coffee', pg:105000, pb:null },

    { id:'o37', cat:'other', sub:'Soft Drink & Water', name:'Sprite', pg:75000, pb:null },
    { id:'o38', cat:'other', sub:'Soft Drink & Water', name:'Coke', pg:75000, pb:null },
    { id:'o39', cat:'other', sub:'Soft Drink & Water', name:'Diet Coke', pg:75000, pb:null },
    { id:'o40', cat:'other', sub:'Soft Drink & Water', name:'Soda', pg:75000, pb:null },
    { id:'o41', cat:'other', sub:'Soft Drink & Water', name:'Tonic', pg:75000, pb:null },
    { id:'o42', cat:'other', sub:'Soft Drink & Water', name:'Fanta', pg:75000, pb:null },
    { id:'o43', cat:'other', sub:'Soft Drink & Water', name:'I-on Water 330ml', pg:60000, pb:null },
    { id:'o44', cat:'other', sub:'Soft Drink & Water', name:'Perrier Sparkling Water 330ml', pg:175000, pb:null },

    /* ════════ BEER ════════ */
    { id:'b01', cat:'beer', sub:'Beer', name:'Tiger Silver', pg:99000, pb:null },
    { id:'b02', cat:'beer', sub:'Beer', name:'Heineken', pg:105000, pb:null },
    { id:'b03', cat:'beer', sub:'Beer', name:'Halong Sapphire', pg:79000, pb:null },
    { id:'b04', cat:'beer', sub:'Beer', name:'Corona', pg:135000, pb:null },
    { id:'b05', cat:'beer', sub:'Beer', name:'Draft Beer Tiger Glass', pg:119000, pb:null },
    { id:'b06', cat:'beer', sub:'Beer', name:'Draft Beer Heineken Glass', pg:150000, pb:null },
    { id:'b07', cat:'beer', sub:'Beer', name:'Draft Beer Halong Sapphire Glass', pg:95000, pb:null },
    { id:'b08', cat:'beer', sub:'Beer', name:'Draft Beer Tiger Tower', pg:999000, pb:null },
    { id:'b09', cat:'beer', sub:'Beer', name:'Draft Beer Heineken Tower', pg:1199000, pb:null },
    { id:'b10', cat:'beer', sub:'Beer', name:'Draft Beer Halong Sapphire Tower', pg:699000, pb:null },
    { id:'b11', cat:'beer', sub:'Beer', name:'Soju Grapefruit', pg:350000, pb:null },
    { id:'b12', cat:'beer', sub:'Beer', name:'Soju Original', pg:350000, pb:null }
  ];

  /* ═══════ STATUS ═══════ */
  var STATUS = {
    pending:   { label: 'Chờ phục vụ', color: 'text-amber-400',  bg: 'bg-amber-500/15',  border: 'border-amber-500/40' },
    served:    { label: 'Đã phục vụ',   color: 'text-cyan-400',   bg: 'bg-cyan-500/15',   border: 'border-cyan-500/40' },
    received:  { label: 'Đã nhận',      color: 'text-indigo-400', bg: 'bg-indigo-500/15', border: 'border-indigo-500/40' },
    invoiced:  { label: 'Đã hóa đơn',   color: 'text-emerald-400',bg: 'bg-emerald-500/15',border: 'border-emerald-500/40' },
    cancelled: { label: 'Đã hủy',       color: 'text-red-400',    bg: 'bg-red-500/15',    border: 'border-red-500/40' }
  };

  var PIN = {
    cashier: '2222',
    manager: '451994'
  };

  return {
    TABLE_GROUPS: TABLE_GROUPS,
    CATEGORIES: CATEGORIES,
    SUBCATS: SUBCATS,
    MENU: MENU,
    STATUS: STATUS,
    PIN: PIN,
    getGroupByTable: getGroupByTable
  };
})();
