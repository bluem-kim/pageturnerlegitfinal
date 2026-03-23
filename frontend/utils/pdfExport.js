import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";

const REPORT_FILE_NAME = "PageTurnerAnalyticsReport.pdf";

const normalizePdfFileName = (name) => {
  const trimmed = String(name || "").trim();
  if (!trimmed) return REPORT_FILE_NAME;
  return /\.pdf$/i.test(trimmed) ? trimmed : `${trimmed}.pdf`;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderTable = (section) => {
  const headers = Array.isArray(section?.headers) ? section.headers : [];
  const rows = Array.isArray(section?.rows) ? section.rows : [];

  const headHtml = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const bodyHtml = rows.length
    ? rows
        .map((row) => {
          const cells = (Array.isArray(row) ? row : [row]).map(
            (cell) => `<td>${escapeHtml(cell)}</td>`
          );
          return `<tr>${cells.join("")}</tr>`;
        })
        .join("")
    : `<tr><td colspan="${Math.max(headers.length, 1)}">No data</td></tr>`;

  return `<table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
};

const renderBarGraph = (graphTitle, points = []) => {
  const max = Math.max(...points.map((point) => Number(point?.value || 0)), 0);
  if (!points.length) return "";

  const rows = points
    .map((point) => {
      const value = Number(point?.value || 0);
      const width = max > 0 ? Math.max((value / max) * 100, 6) : 6;
      return `
        <div class="bar-row">
          <div class="bar-head">
            <span>${escapeHtml(point?.label || "Unknown")}</span>
            <span>${escapeHtml(point?.displayValue ?? value)}</span>
          </div>
          <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
        </div>
      `;
    })
    .join("");

  return `<h3>${escapeHtml(graphTitle || "Graph")}</h3><div>${rows}</div>`;
};

export const buildAnalyticsPdfHtml = ({ title, summaryLines = [], sections = [] }) => {
  const generatedAt = new Date().toLocaleString("en-PH");

  const summaryHtml = summaryLines.length
    ? `<div class="kpi">${summaryLines
        .map(
          (line) =>
            `<p><strong>${escapeHtml(line?.label || "")}</strong> ${escapeHtml(line?.value || "")}</p>`
        )
        .join("")}</div>`
    : "";

  const sectionsHtml = sections
    .map((section) => {
      const graphHtml = Array.isArray(section?.graphData)
        ? renderBarGraph(section?.graphTitle, section.graphData)
        : "";

      return `
        <section>
          <h2>${escapeHtml(section?.title || "Section")}</h2>
          ${graphHtml}
          ${renderTable(section)}
        </section>
      `;
    })
    .join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 40px; color: #18120C; background-color: #FFFAF6; }
          h1 { margin: 0 0 10px; color: #F4821F; font-size: 28px; font-weight: 900; }
          h2 { margin: 30px 0 12px; color: #B85E0E; font-size: 20px; border-bottom: 2px solid #EDE5DC; padding-bottom: 5px; }
          h3 { margin: 15px 0 8px; color: #9A8A7A; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
          p.meta { margin: 0 0 20px; color: #9A8A7A; font-size: 12px; font-weight: 600; }
          table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 15px; border: 1px solid #EDE5DC; border-radius: 12px; overflow: hidden; }
          th, td { padding: 12px 15px; text-align: left; font-size: 13px; border-bottom: 1px solid #EDE5DC; }
          th { background: #FEF0E3; color: #B85E0E; font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
          tr:last-child td { border-bottom: none; }
          .kpi { background: #FFFFFF; border: 1.5px solid #F4821F; padding: 20px; margin-top: 20px; border-radius: 16px; box-shadow: 0 4px 12px rgba(244,130,31,0.08); }
          .kpi p { margin: 8px 0; font-size: 14px; color: #18120C; }
          .kpi p strong { color: #F4821F; margin-right: 10px; font-weight: 800; }
          .bar-row { margin-bottom: 12px; }
          .bar-head { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; font-weight: 700; color: #5C3A1E; }
          .bar-track { height: 10px; border-radius: 5px; background: #F7F2EC; overflow: hidden; }
          .bar-fill { height: 10px; border-radius: 5px; background: linear-gradient(90deg, #F4821F, #B85E0E); }
          .stars { color: #FFAA00; font-size: 16px; letter-spacing: 2px; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title || "PageTurnerAnalyticsReport")}</h1>
        <p class="meta">Generated: ${escapeHtml(generatedAt)}</p>
        ${summaryHtml}
        ${sectionsHtml}
      </body>
    </html>
  `;
};

export const exportReviewsPDF = async (reviews = []) => {
  const avg = reviews.length
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : "0";

  const rows = reviews.map((r) => [
    r.productName || "N/A",
    r.reviewerName || "Anonymous",
    `${r.rating}/5`,
    r.comment || "No comment",
    new Date(r.createdAt).toLocaleDateString("en-PH"),
  ]);

  const html = buildAnalyticsPdfHtml({
    title: "Product Reviews Report",
    summaryLines: [
      { label: "Total Reviews:", value: reviews.length.toString() },
      { label: "Average Rating:", value: `${avg} / 5.0` },
    ],
    sections: [
      {
        title: "Review Details",
        headers: ["Product", "Reviewer", "Rating", "Comment", "Date"],
        rows,
      },
    ],
  });

  try {
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  } catch (error) {
    console.error("Error exporting reviews PDF:", error);
  }
};

export const buildListPdfHtml = ({ title, summaryLines = [], headers = [], rows = [] }) => {
  const generatedAt = new Date().toLocaleString("en-PH");
  const section = {
    headers,
    rows,
  };

  const summaryHtml = summaryLines.length
    ? `<div class="kpi">${summaryLines
        .map(
          (line) =>
            `<p><strong>${escapeHtml(line?.label || "")}</strong> ${escapeHtml(line?.value || "")}</p>`
        )
        .join("")}</div>`
    : "";

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 40px; color: #18120C; background-color: #FFFAF6; }
          h1 { margin: 0 0 10px; color: #F4821F; font-size: 28px; font-weight: 900; }
          p.meta { margin: 0 0 20px; color: #9A8A7A; font-size: 12px; font-weight: 600; }
          table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 15px; border: 1px solid #EDE5DC; border-radius: 12px; overflow: hidden; }
          th, td { padding: 12px 15px; text-align: left; font-size: 13px; border-bottom: 1px solid #EDE5DC; }
          th { background: #FEF0E3; color: #B85E0E; font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
          tr:last-child td { border-bottom: none; }
          .kpi { background: #FFFFFF; border: 1.5px solid #F4821F; padding: 20px; margin-top: 20px; border-radius: 16px; box-shadow: 0 4px 12px rgba(244,130,31,0.08); }
          .kpi p { margin: 8px 0; font-size: 14px; color: #18120C; }
          .kpi p strong { color: #F4821F; margin-right: 10px; font-weight: 800; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title || "PageTurner Report")}</h1>
        <p class="meta">Generated: ${escapeHtml(generatedAt)}</p>
        ${summaryHtml}
        ${renderTable(section)}
      </body>
    </html>
  `;
};

export const exportPdfFromHtml = async (
  html,
  { fileName = REPORT_FILE_NAME, dialogTitle = "Export PDF report" } = {}
) => {
  const file = await Print.printToFileAsync({ html });
  const targetUri = `${FileSystem.documentDirectory}${normalizePdfFileName(fileName)}`;

  await FileSystem.deleteAsync(targetUri, { idempotent: true });
  await FileSystem.copyAsync({ from: file.uri, to: targetUri });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(targetUri, {
      mimeType: "application/pdf",
      dialogTitle,
      UTI: "com.adobe.pdf",
    });
  }

  return { uri: targetUri, shared: canShare };
};

export { REPORT_FILE_NAME };
