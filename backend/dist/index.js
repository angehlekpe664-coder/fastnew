import "dotenv/config";
import { createApp } from "./app.js";
const port = Number(process.env.PORT ?? 4000);
const app = createApp();
import { warmupOcr } from "./services/ocr.worker.js";
warmupOcr().catch(() => { });
app.listen(port, () => {
    console.log(`✅ UniPay Verify API → http://localhost:${port}`);
});
