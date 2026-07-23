import Tesseract from "tesseract.js";
let workerPromise = null;
async function getWorker() {
    if (!workerPromise) {
        workerPromise = (async () => {
            const worker = await Tesseract.createWorker("fra", 1, { logger: () => { } });
            await worker.setParameters({
                tessedit_pageseg_mode: Tesseract.PSM.AUTO,
            });
            return worker;
        })();
    }
    return workerPromise;
}
export async function ocrImage(source) {
    try {
        const worker = await getWorker();
        const { data } = await worker.recognize(source);
        return data.text ?? "";
    }
    catch {
        return "";
    }
}
/** Pré-charge le worker au démarrage du serveur. */
export async function warmupOcr() {
    try {
        await getWorker();
    }
    catch {
        /* ignore */
    }
}
