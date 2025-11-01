class SudokuGame {
    constructor() {
        this.grid = Array(9).fill().map(() => Array(9).fill(0));
        this.solution = Array(9).fill().map(() => Array(9).fill(0));
        this.originalGrid = Array(9).fill().map(() => Array(9).fill(0));
        this.selectedCell = null;
        this.mistakes = 0;
        this.hintsUsed = 0;
        this.startTime = null;
        this.timerInterval = null;
        this.isGameComplete = false;
        this.isAnimatingSolve = false;
        this.currentPlayerName = '';
        this.currentUser = null; // authenticated username
        this.userStats = this.loadUserStats();
        this.bestTimes = this.loadBestTimes();
        this.achievements = this.loadAchievements ? this.loadAchievements() : {};
        this.leaderboard = this.loadLeaderboard ? this.loadLeaderboard() : { easy: [], medium: [], hard: [], expert: [] };
        this.hasAutoSolved = false;
        this.isDailyPuzzleToday = false;
        this.dailyQuizMode = false;
        this.dailyTargetCell = null;
        
        this.difficultyLevels = {
            easy: 40,
            medium: 50,
            hard: 60,
            expert: 70
        };
        
        this.initializeGame();
        this.setupEventListeners();
    }
    
    initializeGame() {
        this.createGrid();
        this.bootstrapAuthFromStorage();
        if (!this.currentUser) {
            this.promptAndSetPlayer();
        } else {
            this.currentPlayerName = this.currentUser;
            this.updatePlayerUI();
        }
        this.generateNewPuzzle();
        this.updateDisplay();
        this.startTimer();
        this.renderAchievements && this.renderAchievements();
    }
    
    createGrid() {
        const gridContainer = document.getElementById('sudokuGrid');
        gridContainer.innerHTML = '';
        
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                // add thick borders for 3x3 boxes
                if ((col + 1) % 3 === 0 && col !== 8) cell.classList.add('br-thick');
                if ((row + 1) % 3 === 0 && row !== 8) cell.classList.add('bb-thick');
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.addEventListener('click', () => this.selectCell(row, col));
                gridContainer.appendChild(cell);
            }
        }
    }
    
    generateNewPuzzle() {
        // Generate a complete solution
        this.generateSolution();
        
        // Copy solution to grid
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                this.solution[row][col] = this.grid[row][col];
            }
        }
        
        // Remove numbers based on difficulty
        const difficulty = document.getElementById('difficulty').value;
        const cellsToRemove = this.difficultyLevels[difficulty];
        this.removeNumbers(cellsToRemove);
        
        // Store original puzzle
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                this.originalGrid[row][col] = this.grid[row][col];
            }
        }
        
        this.resetGameStats();
    }
    
    generateSolution() {
        // Clear the grid
        this.grid = Array(9).fill().map(() => Array(9).fill(0));
        
        // Fill diagonal 3x3 boxes first (they are independent)
        this.fillDiagonalBoxes();
        
        // Solve the remaining cells
        this.solveGrid();
    }
    
    fillDiagonalBoxes() {
        for (let box = 0; box < 9; box += 3) {
            this.fillBox(box, box);
        }
    }
    
    fillBox(row, col) {
        const numbers = this.shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        let index = 0;
        
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                this.grid[row + i][col + j] = numbers[index++];
            }
        }
    }
    
    solveGrid() {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.grid[row][col] === 0) {
                    const numbers = this.shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
                    
                    for (let num of numbers) {
                        if (this.isValidMove(row, col, num)) {
                            this.grid[row][col] = num;
                            
                            if (this.solveGrid()) {
                                return true;
                            }
                            
                            this.grid[row][col] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }
    
    removeNumbers(cellsToRemove) {
        const positions = [];
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                positions.push([row, col]);
            }
        }
        
        this.shuffleArray(positions);
        
        for (let i = 0; i < cellsToRemove; i++) {
            const [row, col] = positions[i];
            this.grid[row][col] = 0;
        }
    }
    
    isValidMove(row, col, num) {
        // Check row
        for (let x = 0; x < 9; x++) {
            if (this.grid[row][x] === num) return false;
        }
        
        // Check column
        for (let x = 0; x < 9; x++) {
            if (this.grid[x][col] === num) return false;
        }
        
        // Check 3x3 box
        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;
        
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (this.grid[startRow + i][startCol + j] === num) return false;
            }
        }
        
        return true;
    }
    
    selectCell(row, col) {
        if (this.isGameComplete || this.isAnimatingSolve) return;
        
        // Don't allow selection of given cells
        if (this.originalGrid[row][col] !== 0) return;
        
        // Remove previous selection
        if (this.selectedCell) {
            const prevCell = document.querySelector(`[data-row="${this.selectedCell.row}"][data-col="${this.selectedCell.col}"]`);
            prevCell.classList.remove('selected');
        }
        
        // Select new cell
        this.selectedCell = { row, col };
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        cell.classList.add('selected');
        
        this.highlightRelatedCells(row, col);
        if (this.dailyQuizMode && this.dailyTargetCell && (this.dailyTargetCell.row !== row || this.dailyTargetCell.col !== col)) {
            // force back to target selection
            const t = this.dailyTargetCell;
            this.selectCell(t.row, t.col);
            return;
        }
    }
    
    highlightRelatedCells(row, col) {
        // Remove previous highlights
        document.querySelectorAll('.cell.highlighted').forEach(cell => {
            cell.classList.remove('highlighted');
        });
        
        // Highlight same row, column, and box
        for (let i = 0; i < 9; i++) {
            // Same row
            const rowCell = document.querySelector(`[data-row="${row}"][data-col="${i}"]`);
            if (rowCell && !rowCell.classList.contains('selected')) {
                rowCell.classList.add('highlighted');
            }
            
            // Same column
            const colCell = document.querySelector(`[data-row="${i}"][data-col="${col}"]`);
            if (colCell && !colCell.classList.contains('selected')) {
                colCell.classList.add('highlighted');
            }
        }
        
        // Same 3x3 box
        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;
        
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const boxCell = document.querySelector(`[data-row="${startRow + i}"][data-col="${startCol + j}"]`);
                if (boxCell && !boxCell.classList.contains('selected')) {
                    boxCell.classList.add('highlighted');
                }
            }
        }
    }
    
    inputNumber(num) {
        if (!this.selectedCell || this.isGameComplete || this.isAnimatingSolve) return;
        
        const { row, col } = this.selectedCell;
        
        // Don't allow input on given cells
        if (this.originalGrid[row][col] !== 0) return;
        
        // Clear previous value
        if (num === 0) {
            this.grid[row][col] = 0;
            this.updateCellDisplay(row, col);
            return;
        }
        
        // Daily quiz mode: only one guess, check exact solution for target cell
        if (this.dailyQuizMode) {
            const correct = this.solution[row][col];
            if (num === correct) {
                alert('Congrats!');
            } else {
                alert('Sorry, that\'s not correct.');
            }
            this.exitDailyQuizMode();
            return;
        }

        // Check if move is valid
        if (this.isValidMove(row, col, num)) {
            this.grid[row][col] = num;
            this.updateCellDisplay(row, col);
            const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                cell.classList.add('input-anim');
                setTimeout(() => cell.classList.remove('input-anim'), 200);
            }
            
            // Check if puzzle is complete
            if (this.isPuzzleComplete()) {
                this.completeGame();
            }
        } else {
            // Invalid move - show error
            this.showError(row, col);
            this.mistakes++;
            this.updateMistakesDisplay();
        }
    }
    
    updateCellDisplay(row, col) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        const value = this.grid[row][col];
        
        cell.textContent = value === 0 ? '' : value;
        cell.classList.remove('error', 'correct');
        
        if (value !== 0) {
            if (this.originalGrid[row][col] !== 0) {
                cell.classList.add('given');
            } else {
                cell.classList.add('correct');
            }
        }
    }
    
    showError(row, col) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        cell.classList.add('error');
        
        setTimeout(() => {
            cell.classList.remove('error');
        }, 1000);
    }
    
    isPuzzleComplete() {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.grid[row][col] === 0) return false;
            }
        }
        return true;
    }
    
    completeGame() {
        this.isGameComplete = true;
        this.stopTimer();
        const elapsedSeconds = this.getElapsedSeconds();
        this.updateBestTimeForPlayer(elapsedSeconds);
        this.updateUserStatsOnWin(elapsedSeconds);
        if (this.maybeUnlockAchievements) this.maybeUnlockAchievements({ elapsedSeconds });
        if (this.recordLeaderboardEntry) this.recordLeaderboardEntry(elapsedSeconds);
        
        // Show completion modal
        document.getElementById('finalTime').textContent = document.getElementById('timer').textContent;
        document.getElementById('finalMistakes').textContent = this.mistakes;
        document.getElementById('finalHints').textContent = this.hintsUsed;
        const scoreNow = this.calculateScore({ elapsedSeconds, mistakes: this.mistakes, hints: this.hintsUsed, firstTry: !this.hasAutoSolved });
        const scoreEl = document.getElementById('finalScore');
        if (scoreEl) scoreEl.textContent = String(scoreNow);
        document.getElementById('completionModal').classList.add('show');
    }
    
    provideHint() {
        if (this.isGameComplete) return;
        
        // Find empty cells
        const emptyCells = [];
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.grid[row][col] === 0) {
                    emptyCells.push({ row, col });
                }
            }
        }
        
        if (emptyCells.length === 0) return;
        
        // Select random empty cell
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const { row, col } = randomCell;
        
        // Fill with correct value
        this.grid[row][col] = this.solution[row][col];
        this.updateCellDisplay(row, col);
        
        this.hintsUsed++;
        this.updateHintsDisplay();
        
        // Check if puzzle is complete
        if (this.isPuzzleComplete()) {
            this.completeGame();
        }
    }
    
    async solvePuzzle() {
        if (this.isGameComplete || this.isAnimatingSolve) return;
        this.isAnimatingSolve = true;
        this.hasAutoSolved = true;

        // Gather empty cells in reading order
        const emptyCells = [];
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.grid[row][col] === 0) emptyCells.push({ row, col });
            }
        }

        // Sequentially fill cells with a pop animation
        for (let i = 0; i < emptyCells.length; i++) {
            const { row, col } = emptyCells[i];
            this.grid[row][col] = this.solution[row][col];
            this.updateCellDisplay(row, col);
            const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                cell.classList.add('fill-anim');
                // Remove the animation class shortly after to allow reflow if needed later
                setTimeout(() => cell.classList.remove('fill-anim'), 220);
            }
            await this.sleep(40);
        }

        // Ensure final grid matches solution and refresh display
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                this.grid[row][col] = this.solution[row][col];
            }
        }
        this.updateDisplay();

        this.isAnimatingSolve = false;
        this.completeGame();
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    resetPuzzle() {
        if (this.isGameComplete) return;
        
        // Reset to original puzzle
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                this.grid[row][col] = this.originalGrid[row][col];
            }
        }
        
        this.updateDisplay();
        this.resetGameStats();
    }
    
    newGame() {
        this.generateNewPuzzle();
        this.updateDisplay();
        this.resetGameStats();
        this.startTimer();
        this.isGameComplete = false;
        this.hasAutoSolved = false;
        
        // Close modal if open
        document.getElementById('completionModal').classList.remove('show');
    }
    
    resetGameStats() {
        this.mistakes = 0;
        this.hintsUsed = 0;
        this.updateMistakesDisplay();
        this.updateHintsDisplay();
        this.resetTimer();
    }
    
    updateDisplay() {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                this.updateCellDisplay(row, col);
            }
        }
    }
    
    updateMistakesDisplay() {
        document.getElementById('mistakes').textContent = this.mistakes;
    }
    
    updateHintsDisplay() {
        document.getElementById('hintsUsed').textContent = this.hintsUsed;
    }
    
    startTimer() {
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            this.updateTimer();
        }, 1000);
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    resetTimer() {
        this.stopTimer();
        this.startTime = Date.now();
        document.getElementById('timer').textContent = '00:00';
    }
    
    updateTimer() {
        if (!this.startTime) return;
        
        const elapsed = this.getElapsedSeconds();
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        document.getElementById('timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // ----- Player and Best Time Management -----
    loadBestTimes() {
        try {
            const raw = localStorage.getItem('sudokuBestTimes');
            return raw ? JSON.parse(raw) : {};
        } catch (_) {
            return {};
        }
    }

    // ----- Auth and User Management -----
    bootstrapAuthFromStorage() {
        try {
            const u = localStorage.getItem('sudokuCurrentUser');
            if (u) {
                this.currentUser = u;
                const authBtn = document.getElementById('authButton');
                const logoutBtn = document.getElementById('logoutButton');
                if (authBtn) authBtn.style.display = 'none';
                if (logoutBtn) logoutBtn.style.display = '';
            }
        } catch (_) {}
    }

    loadUserStats() {
        try {
            const raw = localStorage.getItem('sudokuUserStats');
            return raw ? JSON.parse(raw) : {};
        } catch (_) {
            return {};
        }
    }

    saveUserStats() {
        try {
            localStorage.setItem('sudokuUserStats', JSON.stringify(this.userStats));
        } catch (_) {}
    }

    getStatsForUser(username) {
        if (!this.userStats[username]) {
            this.userStats[username] = {
                winsByDifficulty: { easy: 0, medium: 0, hard: 0, expert: 0 },
                totalScore: 0,
                daily: { lastSolvedDate: null, streak: 0 }
            };
        }
        return this.userStats[username];
    }

    updateUserStatsOnWin(elapsedSeconds) {
        const username = this.currentUser || this.currentPlayerName || 'Player';
        const stats = this.getStatsForUser(username);
        const difficulty = document.getElementById('difficulty').value;
        stats.winsByDifficulty[difficulty] = (stats.winsByDifficulty[difficulty] || 0) + 1;
        const score = this.calculateScore({ elapsedSeconds, mistakes: this.mistakes, hints: this.hintsUsed, firstTry: !this.hasAutoSolved });
        stats.totalScore = (stats.totalScore || 0) + score;
        // daily streak update if current puzzle was daily
        if (this.isDailyPuzzleToday) {
            const today = this.getTodayKey();
            const last = stats.daily.lastSolvedDate;
            if (last === null || this.daysBetween(last, today) === 1) {
                stats.daily.streak = (stats.daily.streak || 0) + 1;
            } else if (last !== today) {
                stats.daily.streak = 1;
            }
            stats.daily.lastSolvedDate = today;
            this.isDailyPuzzleToday = false;
        }
        this.saveUserStats();
        // update dashboard quick values if open
        this.refreshDashboard();
    }

    calculateScore({ elapsedSeconds, mistakes, hints, firstTry }) {
        // Base 500 for first correct completion; time decay and penalties
        let score = firstTry ? 500 : 300;
        // Faster time gets more points; cap bonus at 300 for <2 min, scale down
        const timeBonus = Math.max(0, 300 - Math.floor(elapsedSeconds));
        score += Math.max(0, timeBonus);
        // penalties
        score -= mistakes * 20;
        score -= hints * 30;
        return Math.max(0, score);
    }

    saveBestTimes() {
        try {
            localStorage.setItem('sudokuBestTimes', JSON.stringify(this.bestTimes));
        } catch (_) {}
    }

    // ----- Achievements Management -----
    loadAchievements() {
        try {
            const raw = localStorage.getItem('sudokuAchievements');
            const data = raw ? JSON.parse(raw) : {};
            return data;
        } catch (_) {
            return {};
        }
    }

    saveAchievements() {
        try {
            localStorage.setItem('sudokuAchievements', JSON.stringify(this.achievements));
        } catch (_) {}
    }

    // ----- Leaderboard Management -----
    loadLeaderboard() {
        try {
            const raw = localStorage.getItem('sudokuLeaderboard');
            const data = raw ? JSON.parse(raw) : {};
            return {
                easy: data.easy || [],
                medium: data.medium || [],
                hard: data.hard || [],
                expert: data.expert || []
            };
        } catch (_) {
            return { easy: [], medium: [], hard: [], expert: [] };
        }
    }

    saveLeaderboard() {
        try {
            localStorage.setItem('sudokuLeaderboard', JSON.stringify(this.leaderboard));
        } catch (_) {}
    }

    recordLeaderboardEntry(elapsedSeconds) {
        if (this.hasAutoSolved) return; // ignore auto solves
        const difficulty = document.getElementById('difficulty').value;
        const name = this.currentPlayerName || 'Player';
        const entry = {
            name,
            time: elapsedSeconds,
            date: new Date().toISOString()
        };
        const list = this.leaderboard[difficulty] || [];
        list.push(entry);
        // sort ascending by time and keep top 20
        list.sort((a, b) => a.time - b.time);
        this.leaderboard[difficulty] = list.slice(0, 20);
        this.saveLeaderboard();
        this.renderLeaderboard(difficulty);
    }

    renderLeaderboard(activeDiff) {
        const listEl = document.getElementById('leaderboardList');
        if (!listEl) return;
        const diff = activeDiff || (document.querySelector('.leaderboard-tabs .tab-btn.active')?.dataset.diff) || 'medium';
        const list = this.leaderboard[diff] || [];
        listEl.innerHTML = '';
        if (list.length === 0) {
            const empty = document.createElement('div');
            empty.textContent = 'No times recorded yet. Win a game to appear here!';
            empty.style.color = '#6a6f92';
            listEl.appendChild(empty);
            return;
        }
        list.forEach((entry, idx) => {
            const row = document.createElement('div');
            row.className = 'leaderboard-row';
            const dateStr = new Date(entry.date).toLocaleDateString();
            row.innerHTML = `
                <div class="rank">${idx + 1}</div>
                <div class="name">${entry.name}</div>
                <div class="time">${this.formatSeconds(entry.time)}</div>
                <div class="date">${dateStr}</div>
            `;
            listEl.appendChild(row);
        });
    }

    achievementCatalog() {
        return [
            { id: 'first_win', title: 'First Victory', desc: 'Complete your first puzzle.' },
            { id: 'no_mistakes', title: 'Flawless', desc: 'Win with 0 mistakes.' },
            { id: 'no_hints', title: 'Pure Logic', desc: 'Win without using hints.' },
            { id: 'fast_5', title: 'Speedster', desc: 'Win in under 5 minutes.' },
            { id: 'fast_10', title: 'Quick Thinker', desc: 'Win in under 10 minutes.' },
            { id: 'hard_win', title: 'Challenger', desc: 'Win on Hard difficulty.' },
            { id: 'expert_win', title: 'Sudoku Sage', desc: 'Win on Expert difficulty.' }
        ];
    }

    maybeUnlockAchievements({ elapsedSeconds }) {
        if (this.hasAutoSolved) return;
        const difficulty = document.getElementById('difficulty').value;
        const unlock = (id) => {
            if (!this.achievements[id]) {
                this.achievements[id] = { unlockedAt: Date.now() };
            }
        };

        unlock('first_win');
        if (this.mistakes === 0) unlock('no_mistakes');
        if (this.hintsUsed === 0) unlock('no_hints');
        if (elapsedSeconds <= 5 * 60) unlock('fast_5');
        if (elapsedSeconds <= 10 * 60) unlock('fast_10');
        if (difficulty === 'hard') unlock('hard_win');
        if (difficulty === 'expert') unlock('expert_win');

        this.saveAchievements();
        this.renderAchievements();
    }

    renderAchievements() {
        const list = document.getElementById('achievementsList');
        if (!list) return;
        const cat = this.achievementCatalog();
        list.innerHTML = '';
        cat.forEach(a => {
            const unlocked = !!this.achievements[a.id];
            const card = document.createElement('div');
            card.className = `achievement-card${unlocked ? '' : ' locked'}`;
            card.innerHTML = `
                <div class=\"achievement-icon\"><i class=\"fas fa-medal\"></i></div>
                <div class=\"achievement-info\">
                    <div class=\"achievement-title\">${a.title}</div>
                    <div class=\"achievement-desc\">${a.desc}</div>
                </div>
            `;
            list.appendChild(card);
        });
    }

    promptAndSetPlayer() {
        let name = prompt('Enter player name') || '';
        name = name.trim();
        if (!name) name = 'Player';
        this.currentPlayerName = name;
        this.updatePlayerUI();
    }

    updatePlayerUI() {
        const nameEl = document.getElementById('currentPlayerName');
        const bestEl = document.getElementById('bestTime');
        if (nameEl) nameEl.textContent = this.currentPlayerName || '—';
        const best = this.getBestTimeForCurrentPlayer();
        if (bestEl) bestEl.textContent = Number.isFinite(best) ? this.formatSeconds(best) : '—';
    }

    getBestTimeForCurrentPlayer() {
        if (!this.currentPlayerName) return undefined;
        return this.bestTimes[this.currentPlayerName];
    }

    updateBestTimeForPlayer(elapsedSeconds) {
        if (!this.currentPlayerName) return;
        const currentBest = this.bestTimes[this.currentPlayerName];
        if (!Number.isFinite(currentBest) || elapsedSeconds < currentBest) {
            this.bestTimes[this.currentPlayerName] = elapsedSeconds;
            this.saveBestTimes();
            this.updatePlayerUI();
        }
    }

    getElapsedSeconds() {
        return Math.floor((Date.now() - (this.startTime || Date.now())) / 1000);
    }

    formatSeconds(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    }
    
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    setupEventListeners() {
        // Number pad buttons
        document.querySelectorAll('.number-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const num = parseInt(btn.dataset.number);
                this.inputNumber(num);
            });
        });
        
        // Action buttons
        document.getElementById('newGame').addEventListener('click', () => {
            this.newGame();
        });
        
        document.getElementById('hint').addEventListener('click', () => {
            this.provideHint();
        });
        
        document.getElementById('solve').addEventListener('click', () => {
            const solveBtn = document.getElementById('solve');
            solveBtn.style.transform = 'scale(0.95)';
            solveBtn.style.opacity = '0.7';
            
            setTimeout(() => {
                solveBtn.style.transform = 'scale(1)';
                solveBtn.style.opacity = '1';
            }, 150);
            
            // Ask for confirmation before solving
            if (confirm('Are you sure you want to solve the entire puzzle? This will fill in all remaining cells.')) {
                this.solvePuzzle();
            }
        });
        
        document.getElementById('reset').addEventListener('click', () => {
            this.resetPuzzle();
        });
        
        // Difficulty selector (do not prompt for name)
        document.getElementById('difficulty').addEventListener('change', () => {
            this.generateNewPuzzle();
            this.updateDisplay();
            this.resetGameStats();
            this.startTimer();
            this.isGameComplete = false;
        });
        
        // Modal buttons
        document.getElementById('playAgain').addEventListener('click', () => {
            this.newGame();
        });
        
        document.getElementById('closeModal').addEventListener('click', () => {
            document.getElementById('completionModal').classList.remove('show');
        });
        
        // Achievements modal open/close
        const openAch = document.getElementById('openAchievements');
        const closeAch = document.getElementById('closeAchievements');
        // header achievements removed; keep control button handler only
        if (closeAch) closeAch.addEventListener('click', () => {
            document.getElementById('achievementsModal').classList.remove('show');
        });
        const openLb = document.getElementById('openLeaderboard');
        const closeLb = document.getElementById('closeLeaderboard');
        // header leaderboard removed; keep control button handler only
        const openLb2 = document.getElementById('openLeaderboard2');
        if (openLb2) openLb2.addEventListener('click', () => {
            const current = document.getElementById('difficulty').value;
            document.querySelectorAll('.leaderboard-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            const btn = document.querySelector(`.leaderboard-tabs .tab-btn[data-diff="${current}"]`);
            if (btn) btn.classList.add('active');
            this.renderLeaderboard(current);
            document.getElementById('leaderboardModal').classList.add('show');
        });
        if (closeLb) closeLb.addEventListener('click', () => {
            document.getElementById('leaderboardModal').classList.remove('show');
        });
        document.querySelectorAll('.leaderboard-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.leaderboard-tabs .tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderLeaderboard(btn.dataset.diff);
            });
        });
        const openAch2 = document.getElementById('openAchievements2');
        if (openAch2) openAch2.addEventListener('click', () => {
            this.renderAchievements();
            document.getElementById('achievementsModal').classList.add('show');
        });
        
        // Auth modal open
        const authBtn = document.getElementById('authButton');
        const logoutBtn = document.getElementById('logoutButton');
        const authModal = document.getElementById('authModal');
        const closeAuth = document.getElementById('closeAuth');
        if (authBtn) authBtn.addEventListener('click', () => authModal.classList.add('show'));
        if (closeAuth) closeAuth.addEventListener('click', () => authModal.classList.remove('show'));
        if (logoutBtn) logoutBtn.addEventListener('click', () => {
            this.currentUser = null;
            localStorage.removeItem('sudokuCurrentUser');
            const authB = document.getElementById('authButton');
            const logoutB = document.getElementById('logoutButton');
            if (authB) authB.style.display = '';
            if (logoutB) logoutB.style.display = 'none';
            this.currentPlayerName = 'Player';
            this.updatePlayerUI();
        });

        // Auth tab switching
        document.querySelectorAll('[data-auth-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-auth-tab]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const tab = btn.getAttribute('data-auth-tab');
                document.getElementById('loginForm').style.display = tab === 'login' ? '' : 'none';
                document.getElementById('registerForm').style.display = tab === 'register' ? '' : 'none';
            });
        });

        // Login/Register submit
        const loginForm = document.getElementById('loginForm');
        if (loginForm) loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = document.getElementById('loginUsername').value.trim();
            const pass = document.getElementById('loginPassword').value;
            if (await this.verifyUserAsync(user, pass)) {
                this.currentUser = user;
                localStorage.setItem('sudokuCurrentUser', user);
                this.currentPlayerName = user;
                this.updatePlayerUI();
                document.getElementById('authModal').classList.remove('show');
                const authB = document.getElementById('authButton');
                const logoutB = document.getElementById('logoutButton');
                if (authB) authB.style.display = 'none';
                if (logoutB) logoutB.style.display = '';
            } else {
                alert('Invalid username or password');
            }
        });
        const regForm = document.getElementById('registerForm');
        if (regForm) regForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = document.getElementById('regUsername').value.trim();
            const pass = document.getElementById('regPassword').value;
            if (!user || !pass) return;
            if (this.userExists(user)) {
                alert('Username already exists');
                return;
            }
            await this.createUserAsync(user, pass);
            alert('Account created. You can login now.');
            // switch to login tab
            document.querySelector('[data-auth-tab="login"]').click();
        });

        // Dashboard modal
        const dashBtn = document.getElementById('openDashboard');
        const dashModal = document.getElementById('dashboardModal');
        const closeDash = document.getElementById('closeDashboard');
        if (dashBtn) dashBtn.addEventListener('click', () => {
            this.refreshDashboard();
            dashModal.classList.add('show');
        });
        if (closeDash) closeDash.addEventListener('click', () => dashModal.classList.remove('show'));

        // Daily Puzzle
        const dailyBtn = document.getElementById('dailyPuzzleBtn');
        if (dailyBtn) dailyBtn.addEventListener('click', () => {
            const m = document.getElementById('dailyModal');
            if (m) m.classList.add('show');
        });
        const startDaily = document.getElementById('startDaily');
        const closeDaily = document.getElementById('closeDaily');
        if (startDaily) startDaily.addEventListener('click', () => {
            this.startDailyPuzzle();
            const m = document.getElementById('dailyModal');
            if (m) m.classList.remove('show');
        });
        if (closeDaily) closeDaily.addEventListener('click', () => {
            const m = document.getElementById('dailyModal');
            if (m) m.classList.remove('show');
        });
        
        // Keyboard input
        document.addEventListener('keydown', (e) => {
            if (this.isGameComplete || this.isAnimatingSolve) return;
            
            const key = e.key;
            
            if (key >= '1' && key <= '9') {
                this.inputNumber(parseInt(key));
            } else if (key === '0' || key === 'Backspace' || key === 'Delete') {
                this.inputNumber(0);
            } else if (key === 'ArrowUp' || key === 'ArrowDown' || 
                      key === 'ArrowLeft' || key === 'ArrowRight') {
                this.handleArrowKeys(e);
            }
        });
        
        // Click outside to deselect
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.cell') && !e.target.closest('.number-btn')) {
                this.deselectCell();
            }
        });
    }

    // ----- Simple Local Auth (demo only) -----
    userDbKey() { return 'sudokuUsers'; }
    loadUsers() {
        try {
            const raw = localStorage.getItem(this.userDbKey());
            return raw ? JSON.parse(raw) : {};
        } catch (_) { return {}; }
    }
    saveUsers(db) {
        try { localStorage.setItem(this.userDbKey(), JSON.stringify(db)); } catch (_) {}
    }
    async hash(str) {
        // simple SHA-256 using SubtleCrypto if available; fallback to base64
        if (window.crypto?.subtle) {
            const enc = new TextEncoder();
            const buf = await crypto.subtle.digest('SHA-256', enc.encode(str));
            return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        return btoa(str);
    }
    userExists(username) {
        const db = this.loadUsers();
        return !!db[username];
    }
    async createUserAsync(username, password) {
        const db = this.loadUsers();
        const hash = await this.hash(password);
        db[username] = { passwordHash: hash };
        this.saveUsers(db);
        this.getStatsForUser(username);
        this.saveUserStats();
    }
    async verifyUserAsync(username, password) {
        const db = this.loadUsers();
        if (!db[username]) return false;
        const stored = db[username].passwordHash;
        const hash = await this.hash(password);
        return stored === hash;
    }

    // ----- Dashboard and Charts -----
    refreshDashboard() {
        const username = this.currentUser || this.currentPlayerName || 'Player';
        const stats = this.getStatsForUser(username);
        const streakEl = document.getElementById('dailyStreak');
        const totalScoreEl = document.getElementById('totalScore');
        if (streakEl) streakEl.textContent = String(stats.daily.streak || 0);
        if (totalScoreEl) totalScoreEl.textContent = String(stats.totalScore || 0);
        this.renderDifficultyChart(stats.winsByDifficulty || {});
    }

    renderDifficultyChart(wins) {
        const ctx = document.getElementById('difficultyChart');
        if (!ctx || !window.Chart) return;
        if (this._diffChart) {
            this._diffChart.destroy();
        }
        const data = [wins.easy || 0, wins.medium || 0, wins.hard || 0, wins.expert || 0];
        this._diffChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Easy', 'Medium', 'Hard', 'Expert'],
                datasets: [{
                    data,
                    backgroundColor: ['#a5b4fc', '#93c5fd', '#fbbf24', '#f87171']
                }]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });
    }

    // ----- Daily Puzzle -----
    getTodayKey() {
        const d = new Date();
        return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
    }
    daysBetween(a, b) {
        const da = new Date(a+'T00:00:00');
        const db = new Date(b+'T00:00:00');
        return Math.round((db - da) / (1000*60*60*24));
    }
    seedRandom(seed) {
        let s = 0;
        for (let i=0;i<seed.length;i++) s = (s*31 + seed.charCodeAt(i)) >>> 0;
        return () => (s = (1103515245 * s + 12345) % 0x80000000) / 0x80000000;
    }
    startDailyPuzzle() {
        const key = this.getTodayKey();
        const rng = this.seedRandom(key);
        // Temporarily swap shuffleArray to deterministic version for generation
        const origShuffle = this.shuffleArray.bind(this);
        this.shuffleArray = (arr) => {
            const a = [...arr];
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(rng() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        };
        this.generateNewPuzzle();
        // restore shuffle
        this.shuffleArray = origShuffle;
        this.updateDisplay();
        this.resetGameStats();
        this.startTimer();
        this.isGameComplete = false;
        this.isDailyPuzzleToday = true;
        // Start quiz mode: pick a random empty cell and instruct user
        const empties = [];
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (this.grid[r][c] === 0) empties.push({ row: r, col: c });
            }
        }
        if (empties.length > 0) {
            const target = empties[Math.floor(Math.random() * empties.length)];
            this.dailyTargetCell = target;
            this.dailyQuizMode = true;
            const banner = document.getElementById('dailyQuizBanner');
            if (banner) {
                banner.textContent = 'Daily Quiz: Select the highlighted cell and enter the correct number.';
                banner.style.display = '';
            }
            // highlight and select the target cell
            this.selectCell(target.row, target.col);
            const cell = document.querySelector(`[data-row="${target.row}"][data-col="${target.col}"]`);
            if (cell) cell.classList.add('highlighted');
        }
    }

    exitDailyQuizMode() {
        this.dailyQuizMode = false;
        this.dailyTargetCell = null;
        const banner = document.getElementById('dailyQuizBanner');
        if (banner) banner.style.display = 'none';
        // Deselect selection to resume normal play
        this.deselectCell();
    }
    
    handleArrowKeys(e) {
        if (!this.selectedCell) {
            this.selectCell(0, 0);
            return;
        }
        
        e.preventDefault();
        let { row, col } = this.selectedCell;
        
        switch (e.key) {
            case 'ArrowUp':
                row = Math.max(0, row - 1);
                break;
            case 'ArrowDown':
                row = Math.min(8, row + 1);
                break;
            case 'ArrowLeft':
                col = Math.max(0, col - 1);
                break;
            case 'ArrowRight':
                col = Math.min(8, col + 1);
                break;
        }
        
        this.selectCell(row, col);
    }
    
    deselectCell() {
        if (this.selectedCell) {
            const cell = document.querySelector(`[data-row="${this.selectedCell.row}"][data-col="${this.selectedCell.col}"]`);
            cell.classList.remove('selected');
            this.selectedCell = null;
            
            // Remove highlights
            document.querySelectorAll('.cell.highlighted').forEach(cell => {
                cell.classList.remove('highlighted');
            });
        }
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new SudokuGame();
});
