declare module "pdf-parse" {
  interface PDFData {
    text: string;
    numpages: number;
    info: Record<string, unknown>;
  }

  function pdfParse(buffer: Buffer, options?: unknown): Promise<PDFData>;
  export default pdfParse;
}

declare module "jsqr" {
  export interface QRCode {
    data: string;
  }

  function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: { inversionAttempts?: string }
  ): QRCode | null;

  export default jsQR;
}
