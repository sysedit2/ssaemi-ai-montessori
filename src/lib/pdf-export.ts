/**
 * 대시보드 PDF 내보내기
 * jsPDF + html2canvas 사용
 */
export async function exportDashboardToPDF(elementId: string, filename = "발달분석리포트.pdf") {
  const { default: jsPDF } = await import("jspdf");
  const { default: html2canvas } = await import("html2canvas");

  const element = document.getElementById(elementId);
  if (!element) throw new Error(`#${elementId} 요소를 찾을 수 없습니다.`);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#f8fafc",
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const imgW = pageW - margin * 2;
  const imgH = (canvas.height * imgW) / canvas.width;

  let y = margin;
  let remaining = imgH;

  while (remaining > 0) {
    pdf.addImage(imgData, "PNG", margin, y, imgW, imgH);
    remaining -= pageH - margin * 2;
    if (remaining > 0) {
      pdf.addPage();
      y = margin - (imgH - remaining);
    }
  }

  pdf.save(filename);
}
