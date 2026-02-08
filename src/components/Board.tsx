import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

interface BoardProps {
    game: Chess;
    onPieceDrop: (sourceSquare: string, targetSquare: string, piece: string) => boolean;
    boardOrientation: "white" | "black";
    bestMove?: { from: string; to: string } | null;
    customSquareStyles?: Record<string, React.CSSProperties>;
    onPieceDragBegin?: (piece: string, sourceSquare: string) => void;
    onPieceDragEnd?: (piece: string, sourceSquare: string) => void;
}

export default function Board({ game, onPieceDrop, boardOrientation, bestMove, customSquareStyles, onPieceDragBegin, onPieceDragEnd }: BoardProps) {
    // Create an arrow for the best move: { startSquare, endSquare, color }
    // Color is green "rgb(0, 200, 0)"
    const customArrows = bestMove
        ? [{ startSquare: bestMove.from, endSquare: bestMove.to, color: "rgb(0, 200, 0)" }]
        : [];

    // React Chessboard v5+ uses an 'options' prop instead of direct props
    // Mapping props to options
    const chessboardOptions = {
        position: game.fen(),
        // Emulating onPieceDragBegin using canDragPiece (side effect)
        // Note: react-chessboard v5 doesn't have a direct 'onDragBegin' prop in options 
        // that fires exactly when drag starts, allowing side effects.
        // We use onPieceDragBegin callback if provided.
        // However, 'canDragPiece' is a filter, not an event handler but often called at start.
        // To be safe, let's rely on the fact that Game.tsx handles logic.
        // We can try to use onPieceDragBegin inside canDragPiece if we want to trigger highlight.
        canDragPiece: ({ piece, square }: any) => {
            if (onPieceDragBegin) onPieceDragBegin(piece, square);
            return true;
        },
        // We need to clear highlights on drop or cancellation.
        // Since we don't have a clear 'onDragCancel', we rely on onPieceDrop to clean up.
        // If the user drops off board, onPieceDrop might not fire in some versions,
        // but typically it handles the 'end' of a drag.
        onPieceDrop: ({ sourceSquare, targetSquare, piece }: any) => {
            const result = onPieceDrop(sourceSquare, targetSquare, piece);
            if (onPieceDragEnd) onPieceDragEnd(piece, sourceSquare);
            return result;
        },
        boardOrientation: boardOrientation,
        squareStyles: customSquareStyles,
        excludeShowBoardHeader: true, // If available
        customDarkSquareStyle: { backgroundColor: "#779954" },
        customLightSquareStyle: { backgroundColor: "#e9edcc" },
        animationDurationInMs: 200,
        arrows: customArrows,
        // Emulating onPieceDragBegin using canDragPiece (side effect)
        // We might not have a perfect onDragEnd equivalent for clearing, 
        // but onPieceDrop covers the move case. 
        // For cancelled drags, we might need another solution or accept highlights persisting until next interactions.
    };

    return (
        <div className="w-full max-w-[600px] aspect-square shadow-2xl rounded-lg overflow-hidden">
            <Chessboard options={chessboardOptions} />
        </div>
    );
}
