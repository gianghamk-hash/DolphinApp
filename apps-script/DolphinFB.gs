const DOLPHIN_TARGET_ID="1aZ34XVKqWwxMlOPSu6X0vApLT5DFxjDpza9fDRaXM2Q";
const SOURCE_SPREADSHEET_ID = "1tyJ48qlTF3BxIy8tauJL6hd-mPz69GQWJJBvsEOHwoI"; // TTK THÁNG 11.2026
const HEADERS = ["STT", "MÃ BKK", "Tên Đại lý", "HỌ TÊN", "Nhóm", "QUỐC TỊCH", "TABLE", "Thông tin kiêng chay", "Ghi Chú"];

const COL_STT = 0;   // Cột A: STT
const COL_BKK = 1;   // Cột B: MÃ BKK
const COL_AGENT = 2; // Cột C: Tên Đại lý
const COL_REP = 3;   // Cột D: HỌ TÊN
const COL_PAX = 4;   // Cột E: NHÓM (SỐ LƯỢNG KHÁCH)
const COL_NAT = 5;   // Cột F: QUỐC TỊCH
const COL_TABLE = 6; // Cột G: TABLE
const COL_DIET = 7;  // Cột H: Thông tin kiêng chay
const COL_NOTE = 8;  // Cột I: Ghi Chú

function removeVietnameseDiacritics(str) {
  if (!str) return "";
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase()
    .trim();
}

function findSheetColumns(rowValues) {
  const colMap = {
    stt: COL_STT,
    bkk: COL_BKK,
    agent: COL_AGENT,
    rep: COL_REP,
    group: COL_PAX,
    nat: COL_NAT,
    table: COL_TABLE,
    diet: COL_DIET,
    note: COL_NOTE
  };

  if (!rowValues) return colMap;

  rowValues.forEach((cell, idx) => {
    const norm = removeVietnameseDiacritics(cell);
    if (!norm) return;

    if (norm === "STT") {
      colMap.stt = idx;
    } else if (norm.includes("MA BKK") || norm.includes("CODE")) {
      colMap.bkk = idx;
    } else if (norm.includes("DAI LY") || norm.includes("DAI LI") || norm.includes("AGENT")) {
      colMap.agent = idx;
    } else if (norm.includes("QUOC TICH")) {
      colMap.nat = idx;
    } else if (norm.includes("TABLE") || norm.includes("BAN") && !norm.includes("DAT BAN")) {
      colMap.table = idx;
    } else if (norm.includes("KIENG CHAY") || norm.includes("AN CHAY") || norm.includes("CHAY")) {
      colMap.diet = idx;
    } else if (norm.includes("GHI CHU") || norm.includes("NOTE")) {
      colMap.note = idx;
    } else if (norm === "NHOM" || norm.includes("NHOM") || norm.includes("SO LUONG") || norm.includes("SO KHACH") || norm.includes("PAX") || norm === "SL" || norm.includes("SL KHACH")) {
      colMap.group = idx;
    } else if (norm.includes("HO TEN") || norm.includes("TEN KHACH") || norm.includes("KHACH") || norm.includes("SDT") || norm.includes("DAI DIEN")) {
      colMap.rep = idx;
    }
  });

  return colMap;
}

function parsePaxValue(val) {
  if (val === null || val === undefined || val === "") return 1;
  if (typeof val === "number") return val > 0 ? val : 1;
  const numMatch = String(val).match(/\d+/);
  if (numMatch) {
    const [numStr] = numMatch;
    const n = parseInt(numStr, 10);
    return n > 0 ? n : 1;
  }
  return 1;
}

function extractPaxFromText(text) {
  if (!text) return 0;
  const m = String(text).match(/(\d+)\s*(?:slots?|suất|pax|khách|người)\b/i);
  if (m) {
    const [_, numStr] = m;
    const n = parseInt(numStr, 10);
    if (n > 0 && n <= 100) return n;
  }
  return 0;
}

function resolveBookingPax(rawCellVal, noteText, bkkCode) {
  let pax = parsePaxValue(rawCellVal);
  if (pax <= 1) {
    const textPax = extractPaxFromText(noteText);
    if (textPax > 1) {
      pax = textPax;
    } else if (bkkCode && bkkCode.includes(" + ")) {
      const countBkk = bkkCode.split("+").length;
      if (countBkk > pax) pax = countBkk;
    }
  }
  return pax;
}

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("🐬 Dolphin F&B")
    .addItem("🗺️ SƠ ĐỒ BÀN TRỰC QUAN TƯƠNG TÁC (MAP 2D)", "showInteractiveTableMap")
    .addItem("💵 KIỂM SOÁT TIỀN THU TẠI TÀU & PHỤ THU", "showOnboardRevenueDialog")
    .addSeparator()
    .addItem("🔗 GỘP CÁC MÃ BKK ĐI CÙNG NHAU (SHEET NÀY)", "mergeLinkedBookingsCurrentSheet")
    .addItem("📊 XEM & SAO CHÉP THỐNG KÊ QUỐC TỊCH", "showNationalityStatsDialog")
    .addItem("📈 CẬP NHẬT BẢNG THỐNG KÊ (CỘT K)", "renderNationalityStatsCurrentSheet")
    .addItem("🎨 CĂN CHỈNH ĐỊNH DẠNG SHEET NÀY", "formatCurrentSheetUI")
    .addItem("🧹 Xóa cột TABLE để xếp lại từ đầu", "clearTableColumnCurrentSheet")
    .addSeparator()
    .addItem("Đồng bộ TẤT CẢ các sheet Dolphin", "syncAllDolphinSheets")
    .addItem("Chỉ đồng bộ các sheet hôm nay", "syncTodaySheets")
    .addSeparator()
    .addItem("Bật tự động cập nhật ngầm (Mỗi 15 phút)", "enableAutoSyncTrigger")
    .addItem("Tắt tự động cập nhật ngầm", "disableAutoSyncTrigger")
    .addToUi();
}

/**
 * Hàm trích xuất chính xác tất cả các mã BKK được ghi trong đoạn text
 * - Nhận diện mã đầy đủ: DP4629319, EVEDP4627221...
 * - Tự động giải mã các chuỗi viết tắt đuôi: DP462954+55+56+57+58+59 hoặc DP462955-57
 * - Khắc phục triệt để lỗi so sánh chuỗi con (không bao giờ gộp nhầm 462931 vào 4629315/4629319)
 */
function extractCandidateCodes(text) {
  const codes = new Set();
  if (!text) return codes;
  const upper = text.toUpperCase();

  // 1. Nhận diện các mã BKK đầy đủ (DP4629319, EVEDP4627221, IR462925...)
  const fullMatches = upper.match(/[A-Z]+\d{5,}/g);
  if (fullMatches) {
    fullMatches.forEach(c => codes.add(c));
  }

  // 2. Nhận diện chuỗi viết tắt đuôi (Ví dụ: DP462954+55+56+57+58+59 hoặc DP462954-55-56...)
  const chainRegex = /([A-Z]+\d+?)(\d{2})((?:[+\-\–\—\,\s]+\d{2})+)/g;
  let match;
  while ((match = chainRegex.exec(upper)) !== null) {
    const [fullChain, prefix, firstSuf, rest] = match;
    codes.add(prefix + firstSuf);

    // Xử lý dải số như 55-57 (55 đến 57)
    const rangeMatch = rest.match(/(\d{2})\s*[-–—]\s*(\d{2})/);
    if (rangeMatch) {
      const [fullRange, startStr, endStr] = rangeMatch;
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (start <= end && end - start <= 20) {
        for (let n = start; n <= end; n++) {
          codes.add(prefix + (n < 10 ? '0' + n : '' + n));
        }
      }
    }

    // Các số 2 chữ số rời rạc trong chuỗi
    const sufMatches = rest.match(/\d{2}/g);
    if (sufMatches) {
      sufMatches.forEach(s => codes.add(prefix + s));
    }
  }

  // 3. Nhận diện dải số trực tiếp dạng DP462954-59
  const directRangeRegex = /([A-Z]+\d+?)(\d{2})\s*[-–—]\s*(\d{2})/g;
  while ((match = directRangeRegex.exec(upper)) !== null) {
    const [fullDirect, prefix, startStr, endStr] = match;
    const start = parseInt(startStr, 10);
    const end = parseInt(endStr, 10);
    if (start <= end && end - start <= 20) {
      for (let n = start; n <= end; n++) {
        codes.add(prefix + (n < 10 ? '0' + n : '' + n));
      }
    }
  }

  return codes;
}

/**
 * =========================================================================
 * BỘ TỰ ĐỘNG RÀ SOÁT & GỘP NHIỀU MÃ BKK ĐI CÙNG NHAU VỀ MÃ ĐẦU TIÊN
 * =========================================================================
 */
function findLinkedBkkGroups(bookingsMap, bkkOrder) {
  const linkRegex = /(?:đi\s*(?:cùng|chung)|cùng\s*(?:nhóm|đoàn|bàn|code|mã|bkk)|ngồi\s*(?:cùng|chung)|ghép\s*(?:cùng|chung|bàn)|chung\s*(?:nhóm|đoàn|bàn)|xếp\s*cùng)/i;
  const adj = new Map();
  bkkOrder.forEach(bkk => adj.set(bkk, new Set()));

  bkkOrder.forEach(bkk => {
    const item = bookingsMap.get(bkk);
    const combinedText = (item.diet + " " + item.note).trim();

    if (linkRegex.test(combinedText)) {
      const extractedCodes = extractCandidateCodes(combinedText);
      extractedCodes.forEach(targetCode => {
        for (let otherBkk of bkkOrder) {
          if (otherBkk === bkk) continue;
          // SO SÁNH CHÍNH XÁC 100% TOÀN BỘ MÃ (Tuyệt đối không so sánh chuỗi con)
          if (otherBkk.toUpperCase() === targetCode) {
            adj.get(bkk).add(otherBkk);
            adj.get(otherBkk).add(bkk);
          }
        }
      });
    }
  });

  const visited = new Set();
  const mergedOrder = [];
  const mergedMap = new Map();

  bkkOrder.forEach(bkk => {
    if (visited.has(bkk)) return;

    // Tìm toàn bộ nhóm mã BKK liên thông với nhau (2, 3, 5 hay nhiều mã)
    const component = [];
    const queue = [bkk];
    visited.add(bkk);

    while (queue.length > 0) {
      const curr = queue.shift();
      component.push(curr);

      adj.get(curr).forEach(neighbor => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      });
    }

    // Luôn sắp xếp theo thứ tự xuất hiện ban đầu trong trang tính
    component.sort((a, b) => bkkOrder.indexOf(a) - bkkOrder.indexOf(b));

    if (component.length === 1) {
      mergedOrder.push(bkk);
      mergedMap.set(bkk, bookingsMap.get(bkk));
    } else {
      // LUÔN GOM TOÀN BỘ VỀ DUY NHẤT MÃ BKK ĐẦU TIÊN
      const [primaryBkk] = component;
      const primaryItem = bookingsMap.get(primaryBkk);
      const mergedBkkKey = component.join(" + ");

      // Cột Tên Đại lý: Nối các đại lý không trùng nhau
      const agents = Array.from(new Set(component.map(k => bookingsMap.get(k).agent).filter(Boolean)));
      const mergedAgent = agents.join(" + ");

      // Cột Họ và Tên: Chuẩn xác lấy theo tên khách của mã BKK đầu tiên
      const mergedRep = primaryItem.rep;

      // Cột Nhóm: Cộng tổng toàn bộ số khách của tất cả các mã đi cùng nhau
      let totalPax = 0;
      component.forEach(k => {
        totalPax += (parseInt(bookingsMap.get(k).group, 10) || 0);
      });

      // Cột Quốc tịch: Nối các quốc tịch không trùng nhau
      const natList = [];
      component.forEach(k => {
        const nats = bookingsMap.get(k).nationalities || [];
        nats.forEach(n => {
          if (n && !natList.includes(n)) natList.push(n);
        });
      });
      const mergedNatStr = natList.length > 0 ? natList.join(" + ") : (primaryItem.nationalityStr || "");

      // Cột Thông tin kiêng chay: Nối nội dung không trùng
      const diets = Array.from(new Set(component.map(k => bookingsMap.get(k).diet).filter(Boolean)));
      const mergedDiet = diets.join(" + ");

      // Cột Ghi chú: Nối nội dung không trùng
      const notes = Array.from(new Set(component.map(k => bookingsMap.get(k).note).filter(Boolean)));
      const mergedNote = notes.join(" + ");

      const mergedItem = {
        firstRowIdx: primaryItem.firstRowIdx,
        stt: primaryItem.stt,
        bkk: mergedBkkKey,
        agent: mergedAgent,
        rep: mergedRep,
        group: totalPax,
        nationalities: natList,
        nationalityStr: mergedNatStr,
        table: Array.from(new Set(component.map(k => bookingsMap.get(k).table).filter(Boolean))).join(","), // Giữ bàn khi gộp nhóm
        diet: mergedDiet,
        note: mergedNote,
        isMerged: true,
        mergedCount: component.length
      };

      mergedOrder.push(mergedBkkKey);
      mergedMap.set(mergedBkkKey, mergedItem);
    }
  });

  return { mergedOrder, mergedMap };
}


function mergeLinkedBookingsForSheet(sheet) {
  if (!sheet || !isDolphinSheet(sheet.getName())) return { success: false, message: "Không phải sheet Dolphin!" };
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: false, message: "Sheet chưa có dữ liệu booking!" };

  const rows = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  const bookingsMap = new Map();
  const bkkOrder = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const bkk = String(r[COL_BKK] || "").trim();
    if (!bkk) continue;
    bkkOrder.push(bkk);
    const rawNat = String(r[COL_NAT] || "").trim();
    const natList = rawNat.split("+").map(s => s.trim()).filter(Boolean);

    bookingsMap.set(bkk, {
      firstRowIdx: i,
      stt: r[COL_STT],
      bkk: bkk,
      agent: String(r[COL_AGENT] || "").trim(),
      rep: String(r[COL_REP] || "").trim(),
      group: r[COL_PAX],
      nationalityStr: rawNat,
      nationalities: natList,
      table: String(r[COL_TABLE] || "").trim(),
      diet: String(r[COL_DIET] || "").trim(),
      note: String(r[COL_NOTE] || "").trim()
    });
  }

  const { mergedOrder, mergedMap } = findLinkedBkkGroups(bookingsMap, bkkOrder);
  if (mergedOrder.length === bkkOrder.length) {
    return { success: true, count: 0, message: "Không tìm thấy mã BKK nào có ghi chú đi cùng nhau cần gộp." };
  }

  const finalRows = [];
  let sttCounter = 1;
  mergedOrder.forEach(key => {
    const item = mergedMap.get(key);
    finalRows.push([
      sttCounter++,
      item.bkk,
      item.agent,
      item.rep,
      item.group,
      item.nationalityStr,
      item.table,
      item.diet,
      cleanNoteText(item.note)
    ]);
  });

  sheet.getRange(2, 1, lastRow - 1, HEADERS.length).clearContent().clearFormat();
  sheet.getRange(2, 1, finalRows.length, HEADERS.length).setValues(finalRows);
  applyStandardFormatting(sheet, finalRows.length);
  
  const mergedCount = bkkOrder.length - mergedOrder.length;
  return { success: true, count: mergedCount, message: "Đã gộp " + mergedCount + " mã BKK đi cùng nhau và tự động xếp lại bàn!" };
}

function mergeLinkedBookingsCurrentSheetCore_() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const res = mergeLinkedBookingsForSheet(sheet);
  if (!res.success) {
    SpreadsheetApp.getUi().alert(res.message);
  } else if (res.count === 0) {
    SpreadsheetApp.getActiveSpreadsheet().toast(res.message, "Thông báo", 4);
  } else {
    SpreadsheetApp.getActiveSpreadsheet().toast(res.message, "Thành công", 5);
  }
}

function getZoneFromTable(tableStr) {
  if (!tableStr) return "CHƯA XẾP BÀN";
  const t = String(tableStr).trim().toUpperCase();
  if (t.includes("ABC LINE")) return "KHU ABC (LINE)";
  if (t.includes("A B LINE")) return "KHU AB (LINE)";
  if (t.includes("A LINE")) return "KHU A";
  if (t.includes("D LINE")) return "KHU D";
  
  // Tầng 2 & Phòng Lounge phân tách rõ ràng
  if (t.includes("LOUNGE") || t.startsWith("L") || /\bL\d+/i.test(t)) return "PHÒNG LOUNGE";
  if (t.includes("KHU J") || t.startsWith("J") || /\bJ\d+/i.test(t)) return "KHU J";
  if (t.includes("KHU Q") || t.startsWith("Q") || /\bQ\d+/i.test(t)) return "KHU Q";

  const firstChar = t.charAt(0);
  if (firstChar === 'A') return "KHU A";
  if (firstChar === 'E') return "KHU E";
  if (firstChar === 'B') return "KHU B";
  if (firstChar === 'D') return "KHU D";
  if (firstChar === 'C') return "KHU C";
  if (firstChar === 'J') return "KHU J";
  if (firstChar === 'Q') return "KHU Q";
  if (firstChar === 'L') return "PHÒNG LOUNGE";
  if (t.includes("TẦNG 2") || t.includes("TANG 2") || t.includes("T2")) return "TẦNG 2 (CHUNG)";
  return "KHU KHÁC";
}

function getNationalityAndZoneStats(rows) {
  const natBkkMap = new Map();
  const natPaxMap = new Map();
  const zoneStats = new Map();
  const zonePaxMap = new Map();
  const bkkSeen = new Set();
  let totalBkk = 0;
  let totalPax = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const bkk = String(row[COL_BKK] || "").trim();
    if (!bkk) continue;

    if (bkkSeen.has(bkk)) continue;
    bkkSeen.add(bkk);

    const pax = parseInt(row[COL_PAX], 10) || 1;
    totalBkk++;
    totalPax += pax;

    let rawNat = String(row[COL_NAT] || "").trim();
    if (!rawNat) rawNat = "CHƯA RÕ";

    const tableStr = String(row[COL_TABLE] || "").trim();
    const zone = getZoneFromTable(tableStr);

    zonePaxMap.set(zone, (zonePaxMap.get(zone) || 0) + pax);
    if (!zoneStats.has(zone)) {
      zoneStats.set(zone, new Map());
    }
    const zoneMap = zoneStats.get(zone);

    const nats = Array.from(new Set(rawNat.split("+").map(s => s.trim().toUpperCase()).filter(s => s.length > 0)));
    if (nats.length === 0) nats.push("CHƯA RÕ");

    nats.forEach(n => {
      natBkkMap.set(n, (natBkkMap.get(n) || 0) + 1);
      natPaxMap.set(n, (natPaxMap.get(n) || 0) + pax);

      zoneMap.set(n, (zoneMap.get(n) || 0) + 1);
    });
  }

  const sortedOverallNat = Array.from(natBkkMap.entries()).sort(([nA, cA], [nB, cB]) => cB - cA);

  const zoneOrder = ["KHU A", "KHU E", "KHU B", "KHU D", "KHU C", "KHU ABC (LINE)", "KHU J", "KHU Q", "PHÒNG LOUNGE", "TẦNG 2 (CHUNG)", "CHƯA XẾP BÀN", "KHU KHÁC"];
  const sortedZones = Array.from(zoneStats.keys()).sort((a, b) => {
    const idxA = zoneOrder.indexOf(a);
    const idxB = zoneOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  return { sortedOverallNat, natPaxMap, sortedZones, zoneStats, zonePaxMap, totalBkk, totalPax };
}

function showNationalityStatsDialog() {
  const sheet = SpreadsheetApp.getActiveSheet();
  if (!isDolphinSheet(sheet.getName())) {
    SpreadsheetApp.getUi().alert("Vui lòng mở một sheet Dolphin để xem thống kê quốc tịch!");
    return;
  }
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert("Sheet hiện tại chưa có dữ liệu booking!");
    return;
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  const { sortedOverallNat, natPaxMap, sortedZones, zoneStats, zonePaxMap, totalBkk, totalPax } = getNationalityAndZoneStats(rows);

  let textLines = [];
  textLines.push("📊 BÁO CÁO THỐNG KÊ QUỐC TỊCH - " + sheet.getName().toUpperCase());
  textLines.push("============================================");
  textLines.push("📍 1. ĐẾM QUỐC TỊCH THEO TỪNG KHU VỰC:");
  sortedZones.forEach(z => {
    const zMap = zoneStats.get(z);
    const parts = Array.from(zMap.entries())
      .sort(([nA, cA], [nB, cB]) => cB - cA)
      .map(([n, c]) => c + " " + n);
    const zPax = zonePaxMap.get(z) || 0;
    textLines.push("• " + z + " : " + parts.join(" + ") + " (" + zPax + " Pax)");
  });

  textLines.push("--------------------------------------------");
  textLines.push("🌐 2. TỔNG SỐ LƯỢNG QUỐC TỊCH THEO NGÀY:");
  sortedOverallNat.forEach(([nat, cnt]) => {
    const cntStr = cnt < 10 ? "0" + cnt : cnt;
    const p = natPaxMap.get(nat) || 0;
    const pStr = p < 10 ? "0" + p : p;
    textLines.push("- " + nat + " : " + cntStr + " BKK (" + pStr + " Pax)");
  });
  textLines.push("--------------------------------------------");
  textLines.push("👉 TỔNG CỘNG TOÀN TÀU: " + totalBkk + " BKK | " + totalPax + " KHÁCH (PAX)");

  const fullText = textLines.join("\n");

  const htmlOutput = HtmlService.createHtmlOutput(
    '<!DOCTYPE html>' +
    '<html>' +
    '<head>' +
    '  <base target="_top">' +
    '  <style>' +
    '    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 16px; margin: 0; background: #ffffff; color: #202124; }' +
    '    h3 { margin-top: 0; color: #1a73e8; font-size: 16px; border-bottom: 2px solid #e8eaed; padding-bottom: 8px; }' +
    '    pre { background: #f8f9fa; border: 1px solid #dadce0; border-radius: 6px; padding: 12px; font-family: "Courier New", monospace; font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word; color: #202124; }' +
    '    .btn { background: #1a73e8; color: white; border: none; padding: 10px 18px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 13px; transition: background 0.2s; }' +
    '    .btn:hover { background: #1557b0; }' +
    '    .copied { color: #137333; font-weight: bold; margin-left: 10px; display: none; font-size: 13px; }' +
    '  </style>' +
    '</head>' +
    '<body>' +
    '  <h3>📊 BÁO CÁO THỐNG KÊ QUỐC TỊCH THEO KHU VỰC & THEO NGÀY</h3>' +
    '  <pre id="statText">' + fullText + '</pre>' +
    '  <button class="btn" onclick="copyText()">📋 Sao Chép Tin Nhắn (Gửi Zalo)</button>' +
    '  <span id="copiedMsg" class="copied">✓ Đã sao chép!</span>' +
    '  <script>' +
    '    function copyText() {' +
    '      const text = document.getElementById("statText").innerText;' +
    '      navigator.clipboard.writeText(text).then(() => {' +
    '        const msg = document.getElementById("copiedMsg");' +
    '        msg.style.display = "inline";' +
    '        setTimeout(() => { msg.style.display = "none"; }, 3000);' +
    '      });' +
    '    }' +
    '  </script>' +
    '</body>' +
    '</html>'
  ).setWidth(500).setHeight(500);

  SpreadsheetApp.getUi().showModalDialog(htmlOutput, "Báo Cáo Quốc Tịch Dolphin");
}

function renderNationalitySummaryTable(sheet, rows) {
  if (!sheet || rows.length === 0) return;

  const currentMaxCols = sheet.getMaxColumns();
  if (currentMaxCols < 13) {
    sheet.insertColumnsAfter(currentMaxCols, 13 - currentMaxCols);
  }

  sheet.getRange(1, 10, sheet.getMaxRows(), 1).clearContent().clearFormat();
  sheet.setColumnWidth(10, 30);

  const maxRows = Math.max(sheet.getMaxRows(), 50);
  sheet.getRange(1, 11, maxRows, 3).clearContent().clearFormat();

  const { sortedOverallNat, natPaxMap, sortedZones, zoneStats, zonePaxMap, totalBkk, totalPax } = getNationalityAndZoneStats(rows);
  if (sortedOverallNat.length === 0) return;

  // 1. BẢNG 1: TỔNG SỐ LƯỢNG QUỐC TỊCH THEO NGÀY
  const t1Values = [];
  t1Values.push(["📊 TỔNG SỐ LƯỢNG QUỐC TỊCH THEO NGÀY", "", ""]);
  t1Values.push(["QUỐC TỊCH", "SỐ BKK", "SỐ PAX"]);

  sortedOverallNat.forEach(([nat, cnt]) => {
    const cntStr = cnt < 10 ? "0" + cnt + " BKK" : cnt + " BKK";
    const paxCount = natPaxMap.get(nat) || 0;
    const paxStr = paxCount < 10 ? "0" + paxCount + " Pax" : paxCount + " Pax";
    t1Values.push([nat, cntStr, paxStr]);
  });
  t1Values.push(["TỔNG CỘNG TOÀN TÀU", (totalBkk < 10 ? "0" + totalBkk : totalBkk) + " BKK", totalPax + " Pax"]);

  const t1Rows = t1Values.length;
  const t1Range = sheet.getRange(1, 11, t1Rows, 3);
  t1Range.setValues(t1Values);
  t1Range.setFontFamily("Times New Roman").setFontSize(14).setVerticalAlignment("middle");

  sheet.getRange(1, 11, 1, 3).merge().setFontWeight("bold").setHorizontalAlignment("center").setBackground("#D9EAD3");
  sheet.getRange(2, 11, 1, 3).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#EAEAEA");

  if (sortedOverallNat.length > 0) {
    sheet.getRange(3, 11, sortedOverallNat.length, 1).setHorizontalAlignment("center").setFontWeight("bold");
    sheet.getRange(3, 12, sortedOverallNat.length, 2).setHorizontalAlignment("center");
  }

  sheet.getRange(t1Rows, 11, 1, 3).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#FFF2CC");
  t1Range.setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID);

  // 2. BẢNG 2: ĐẾM QUỐC TỊCH THEO TỪNG KHU VỰC
  const t2StartRow = t1Rows + 2;
  const t2Values = [];
  t2Values.push(["📍 ĐẾM QUỐC TỊCH THEO TỪNG KHU VỰC", "", ""]);
  t2Values.push(["KHU VỰC", "CHI TIẾT QUỐC TỊCH (SỐ BKK)", "TỔNG PAX"]);

  sortedZones.forEach(z => {
    const zMap = zoneStats.get(z);
    const parts = Array.from(zMap.entries())
      .sort(([nA, cA], [nB, cB]) => cB - cA)
      .map(([n, c]) => c + " " + n);
    const zPax = zonePaxMap.get(z) || 0;
    t2Values.push([z, parts.join(" + "), zPax + " Pax"]);
  });

  const t2Rows = t2Values.length;
  const t2Range = sheet.getRange(t2StartRow, 11, t2Rows, 3);
  t2Range.setValues(t2Values);
  t2Range.setFontFamily("Times New Roman").setFontSize(14).setVerticalAlignment("middle");

  sheet.getRange(t2StartRow, 11, 1, 3).merge().setFontWeight("bold").setHorizontalAlignment("center").setBackground("#C9DAF8");
  sheet.getRange(t2StartRow + 1, 11, 1, 3).setFontWeight("bold").setHorizontalAlignment("center").setBackground("#EAEAEA");

  if (sortedZones.length > 0) {
    sheet.getRange(t2StartRow + 2, 11, sortedZones.length, 1).setHorizontalAlignment("center").setFontWeight("bold");
    sheet.getRange(t2StartRow + 2, 12, sortedZones.length, 1).setHorizontalAlignment("left").setWrap(true);
    sheet.getRange(t2StartRow + 2, 13, sortedZones.length, 1).setHorizontalAlignment("center");
  }

  t2Range.setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID);

  sheet.autoResizeColumn(11);
  sheet.autoResizeColumn(12);
  sheet.autoResizeColumn(13);
}

function renderNationalityStatsCurrentSheet() {
  const sheet = SpreadsheetApp.getActiveSheet();
  if (!isDolphinSheet(sheet.getName())) {
    SpreadsheetApp.getUi().alert("Vui lòng mở một sheet Dolphin để cập nhật bảng thống kê!");
    return;
  }
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert("Sheet chưa có dữ liệu booking!");
    return;
  }
  const rows = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  renderNationalitySummaryTable(sheet, rows);
  SpreadsheetApp.getActiveSpreadsheet().toast("Đã cập nhật Bảng thống kê quốc tịch tại Cột K - L - M!", "Thành công", 4);
}

function applyStandardFormatting(sheet, numRows) {
  if (!sheet || numRows < 1) return;

  sheet.getRange(1, 1, 1, HEADERS.length)
    .setFontFamily("Times New Roman")
    .setFontSize(14)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setBackground("#EAEAEA");

  const dataRange = sheet.getRange(2, 1, numRows, HEADERS.length);
  dataRange.setVerticalAlignment("middle")
    .setFontFamily("Times New Roman")
    .setFontSize(14)
    .setWrap(true);

  sheet.getRange(2, 1, numRows, 1).setHorizontalAlignment("center");
  sheet.getRange(2, 2, numRows, 1).setFontWeight("bold");

  const nameRange = sheet.getRange(2, 4, numRows, 1);
  nameRange.setFontColor("#CC0000");
  nameRange.setBackground("#FCE5CD");

  const groupRange = sheet.getRange(2, 5, numRows, 1);
  groupRange.setHorizontalAlignment("center");
  groupRange.setFontWeight("bold");

  const tableRange = sheet.getRange(2, 7, numRows, 1);
  tableRange.setHorizontalAlignment("center");
  tableRange.setFontWeight("bold");

  const dietRange = sheet.getRange(2, 8, numRows, 1);
  dietRange.setFontColor("#FF0000");

  const fullTableRange = sheet.getRange(1, 1, numRows + 1, HEADERS.length);
  fullTableRange.setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID);

  // Rà soát & định dạng bôi đậm (Có kayak) / in nghiêng (Không kayak) tại Cột Ghi Chú
  formatNoteColumnStyles(sheet, numRows);
}

function formatCurrentSheetUI() {
  const sheet = SpreadsheetApp.getActiveSheet();
  if (!isDolphinSheet(sheet.getName())) {
    SpreadsheetApp.getUi().alert("Vui lòng mở một sheet Dolphin để căn chỉnh định dạng!");
    return;
  }
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    // 1. Dọn dẹp nội dung cột Ghi Chú (Xóa Đón/trả bến, Bus 2 chiều)
    const noteRange = sheet.getRange(2, 9, lastRow - 1, 1);
    const noteVals = noteRange.getValues();
    const cleanedVals = noteVals.map(r => [cleanNoteText(r[0])]);
    noteRange.setValues(cleanedVals);

    // 2. Căn chỉnh định dạng chuẩn & bôi đậm (Có kayak) / in nghiêng (Không kayak)
    applyStandardFormatting(sheet, lastRow - 1);

    // 3. Cập nhật bảng thống kê quốc tịch
    const rows = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
    renderNationalitySummaryTable(sheet, rows);

    SpreadsheetApp.getActiveSpreadsheet().toast("Đã căn chỉnh định dạng chuẩn & cập nhật Ghi chú cho sheet: " + sheet.getName(), "Thành công", 4);
  }
}

function isCancelledInSource(noteStr) {
  if (!noteStr) return false;
  const s = String(noteStr).toLowerCase();
  return /(?:đã|da)\s*(?:hủy|huỷ|huy)/i.test(s) || /[\(\[]\s*hủy\s*[\)\]]/i.test(s);
}

/**
 * =========================================================================
 * BỘ XỬ LÝ & RÀ SOÁT CỘT GHI CHÚ (NOTE PROCESSOR)
 * - Tự động xóa bỏ các cụm: "Đón/trả bến", "Bus 2 chiều"
 * - Bôi đậm (Bold): Dòng có nội dung "Có kayak/bamboo đã thanh toán"
 * - In nghiêng (Italic): Dòng có nội dung "Không kayak/bamboo"
 * =========================================================================
 */
function cleanNoteText(rawNote) {
  if (!rawNote) return "";
  let text = String(rawNote).normalize("NFC").replace(/\\n/g, "\n").trim();
  
  // 1. Xóa các biến thể: Đón/trả bến, Đón trả bến, Đón bến, Trả bến, Đón trả tại cảng...
  const removeDonTra = /(?<!\p{L})(?:đón|don)\s*(?:[\/\-–—,]\s*)?(?:trả|tra)?\s*(?:tại\s*)?(?:bến|cảng|ben|cang)(?!\p{L})|(?<!\p{L})(?:đón|don)\s*[\/\-–—,]\s*(?:trả|tra)(?!\p{L})|(?<!\p{L})trả\s*bến(?!\p{L})/giu;
  text = text.replace(removeDonTra, "");

  // 2. Xóa các biến thể: Bus 2 chiều, Bus hai chiều, Xe 2 chiều, Xe hai chiều, Bus 2c...
  const removeBus2c = /(?<!\p{L})(?:bus|xe)\s*(?:2|hai)\s*chiều(?!\p{L})|(?<!\p{L})(?:bus|xe)\s*(?:2|hai)\s*chieu(?!\p{L})|(?<!\p{L})(?:2|hai)\s*chiều\s*(?:bus|xe)(?!\p{L})|(?<!\p{L})(?:bus|xe)\s*2c(?!\p{L})/giu;
  text = text.replace(removeBus2c, "");

  // 3. Dọn dẹp khoảng trắng, dấu phẩy, dấu gạch ngang đầu/cuối và ở giữa
  const lines = text.split(/\r?\n/);
  const cleanedLines = [];

  for (let line of lines) {
    let l = line.trim();
    l = l.replace(/^[\s,;–\-—•|/]+/, "");
    l = l.replace(/[\s,;–\-—•|/]+$/, "");
    l = l.replace(/[\s,;–\-—•|/]{2,}/g, ", ");
    l = l.replace(/\s*,\s*/g, ", ");
    l = l.replace(/^,\s*/, "").replace(/,\s*$/, "").trim();
    if (l.length > 0) {
      cleanedLines.push(l);
    }
  }

  return cleanedLines.join("\n").trim();
}

function formatNoteColumnStyles(sheet, numRows) {
  if (!sheet || numRows < 1) return;
  const noteRange = sheet.getRange(2, 9, numRows, 1);
  const noteValues = noteRange.getValues();
  
  const boldStyle = SpreadsheetApp.newTextStyle().setBold(true).setItalic(false).build();
  const italicStyle = SpreadsheetApp.newTextStyle().setBold(false).setItalic(true).build();
  const normalStyle = SpreadsheetApp.newTextStyle().setBold(false).setItalic(false).build();

  const noKayakRegex = /(?:không|khong|ko|\bk\b)\s*(?:dùng|dung|đi|di|có|co)?\s*(?:kayak|bamboo)/i;
  const hasKayakRegex = /(?:có|co)\s*(?:kayak|bamboo)|(?:kayak|bamboo)[^\n]*(?:đã|da)\s*(?:thanh\s*toán|thanh\s*toan)|(?:kayak|bamboo)/i;

  const richTextValues = [];
  const fontWeights = [];
  const fontStyles = [];

  for (let i = 0; i < numRows; i++) {
    const rawVal = String(noteValues[i][0] || "").normalize("NFC").trim();
    if (!rawVal) {
      richTextValues.push([SpreadsheetApp.newRichTextValue().setText("").build()]);
      fontWeights.push(["normal"]);
      fontStyles.push(["normal"]);
      continue;
    }

    const builder = SpreadsheetApp.newRichTextValue().setText(rawVal);
    const lines = rawVal.split("\n");
    let currentIdx = 0;
    let cellWeight = "normal";
    let cellStyle = "normal";

    lines.forEach(line => {
      const len = line.length;
      if (len > 0) {
        if (noKayakRegex.test(line)) {
          builder.setTextStyle(currentIdx, currentIdx + len, italicStyle);
          cellStyle = "italic";
        } else if (hasKayakRegex.test(line)) {
          builder.setTextStyle(currentIdx, currentIdx + len, boldStyle);
          cellWeight = "bold";
        } else {
          builder.setTextStyle(currentIdx, currentIdx + len, normalStyle);
        }
      }
      currentIdx += len + 1;
    });

    richTextValues.push([builder.build()]);
    fontWeights.push([cellWeight]);
    fontStyles.push([cellStyle]);
  }

  try {
    noteRange.setRichTextValues(richTextValues);
  } catch (e) {
    noteRange.setFontWeights(fontWeights);
    noteRange.setFontStyles(fontStyles);
  }
}

function cleanGuestName(rawStr) {
  if (!rawStr) return "";
  let lines = String(rawStr).split("\n");
  let cleanedLines = lines.map(line => {
    let s = line;
    s = s.replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, "");
    s = s.replace(/\([^)]*(liên\s*hệ|contact)[^)]*\)/gi, " ");
    s = s.replace(/(driver|tài xế|xe)\s*[:\s–\-]*[^\d\n]+/gi, " ");
    s = s.replace(/\b(sđt|sdt|đt|dt|số điện thoại|phone\s*number|phone|tel|mobile|wechat|contact|email|mail|zalo|app)\b[\s:–\-\.]*/gi, " ");
    s = s.replace(/\+?\d[\d\s\-\.\/]{5,}\d/g, " ");
    s = s.replace(/\b\d{6,15}\b/g, " ");
    s = s.replace(/[\-–—\:\/\+\•\(\)\,\.]+/g, " ");
    s = s.replace(/\s+/g, " ").trim();
    s = s.replace(/\s+ạ$/i, "");
    return s.trim();
  }).filter(l => l.length > 0);

  return cleanedLines.join("\n");
}

function isDolphinSheet(sheetName) {
  const upper = sheetName.trim().toUpperCase();
  if (upper.includes("IRIS")) return false;
  if (upper.includes("BẢN SAO") || upper.includes("BAN SAO")) return false;
  if (upper.includes("MẪU") || upper.includes("MAU")) return false;
  if (upper.includes("LỊCH SỬ") || upper.includes("LICH SU")) return false;
  return upper.includes("DOLPHIN");
}

function syncAllDolphinSheetsCore_() {
  const targetSpreadsheet = SpreadsheetApp.openById(DOLPHIN_TARGET_ID);

  let sourceSpreadsheet;
  try {
    sourceSpreadsheet = SpreadsheetApp.openById(SOURCE_SPREADSHEET_ID);
  } catch (e) {
    throw new Error("Không thể mở file nguồn. Vui lòng kiểm tra quyền truy cập.");
  }

  const sourceSheets = sourceSpreadsheet.getSheets();
  let count = 0;

  for (let srcSheet of sourceSheets) {
    if (srcSheet.isSheetHidden()) continue;

    const sheetName = srcSheet.getName().trim();
    if (!isDolphinSheet(sheetName)) continue;

    let targetSheet = targetSpreadsheet.getSheetByName(sheetName);
    if (!targetSheet) {
      targetSheet = targetSpreadsheet.insertSheet(sheetName);
      targetSheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
        .setFontWeight("bold")
        .setBackground("#F3F3F3")
        .setHorizontalAlignment("center");
      targetSheet.setFrozenRows(1);
    }

    syncSingleSheet(srcSheet, targetSheet);
    count++;
  }

  SpreadsheetApp.flush();
  return {ok:true,count:count};
}

function syncTodaySheetsCore_() {
  const todayStr = Utilities.formatDate(new Date(), "GMT+7", "dd.MM");
  const targetSpreadsheet = SpreadsheetApp.openById(DOLPHIN_TARGET_ID);
  let sourceSpreadsheet = SpreadsheetApp.openById(SOURCE_SPREADSHEET_ID);
  const sourceSheets = sourceSpreadsheet.getSheets();

  for (let srcSheet of sourceSheets) {
    if (srcSheet.isSheetHidden()) continue;
    const sheetName = srcSheet.getName().trim();
    if (!isDolphinSheet(sheetName) || !sheetName.includes(todayStr)) continue;

    let targetSheet = targetSpreadsheet.getSheetByName(sheetName);
    if (!targetSheet) {
      targetSheet = targetSpreadsheet.insertSheet(sheetName);
      targetSheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
        .setFontWeight("bold")
        .setBackground("#F3F3F3")
        .setHorizontalAlignment("center");
      targetSheet.setFrozenRows(1);
    }

    syncSingleSheet(srcSheet, targetSheet);
  }
}

function syncSingleSheet(sourceSheet, targetSheet) {
  const sourceRange = sourceSheet.getDataRange();
  const sourceData = sourceRange.getValues();
  if (sourceData.length < 2) return;

  let headerRowIdx = -1;
  let colMap = {};
  for (let r = 0; r < Math.min(10, sourceData.length); r++) {
    const row = sourceData.at(r).map(cell => String(cell).trim().toUpperCase());
    if (row.includes("MÃ BKK") || row.includes("MA BKK")) {
      headerRowIdx = r;
      row.forEach((header, idx) => {
        if (header.includes("STT")) colMap.stt = idx;
        else if (header.includes("MÃ BKK") || header.includes("MA BKK")) colMap.bkk = idx;
        else if (header.includes("TÊN ĐẠI LÝ") || header.includes("TÊN ĐẠI LÍ")) colMap.agent = idx;
        else if (header.includes("SĐT CỦA 1 KHÁCH ĐẠI DIỆN") || header.includes("SĐT")) colMap.rep = idx;
        else if (header === "NHÓM" || header === "NHOM") colMap.group = idx;
        else if (header.includes("QUỐC TỊCH") || header.includes("QUOC TICH")) colMap.nationality = idx;
        else if (header.includes("KIÊNG CHAY") || header.includes("ĂN CHAY")) colMap.diet = idx;
        else if (header.includes("GHI CHÚ") || header.includes("GHI CHU")) colMap.note = idx;
      });
      break;
    }
  }

  if (headerRowIdx === -1 || colMap.bkk === undefined) throw new Error("Không tìm thấy cột MÃ BKK: " + sourceSheet.getName());

  const sourceBookingsMap = new Map();
  const cancelledBkkSet = new Set();
  const sourceBkkOrder = [];
  let currentBkk = null;

  for (let r = headerRowIdx + 1; r < sourceData.length; r++) {
    const row = sourceData.at(r);
    const bkkVal = String(row.at(colMap.bkk) || "").trim();
    if (bkkVal) currentBkk = bkkVal;
    if (!currentBkk) continue;

    const noteVal = colMap.note !== undefined ? String(row.at(colMap.note) || "").trim() : "";
    const dietVal = colMap.diet !== undefined ? String(row.at(colMap.diet) || "").trim() : "";

    if (isCancelledInSource(noteVal) || isCancelledInSource(dietVal)) {
      cancelledBkkSet.add(currentBkk);
      sourceBookingsMap.delete(currentBkk);
      continue;
    }
    if (cancelledBkkSet.has(currentBkk)) continue;

    const natVal = colMap.nationality !== undefined ? String(row.at(colMap.nationality) || "").trim() : "";

    if (!sourceBookingsMap.has(currentBkk)) {
      sourceBkkOrder.push(currentBkk);
      const rawRep = colMap.rep !== undefined ? String(row.at(colMap.rep) || "").trim() : "";
      sourceBookingsMap.set(currentBkk, {
        firstRowIdx: r,
        stt: colMap.stt !== undefined ? row.at(colMap.stt) : "",
        bkk: currentBkk,
        agent: colMap.agent !== undefined ? String(row.at(colMap.agent) || "").trim() : "",
        rep: cleanGuestName(rawRep),
        group: colMap.group !== undefined ? row.at(colMap.group) : "",
        nationalities: [],
        diet: dietVal,
        note: noteVal
      });
    }

    const bkkObj = sourceBookingsMap.get(currentBkk);
    if (natVal && !bkkObj.nationalities.includes(natVal)) {
      bkkObj.nationalities.push(natVal);
    }
    if (!bkkObj.agent && colMap.agent !== undefined && row.at(colMap.agent)) bkkObj.agent = String(row.at(colMap.agent)).trim();
    if (!bkkObj.rep && colMap.rep !== undefined && row.at(colMap.rep)) {
      bkkObj.rep = cleanGuestName(String(row.at(colMap.rep)));
    }
    if (!bkkObj.group && colMap.group !== undefined && row.at(colMap.group)) bkkObj.group = row.at(colMap.group);
    if (!bkkObj.diet && dietVal) bkkObj.diet = dietVal;
    if (!bkkObj.note && noteVal) bkkObj.note = noteVal;
  }

  sourceBookingsMap.forEach(item => {
    item.nationalityStr = item.nationalities.join(" + ");
  });

  // TỰ ĐỘNG GỘP TẤT CẢ CÁC MÃ BKK ĐI CÙNG NHAU VỀ DUY NHẤT MÃ ĐẦU TIÊN
  const { mergedOrder, mergedMap } = findLinkedBkkGroups(sourceBookingsMap, sourceBkkOrder.filter(k => sourceBookingsMap.has(k)));

  const lastRow = targetSheet.getLastRow();
  const existingTables = new Map();

  if (lastRow > 1) {
    const existingValues = targetSheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
    for (let i = 0; i < existingValues.length; i++) {
      const rowItem = existingValues.at(i);
      const bkk = String(rowItem.at(COL_BKK) || "").trim();
      let tableVal = String(rowItem.at(COL_TABLE) || "").trim();

      if (tableVal.includes(",") && (tableVal.includes("DP") || tableVal.includes("Travel") || tableVal.includes("Việt Nam"))) {
        tableVal = "";
      }

      if (bkk && tableVal) {
        existingTables.set(bkk, tableVal);
      }
    }
  }

  const finalRows = [];
  let sttCounter = 1;

  for (let bkk of mergedOrder) {
    if (cancelledBkkSet.has(bkk) || !mergedMap.has(bkk)) continue;

    const src = mergedMap.get(bkk);
    const tableVal = preserveDolphinTable_(bkk, existingTables);

    const rowValues = [
      sttCounter++,
      src.bkk,
      src.agent,
      src.rep,
      src.group,
      src.nationalityStr,
      tableVal,
      src.diet,
      cleanNoteText(src.note)
    ];

    finalRows.push(rowValues);
  }

  if (lastRow > 1) {
    targetSheet.getRange(2, 1, lastRow - 1, HEADERS.length)
      .clearContent()
      .clearFormat();
  }

  if (finalRows.length > 0) {
    const range = targetSheet.getRange(2, 1, finalRows.length, HEADERS.length);
    range.setValues(finalRows);
    applyStandardFormatting(targetSheet, finalRows.length);

    // Tự động cập nhật 2 bảng thống kê quốc tịch
    renderNationalitySummaryTable(targetSheet, finalRows);
  }
}

/**
 * =========================================================================
 * MODULE 1: BẢNG KIỂM SOÁT TIỀN THU TẠI TÀU & PHỤ THU DỊCH VỤ PHÁT SINH
 * =========================================================================
 */
function parseOnboardRevenueFromText(noteText) {
  if (!noteText) return [];
  // Tách dòng theo cả xuống dòng thực tế, xuống dòng ký tự \n, dấu chấm phẩy, hoặc dấu gạch đứng
  const lines = String(noteText).replace(/\\n/g, "\n").split(/\n|;|\r/);
  const results = [];
  const ignoreRegex = /(?:đã\s*(?:thu|thanh\s*toán)|da\s*(?:thu|thanh\s*toan)|đầu\s*hn\s*đã\s*thu)/i;
  const isTotalRegex = /(?:=>\s*)?(?:tổng|tong)\s*(?:cả\s*nhóm|nhóm|cộng|cong|tiền|phải)?\s*(?:thu)?/i;

  let grandTotalItem = null;

  lines.forEach(line => {
    let s = line.trim();
    if (!s) return;

    // Bỏ qua nếu đã thanh toán / đã thu trước đầu HN (trừ khi có ghi rõ "tại tàu" / "trên tàu")
    if (ignoreRegex.test(s) && !s.toLowerCase().includes("trên tàu") && !s.toLowerCase().includes("tại tàu")) {
      return;
    }

    // Loại bỏ các từ tiếng Việt dễ gây bắt nhầm chữ "thu" (thuộc, thuê, thuyền, thuốc, thứ...)
    // Hoặc cụm từ điều kiện "tùy thuộc vào", "phụ thuộc vào", "miễn phí nâng hạng"
    const cleanedLine = s.replace(/(?:tùy|phụ)?\s*thuộc(?:\s*vào)?/gi, " ")
                         .replace(/\b(?:thuê|thuyền|thuốc|thứ)\b/gi, " ");

    // Regex bắt tiền thu:
    // 1. Phải là từ "thu", "phụ thu", "tổng thu", "tổng" đứng độc lập (unicode boundary)
    // 2. Khoảng cách giữa chữ "thu" và số tiền không được quá 25 ký tự
    const regex = /(?<!\p{L})(?:thu|phụ\s*thu|phu\s*thu|tổng\s*(?:cả\s*nhóm\s*)?thu|tổng|tong)(?!\p{L})[^\d\n]{0,25}?(\d+(?:[\.,]\d+)?)\s*(k|vnd|đ|d|triệu|tr)?(?!\p{L})/iu;
    const match = cleanedLine.match(regex);

    if (match) {
      const [fullM, numStr, unitRaw] = match;
      const unit = (unitRaw || "").toLowerCase();
      let amount = 0;

      if (unit === "k") {
        const val = parseFloat(numStr.replace(/[\.,]/g, ""));
        amount = val * 1000;
      } else if (unit === "triệu" || unit === "tr") {
        const val = parseFloat(numStr.replace(/,/g, "."));
        amount = val * 1000000;
      } else {
        const clean = parseFloat(numStr.replace(/[\.,]/g, ""));
        // Nếu số quá nhỏ (< 20) và không có đơn vị k/tr -> chắc chắn là số tầng (tầng 2), số chiều (2 chiều), số lượng khách (2 khách)...
        if (clean < 20) {
          amount = 0;
        } else if (clean < 10000 && clean >= 20) {
          // Ghi tắt dạng 200 (200k), 500 (500k)
          amount = clean * 1000;
        } else {
          amount = clean;
        }
      }

      if (amount >= 10000) { // Số tiền thu tại tàu tối thiểu là 10.000 đ
        const isTotalLine = isTotalRegex.test(s) && (s.toLowerCase().includes("tổng") || s.toLowerCase().includes("tong"));
        const itemObj = {
          content: s.replace(/^[-–•\*\s=>]+/, "").trim(),
          amount: amount,
          amountFormatted: amount.toLocaleString("vi-VN") + " đ",
          isTotalLine: isTotalLine
        };

        if (isTotalLine) {
          grandTotalItem = itemObj;
        } else {
          results.push(itemObj);
        }
      }
    }
  });

  // NẾU RESA ĐÃ NOTE DÒNG TỔNG TIỀN (VD: "Tổng cả nhóm thu 908k tại tàu" hoặc "=> Tổng: 4500k"):
  // CHỈ LẤY DUY NHẤT SỐ TIỀN TỔNG ĐÓ, TUYỆT ĐỐI KHÔNG CỘNG DỒN CÁC KHOẢN CON ĐỂ TRÁNH LỆCH TIỀN
  if (grandTotalItem) {
    const subDetails = results.map(r => r.content).filter(Boolean);
    const fullDesc = grandTotalItem.content + (subDetails.length > 0 ? " (Gồm: " + subDetails.join("; ") + ")" : "");
    return [{
      content: fullDesc,
      amount: grandTotalItem.amount,
      amountFormatted: grandTotalItem.amountFormatted
    }];
  }

  return results;
}


function getOnboardRevenueSummary(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const items = [];
  let totalAmount = 0;
  if (lastRow < 2) return { items, totalAmount, totalAmountFormatted: "0 đ" };

  const data = sheet.getRange(1, 1, lastRow, Math.max(lastCol, HEADERS.length)).getValues();
  let headerRowIdx = 0;
  let colMap = findSheetColumns(data.at(0));

  for (let r = 0; r < Math.min(10, data.length); r++) {
    const rowNorm = data.at(r).map(c => removeVietnameseDiacritics(c));
    if (rowNorm.some(c => c.includes("MA BKK") || c.includes("BKK"))) {
      headerRowIdx = r;
      colMap = findSheetColumns(data.at(r));
      break;
    }
  }

  for (let r = headerRowIdx + 1; r < data.length; r++) {
    const row = data.at(r);
    const bkk = colMap.bkk !== undefined ? String(row.at(colMap.bkk) || "").trim() : "";
    if (!bkk) continue;

    const tableStr = colMap.table !== undefined ? String(row.at(colMap.table) || "").trim() || "Chưa xếp bàn" : "Chưa xếp bàn";
    const rep = colMap.rep !== undefined ? cleanGuestName(String(row.at(colMap.rep) || "").trim()) : "";
    const agent = colMap.agent !== undefined ? String(row.at(colMap.agent) || "").trim() : "";
    const diet = colMap.diet !== undefined ? String(row.at(colMap.diet) || "").trim() : "";
    const note = colMap.note !== undefined ? String(row.at(colMap.note) || "").trim() : "";
    const rawPaxVal = colMap.group !== undefined ? row.at(colMap.group) : row.at(COL_PAX);
    const pax = resolveBookingPax(rawPaxVal, diet + " " + note, bkk);

    const revItems = parseOnboardRevenueFromText(diet + "\\n" + note);
    if (revItems.length > 0) {
      let bkkAmount = 0;
      const descList = [];
      revItems.forEach(it => {
        bkkAmount += it.amount;
        descList.push(it.content);
      });
      totalAmount += bkkAmount;

      items.push({
        stt: items.length + 1,
        table: tableStr,
        bkk: bkk,
        rep: rep,
        agent: agent,
        pax: pax,
        details: descList.join(" | "),
        amount: bkkAmount,
        amountFormatted: bkkAmount.toLocaleString("vi-VN") + " đ\n"
      });
    }
  }

  return { items, totalAmount, totalAmountFormatted: totalAmount.toLocaleString("vi-VN") + " đ" };
}

function showOnboardRevenueDialog() {
  const sheet = SpreadsheetApp.getActiveSheet();
  if (!isDolphinSheet(sheet.getName())) {
    SpreadsheetApp.getUi().alert("Vui lòng mở một sheet Dolphin để xem bảng kiểm soát thu tiền!");
    return;
  }

  const { items, totalAmount, totalAmountFormatted } = getOnboardRevenueSummary(sheet);

  if (items.length === 0) {
    SpreadsheetApp.getUi().alert("Không tìm thấy ghi chú thu tiền mặt/phụ thu tại tàu nào trên sheet " + sheet.getName());
    return;
  }

  // Pre-render toàn bộ bảng: BỎ HOÀN TOÀN CÁC NÚT TÍCH CHẤM (RADIO DOTS)
  // Các cột TIỀN MẶT, CHUYỂN KHOẢN, CÀ THẺ, CHƯA THU để trống hoàn toàn để thu ngân tự tích trên giấy in
  let tableHtmlRows = "";
  items.forEach((it, idx) => {
    const cleanDetails = (it.details || "").replace(/"/g, "&quot;");
    const cleanRep = (it.rep || "").replace(/"/g, "&quot;");
    const cleanAgent = (it.agent || "").replace(/"/g, "&quot;");
    const cleanBkk = (it.bkk || "").replace(/"/g, "&quot;");
    const cleanTable = (it.table || "").replace(/"/g, "&quot;");

    tableHtmlRows += '<tr>' +
      '<td style="text-align:center;font-weight:bold;color:#0369a1;font-size:13px;">' + cleanTable + '</td>' +
      '<td><b>' + cleanBkk + '</b><br><small style="color:#64748b;">' + cleanAgent + '</small></td>' +
      '<td>' + cleanRep + ' (' + it.pax + ' pax)</td>' +
      '<td style="font-size:11px;color:#334155;line-height:1.4;">' + cleanDetails + '</td>' +
      '<td style="text-align:right;font-weight:bold;color:#b91c1c;font-size:13px;">' + it.amountFormatted + '</td>' +
      '<td class="check-box-cell" onclick="toggleCell(this)"></td>' +
      '<td class="check-box-cell" onclick="toggleCell(this)"></td>' +
      '<td class="check-box-cell" onclick="toggleCell(this)"></td>' +
      '<td class="check-box-cell" onclick="toggleCell(this)"></td>' +
      '</tr>';
  });

  const html = '<!DOCTYPE html>' +
    '<html><head><base target="_top">' +
    '<meta charset="UTF-8">' +
    '<style>' +
    '  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 14px; margin: 0; background: #f8fafc; color: #1e293b; }' +
    '  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 10px; margin-bottom: 12px; }' +
    '  h3 { margin: 0; color: #0369a1; font-size: 16px; display: flex; align-items: center; gap: 8px; }' +
    '  .stats-container { display: flex; gap: 10px; margin-bottom: 12px; }' +
    '  .stat-card { background: white; border: 1px solid #cbd5e1; border-radius: 6px; padding: 7px 14px; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }' +
    '  .stat-card.total { background: #f0fdf4; border-color: #86efac; color: #166534; font-weight: bold; font-size: 14px; }' +
    '  .stat-card.count { background: #eff6ff; border-color: #bfdbfe; color: #1e40af; font-weight: bold; }' +
    '  table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-size: 12px; }' +
    '  th { background: #0284c7; color: white; padding: 9px 6px; text-align: center; font-size: 12px; font-weight: 600; border: 1px solid #0284c7; }' +
    '  td { padding: 8px 6px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; vertical-align: middle; }' +
    '  tr:hover { background: #f0f9ff; }' +
    '  .check-box-cell { width: 55px; text-align: center; cursor: pointer; font-size: 15px; font-weight: bold; color: #0284c7; user-select: none; }' +
    '  .check-box-cell:hover { background: #e0f2fe; }' +
    '  .footer { margin-top: 14px; display: flex; justify-content: space-between; align-items: center; }' +
    '  .btn { background: #0284c7; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px; transition: background 0.15s; }' +
    '  .btn:hover { background: #0369a1; }' +
    '  .btn-print { background: #16a34a; margin-left: 6px; }' +
    '  .btn-print:hover { background: #15803d; }' +
    '  .btn-export { background: #9333ea; margin-left: 6px; }' +
    '  .btn-export:hover { background: #7e22ce; }' +
    '  .copied { color: #15803d; font-weight: bold; margin-left: 10px; display: none; font-size: 12px; }' +
    '  /* ĐỊNH DẠNG CHUẨN KHI BẤM IN RA GIẤY */' +
    '  @media print {' +
    '    .no-print { display: none !important; }' +
    '    body { background: white !important; padding: 0 !important; color: #000000 !important; }' +
    '    .header { border-bottom: 2px solid #000000 !important; margin-bottom: 8px !important; }' +
    '    .header h3 { color: #000000 !important; font-size: 16px !important; }' +
    '    table { width: 100% !important; border-collapse: collapse !important; border: 1.5px solid #000000 !important; font-size: 11px !important; }' +
    '    th { background: #f1f5f9 !important; color: #000000 !important; border: 1px solid #000000 !important; padding: 6px 4px !important; font-size: 11px !important; }' +
    '    td { border: 1px solid #000000 !important; padding: 6px 4px !important; color: #000000 !important; }' +
    '    .check-box-cell { width: 50px !important; border: 1px solid #000000 !important; }' +
    '    .stat-card { border: 1px solid #000000 !important; color: #000000 !important; background: none !important; }' +
    '  }' +
    '</style></head><body>' +
    '<div class="header">' +
    '  <h3>💵 BẢNG KIỂM SOÁT TIỀN THU TẠI TÀU & PHỤ THU — ' + sheet.getName().toUpperCase() + '</h3>' +
    '  <small style="color:#64748b;">Dolphin Halong Cruise</small>' +
    '</div>' +
    '<div class="stats-container">' +
    '  <div class="stat-card total">💰 TỔNG CẦN THU: ' + totalAmountFormatted + '</div>' +
    '  <div class="stat-card count">📋 SỐ BOOKING: ' + items.length + ' booking</div>' +
    '</div>' +
    '<div style="max-height: 420px; overflow-y: auto; border: 1px solid #cbd5e1; border-radius: 8px;">' +
    '<table>' +
    '  <thead><tr>' +
    '    <th style="width:7%;">BÀN</th>' +
    '    <th style="width:16%;text-align:left;">MÃ BKK</th>' +
    '    <th style="width:18%;text-align:left;">KHÁCH</th>' +
    '    <th style="width:25%;text-align:left;">CHI TIẾT KHOẢN THU</th>' +
    '    <th style="width:12%;text-align:right;">SỐ TIỀN</th>' +
    '    <th style="width:5.5%;background:#0284c7;">TIỀN MẶT</th>' +
    '    <th style="width:5.5%;background:#0284c7;">CHUYỂN KHOẢN</th>' +
    '    <th style="width:5.5%;background:#0284c7;">CÀ THẺ</th>' +
    '    <th style="width:5.5%;background:#0284c7;">CHƯA THU</th>' +
    '  </tr></thead>' +
    '  <tbody id="tableBody">' + tableHtmlRows + '</tbody>' +
    '</table>' +
    '</div>' +
    '<div class="footer no-print">' +
    '  <div>' +
    '    <button class="btn btn-print" onclick="window.print()">🖨️ In Bảng Kê (Khổ A4)</button>' +
    '    <button class="btn" onclick="copyZaloReport()">📋 Sao chép báo cáo Zalo</button>' +
    '    <button class="btn btn-export" onclick="exportToSheet()">📥 Xuất ra Sheet</button>' +
    '    <span id="copiedMsg" class="copied">✓ Đã sao chép báo cáo!</span>' +
    '    <span id="exportMsg" class="copied" style="color:#7e22ce;">✓ Đang xuất ra sheet...</span>' +
    '  </div>' +
    '  <small style="color:#64748b;">4 cột phương thức để trống sạch sẽ để thu ngân tự tích bút bi khi in ra giấy</small>' +
    '</div>' +
    '<script>' +
    '  const sheetName = ' + JSON.stringify(sheet.getName()) + ';' +
    '  function toggleCell(td) {' +
    '    td.innerText = td.innerText === "✓" ? "" : "✓";' +
    '  }' +
    '  function copyZaloReport() {' +
    '    let lines = [];' +
    '    lines.push("💵 BÁO CÁO THU TIỀN TẠI TÀU - " + sheetName.toUpperCase());' +
    '    lines.push("============================================");' +
    '    const rows = document.querySelectorAll("#tableBody tr");' +
    '    rows.forEach(r => {' +
    '      const tds = r.querySelectorAll("td");' +
    '      const [tdTbl, tdBkk, tdRep, tdDet, tdAmt] = tds;' +
    '      const tbl = tdTbl.innerText.trim();' +
    '      const bkk = tdBkk.querySelector("b").innerText.trim();' +
    '      const rep = tdRep.innerText.trim();' +
    '      const details = tdDet.innerText.trim();' +
    '      const amt = tdAmt.innerText.trim();' +
    '      lines.push("• Bàn " + tbl + " | " + bkk + " (" + rep + "): " + amt);' +
    '      lines.push("  -> Chi tiết: " + details);' +
    '    });' +
    '    lines.push("--------------------------------------------");' +
    '    lines.push("👉 TỔNG TIỀN PHẢI THU: ' + totalAmountFormatted + ' (' + items.length + ' booking)");' +
    '    navigator.clipboard.writeText(lines.join("\\n")).then(() => {' +
    '      const m = document.getElementById("copiedMsg");' +
    '      m.style.display = "inline";' +
    '      setTimeout(() => m.style.display = "none", 3000);' +
    '    });' +
    '  }' +
    '  function exportToSheet() {' +
    '    document.getElementById("exportMsg").style.display = "inline";' +
    '    const rows = document.querySelectorAll("#tableBody tr");' +
    '    const dataToExport = [];' +
    '    rows.forEach(r => {' +
    '      const tds = r.querySelectorAll("td");' +
    '      const [tdTbl, tdBkk, tdRep, tdDet, tdAmt, tdCash, tdTrans, tdPos, tdPend] = tds;' +
    '      dataToExport.push({' +
    '        table: tdTbl.innerText.trim(),' +
    '        bkk: tdBkk.querySelector("b").innerText.trim(),' +
    '        agent: (tdBkk.querySelector("small") ? tdBkk.querySelector("small").innerText.trim() : ""),' +
    '        rep: tdRep.innerText.trim(),' +
    '        details: tdDet.innerText.trim(),' +
    '        amount: tdAmt.innerText.trim(),' +
    '        cash: tdCash.innerText.trim(),' +
    '        transfer: tdTrans.innerText.trim(),' +
    '        pos: tdPos.innerText.trim(),' +
    '        pending: tdPend.innerText.trim()' +
    '      });' +
    '    });' +
    '    google.script.run.withSuccessHandler(() => {' +
    '      document.getElementById("exportMsg").innerText = "✓ Đã xuất ra sheet thành công!";' +
    '      setTimeout(() => document.getElementById("exportMsg").style.display = "none", 4000);' +
    '    }).exportRevenueDataToSpreadsheetSimple(sheetName, dataToExport);' +
    '  }' +
    '</script></body></html>';

  const htmlOutput = HtmlService.createHtmlOutput(html).setWidth(1000).setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, "Bảng Kiểm Soát Thu Tiền Tại Tàu");
}

function exportRevenueDataToSpreadsheetSimple(baseSheetName, exportItems) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const targetName = "💵 THU TIỀN " + baseSheetName.replace(/DOLPHIN/i, "").trim();
  let targetSheet = ss.getSheetByName(targetName);
  if (!targetSheet) {
    targetSheet = ss.insertSheet(targetName);
  } else {
    targetSheet.clear();
  }

  const revHeaders = ["STT", "BÀN", "MÃ BKK", "TÊN ĐẠI LÝ", "HỌ TÊN", "CHI TIẾT KHOẢN THU", "SỐ TIỀN", "TIỀN MẶT", "CHUYỂN KHOẢN", "CÀ THẺ", "CHƯA THU"];
  const outRows = [revHeaders];

  exportItems.forEach((it, idx) => {
    outRows.push([
      idx + 1,
      it.table,
      it.bkk,
      it.agent,
      it.rep,
      it.details,
      it.amount,
      it.cash || "",
      it.transfer || "",
      it.pos || "",
      it.pending || "\n"
    ]);
  });

  const range = targetSheet.getRange(1, 1, outRows.length, revHeaders.length);
  range.setValues(outRows);

  targetSheet.getRange(1, 1, 1, revHeaders.length)
    .setFontFamily("Times New Roman").setFontSize(13).setFontWeight("bold")
    .setHorizontalAlignment("center").setVerticalAlignment("middle").setBackground("#0284C7").setFontColor("#FFFFFF");

  const dataRange = targetSheet.getRange(2, 1, outRows.length - 1, revHeaders.length);
  dataRange.setFontFamily("Times New Roman").setFontSize(13).setVerticalAlignment("middle");

  targetSheet.getRange(2, 1, outRows.length - 1, 1).setHorizontalAlignment("center");
  targetSheet.getRange(2, 2, outRows.length - 1, 1).setHorizontalAlignment("center").setFontWeight("bold");
  targetSheet.getRange(2, 7, outRows.length - 1, 1).setHorizontalAlignment("right").setFontWeight("bold").setFontColor("#B91C1C");
  targetSheet.getRange(2, 8, outRows.length - 1, 4).setHorizontalAlignment("center").setFontWeight("bold");

  range.setBorder(true, true, true, true, true, true, "#000000", SpreadsheetApp.BorderStyle.SOLID);
  for (let c = 1; c <= revHeaders.length; c++) targetSheet.autoResizeColumn(c);
}
/**
 * =========================================================================
 * MODULE 3: SƠ ĐỒ BÀN TRỰC QUAN TƯƠNG TÁC (INTERACTIVE VISUAL TABLE MAP 2D)
 * - PHIÊN BẢN CHUẨN ĐẦU TIÊN: ĐẦY ĐỦ TOÀN BỘ 119 BÀN THEO SƠ ĐỒ MẶT BẰNG TÀU DOLPHIN
 * - HIỂN THỊ TRỰC QUAN TRẠNG THÁI: BÀN CÓ KHÁCH, BÀN ĂN CHAY 🌱, SINH NHẬT 🎂, THU TIỀN 💰
 * - BẤM VÀO BÀN MỞ POPUP CHI TIẾT ĐẦY ĐỦ TẤT CẢ THÔNG TIN BKK
 * =========================================================================
 */
function getMapDataForCurrentSheet(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const tableBookingMap = new Map();
  let totalOccupiedPax = 0;
  let vegCount = 0;
  let bdayCount = 0;
  let revCount = 0;

  if (lastRow > 1) {
    const data = sheet.getRange(1, 1, lastRow, Math.max(lastCol, HEADERS.length)).getValues();
    let headerRowIdx = 0;
    let colMap = findSheetColumns(data.at(0));

    // Dò tìm dòng tiêu đề trong 10 dòng đầu
    for (let r = 0; r < Math.min(10, data.length); r++) {
      const rowNorm = data.at(r).map(c => removeVietnameseDiacritics(c));
      if (rowNorm.some(c => c.includes("MA BKK") || c.includes("BKK"))) {
        headerRowIdx = r;
        colMap = findSheetColumns(data.at(r));
        break;
      }
    }

    for (let r = headerRowIdx + 1; r < data.length; r++) {
      const row = data.at(r);
      const bkk = colMap.bkk !== undefined ? String(row.at(colMap.bkk) || "").trim() : "";
      if (!bkk) continue;

      const rawTable = colMap.table !== undefined ? String(row.at(colMap.table) || "").trim() : "";
      if (!rawTable) continue;

      const rep = colMap.rep !== undefined ? cleanGuestName(String(row.at(colMap.rep) || "").trim()) : "";
      const nat = colMap.nat !== undefined ? String(row.at(colMap.nat) || "").trim() : "";
      const agent = colMap.agent !== undefined ? String(row.at(colMap.agent) || "").trim() : "";
      const diet = colMap.diet !== undefined ? String(row.at(colMap.diet) || "").trim() : "";
      const note = colMap.note !== undefined ? String(row.at(colMap.note) || "").trim() : "";
      const rawPaxVal = colMap.group !== undefined ? row.at(colMap.group) : row.at(COL_PAX);
      const pax = resolveBookingPax(rawPaxVal, diet + " " + note, bkk);
      const textAll = (diet + " " + note).toLowerCase();

      const isVeg = textAll.includes("chay") || textAll.includes("veg") || nat.toLowerCase().includes("ấn");
      const isBday = textAll.includes("sinh nhật") || textAll.includes("bánh");
      const revItems = parseOnboardRevenueFromText(diet + "\\n" + note);
      const hasRev = revItems.length > 0;

      if (isVeg) vegCount++;
      if (isBday) bdayCount++;
      if (hasRev) revCount++;
      totalOccupiedPax += pax;

      const bkkObj = {
        rowIdx: r + 1,
        bkk: bkk,
        table: rawTable,
        rep: rep,
        pax: pax,
        nat: nat,
        agent: agent,
        diet: diet,
        note: note,
        isVeg: isVeg,
        isBday: isBday,
        hasRev: hasRev,
        revStr: revItems.map(it => it.content).join(" | ")
      };

      // Tách bàn nếu ghép bàn như A1-A2 hoặc C1, C2, C3
      const tableTokens = rawTable.split(/[,+]/).map(s => s.trim()).filter(Boolean);
      tableTokens.forEach(token => {
        if (token.includes("-")) {
          const parts = token.split("-").map(s => s.trim());
          const [startStr, endStr] = parts;
          const pfx = startStr.charAt(0).toUpperCase();
          const startNum = parseInt(startStr.substring(1), 10);
          const endNum = parseInt(endStr.substring(1), 10);
          if (startNum && endNum && startNum <= endNum) {
            for (let n = startNum; n <= endNum; n++) {
              const tblId = pfx + n;
              if (!tableBookingMap.has(tblId)) tableBookingMap.set(tblId, []);
              tableBookingMap.get(tblId).push(bkkObj);
            }
          }
        } else {
          const cleanTbl = token.toUpperCase();
          if (!tableBookingMap.has(cleanTbl)) tableBookingMap.set(cleanTbl, []);
          tableBookingMap.get(cleanTbl).push(bkkObj);
        }
      });
    }
  }

  return { tableBookingMap, totalOccupiedPax, vegCount, bdayCount, revCount };
}

function showInteractiveTableMap() {
  const sheet = SpreadsheetApp.getActiveSheet();
  if (!isDolphinSheet(sheet.getName())) {
    SpreadsheetApp.getUi().alert("Vui lòng mở một sheet Dolphin để xem sơ đồ bàn trực quan!");
    return;
  }

  const { tableBookingMap, totalOccupiedPax, vegCount, bdayCount, revCount } = getMapDataForCurrentSheet(sheet);

  const mapDataObj = {};
  tableBookingMap.forEach((bkks, tblId) => {
    mapDataObj[tblId] = bkks;
  });

  const jsonStr = JSON.stringify(mapDataObj);

  const html = '<!DOCTYPE html>' +
    '<html><head><base target="_top">' +
    '<meta charset="UTF-8">' +
    '<style>' +
    '  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 12px; background: #0f172a; color: #f8fafc; user-select: none; }' +
    '  .top-bar { display: flex; justify-content: space-between; align-items: center; background: #1e293b; padding: 10px 16px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #334155; }' +
    '  .title-group { display: flex; align-items: center; gap: 10px; }' +
    '  .title { font-size: 16px; font-weight: bold; color: #38bdf8; }' +
    '  .stats-bar { display: flex; gap: 14px; font-size: 13px; align-items: center; }' +
    '  .stat-pill { background: #334155; padding: 4px 10px; border-radius: 20px; font-weight: 500; }' +
    '  .filter-group { display: flex; gap: 6px; }' +
    '  .filter-btn { background: #334155; color: #94a3b8; border: none; padding: 5px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: bold; }' +
    '  .filter-btn.active { background: #0284c7; color: white; }' +
    '  .deck-container { display: flex; flex-direction: column; gap: 14px; height: calc(100vh - 90px); overflow-y: auto; padding-right: 4px; }' +
    '  .section-card { background: #1e293b; border-radius: 8px; padding: 12px; border: 1px solid #334155; }' +
    '  .section-title { font-size: 13px; font-weight: bold; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; display: flex; justify-content: space-between; }' +
    '  .layout-grid-floor1 { display: grid; grid-template-columns: 1.1fr 0.9fr 1.1fr; gap: 14px; }' +
    '  .wing-col { display: flex; flex-direction: column; gap: 10px; }' +
    '  .table-row-group { display: flex; flex-wrap: wrap; gap: 6px; }' +
    '  .tbl { width: 48px; height: 48px; border-radius: 6px; display: flex; flex-direction: column; justify-content: center; align-items: center; cursor: pointer; font-weight: bold; font-size: 12px; transition: transform 0.15s, box-shadow 0.15s; position: relative; border: 1px solid #475569; background: #1e293b; color: #64748b; }' +
    '  .tbl:hover { transform: scale(1.08); z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }' +
    '  .tbl.sub { width: 40px; height: 38px; font-size: 11px; border-style: dashed; }' +
    '  .tbl.occupied { background: #0369a1; color: #ffffff; border-color: #38bdf8; }' +
    '  .tbl.has-veg { border-bottom: 3px solid #22c55e !important; }' +
    '  .tbl.has-bday { border-top: 3px solid #f43f5e !important; }' +
    '  .tbl.has-rev { box-shadow: inset 0 0 0 2px #eab308; }' +
    '  .tbl .pax-badge { font-size: 10px; opacity: 0.9; }' +
    '  .tbl .icon-badge { position: absolute; top: -3px; right: -3px; font-size: 10px; }' +
    '  /* Modal Popup Chi tiết */' +
    '  .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: none; justify-content: center; align-items: center; z-index: 1000; }' +
    '  .modal-content { background: #1e293b; border-radius: 10px; width: 440px; padding: 20px; border: 1px solid #475569; box-shadow: 0 10px 25px rgba(0,0,0,0.6); color: #f8fafc; }' +
    '  .modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 10px; margin-bottom: 12px; }' +
    '  .modal-title { font-size: 17px; font-weight: bold; color: #38bdf8; }' +
    '  .close-btn { background: none; border: none; color: #94a3b8; font-size: 20px; cursor: pointer; }' +
    '  .modal-body { font-size: 13px; line-height: 1.6; }' +
    '  .modal-field { margin-bottom: 8px; display: flex; }' +
    '  .field-label { width: 110px; color: #94a3b8; font-weight: 500; }' +
    '  .field-val { flex: 1; font-weight: bold; color: #f8fafc; }' +
    '  .tag-pill { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-right: 4px; }' +
    '  .tag-veg { background: #14532d; color: #86efac; border: 1px solid #22c55e; }' +
    '  .tag-bday { background: #881337; color: #fecdd3; border: 1px solid #f43f5e; }' +
    '  .tag-rev { background: #713f12; color: #fef08a; border: 1px solid #eab308; }' +
    '</style></head><body>' +
    '<div class="top-bar">' +
    '  <div class="title-group">' +
    '    <span class="title">🐬 SƠ ĐỒ BÀN TÀU DOLPHIN</span>' +
    '    <span style="color:#64748b;">| ' + sheet.getName().toUpperCase() + '</span>' +
    '  </div>' +
    '  <div class="stats-bar">' +
    '    <div class="stat-pill">👥 <b>' + totalOccupiedPax + '</b> Pax</div>' +
    '    <div class="stat-pill">🌱 <b>' + vegCount + '</b> Chay</div>' +
    '    <div class="stat-pill">🎂 <b>' + bdayCount + '</b> Sinh nhật</div>' +
    '    <div class="stat-pill">💰 <b>' + revCount + '</b> Thu tiền</div>' +
    '  </div>' +
    '  <div class="filter-group">' +
    '    <button class="filter-btn active" onclick="filterTables(\'all\')">Tất cả</button>' +
    '    <button class="filter-btn" onclick="filterTables(\'occupied\')">Có khách</button>' +
    '    <button class="filter-btn" onclick="filterTables(\'veg\')">Chay 🌱</button>' +
    '    <button class="filter-btn" onclick="filterTables(\'rev\')">Thu tiền 💰</button>' +
    '  </div>' +
    '</div>' +
    '<div class="deck-container">' +
    '  <div class="section-card">' +
    '    <div class="section-title"><span>TẦNG 1: NHÀ HÀNG CHÍNH (KHU A & E & SOFA)</span><span>MŨI TÀU ⬆️</span></div>' +
    '    <div class="layout-grid-floor1">' +
    '      <!-- MẠN TRÁI KHU A -->' +
    '      <div class="wing-col">' +
    '        <div style="font-size:12px;color:#38bdf8;font-weight:bold;">MẠN TRÁI - KHU A</div>' +
    '        <div style="font-size:11px;color:#64748b;">Bàn phụ cửa sổ (A17 - A26)</div>' +
    '        <div class="table-row-group" id="grid_sub_A"></div>' +
    '        <div style="font-size:11px;color:#64748b;margin-top:6px;">Bàn chính (A1 - A16)</div>' +
    '        <div class="table-row-group" id="grid_main_A"></div>' +
    '      </div>' +
    '      <!-- KHOANG SOFA GIỮA & KHU C -->' +
    '      <div class="wing-col">' +
    '        <div style="font-size:12px;color:#f59e0b;font-weight:bold;">KHOANG SOFA & BUFFET</div>' +
    '        <div style="font-size:11px;color:#64748b;">Khoang Sofa D (D1 - D10)</div>' +
    '        <div class="table-row-group" id="grid_sofa_D"></div>' +
    '        <div style="font-size:11px;color:#64748b;margin-top:6px;">Khoang Sofa B (B1 - B12)</div>' +
    '        <div class="table-row-group" id="grid_sofa_B"></div>' +
    '        <div style="font-size:11px;color:#64748b;margin-top:6px;">Khu C Gần Buffet (C1 - C13)</div>' +
    '        <div class="table-row-group" id="grid_buffet_C"></div>' +
    '      </div>' +
    '      <!-- MẠN PHẢI KHU E -->' +
    '      <div class="wing-col">' +
    '        <div style="font-size:12px;color:#38bdf8;font-weight:bold;">MẠN PHẢI - KHU E</div>' +
    '        <div style="font-size:11px;color:#64748b;">Bàn chính (E1 - E16)</div>' +
    '        <div class="table-row-group" id="grid_main_E"></div>' +
    '        <div style="font-size:11px;color:#64748b;margin-top:6px;">Bàn phụ cửa sổ (E17 - E28)</div>' +
    '        <div class="table-row-group" id="grid_sub_E"></div>' +
    '      </div>' +
    '    </div>' +
    '  </div>' +
    '  <!-- TẦNG 2 & PHÒNG LOUNGE -->' +
    '  <div class="section-card">' +
    '    <div class="section-title"><span>TẦNG 2 PANORAMA & PHÒNG VIP LOUNGE</span></div>' +
    '    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">' +
    '      <div>' +
    '        <div style="font-size:12px;color:#a855f7;font-weight:bold;margin-bottom:6px;">TẦNG 2 NGẮM CẢNH (DÃY J & DÃY Q)</div>' +
    '        <div class="table-row-group" id="grid_floor2"></div>' +
    '      </div>' +
    '      <div>' +
    '        <div style="font-size:12px;color:#ec4899;font-weight:bold;margin-bottom:6px;">PHÒNG VIP LOUNGE (L1 - L16)</div>' +
    '        <div class="table-row-group" id="grid_lounge"></div>' +
    '      </div>' +
    '    </div>' +
    '  </div>' +
    '</div>' +
    '<!-- MODAL CHI TIẾT -->' +
    '<div class="modal-overlay" id="detailModal" onclick="closeModal(event)">' +
    '  <div class="modal-content" onclick="event.stopPropagation()">' +
    '    <div class="modal-header">' +
    '      <div class="modal-title" id="mTitle">BÀN A1</div>' +
    '      <button class="close-btn" onclick="closeModal()">&times;</button>' +
    '    </div>' +
    '    <div class="modal-body" id="mBody"></div>' +
    '  </div>' +
    '</div>' +
    '<script id="mapDataJson" type="application/json">' + jsonStr + '</script>' +
    '<script>' +
    '  const mapData = JSON.parse(document.getElementById("mapDataJson").textContent);' +
    '  function renderTables(containerId, list, isSub = false) {' +
    '    const c = document.getElementById(containerId);' +
    '    c.innerHTML = "";' +
    '    list.forEach(id => {' +
    '      const bkks = mapData[id] || [];' +
    '      const hasOcc = bkks.length > 0;' +
    '      const div = document.createElement("div");' +
    '      div.className = "tbl" + (isSub ? " sub" : "") + (hasOcc ? " occupied" : "");' +
    '      div.dataset.tableId = id;' +
    '      let icons = "";' +
    '      let paxSum = 0;' +
    '      let hasVeg = false, hasBday = false, hasRev = false;' +
    '      bkks.forEach(b => {' +
    '        paxSum += b.pax;' +
    '        if (b.isVeg) hasVeg = true;' +
    '        if (b.isBday) hasBday = true;' +
    '        if (b.hasRev) hasRev = true;' +
    '      });' +
    '      if (hasVeg) { div.classList.add("has-veg"); icons += "🌱"; }' +
    '      if (hasBday) { div.classList.add("has-bday"); icons += "🎂"; }' +
    '      if (hasRev) { div.classList.add("has-rev"); icons += "💰"; }' +
    '      div.dataset.hasVeg = hasVeg;' +
    '      div.dataset.hasRev = hasRev;' +
    '      div.dataset.occupied = hasOcc;' +
    '      div.innerHTML = "<span>" + id + "</span>" + (hasOcc ? "<span class=\'pax-badge\'>" + paxSum + "p</span>" : "") + (icons ? "<span class=\'icon-badge\'>" + icons + "</span>" : "");' +
    '      div.onclick = () => openTableDetails(id, bkks);' +
    '      c.appendChild(div);' +
    '    });' +
    '  }' +
    '  renderTables("grid_sub_A", Array.from({length: 10}, (_, i) => "A" + (i + 17)), true);' +
    '  renderTables("grid_main_A", Array.from({length: 16}, (_, i) => "A" + (i + 1)));' +
    '  renderTables("grid_sofa_D", Array.from({length: 10}, (_, i) => "D" + (i + 1)));' +
    '  renderTables("grid_sofa_B", Array.from({length: 12}, (_, i) => "B" + (i + 1)));' +
    '  renderTables("grid_buffet_C", Array.from({length: 13}, (_, i) => "C" + (i + 1)));' +
    '  renderTables("grid_main_E", Array.from({length: 16}, (_, i) => "E" + (i + 1)));' +
    '  renderTables("grid_sub_E", Array.from({length: 12}, (_, i) => "E" + (i + 17)), true);' +
    '  renderTables("grid_floor2", Array.from({length: 7}, (_, i) => "J" + (i + 1)).concat(Array.from({length: 7}, (_, i) => "Q" + (i + 1))));' +
    '  renderTables("grid_lounge", Array.from({length: 16}, (_, i) => "L" + (i + 1)));' +
    '  function filterTables(type) {' +
    '    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));' +
    '    event.target.classList.add("active");' +
    '    document.querySelectorAll(".tbl").forEach(t => {' +
    '      if (type === "all") t.style.opacity = "1";' +
    '      else if (type === "occupied") t.style.opacity = t.dataset.occupied === "true" ? "1" : "0.2";' +
    '      else if (type === "veg") t.style.opacity = t.dataset.hasVeg === "true" ? "1" : "0.2";' +
    '      else if (type === "rev") t.style.opacity = t.dataset.hasRev === "true" ? "1" : "0.2";' +
    '    });' +
    '  }' +
    '  function openTableDetails(tblId, bkks) {' +
    '    document.getElementById("mTitle").innerText = "THÔNG TIN BÀN " + tblId;' +
    '    const body = document.getElementById("mBody");' +
    '    if (!bkks || bkks.length === 0) {' +
    '      body.innerHTML = "<p style=\'color:#94a3b8;text-align:center;padding:20px;\'>Bàn này hiện đang <b>TRỐNG</b> (Chưa có khách đặt).</p>";' +
    '    } else {' +
    '      let h = "";' +
    '      bkks.forEach((b, idx) => {' +
    '        let tags = "";' +
    '        if (b.isVeg) tags += "<span class=\'tag-pill tag-veg\'>Ăn chay</span>";' +
    '        if (b.isBday) tags += "<span class=\'tag-pill tag-bday\'>Sinh nhật</span>";' +
    '        if (b.hasRev) tags += "<span class=\'tag-pill tag-rev\'>Thu tiền: " + b.revStr + "</span>";' +
    '        h += "<div style=\'border-bottom:1px solid #334155;padding-bottom:10px;margin-bottom:10px;\'>" +' +
    '          "<div class=\'modal-field\'><span class=\'field-label\'>Mã BKK:</span><span class=\'field-val\'>" + b.bkk + "</span></div>" +' +
    '          "<div class=\'modal-field\'><span class=\'field-label\'>Khách:</span><span class=\'field-val\'>" + b.rep + " (" + b.pax + " pax)</span></div>" +' +
    '          "<div class=\'modal-field\'><span class=\'field-label\'>Quốc tịch:</span><span class=\'field-val\'>" + (b.nat || "Chưa rõ") + "</span></div>" +' +
    '          "<div class=\'modal-field\'><span class=\'field-label\'>Đại lý:</span><span class=\'field-val\'>" + b.agent + "</span></div>" +' +
    '          (b.diet ? "<div class=\'modal-field\'><span class=\'field-label\'>Ăn kiêng:</span><span class=\'field-val\' style=\'color:#4ade80;\'>" + b.diet + "</span></div>" : "") +' +
    '          (b.note ? "<div class=\'modal-field\'><span class=\'field-label\'>Ghi chú:</span><span class=\'field-val\' style=\'color:#fbbf24;\'>" + b.note + "</span></div>" : "") +' +
    '          (b.hasRev ? "<div class=\'modal-field\'><span class=\'field-label\'>Thu tiền:</span><span class=\'field-val\' style=\'color:#facc15;\'>" + b.revStr + "</span></div>" : "") +' +
    '          (tags ? "<div style=\'margin-top:6px;\'>" + tags + "</div>" : "") +' +
    '          "</div>";' +
    '      });' +
    '      body.innerHTML = h;' +
    '    }' +
    '    document.getElementById("detailModal").style.display = "flex";' +
    '  }' +
    '  function closeModal(e) {' +
    '    document.getElementById("detailModal").style.display = "none";' +
    '  }' +
    '</script></body></html>';

  const htmlOutput = HtmlService.createHtmlOutput(html).setWidth(1100).setHeight(680);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, "Sơ Đồ Bàn Tàu Dolphin");
}
/**
 * =========================================================================
 * BỘ TỰ ĐỘNG ĐỒNG BỘ THEO THỜI GIAN (TRIGGERS)
 * =========================================================================
 */
function enableAutoSyncTrigger() {
  disableAutoSyncTrigger();
  ScriptApp.newTrigger("syncTodaySheets")
    .timeBased()
    .everyMinutes(15)
    .create();
  SpreadsheetApp.getActiveSpreadsheet().toast("Đã bật tự động cập nhật ngầm mỗi 15 phút!", "Thành công", 5);
}

function disableAutoSyncTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  let count = 0;
  for (let t of triggers) {
    if (t.getHandlerFunction() === "syncTodaySheets" || t.getHandlerFunction() === "syncAllDolphinSheets") {
      ScriptApp.deleteTrigger(t);
      count++;
    }
  }
  SpreadsheetApp.getActiveSpreadsheet().toast("Đã tắt tự động cập nhật ngầm!", "Thông báo", 4);
}


function mergeLinkedBookingsCurrentSheet(){return dolphinLock_(mergeLinkedBookingsCurrentSheetCore_);}
