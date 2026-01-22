// World-Class Chess AI Engine
class ChessAI {
    constructor() {
        this.maxDepth = 4; // Adjustable difficulty
        this.pieceValues = {
            'pawn': 100,
            'knight': 320,
            'bishop': 330,
            'rook': 500,
            'queen': 900,
            'king': 20000
        };
        
        // Position tables for piece evaluation
        this.pawnTable = [
            [0,  0,  0,  0,  0,  0,  0,  0],
            [50, 50, 50, 50, 50, 50, 50, 50],
            [10, 10, 20, 30, 30, 20, 10, 10],
            [5,  5, 10, 25, 25, 10,  5,  5],
            [0,  0,  0, 20, 20,  0,  0,  0],
            [5, -5,-10,  0,  0,-10, -5,  5],
            [5, 10, 10,-20,-20, 10, 10,  5],
            [0,  0,  0,  0,  0,  0,  0,  0]
        ];
        
        this.knightTable = [
            [-50,-40,-30,-30,-30,-30,-40,-50],
            [-40,-20,  0,  0,  0,  0,-20,-40],
            [-30,  0, 10, 15, 15, 10,  0,-30],
            [-30,  5, 15, 20, 20, 15,  5,-30],
            [-30,  0, 15, 20, 20, 15,  0,-30],
            [-30,  5, 10, 15, 15, 10,  5,-30],
            [-40,-20,  0,  5,  5,  0,-20,-40],
            [-50,-40,-30,-30,-30,-30,-40,-50]
        ];
        
        this.bishopTable = [
            [-20,-10,-10,-10,-10,-10,-10,-20],
            [-10,  0,  0,  0,  0,  0,  0,-10],
            [-10,  0,  5, 10, 10,  5,  0,-10],
            [-10,  5,  5, 10, 10,  5,  5,-10],
            [-10,  0, 10, 10, 10, 10,  0,-10],
            [-10, 10, 10, 10, 10, 10, 10,-10],
            [-10,  5,  0,  0,  0,  0,  5,-10],
            [-20,-10,-10,-10,-10,-10,-10,-20]
        ];
        
        this.rookTable = [
            [0,  0,  0,  0,  0,  0,  0,  0],
            [5, 10, 10, 10, 10, 10, 10,  5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [0,  0,  0,  5,  5,  0,  0,  0]
        ];
        
        this.queenTable = [
            [-20,-10,-10, -5, -5,-10,-10,-20],
            [-10,  0,  0,  0,  0,  0,  0,-10],
            [-10,  0,  5,  5,  5,  5,  0,-10],
            [-5,  0,  5,  5,  5,  5,  0, -5],
            [0,  0,  5,  5,  5,  5,  0, -5],
            [-10,  5,  5,  5,  5,  5,  0,-10],
            [-10,  0,  5,  0,  0,  0,  0,-10],
            [-20,-10,-10, -5, -5,-10,-10,-20]
        ];
        
        this.kingMiddleTable = [
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-20,-30,-30,-40,-40,-30,-30,-20],
            [-10,-20,-20,-20,-20,-20,-20,-10],
            [20, 20,  0,  0,  0,  0, 20, 20],
            [20, 30, 10,  0,  0, 10, 30, 20]
        ];
        
        this.kingEndTable = [
            [-50,-40,-30,-20,-20,-30,-40,-50],
            [-30,-20,-10,  0,  0,-10,-20,-30],
            [-30,-10, 20, 30, 30, 20,-10,-30],
            [-30,-10, 30, 40, 40, 30,-10,-30],
            [-30,-10, 30, 40, 40, 30,-10,-30],
            [-30,-10, 20, 30, 30, 20,-10,-30],
            [-30,-30,  0,  0,  0,  0,-30,-30],
            [-50,-40,-30,-20,-20,-30,-40,-50]
        ];
    }

    getBestMove(board, currentPlayer, capturedPieces) {
        const depth = this.maxDepth;
        let bestMove = null;
        let bestValue = -Infinity;
        
        const moves = this.getAllMoves(board, currentPlayer);
        
        // Order moves for better alpha-beta pruning
        const orderedMoves = this.orderMoves(board, moves, currentPlayer);
        
        for (const move of orderedMoves) {
            const [fromRow, fromCol, toRow, toCol] = move;
            const newBoard = this.makeMove(board, fromRow, fromCol, toRow, toCol);
            
            const value = this.minimax(newBoard, depth - 1, -Infinity, Infinity, false, currentPlayer, capturedPieces);
            
            if (value > bestValue) {
                bestValue = value;
                bestMove = move;
            }
        }
        
        return bestMove;
    }

    minimax(board, depth, alpha, beta, isMaximizing, currentPlayer, capturedPieces) {
        if (depth === 0) {
            return this.evaluateBoard(board, currentPlayer, capturedPieces);
        }

        const moves = this.getAllMoves(board, isMaximizing ? currentPlayer : (currentPlayer === 'white' ? 'black' : 'white'));
        
        if (moves.length === 0) {
            // Checkmate or stalemate
            if (this.isKingInCheck(board, isMaximizing ? currentPlayer : (currentPlayer === 'white' ? 'black' : 'white'))) {
                return isMaximizing ? -100000 : 100000;
            }
            return 0; // Stalemate
        }

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of moves) {
                const [fromRow, fromCol, toRow, toCol] = move;
                const newBoard = this.makeMove(board, fromRow, fromCol, toRow, toCol);
                const evaluation = this.minimax(newBoard, depth - 1, alpha, beta, false, currentPlayer, capturedPieces);
                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of moves) {
                const [fromRow, fromCol, toRow, toCol] = move;
                const newBoard = this.makeMove(board, fromRow, fromCol, toRow, toCol);
                const evaluation = this.minimax(newBoard, depth - 1, alpha, beta, true, currentPlayer, capturedPieces);
                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    evaluateBoard(board, currentPlayer, capturedPieces) {
        let score = 0;
        const isEndgame = this.isEndgame(board);
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (!piece) continue;
                
                const pieceType = this.getPieceType(piece);
                const pieceColor = this.getPieceColor(piece);
                const isWhite = pieceColor === 'white';
                
                let pieceValue = this.pieceValues[pieceType];
                let positionValue = 0;
                
                // Add positional value
                switch (pieceType) {
                    case 'pawn':
                        positionValue = this.pawnTable[isWhite ? 7 - row : row][col];
                        break;
                    case 'knight':
                        positionValue = this.knightTable[isWhite ? 7 - row : row][col];
                        break;
                    case 'bishop':
                        positionValue = this.bishopTable[isWhite ? 7 - row : row][col];
                        break;
                    case 'rook':
                        positionValue = this.rookTable[isWhite ? 7 - row : row][col];
                        break;
                    case 'queen':
                        positionValue = this.queenTable[isWhite ? 7 - row : row][col];
                        break;
                    case 'king':
                        positionValue = isEndgame ? 
                            this.kingEndTable[isWhite ? 7 - row : row][col] :
                            this.kingMiddleTable[isWhite ? 7 - row : row][col];
                        break;
                }
                
                const totalValue = pieceValue + positionValue;
                score += isWhite ? totalValue : -totalValue;
            }
        }
        
        // Add captured pieces evaluation
        for (const piece of capturedPieces.white) {
            score -= this.pieceValues[this.getPieceType(piece)];
        }
        for (const piece of capturedPieces.black) {
            score += this.pieceValues[this.getPieceType(piece)];
        }
        
        // Add mobility bonus
        const whiteMobility = this.getAllMoves(board, 'white').length;
        const blackMobility = this.getAllMoves(board, 'black').length;
        score += (whiteMobility - blackMobility) * 2;
        
        // Add doubled pawn penalty
        score -= this.countDoubledPawns(board, 'white') * 10;
        score += this.countDoubledPawns(board, 'black') * 10;
        
        return currentPlayer === 'white' ? score : -score;
    }

    isEndgame(board) {
        let pieceCount = 0;
        let queenCount = 0;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece) {
                    pieceCount++;
                    if (this.getPieceType(piece) === 'queen') {
                        queenCount++;
                    }
                }
            }
        }
        
        return pieceCount < 12 || queenCount === 0;
    }

    countDoubledPawns(board, color) {
        let doubledPawns = 0;
        const fileCounts = new Array(8).fill(0);
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece && this.getPieceType(piece) === 'pawn' && this.getPieceColor(piece) === color) {
                    fileCounts[col]++;
                }
            }
        }
        
        for (const count of fileCounts) {
            if (count > 1) {
                doubledPawns += count - 1;
            }
        }
        
        return doubledPawns;
    }

    orderMoves(board, moves, color) {
        // Order moves by capture value first, then by piece value
        return moves.sort((a, b) => {
            const [aFromRow, aFromCol, aToRow, aToCol] = a;
            const [bFromRow, bFromCol, bToRow, bToCol] = b;
            
            const aTargetPiece = board[aToRow][aToCol];
            const bTargetPiece = board[bToRow][bToCol];
            
            const aCaptureValue = aTargetPiece ? this.pieceValues[this.getPieceType(aTargetPiece)] : 0;
            const bCaptureValue = bTargetPiece ? this.pieceValues[this.getPieceType(bTargetPiece)] : 0;
            
            return bCaptureValue - aCaptureValue;
        });
    }

    getAllMoves(board, color) {
        const moves = [];
        
        for (let fromRow = 0; fromRow < 8; fromRow++) {
            for (let fromCol = 0; fromCol < 8; fromCol++) {
                const piece = board[fromRow][fromCol];
                if (!piece || this.getPieceColor(piece) !== color) continue;
                
                const pieceMoves = this.getPieceMoves(board, fromRow, fromCol, color);
                for (const [toRow, toCol] of pieceMoves) {
                    moves.push([fromRow, fromCol, toRow, toCol]);
                }
            }
        }
        
        return moves;
    }

    getPieceMoves(board, fromRow, fromCol, color) {
        const piece = board[fromRow][fromCol];
        if (!piece) return [];
        
        const pieceType = this.getPieceType(piece);
        const moves = [];
        
        switch (pieceType) {
            case 'pawn':
                moves.push(...this.getPawnMoves(board, fromRow, fromCol, color));
                break;
            case 'rook':
                moves.push(...this.getRookMoves(board, fromRow, fromCol, color));
                break;
            case 'knight':
                moves.push(...this.getKnightMoves(board, fromRow, fromCol, color));
                break;
            case 'bishop':
                moves.push(...this.getBishopMoves(board, fromRow, fromCol, color));
                break;
            case 'queen':
                moves.push(...this.getQueenMoves(board, fromRow, fromCol, color));
                break;
            case 'king':
                moves.push(...this.getKingMoves(board, fromRow, fromCol, color));
                break;
        }
        
        return moves;
    }

    getPawnMoves(board, row, col, color) {
        const moves = [];
        const direction = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;

        // Move forward one square
        if (this.isInBounds(row + direction, col) && !board[row + direction][col]) {
            moves.push([row + direction, col]);

            // Move forward two squares from starting position
            if (row === startRow && !board[row + 2 * direction][col]) {
                moves.push([row + 2 * direction, col]);
            }
        }

        // Capture diagonally
        [-1, 1].forEach(colOffset => {
            const newCol = col + colOffset;
            const newRow = row + direction;
            
            if (this.isInBounds(newRow, newCol)) {
                const targetPiece = board[newRow][newCol];
                if (targetPiece && this.getPieceColor(targetPiece) !== color) {
                    moves.push([newRow, newCol]);
                }
            }
        });

        return moves;
    }

    getRookMoves(board, row, col, color) {
        const moves = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        directions.forEach(([rowDir, colDir]) => {
            for (let i = 1; i < 8; i++) {
                const newRow = row + rowDir * i;
                const newCol = col + colDir * i;

                if (!this.isInBounds(newRow, newCol)) break;

                const targetPiece = board[newRow][newCol];
                if (!targetPiece) {
                    moves.push([newRow, newCol]);
                } else {
                    if (this.getPieceColor(targetPiece) !== color) {
                        moves.push([newRow, newCol]);
                    }
                    break;
                }
            }
        });

        return moves;
    }

    getKnightMoves(board, row, col, color) {
        const moves = [];
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        knightMoves.forEach(([rowOffset, colOffset]) => {
            const newRow = row + rowOffset;
            const newCol = col + colOffset;

            if (this.isInBounds(newRow, newCol)) {
                const targetPiece = board[newRow][newCol];
                if (!targetPiece || this.getPieceColor(targetPiece) !== color) {
                    moves.push([newRow, newCol]);
                }
            }
        });

        return moves;
    }

    getBishopMoves(board, row, col, color) {
        const moves = [];
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

        directions.forEach(([rowDir, colDir]) => {
            for (let i = 1; i < 8; i++) {
                const newRow = row + rowDir * i;
                const newCol = col + colDir * i;

                if (!this.isInBounds(newRow, newCol)) break;

                const targetPiece = board[newRow][newCol];
                if (!targetPiece) {
                    moves.push([newRow, newCol]);
                } else {
                    if (this.getPieceColor(targetPiece) !== color) {
                        moves.push([newRow, newCol]);
                    }
                    break;
                }
            }
        });

        return moves;
    }

    getQueenMoves(board, row, col, color) {
        return [
            ...this.getRookMoves(board, row, col, color),
            ...this.getBishopMoves(board, row, col, color)
        ];
    }

    getKingMoves(board, row, col, color) {
        const moves = [];
        const kingMoves = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];

        kingMoves.forEach(([rowOffset, colOffset]) => {
            const newRow = row + rowOffset;
            const newCol = col + colOffset;

            if (this.isInBounds(newRow, newCol)) {
                const targetPiece = board[newRow][newCol];
                if (!targetPiece || this.getPieceColor(targetPiece) !== color) {
                    moves.push([newRow, newCol]);
                }
            }
        });

        return moves;
    }

    makeMove(board, fromRow, fromCol, toRow, toCol) {
        const newBoard = board.map(row => [...row]);
        const piece = newBoard[fromRow][fromCol];
        newBoard[toRow][toCol] = piece;
        newBoard[fromRow][fromCol] = null;
        return newBoard;
    }

    isInBounds(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    getPieceColor(piece) {
        return '♔♕♖♗♘♙'.includes(piece) ? 'white' : 'black';
    }

    getPieceType(piece) {
        if (!piece) return null;
        
        const pieceMap = {
            '♔': 'king', '♚': 'king',
            '♕': 'queen', '♛': 'queen',
            '♖': 'rook', '♜': 'rook',
            '♗': 'bishop', '♝': 'bishop',
            '♘': 'knight', '♞': 'knight',
            '♙': 'pawn', '♟': 'pawn'
        };
        
        return pieceMap[piece];
    }

    isKingInCheck(board, color) {
        let kingPos = null;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece && this.getPieceType(piece) === 'king' && 
                    this.getPieceColor(piece) === color) {
                    kingPos = [row, col];
                    break;
                }
            }
            if (kingPos) break;
        }
        
        if (!kingPos) return false;
        
        const [kingRow, kingCol] = kingPos;
        const enemyColor = color === 'white' ? 'black' : 'white';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece && this.getPieceColor(piece) === enemyColor) {
                    const moves = this.getPieceMoves(board, row, col, enemyColor);
                    if (moves.some(([r, c]) => r === kingRow && c === kingCol)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
}

class ChessGame {
    constructor() {
        this.board = [];
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.validMoves = [];
        this.capturedPieces = { white: [], black: [] };
        this.moveHistory = [];
        this.enPassantTarget = null;
        this.castlingRights = {
            white: { kingside: true, queenside: true },
            black: { kingside: true, queenside: true }
        };
        
        // Multiplayer properties
        this.gameMode = 'local'; // 'local', 'computer', or 'online'
        this.socket = null;
        this.roomId = null;
        this.playerColor = null;
        this.isMyTurn = false;
        
        // Computer AI
        this.ai = new ChessAI();
        this.isComputerThinking = false;
        
        this.initializeBoard();
        this.setupEventListeners();
        this.showModeSelection();
    }

    initializeBoard() {
        const initialPosition = [
            ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
            ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
            ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
        ];

        this.board = initialPosition.map(row => [...row]);
    }

    renderBoard() {
        const boardElement = document.getElementById('chess-board');
        boardElement.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;

                const piece = this.board[row][col];
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.className = `piece ${this.getPieceColor(piece)}`;
                    pieceElement.textContent = piece;
                    square.appendChild(pieceElement);
                }

                boardElement.appendChild(square);
            }
        }

        this.updateGameInfo();
        this.updateCapturedPieces();
    }

    getPieceColor(piece) {
        return '♔♕♖♗♘♙'.includes(piece) ? 'white' : 'black';
    }

    getPieceType(piece) {
        if (!piece) return null;
        
        const pieceMap = {
            '♔': 'king', '♚': 'king',
            '♕': 'queen', '♛': 'queen',
            '♖': 'rook', '♜': 'rook',
            '♗': 'bishop', '♝': 'bishop',
            '♘': 'knight', '♞': 'knight',
            '♙': 'pawn', '♟': 'pawn'
        };
        
        return pieceMap[piece];
    }

    setupEventListeners() {
        // Mode selection
        document.getElementById('local-mode').addEventListener('click', () => {
            this.startLocalGame();
        });

        document.getElementById('computer-mode').addEventListener('click', () => {
            this.startComputerGame();
        });

        document.getElementById('online-mode').addEventListener('click', () => {
            this.startOnlineGame();
        });

        // Online setup
        document.getElementById('create-room').addEventListener('click', () => {
            this.createRoom();
        });

        document.getElementById('join-room').addEventListener('click', () => {
            this.joinRoom();
        });

        document.getElementById('refresh-rooms').addEventListener('click', () => {
            this.refreshRooms();
        });

        document.getElementById('back-to-modes').addEventListener('click', () => {
            this.showModeSelection();
        });

        document.getElementById('leave-room').addEventListener('click', () => {
            this.leaveRoom();
        });

        // Chess board events
        const boardElement = document.getElementById('chess-board');
        boardElement.addEventListener('click', (e) => {
            const square = e.target.closest('.square');
            if (square) {
                const row = parseInt(square.dataset.row);
                const col = parseInt(square.dataset.col);
                this.handleSquareClick(row, col);
            }
        });

        // Game controls
        document.getElementById('new-game').addEventListener('click', () => {
            this.resetGame();
        });

        document.getElementById('undo-move').addEventListener('click', () => {
            this.undoMove();
        });

        // Promotion modal
        document.querySelectorAll('.promotion-choices button').forEach(button => {
            button.addEventListener('click', (e) => {
                const piece = e.target.dataset.piece;
                this.handlePawnPromotion(piece);
            });
        });
    }

    startLocalGame() {
        this.gameMode = 'local';
        this.resetGame();
        this.showGameContainer();
        document.getElementById('leave-room').classList.add('hidden');
        document.getElementById('room-info').classList.add('hidden');
    }

    startComputerGame() {
        this.gameMode = 'computer';
        this.resetGame();
        this.showGameContainer();
        document.getElementById('leave-room').classList.add('hidden');
        document.getElementById('room-info').classList.add('hidden');
        
        // Show thinking indicator
        this.updateGameInfo();
    }

    startOnlineGame() {
        this.gameMode = 'online';
        this.initializeSocket();
        this.showOnlineSetup();
    }

    handleSquareClick(row, col) {
        const piece = this.board[row][col];

        if (this.selectedSquare) {
            const [selectedRow, selectedCol] = this.selectedSquare;
            const selectedPiece = this.board[selectedRow][selectedCol];

            if (this.isValidMove(selectedRow, selectedCol, row, col)) {
                this.makeMove(selectedRow, selectedCol, row, col);
                this.clearSelection();
            } else if (piece && this.getPieceColor(piece) === this.currentPlayer) {
                this.selectSquare(row, col);
            } else {
                this.clearSelection();
            }
        } else if (piece && this.getPieceColor(piece) === this.currentPlayer) {
            this.selectSquare(row, col);
        }
    }

    selectSquare(row, col) {
        this.clearSelection();
        this.selectedSquare = [row, col];
        
        const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        square.classList.add('selected');
        
        this.showValidMoves(row, col);
    }

    clearSelection() {
        this.selectedSquare = null;
        this.validMoves = [];
        
        document.querySelectorAll('.square').forEach(square => {
            square.classList.remove('selected', 'valid-move', 'capture-move');
        });
    }

    showValidMoves(row, col) {
        this.validMoves = this.getValidMoves(row, col);
        
        this.validMoves.forEach(([moveRow, moveCol]) => {
            const square = document.querySelector(`[data-row="${moveRow}"][data-col="${moveCol}"]`);
            if (this.board[moveRow][moveCol]) {
                square.classList.add('capture-move');
            } else {
                square.classList.add('valid-move');
            }
        });
    }

    getValidMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        const pieceType = this.getPieceType(piece);
        const pieceColor = this.getPieceColor(piece);
        let moves = [];

        switch (pieceType) {
            case 'pawn':
                moves = this.getPawnMoves(row, col, pieceColor);
                break;
            case 'rook':
                moves = this.getRookMoves(row, col, pieceColor);
                break;
            case 'knight':
                moves = this.getKnightMoves(row, col, pieceColor);
                break;
            case 'bishop':
                moves = this.getBishopMoves(row, col, pieceColor);
                break;
            case 'queen':
                moves = this.getQueenMoves(row, col, pieceColor);
                break;
            case 'king':
                moves = this.getKingMoves(row, col, pieceColor);
                break;
        }

        return moves.filter(([moveRow, moveCol]) => 
            this.wouldNotBeInCheck(row, col, moveRow, moveCol)
        );
    }

    getPawnMoves(row, col, color) {
        const moves = [];
        const direction = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;

        // Move forward one square
        if (this.isInBounds(row + direction, col) && !this.board[row + direction][col]) {
            moves.push([row + direction, col]);

            // Move forward two squares from starting position
            if (row === startRow && !this.board[row + 2 * direction][col]) {
                moves.push([row + 2 * direction, col]);
            }
        }

        // Capture diagonally
        [-1, 1].forEach(colOffset => {
            const newCol = col + colOffset;
            const newRow = row + direction;
            
            if (this.isInBounds(newRow, newCol)) {
                const targetPiece = this.board[newRow][newCol];
                if (targetPiece && this.getPieceColor(targetPiece) !== color) {
                    moves.push([newRow, newCol]);
                }
            }
        });

        // En passant
        if (this.enPassantTarget) {
            const [enPassantRow, enPassantCol] = this.enPassantTarget;
            if (row + direction === enPassantRow && Math.abs(col - enPassantCol) === 1) {
                moves.push([enPassantRow, enPassantCol]);
            }
        }

        return moves;
    }

    getRookMoves(row, col, color) {
        const moves = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        directions.forEach(([rowDir, colDir]) => {
            for (let i = 1; i < 8; i++) {
                const newRow = row + rowDir * i;
                const newCol = col + colDir * i;

                if (!this.isInBounds(newRow, newCol)) break;

                const targetPiece = this.board[newRow][newCol];
                if (!targetPiece) {
                    moves.push([newRow, newCol]);
                } else {
                    if (this.getPieceColor(targetPiece) !== color) {
                        moves.push([newRow, newCol]);
                    }
                    break;
                }
            }
        });

        return moves;
    }

    getKnightMoves(row, col, color) {
        const moves = [];
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        knightMoves.forEach(([rowOffset, colOffset]) => {
            const newRow = row + rowOffset;
            const newCol = col + colOffset;

            if (this.isInBounds(newRow, newCol)) {
                const targetPiece = this.board[newRow][newCol];
                if (!targetPiece || this.getPieceColor(targetPiece) !== color) {
                    moves.push([newRow, newCol]);
                }
            }
        });

        return moves;
    }

    getBishopMoves(row, col, color) {
        const moves = [];
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

        directions.forEach(([rowDir, colDir]) => {
            for (let i = 1; i < 8; i++) {
                const newRow = row + rowDir * i;
                const newCol = col + colDir * i;

                if (!this.isInBounds(newRow, newCol)) break;

                const targetPiece = this.board[newRow][newCol];
                if (!targetPiece) {
                    moves.push([newRow, newCol]);
                } else {
                    if (this.getPieceColor(targetPiece) !== color) {
                        moves.push([newRow, newCol]);
                    }
                    break;
                }
            }
        });

        return moves;
    }

    getQueenMoves(row, col, color) {
        return [
            ...this.getRookMoves(row, col, color),
            ...this.getBishopMoves(row, col, color)
        ];
    }

    getKingMoves(row, col, color) {
        const moves = [];
        const kingMoves = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];

        kingMoves.forEach(([rowOffset, colOffset]) => {
            const newRow = row + rowOffset;
            const newCol = col + colOffset;

            if (this.isInBounds(newRow, newCol)) {
                const targetPiece = this.board[newRow][newCol];
                if (!targetPiece || this.getPieceColor(targetPiece) !== color) {
                    moves.push([newRow, newCol]);
                }
            }
        });

        // Castling
        if (!this.isInCheck(color)) {
            const row = color === 'white' ? 7 : 0;
            
            // Kingside castling
            if (this.castlingRights[color].kingside && 
                !this.board[row][5] && !this.board[row][6] &&
                this.getPieceType(this.board[row][7]) === 'rook') {
                if (this.wouldNotBeInCheck(row, 4, row, 5) && 
                    this.wouldNotBeInCheck(row, 4, row, 6)) {
                    moves.push([row, 6]);
                }
            }
            
            // Queenside castling
            if (this.castlingRights[color].queenside && 
                !this.board[row][3] && !this.board[row][2] && !this.board[row][1] &&
                this.getPieceType(this.board[row][0]) === 'rook') {
                if (this.wouldNotBeInCheck(row, 4, row, 3) && 
                    this.wouldNotBeInCheck(row, 4, row, 2)) {
                    moves.push([row, 2]);
                }
            }
        }

        return moves;
    }

    isInBounds(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    isValidMove(fromRow, fromCol, toRow, toCol) {
        const validMoves = this.getValidMoves(fromRow, fromCol);
        return validMoves.some(([row, col]) => row === toRow && col === toCol);
    }

    wouldNotBeInCheck(fromRow, fromCol, toRow, toCol) {
        const tempBoard = this.board.map(row => [...row]);
        const piece = tempBoard[fromRow][fromCol];
        const capturedPiece = tempBoard[toRow][toCol];
        
        tempBoard[toRow][toCol] = piece;
        tempBoard[fromRow][fromCol] = null;
        
        const pieceColor = this.getPieceColor(piece);
        const inCheck = this.isKingInCheck(tempBoard, pieceColor);
        
        return !inCheck;
    }

    isKingInCheck(board, color) {
        let kingPos = null;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece && this.getPieceType(piece) === 'king' && 
                    this.getPieceColor(piece) === color) {
                    kingPos = [row, col];
                    break;
                }
            }
            if (kingPos) break;
        }
        
        if (!kingPos) return false;
        
        const [kingRow, kingCol] = kingPos;
        const enemyColor = color === 'white' ? 'black' : 'white';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece && this.getPieceColor(piece) === enemyColor) {
                    if (this.canAttack(board, row, col, kingRow, kingCol)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    canAttack(board, fromRow, fromCol, toRow, toCol) {
        const piece = board[fromRow][fromCol];
        if (!piece) return false;

        const pieceType = this.getPieceType(piece);
        const pieceColor = this.getPieceColor(piece);
        
        const tempBoard = this.board;
        this.board = board;
        
        let canAttack = false;
        
        switch (pieceType) {
            case 'pawn':
                const direction = pieceColor === 'white' ? -1 : 1;
                canAttack = Math.abs(fromCol - toCol) === 1 && 
                           fromRow + direction === toRow;
                break;
            case 'rook':
                canAttack = this.getRookMoves(fromRow, fromCol, pieceColor)
                    .some(([row, col]) => row === toRow && col === toCol);
                break;
            case 'knight':
                canAttack = this.getKnightMoves(fromRow, fromCol, pieceColor)
                    .some(([row, col]) => row === toRow && col === toCol);
                break;
            case 'bishop':
                canAttack = this.getBishopMoves(fromRow, fromCol, pieceColor)
                    .some(([row, col]) => row === toRow && col === toCol);
                break;
            case 'queen':
                canAttack = this.getQueenMoves(fromRow, fromCol, pieceColor)
                    .some(([row, col]) => row === toRow && col === toCol);
                break;
            case 'king':
                const kingMoves = [
                    [-1, -1], [-1, 0], [-1, 1],
                    [0, -1], [0, 1],
                    [1, -1], [1, 0], [1, 1]
                ];
                canAttack = kingMoves.some(([rowOffset, colOffset]) => 
                    fromRow + rowOffset === toRow && fromCol + colOffset === toCol
                );
                break;
        }
        
        this.board = tempBoard;
        return canAttack;
    }

    isInCheck(color) {
        return this.isKingInCheck(this.board, color);
    }

    isCheckmate(color) {
        if (!this.isInCheck(color)) return false;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && this.getPieceColor(piece) === color) {
                    const validMoves = this.getValidMoves(row, col);
                    if (validMoves.length > 0) return false;
                }
            }
        }
        
        return true;
    }

    isStalemate(color) {
        if (this.isInCheck(color)) return false;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && this.getPieceColor(piece) === color) {
                    const validMoves = this.getValidMoves(row, col);
                    if (validMoves.length > 0) return false;
                }
            }
        }
        
        return true;
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];
        const pieceType = this.getPieceType(piece);
        const pieceColor = this.getPieceColor(piece);

        // Store move for undo
        this.moveHistory.push({
            from: [fromRow, fromCol],
            to: [toRow, toCol],
            piece: piece,
            capturedPiece: capturedPiece,
            enPassantTarget: this.enPassantTarget,
            castlingRights: JSON.parse(JSON.stringify(this.castlingRights))
        });

        // Handle en passant capture
        if (pieceType === 'pawn' && this.enPassantTarget && 
            toRow === this.enPassantTarget[0] && toCol === this.enPassantTarget[1]) {
            const capturedRow = pieceColor === 'white' ? toRow + 1 : toRow - 1;
            const enPassantCapturedPiece = this.board[capturedRow][toCol];
            this.board[capturedRow][toCol] = null;
            this.capturedPieces[this.getPieceColor(enPassantCapturedPiece)].push(enPassantCapturedPiece);
        }

        // Update en passant target
        this.enPassantTarget = null;
        if (pieceType === 'pawn' && Math.abs(fromRow - toRow) === 2) {
            const enPassantRow = pieceColor === 'white' ? toRow + 1 : toRow - 1;
            this.enPassantTarget = [enPassantRow, toCol];
        }

        // Handle castling
        if (pieceType === 'king' && Math.abs(fromCol - toCol) === 2) {
            const row = pieceColor === 'white' ? 7 : 0;
            if (toCol === 6) { // Kingside
                this.board[row][5] = this.board[row][7];
                this.board[row][7] = null;
            } else if (toCol === 2) { // Queenside
                this.board[row][3] = this.board[row][0];
                this.board[row][0] = null;
            }
        }

        // Update castling rights
        if (pieceType === 'king') {
            this.castlingRights[pieceColor].kingside = false;
            this.castlingRights[pieceColor].queenside = false;
        }
        if (pieceType === 'rook') {
            if (fromCol === 0) {
                this.castlingRights[pieceColor].queenside = false;
            } else if (fromCol === 7) {
                this.castlingRights[pieceColor].kingside = false;
            }
        }

        // Make the move
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;

        // Handle capture
        if (capturedPiece) {
            this.capturedPieces[this.getPieceColor(capturedPiece)].push(capturedPiece);
        }

        // Check for pawn promotion
        if (pieceType === 'pawn' && (toRow === 0 || toRow === 7)) {
            this.showPromotionDialog(toRow, toCol, pieceColor);
            return;
        }

        this.finishTurn();
    }

    showPromotionDialog(row, col, color) {
        this.promotionPending = { row, col, color };
        const modal = document.getElementById('promotion-modal');
        modal.style.display = 'block';
    }

    handlePawnPromotion(pieceType) {
        const modal = document.getElementById('promotion-modal');
        modal.style.display = 'none';

        if (!this.promotionPending) return;

        const { row, col, color } = this.promotionPending;
        const pieceMap = {
            queen: color === 'white' ? '♕' : '♛',
            rook: color === 'white' ? '♖' : '♜',
            bishop: color === 'white' ? '♗' : '♝',
            knight: color === 'white' ? '♘' : '♞'
        };

        this.board[row][col] = pieceMap[pieceType];
        this.promotionPending = null;

        this.finishTurn();
    }

    finishTurn() {
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        this.renderBoard();

        // Check game state
        if (this.isCheckmate(this.currentPlayer)) {
            const winner = this.currentPlayer === 'white' ? 'Black' : 'White';
            setTimeout(() => {
                alert(`Checkmate! ${winner} wins!`);
            }, 100);
        } else if (this.isStalemate(this.currentPlayer)) {
            setTimeout(() => {
                alert('Stalemate! The game is a draw.');
            }, 100);
        }

        // Handle computer move
        if (this.gameMode === 'computer' && this.currentPlayer === 'black') {
            this.makeComputerMove();
        }
    }

    makeComputerMove() {
        if (this.isComputerThinking) return;
        
        this.isComputerThinking = true;
        this.updateGameInfo();
        
        // Use setTimeout to allow UI to update
        setTimeout(() => {
            const bestMove = this.ai.getBestMove(this.board, 'black', this.capturedPieces);
            
            if (bestMove) {
                const [fromRow, fromCol, toRow, toCol] = bestMove;
                
                // Execute the move
                const piece = this.board[fromRow][fromCol];
                const capturedPiece = this.board[toRow][toCol];
                const pieceType = this.getPieceType(piece);
                
                // Handle capture
                if (capturedPiece) {
                    this.capturedPieces[this.getPieceColor(capturedPiece)].push(capturedPiece);
                }
                
                // Make the move
                this.board[toRow][toCol] = piece;
                this.board[fromRow][fromCol] = null;
                
                // Check for pawn promotion
                if (pieceType === 'pawn' && (toRow === 0 || toRow === 7)) {
                    // Auto-promote to queen for simplicity
                    this.board[toRow][toCol] = '♛';
                }
                
                this.isComputerThinking = false;
                this.finishTurn();
            } else {
                this.isComputerThinking = false;
            }
        }, 500);
    }

    handleSquareClick(row, col) {
        // Prevent moves during computer thinking or in online mode when not player's turn
        if (this.isComputerThinking || (this.gameMode === 'online' && !this.isMyTurn)) {
            return;
        }

        // In computer mode, only allow white moves
        if (this.gameMode === 'computer' && this.currentPlayer === 'black') {
            return;
        }

        const piece = this.board[row][col];

        if (this.selectedSquare) {
            const [selectedRow, selectedCol] = this.selectedSquare;
            const selectedPiece = this.board[selectedRow][selectedCol];

            if (this.isValidMove(selectedRow, selectedCol, row, col)) {
                this.makeMove(selectedRow, selectedCol, row, col);
                this.clearSelection();
            } else if (piece && this.getPieceColor(piece) === this.currentPlayer) {
                this.selectSquare(row, col);
            } else {
                this.clearSelection();
            }
        } else if (piece && this.getPieceColor(piece) === this.currentPlayer) {
            this.selectSquare(row, col);
        }
    }

    updateGameInfo() {
        const turnElement = document.getElementById('current-turn');
        
        if (this.gameMode === 'computer' && this.isComputerThinking) {
            turnElement.textContent = 'Computer is thinking...';
        } else if (this.gameMode === 'computer') {
            turnElement.textContent = this.currentPlayer === 'white' ? "Your Turn (White)" : "Computer's Turn (Black)";
        } else {
            turnElement.textContent = `${this.currentPlayer === 'white' ? 'White' : 'Black'}'s Turn`;
        }

        const checkWarning = document.getElementById('check-warning');
        if (this.isInCheck(this.currentPlayer)) {
            checkWarning.textContent = '⚠️ CHECK!';
        } else {
            checkWarning.textContent = '';
        }
    }

    updateCapturedPieces() {
        const whiteCapturedElement = document.getElementById('white-captured');
        const blackCapturedElement = document.getElementById('black-captured');

        whiteCapturedElement.innerHTML = this.capturedPieces.white
            .map(piece => `<span class="captured-piece piece white">${piece}</span>`)
            .join('');

        blackCapturedElement.innerHTML = this.capturedPieces.black
            .map(piece => `<span class="captured-piece piece black">${piece}</span>`)
            .join('');
    }

    undoMove() {
        if (this.moveHistory.length === 0) return;

        const lastMove = this.moveHistory.pop();
        const { from, to, piece, capturedPiece, enPassantTarget, castlingRights } = lastMove;

        this.board[from[0]][from[1]] = piece;
        this.board[to[0]][to[1]] = capturedPiece;

        this.enPassantTarget = enPassantTarget;
        this.castlingRights = castlingRights;

        if (capturedPiece) {
            this.capturedPieces[this.getPieceColor(capturedPiece)].pop();
        }

        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        this.renderBoard();
    }

    resetGame() {
        this.board = [];
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.validMoves = [];
        this.capturedPieces = { white: [], black: [] };
        this.moveHistory = [];
        this.enPassantTarget = null;
        this.castlingRights = {
            white: { kingside: true, queenside: true },
            black: { kingside: true, queenside: true }
        };
        this.initializeBoard();
        this.renderBoard();
    }

    // Multiplayer Methods
    showModeSelection() {
        this.hideAllSections();
        document.getElementById('mode-selection').classList.remove('hidden');
    }

    showOnlineSetup() {
        this.hideAllSections();
        document.getElementById('online-setup').classList.remove('hidden');
    }

    showGameContainer() {
        this.hideAllSections();
        document.getElementById('game-container').classList.remove('hidden');
        this.renderBoard();
    }

    hideAllSections() {
        document.getElementById('mode-selection').classList.add('hidden');
        document.getElementById('online-setup').classList.add('hidden');
        document.getElementById('game-container').classList.add('hidden');
    }

    setupEventListeners() {
        // Mode selection
        document.getElementById('local-mode').addEventListener('click', () => {
            this.startLocalGame();
        });

        document.getElementById('computer-mode').addEventListener('click', () => {
            this.startComputerGame();
        });

        document.getElementById('online-mode').addEventListener('click', () => {
            this.startOnlineGame();
        });

        // Online setup
        document.getElementById('create-room').addEventListener('click', () => {
            this.createRoom();
        });

        document.getElementById('join-room').addEventListener('click', () => {
            this.joinRoom();
        });

        document.getElementById('refresh-rooms').addEventListener('click', () => {
            this.refreshRooms();
        });

        document.getElementById('back-to-modes').addEventListener('click', () => {
            this.showModeSelection();
        });

        document.getElementById('leave-room').addEventListener('click', () => {
            this.leaveRoom();
        });

        // Chess board events
        const boardElement = document.getElementById('chess-board');
        boardElement.addEventListener('click', (e) => {
            const square = e.target.closest('.square');
            if (square) {
                const row = parseInt(square.dataset.row);
                const col = parseInt(square.dataset.col);
                this.handleSquareClick(row, col);
            }
        });

        // Game controls
        document.getElementById('new-game').addEventListener('click', () => {
            this.resetGame();
        });

        document.getElementById('undo-move').addEventListener('click', () => {
            this.undoMove();
        });

        // Promotion modal
        document.querySelectorAll('.promotion-choices button').forEach(button => {
            button.addEventListener('click', (e) => {
                const piece = e.target.dataset.piece;
                this.handlePawnPromotion(piece);
            });
        });

        this.resetGame();
    }

    startOnlineGame() {
        this.gameMode = 'online';
        this.initializeSocket();
        this.showOnlineSetup();
    }

    initializeSocket() {
        if (this.socket) return;

        this.socket = io();

        this.socket.on('roomCreated', (data) => {
            this.roomId = data.roomId;
            this.board = data.gameState.board;
            this.currentPlayer = data.gameState.currentTurn;
            this.capturedPieces = data.gameState.capturedPieces;
            this.playerColor = 'white';
            this.isMyTurn = this.currentPlayer === this.playerColor;

            const shareBtn = document.getElementById('share-room');
            if (shareBtn) {
                shareBtn.classList.remove('hidden');
                shareBtn.onclick = () => this.shareRoom(this.roomId);
            }

            this.showGameContainer();
            this.updateRoomInfo();
            this.renderBoard();
        });

        this.socket.on('roomJoined', (data) => {
            this.roomId = data.roomId;
            this.board = data.gameState.board;
            this.currentPlayer = data.gameState.currentTurn;
            this.capturedPieces = data.gameState.capturedPieces;
            this.playerColor = 'black';
            this.isMyTurn = this.currentPlayer === this.playerColor;

            const shareBtn = document.getElementById('share-room');
            if (shareBtn) {
                shareBtn.classList.add('hidden');
            }

            this.showGameContainer();
            this.updateRoomInfo();
            this.renderBoard();
        });

        this.socket.on('moveMade', (data) => {
            this.board = data.gameState.board;
            this.currentPlayer = data.gameState.currentTurn;
            this.capturedPieces = data.gameState.capturedPieces;
            this.isMyTurn = this.currentPlayer === this.playerColor;

            this.clearSelection();
            this.renderBoard();
        });

        this.socket.on('opponentJoined', (data) => {
            alert(`${data.player.name} joined the room!`);
        });

        this.socket.on('playerDisconnected', () => {
            alert('Your opponent has disconnected.');
        });

        this.socket.on('roomsList', (rooms) => {
            this.displayRooms(rooms);
        });

        this.socket.on('error', (error) => {
            alert(error);
        });
    }

    createRoom() {
        const playerName = document.getElementById('player-name').value.trim() || 'Player 1';
        this.socket.emit('createRoom', playerName);
    }

    joinRoom() {
        const roomCode = document.getElementById('room-code').value.trim();
        const playerName = document.getElementById('player-name').value.trim() || 'Player 2';

        if (!roomCode) {
            alert('Please enter a room code');
            return;
        }

        this.socket.emit('joinRoom', { roomId: roomCode, playerName });
    }

    refreshRooms() {
        if (this.socket) {
            this.socket.emit('getRooms');
        }
    }

    shareRoom(roomId) {
        const roomLink = window.location.origin + '/room/' + roomId;
        const shareText = `Join my chess room! \nRoom: ${roomId}\nLink: ${roomLink}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

        if (navigator.share) {
            navigator
                .share({
                    title: 'Chess Room - ' + roomId,
                    text: shareText,
                    url: roomLink
                })
                .catch(() => {
                    this.copyToClipboard(roomLink);
                });
            return;
        }

        window.open(whatsappUrl, '_blank');
        this.copyToClipboard(roomLink);
    }

    copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard
                .writeText(text)
                .then(() => this.showNotification('Room link copied to clipboard!'))
                .catch(() => this.showNotification('Failed to copy link'));
            return;
        }

        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            this.showNotification('Room link copied to clipboard!');
        } catch {
            this.showNotification('Failed to copy link');
        }
        document.body.removeChild(textArea);
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className =
            'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 50);

        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (notification.parentNode) notification.parentNode.removeChild(notification);
            }, 300);
        }, 2500);
    }

    leaveRoom() {
        if (this.socket) {
            this.socket.disconnect();
        }

        this.socket = null;
        this.roomId = null;
        this.playerColor = null;
        this.isMyTurn = false;
        this.gameMode = 'local';
        this.showModeSelection();
    }

    displayRooms(rooms) {
        const roomsList = document.getElementById('rooms-list');
        roomsList.innerHTML = '';
        
        if (rooms.length === 0) {
            roomsList.innerHTML = '<p>No available rooms</p>';
            return;
        }
        
        rooms.forEach(room => {
            const roomItem = document.createElement('div');
            roomItem.className = 'room-item';
            roomItem.innerHTML = `
                <span class="room-code">${room.id}</span>
                <span class="room-players">${room.playerCount}/2 players</span>
            `;
            roomItem.addEventListener('click', () => {
                document.getElementById('room-code').value = room.id;
            });
            roomsList.appendChild(roomItem);
        });
    }

    updateRoomInfo() {
        if (this.gameMode === 'online' && this.roomId) {
            document.getElementById('room-code-display').textContent = `Room: ${this.roomId}`;
            document.getElementById('player-color').textContent = `You are: ${this.playerColor}`;
            document.getElementById('player-color').className = this.playerColor;
            document.getElementById('room-info').classList.remove('hidden');
            document.getElementById('leave-room').classList.remove('hidden');
        }
    }

    handleSquareClick(row, col) {
        // In online mode, only allow moves when it's the player's turn
        if (this.gameMode === 'online' && !this.isMyTurn) {
            return;
        }

        const piece = this.board[row][col];

        if (this.selectedSquare) {
            const [selectedRow, selectedCol] = this.selectedSquare;
            const selectedPiece = this.board[selectedRow][selectedCol];

            if (this.isValidMove(selectedRow, selectedCol, row, col)) {
                this.makeMove(selectedRow, selectedCol, row, col);
                this.clearSelection();
            } else if (piece && this.getPieceColor(piece) === this.currentPlayer) {
                this.selectSquare(row, col);
            } else {
                this.clearSelection();
            }
        } else if (piece && this.getPieceColor(piece) === this.currentPlayer) {
            this.selectSquare(row, col);
        }
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];
        const pieceType = this.getPieceType(piece);
        const pieceColor = this.getPieceColor(piece);

        // In online mode, send move to server
        if (this.gameMode === 'online') {
            this.socket.emit('makeMove', {
                roomId: this.roomId,
                fromRow, fromCol, toRow, toCol
            });
            return;
        }

        // Local game logic (existing code)
        this.moveHistory.push({
            from: [fromRow, fromCol],
            to: [toRow, toCol],
            piece: piece,
            capturedPiece: capturedPiece,
            enPassantTarget: this.enPassantTarget,
            castlingRights: JSON.parse(JSON.stringify(this.castlingRights))
        });

        // Handle en passant capture
        if (pieceType === 'pawn' && this.enPassantTarget && 
            toRow === this.enPassantTarget[0] && toCol === this.enPassantTarget[1]) {
            const capturedRow = pieceColor === 'white' ? toRow + 1 : toRow - 1;
            const enPassantCapturedPiece = this.board[capturedRow][toCol];
            this.board[capturedRow][toCol] = null;
            this.capturedPieces[this.getPieceColor(enPassantCapturedPiece)].push(enPassantCapturedPiece);
        }

        // Update en passant target
        this.enPassantTarget = null;
        if (pieceType === 'pawn' && Math.abs(fromRow - toRow) === 2) {
            const enPassantRow = pieceColor === 'white' ? toRow + 1 : toRow - 1;
            this.enPassantTarget = [enPassantRow, toCol];
        }

        // Handle castling
        if (pieceType === 'king' && Math.abs(fromCol - toCol) === 2) {
            const row = pieceColor === 'white' ? 7 : 0;
            if (toCol === 6) { // Kingside
                this.board[row][5] = this.board[row][7];
                this.board[row][7] = null;
            } else if (toCol === 2) { // Queenside
                this.board[row][3] = this.board[row][0];
                this.board[row][0] = null;
            }
        }

        // Update castling rights
        if (pieceType === 'king') {
            this.castlingRights[pieceColor].kingside = false;
            this.castlingRights[pieceColor].queenside = false;
        }
        if (pieceType === 'rook') {
            if (fromCol === 0) {
                this.castlingRights[pieceColor].queenside = false;
            } else if (fromCol === 7) {
                this.castlingRights[pieceColor].kingside = false;
            }
        }

        // Make the move
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;

        // Handle capture
        if (capturedPiece) {
            this.capturedPieces[this.getPieceColor(capturedPiece)].push(capturedPiece);
        }

        // Check for pawn promotion
        if (pieceType === 'pawn' && (toRow === 0 || toRow === 7)) {
            this.showPromotionDialog(toRow, toCol, pieceColor);
            return;
        }

        this.finishTurn();
    }

    updateGameInfo() {
        const turnElement = document.getElementById('current-turn');
        if (this.gameMode === 'online') {
            turnElement.textContent = `${this.currentPlayer === 'white' ? 'White' : 'Black'}'s Turn`;
        } else {
            turnElement.textContent = `${this.currentPlayer === 'white' ? 'White' : 'Black'}'s Turn`;
        }

        const checkWarning = document.getElementById('check-warning');
        if (this.isInCheck(this.currentPlayer)) {
            checkWarning.textContent = '⚠️ CHECK!';
        } else {
            checkWarning.textContent = '';
        }
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChessGame();
});