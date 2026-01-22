const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname)));

// Game rooms storage
const rooms = new Map();

// Room link generation
const generateRoomLink = (roomId) => {
    return `http://localhost:3000/room/${roomId}`;
};

class ChessRoom {
    constructor(roomId) {
        this.id = roomId;
        this.players = [];
        this.board = this.initializeBoard();
        this.currentTurn = 'white';
        this.gameStatus = 'waiting'; // waiting, playing, finished
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.enPassantTarget = null;
        this.castlingRights = {
            white: { kingside: true, queenside: true },
            black: { kingside: true, queenside: true }
        };
        this.createdAt = new Date();
        this.link = generateRoomLink(roomId);
    }

    initializeBoard() {
        return [
            ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
            ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
            ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
        ];
    }

    addPlayer(playerId, playerName) {
        if (this.players.length >= 2) return false;
        
        const color = this.players.length === 0 ? 'white' : 'black';
        this.players.push({
            id: playerId,
            name: playerName,
            color: color,
            connected: true
        });
        
        if (this.players.length === 2) {
            this.gameStatus = 'playing';
        }
        
        return true;
    }

    removePlayer(playerId) {
        const playerIndex = this.players.findIndex(p => p.id === playerId);
        if (playerIndex !== -1) {
            this.players[playerIndex].connected = false;
        }
    }

    getPlayerColor(playerId) {
        const player = this.players.find(p => p.id === playerId);
        return player ? player.color : null;
    }

    makeMove(playerId, fromRow, fromCol, toRow, toCol, promotionPiece = null) {
        const playerColor = this.getPlayerColor(playerId);
        if (!playerColor || playerColor !== this.currentTurn) {
            return { success: false, error: 'Not your turn' };
        }

        const piece = this.board[fromRow][fromCol];
        if (!piece) {
            return { success: false, error: 'No piece at source' };
        }

        // Validate move (simplified - in production, use full chess rules)
        if (!this.isValidMove(fromRow, fromCol, toRow, toCol, playerColor)) {
            return { success: false, error: 'Invalid move' };
        }

        // Execute move
        const capturedPiece = this.board[toRow][toCol];
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;

        // Handle capture
        if (capturedPiece) {
            const capturedColor = this.getPieceColor(capturedPiece);
            this.capturedPieces[capturedColor].push(capturedPiece);
        }

        // Handle pawn promotion
        if (this.getPieceType(piece) === 'pawn' && (toRow === 0 || toRow === 7)) {
            if (promotionPiece) {
                this.board[toRow][toCol] = promotionPiece;
            }
        }

        // Add to move history
        this.moveHistory.push({
            from: [fromRow, fromCol],
            to: [toRow, toCol],
            piece: piece,
            capturedPiece: capturedPiece,
            player: playerColor
        });

        // Switch turns
        this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';

        return { success: true };
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

    isValidMove(fromRow, fromCol, toRow, toCol, playerColor) {
        const piece = this.board[fromRow][fromCol];
        if (!piece || this.getPieceColor(piece) !== playerColor) {
            return false;
        }

        const targetPiece = this.board[toRow][toCol];
        if (targetPiece && this.getPieceColor(targetPiece) === playerColor) {
            return false;
        }

        // Use the same validation logic as the client
        const pieceType = this.getPieceType(piece);
        const moves = this.getPieceMoves(pieceType, fromRow, fromCol, playerColor);
        
        return moves.some(([row, col]) => row === toRow && col === toCol);
    }

    getPieceMoves(pieceType, fromRow, fromCol, playerColor) {
        const moves = [];
        
        switch (pieceType) {
            case 'pawn':
                moves.push(...this.getPawnMoves(fromRow, fromCol, playerColor));
                break;
            case 'rook':
                moves.push(...this.getRookMoves(fromRow, fromCol, playerColor));
                break;
            case 'knight':
                moves.push(...this.getKnightMoves(fromRow, fromCol, playerColor));
                break;
            case 'bishop':
                moves.push(...this.getBishopMoves(fromRow, fromCol, playerColor));
                break;
            case 'queen':
                moves.push(...this.getQueenMoves(fromRow, fromCol, playerColor));
                break;
            case 'king':
                moves.push(...this.getKingMoves(fromRow, fromCol, playerColor));
                break;
        }
        
        return moves;
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

        return moves;
    }

    isInBounds(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    getGameState() {
        return {
            id: this.id,
            players: this.players,
            board: this.board,
            currentTurn: this.currentTurn,
            gameStatus: this.gameStatus,
            capturedPieces: this.capturedPieces,
            moveHistory: this.moveHistory
        };
    }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Create new room
    socket.on('createRoom', (playerName) => {
        const roomId = uuidv4().slice(0, 8);
        const room = new ChessRoom(roomId);
        rooms.set(roomId, room);
        
        socket.join(roomId);
        room.addPlayer(socket.id, playerName || 'Player 1');
        
        socket.emit('roomCreated', { roomId, gameState: room.getGameState() });
        socket.emit('playerJoined', { player: room.players[0] });
    });

    // Join existing room
    socket.on('joinRoom', ({ roomId, playerName }) => {
        const room = rooms.get(roomId);
        if (!room) {
            socket.emit('error', 'Room not found');
            return;
        }

        if (room.players.length >= 2) {
            socket.emit('error', 'Room is full');
            return;
        }

        socket.join(roomId);
        room.addPlayer(socket.id, playerName || 'Player 2');
        
        socket.emit('roomJoined', { roomId, gameState: room.getGameState() });
        socket.emit('playerJoined', { player: room.players[room.players.length - 1] });
        
        // Notify other players
        socket.to(roomId).emit('opponentJoined', { player: room.players[room.players.length - 1] });
        socket.to(roomId).emit('gameStateUpdate', room.getGameState());
    });

    // Make move
    socket.on('makeMove', ({ roomId, fromRow, fromCol, toRow, toCol, promotionPiece }) => {
        const room = rooms.get(roomId);
        if (!room) {
            socket.emit('error', 'Room not found');
            return;
        }

        const result = room.makeMove(socket.id, fromRow, fromCol, toRow, toCol, promotionPiece);
        
        if (result.success) {
            io.to(roomId).emit('moveMade', {
                fromRow, fromCol, toRow, toCol, promotionPiece,
                gameState: room.getGameState()
            });
        } else {
            socket.emit('moveError', result.error);
        }
    });

    // Get room list
    socket.on('getRooms', () => {
        const roomList = Array.from(rooms.values()).map(room => ({
            id: room.id,
            playerCount: room.players.filter(p => p.connected).length,
            gameStatus: room.gameStatus
        }));
        socket.emit('roomsList', roomList);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        // Find and update room
        for (const [roomId, room] of rooms) {
            room.removePlayer(socket.id);
            socket.to(roomId).emit('playerDisconnected', { playerId: socket.id });
            
            // Remove empty rooms
            if (room.players.filter(p => p.connected).length === 0) {
                rooms.delete(roomId);
            }
        }
    });
});

// Serve room page
app.get('/room/:roomId', (req, res) => {
    const roomId = req.params.roomId;
    const room = rooms.get(roomId);
    
    if (!room) {
        return res.status(404).send('Room not found');
    }
    
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Chess Room - ${roomId}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link rel="stylesheet" href="/style.css">
        </head>
        <body class="bg-gradient-to-br from-blue-900 to-purple-900 min-h-screen flex items-center justify-center">
            <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full mx-4">
                <div class="text-center mb-6">
                    <h1 class="text-3xl font-bold text-white mb-2">♟ Chess Room</h1>
                    <p class="text-gray-300 mb-4">Room Code: <span class="font-mono bg-white/20 px-3 py-1 rounded">${roomId}</span></p>
                    <div class="flex items-center justify-center space-x-4 text-sm text-gray-400">
                        <span>Players: ${room.players.filter(p => p.connected).length}/2</span>
                        <span>•</span>
                        <span>Status: ${room.gameStatus}</span>
                    </div>
                </div>
                
                <div class="space-y-4">
                    <button onclick="joinRoom('${roomId}')" 
                            class="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105">
                        🎮 Join Room
                    </button>
                    
                    <button onclick="shareRoom('${roomId}')" 
                            class="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-700 hover:to-teal-700 transition-all transform hover:scale-105">
                        📤 Share Room
                    </button>
                    
                    <button onclick="window.location.href='/'" 
                            class="w-full bg-gray-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-700 transition-all">
                        🏠 Back to Home
                    </button>
                </div>
                
                <div class="mt-6 text-center text-gray-400 text-sm">
                    <p>Share this link with friends to play together!</p>
                </div>
            </div>
            
            <script>
                function joinRoom(roomId) {
                    window.location.href = '/?room=' + roomId;
                }
                
                function shareRoom(roomId) {
                    const roomLink = window.location.origin + '/room/' + roomId;
                    const shareText = 'Join my chess room! 🎮\\nRoom: ' + roomId + '\\nLink: ' + roomLink;
                    
                    if (navigator.share) {
                        navigator.share({
                            title: 'Chess Room - ' + roomId,
                            text: shareText,
                            url: roomLink
                        });
                    } else {
                        // Copy to clipboard
                        navigator.clipboard.writeText(roomLink).then(() => {
                            alert('Room link copied to clipboard! 📋');
                        });
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// Serve about page
app.get('/about', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>About - Chess Game</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link rel="stylesheet" href="/style.css">
        </head>
        <body class="bg-gradient-to-br from-blue-900 to-purple-900 min-h-screen">
            <div class="container mx-auto px-4 py-8">
                <div class="max-w-4xl mx-auto">
                    <div class="text-center mb-8">
                        <h1 class="text-4xl font-bold text-white mb-4">♟ About Chess Game</h1>
                        <p class="text-gray-300 text-lg">A modern, feature-rich chess experience</p>
                    </div>
                    
                    <div class="grid md:grid-cols-2 gap-8 mb-8">
                        <div class="bg-white/10 backdrop-blur-lg rounded-xl p-6">
                            <h2 class="text-2xl font-bold text-white mb-4">🎮 Game Modes</h2>
                            <ul class="space-y-3 text-gray-300">
                                <li class="flex items-start">
                                    <span class="text-blue-400 mr-2">🏠</span>
                                    <span><strong>Local Play:</strong> Play with a friend on the same device</span>
                                </li>
                                <li class="flex items-start">
                                    <span class="text-green-400 mr-2">🤖</span>
                                    <span><strong>Computer AI:</strong> Challenge our world-class chess engine</span>
                                </li>
                                <li class="flex items-start">
                                    <span class="text-purple-400 mr-2">🌐</span>
                                    <span><strong>Online Multiplayer:</strong> Play with friends anywhere in the world</span>
                                </li>
                            </ul>
                        </div>
                        
                        <div class="bg-white/10 backdrop-blur-lg rounded-xl p-6">
                            <h2 class="text-2xl font-bold text-white mb-4">✨ Features</h2>
                            <ul class="space-y-3 text-gray-300">
                                <li class="flex items-start">
                                    <span class="text-yellow-400 mr-2">🧠</span>
                                    <span><strong>Smart AI:</strong> Advanced minimax algorithm with alpha-beta pruning</span>
                                </li>
                                <li class="flex items-start">
                                    <span class="text-pink-400 mr-2">📱</span>
                                    <span><strong>Responsive Design:</strong> Works perfectly on all devices</span>
                                </li>
                                <li class="flex items-start">
                                    <span class="text-cyan-400 mr-2">🔗</span>
                                    <span><strong>Easy Sharing:</strong> One-click room sharing to WhatsApp & social media</span>
                                </li>
                                <li class="flex items-start">
                                    <span class="text-orange-400 mr-2">⚡</span>
                                    <span><strong>Real-time:</strong> Instant move synchronization</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-8">
                        <h2 class="text-2xl font-bold text-white mb-4">🛠️ Technical Details</h2>
                        <div class="grid md:grid-cols-3 gap-6 text-gray-300">
                            <div>
                                <h3 class="font-semibold text-white mb-2">Frontend</h3>
                                <p>HTML5, CSS3, JavaScript ES6+, TailwindCSS</p>
                            </div>
                            <div>
                                <h3 class="font-semibold text-white mb-2">Backend</h3>
                                <p>Node.js, Express, Socket.IO</p>
                            </div>
                            <div>
                                <h3 class="font-semibold text-white mb-2">AI Engine</h3>
                                <p>Minimax with Alpha-Beta Pruning, Position Evaluation</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="text-center">
                        <button onclick="window.location.href='/'" 
                                class="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-8 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105">
                            🎮 Start Playing
                        </button>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `);
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
server.listen(PORT, () => {
    console.log(`Chess server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to play`);
});
