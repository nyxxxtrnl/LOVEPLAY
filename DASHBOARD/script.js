
"use strict";

// LOVEPLAY - PERSONALIZED BOYFRIEND GIFT SYSTEM

const HEART_GOAL = 2;
const STORAGE_KEY = "loveplay-progress-v1";
const KEEPSAKE_LETTER_STORAGE_KEY = "loveplay-keepsake-letters-v1";
const QUIZ_STORAGE_KEY = "loveplay-quiz-questions-v1";
const THEME_STORAGE_KEY = "loveplay-theme-v1";
const BACKGROUND_MUSIC_STORAGE_KEY = "loveplay-background-music-v1";
const TIKTOK_VIDEO_STORAGE_KEY = "loveplay-tiktok-videos-v1";
const DEFAULT_BACKGROUND_MUSIC = {
  title: "Perfect",
  artist: "Ed Sheeran",
  trackId: "0tgVpDi06FyKpA1z0VMD4v"
};

const gamePanel = document.getElementById("gamePanel");
const gameContent = document.getElementById("gameContent");
const gameFeedback = document.getElementById("gameFeedback");
const toast = document.getElementById("toast");

let progress = loadProgress();
let memoryState = {};
let quizState = { index: 0, score: 0 };
let toastTimer;
let snakeTimer = null;
let snakeKeyHandler = null;

// Customize these questions for your relationship.
const defaultQuizQuestions = [
  {
    question: "Which kind of moment would I choose for us?",
    options: [
      "A cozy time together",
      "A fancy award show",
      "A work meeting",
      "A long math exam"
    ],
    answer: 0
  },
  {
    question: "What is the sweetest kind of surprise?",
    options: [
      "A thoughtful message",
      "An empty box",
      "A broken alarm",
      "More homework"
    ],
    answer: 0
  },
  {
    question: "What should we collect more of?",
    options: [
      "Happy memories",
      "Unanswered emails",
      "Lost socks",
      "Traffic tickets"
    ],
    answer: 0
  },
  {
    question: "What would make an ordinary day feel special?",
    options: ["A little time together", "A pile of chores", "A broken phone", "A long queue"],
    answer: 0
  },
  {
    question: "Which message would make me smile?",
    options: ["Thinking of you", "Please do my homework", "Wrong number", "Your bill is due"],
    answer: 0
  },
  {
    question: "What should we always make time for?",
    options: ["Laughing together", "Being grumpy", "More deadlines", "Counting ceiling tiles"],
    answer: 0
  },
  {
    question: "What is one little thing I appreciate?",
    options: ["The way you are you", "Your messy inbox", "A parking ticket", "Cold leftovers"],
    answer: 0
  },
  {
    question: "If we had a free evening, what sounds best?",
    options: ["A cozy date", "A tax seminar", "Watching paint dry", "Doing laundry forever"],
    answer: 0
  },
  {
    question: "What do I hope you remember on a hard day?",
    options: ["You are loved", "You must do everything", "You cannot take a break", "You are on your own"],
    answer: 0
  },
  {
    question: "What should we collect more of?",
    options: ["Happy memories", "Unanswered emails", "Lost socks", "Traffic tickets"],
    answer: 0
  }
];
let quizQuestions = loadQuizQuestions();

// PERSONALIZED LOVE MESSAGES
const letters = {
  miss: {
    title: "When you miss me ♡",
    text: "If you are missing me right now, imagine a big warm hug from me. Even when we are busy or far apart, I am grateful that you are part of my life. You matter to me, and I am cheering for you. ♥"
  },

  tired: {
    title: "When you're tired ♡",
    text: "Take a breath, my love. You do not have to do everything perfectly or all at once. Rest when you need to, be proud of the little things you accomplish, and remember that I believe in you. One step at a time. ♥"
  },

  smile: {
    title: "When you need a smile ♡",
    text: "Surprise! This is your reminder that you are someone's favorite person. I hope this little corner of the internet makes your day a bit brighter. Please accept this imaginary pocket-sized hug. ♥"
  }
};

// LOAD SAVED GAME PROGRESS
function loadProgress() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY)
    );

    if (saved && Number.isFinite(saved.hearts)) {
      return {
        hearts: Math.min(
          HEART_GOAL,
          Math.max(0, saved.hearts)
        ),
        completed: Array.isArray(saved.completed)
          ? saved.completed
          : []
      };
    }
  } catch (error) {
    console.warn("Could not load saved progress.");
  }

  return { hearts: 0, completed: [] };
}

function saveProgress() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(progress)
    );
  } catch (error) {
    console.warn("Progress will only last this session.");
  }
}

// UPDATE HEART COUNTER AND UNLOCK BAR
function updateProgress() {
  document.getElementById("heartCount").textContent =
    progress.hearts;

  document.getElementById("progressText").textContent =
    `${progress.hearts} of ${HEART_GOAL} hearts collected`;

  document.getElementById("progressFill").style.width =
    `${(progress.hearts / HEART_GOAL) * 100}%`;

  const unlocked = progress.hearts >= HEART_GOAL;

  document.getElementById("openSurprise").disabled =
    !unlocked;

  document.getElementById("surpriseDescription").textContent =
    unlocked
      ? "You did it! Your final letter is ready."
      : `Choose ${HEART_GOAL} game apps to collect hearts and unlock your special letter.`;
}

// EACH GAME CAN AWARD A HEART ONLY ONCE
function awardHeart(gameId) {
  if (progress.completed.includes(gameId)) {
    showToast(
      "You already earned a heart for this game. Open it again for fun! ♡"
    );
    return;
  }

  progress.completed.push(gameId);
  progress.hearts = Math.min(
    HEART_GOAL,
    progress.hearts + 1
  );

  saveProgress();
  updateProgress();

  showToast(
    `You earned a heart! ♡ ${progress.hearts}/${HEART_GOAL}`
  );
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

function getSpotifyTrackId(link) {
  let url;
  try {
    url = new URL(link);
  } catch (error) {
    return null;
  }

  if (url.protocol !== "https:" || !["open.spotify.com", "play.spotify.com"].includes(url.hostname.toLowerCase())) {
    return null;
  }

  const match = url.pathname.match(/^\/(?:intl-[a-z]{2}\/)?(?:embed\/)?track\/([A-Za-z0-9]{22})\/?$/i);
  return match ? match[1] : null;
}

function loadBackgroundMusic() {
  try {
    const saved = JSON.parse(localStorage.getItem(BACKGROUND_MUSIC_STORAGE_KEY) || "null");
    if (saved && typeof saved.title === "string" && typeof saved.artist === "string" &&
        typeof saved.trackId === "string" && /^[A-Za-z0-9]{22}$/.test(saved.trackId)) {
      return {
        title: saved.title.slice(0, 80),
        artist: saved.artist.slice(0, 80),
        trackId: saved.trackId
      };
    }
  } catch (error) {
    console.warn("Could not load saved background music.");
  }
  return { ...DEFAULT_BACKGROUND_MUSIC };
}

let backgroundMusic = loadBackgroundMusic();
let backgroundMusicController = null;
let backgroundMusicStarted = false;

function updateBackgroundMusic() {
  document.getElementById("backgroundMusicTitle").textContent = backgroundMusic.title;
  document.getElementById("backgroundMusicArtist").textContent = backgroundMusic.artist;
  document.getElementById("backgroundMusicEmbed").title =
    `Spotify player for ${backgroundMusic.title} by ${backgroundMusic.artist}`;
  document.getElementById("backgroundMusicOpenLink").href =
    `https://open.spotify.com/track/${backgroundMusic.trackId}`;
  if (backgroundMusicController) {
    backgroundMusicStarted = false;
    backgroundMusicController.loadUri(`spotify:track:${backgroundMusic.trackId}`);
    backgroundMusicController.play();
  }
}

function playBackgroundMusic() {
  if (!backgroundMusicController) {
    document.getElementById("backgroundMusicStatus").textContent =
      "Connecting to Spotify. If autoplay is blocked, use the player controls when they appear.";
    return;
  }

  backgroundMusicController.play();
}

function openBackgroundMusicEditor() {
  document.getElementById("backgroundMusicNameInput").value = backgroundMusic.title;
  document.getElementById("backgroundMusicArtistInput").value = backgroundMusic.artist;
  document.getElementById("backgroundMusicUrlInput").value =
    `https://open.spotify.com/track/${backgroundMusic.trackId}`;
  document.getElementById("editBackgroundMusicModal").hidden = false;
}

function saveBackgroundMusic(event) {
  event.preventDefault();
  const title = document.getElementById("backgroundMusicNameInput").value.trim();
  const artist = document.getElementById("backgroundMusicArtistInput").value.trim();
  const trackId = getSpotifyTrackId(document.getElementById("backgroundMusicUrlInput").value.trim());
  if (!title || !artist || !trackId) {
    showToast("Enter a song title, artist, and valid Spotify track link.");
    return;
  }

  const updated = { title, artist, trackId };
  try {
    localStorage.setItem(BACKGROUND_MUSIC_STORAGE_KEY, JSON.stringify(updated));
    backgroundMusic = updated;
    updateBackgroundMusic();
    closeModal("editBackgroundMusicModal");
    showToast("Background music updated.");
  } catch (error) {
    showToast(error.message || "Could not save background music in this browser.");
  }
}

// GAME PANEL
function openGame(title, eyebrow) {
  stopSnake();
  gameContent.innerHTML = "";
  gamePanel.hidden = false;

  document.getElementById("gameTitle").textContent =
    title;

  document.getElementById("gameEyebrow").textContent =
    eyebrow;

  gameFeedback.textContent = "";

  gamePanel.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function closeGame() {
  stopSnake();
  gamePanel.hidden = true;
  gameContent.innerHTML = "";
}

function stopSnake() {
  if (snakeTimer !== null) {
    clearInterval(snakeTimer);
    snakeTimer = null;
  }

  if (snakeKeyHandler) {
    document.removeEventListener("keydown", snakeKeyHandler);
    snakeKeyHandler = null;
  }
}

function addGameActions(container, label, onClick) {
  const actions = document.createElement("div");
  actions.className = "game-actions";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "button button-dark";
  button.textContent = label;
  button.addEventListener("click", onClick);

  actions.appendChild(button);
  container.appendChild(actions);
}

// TIC-TAC-TOE: LOCAL TWO PLAYER
let ticState;

function startTicTacToe() {
  openGame("Tic-Tac-Toe", "2 PLAYERS · GET THREE IN A ROW");
  ticState = { cells: Array(9).fill(""), turn: "X", winner: "" };
  renderTicTacToe();
}

function renderTicTacToe() {
  gameContent.innerHTML = "";

  const status = document.createElement("p");
  status.className = "board-status";
  status.textContent = ticState.winner
    ? ticState.winner === "Draw"
      ? "It's a draw!"
      : `${ticState.winner} wins!`
    : `Player ${ticState.turn}'s turn`;

  const board = document.createElement("div");
  board.className = "tic-board";
  board.setAttribute("aria-label", "Tic-Tac-Toe board");

  ticState.cells.forEach((mark, index) => {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "tic-cell";
    cell.textContent = mark;
    cell.setAttribute("aria-label", `Square ${index + 1}${mark ? `, ${mark}` : ""}`);
    cell.disabled = Boolean(mark) || Boolean(ticState.winner);
    cell.addEventListener("click", () => {
      ticState.cells[index] = ticState.turn;
      const winningLines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
      ];

      if (winningLines.some(line =>
        line.every(position => ticState.cells[position] === ticState.turn)
      )) {
        ticState.winner = ticState.turn;
      } else if (ticState.cells.every(Boolean)) {
        ticState.winner = "Draw";
      } else {
        ticState.turn = ticState.turn === "X" ? "O" : "X";
      }

      renderTicTacToe();
    });
    board.appendChild(cell);
  });

  gameContent.append(status, board);
  addGameActions(gameContent, "New game", startTicTacToe);
}

// CONNECT FOUR: LOCAL TWO PLAYER
let connectState;
const CONNECT_ROWS = 6;
const CONNECT_COLS = 7;

function startConnectFour() {
  openGame("Connect Four", "2 PLAYERS · CONNECT FOUR PIECES");
  connectState = {
    board: Array.from({ length: CONNECT_ROWS }, () => Array(CONNECT_COLS).fill("")),
    turn: "red",
    winner: ""
  };
  renderConnectFour();
}

function hasFourInARow(row, col, color) {
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

  return directions.some(([rowStep, colStep]) => {
    let count = 1;

    for (const sign of [-1, 1]) {
      let nextRow = row + rowStep * sign;
      let nextCol = col + colStep * sign;

      while (
        nextRow >= 0 && nextRow < CONNECT_ROWS &&
        nextCol >= 0 && nextCol < CONNECT_COLS &&
        connectState.board[nextRow][nextCol] === color
      ) {
        count++;
        nextRow += rowStep * sign;
        nextCol += colStep * sign;
      }
    }

    return count >= 4;
  });
}

function renderConnectFour() {
  gameContent.innerHTML = "";

  const status = document.createElement("p");
  status.className = "board-status";
  status.textContent = connectState.winner
    ? connectState.winner === "draw"
      ? "It's a draw!"
      : `${connectState.winner === "red" ? "Red" : "Yellow"} wins!`
    : `${connectState.turn === "red" ? "Red" : "Yellow"} player's turn`;

  const board = document.createElement("div");
  board.className = "connect-board";
  board.setAttribute("aria-label", "Connect Four board");

  for (let row = 0; row < CONNECT_ROWS; row++) {
    for (let col = 0; col < CONNECT_COLS; col++) {
      const cell = document.createElement("button");
      const color = connectState.board[row][col];
      cell.type = "button";
      cell.className = `connect-cell${color ? ` ${color}` : ""}`;
      cell.textContent = color || "";
      cell.setAttribute("aria-label", `Row ${row + 1}, column ${col + 1}${color ? `, ${color}` : ""}`);
      cell.disabled = Boolean(connectState.winner) ||
        Boolean(connectState.board[0][col]);
      cell.addEventListener("click", () => {
        let dropRow = CONNECT_ROWS - 1;
        while (dropRow >= 0 && connectState.board[dropRow][col]) dropRow--;
        if (dropRow < 0) return;

        const currentColor = connectState.turn;
        connectState.board[dropRow][col] = currentColor;
        if (hasFourInARow(dropRow, col, currentColor)) {
          connectState.winner = currentColor;
        } else if (connectState.board.every(boardRow => boardRow.every(Boolean))) {
          connectState.winner = "draw";
        } else {
          connectState.turn = currentColor === "red" ? "yellow" : "red";
        }
        renderConnectFour();
      });
      board.appendChild(cell);
    }
  }

  gameContent.append(status, board);
  addGameActions(gameContent, "New game", startConnectFour);
}

// SNAKE: KEYBOARD ARCADE GAME
function startSnake() {
  openGame("Snake", "ARCADE · USE ARROW KEYS OR WASD");

  const status = document.createElement("p");
  status.className = "board-status";
  status.setAttribute("aria-live", "polite");

  const canvas = document.createElement("canvas");
  canvas.className = "snake-canvas";
  canvas.width = 360;
  canvas.height = 360;
  canvas.setAttribute("aria-label", "Snake game board");
  const context = canvas.getContext("2d");

  gameContent.append(status, canvas);
  addGameActions(gameContent, "Restart", startSnake);

  const gridSize = 18;
  let snake = [{ x: 8, y: 9 }, { x: 7, y: 9 }, { x: 6, y: 9 }];
  let direction = { x: 1, y: 0 };
  let nextDirection = direction;
  let food = createSnakeFood(snake, gridSize);
  let score = 0;
  let gameOver = false;

  function render() {
    status.textContent = gameOver
      ? `Game over! Score: ${score}. Press Restart to play again.`
      : `Score: ${score} · Use the arrow keys or WASD to move.`;

    context.fillStyle = "#f8fcf7";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#dfebdf";
    for (let line = 0; line <= gridSize; line++) {
      const position = line * 20;
      context.fillRect(position, 0, 1, canvas.height);
      context.fillRect(0, position, canvas.width, 1);
    }

    context.fillStyle = "#dc6380";
    context.beginPath();
    context.arc(food.x * 20 + 10, food.y * 20 + 10, 8, 0, Math.PI * 2);
    context.fill();

    snake.forEach((segment, index) => {
      context.fillStyle = index === 0 ? "#4c8c61" : "#72ad7b";
      context.fillRect(segment.x * 20 + 2, segment.y * 20 + 2, 16, 16);
    });
  }

  function tick() {
    if (gameOver) return;

    direction = nextDirection;
    const head = {
      x: snake[0].x + direction.x,
      y: snake[0].y + direction.y
    };
    const ateFood = head.x === food.x && head.y === food.y;
    const body = ateFood ? snake : snake.slice(0, -1);

    if (
      head.x < 0 || head.x >= gridSize ||
      head.y < 0 || head.y >= gridSize ||
      body.some(segment => segment.x === head.x && segment.y === head.y)
    ) {
      gameOver = true;
      stopSnake();
      render();
      return;
    }

    snake.unshift(head);
    if (ateFood) {
      score++;
      if (snake.length === gridSize * gridSize) {
        gameOver = true;
        stopSnake();
        render();
        return;
      }
      food = createSnakeFood(snake, gridSize);
    } else {
      snake.pop();
    }
    render();
  }

  snakeKeyHandler = event => {
    const keyDirections = {
      ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 }, W: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 }, S: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 }, A: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 }, D: { x: 1, y: 0 }
    };
    const next = keyDirections[event.key];
    if (!next) return;
    event.preventDefault();

    if (next.x !== -direction.x || next.y !== -direction.y) {
      nextDirection = next;
    }
  };

  document.addEventListener("keydown", snakeKeyHandler);
  snakeTimer = setInterval(tick, 130);
  render();
}

function createSnakeFood(snake, gridSize) {
  let food;
  do {
    food = {
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * gridSize)
    };
  } while (snake.some(segment => segment.x === food.x && segment.y === food.y));
  return food;
}

// GAME 1: HEART MATCH
function startMatch() {
  openGame("Heart Match", "GAME 01 · FIND THE PAIRS");

  memoryState = {
    deck: ["♥", "♡", "🌸", "✦", "♥", "♡", "🌸", "✦"],
    flipped: [],
    matched: [],
    moves: 0,
    locked: false
  };

  // Shuffle the cards.
  for (let i = memoryState.deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [
      memoryState.deck[i],
      memoryState.deck[j]
    ] = [
      memoryState.deck[j],
      memoryState.deck[i]
    ];
  }

  renderMemoryBoard();
}

function renderMemoryBoard() {
  gameContent.innerHTML = "";

  const status = document.createElement("p");
  status.className = "helper-text";
  status.style.textAlign = "center";
  status.textContent =
    `Moves: ${memoryState.moves} · Match all 4 pairs to earn a heart.`;

  const board = document.createElement("div");
  board.className = "memory-board";

  memoryState.deck.forEach((symbol, index) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "memory-tile";

    const isMatched =
      memoryState.matched.includes(index);

    const isFlipped =
      memoryState.flipped.includes(index);

    button.textContent =
      isMatched || isFlipped ? symbol : "♡";

    button.setAttribute(
      "aria-label",
      isMatched || isFlipped
        ? `Card ${symbol}`
        : "Hidden card"
    );

    if (isFlipped) button.classList.add("flipped");

    if (isMatched) {
      button.classList.add("matched");
      button.disabled = true;
    }

    button.addEventListener("click", () => {
      flipCard(index);
    });

    board.appendChild(button);
  });

  gameContent.append(status, board);
}

function flipCard(index) {
  if (
    memoryState.locked ||
    memoryState.flipped.includes(index) ||
    memoryState.matched.includes(index)
  ) {
    return;
  }

  memoryState.flipped.push(index);
  renderMemoryBoard();

  if (memoryState.flipped.length !== 2) return;

  memoryState.moves++;

  const [first, second] = memoryState.flipped;

  if (
    memoryState.deck[first] ===
    memoryState.deck[second]
  ) {
    memoryState.matched.push(first, second);
    memoryState.flipped = [];

    renderMemoryBoard();

    if (
      memoryState.matched.length ===
      memoryState.deck.length
    ) {
      gameFeedback.textContent =
        "Every pair found! You have a good memory. ♥";

      awardHeart("heart-match");
    }
  } else {
    memoryState.locked = true;

    setTimeout(() => {
      memoryState.flipped = [];
      memoryState.locked = false;
      renderMemoryBoard();
    }, 750);
  }
}

// GAME 2: RELATIONSHIP QUIZ
function loadQuizQuestions() {
  try {
    const saved = JSON.parse(localStorage.getItem(QUIZ_STORAGE_KEY) || "null");
    if (!Array.isArray(saved)) return defaultQuizQuestions.map(question => ({ ...question, options: [...question.options] }));

    const validQuestions = saved.slice(0, 10).filter(question =>
      question &&
      typeof question.question === "string" &&
      Array.isArray(question.options) &&
      question.options.length === 4 &&
      question.options.every(option => typeof option === "string") &&
      Number.isInteger(question.answer) &&
      question.answer >= 0 &&
      question.answer < 4
    ).map(question => ({
      question: question.question.slice(0, 180),
      options: question.options.map(option => option.slice(0, 100)),
      answer: question.answer
    }));

    return validQuestions.length
      ? validQuestions
      : defaultQuizQuestions.map(question => ({ ...question, options: [...question.options] }));
  } catch (error) {
    console.warn("Could not load saved quiz questions.");
    return defaultQuizQuestions.map(question => ({ ...question, options: [...question.options] }));
  }
}

function renderQuizEditor() {
  const container = document.getElementById("quizEditorQuestions");
  container.replaceChildren();

  for (let index = 0; index < 10; index += 1) {
    const question = quizQuestions[index] || { question: "", options: ["", "", "", ""], answer: 0 };
    const fieldset = document.createElement("fieldset");
    fieldset.className = "quiz-editor-question";

    const legend = document.createElement("legend");
    legend.textContent = `Question ${index + 1}`;
    fieldset.appendChild(legend);

    const questionLabel = document.createElement("label");
    questionLabel.textContent = "Question";
    const questionInput = document.createElement("input");
    questionInput.type = "text";
    questionInput.maxLength = 180;
    questionInput.value = question.question;
    questionInput.dataset.quizQuestion = String(index);
    questionInput.placeholder = "Write your question";
    questionLabel.appendChild(questionInput);
    fieldset.appendChild(questionLabel);

    const optionsGrid = document.createElement("div");
    optionsGrid.className = "quiz-editor-options";
    question.options.forEach((option, optionIndex) => {
      const optionLabel = document.createElement("label");
      optionLabel.textContent = `Answer ${optionIndex + 1}`;
      const optionInput = document.createElement("input");
      optionInput.type = "text";
      optionInput.maxLength = 100;
      optionInput.value = option;
      optionInput.dataset.quizOption = String(index);
      optionInput.dataset.optionIndex = String(optionIndex);
      optionInput.placeholder = `Choice ${optionIndex + 1}`;
      optionLabel.appendChild(optionInput);
      optionsGrid.appendChild(optionLabel);
    });
    fieldset.appendChild(optionsGrid);

    const answerLabel = document.createElement("label");
    answerLabel.textContent = "Correct answer";
    const answerSelect = document.createElement("select");
    answerSelect.dataset.quizAnswer = String(index);
    ["Answer 1", "Answer 2", "Answer 3", "Answer 4"].forEach((label, optionIndex) => {
      const option = document.createElement("option");
      option.value = String(optionIndex);
      option.textContent = label;
      answerSelect.appendChild(option);
    });
    answerSelect.value = String(question.answer);
    answerLabel.appendChild(answerSelect);
    fieldset.appendChild(answerLabel);
    container.appendChild(fieldset);
  }
}

function openQuizEditor() {
  renderQuizEditor();
  document.getElementById("quizEditorModal").hidden = false;
}

function saveQuizEditor(event) {
  event.preventDefault();
  const nextQuestions = [];

  for (let index = 0; index < 10; index += 1) {
    const question = document.querySelector(`[data-quiz-question="${index}"]`).value.trim();
    const options = Array.from(document.querySelectorAll(`[data-quiz-option="${index}"]`))
      .map(input => input.value.trim());
    if (!question && options.every(option => !option)) continue;
    if (!question || options.some(option => !option)) {
      showToast(`Complete the question and all four answers for Question ${index + 1}, or leave that row empty.`);
      return;
    }

    const answer = Number(document.querySelector(`[data-quiz-answer="${index}"]`).value);
    nextQuestions.push({ question, options, answer });
  }

  if (!nextQuestions.length) {
    showToast("Add at least one complete question before saving.");
    return;
  }

  try {
    localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(nextQuestions));
    quizQuestions = nextQuestions;
    closeModal("quizEditorModal");
    showToast(`Saved ${nextQuestions.length} quiz question${nextQuestions.length === 1 ? "" : "s"}.`);
  } catch (error) {
    showToast(error.message || "Could not save your quiz questions in this browser.");
  }
}

function startQuiz() {
  quizState = { index: 0, score: 0 };

  openGame(
    "How Well Do You Know Me?",
    "GAME 02 · A LITTLE QUIZ"
  );

  renderQuizQuestion();
}

function renderQuizQuestion() {
  gameContent.innerHTML = "";

  if (quizState.index >= quizQuestions.length) {
    const result = document.createElement("div");
    result.className = "quiz-question";

    result.textContent =
      `You got ${quizState.score} out of ${quizQuestions.length}! ` +
      (quizState.score === quizQuestions.length
        ? "Perfect score, my favorite person! ♥"
        : "Thanks for playing with me. ♡");

    const restart = document.createElement("button");
    restart.className = "button button-dark";
    restart.textContent = "Play again";
    restart.addEventListener("click", startQuiz);

    gameContent.append(result, restart);

    gameFeedback.textContent = "Quiz completed!";

    awardHeart("love-quiz");
    return;
  }

  const q = quizQuestions[quizState.index];

  const progressLine = document.createElement("p");
  progressLine.className = "helper-text";
  progressLine.style.textAlign = "center";
  progressLine.textContent =
    `Question ${quizState.index + 1} of ${quizQuestions.length}`;

  const question = document.createElement("p");
  question.className = "quiz-question";
  question.textContent = q.question;

  const options = document.createElement("div");
  options.className = "quiz-options";

  q.options.forEach((option, index) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "quiz-option";
    button.textContent = option;

    button.addEventListener("click", () => {
      options.querySelectorAll("button").forEach(item => {
        item.disabled = true;
      });

      const correct = index === q.answer;

      if (correct) quizState.score++;

      button.textContent += correct ? " ✓" : " ·";
      button.style.borderColor =
        correct ? "#62a77c" : "#d85d88";

      gameFeedback.textContent = correct
        ? "That's right! You know the vibe. ♡"
        : "Not quite—but you still get a smile from me. ♡";

      const next = document.createElement("button");
      next.className = "button button-dark";
      next.style.marginTop = "14px";

      next.textContent =
        quizState.index === quizQuestions.length - 1
          ? "See my result"
          : "Next question →";

      next.addEventListener("click", () => {
        quizState.index++;
        gameFeedback.textContent = "";
        renderQuizQuestion();
      });

      options.appendChild(next);
    });

    options.appendChild(button);
  });

  gameContent.append(progressLine, question, options);
}

// LETTER POP-UPS
function showMessage(key) {
  const letter = letters[key];

  if (!letter) return;

  document.getElementById("modalTitle").textContent =
    letter.title;

  document.getElementById("modalMessage").textContent =
    letter.text;

  document.getElementById("messageModal").hidden = false;
}

function closeModal(id) {
  const modal = document.getElementById(id);

  if (modal) modal.hidden = true;
}

const defaultKeepsakeLetters = {
  flower: "I picked this flower just for you. May it remind you that even on an ordinary day, you make my world a little brighter. Thank you for being you. ♡",
  chill: "Here's to taking a quiet pause and enjoying a little moment for yourself. You deserve kindness, care, and a reminder that I am always cheering for you. ♡",
  reminder: "You do not have to do it all today. Take one slow breath. Drink some water, rest if you need to, and remember that small steps still count. You are doing better than you think. ♡",
  gift: "If I could give you one thing, it would be the chance to see yourself through my eyes. You would understand how much happiness you bring into my life. Thank you for being you. You matter to me, today and every day. ♡"
};
const keepsakeLetterDetails = {
  flower: { title: "A flower, with love.", eyebrow: "A LITTLE FLOWER FOR YOU", icon: "♥" },
  chill: { title: "A little note for you.", eyebrow: "ALCOHOL & SMOKE ART", icon: "♥" },
  reminder: { title: "You do not have to do it all today.", eyebrow: "A GENTLE REMINDER", icon: "☼" },
  gift: { title: "One last thing, my love.", eyebrow: "A GIFT FROM MY HEART", icon: "♥" }
};
let keepsakeLetters = { ...defaultKeepsakeLetters };
let activeKeepsakeLetter = null;

try {
  const savedKeepsakeLetters = JSON.parse(localStorage.getItem(KEEPSAKE_LETTER_STORAGE_KEY) || "{}");
  if (savedKeepsakeLetters && typeof savedKeepsakeLetters === "object" && !Array.isArray(savedKeepsakeLetters)) {
    Object.keys(defaultKeepsakeLetters).forEach(key => {
      if (typeof savedKeepsakeLetters[key] === "string") {
        keepsakeLetters[key] = savedKeepsakeLetters[key];
      }
    });
  }
} catch (error) {
  console.warn("Could not load saved keepsake letters.");
}

function openKeepsakeLetter(key, title, eyebrow) {
  if (!Object.hasOwn(defaultKeepsakeLetters, key)) return;

  activeKeepsakeLetter = key;
  const details = keepsakeLetterDetails[key];
  document.getElementById("keepsakeLetterTitle").textContent = title || details.title;
  document.getElementById("keepsakeLetterEyebrow").textContent = eyebrow || details.eyebrow;
  const icon = document.getElementById("keepsakeLetterIcon");
  icon.textContent = details.icon;
  icon.classList.toggle("reminder-sun", key === "reminder");
  document.getElementById("keepsakeLetterOutput").textContent = keepsakeLetters[key];
  document.getElementById("keepsakeLetterText").value = keepsakeLetters[key];
  document.getElementById("keepsakeLetterEditor").hidden = true;
  document.getElementById("keepsakeLetterView").hidden = false;
  document.getElementById("keepsakeLetterModal").hidden = false;
}

function editKeepsakeLetter() {
  if (!activeKeepsakeLetter) return;

  document.getElementById("keepsakeLetterView").hidden = true;
  document.getElementById("keepsakeLetterEditor").hidden = false;
  document.getElementById("keepsakeLetterText").focus();
}

function saveKeepsakeLetter() {
  if (!activeKeepsakeLetter) return;

  const text = document.getElementById("keepsakeLetterText").value.trim();
  if (!text) {
    showToast("Write a little message before saving.");
    return;
  }

  const updatedLetters = { ...keepsakeLetters, [activeKeepsakeLetter]: text };
  try {
    localStorage.setItem(KEEPSAKE_LETTER_STORAGE_KEY, JSON.stringify(updatedLetters));
    keepsakeLetters = updatedLetters;
    document.getElementById("keepsakeLetterOutput").textContent = text;
    document.getElementById("keepsakeLetterEditor").hidden = true;
    document.getElementById("keepsakeLetterView").hidden = false;
    showToast("Your letter has been saved. Here is your finished message.");
  } catch (error) {
    showToast(error.message || "Could not save your letter in this browser.");
  }
}

// PHOTO VIEWER
let galleryPhotos = [];
let allGalleryPhotos = [];
let photoAlbums = [{ id: "default", name: "Our photos" }];
let activeAlbumId = null;
let currentPhotoIndex = 0;
let editingPhotoId = null;
let renamingPhotoId = null;
let pendingUpload = null;
let galleryDatabasePromise;
let galleryObjectUrls = [];
const photoFilters = [
  "none",
  "glow",
  "soft-glam",
  "golden-hour",
  "paris",
  "clean",
  "dreamy",
  "film",
  "moody",
  "black-white",
  "cool"
];

function openGalleryDatabase() {
  if (galleryDatabasePromise) return galleryDatabasePromise;

  galleryDatabasePromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("This browser does not support local photo storage."));
      return;
    }

    const request = window.indexedDB.open("loveplay-photo-gallery", 2);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("photos")) {
        database.createObjectStore("photos", { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains("settings")) {
        database.createObjectStore("settings", { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open photo storage."));
  });

  return galleryDatabasePromise;
}

async function getStoredPhotos() {
  const database = await openGalleryDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction("photos", "readonly");
    const request = transaction.objectStore("photos").getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not read saved photos."));
  });
}

async function saveStoredPhoto(photo) {
  const database = await openGalleryDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction("photos", "readwrite");
    transaction.objectStore("photos").put(photo);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("Could not save the photo."));
    transaction.onabort = () => reject(transaction.error || new Error("Photo save was cancelled."));
  });
}

async function deleteStoredPhoto(id) {
  const database = await openGalleryDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction("photos", "readwrite");
    transaction.objectStore("photos").delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("Could not remove the photo."));
    transaction.onabort = () => reject(transaction.error || new Error("Photo removal was cancelled."));
  });
}

function loadPhotoAlbums() {
  try {
    const saved = JSON.parse(localStorage.getItem("loveplay-photo-albums-v1") || "null");
    if (Array.isArray(saved)) {
      photoAlbums = saved.filter(album =>
        album &&
        typeof album.id === "string" &&
        typeof album.name === "string" &&
        album.name.trim()
      );
    }
  } catch (error) {
    console.warn("Could not load saved photo albums.");
  }

  if (!photoAlbums.some(album => album.id === "default")) {
    photoAlbums.unshift({ id: "default", name: "Our photos" });
  }
}

function savePhotoAlbums() {
  localStorage.setItem("loveplay-photo-albums-v1", JSON.stringify(photoAlbums));
}

async function loadGalleryPhotos() {
  loadPhotoAlbums();
  const storedPhotos = await getStoredPhotos();
  const photosById = new Map(storedPhotos.map(photo => [photo.id, photo]));

  for (let index = 1; index <= 21; index += 1) {
    const id = `base-${index}`;

    if (!photosById.has(id)) {
      const photo = {
        id,
        src: `../ASSETS/memory-${index}.jpg`,
        caption: `A memory to keep · ${index}`,
        custom: false,
        albumId: "default",
        deleted: false,
        filter: "none",
        sticker: "",
        stickerX: 50,
        stickerY: 35
      };
      await saveStoredPhoto(photo);
      photosById.set(id, photo);
    }
  }

  for (const photo of photosById.values()) {
    if (!photo.albumId || !photoAlbums.some(album => album.id === photo.albumId)) {
      photo.albumId = "default";
      await saveStoredPhoto(photo);
    }
  }

  const removedOriginals = Array.from(photosById.values())
    .filter(photo => !photo.custom && photo.deleted);
  document.getElementById("restoreRemovedPhotos").hidden = removedOriginals.length === 0;

  galleryObjectUrls.forEach(url => URL.revokeObjectURL(url));
  galleryObjectUrls = [];
  allGalleryPhotos = Array.from(photosById.values())
    .filter(photo => !photo.deleted)
    .sort((first, second) => {
      if (first.custom !== second.custom) return first.custom ? 1 : -1;
      return first.id.localeCompare(second.id, undefined, { numeric: true });
    })
    .map(photo => {
      if (!photo.imageBlob) return photo;
      const src = URL.createObjectURL(photo.imageBlob);
      galleryObjectUrls.push(src);
      return { ...photo, src };
    });

  renderPhotoGallery();
}

async function restoreRemovedOriginalPhotos() {
  try {
    const storedPhotos = await getStoredPhotos();
    const removedOriginals = storedPhotos.filter(photo => !photo.custom && photo.deleted);

    for (const photo of removedOriginals) {
      await saveStoredPhoto({ ...photo, deleted: false });
    }

    await loadGalleryPhotos();
    showToast("Removed original photos restored.");
  } catch (error) {
    showToast(error.message || "Could not restore the removed photos.");
  }
}

function createPhotoAlbum(event) {
  event.preventDefault();
  const name = document.getElementById("newAlbumName").value.trim();
  if (!name) {
    showToast("Enter a name for your album.");
    return;
  }
  if (photoAlbums.some(album => album.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
    showToast("An album with that name already exists.");
    return;
  }

  const album = {
    id: `album-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name
  };
  try {
    photoAlbums = [...photoAlbums, album];
    savePhotoAlbums();
    document.getElementById("newAlbumName").value = "";
    closeModal("createAlbumModal");
    openPhotoAlbum(album.id);
    showToast(`Album "${name}" created. Add photos whenever you like.`);
  } catch (error) {
    photoAlbums = photoAlbums.filter(item => item.id !== album.id);
    showToast(error.message || "Could not save this album in your browser.");
  }
}

function applyPhotoDesign(element, photo) {
  element.classList.remove(...photoFilters.map(filter => `photo-filter-${filter}`));
  const legacyFilters = {
    warm: "golden-hour",
    soft: "soft-glam",
    vintage: "film"
  };
  const filter = legacyFilters[photo.filter] || photo.filter || "none";
  element.classList.add(`photo-filter-${photoFilters.includes(filter) ? filter : "none"}`);
}

function getPhotoStickers(photo) {
  if (Array.isArray(photo.stickers)) return photo.stickers;
  if (!photo.sticker) return [];

  return [{
    id: "legacy-sticker",
    type: photo.sticker === "glasses" ? "glasses" : "emoji",
    value: photo.sticker,
    x: photo.stickerX ?? 50,
    y: photo.stickerY ?? 35
  }];
}

function createGlassesSvg() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 180 72");
  svg.setAttribute("class", "photo-sticker-glasses");
  svg.setAttribute("aria-label", "Glasses sticker");
  svg.innerHTML = `
    <path d="M8 18 Q14 12 25 15 L70 20 Q79 22 79 31 L76 47 Q74 61 60 61 L33 59 Q20 58 17 46 L11 28 Q9 22 8 18Z"
      fill="#10131b55" stroke="#17151c" stroke-width="5" stroke-linejoin="round"/>
    <path d="M172 18 Q166 12 155 15 L110 20 Q101 22 101 31 L104 47 Q106 61 120 61 L147 59 Q160 58 163 46 L169 28 Q171 22 172 18Z"
      fill="#10131b55" stroke="#17151c" stroke-width="5" stroke-linejoin="round"/>
    <path d="M78 31 Q90 24 102 31" fill="none" stroke="#17151c" stroke-width="5" stroke-linecap="round"/>
    <path d="M12 23 L2 18 M168 23 L178 18" fill="none" stroke="#17151c" stroke-width="5" stroke-linecap="round"/>
    <path d="M25 22 L55 22 M115 22 L145 22" fill="none" stroke="#ffffffaa" stroke-width="3" stroke-linecap="round"/>
  `;
  return svg;
}

function createPhotoSticker(stickerData, options = {}) {
  const sticker = document.createElement("span");
  sticker.className = "photo-sticker";
  sticker.dataset.stickerId = stickerData.id;
  sticker.dataset.stickerType = stickerData.type;
  sticker.style.left = `${stickerData.x ?? 50}%`;
  sticker.style.top = `${stickerData.y ?? 35}%`;
  sticker.setAttribute("aria-hidden", "true");

  if (stickerData.type === "glasses") {
    sticker.appendChild(createGlassesSvg());
  } else {
    sticker.textContent = stickerData.value;
  }

  if (options.draggable) {
    sticker.classList.add("photo-sticker-draggable");
    sticker.setAttribute("aria-label", "Drag sticker to move");
  }
  return sticker;
}

function renderStickerLayer(layer, stickers, options = {}) {
  layer.replaceChildren(...stickers.map(sticker => createPhotoSticker(sticker, options)));
}

function renderPhotoGallery() {
  const albumsGrid = document.getElementById("photoAlbumsGrid");
  const addAlbumButton = document.getElementById("addPhotoAlbum");
  albumsGrid.replaceChildren();
  photoAlbums.forEach(album => {
    const photos = allGalleryPhotos.filter(photo => photo.albumId === album.id);
    const button = document.createElement("button");
    button.className = "photo-album-card";
    button.type = "button";
    button.setAttribute("aria-label", `Open ${album.name}, ${photos.length} photos`);

    const cover = document.createElement("span");
    cover.className = "photo-album-cover";
    cover.setAttribute("aria-hidden", "true");
    if (photos.length) {
      const image = document.createElement("img");
      image.src = photos[0].src;
      image.alt = "";
      cover.appendChild(image);
    } else {
      cover.textContent = "♥";
    }

    const info = document.createElement("span");
    info.className = "photo-album-info";
    const name = document.createElement("strong");
    name.textContent = album.name;
    const count = document.createElement("span");
    count.textContent = `${photos.length} ${photos.length === 1 ? "photo" : "photos"}`;
    info.append(name, count);

    const arrow = document.createElement("span");
    arrow.className = "photo-album-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "›";
    button.append(cover, info, arrow);
    button.addEventListener("click", () => openPhotoAlbum(album.id));
    albumsGrid.appendChild(button);
  });
  albumsGrid.appendChild(addAlbumButton);

  galleryPhotos = activeAlbumId
    ? allGalleryPhotos.filter(photo => photo.albumId === activeAlbumId)
    : [];
  const gallery = document.getElementById("photoGrid");
  gallery.replaceChildren();
  const album = photoAlbums.find(item => item.id === activeAlbumId);
  if (album) {
    document.getElementById("photoGalleryTitle").textContent = album.name;
  }
  galleryPhotos.forEach((photo, index) => {
    const card = document.createElement("article");
    card.className = "photo-card";

    const button = document.createElement("button");
    button.className = "photo-open-button";
    button.type = "button";
    button.setAttribute("aria-label", `Open ${photo.caption}`);
    const image = document.createElement("img");
    image.src = photo.src;
    image.alt = photo.caption;
    image.loading = "lazy";
    applyPhotoDesign(image, photo);
    image.addEventListener("error", () => {
      showToast(`Could not load ${photo.src}`);
    });

    const caption = document.createElement("strong");
    caption.className = "photo-card-caption";
    caption.textContent = photo.caption;
    const stickerLayer = document.createElement("div");
    stickerLayer.className = "photo-sticker-layer";
    button.append(image, stickerLayer);
    renderStickerLayer(stickerLayer, getPhotoStickers(photo));
    button.append(caption);
    button.addEventListener("click", () => showPhoto(index));

    card.append(button);
    gallery.appendChild(card);
  });
}

function openPhotoAlbum(albumId) {
  if (!photoAlbums.some(album => album.id === albumId)) return;
  activeAlbumId = albumId;
  document.getElementById("photoAlbumsView").hidden = true;
  document.getElementById("photoGalleryView").hidden = false;
  renderPhotoGallery();
}

function updatePhotoViewer() {
  if (!galleryPhotos.length) {
    closeModal("photoModal");
    return;
  }

  const photo = galleryPhotos[currentPhotoIndex];
  const image = document.getElementById("expandedPhoto");
  image.src = photo.src;
  image.alt = photo.caption;
  applyPhotoDesign(image, photo);
  image.onerror = () => showToast(`Could not load ${photo.src}`);

  renderStickerLayer(
    document.getElementById("expandedStickers"),
    getPhotoStickers(photo)
  );

  document.getElementById("expandedCaption").textContent = photo.caption;
  document.getElementById("photoCount").textContent =
    `${currentPhotoIndex + 1} / ${galleryPhotos.length}`;
}

function showPhoto(index) {
  if (!galleryPhotos.length) return;

  currentPhotoIndex = (index + galleryPhotos.length) % galleryPhotos.length;
  updatePhotoViewer();
  document.getElementById("photoModal").hidden = false;
}

function movePhoto(direction) {
  showPhoto(currentPhotoIndex + direction);
}

function choosePhotoUpload(mode, photoId = null) {
  pendingUpload = { mode, photoId };
  const input = document.getElementById("photoUploadInput");
  input.value = "";
  input.click();
}

function readAndResizePhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("Choose a valid image file."));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(1, 1920 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Could not prepare the selected image."));
        return;
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (!blob) {
          reject(new Error("Could not process the selected image."));
          return;
        }

        resolve(blob);
      }, "image/jpeg", 0.88);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The selected image could not be opened."));
    };
    image.src = objectUrl;
  });
}

async function handlePhotoUpload(file) {
  if (!file || !pendingUpload) return;

  const action = pendingUpload;
  pendingUpload = null;

  try {
    const imageBlob = await readAndResizePhoto(file);
    const existingPhoto = action.mode === "replace"
      ? galleryPhotos.find(item => item.id === action.photoId)
      : null;
    if (action.mode === "replace" && !existingPhoto) {
      throw new Error("That photo is no longer in the gallery.");
    }
    if (action.mode === "add") {
      if (!activeAlbumId) {
        throw new Error("Open an album before adding photos.");
      }
      const photo = {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        src: "",
        assetName: null,
        imageBlob,
        caption: file.name.replace(/\.[^.]+$/, "") || "A new memory",
        custom: true,
        albumId: activeAlbumId,
        deleted: false,
        filter: "none",
        stickers: []
      };
      await saveStoredPhoto(photo);
    } else {
      await saveStoredPhoto({
        ...existingPhoto,
        src: "",
        assetName: null,
        imageBlob,
        custom: true
      });
    }

    await loadGalleryPhotos();
    if (!document.getElementById("photoModal").hidden) {
      currentPhotoIndex = Math.min(currentPhotoIndex, galleryPhotos.length - 1);
      updatePhotoViewer();
    }
    showToast(action.mode === "add"
      ? "Photo added to your gallery on this device."
      : "Photo replaced in your gallery on this device.");
  } catch (error) {
    showToast(error.message || "Could not save the selected photo.");
  }
}

async function removeGalleryPhoto(id) {
  const photo = galleryPhotos.find(item => item.id === id);
  if (!photo || !window.confirm("Remove this photo from the gallery?")) return;

  try {
    let fileRemainsInAssets = false;
    if (photo.custom) {
      if (photo.assetName) {
        fileRemainsInAssets = true;
      }
      await deleteStoredPhoto(id);
    } else {
      await saveStoredPhoto({ ...photo, deleted: true });
    }

    await loadGalleryPhotos();
    if (!galleryPhotos.length) {
      closeModal("photoModal");
    } else if (!document.getElementById("photoModal").hidden) {
      currentPhotoIndex = Math.min(currentPhotoIndex, galleryPhotos.length - 1);
      updatePhotoViewer();
    }
    showToast(fileRemainsInAssets
      ? "Photo removed from the gallery. Its file remains in ASSETS because folder permission is needed to delete it."
      : "Photo removed.");
  } catch (error) {
    showToast(error.message || "Could not remove this photo.");
  }
}

function openPhotoRename() {
  const photo = galleryPhotos[currentPhotoIndex];
  if (!photo) return;

  renamingPhotoId = photo.id;
  const input = document.getElementById("photoNameInput");
  input.value = photo.caption;
  document.getElementById("renamePhotoModal").hidden = false;
  input.focus();
  input.select();
}

async function saveRenamedPhoto() {
  const photo = galleryPhotos.find(item => item.id === renamingPhotoId);
  if (!photo) {
    closeModal("renamePhotoModal");
    return;
  }

  const caption = document.getElementById("photoNameInput").value.trim();
  if (!caption) {
    showToast("Photo name cannot be empty.");
    return;
  }

  try {
    if (caption !== photo.caption) {
      await saveStoredPhoto({ ...photo, caption });
    }
    await loadGalleryPhotos();
    currentPhotoIndex = galleryPhotos.findIndex(item => item.id === photo.id);
    if (currentPhotoIndex !== -1) updatePhotoViewer();
    closeModal("renamePhotoModal");
    renamingPhotoId = null;
    showToast("Photo name updated.");
  } catch (error) {
    showToast(error.message || "Could not update the photo name.");
  }
}

let editingStickers = [];

function renderDesignStickers() {
  renderStickerLayer(
    document.getElementById("designStickers"),
    editingStickers,
    { draggable: true }
  );
}

function renderStickerList() {
  const list = document.getElementById("photoStickerList");
  list.replaceChildren();

  editingStickers.forEach(sticker => {
    const chip = document.createElement("span");
    chip.className = "photo-sticker-chip";
    chip.append(sticker.type === "glasses" ? "Glasses" : sticker.value);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", "Remove sticker");
    removeButton.addEventListener("click", () => {
      editingStickers = editingStickers.filter(item => item.id !== sticker.id);
      renderDesignStickers();
      renderStickerList();
    });
    chip.appendChild(removeButton);
    list.appendChild(chip);
  });
}

function updateDesignPreview() {
  const filter = document.getElementById("photoFilter").value;
  const image = document.getElementById("designPhoto");

  image.classList.remove(...photoFilters.map(item => `photo-filter-${item}`));
  image.classList.add(`photo-filter-${filter}`);
  renderDesignStickers();
  renderStickerList();
}

function addSelectedSticker() {
  const value = document.getElementById("photoStickerChoice").value;
  const position = 32 + (editingStickers.length % 4) * 12;

  editingStickers.push({
    id: `sticker-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: value === "glasses" ? "glasses" : "emoji",
    value,
    x: position,
    y: position
  });
  renderDesignStickers();
  renderStickerList();
}

function openPhotoEditor(id) {
  const photo = galleryPhotos.find(item => item.id === id);
  if (!photo) return;

  editingPhotoId = id;
  const image = document.getElementById("designPhoto");
  image.src = photo.src;
  image.alt = photo.caption;
  const legacyFilters = {
    warm: "golden-hour",
    soft: "soft-glam",
    vintage: "film"
  };
  document.getElementById("photoFilter").value =
    legacyFilters[photo.filter] || photo.filter || "none";
  document.getElementById("photoStickerChoice").value = "❤️";
  editingStickers = getPhotoStickers(photo).map(sticker => ({ ...sticker }));
  updateDesignPreview();
  document.getElementById("designModal").hidden = false;
}

async function savePhotoDesign() {
  const photo = galleryPhotos.find(item => item.id === editingPhotoId);
  if (!photo) return;

  try {
    await saveStoredPhoto({
      ...photo,
      filter: document.getElementById("photoFilter").value,
      stickers: editingStickers.map(sticker => ({ ...sticker }))
    });
    await loadGalleryPhotos();
    const updatedIndex = galleryPhotos.findIndex(item => item.id === editingPhotoId);
    if (updatedIndex !== -1 && !document.getElementById("photoModal").hidden) {
      currentPhotoIndex = updatedIndex;
      updatePhotoViewer();
    }
    closeModal("designModal");
    showToast("Photo design saved.");
  } catch (error) {
    showToast(error.message || "Could not save the photo design.");
  }
}

function initializePhotoGallery() {
  return loadGalleryPhotos().then(() => {
    document.getElementById("addPhotoButton").disabled = false;
  }).catch(error => {
    document.getElementById("addPhotoButton").disabled = true;
    showToast(error.message || "Could not load the photo gallery.");
  });
}

const galleryReady = initializePhotoGallery();

// EVENT LISTENERS

const mobileGameLaunchers = {
  chess: {
    android: "https://play.google.com/store/apps/details?id=com.chess",
    native: "chess://",
    ios: "chess://",
    playStore: "https://play.google.com/store/apps/details?id=com.chess",
    appStore: "https://apps.apple.com/app/id329218549"
  },
  roblox: {
    android: "https://play.google.com/store/apps/details?id=com.roblox.client",
    native: "roblox://",
    ios: "roblox://",
    playStore: "https://play.google.com/store/apps/details?id=com.roblox.client",
    appStore: "https://apps.apple.com/app/id431946152"
  },
  mlbb: {
    android: "https://play.google.com/store/apps/details?id=com.mobile.legends",
    native: "mobilelegends://",
    ios: "mobilelegends://",
    playStore: "https://play.google.com/store/apps/details?id=com.mobile.legends",
    appStore: "https://apps.apple.com/app/id1160056295"
  },
  clash: {
    android: "https://play.google.com/store/apps/details?id=com.supercell.clashofclans",
    native: "clashofclans://",
    ios: "clashofclans://",
    playStore: "https://play.google.com/store/apps/details?id=com.supercell.clashofclans",
    appStore: "https://apps.apple.com/app/id529479190"
  },
  tongits: {
    android: "https://play.google.com/store/apps/details?id=com.tongitsgo.play",
    native: "tongitsgo://",
    ios: "tongitsgo://",
    playStore: "https://play.google.com/store/apps/details?id=com.tongitsgo.play",
    appStore: "https://apps.apple.com/ph/search?term=Tongits%20Go"
  },
  genshin: {
    android: "https://play.google.com/store/apps/details?id=com.miHoYo.GenshinImpact",
    native: "genshinimpact://",
    ios: "genshinimpact://",
    playStore: "https://play.google.com/store/apps/details?id=com.miHoYo.GenshinImpact",
    appStore: "https://apps.apple.com/app/id1517783697"
  },
  cod: {
    android: "https://play.google.com/store/apps/details?id=com.garena.game.codm",
    native: "codm://",
    ios: "codm://",
    playStore: "https://play.google.com/store/apps/details?id=com.garena.game.codm",
    appStore: "https://apps.apple.com/app/id1287282214"
  },
  pubg: {
    android: "https://play.google.com/store/apps/details?id=com.tencent.ig",
    native: "pubgmobile://",
    ios: "pubgmobile://",
    playStore: "https://play.google.com/store/apps/details?id=com.tencent.ig",
    appStore: "https://apps.apple.com/app/id1330123889"
  },
  freefire: {
    android: "https://play.google.com/store/apps/details?id=com.dts.freefireth",
    native: "freefire://",
    ios: "freefire://",
    playStore: "https://play.google.com/store/apps/details?id=com.dts.freefireth",
    appStore: "https://apps.apple.com/app/id1300146617"
  },
  brawl: {
    android: "https://play.google.com/store/apps/details?id=com.supercell.brawlstars",
    native: "brawlstars://",
    ios: "brawlstars://",
    playStore: "https://play.google.com/store/apps/details?id=com.supercell.brawlstars",
    appStore: "https://apps.apple.com/app/id1229016807"
  },
  minecraft: {
    android: "https://play.google.com/store/apps/details?id=com.mojang.minecraftpe",
    native: "minecraft://",
    ios: "minecraft://",
    playStore: "https://play.google.com/store/apps/details?id=com.mojang.minecraftpe",
    appStore: "https://apps.apple.com/app/id479516143"
  },
  fortnite: {
    android: "https://store.epicgames.com/en-US/mobile/android",
    packageId: "com.epicgames.fortnite",
    native: "com.epicgames.fortnite://",
    ios: "fortnite://",
    playStore: "https://play.google.com/store/search?q=Fortnite&c=apps",
    appStore: "https://apps.apple.com/ph/search?term=Fortnite"
  },
  amongus: {
    android: "https://play.google.com/store/apps/details?id=com.innersloth.spacemafia",
    native: "amongus://",
    ios: "amongus://",
    playStore: "https://play.google.com/store/apps/details?id=com.innersloth.spacemafia",
    appStore: "https://apps.apple.com/app/id1351168404"
  },
  terraria: {
    android: "https://play.google.com/store/apps/details?id=com.and.games505.TerrariaPaid",
    native: "terraria://",
    ios: "terraria://",
    playStore: "https://play.google.com/store/apps/details?id=com.and.games505.TerrariaPaid",
    appStore: "https://apps.apple.com/app/id640364616"
  },
  stumble: {
    android: "https://play.google.com/store/apps/details?id=com.kitkagames.fallbuddies",
    native: "stumbleguys://",
    ios: "stumbleguys://",
    playStore: "https://play.google.com/store/apps/details?id=com.kitkagames.fallbuddies",
    appStore: "https://apps.apple.com/app/id1541153375"
  },
  "8ball": {
    android: "https://play.google.com/store/apps/details?id=com.miniclip.eightballpool",
    native: "miniclip://",
    ios: "miniclip://",
    playStore: "https://play.google.com/store/apps/details?id=com.miniclip.eightballpool",
    appStore: "https://apps.apple.com/app/id543186831"
  }
};

function openGameAppOrStore(appUrl, storeUrl) {
  let fallbackTimer;
  const handleVisibilityChange = () => {
    if (document.hidden) {
      window.clearTimeout(fallbackTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
  };
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.location.assign(appUrl);
  fallbackTimer = window.setTimeout(() => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    if (!document.hidden) window.location.assign(storeUrl);
  }, 1200);
}

document.querySelector(".mobile-game-launchers").addEventListener("click", event => {
  const target = event.target instanceof Element ? event.target : null;
  const link = target?.closest("a[data-game-app]");
  if (!link || !window.matchMedia("(max-width: 600px)").matches) return;
  const launcher = mobileGameLaunchers[link.dataset.gameApp];
  if (!launcher) return;

  event.preventDefault();
  awardHeart(link.dataset.gameApp);
  if (/Android/i.test(navigator.userAgent)) {
    if (window.LovePlayNative?.platform === "android") {
      openGameAppOrStore(launcher.native, launcher.android);
    } else {
      const packageId = launcher.packageId || new URL(link.href).searchParams.get("id");
      const fallback = encodeURIComponent(launcher.android);
      const scheme = launcher.native.replace(/:\/\/$/, "");
      window.location.assign(`intent://#Intent;scheme=${scheme};package=${packageId};S.browser_fallback_url=${fallback};end`);
    }
    return;
  }
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    openGameAppOrStore(launcher.ios, launcher.appStore);
    return;
  }
  window.location.assign(launcher.appStore);
});

document.getElementById("closeGame")
  .addEventListener("click", closeGame);

document.querySelectorAll(".envelope").forEach(button => {
  button.addEventListener("click", () => {
    showMessage(button.dataset.message);
  });
});

document.getElementById("previousPhoto")
  .addEventListener("click", () => movePhoto(-1));

document.getElementById("nextPhoto")
  .addEventListener("click", () => movePhoto(1));

document.getElementById("addPhotoButton")
  .addEventListener("click", () => choosePhotoUpload("add"));

document.getElementById("closePhotoAlbum")
  .addEventListener("click", () => {
    activeAlbumId = null;
    galleryPhotos = [];
    document.getElementById("photoGalleryView").hidden = true;
    document.getElementById("photoAlbumsView").hidden = false;
    renderPhotoGallery();
  });

function openCreateAlbumDialog() {
  document.getElementById("createAlbumModal").hidden = false;
  document.getElementById("newAlbumName").focus();
}

document.getElementById("addPhotoAlbum")
  .addEventListener("click", openCreateAlbumDialog);

document.getElementById("addPhotoAlbumInline")
  ?.addEventListener("click", openCreateAlbumDialog);

document.getElementById("createAlbumForm")
  .addEventListener("submit", createPhotoAlbum);

document.getElementById("playBackgroundMusic")
  .addEventListener("click", playBackgroundMusic);

document.getElementById("editBackgroundMusic")
  .addEventListener("click", openBackgroundMusicEditor);

document.getElementById("editBackgroundMusicForm")
  .addEventListener("submit", saveBackgroundMusic);

document.getElementById("renameCurrentPhoto")
  .addEventListener("click", openPhotoRename);

document.getElementById("savePhotoName")
  .addEventListener("click", saveRenamedPhoto);

document.getElementById("photoNameInput")
  .addEventListener("keydown", event => {
    if (event.key === "Enter") saveRenamedPhoto();
  });

document.getElementById("restoreRemovedPhotos")
  .addEventListener("click", restoreRemovedOriginalPhotos);

document.getElementById("photoUploadInput")
  .addEventListener("change", async event => {
    await galleryReady;
    await handlePhotoUpload(event.target.files[0]);
    event.target.value = "";
  });

document.getElementById("editCurrentPhoto")
  .addEventListener("click", () => {
    const photo = galleryPhotos[currentPhotoIndex];
    if (photo) openPhotoEditor(photo.id);
  });

document.getElementById("replaceCurrentPhoto")
  .addEventListener("click", () => {
    const photo = galleryPhotos[currentPhotoIndex];
    if (photo) choosePhotoUpload("replace", photo.id);
  });

document.getElementById("removeCurrentPhoto")
  .addEventListener("click", () => {
    const photo = galleryPhotos[currentPhotoIndex];
    if (photo) removeGalleryPhoto(photo.id);
  });

document.getElementById("photoFilter")
  .addEventListener("change", updateDesignPreview);

document.getElementById("addPhotoSticker")
  .addEventListener("click", addSelectedSticker);

document.getElementById("savePhotoDesign")
  .addEventListener("click", savePhotoDesign);

updateBackgroundMusic();

window.onSpotifyIframeApiReady = IFrameAPI => {
  const playerHost = document.getElementById("backgroundMusicEmbed");
  IFrameAPI.createController(playerHost, {
    uri: `spotify:track:${backgroundMusic.trackId}`,
    width: "100%",
    height: 152
  }, controller => {
    backgroundMusicController = controller;
    controller.addListener("ready", () => {
      document.getElementById("backgroundMusicStatus").textContent =
        "Starting your song. Autoplay depends on your browser and Spotify sign-in.";
      controller.play();
    });
    controller.addListener("playback_started", () => {
      backgroundMusicStarted = true;
      document.getElementById("backgroundMusicStatus").textContent =
        `Now playing ${backgroundMusic.title} by ${backgroundMusic.artist}.`;
      document.removeEventListener("pointerdown", resumeBackgroundMusicOnInteraction);
      document.removeEventListener("keydown", resumeBackgroundMusicOnInteraction);
    });
    controller.addListener("playback_update", event => {
      if (event.data.isPaused && !backgroundMusicStarted) {
        document.getElementById("backgroundMusicStatus").textContent =
          "Your browser may block automatic playback. Press Play / resume or use Spotify.";
      }
    });
  });
};

const spotifyIframeApi = document.createElement("script");
spotifyIframeApi.src = "https://open.spotify.com/embed/iframe-api/v1";
spotifyIframeApi.async = true;
document.body.appendChild(spotifyIframeApi);

function resumeBackgroundMusicOnInteraction() {
  if (backgroundMusicController && !backgroundMusicStarted) {
    backgroundMusicController.play();
  }
}

document.addEventListener("pointerdown", resumeBackgroundMusicOnInteraction);
document.addEventListener("keydown", resumeBackgroundMusicOnInteraction);

function applyTheme(theme) {
  const dark = theme === "dark";
  document.body.dataset.theme = dark ? "dark" : "light";
  const toggle = document.getElementById("themeToggle");
  toggle.setAttribute("aria-checked", String(dark));
  toggle.setAttribute("aria-label", dark ? "Turn off dark mode" : "Turn on dark mode");
  document.querySelector('meta[name="theme-color"]').content = dark ? "#1b141d" : "#281323";
}

try {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem("loveplay-chat-theme-v1");
  applyTheme(savedTheme === "dark" ? "dark" : "light");
} catch (error) {
  applyTheme("light");
}

function toggleTheme() {
  const theme = document.body.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    showToast(error.message || "Could not save your theme preference.");
  }
}

document.getElementById("themeToggle").addEventListener("click", toggleTheme);

const dashboardSettings = document.getElementById("dashboardSettings");
const dashboardSettingsPanel = document.getElementById("dashboardSettingsPanel");
const dashboardSettingsToggle = document.getElementById("dashboardSettingsToggle");

function setDashboardSettingsOpen(open) {
  dashboardSettings.dataset.open = String(open);
  dashboardSettingsPanel.setAttribute("aria-hidden", String(!open));
  dashboardSettingsPanel.inert = !open;
  dashboardSettingsToggle.setAttribute("aria-expanded", String(open));
  dashboardSettingsToggle.setAttribute("aria-label", open ? "Close quick settings" : "Open quick settings");
  if (!open) dashboardSettingsToggle.focus();
}

dashboardSettingsToggle.addEventListener("click", () => {
  if (dashboardSettingsToggle.dataset.skipClick === "true") {
    delete dashboardSettingsToggle.dataset.skipClick;
    return;
  }
  setDashboardSettingsOpen(dashboardSettings.dataset.open !== "true");
});
let settingsHandleStartX = null;
dashboardSettingsToggle.addEventListener("pointerdown", event => {
  settingsHandleStartX = event.clientX;
  dashboardSettingsToggle.setPointerCapture(event.pointerId);
});
dashboardSettingsToggle.addEventListener("pointerup", event => {
  if (settingsHandleStartX === null) return;
  const distance = event.clientX - settingsHandleStartX;
  settingsHandleStartX = null;
  if (Math.abs(distance) < 36) return;
  dashboardSettingsToggle.dataset.skipClick = "true";
  setDashboardSettingsOpen(distance > 0);
});
dashboardSettingsToggle.addEventListener("pointercancel", () => {
  settingsHandleStartX = null;
});
document.getElementById("dashboardSettingsClose").addEventListener("click", () => setDashboardSettingsOpen(false));
document.getElementById("dashboardSettingsBackdrop").addEventListener("click", () => setDashboardSettingsOpen(false));
document.getElementById("editBackgroundMusic").addEventListener("click", () => setDashboardSettingsOpen(false));
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && dashboardSettings.dataset.open === "true") setDashboardSettingsOpen(false);
});

const designStickersLayer = document.getElementById("designStickers");
const photoDesignStage = document.getElementById("photoDesignStage");
let stickerPointerId = null;
let draggingStickerId = null;

designStickersLayer.addEventListener("pointerdown", event => {
  const target = event.target.closest(".photo-sticker-draggable");
  if (!target) return;

  stickerPointerId = event.pointerId;
  draggingStickerId = target.dataset.stickerId;
  designStickersLayer.setPointerCapture(event.pointerId);
  event.preventDefault();
});

designStickersLayer.addEventListener("pointermove", event => {
  if (stickerPointerId !== event.pointerId) return;

  const bounds = photoDesignStage.getBoundingClientRect();
  const x = Math.min(92, Math.max(8, ((event.clientX - bounds.left) / bounds.width) * 100));
  const y = Math.min(92, Math.max(8, ((event.clientY - bounds.top) / bounds.height) * 100));
  const sticker = editingStickers.find(item => item.id === draggingStickerId);
  const element = designStickersLayer.querySelector(`[data-sticker-id="${draggingStickerId}"]`);
  if (!sticker || !element) return;

  sticker.x = x;
  sticker.y = y;
  element.style.left = `${x}%`;
  element.style.top = `${y}%`;
});

designStickersLayer.addEventListener("pointerup", event => {
  if (stickerPointerId === event.pointerId) {
    stickerPointerId = null;
    draggingStickerId = null;
  }
});

designStickersLayer.addEventListener("pointercancel", () => {
  stickerPointerId = null;
  draggingStickerId = null;
});

document.addEventListener("keydown", event => {
  if (document.getElementById("photoModal").hidden) return;

  if (!document.getElementById("designModal").hidden) {
    if (event.key === "Escape") closeModal("designModal");
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    movePhoto(-1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    movePhoto(1);
  } else if (event.key === "Escape") {
    closeModal("photoModal");
  }
});

let photoTouchStartX = null;
const photoViewerStage = document.getElementById("photoViewerStage");

photoViewerStage.addEventListener("touchstart", event => {
  photoTouchStartX = event.changedTouches[0].clientX;
}, { passive: true });

photoViewerStage.addEventListener("touchend", event => {
  if (photoTouchStartX === null) return;

  const swipeDistance = event.changedTouches[0].clientX - photoTouchStartX;
  photoTouchStartX = null;

  if (Math.abs(swipeDistance) >= 45) {
    movePhoto(swipeDistance < 0 ? 1 : -1);
  }
}, { passive: true });

document.querySelectorAll("[data-close]").forEach(button => {
  button.addEventListener("click", () => {
    closeModal(button.dataset.close);
  });
});

document.querySelectorAll(".modal").forEach(modal => {
  modal.addEventListener("click", event => {
    if (event.target === modal) {
      closeModal(modal.id);
    }
  });
});

// UNLOCK FINAL SURPRISE
document.getElementById("openSurprise")
  .addEventListener("click", () => {
    if (progress.hearts >= HEART_GOAL) {
      openKeepsakeLetter("gift");
    }
  });

document.getElementById("openFlowerLetter")
  .addEventListener("click", () => {
    openKeepsakeLetter("flower");
  });

document.getElementById("openChillLetter")
  .addEventListener("click", () => {
    openKeepsakeLetter("chill");
  });

document.getElementById("editKeepsakeLetter")
  .addEventListener("click", editKeepsakeLetter);

document.getElementById("saveKeepsakeLetter")
  .addEventListener("click", saveKeepsakeLetter);

document.getElementById("cancelKeepsakeEdit")
  .addEventListener("click", () => {
    document.getElementById("keepsakeLetterEditor").hidden = true;
    document.getElementById("keepsakeLetterView").hidden = false;
  });

document.getElementById("openReminder")
  .addEventListener("click", () => {
    openKeepsakeLetter("reminder");
  });

document.getElementById("openGift")
  .addEventListener("click", () => {
    if (progress.hearts >= HEART_GOAL) {
      openKeepsakeLetter("gift");
      return;
    }

    document.getElementById("surprise").scrollIntoView({ behavior: "smooth", block: "center" });
    showToast(`Choose ${HEART_GOAL - progress.hearts} more game app${HEART_GOAL - progress.hearts === 1 ? "" : "s"} to collect hearts and open your gift.`);
  });

const musicCollections = {
  arthur: {
    title: "Arthur Nery",
    label: "ARTHUR NERY",
    icon: "♥",
    embed: "https://open.spotify.com/embed/artist/7uDdl5V5AETSFY7K3muu22?utm_source=generator&theme=0",
    link: "https://open.spotify.com/artist/7uDdl5V5AETSFY7K3muu22",
    description: "Listen to Arthur Nery's top tracks and open his Spotify profile for more."
  },
  hiphop: {
    title: "RapCaviar · Hip-Hop",
    label: "HIP-HOP",
    icon: "♫",
    embed: "https://open.spotify.com/embed/playlist/37i9dQZF1DX0XUsuxWHRQd?utm_source=generator&theme=0",
    link: "https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd",
    description: "A Spotify-curated hip-hop playlist. Pick a track or open it in Spotify."
  },
  opm: {
    title: "OPM · Original Pilipino Music",
    label: "OPM",
    icon: "♫",
    searchQuery: "OPM Philippines popular songs",
    description: "Search Spotify for Filipino artists, OPM songs, and playlists."
  },
  "pinoy-hiphop": {
    title: "Pinoy Hip-Hop",
    label: "PINOY HIP-HOP",
    icon: "♫",
    searchQuery: "Pinoy hip hop Philippines",
    description: "Search Spotify for Pinoy hip-hop artists, tracks, and playlists."
  },
  love: {
    title: "Love Pop · Love Songs",
    label: "LOVE SONGS",
    icon: "♡",
    embed: "https://open.spotify.com/embed/playlist/37i9dQZF1DX50QitC6Oqtn?utm_source=generator&theme=0",
    link: "https://open.spotify.com/playlist/37i9dQZF1DX50QitC6Oqtn",
    description: "A Spotify playlist of romantic pop favorites for a little love-song mood."
  },
  pop: {
    title: "Today's Top Hits · Pop",
    label: "POP",
    icon: "★",
    embed: "https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator&theme=0",
    link: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
    description: "Hear current popular tracks in Spotify's Today's Top Hits playlist."
  },
  rnb: {
    title: "Chilled R&B",
    label: "R&B",
    icon: "♪",
    embed: "https://open.spotify.com/embed/playlist/37i9dQZF1DX2UgsUIg75Vg?utm_source=generator&theme=0",
    link: "https://open.spotify.com/playlist/37i9dQZF1DX2UgsUIg75Vg",
    description: "Settle into smooth R&B with this Spotify-curated playlist."
  }
};

const musicTabs = Array.from(document.querySelectorAll("#music .music-tab"));

function selectMusicCollection(collectionId, focusTab = false) {
  const collection = musicCollections[collectionId];
  const selectedTab = musicTabs.find(tab => tab.dataset.music === collectionId);
  if (!collection || !selectedTab) return;

  musicTabs.forEach(tab => {
    const selected = tab === selectedTab;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });

  if (focusTab) selectedTab.focus();
  document.getElementById("music-player-panel").setAttribute("aria-labelledby", selectedTab.id);
  document.getElementById("musicPlaylistTitle").textContent = collection.title;
  document.getElementById("musicPlaylistDescription").textContent = collection.description;
  document.getElementById("musicMoodLabel").textContent = collection.label;
  document.getElementById("musicMoodIcon").textContent = collection.icon;
  const searchCollection = Boolean(collection.searchQuery);
  const spotifyEmbed = document.getElementById("spotifyEmbed");
  const spotifyOpenLink = document.getElementById("spotifyOpenLink");
  const musicSearchCollection = document.getElementById("musicSearchCollection");
  spotifyEmbed.hidden = searchCollection;
  spotifyOpenLink.hidden = searchCollection;
  musicSearchCollection.hidden = !searchCollection;
  if (searchCollection) {
    document.getElementById("musicSearchCollectionDescription").textContent = collection.description;
    document.getElementById("musicSearchCollectionLink").href =
      `https://open.spotify.com/search/${encodeURIComponent(collection.searchQuery)}`;
    document.getElementById("musicSearchDownloadLink").href =
      `https://bandcamp.com/search?q=${encodeURIComponent(collection.searchQuery)}`;
  } else {
    spotifyOpenLink.href = collection.link;
    spotifyEmbed.title = `${collection.title} on Spotify`;
    spotifyEmbed.src = collection.embed;
  }

  const albumArt = document.querySelector("#music .album-art");
  albumArt.classList.remove(...Object.keys(musicCollections).map(id => `music-mood-${id}`));
  if (collectionId !== "arthur") albumArt.classList.add(`music-mood-${collectionId}`);
}

musicTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectMusicCollection(tab.dataset.music));
  tab.addEventListener("keydown", event => {
    let nextIndex;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % musicTabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + musicTabs.length) % musicTabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = musicTabs.length - 1;
    else return;

    event.preventDefault();
    selectMusicCollection(musicTabs[nextIndex].dataset.music, true);
  });
});

document.getElementById("musicSearchForm").addEventListener("submit", event => {
  event.preventDefault();
  const term = document.getElementById("musicSearchInput").value.trim();
  if (!term) return;
  const provider = document.getElementById("musicSearchProvider").value;
  const searchUrls = {
    spotify: `https://open.spotify.com/search/${encodeURIComponent(term)}`,
    youtube: `https://music.youtube.com/search?q=${encodeURIComponent(term)}`,
    bandcamp: `https://bandcamp.com/search?q=${encodeURIComponent(term)}`
  };
  window.open(searchUrls[provider] || searchUrls.spotify, "_blank", "noopener,noreferrer");
});

const featuredSlides = [
  {
    image: "../ASSETS/memory-1.jpg",
    alt: "A favorite LovePlay memory",
    eyebrow: "A MEMORY TO KEEP",
    title: "Little moments, forever ours.",
    description: "A small collection of the memories that make us smile.",
    link: "#pictures",
    linkText: "Open our pictures →"
  },
  {
    image: "../ASSETS/memory-8.jpg",
    alt: "A shared moment from the LovePlay gallery",
    eyebrow: "SOUNDTRACK FOR US",
    title: "Find a song for every mood.",
    description: "Arthur Nery, love songs, and playlists for our next cozy moment.",
    link: "#music",
    linkText: "Explore the music →"
  },
  {
    image: "../ASSETS/memory-4.jpg",
    alt: "A shared couple photo from the LovePlay gallery",
    eyebrow: "A LITTLE FUN TOGETHER",
    title: "Make room for one more happy memory.",
    description: "Pick a game, challenge each other, and collect a heart.",
    link: "#games",
    linkText: "Choose a game →"
  }
];
let activeFeaturedSlide = 0;
let featuredRotationTimer = null;
let featuredRotationPaused = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let featuredTransitionTimer = null;

featuredSlides.forEach(slide => {
  const image = new Image();
  image.src = slide.image;
});

function updateFeaturedSlide(index) {
  activeFeaturedSlide = (index + featuredSlides.length) % featuredSlides.length;
  const slide = featuredSlides[activeFeaturedSlide];
  const image = document.getElementById("featuredImage");
  image.classList.add("is-changing");
  clearTimeout(featuredTransitionTimer);
  featuredTransitionTimer = setTimeout(() => {
    image.src = slide.image;
    image.alt = slide.alt;
    document.getElementById("featuredEyebrow").textContent = slide.eyebrow;
    document.getElementById("featuredTitle").textContent = slide.title;
    document.getElementById("featuredDescription").textContent = slide.description;
    const link = document.getElementById("featuredLink");
    link.href = slide.link;
    link.textContent = slide.linkText;
    document.getElementById("featuredCount").textContent =
      `${String(activeFeaturedSlide + 1).padStart(2, "0")} / ${String(featuredSlides.length).padStart(2, "0")}`;
    image.classList.remove("is-changing");
  }, 220);
}

function updateFeaturedRotation() {
  clearInterval(featuredRotationTimer);
  featuredRotationTimer = null;
  const featuredHomeIsActive = !homePanel.hidden && !document.hidden;
  const pauseButton = document.getElementById("featuredPause");

  if (featuredHomeIsActive && !featuredRotationPaused) {
    featuredRotationTimer = setInterval(() => {
      updateFeaturedSlide(activeFeaturedSlide + 1);
    }, 6000);
    pauseButton.textContent = "Ⅱ";
    pauseButton.setAttribute("aria-label", "Pause featured slideshow");
  } else {
    pauseButton.textContent = "▶";
    pauseButton.setAttribute("aria-label", "Play featured slideshow");
  }
}

document.getElementById("featuredPrevious")
  .addEventListener("click", () => updateFeaturedSlide(activeFeaturedSlide - 1));

document.getElementById("featuredNext")
  .addEventListener("click", () => updateFeaturedSlide(activeFeaturedSlide + 1));

document.getElementById("featuredPause")
  .addEventListener("click", () => {
    featuredRotationPaused = !featuredRotationPaused;
    updateFeaturedRotation();
  });

// ELECTRICAL ENGINEERING CALCULATOR
const calculatorNumber = value => new Intl.NumberFormat(undefined, {
  maximumSignificantDigits: 6
}).format(value);

const eeCategories = [
  {
    id: "basic",
    title: "Basic Electrical Circuits",
    icon: "ϟ",
    tools: [
      {
        id: "ohms",
        tab: "Ohm's Law",
        title: "Ohm's Law",
        description: "Enter any two values to solve for the third and calculate power.",
        formula: "V = I × R\nI = V / R\nR = V / I\nP = V × I",
        example: "If V = 12 V and R = 4 Ω, I = 3 A.",
        fields: [
          { key: "v", label: "Voltage (V)", placeholder: "Enter voltage (V)", optional: true },
          { key: "i", label: "Current (I)", placeholder: "Enter current (A)", optional: true },
          { key: "r", label: "Resistance (R)", placeholder: "Enter resistance (Ω)", optional: true }
        ]
      },
      {
        id: "resistors",
        tab: "Series / Parallel",
        title: "Resistor Network",
        description: "Calculate an equivalent resistance from two or more resistor values.",
        formula: "Series: Rₜ = ΣR\nParallel: 1/Rₜ = Σ(1/R)",
        example: "For 100 Ω and 200 Ω: series = 300 Ω; parallel ≈ 66.67 Ω.",
        fields: [
          { key: "values", label: "Resistance values (Ω)", type: "text", placeholder: "100, 220, 470" },
          { key: "connection", label: "Connection", type: "select", options: [["series", "Series"], ["parallel", "Parallel"]] }
        ]
      },
      {
        id: "kcl-kvl",
        tab: "KCL / KVL",
        title: "Kirchhoff's Laws",
        description: "Enter signed values using one sign convention consistently.",
        formula: "KCL: ΣI = 0 at a node\nKVL: ΣV = 0 around a closed loop",
        example: "A balanced node/loop has an algebraic sum of 0.",
        fields: [
          { key: "currents", label: "Signed currents (A)", type: "text", placeholder: "1.5, -0.5, -1" },
          { key: "voltages", label: "Signed loop voltages (V)", type: "text", placeholder: "12, -7, -5" }
        ]
      }
    ]
  },
  {
    id: "acdc",
    title: "AC / DC Circuits",
    icon: "∿",
    tools: [
      {
        id: "rms-peak",
        tab: "RMS / Peak",
        title: "Sine-Wave RMS & Peak",
        description: "Convert between RMS, peak, and peak-to-peak values for a sine wave.",
        formula: "Vpeak = √2 × Vrms\nVpp = 2 × Vpeak",
        example: "120 Vrms ≈ 169.7 Vpeak and 339.4 Vpp.",
        fields: [{ key: "rms", label: "RMS voltage (V)", placeholder: "Enter RMS voltage" }]
      },
      {
        id: "impedance",
        tab: "Impedance (RLC)",
        title: "Series RLC Impedance",
        description: "Find impedance magnitude and phase from resistance and reactance.",
        formula: "X = XL − XC\n|Z| = √(R² + X²)\nθ = atan(X / R)",
        example: "For R = 10 Ω, XL = 15 Ω, XC = 5 Ω: |Z| ≈ 14.14 Ω.",
        fields: [
          { key: "r", label: "Resistance R (Ω)", placeholder: "Enter R" },
          { key: "xl", label: "Inductive reactance XL (Ω)", placeholder: "Enter XL" },
          { key: "xc", label: "Capacitive reactance XC (Ω)", placeholder: "Enter XC" }
        ]
      },
      {
        id: "ac-power-factor",
        tab: "Power Factor",
        title: "AC Power Factor",
        description: "Find power factor and reactive power from real and apparent power.",
        formula: "PF = P / S\nQ = √(S² − P²)",
        example: "For P = 800 W and S = 1000 VA: PF = 0.8.",
        fields: [
          { key: "p", label: "Real power P (W)", placeholder: "Enter real power" },
          { key: "s", label: "Apparent power S (VA)", placeholder: "Enter apparent power" }
        ]
      }
    ]
  },
  {
    id: "power",
    title: "Electrical Power Systems",
    icon: "ϟ",
    tools: [
      {
        id: "single-phase",
        tab: "Single-Phase",
        title: "Single-Phase Power",
        description: "Calculate real, apparent, and reactive power for a single-phase AC load.",
        formula: "S = V × I\nP = V × I × PF\nQ = √(S² − P²)",
        example: "For 230 V, 5 A, PF = 0.8: P = 920 W.",
        fields: [
          { key: "v", label: "Voltage (V)", placeholder: "Enter voltage" },
          { key: "i", label: "Current (A)", placeholder: "Enter current" },
          { key: "pf", label: "Power factor (0–1)", placeholder: "e.g. 0.85" }
        ]
      },
      {
        id: "three-phase",
        tab: "Three-Phase",
        title: "Balanced Three-Phase Power",
        description: "Use line-to-line voltage and line current for a balanced system.",
        formula: "S = √3 × VL × IL\nP = √3 × VL × IL × PF",
        example: "For 400 V, 10 A, PF = 0.8: P ≈ 5.54 kW.",
        fields: [
          { key: "v", label: "Line voltage (V)", placeholder: "Enter line voltage" },
          { key: "i", label: "Line current (A)", placeholder: "Enter line current" },
          { key: "pf", label: "Power factor (0–1)", placeholder: "e.g. 0.85" }
        ]
      },
      {
        id: "pf-correction",
        tab: "Power Factor",
        title: "Power-Factor Correction",
        description: "Estimate capacitor-bank kVAr and capacitance to reach a target PF.",
        formula: "Qc = P[tan(cos⁻¹ PF₁) − tan(cos⁻¹ PF₂)]\nSingle-phase: C = Qc / (2πfV²)",
        example: "Enter real power, current and target PF, voltage, frequency and phase type.",
        fields: [
          { key: "p", label: "Real power (kW)", placeholder: "Enter kW" },
          { key: "pf1", label: "Current PF (0–1)", placeholder: "e.g. 0.75" },
          { key: "pf2", label: "Target PF (0–1)", placeholder: "e.g. 0.95" },
          { key: "v", label: "Voltage (V)", placeholder: "Enter voltage" },
          { key: "f", label: "Frequency (Hz)", placeholder: "e.g. 50" },
          { key: "phase", label: "System", type: "select", options: [["single", "Single-phase"], ["three", "Three-phase (delta bank)"]] }
        ]
      }
    ]
  },
  {
    id: "machines",
    title: "Transformers & Electrical Machines",
    icon: "⚙",
    tools: [
      {
        id: "transformer",
        tab: "Transformer",
        title: "Ideal Transformer",
        description: "Estimate secondary voltage and optional secondary current using turns ratio.",
        formula: "V₂ / V₁ = N₂ / N₁\nI₂ / I₁ = N₁ / N₂",
        example: "An ideal transformer ignores losses and winding voltage drops.",
        fields: [
          { key: "v1", label: "Primary voltage V1 (V)", placeholder: "Enter V1" },
          { key: "n1", label: "Primary turns N1", placeholder: "Enter N1" },
          { key: "n2", label: "Secondary turns N2", placeholder: "Enter N2" },
          { key: "i1", label: "Primary current I1 (A, optional)", placeholder: "Optional", optional: true }
        ]
      },
      {
        id: "generator-current-rpm",
        tab: "Generator",
        title: "Generator Current & RPM",
        description: "Estimate line current from real power and calculate synchronous speed from frequency and pole count.",
        formula: "S = P / PF\n1φ: I = P × 1000 / (V × PF)\n3φ: I = P × 1000 / (√3 × VL × PF)\nSynchronous RPM = 120f / poles",
        example: "Uses electrical output power and ideal synchronous speed; actual loaded speed can differ.",
        fields: [
          { key: "p", label: "Real output power (kW)", placeholder: "Enter kW" },
          { key: "v", label: "Voltage (V)", placeholder: "Line voltage for 3-phase" },
          { key: "pf", label: "Power factor (0–1)", placeholder: "e.g. 0.8" },
          { key: "phase", label: "System", type: "select", options: [["single", "Single-phase"], ["three", "Three-phase"]] },
          { key: "f", label: "Frequency (Hz)", placeholder: "e.g. 60" },
          { key: "poles", label: "Number of poles", placeholder: "e.g. 4" }
        ]
      },
      {
        id: "transformer-losses",
        tab: "Transformer Loss",
        title: "Transformer Total Loss",
        description: "Estimate core and load-dependent copper losses at the entered transformer load.",
        formula: "Load ratio = Load kVA / Rated kVA\nCopper loss = Full-load copper loss × Load ratio²\nTotal loss = Core loss + Copper loss",
        example: "Assumes copper loss varies with the square of load; use test-sheet loss values.",
        fields: [
          { key: "rated_kva", label: "Rated transformer (kVA)", placeholder: "Enter rated kVA" },
          { key: "load_kva", label: "Actual load (kVA)", placeholder: "Enter load kVA" },
          { key: "core_loss", label: "Core / no-load loss (W)", placeholder: "From test sheet" },
          { key: "full_load_copper_loss", label: "Full-load copper loss (W)", placeholder: "From test sheet" }
        ]
      },
      {
        id: "transformer-impedance",
        tab: "Impedance %",
        title: "Transformer % Impedance",
        description: "Calculate percentage impedance and equivalent impedance from rated voltage and short-circuit test voltage.",
        formula: "Z% = (Vsc / Vrated) × 100\nZbase = Vrated² / Rated VA\nZΩ = (Z% / 100) × Zbase",
        example: "Enter short-circuit test voltage at rated current and the matching rated voltage and kVA.",
        fields: [
          { key: "v", label: "Rated voltage (V)", placeholder: "Enter rated voltage" },
          { key: "vsc", label: "Short-circuit test voltage (V)", placeholder: "Enter test voltage" },
          { key: "kva", label: "Rated transformer (kVA)", placeholder: "Enter rated kVA" }
        ]
      },
      {
        id: "short-circuit-current",
        tab: "Short-Circuit",
        title: "Transformer Short-Circuit Current",
        description: "Estimate symmetrical bolted-fault current at transformer terminals from rating and impedance.",
        formula: "1φ: Irated = kVA × 1000 / V\n3φ: Irated = kVA × 1000 / (√3 × VL)\nIsc ≈ Irated / (Z% / 100)",
        example: "Assumes an infinite upstream source and ignores cable and utility impedance; not for protection coordination.",
        fields: [
          { key: "kva", label: "Transformer rating (kVA)", placeholder: "Enter rated kVA" },
          { key: "v", label: "Secondary voltage (V)", placeholder: "Line voltage for 3-phase" },
          { key: "z_pct", label: "Transformer impedance (%)", placeholder: "From nameplate" },
          { key: "phase", label: "System", type: "select", options: [["single", "Single-phase"], ["three", "Three-phase"]] }
        ]
      },
      {
        id: "transformer-load-sharing",
        tab: "Load Sharing",
        title: "Transformer Parallel Load Sharing",
        description: "Estimate two parallel transformers' load shares using their ratings and percent impedances.",
        formula: "Share₁ = Total load × (kVA₁ / Z%₁) / Σ(kVA / Z%)\nShare₂ = Total load − Share₁",
        example: "Assumes compatible voltage ratios, phase sequence, polarity, and impedance characteristics.",
        fields: [
          { key: "s1", label: "Transformer 1 rating (kVA)", placeholder: "Enter kVA" },
          { key: "z1", label: "Transformer 1 impedance (%)", placeholder: "Enter Z%" },
          { key: "s2", label: "Transformer 2 rating (kVA)", placeholder: "Enter kVA" },
          { key: "z2", label: "Transformer 2 impedance (%)", placeholder: "Enter Z%" },
          { key: "load", label: "Combined load (kVA)", placeholder: "Enter total load" }
        ]
      },
      {
        id: "motor-generator",
        tab: "Motor / Generator",
        title: "Machine Power Estimate",
        description: "Estimate AC input and output power from voltage, current, PF, phases, and efficiency.",
        formula: "1φ Pin = V × I × PF\n3φ Pin = √3 × VL × I × PF\nPout = Pin × η",
        example: "Efficiency is entered as a percentage from 0 to 100.",
        fields: [
          { key: "v", label: "Voltage (V)", placeholder: "Enter voltage" },
          { key: "i", label: "Current (A)", placeholder: "Enter current" },
          { key: "pf", label: "Power factor (0–1)", placeholder: "e.g. 0.85" },
          { key: "eff", label: "Efficiency (%)", placeholder: "e.g. 90" },
          { key: "phase", label: "System", type: "select", options: [["single", "Single-phase"], ["three", "Three-phase"]] }
        ]
      },
      {
        id: "efficiency",
        tab: "Efficiency",
        title: "Efficiency & Losses",
        description: "Compare useful output power with input power.",
        formula: "η = (Pout / Pin) × 100%\nLosses = Pin − Pout",
        example: "A 900 W output from 1000 W input is 90% efficient.",
        fields: [
          { key: "pin", label: "Input power (W)", placeholder: "Enter input power" },
          { key: "pout", label: "Output power (W)", placeholder: "Enter output power" }
        ]
      }
    ]
  },
  {
    id: "installation",
    title: "Electrical Installation & Design",
    icon: "⌂",
    tools: [
      {
        id: "wire-sizing",
        tab: "Wire Sizing",
        title: "Conductor Area Estimate",
        description: "Estimate conductor area from current, one-way length, voltage, and an allowed drop.",
        formula: "1φ: A = 2ρLI / ΔV\n3φ: A = √3ρLI / ΔV\nCopper ρ ≈ 0.01724 Ω·mm²/m",
        example: "Preliminary estimate only; check ampacity, installation method, and local code.",
        fields: [
          { key: "i", label: "Current (A)", placeholder: "Enter current" },
          { key: "l", label: "One-way length (m)", placeholder: "Enter length" },
          { key: "v", label: "Supply voltage (V)", placeholder: "Enter voltage" },
          { key: "drop", label: "Allowed voltage drop (%)", placeholder: "e.g. 3" },
          { key: "material", label: "Conductor", type: "select", options: [["copper", "Copper"], ["aluminum", "Aluminum"]] },
          { key: "phase", label: "Circuit", type: "select", options: [["single", "Single-phase / DC"], ["three", "Three-phase"]] }
        ]
      },
      {
        id: "voltage-drop",
        tab: "Voltage Drop",
        title: "Conductor Voltage Drop",
        description: "Estimate resistive drop using conductor material and circuit type.",
        formula: "1φ: ΔV = 2ρLI / A\n3φ: ΔV = √3ρLI / A",
        example: "Uses one-way cable length and conductor area in mm².",
        fields: [
          { key: "i", label: "Current (A)", placeholder: "Enter current" },
          { key: "l", label: "One-way length (m)", placeholder: "Enter length" },
          { key: "a", label: "Conductor area (mm²)", placeholder: "Enter area" },
          { key: "v", label: "Supply voltage (V)", placeholder: "Enter voltage" },
          { key: "material", label: "Conductor", type: "select", options: [["copper", "Copper"], ["aluminum", "Aluminum"]] },
          { key: "phase", label: "Circuit", type: "select", options: [["single", "Single-phase / DC"], ["three", "Three-phase"]] }
        ]
      },
      {
        id: "load",
        tab: "Load Computation",
        title: "Load Current",
        description: "Sum listed real loads and estimate line current for the selected system.",
        formula: "1φ: I = P / (V × PF)\n3φ: I = P / (√3 × VL × PF)",
        example: "List real loads in watts, separated by commas.",
        fields: [
          { key: "loads", label: "Load values (W)", type: "text", placeholder: "500, 1200, 800" },
          { key: "v", label: "Voltage (V)", placeholder: "Enter voltage" },
          { key: "pf", label: "Power factor (0–1)", placeholder: "e.g. 0.9" },
          { key: "phase", label: "System", type: "select", options: [["single", "Single-phase"], ["three", "Three-phase"]] }
        ]
      },
      {
        id: "earthing-conductor",
        tab: "Earthing Lead",
        title: "Earthing Conductor Resistance",
        description: "Estimate the resistance of a straight grounding conductor from its material, length, and cross-sectional area.",
        formula: "R = ρL / A\nCopper ρ ≈ 0.01724 Ω·mm²/m\nAluminum ρ ≈ 0.0282 Ω·mm²/m",
        example: "This estimates conductor resistance, not soil or ground-electrode resistance.",
        fields: [
          { key: "l", label: "Conductor length (m)", placeholder: "Enter length" },
          { key: "a", label: "Conductor area (mm²)", placeholder: "Enter area" },
          { key: "material", label: "Conductor", type: "select", options: [["copper", "Copper"], ["aluminum", "Aluminum"]] }
        ]
      },
      {
        id: "ngr-sizing",
        tab: "NGR",
        title: "Neutral Grounding Resistor Sizing",
        description: "Estimate resistor ohms, short-time power, and energy for a specified ground-fault current.",
        formula: "3φ: Vphase = VL / √3\nR = Vphase / Ifault\nP = Vphase × Ifault",
        example: "A preliminary estimate only; verify grounding method, duty time, ratings, and protection design.",
        fields: [
          { key: "v", label: "System voltage (V)", placeholder: "Line-to-line for 3-phase" },
          { key: "phase", label: "System", type: "select", options: [["single", "Single-phase / line-to-neutral"], ["three", "Three-phase / line-to-line"]] },
          { key: "i", label: "Target ground-fault current (A)", placeholder: "Enter current" },
          { key: "time", label: "Fault duration (seconds)", placeholder: "e.g. 10" }
        ]
      },
      {
        id: "conductor-capacity",
        tab: "Cable / Busbar",
        title: "Cable & Busbar Current Estimate",
        description: "Estimate current from conductor area and a user-supplied current density.",
        formula: "I ≈ A × J\nA = conductor area (mm²)\nJ = selected current density (A/mm²)",
        example: "Screening estimate only, not code ampacity. Set current density for the actual material, insulation, installation, and temperature.",
        fields: [
          { key: "a", label: "Conductor area (mm²)", placeholder: "Enter area" },
          { key: "j", label: "Selected current density (A/mm²)", placeholder: "Use applicable design value" }
        ]
      }
    ]
  },
  {
    id: "math",
    title: "Engineering Mathematics",
    icon: "∑",
    tools: [
      {
        id: "triangle",
        tab: "Triangle",
        title: "Right Triangle",
        description: "Enter the two perpendicular sides to find the hypotenuse and area.",
        formula: "c = √(a² + b²)\nArea = ab / 2",
        example: "For a = 3 and b = 4, c = 5.",
        fields: [
          { key: "a", label: "Side a", placeholder: "Enter side a" },
          { key: "b", label: "Side b", placeholder: "Enter side b" }
        ]
      },
      {
        id: "load-conversion",
        tab: "kW / kVA / HP",
        title: "kW–kVA–HP & Current Conversion",
        description: "Convert kW, kVA, or motor horsepower to power values and estimate line current.",
        formula: "1 HP = 0.746 kW mechanical\nkVA = electrical kW / PF\nI = electrical kW × 1000 / (phase factor × V × PF)",
        example: "For HP input, enter motor efficiency. Current is an estimate; verify nameplate and design data.",
        fields: [
          { key: "quantity", label: "Power quantity", placeholder: "Enter kW, kVA, or HP" },
          { key: "quantity_type", label: "Entered unit", type: "select", options: [["kw", "kW"], ["kva", "kVA"], ["hp", "HP"]] },
          { key: "pf", label: "Power factor (0–1)", placeholder: "e.g. 0.85" },
          { key: "eff", label: "Motor efficiency (%)", placeholder: "e.g. 90", default: 100 },
          { key: "v", label: "Supply voltage (V)", placeholder: "Line voltage for 3-phase" },
          { key: "phase", label: "System", type: "select", options: [["single", "Single-phase"], ["three", "Three-phase"]] }
        ]
      },
      {
        id: "quadratic",
        tab: "Quadratic",
        title: "Quadratic Equation",
        description: "Solve ax² + bx + c = 0, including complex roots when needed.",
        formula: "x = [−b ± √(b² − 4ac)] / 2a",
        example: "A negative discriminant produces a complex conjugate pair.",
        fields: [
          { key: "a", label: "Coefficient a", placeholder: "Enter a" },
          { key: "b", label: "Coefficient b", placeholder: "Enter b" },
          { key: "c", label: "Coefficient c", placeholder: "Enter c" }
        ]
      },
      {
        id: "trigonometry",
        tab: "Trigonometry",
        title: "Right-Triangle Trigonometry",
        description: "Evaluate common trigonometric functions for an angle in degrees.",
        formula: "sin θ = opposite / hypotenuse\ncos θ = adjacent / hypotenuse\ntan θ = opposite / adjacent",
        example: "For θ = 30°, sin θ = 0.5.",
        fields: [{ key: "angle", label: "Angle (degrees)", placeholder: "Enter angle" }]
      }
    ]
  }
];

const EE_FORMULA_STORAGE_KEY = "loveplay-ee-calculator-formulas-v1";
const eeDefaultCalculationFormulas = {
  ohms: "Voltage (V) = v\nCurrent (A) = i\nResistance (Ω) = r\nPower (W) = p",
  resistors: "Series equivalent (Ω) = sum(values)\nParallel equivalent (Ω) = parallel(values)",
  "kcl-kvl": "KCL current sum (A) = sum(currents)\nKVL voltage sum (V) = sum(voltages)",
  "rms-peak": "Peak voltage (V) = rms * sqrt(2)\nPeak-to-peak voltage (V) = 2 * rms * sqrt(2)",
  impedance: "Impedance magnitude (Ω) = sqrt(r^2 + (xl - xc)^2)\nPhase angle (degrees) = atan2(xl - xc, r) * 180 / pi",
  "ac-power-factor": "Power factor = p / s\nReactive power (var) = sqrt(s^2 - p^2)",
  "single-phase": "Real power (W) = v * i * pf\nApparent power (VA) = v * i\nReactive power (var) = v * i * sqrt(1 - pf^2)",
  "three-phase": "Real power (W) = sqrt(3) * v * i * pf\nApparent power (VA) = sqrt(3) * v * i\nReactive power (var) = sqrt(3) * v * i * sqrt(1 - pf^2)",
  "pf-correction": "Required capacitor bank (kVAr) = p * (tan(acos(pf1)) - tan(acos(pf2)))\nCapacitance per phase (uF) = p * 1000 * (tan(acos(pf1)) - tan(acos(pf2))) / (2 * pi * f * v^2 * phase_count) * 1000000",
  transformer: "Secondary voltage (V) = v1 * n2 / n1\nTurns ratio (N2/N1) = n2 / n1",
  "generator-current-rpm": "Apparent power (kVA) = p / pf\nGenerator line current (A) = p * 1000 / (phase_factor * v * pf)\nSynchronous speed (RPM) = 120 * f / poles",
  "transformer-losses": "Load ratio = load_kva / rated_kva\nCopper loss at load (W) = full_load_copper_loss * (load_kva / rated_kva)^2\nTotal transformer loss (W) = core_loss + full_load_copper_loss * (load_kva / rated_kva)^2",
  "transformer-impedance": "Transformer impedance (%) = vsc / v * 100\nBase impedance (ohm) = v^2 / (kva * 1000)\nEquivalent impedance (ohm) = vsc / v * v^2 / (kva * 1000)",
  "short-circuit-current": "Rated line current (A) = kva * 1000 / (phase_factor * v)\nEstimated terminal short-circuit current (A) = kva * 1000 / (phase_factor * v) / (z_pct / 100)",
  "transformer-load-sharing": "Transformer 1 share (kVA) = load * (s1 / z1) / (s1 / z1 + s2 / z2)\nTransformer 2 share (kVA) = load - load * (s1 / z1) / (s1 / z1 + s2 / z2)\nTransformer 1 loading (%) = (load * (s1 / z1) / (s1 / z1 + s2 / z2)) / s1 * 100\nTransformer 2 loading (%) = (load - load * (s1 / z1) / (s1 / z1 + s2 / z2)) / s2 * 100",
  "motor-generator": "Apparent power (VA) = phase_factor * v * i\nInput power (W) = phase_factor * v * i * pf\nEstimated output power (W) = phase_factor * v * i * pf * eff / 100",
  efficiency: "Efficiency (percent) = pout / pin * 100\nPower losses (W) = pin - pout",
  "wire-sizing": "Estimated minimum conductor area (mm2) = circuit_factor * rho * l * i / (v * drop / 100)",
  "voltage-drop": "Voltage drop (V) = circuit_factor * rho * l * i / a\nVoltage drop (percent) = circuit_factor * rho * l * i / a / v * 100",
  load: "Total load (W) = sum(loads)\nEstimated line current (A) = sum(loads) / (phase_factor * v * pf)",
  "earthing-conductor": "Earthing conductor resistance (ohm) = rho * l / a",
  "ngr-sizing": "Phase-to-ground voltage (V) = v * phase_voltage_factor\nNGR resistance (ohm) = v * phase_voltage_factor / i\nResistor duty power (kW) = v * phase_voltage_factor * i / 1000\nEnergy for selected duration (kJ) = v * phase_voltage_factor * i * time / 1000",
  "conductor-capacity": "Estimated conductor current (A) = a * j",
  triangle: "Hypotenuse = sqrt(a^2 + b^2)\nArea = a * b / 2",
  "load-conversion": "Electrical real power (kW) = kw\nApparent power (kVA) = kva\nMechanical output (HP) = hp\nEstimated line current (A) = kw * 1000 / (phase_factor * v * pf)",
  quadratic: "Discriminant = b^2 - 4 * a * c\nRoot 1 = (-b + sqrt(b^2 - 4 * a * c)) / (2 * a)\nRoot 2 = (-b - sqrt(b^2 - 4 * a * c)) / (2 * a)",
  trigonometry: "Sine = sin(angle * pi / 180)\nCosine = cos(angle * pi / 180)\nTangent = tan(angle * pi / 180)"
};

let eeSavedFormulas = {};
try {
  const savedFormulas = JSON.parse(localStorage.getItem(EE_FORMULA_STORAGE_KEY) || "{}");
  if (!savedFormulas || Array.isArray(savedFormulas) || typeof savedFormulas !== "object" ||
      Object.entries(savedFormulas).some(([key, value]) =>
        !Object.hasOwn(eeDefaultCalculationFormulas, key) || typeof value !== "string")) {
    throw new Error("Saved calculator formula settings have an invalid format.");
  }
  eeSavedFormulas = savedFormulas;
} catch (error) {
  console.error("Could not load saved electrical calculator formulas.", error);
}

const eeSidebarNav = document.getElementById("eeSidebarNav");
const eeCategoriesRoot = document.getElementById("eeCategories");
const eeFormulaReference = document.getElementById("eeFormulaReference");
const eeCalculatorNumber = value => calculatorNumber(value);

function createEeField(toolId, field) {
  const label = document.createElement("label");
  label.className = "ee-field";
  const caption = document.createElement("span");
  caption.textContent = field.label;
  label.append(caption);

  let input;
  if (field.type === "select") {
    input = document.createElement("select");
    field.options.forEach(([value, text]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      input.append(option);
    });
  } else {
    input = document.createElement("input");
    input.type = field.type || "number";
    input.placeholder = field.placeholder || "";
    input.inputMode = field.type === "text" ? "text" : "decimal";
    if (input.type === "number") {
      if (toolId === "quadratic") input.removeAttribute("min");
      else input.min = "0";
      input.step = "any";
    }
    if (field.default !== undefined) input.value = String(field.default);
    input.required = !field.optional;
  }
  input.name = field.key;
  input.setAttribute("aria-label", field.label);
  label.append(input);
  return label;
}

function renderEeCategories() {
  eeCategoriesRoot.replaceChildren();
  eeSidebarNav.replaceChildren();
  eeFormulaReference.replaceChildren();

  const homeLink = document.createElement("button");
  homeLink.type = "button";
  homeLink.className = "ee-nav-item is-active";
  homeLink.dataset.eeNav = "home";
  homeLink.innerHTML = '<span aria-hidden="true">⌂</span><span>Home</span>';
  eeSidebarNav.append(homeLink);

  const referenceLink = document.createElement("button");
  referenceLink.type = "button";
  referenceLink.className = "ee-nav-item";
  referenceLink.dataset.eeNav = "reference";
  referenceLink.innerHTML = '<span aria-hidden="true">▤</span><span>Formula Reference</span>';
  eeSidebarNav.append(referenceLink);

  eeCategories.forEach((category, categoryIndex) => {
    const navButton = document.createElement("button");
    navButton.type = "button";
    navButton.className = "ee-nav-item";
    navButton.dataset.eeNav = category.id;
    navButton.innerHTML = `<span aria-hidden="true">${category.icon}</span><span>${category.title}</span>`;
    eeSidebarNav.append(navButton);

    const card = document.createElement("article");
    card.className = `ee-category-card ee-category-${category.id}`;
    card.id = `ee-${category.id}`;
    card.dataset.eeCategory = category.id;

    const heading = document.createElement("header");
    heading.className = "ee-category-heading";
    const icon = document.createElement("span");
    icon.className = "ee-category-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = category.icon;
    const title = document.createElement("h3");
    title.textContent = `${categoryIndex + 1}. ${category.title}`;
    heading.append(icon, title);

    const tabs = document.createElement("div");
    tabs.className = "ee-tool-tabs";
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", `${category.title} calculators`);
    const panels = document.createElement("div");
    panels.className = "ee-tool-panels";

    category.tools.forEach((tool, toolIndex) => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "ee-tool-tab";
      tab.id = `ee-tab-${tool.id}`;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", `ee-panel-${tool.id}`);
      tab.setAttribute("aria-selected", String(toolIndex === 0));
      tab.tabIndex = toolIndex === 0 ? 0 : -1;
      tab.textContent = tool.tab;
      tabs.append(tab);

      const panel = document.createElement("section");
      panel.className = "ee-tool-panel";
      panel.id = `ee-panel-${tool.id}`;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tab.id);
      panel.hidden = toolIndex !== 0;

      const form = document.createElement("form");
      form.className = "ee-tool-form";
      form.dataset.eeTool = tool.id;
      tool.fields.forEach(field => form.append(createEeField(tool.id, field)));
      form.append(createEeField(tool.id, {
        key: "multiplier",
        label: "Result multiplier (×)",
        placeholder: "1 = no adjustment",
        default: 1
      }));
      const submit = document.createElement("button");
      submit.className = "ee-calculate-button";
      submit.type = "submit";
      submit.textContent = "Calculate";
      form.append(submit);

      const inlineOutput = document.createElement("p");
      inlineOutput.className = "ee-tool-result ee-tool-result-inline";
      inlineOutput.dataset.eeResult = tool.id;
      inlineOutput.setAttribute("role", "status");
      inlineOutput.setAttribute("aria-live", "polite");
      inlineOutput.textContent = "Enter values and calculate.";
      form.append(inlineOutput);

      const output = document.createElement("p");
      output.className = "ee-tool-result";
      output.dataset.eeResult = tool.id;
      output.setAttribute("role", "status");
      output.setAttribute("aria-live", "polite");
      output.textContent = "Enter values and calculate.";

      const reference = document.createElement("aside");
      reference.className = "ee-tool-reference";
      const formulaTitle = document.createElement("strong");
      formulaTitle.textContent = "Formulas";
      const formulaText = document.createElement("pre");
      formulaText.textContent = tool.formula;
      const exampleTitle = document.createElement("strong");
      exampleTitle.textContent = "Example";
      const exampleText = document.createElement("p");
      exampleText.textContent = tool.example;
      const editableFormulaTitle = document.createElement("strong");
      editableFormulaTitle.textContent = "Editable calculation formula";
      const formulaEditor = document.createElement("textarea");
      formulaEditor.className = "ee-formula-editor";
      formulaEditor.dataset.eeFormula = tool.id;
      formulaEditor.setAttribute("aria-label", `${tool.title} calculation formula`);
      formulaEditor.spellcheck = false;
      formulaEditor.value = eeSavedFormulas[tool.id] ?? eeDefaultCalculationFormulas[tool.id];
      const formulaHelp = document.createElement("small");
      formulaHelp.className = "ee-formula-help";
      formulaHelp.textContent = `Inputs: ${tool.fields.map(field => field.key).join(", ")}. Derived: phase_factor, phase_voltage_factor, phase_count, circuit_factor, rho. The result multiplier is applied to every output after calculation. One result per line: Label = expression. Supports + - * / ^, parentheses, pi, sqrt(), sin(), cos(), tan(), acos(), atan2(), sum(), parallel().`;
      const formulaActions = document.createElement("div");
      formulaActions.className = "ee-formula-actions";
      const saveFormula = document.createElement("button");
      saveFormula.type = "button";
      saveFormula.className = "ee-formula-save";
      saveFormula.dataset.eeSaveFormula = tool.id;
      saveFormula.textContent = "Save formula";
      const resetFormula = document.createElement("button");
      resetFormula.type = "button";
      resetFormula.className = "ee-formula-reset";
      resetFormula.dataset.eeResetFormula = tool.id;
      resetFormula.textContent = "Reset";
      formulaActions.append(saveFormula, resetFormula);
      const formulaStatus = document.createElement("small");
      formulaStatus.className = "ee-formula-status";
      formulaStatus.dataset.eeFormulaStatus = tool.id;
      formulaStatus.setAttribute("role", "status");
      reference.append(
        formulaTitle, formulaText, exampleTitle, exampleText,
        editableFormulaTitle, formulaEditor, formulaHelp, formulaActions, formulaStatus
      );

      const toolLayout = document.createElement("div");
      toolLayout.className = "ee-tool-layout";
      toolLayout.append(form, reference);
      panel.append(toolLayout, output);
      panels.append(panel);
    });

    card.append(heading, tabs, panels);
    eeCategoriesRoot.append(card);
  });

  const references = [
    ["Ohm's Law", "V = I × R\nI = V / R\nR = V / I"],
    ["AC Reactance", "XL = 2πfL\nXC = 1 / (2πfC)"],
    ["Power", "P = V × I × PF\nS = V × I\nQ = √(S² − P²)"],
    ["Transformer", "V₂ / V₁ = N₂ / N₁\nI₂ / I₁ = N₁ / N₂"],
    ["Voltage Drop", "ΔV₁φ ≈ 2ρLI / A\nΔV₃φ ≈ √3ρLI / A"],
    ["Common Symbols", "R — resistor\nL — inductor\nC — capacitor\n⏚ — ground"],
    ["Pythagorean", "c = √(a² + b²)"]
  ];
  references.forEach(([title, formula]) => {
    const item = document.createElement("article");
    item.className = "ee-reference-item";
    const heading = document.createElement("h3");
    heading.textContent = title;
    const text = document.createElement("pre");
    text.textContent = formula;
    item.append(heading, text);
    eeFormulaReference.append(item);
  });
}

function eeReadValues(form) {
  const values = {};
  new FormData(form).forEach((value, key) => {
    const field = form.elements.namedItem(key);
    values[key] = field instanceof HTMLInputElement && field.type === "number"
      ? field.valueAsNumber
      : String(value).trim();
  });
  return values;
}

function eeList(value, label, signed = false) {
  const tokens = value.split(/[\s,;]+/).filter(Boolean);
  const numbers = tokens.map(Number);
  if (numbers.length < 2 || numbers.some(number => !Number.isFinite(number) || (!signed && number <= 0))) {
    throw new Error(`Enter at least two ${signed ? "finite signed" : "positive finite"} ${label} values.`);
  }
  return numbers;
}

function createEeFormulaContext(toolId, values, fillSamples = false) {
  const tool = eeCategories.flatMap(category => category.tools).find(item => item.id === toolId);
  if (!tool) throw new Error("Calculator configuration was not found.");
  const context = {};
  tool.fields.forEach(field => {
    const value = values[field.key];
    if (field.type === "select") return;
    if (field.type === "text" || ["values", "currents", "voltages", "loads"].includes(field.key)) {
      if (typeof value === "string" && value.trim()) {
        context[field.key] = eeList(value, field.label.toLowerCase(), ["currents", "voltages"].includes(field.key));
      } else if (fillSamples) {
        context[field.key] = [2, 3];
      }
      return;
    }
    if (Number.isFinite(value)) context[field.key] = value;
    else if (fillSamples) context[field.key] = 2;
  });

  if (toolId === "ohms") {
    if (fillSamples) {
      context.v = 12;
      context.i = 3;
      context.r = 4;
    }
    const known = ["v", "i", "r"].filter(key => Number.isFinite(context[key]));
    if (known.length < 2) {
      if (!fillSamples) throw new Error("Enter at least two positive values.");
      context.v = 12;
      context.i = 3;
      context.r = 4;
    }
    if ([context.v, context.i, context.r].some(value => Number.isFinite(value) && value <= 0)) {
      throw new Error("Enter positive voltage, current, and resistance values.");
    }
    if (!Number.isFinite(context.v)) context.v = context.i * context.r;
    else if (!Number.isFinite(context.i)) context.i = context.v / context.r;
    else if (!Number.isFinite(context.r)) context.r = context.v / context.i;
    else if (Math.abs(context.v - context.i * context.r) > Math.max(context.v, context.i * context.r) * 0.001) {
      throw new Error("These values do not agree with Ohm's law (V = I ? R).");
    }
    context.p = context.v * context.i;
  }

  const phase = values.phase;
  context.phase_factor = phase === "three" ? Math.sqrt(3) : 1;
  context.phase_voltage_factor = phase === "three" ? 1 / Math.sqrt(3) : 1;
  context.phase_count = phase === "three" ? 3 : 1;
  context.circuit_factor = phase === "three" ? Math.sqrt(3) : 2;
  context.rho = values.material === "aluminum" ? 0.0282 : 0.01724;

  const requirePositive = (keys, label) => {
    if (keys.some(key => !Number.isFinite(context[key]) || context[key] <= 0)) {
      throw new Error(`Enter positive finite ${label}.`);
    }
  };
  if (toolId === "generator-current-rpm") {
    requirePositive(["p", "v", "f", "poles"], "power, voltage, frequency, and pole count");
    if (!Number.isInteger(context.poles) || context.poles % 2 !== 0) {
      throw new Error("Enter a positive even number of generator poles.");
    }
    if (!Number.isFinite(context.pf) || context.pf <= 0 || context.pf > 1) {
      throw new Error("Power factor must be greater than 0 and no greater than 1.");
    }
  } else if (toolId === "transformer-losses") {
    requirePositive(["rated_kva"], "rated transformer kVA");
    if (["load_kva", "core_loss", "full_load_copper_loss"].some(key =>
      !Number.isFinite(context[key]) || context[key] < 0)) {
      throw new Error("Enter finite, non-negative load and transformer loss values.");
    }
  } else if (toolId === "transformer-impedance") {
    requirePositive(["v", "vsc", "kva"], "rated voltage, test voltage, and transformer kVA");
  } else if (toolId === "short-circuit-current") {
    requirePositive(["kva", "v", "z_pct"], "transformer kVA, voltage, and impedance percentage");
  } else if (toolId === "transformer-load-sharing") {
    requirePositive(["s1", "z1", "s2", "z2", "load"], "transformer ratings, impedances, and total load");
  } else if (toolId === "earthing-conductor") {
    requirePositive(["l", "a"], "conductor length and area");
  } else if (toolId === "ngr-sizing") {
    requirePositive(["v", "i", "time"], "system voltage, fault current, and duration");
  } else if (toolId === "conductor-capacity") {
    requirePositive(["a", "j"], "conductor area and current density");
  } else if (toolId === "load-conversion") {
    requirePositive(["quantity", "v", "eff"], "power quantity, voltage, and motor efficiency");
    if (!Number.isFinite(context.pf) || context.pf <= 0 || context.pf > 1) {
      throw new Error("Power factor must be greater than 0 and no greater than 1.");
    }
    if (context.eff > 100) throw new Error("Motor efficiency must be no greater than 100%.");
    const kind = values.quantity_type;
    context.kw = kind === "hp" ? context.quantity * 0.746 / (context.eff / 100)
      : kind === "kva" ? context.quantity * context.pf
        : context.quantity;
    context.kva = context.kw / context.pf;
    context.hp = kind === "hp" ? context.quantity : context.kw * (context.eff / 100) / 0.746;
  }
  return context;
}

function evaluateEeExpression(expression, context) {
  const tokens = [];
  const tokenPattern = /\s*(?:(\d+(?:\.\d*)?|\.\d+)([eE][+-]?\d+)?|([A-Za-z_][A-Za-z_0-9]*)|(\*\*|[()+\-*/^%,]))/y;
  let offset = 0;
  while (offset < expression.length) {
    tokenPattern.lastIndex = offset;
    const match = tokenPattern.exec(expression);
    if (!match) throw new Error("Unsupported formula character near: " + expression.slice(offset, offset + 12));
    offset = tokenPattern.lastIndex;
    if (match[1]) tokens.push({ type: "number", value: Number(match[1] + (match[2] || "")) });
    else if (match[3]) tokens.push({ type: "identifier", value: match[3].toLowerCase() });
    else if (match[4]) tokens.push({ type: "operator", value: match[4] });
  }
  let position = 0;
  const functions = {
    sqrt: Math.sqrt, abs: Math.abs, sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan, atan2: Math.atan2,
    hypot: Math.hypot, min: Math.min, max: Math.max, log: Math.log,
    log10: Math.log10, exp: Math.exp, floor: Math.floor, ceil: Math.ceil,
    round: Math.round,
    sum: values => {
      const items = values.length === 1 && Array.isArray(values[0]) ? values[0] : values;
      return items.reduce((total, value) => total + value, 0);
    },
    parallel: values => {
      const items = values.length === 1 && Array.isArray(values[0]) ? values[0] : values;
      if (!items.length || items.some(value => value <= 0)) throw new Error("parallel() needs positive resistance values.");
      return 1 / items.reduce((total, value) => total + 1 / value, 0);
    }
  };
  const peek = value => tokens[position]?.value === value;
  const take = () => tokens[position++];
  const requireToken = value => {
    if (!peek(value)) throw new Error("Expected '" + value + "' in formula.");
    take();
  };
  const primary = () => {
    const token = take();
    if (!token) throw new Error("Formula is incomplete.");
    if (token.type === "number") return token.value;
    if (token.value === "(") {
      const value = expressionValue();
      requireToken(")");
      return value;
    }
    if (token.type !== "identifier") throw new Error("Expected a number, input name, or function.");
    if (peek("(")) {
      take();
      const args = [];
      if (!peek(")")) {
        do {
          args.push(expressionValue());
          if (!peek(",")) break;
          take();
        } while (true);
      }
      requireToken(")");
      const fn = functions[token.value];
      if (!fn) throw new Error("Unsupported formula function: " + token.value + "().");
      return fn(...args);
    }
    if (token.value === "pi") return Math.PI;
    if (token.value === "e") return Math.E;
    if (!Object.hasOwn(context, token.value)) throw new Error("Unknown input name: " + token.value + ".");
    const value = context[token.value];
    if (Array.isArray(value)) return value;
    if (!Number.isFinite(value)) throw new Error("Enter a value for " + token.value + ".");
    return value;
  };
  const power = () => {
    const base = primary();
    if (peek("^") || peek("**")) {
      take();
      return base ** unary();
    }
    return base;
  };
  const unary = () => {
    if (peek("+")) { take(); return unary(); }
    if (peek("-")) { take(); return -unary(); }
    return power();
  };
  const term = () => {
    let value = unary();
    while (peek("*") || peek("/") || peek("%")) {
      const operator = take().value;
      const right = unary();
      value = operator === "*" ? value * right : operator === "/" ? value / right : value % right;
    }
    return value;
  };
  const expressionValue = () => {
    let value = term();
    while (peek("+") || peek("-")) {
      const operator = take().value;
      const right = term();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  };
  if (!tokens.length) throw new Error("Enter a formula expression.");
  const result = expressionValue();
  if (position !== tokens.length) throw new Error("Unexpected token in formula: " + tokens[position].value + ".");
  if (!Number.isFinite(result)) throw new Error("Formula result is not a finite number. Check division and input values.");
  return result;
}

function calculateEeFormula(toolId, values, formulaText, fillSamples = false) {
  const context = createEeFormulaContext(toolId, values, fillSamples);
  const multiplier = fillSamples ? 1 : values.multiplier;
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    throw new Error("Enter a positive, finite result multiplier. Use 1 for no adjustment.");
  }
  const lines = formulaText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (!lines.length) throw new Error("Enter at least one formula result as Label = expression.");
  return lines.map((line, index) => {
    const separator = line.indexOf("=");
    if (separator < 1 || separator === line.length - 1) {
      throw new Error("Formula line " + (index + 1) + " must use the format Label = expression.");
    }
    const label = line.slice(0, separator).trim();
    const expression = line.slice(separator + 1).trim();
    if (!label || label.length > 60) throw new Error("Formula line " + (index + 1) + " needs a short result label.");
    const result = evaluateEeExpression(expression, context) * multiplier;
    if (!Number.isFinite(result)) throw new Error("The adjusted result is not finite. Check the multiplier and input values.");
    return label + " = " + eeCalculatorNumber(result);
  }).join(" | ") + (multiplier === 1 ? "" : ` | Multiplier × ${eeCalculatorNumber(multiplier)}`);
}

function validateEeFormula(toolId, formulaText) {
  const tool = eeCategories.flatMap(category => category.tools).find(item => item.id === toolId);
  if (!tool) throw new Error("Calculator configuration was not found.");
  const sampleValues = {};
  tool.fields.forEach(field => {
    if (field.type === "select") sampleValues[field.key] = field.options[0][0];
    else if (field.type === "text" || ["values", "currents", "voltages", "loads"].includes(field.key)) sampleValues[field.key] = "2, 3";
    else if (["pf", "pf1"].includes(field.key)) sampleValues[field.key] = 0.6;
    else if (field.key === "pf2") sampleValues[field.key] = 0.9;
    else if (field.key === "s") sampleValues[field.key] = 3;
    else if (field.key === "b") sampleValues[field.key] = 3;
    else sampleValues[field.key] = 2;
  });
  if (toolId === "quadratic") {
    sampleValues.a = 1;
    sampleValues.b = 3;
    sampleValues.c = 2;
  }
  calculateEeFormula(toolId, sampleValues, formulaText, true);
}

function persistEeFormulas(nextFormulas) {
  try {
    localStorage.setItem(EE_FORMULA_STORAGE_KEY, JSON.stringify(nextFormulas));
  } catch (error) {
    console.error("Could not save electrical calculator formulas.", error);
    throw new Error("Could not save this formula in the browser. Check browser storage settings and try again.");
  }
  eeSavedFormulas = nextFormulas;
}

renderEeCategories();
document.getElementById("calculator").dataset.eeSelection = "home";

document.getElementById("eeSidebarNav").addEventListener("click", event => {
  const button = event.target.closest("[data-ee-nav]");
  if (!button) return;
  const selection = button.dataset.eeNav;
  document.getElementById("calculator").dataset.eeSelection = selection;
  document.querySelectorAll(".ee-nav-item").forEach(item => item.classList.toggle("is-active", item === button));
  document.querySelectorAll("[data-ee-category]").forEach(card => {
    card.hidden = selection !== "home" && card.dataset.eeCategory !== selection;
  });
  document.getElementById("eeWelcome").hidden = selection !== "home";
  document.getElementById("ee-formula-reference").hidden = selection !== "home" && selection !== "reference";
});

document.querySelector(".ee-topbar nav").addEventListener("click", event => {
  const link = event.target.closest("[data-ee-nav-target]");
  if (!link) return;
  event.preventDefault();
  const target = document.querySelector(`.ee-nav-item[data-ee-nav="${link.dataset.eeNavTarget}"]`);
  target.click();
  document.getElementById(link.hash.slice(1)).scrollIntoView({ behavior: "smooth", block: "start" });
});

document.getElementById("eeCategories").addEventListener("click", event => {
  const saveButton = event.target.closest("[data-ee-save-formula]");
  const resetButton = event.target.closest("[data-ee-reset-formula]");
  if (saveButton || resetButton) {
    const toolId = (saveButton || resetButton).dataset.eeSaveFormula ||
      (saveButton || resetButton).dataset.eeResetFormula;
    const editor = document.querySelector(`[data-ee-formula="${toolId}"]`);
    const status = document.querySelector(`[data-ee-formula-status="${toolId}"]`);
    try {
      const nextFormulas = { ...eeSavedFormulas };
      if (resetButton) {
        delete nextFormulas[toolId];
        persistEeFormulas(nextFormulas);
        editor.value = eeDefaultCalculationFormulas[toolId];
        status.textContent = "Restored the default formula and saved it.";
      } else {
        validateEeFormula(toolId, editor.value);
        nextFormulas[toolId] = editor.value.trim();
        persistEeFormulas(nextFormulas);
        status.textContent = "Formula saved. Calculator results will use this formula.";
      }
      status.classList.remove("has-error");
    } catch (error) {
      status.textContent = error.message;
      status.classList.add("has-error");
    }
    return;
  }

  const tab = event.target.closest(".ee-tool-tab");
  if (!tab) return;
  const tabList = tab.parentElement;
  const panelRoot = tab.closest(".ee-category-card").querySelector(".ee-tool-panels");
  tabList.querySelectorAll(".ee-tool-tab").forEach(item => {
    const selected = item === tab;
    item.setAttribute("aria-selected", String(selected));
    item.tabIndex = selected ? 0 : -1;
  });
  panelRoot.querySelectorAll(".ee-tool-panel").forEach(panel => {
    panel.hidden = panel.id !== tab.getAttribute("aria-controls");
  });
});

document.getElementById("eeCategories").addEventListener("keydown", event => {
  const tab = event.target.closest(".ee-tool-tab");
  if (!tab) return;
  const tabs = Array.from(tab.parentElement.querySelectorAll(".ee-tool-tab"));
  const currentIndex = tabs.indexOf(tab);
  let nextIndex;
  if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
  else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  else if (event.key === "Home") nextIndex = 0;
  else if (event.key === "End") nextIndex = tabs.length - 1;
  else return;
  event.preventDefault();
  tabs[nextIndex].focus();
  tabs[nextIndex].click();
});

document.getElementById("eeCategories").addEventListener("submit", event => {
  const form = event.target.closest(".ee-tool-form");
  if (!form) return;
  event.preventDefault();
  const outputs = document.querySelectorAll('[data-ee-result="' + form.dataset.eeTool + '"]');
  const formula = document.querySelector(`[data-ee-formula="${form.dataset.eeTool}"]`);
  try {
    const result = calculateEeFormula(form.dataset.eeTool, eeReadValues(form), formula.value);
    outputs.forEach(output => {
      output.textContent = result;
      output.classList.remove("has-error");
    });
  } catch (error) {
    outputs.forEach(output => {
      output.textContent = error.message;
      output.classList.add("has-error");
    });
  }
});

// EMBEDDED TIKTOK VIDEO LIST
const tiktokVideos = [];
let activeTikTokVideo = 0;
const tiktokVideoMessage = document.getElementById("tiktokVideoMessage");
const tiktokViewer = document.getElementById("tiktokViewer");
const tiktokPlayerWrap = document.getElementById("tiktokPlayerWrap");
const tiktokVideoCount = document.getElementById("tiktokVideoCount");
const tiktokPrevious = document.getElementById("tiktokPrevious");
const tiktokNext = document.getElementById("tiktokNext");

function renderTikTokVideo() {
  tiktokPlayerWrap.replaceChildren();
  const hasVideos = tiktokVideos.length > 0;
  tiktokViewer.hidden = !hasVideos;
  if (!hasVideos) return;

  const videoId = tiktokVideos[activeTikTokVideo];
  const player = document.createElement("iframe");
  player.src = `https://www.tiktok.com/player/v1/${videoId}?music_info=1&description=1`;
  player.title = `TikTok video ${activeTikTokVideo + 1}`;
  player.allow = "encrypted-media; fullscreen; picture-in-picture";
  player.allowFullscreen = true;
  player.loading = "lazy";
  tiktokPlayerWrap.append(player);

  tiktokVideoCount.textContent = `${activeTikTokVideo + 1} / ${tiktokVideos.length}`;
  tiktokPrevious.disabled = tiktokVideos.length < 2;
  tiktokNext.disabled = tiktokVideos.length < 2;
}

function saveTikTokVideos() {
  try {
    localStorage.setItem(TIKTOK_VIDEO_STORAGE_KEY, JSON.stringify(tiktokVideos));
  } catch (error) {
    tiktokVideoMessage.textContent = `Could not save the video list in this browser: ${error.message}`;
    return false;
  }
  return true;
}

try {
  const savedTikTokVideos = JSON.parse(localStorage.getItem(TIKTOK_VIDEO_STORAGE_KEY) || "[]");
  if (!Array.isArray(savedTikTokVideos) ||
      savedTikTokVideos.some(videoId => typeof videoId !== "string" || !/^\d+$/.test(videoId))) {
    throw new Error("Saved TikTok video list has an invalid format.");
  }
  tiktokVideos.push(...savedTikTokVideos);
} catch (error) {
  tiktokVideoMessage.textContent = `Could not load the saved TikTok video list: ${error.message}`;
}

document.getElementById("tiktokVideoForm").addEventListener("submit", event => {
  event.preventDefault();
  const input = document.getElementById("tiktokVideoUrl");
  let videoUrl;
  try {
    videoUrl = new URL(input.value.trim());
  } catch {
    tiktokVideoMessage.textContent = "Enter a valid full TikTok video link.";
    return;
  }

  const videoId = videoUrl.pathname.match(/\/video\/(\d+)/)?.[1];
  if (videoUrl.protocol !== "https:" ||
      !(videoUrl.hostname === "tiktok.com" || videoUrl.hostname.endsWith(".tiktok.com")) ||
      !videoId) {
    tiktokVideoMessage.textContent = "Use a full TikTok video link with /video/ in its address. Short links are not supported.";
    return;
  }
  if (tiktokVideos.includes(videoId)) {
    tiktokVideoMessage.textContent = "That video is already in your list.";
    return;
  }

  tiktokVideos.push(videoId);
  activeTikTokVideo = tiktokVideos.length - 1;
  if (!saveTikTokVideos()) {
    tiktokVideos.pop();
    activeTikTokVideo = Math.max(0, tiktokVideos.length - 1);
    return;
  }
  input.value = "";
  tiktokVideoMessage.textContent = "Video added.";
  renderTikTokVideo();
});

tiktokPrevious.addEventListener("click", () => {
  activeTikTokVideo = (activeTikTokVideo - 1 + tiktokVideos.length) % tiktokVideos.length;
  renderTikTokVideo();
});

tiktokNext.addEventListener("click", () => {
  activeTikTokVideo = (activeTikTokVideo + 1) % tiktokVideos.length;
  renderTikTokVideo();
});

document.getElementById("tiktokRemoveVideo").addEventListener("click", () => {
  const removedIndex = activeTikTokVideo;
  const [removedVideo] = tiktokVideos.splice(removedIndex, 1);
  activeTikTokVideo = Math.max(0, activeTikTokVideo - 1);
  if (!saveTikTokVideos()) {
    tiktokVideos.splice(removedIndex, 0, removedVideo);
    activeTikTokVideo = removedIndex;
    renderTikTokVideo();
    return;
  }
  tiktokVideoMessage.textContent = "Video removed.";
  renderTikTokVideo();
});

renderTikTokVideo();

// MOBILE NAVIGATION
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
const tabLinks = Array.from(mainNav.querySelectorAll('[role="tab"]'));
const mobileTabLinks = Array.from(document.querySelectorAll(".mobile-tab-link"));
const tabPanels = Array.from(document.querySelectorAll('main > [role="tabpanel"]'));
const homePanel = document.getElementById("home");
const dashboardPanelIds = new Set([homePanel, ...tabPanels].map(panel => panel.id));

function activateTab(tabId) {
  const activePanel =
    tabPanels.find(panel => panel.id === tabId) ||
    homePanel;

  if (activePanel.id !== "games") closeGame();

  tabPanels.forEach(panel => {
    panel.hidden = panel !== activePanel;
  });
  homePanel.hidden = activePanel !== homePanel;

  tabLinks.forEach(link => {
    const selected = link.hash === `#${activePanel.id}`;
    link.setAttribute("aria-selected", String(selected));
    link.tabIndex = selected ? 0 : -1;
  });
  mobileTabLinks.forEach(link => {
    const selected = link.hash === `#${activePanel.id}` ||
      (link.hash === "#more-apps" && !["home", "games", "chat", "music"].includes(activePanel.id));
    if (selected) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
  if (window.matchMedia("(max-width: 600px)").matches) {
    window.scrollTo(0, 0);
  }
  updateFeaturedRotation();
}

activateTab(window.location.hash.slice(1) || "home");

window.addEventListener("hashchange", () => {
  activateTab(window.location.hash.slice(1) || "home");
});

window.addEventListener("popstate", () => {
  activateTab(window.location.hash.slice(1) || "home");
});

document.addEventListener("visibilitychange", updateFeaturedRotation);

tabLinks.forEach((link, index) => {
  link.addEventListener("keydown", event => {
    let nextIndex;

    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % tabLinks.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + tabLinks.length) % tabLinks.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabLinks.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    tabLinks[nextIndex].focus();
    tabLinks[nextIndex].click();
  });
});

function closeNavigationMenu() {
  mainNav.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation menu");
}

menuToggle.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
});

document.querySelectorAll('a[href^="#"]').forEach(link => {
  if (!dashboardPanelIds.has(link.hash.slice(1))) return;
  link.addEventListener("click", event => {
    if (window.matchMedia("(max-width: 600px)").matches) {
      event.preventDefault();
      if (window.location.hash !== link.hash) {
        window.history.pushState(null, "", link.hash);
      }
      activateTab(link.hash.slice(1));
    }
    if (mainNav.contains(link) || mobileTabLinks.includes(link) || link.closest(".mobile-extra-links")) {
      closeNavigationMenu();
    }
  });
});

// INITIALIZE
document.getElementById("todayLabel").textContent =
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric"
  }).format(new Date());

updateProgress();