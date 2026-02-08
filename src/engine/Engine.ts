export default class Engine {
    private worker: Worker | null = null;
    private onMessageCallback: ((data: string) => void) | null = null;

    constructor() {
        try {
            this.worker = new Worker("/stockfish.js");
            this.worker.onmessage = (event) => {
                if (this.onMessageCallback) {
                    this.onMessageCallback(event.data);
                }
            };
            this.worker.postMessage("uci");
            // "Yenilmez Mod" Ayarları
            this.worker.postMessage("setoption name Hash value 256"); // Hafızayı artır (MB)
            try {
                this.worker.postMessage("setoption name Threads value 4"); // 4 Çekirdek (Cihaz destekliyorsa)
            } catch (e) {/*ignore*/ }
            this.worker.postMessage("setoption name Skill Level value 20"); // Maksimum Yetenek
            this.worker.postMessage("setoption name MultiPV value 1"); // Sadece en iyi hamleye odaklan
            this.worker.postMessage("setoption name Move Overhead value 100"); // Ağ gecikmesi tamponu
        } catch (error) {
            console.error("Stockfish worker yüklenemedi:", error);
        }
    }

    onMessage(callback: (data: string) => void) {
        this.onMessageCallback = callback;
    }

    evaluate(fen: string, depth = 22) { // Derinliği artır (Varsayılan 22)
        if (!this.worker) return;
        this.worker.postMessage("stop");
        this.worker.postMessage("position fen " + fen);
        this.worker.postMessage("go depth " + depth);
    }

    stop() {
        this.worker?.postMessage("stop");
    }

    terminate() {
        this.worker?.terminate();
    }
}
