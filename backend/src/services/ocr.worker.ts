import Tesseract from "tesseract.js";

let workerPromise: Promise<Tesseract.Worker> | null = null;

async function getWorker(): Promise<Tesseract.Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await Tesseract.createWorker("fra", 1, { logger: () => {} });
      await worker.setParameters({
        tessedit_pageseg_mode: "3",
      });
      return worker;
    })();
  }
  return workerPromise;
}

export async function ocrImage(
  source: Buffer | { data: Uint8Array; width: number; height: number }
): Promise<string> {
  try {
    const worker = await getWorker();
    const { data } = await worker.recognize(source as Buffer);
    return data.text ?? "";
  } catch {
    return "";
  }
}

/** Pré-charge le worker au démarrage du serveur. */
export async function warmupOcr(): Promise<void> {
  try {
    await getWorker();
  } catch {
    /* ignore */
  }
}
