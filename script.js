const pits = [];
const numPits = 7;
const initialSeeds = 4;
let currentPlayer = 1;
let isAnimating = false;
const capturedSeeds = { 1: 0, 2: 0 };

function createBoard() {
    const player1Row = document.getElementById('player-1');
    const player2Row = document.getElementById('player-2');
    player1Row.innerHTML = '';
    player2Row.innerHTML = '';
    pits.length = 0;

    const tempPits = [];

    for (let i = 0; i < numPits; i++) {
        const pit1 = createPit(i, 1);
        player1Row.appendChild(pit1.element);
        tempPits.push(pit1);
    }

    const player2Pits = [];
    for (let i = 0; i < numPits; i++) {
        const pit2 = createPit(i, 2);
        player2Pits.push(pit2);
    }

    player2Pits.slice().reverse().forEach(pit => {
        player2Row.appendChild(pit.element);
    });

    pits.push(...tempPits, ...player2Pits);

    updateHighlights();
    updateCapturesUI();
}

function createPit(index, player) {
    const pit = document.createElement('div');
    pit.classList.add('pit');
    pit.dataset.index = index;
    pit.dataset.player = player;

    const pitData = { element: pit, seeds: initialSeeds, index, player };
    pit.pitData = pitData;

    pit.addEventListener('click', () => handleMove(pitData));
    updatePitDisplay(pitData);

    return pitData;
}

function updatePitDisplay(pitData) {
    pitData.element.innerHTML = '';

    // Add seed count at center
    const count = document.createElement('div');
    count.style.position = 'absolute';
    count.style.top = '5px';
    count.style.width = '100%';
    count.style.textAlign = 'center';
    count.style.color = 'white';
    count.style.fontSize = '18px';
    count.style.fontWeight = 'bold';
    count.innerText = pitData.seeds;
    pitData.element.appendChild(count);

    // Visual seeds
    for (let i = 0; i < pitData.seeds; i++) {
        const seed = document.createElement('div');
        seed.classList.add('seed');
        seed.style.top = `${Math.random() * 40 + 15}px`;
        seed.style.left = `${Math.random() * 40 + 15}px`;
        pitData.element.appendChild(seed);
    }

    if (pitData.player === currentPlayer) {
        pitData.element.classList.add('highlight');
    } else {
        pitData.element.classList.remove('highlight');
    }
}

async function handleMove(pitData) {
    if (isAnimating || pitData.player !== currentPlayer || pitData.seeds === 0) return;

    isAnimating = true;
    let flatIndex = getPitIndex(pitData);
    let seeds = pitData.seeds;
    pitData.seeds = 0;
    updatePitDisplay(pitData);
    let capturedThisTurn = 0;

    while (true) {
        flatIndex = await distributeSeeds(flatIndex, seeds);
        let lastPit = pits[flatIndex];
        const captured = checkCapture(flatIndex);
        capturedThisTurn += captured;

        if (lastPit.seeds > 1) {
            seeds = lastPit.seeds;
            lastPit.seeds = 0;
            updatePitDisplay(lastPit);
        } else {
            break;
        }
    }

    if (capturedThisTurn > 0) {
        document.getElementById('last-capture').innerText = `Player ${currentPlayer} captured ${capturedThisTurn} seeds this turn.`;
    } else {
        document.getElementById('last-capture').innerText = '';
    }

    isAnimating = false;
    switchTurn();
    setTimeout(checkGameEnd, 100);
}

function getPitIndex(pitData) {
    return pits.findIndex(p => p.player === pitData.player && p.index === pitData.index);
}

async function distributeSeeds(startIndex, seeds) {
    let index = startIndex;
    while (seeds > 0) {
        index = (index + 1) % pits.length;
        await animateSeedMovement(pits[startIndex], pits[index]);
        pits[index].seeds++;
        updatePitDisplay(pits[index]);
        seeds--;
    }
    return index;
}

function animateSeedMovement(fromPit, toPit) {
    return new Promise(resolve => {
        const seed = document.createElement('div');
        seed.classList.add('seed');
        document.body.appendChild(seed);

        const from = fromPit.element.getBoundingClientRect();
        const to = toPit.element.getBoundingClientRect();

        seed.style.position = 'absolute';
        seed.style.top = `${from.top + from.height / 2}px`;
        seed.style.left = `${from.left + from.width / 2}px`;

        setTimeout(() => {
            seed.style.transition = 'top 0.3s linear, left 0.3s linear';
            seed.style.top = `${to.top + to.height / 2}px`;
            seed.style.left = `${to.left + to.width / 2}px`;

            setTimeout(() => {
                seed.remove();
                resolve();
            }, 300);
        }, 50);
    });
}

function checkCapture(index) {
    const pit = pits[index];
    const oppositeIndex = (numPits * 2 - 1) - index;

    if (pit.seeds === 1 && pit.player === currentPlayer && pits[oppositeIndex].seeds > 0) {
        const captured = pits[oppositeIndex].seeds + 1;
        pits[oppositeIndex].seeds = 0;
        pit.seeds = 0;
        capturedSeeds[currentPlayer] += captured;

        updatePitDisplay(pits[oppositeIndex]);
        updatePitDisplay(pit);
        updateCapturesUI();

        return captured;
    }
    return 0;
}

function switchTurn() {
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    document.getElementById("status").innerText = `Player ${currentPlayer}'s Turn`;
    updateHighlights();
}

function updateHighlights() {
    pits.forEach(pit => updatePitDisplay(pit));
}

function updateCapturesUI() {
    const p1 = document.getElementById('capture-1');
    const p2 = document.getElementById('capture-2');
    p1.innerText = capturedSeeds[1];
    p2.innerText = capturedSeeds[2];
    [p1, p2].forEach(el => {
        el.classList.remove("score-bump");
        void el.offsetWidth;
        el.classList.add("score-bump");
    });
}

function restartGame() {
    createBoard();
    currentPlayer = 1;
    capturedSeeds[1] = 0;
    capturedSeeds[2] = 0;
    document.getElementById('status').innerText = `Player 1's Turn`;
    document.getElementById('last-capture').innerText = '';
    updateCapturesUI();
}

function checkGameEnd() {
    const p1Pits = pits.slice(0, numPits);
    const p2Pits = pits.slice(numPits);

    const p1Empty = p1Pits.every(p => p.seeds === 0);
    const p2Empty = p2Pits.every(p => p.seeds === 0);

    if (p1Empty || p2Empty) {
        if (!p1Empty) {
            p1Pits.forEach(p => {
                capturedSeeds[1] += p.seeds;
                p.seeds = 0;
                updatePitDisplay(p);
            });
        }
        if (!p2Empty) {
            p2Pits.forEach(p => {
                capturedSeeds[2] += p.seeds;
                p.seeds = 0;
                updatePitDisplay(p);
            });
        }

        updateCapturesUI();

        let message = 'Game Over! ';
        if (capturedSeeds[1] > capturedSeeds[2]) {
            message += `Player 1 wins with ${capturedSeeds[1]} seeds!`;
            showCelebration();
        } else if (capturedSeeds[2] > capturedSeeds[1]) {
            message += `Player 2 wins with ${capturedSeeds[2]} seeds!`;
            showCelebration();
        } else {
            message += 'It’s a tie!';
        }
        document.getElementById("status").innerHTML = message;

        pits.forEach(p => {
            p.element.onclick = null;
        });
    }
}

createBoard();

function showCelebration() {
    const canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    document.body.appendChild(canvas);

    canvas.style.position = 'fixed';
    canvas.style.top = 0;
    canvas.style.left = 0;
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = 1000;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const confetti = [];

    for (let i = 0; i < 150; i++) {
        confetti.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            r: Math.random() * 6 + 4,
            d: Math.random() * 10 + 5,
            color: `hsl(${Math.random() * 360}, 100%, 50%)`,
            tilt: Math.random() * 10 - 10,
            tiltAngle: 0,
            tiltAngleIncrement: Math.random() * 0.1 + 0.05
        });
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        confetti.forEach(p => {
            ctx.beginPath();
            ctx.lineWidth = p.r;
            ctx.strokeStyle = p.color;
            ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
            ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.d / 2);
            ctx.stroke();
        });

        update();
        requestAnimationFrame(draw);
    }

    function update() {
        confetti.forEach(p => {
            p.y += Math.cos(p.d / 5) + 2;
            p.tiltAngle += p.tiltAngleIncrement;
            p.tilt = Math.sin(p.tiltAngle) * 15;

            if (p.y > canvas.height) {
                p.y = -10;
                p.x = Math.random() * canvas.width;
            }
        });
    }

    draw();

    // Remove confetti after 5s
    setTimeout(() => {
        canvas.remove();
    }, 5000);
}
