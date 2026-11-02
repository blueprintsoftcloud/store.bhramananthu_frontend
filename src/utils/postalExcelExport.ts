// src/utils/postalExcelExport.ts
import ExcelJS from "exceljs";

export interface PostalExportOrder {
  id: string;
  createdAt: string;
  finalAmount: number;
  totalAmount: number;
  paymentMethod?: string;
  paymentStatus?: string;
  orderStatus: string;
  user?: {
    username?: string;
    email?: string;
    phone?: string;
  };
  shippingAddress?: {
    fullName?: string;
    name?: string;
    fullAddress?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    locality?: string;
    phone?: string;
    secondaryPhone?: string;
    country?: string;
  } | null;
}

export interface ExportOptions {
  dateLabel?: string;
  customFilename?: string;
}

/**
 * Generates an India Post bulk dispatch Excel spreadsheet (.xlsx) matching
 * the official "ArticleDetails" format with "PIN DB" reference sheet.
 */
export async function downloadPostalExcel(
  orders: PostalExportOrder[],
  options?: ExportOptions
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Bhramananthu Store Admin";
  workbook.created = new Date();

  // ── Sheet 1: ArticleDetails (Active) ────────────────────────────────────────
  const ws = workbook.addWorksheet("ArticleDetails", {
    views: [{ showGridLines: true }],
  });

  // ── Sheet 2: PIN DB (Reference Sheet matching template) ─────────────────────
  const pinDbSheet = workbook.addWorksheet("PIN DB", {
    views: [{ showGridLines: true }],
  });
  pinDbSheet.addRow(["PINCODE", "POST OFFICE", "DISTRICT", "STATE"]);
  pinDbSheet.getRow(1).font = { bold: true, size: 10 };

  // Set clean, consecutive columns A through H with proper widths
  ws.columns = [
    { key: "colA", width: 16 }, // A: SERIAL NUMBER
    { key: "colB", width: 20 }, // B: RECEIVER PINCODE
    { key: "colC", width: 28 }, // C: RECEIVER NAME
    { key: "colD", width: 26 }, // D: NAME OF POST OFFICE
    { key: "colE", width: 18 }, // E: MOB RECEIVER
    { key: "colF", width: 14 }, // F: COD
    { key: "colG", width: 16 }, // G: AMOUNT
    { key: "colH", width: 24 }, // H: ORDER DATE & TIME
  ];

  // Rows 1 and 2 are empty in the template
  ws.addRow([]);
  ws.addRow([]);

  // Row 3: Table Header Row (Clean, no empty gap columns)
  const headerRow = ws.addRow([
    "SERIAL NUMBER",
    "RECEIVER PINCODE",
    "RECEIVER NAME",
    "NAME OF POST OFFICE",
    "MOB RECEIVER",
    "COD",
    "AMOUNT",
    "ORDER DATE & TIME",
  ]);

  const borderStyle: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FF999999" } },
    left: { style: "thin", color: { argb: "FF999999" } },
    bottom: { style: "thin", color: { argb: "FF999999" } },
    right: { style: "thin", color: { argb: "FF999999" } },
  };

  headerRow.height = 24;
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF000000" } };
    cell.alignment = {
      vertical: "middle",
      horizontal: colNumber === 1 || colNumber === 2 || colNumber === 5 || colNumber === 6 || colNumber === 8 ? "center" : "left",
      wrapText: true
    };
    cell.border = borderStyle;
    // Subtle header tint matching Excel template
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF2F2F2" },
    };
  });

  // Populate Order Data starting on Row 4
  orders.forEach((order, index) => {
    const serial = index + 1;
    const sa = order.shippingAddress || {};

    // 1. PIN code
    const rawPin = (sa.zipCode || "").toString().replace(/\D/g, "").slice(0, 6);

    // 2. Receiver Name
    const receiverName = (
      sa.fullName ||
      sa.name ||
      order.user?.username ||
      "Customer"
    ).trim();

    // 3. Post office / locality
    const postOffice = (
      sa.locality ||
      sa.city ||
      ""
    ).trim();

    // 4. Mobile number (clean 10 digits)
    const rawMobile = (
      sa.phone ||
      sa.secondaryPhone ||
      order.user?.phone ||
      ""
    ).toString().replace(/\D/g, "");
    const cleanMobile = rawMobile.length >= 10 ? rawMobile.slice(-10) : rawMobile;

    // 5. COD check
    const isCod =
      order.paymentMethod === "COD" ||
      order.paymentMethod === "POD" ||
      (order.paymentStatus === "PENDING" && order.paymentMethod !== "ONLINE");

    const codValue = isCod ? "COD" : "";

    // 6. Amount
    // For COD, the amount to collect from receiver is finalAmount. For prepaid, 0 / empty.
    const collectionAmount = isCod
      ? Math.round(order.finalAmount ?? order.totalAmount ?? 0)
      : 0;

    // 7. Order Date & Time
    const orderDateTime = order.createdAt
      ? new Date(order.createdAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "—";

    const row = ws.addRow([
      serial,
      rawPin,
      receiverName.toUpperCase(),
      postOffice.toUpperCase(),
      cleanMobile,
      codValue,
      collectionAmount > 0 ? collectionAmount : "",
      orderDateTime,
    ]);

    row.height = 20;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: "Calibri", size: 10, color: { argb: "FF000000" } };
      cell.border = borderStyle;

      if (colNumber === 1) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else if (colNumber === 2 || colNumber === 5) {
        // Pincode (Col B) and Mobile (Col E) as text to prevent dropping leading 0
        cell.numFmt = "@";
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else if (colNumber === 6) {
        // COD indicator (Col F) centered
        cell.alignment = { vertical: "middle", horizontal: "center" };
        if (cell.value === "COD") {
          cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF990000" } };
        }
      } else if (colNumber === 7) {
        // Amount (Col G) right-aligned
        cell.alignment = { vertical: "middle", horizontal: "right" };
        if (typeof cell.value === "number") {
          cell.numFmt = "#,##0";
        }
      } else if (colNumber === 8) {
        // Order Date & Time (Col H) centered
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "left" };
      }
    });

    // Populate PIN DB with unique pincodes
    if (rawPin && postOffice) {
      pinDbSheet.addRow([rawPin, postOffice, sa.city || "", sa.state || ""]);
    }
  });

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const fileName =
    options?.customFilename ||
    (options?.dateLabel
      ? `IndiaPost_BulkBooking_${options.dateLabel.replace(/\s+/g, "_")}.xlsx`
      : `IndiaPost_BulkBooking_${dateStr}.xlsx`);

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
