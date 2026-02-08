import { useState, useEffect, useMemo } from "react";
import { Chess } from "chess.js";
import Board from "./Board";
import Engine from "../engine/Engine";

export default function Game() {
    const [game, setGame] = useState(new Chess());
    const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");
    const [bestMove, setBestMove] = useState<{ from: string; to: string } | null>(null);
    const [evaluation, setEvaluation] = useState<number>(0); // centipawns
    const [isMate, setIsMate] = useState<boolean>(false); // is mate detected
    const [depth, setDepth] = useState<number>(0); // Engine calculation depth
    const [pv, setPv] = useState<string>(""); // Principal Variation (Best line)

    const engine = useMemo(() => new Engine(), []);

    useEffect(() => {
        engine.onMessage((data) => {
            // console.log("Stockfish:", data);

            if (data.startsWith("bestmove")) {
                const move = data.split(" ")[1];
                if (move && move.length >= 4) {
                    const from = move.substring(0, 2);
                    const to = move.substring(2, 4);
                    setBestMove({ from, to });
                }
            }

            // info depth 20 ... score cp 50 ... pv ...
            if (data.startsWith("info")) {
                // Derinlik
                const depthMatch = data.match(/depth (\d+)/);
                if (depthMatch) {
                    setDepth(parseInt(depthMatch[1], 10));
                }

                // Skor (cp veya mate)
                const scoreMatch = data.match(/score (cp|mate) (-?\d+)/);
                if (scoreMatch) {
                    const type = scoreMatch[1];
                    const val = parseInt(scoreMatch[2], 10);

                    if (type === "mate") {
                        setIsMate(true);
                        setEvaluation(val > 0 ? 10000 : -10000);
                    } else {
                        setIsMate(false);
                        setEvaluation(val);
                    }
                }

                // PV (Tahmini Oyun Hattı)
                const pvMatch = data.match(/ pv (.+)/);
                if (pvMatch) {
                    setPv(pvMatch[1]);
                }
            }
        });

        return () => {
            engine.terminate();
        };
    }, [engine]);

    useEffect(() => {
        // Her hamlede YENİLMEZ MOD (Derinlik 25) ile analiz et
        setBestMove(null);
        engine.evaluate(game.fen(), 25);
    }, [game, engine]);


    function onPieceDrop(sourceSquare: string, targetSquare: string) {
        try {
            const move = game.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: "q",
            });

            if (move === null) return false;
            setGame(new Chess(game.fen()));
            return true;
        } catch (error) {
            return false;
        }
    }

    // Değerlendirme çubuğu yüzdesi
    const evalPercent = 50 + (Math.max(Math.min(evaluation, 1000), -1000) / 20);

    const [moveSquares, setMoveSquares] = useState<Record<string, React.CSSProperties>>({});

    function onPieceDragBegin(_piece: string, sourceSquare: string) {
        const moves = game.moves({
            square: sourceSquare as any,
            verbose: true,
        });

        const newSquares: Record<string, React.CSSProperties> = {};

        // Highlight source square
        newSquares[sourceSquare] = {
            background: "rgba(255, 255, 0, 0.4)"
        };

        moves.forEach((move) => {
            const targetPiece = game.get(move.to as any);
            const sourcePiece = game.get(sourceSquare as any);

            newSquares[move.to] = {
                background:
                    targetPiece && sourcePiece && targetPiece.color !== sourcePiece.color
                        ? "radial-gradient(circle, rgba(255,0,0,.5) 85%, transparent 85%)" // Capture highlight
                        : "radial-gradient(circle, rgba(0,0,0,.5) 25%, transparent 25%)", // Normal move dot
                borderRadius: "50%",
            };
        });

        setMoveSquares(newSquares);
    }

    function onPieceDragEnd() {
        setMoveSquares({});
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#121212] text-white p-4 font-sans selection:bg-green-500 selection:text-black">
            <div className="flex w-full max-w-7xl gap-8 flex-col lg:flex-row items-center lg:items-start">

                {/* Board Section */}
                <div className="flex-1 flex flex-col items-center gap-6 relative">
                    <div className="w-full flex justify-between items-center mb-4 bg-gray-900 p-4 rounded-xl shadow-lg border border-gray-800">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent flex items-center gap-2">
                            <span className="text-4xl">♔</span> Yenilmez Satranç
                        </h1>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setBoardOrientation(boardOrientation === "white" ? "black" : "white")}
                                className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-sm font-semibold transition-all hover:shadow-lg active:scale-95"
                                title="Tahtayı Çevir"
                            >
                                Çevir
                            </button>
                            <button
                                onClick={() => {
                                    const newGame = new Chess();
                                    setGame(newGame);
                                    setBestMove(null);
                                    setEvaluation(0);
                                    setDepth(0);
                                    setPv("");


                                }}
                                className="px-5 py-2.5 bg-red-600/20 hover:bg-red-600/40 border border-red-600/50 text-red-200 rounded-lg text-sm font-semibold transition-all hover:shadow-[0_0_15px_rgba(220,38,38,0.3)] active:scale-95"
                            >
                                Sıfırla
                            </button>
                            <button
                                onClick={() => {
                                    game.undo();
                                    setGame(new Chess(game.fen()));


                                }}
                                className="px-5 py-2.5 bg-yellow-600/20 hover:bg-yellow-600/40 border border-yellow-600/50 text-yellow-200 rounded-lg text-sm font-semibold transition-all hover:shadow-[0_0_15px_rgba(202,138,4,0.3)] active:scale-95"
                                title="Hamleyi Geri Al"
                            >
                                Geri Al
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-4 items-stretch justify-center w-full">
                        {/* Eval Bar */}
                        <div className="w-10 bg-gray-800 rounded-lg overflow-hidden flex flex-col-reverse shadow-2xl border border-gray-700 relative h-[500px] lg:h-[650px]">
                            <div
                                className={`w-full transition-all duration-700 ease-out bg-white`}
                                style={{ height: `${evalPercent}%` }}
                            />
                            <div className={`w-full flex-1 transition-all duration-700 ease-out bg-[#222]`} />

                            {/* Center marker */}
                            <div className="absolute top-1/2 left-0 w-full h-[2px] bg-red-500/80 z-10 shadow-[0_0_10px_red]"></div>
                        </div>

                        <div className="relative group">
                            <Board
                                game={game}
                                onPieceDrop={onPieceDrop}
                                onPieceDragBegin={onPieceDragBegin}
                                onPieceDragEnd={onPieceDragEnd}
                                boardOrientation={boardOrientation}
                                bestMove={bestMove}
                                customSquareStyles={moveSquares}
                            />

                            {/* Glow effect for board */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-xl blur-lg -z-10 group-hover:opacity-100 transition duration-1000 opacity-50"></div>
                        </div>
                    </div>
                </div>

                {/* Analysis Panel */}
                <div className="w-full lg:w-[450px] bg-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-800 h-full min-h-[600px] flex flex-col backdrop-blur-sm bg-opacity-95">
                    <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
                        <h2 className="text-xl font-bold text-gray-100">Analiz Paneli</h2>
                        <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded border border-emerald-500/20 font-mono animate-pulse">
                            YENİLMEZ MOD AKTİF
                        </span>
                    </div>

                    <div className="space-y-6 flex-1">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 shadow-inner group hover:border-gray-600 transition-colors">
                                <span className="text-gray-400 text-xs uppercase tracking-wider block mb-2 font-semibold group-hover:text-gray-300">Durum (Evaluasyon)</span>
                                <div className={`text-3xl font-black tracking-tight ${evaluation > 0 ? "text-emerald-400" : evaluation < 0 ? "text-red-400" : "text-gray-200"}`}>
                                    {isMate
                                        ? <span className="flex items-center gap-2">⚠️ Mat {Math.abs(evaluation) < 1000 ? "Var" : ""}</span>
                                        : (evaluation / 100).toFixed(2)
                                    }
                                </div>
                            </div>

                            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 shadow-inner group hover:border-gray-600 transition-colors">
                                <span className="text-gray-400 text-xs uppercase tracking-wider block mb-2 font-semibold group-hover:text-gray-300">Derinlik (Depth)</span>
                                <div className="text-3xl font-black text-cyan-400 tracking-tight font-mono">
                                    {depth} / 25
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-600/10 rounded-xl p-5 border border-blue-500/30 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl text-blue-500">♟</div>
                            <span className="text-blue-200 text-xs uppercase tracking-wider block mb-2 font-bold flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                                En İyi Hamle (Öneri)
                            </span>
                            <div className="text-4xl font-black text-white font-mono tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                                {bestMove
                                    ? `${bestMove.from.toUpperCase()} ➝ ${bestMove.to.toUpperCase()}`
                                    : <span className="text-xl text-blue-300/50 animate-pulse">Hesaplanıyor...</span>}
                            </div>
                        </div>

                        <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50 h-48 overflow-y-auto custom-scrollbar">
                            <span className="text-gray-500 text-xs uppercase tracking-wider block mb-2 sticky top-0 bg-[#161618] py-1 z-10 w-full">
                                Motorun Düşünce Hattı (PV)
                            </span>
                            <div className="text-sm text-gray-300 font-mono leading-relaxed break-words">
                                {pv || "Satranç motoru hamleleri analiz ediyor..."}
                            </div>
                        </div>

                        <div className="mt-auto pt-6 border-t border-gray-800 text-xs text-center text-gray-600">
                            <div className="flex justify-center items-center gap-2 mb-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                Stockfish 16 NNUE (WASM)
                            </div>
                            <div>Maksimum Güç · Derinlik 25+ · 256MB Hash</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
