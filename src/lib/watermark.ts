import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';

export async function watermarkPdf(src: ArrayBuffer, name: string, email: string, date: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(src, { updateMetadata: false });
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const diag = `Prepared for ${name}  ·  ${email}`;
  const foot = `Personal copy for ${name} (${email}), issued ${date}. Not for redistribution.`;
  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const w = bold.widthOfTextAtSize(diag, 26);
    page.drawText(diag, {
      x: width / 2 - (w / 2) * Math.cos(35 * Math.PI / 180), y: height / 2 - (w / 2) * Math.sin(35 * Math.PI / 180),
      size: 26, font: bold, color: rgb(0.91, 0.08, 0.49), opacity: 0.07, rotate: degrees(35),
    });
    const fw = reg.widthOfTextAtSize(foot, 6.5);
    page.drawText(foot, { x: width - 28 - fw, y: 14, size: 6.5, font: reg, color: rgb(0.35, 0.4, 0.5), opacity: 0.9 });
  }
  pdf.setTitle('The European Affiliate Map');
  pdf.setSubject(`Personal copy for ${name}`);
  pdf.setProducer('GENUINE Beauty GmbH');
  return pdf.save({ useObjectStreams: false });
}
