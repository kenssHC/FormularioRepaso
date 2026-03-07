/* ============================================================
   app.js — Lógica completa del formulario de preguntas
   ============================================================ */

/* ----------------------------------------------------------
   CONFIGURACIÓN DE SESIONES
   ---------------------------------------------------------- */
const SESSIONS = [
  { id: 2,  file: 'Preguntas/sesion2.json',  label: 'Sesión 2' },
  { id: 3,  file: 'Preguntas/sesion3.json',  label: 'Sesión 3' },
  { id: 4,  file: 'Preguntas/sesion4.json',  label: 'Sesión 4' },
  { id: 5,  file: 'Preguntas/sesion5.json',  label: 'Sesión 5' },
  { id: 6,  file: 'Preguntas/sesion6.json',  label: 'Sesión 6' },
  { id: 7,  file: 'Preguntas/sesion7.json',  label: 'Sesión 7' },
  { id: 8,  file: 'Preguntas/sesion8.json',  label: 'Sesión 8' },
  { id: 9,  file: 'Preguntas/sesion9.json',  label: 'Sesión 9' },
  { id: 10, file: 'Preguntas/sesion10.json', label: 'Sesión 10' },
  { id: 11, file: 'Preguntas/sesion11.json', label: 'Sesión 11' },
  { id: 12, file: 'Preguntas/sesion12.json', label: 'Sesión 12' },
];

/* ----------------------------------------------------------
   ESTADO DEL QUIZ (en sessionStorage para sobrevivir nav.)
   ---------------------------------------------------------- */
function saveState(state) {
  sessionStorage.setItem('quizState', JSON.stringify(state));
}

function loadState() {
  try {
    const raw = sessionStorage.getItem('quizState');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/* ----------------------------------------------------------
   INDEX — Renderiza la grilla de sesiones
   ---------------------------------------------------------- */
async function renderSessionGrid() {
  const grid = document.getElementById('sessionGrid');
  if (!grid) return;

  for (const session of SESSIONS) {
    let questionCount = '?';
    let titulo = session.label;

    try {
      const res = await fetch(session.file);
      const data = await res.json();
      titulo = data.titulo ?? session.label;
      questionCount = Array.isArray(data.preguntas) ? data.preguntas.length : '?';
    } catch {
      /* Si falla la carga, se muestra igual con datos por defecto */
    }

    const card = document.createElement('a');
    card.className = 'session-card';
    card.href = `quiz.html?sesion=${session.id}`;
    card.innerHTML = `
      <span class="session-card__number">${session.label}</span>
      <span class="session-card__title">${titulo}</span>
      <span class="session-card__count">${questionCount} preguntas</span>
    `;
    grid.appendChild(card);
  }
}

/* ----------------------------------------------------------
   QUIZ — Inicializa el quiz según ?sesion=N en la URL
   ---------------------------------------------------------- */
async function initQuiz() {
  const params = new URLSearchParams(window.location.search);
  const sesionId = parseInt(params.get('sesion'), 10);

  const session = SESSIONS.find(s => s.id === sesionId);
  if (!session) {
    window.location.href = 'index.html';
    return;
  }

  let data;
  try {
    const res = await fetch(session.file);
    data = await res.json();
  } catch {
    alert('No se pudo cargar la sesión. Vuelve al inicio.');
    window.location.href = 'index.html';
    return;
  }

  const preguntas = data.preguntas ?? [];
  if (preguntas.length === 0) {
    alert('Esta sesión no tiene preguntas.');
    window.location.href = 'index.html';
    return;
  }

  const state = {
    sesionId,
    titulo: data.titulo ?? session.label,
    preguntas,
    currentIndex: 0,
    answers: [],        // { questionId, selectedId, correct }
    correctCount: 0,
  };

  saveState(state);
  renderQuestion(state);
}

/* ----------------------------------------------------------
   QUIZ — Renderiza la pregunta actual
   ---------------------------------------------------------- */
function renderQuestion(state) {
  const { preguntas, currentIndex, titulo } = state;
  const total = preguntas.length;
  const pregunta = preguntas[currentIndex];

  /* Encabezado */
  document.getElementById('quizTitle').textContent = titulo;
  document.getElementById('progressText').textContent =
    `Pregunta ${currentIndex + 1} de ${total}`;
  document.getElementById('progressBar').style.width =
    `${((currentIndex) / total) * 100}%`;
  document.getElementById('questionNumber').textContent =
    `Pregunta ${currentIndex + 1}`;
  document.getElementById('questionText').textContent = pregunta.pregunta;

  /* Feedback oculto */
  const feedbackBox = document.getElementById('feedbackBox');
  feedbackBox.style.display = 'none';
  feedbackBox.className = 'feedback';

  /* Botones ocultos */
  document.getElementById('nextBtn').style.display = 'none';
  document.getElementById('finishBtn').style.display = 'none';

  /* Alternativas */
  const container = document.getElementById('alternativesContainer');
  container.innerHTML = '';

  pregunta.alternativas.forEach(alt => {
    const btn = document.createElement('button');
    btn.className = 'alternative';
    btn.dataset.id = alt.id;
    btn.innerHTML = `
      <span class="alternative__letter">${alt.id}</span>
      <span class="alternative__text">${alt.texto}</span>
    `;
    btn.addEventListener('click', () => handleAnswer(alt, pregunta, state));
    container.appendChild(btn);
  });
}

/* ----------------------------------------------------------
   QUIZ — Maneja la selección de una alternativa
   ---------------------------------------------------------- */
function handleAnswer(selectedAlt, pregunta, state) {
  /* Deshabilitar todos los botones y marcar solo la seleccionada */
  const allBtns = document.querySelectorAll('.alternative');
  allBtns.forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.id === selectedAlt.id) {
      btn.classList.add(selectedAlt.esCorrecta ? 'alternative--correct' : 'alternative--incorrect');
    }
  });

  /* Feedback */
  const feedbackBox = document.getElementById('feedbackBox');
  const feedbackText = document.getElementById('feedbackText');
  feedbackText.textContent = selectedAlt.retroalimentacion ?? '';
  feedbackBox.className = 'feedback ' + (selectedAlt.esCorrecta ? 'feedback--correct' : 'feedback--incorrect');
  feedbackBox.style.display = 'block';

  /* Guardar respuesta */
  state.answers.push({
    questionId: pregunta.id,
    selectedId: selectedAlt.id,
    correct: selectedAlt.esCorrecta,
  });

  if (selectedAlt.esCorrecta) {
    state.correctCount = (state.correctCount ?? 0) + 1;
  }

  saveState(state);

  /* Mostrar botón siguiente o finalizar */
  const isLast = state.currentIndex === state.preguntas.length - 1;
  if (isLast) {
    document.getElementById('finishBtn').style.display = 'inline-block';
    document.getElementById('finishBtn').onclick = goToResult;
  } else {
    document.getElementById('nextBtn').style.display = 'inline-block';
    document.getElementById('nextBtn').onclick = () => {
      state.currentIndex++;
      saveState(state);
      renderQuestion(state);
    };
  }
}

/* ----------------------------------------------------------
   QUIZ — Navegar a la página de resultado
   ---------------------------------------------------------- */
function goToResult() {
  window.location.href = 'resultado.html';
}

/* ----------------------------------------------------------
   RESULTADO — Renderiza la pantalla de resultado
   ---------------------------------------------------------- */
function renderResult() {
  const state = loadState();
  if (!state) {
    window.location.href = 'index.html';
    return;
  }

  const { correctCount, preguntas, titulo, sesionId } = state;
  const total = preguntas.length;
  const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  document.getElementById('resultSessionTitle').textContent = titulo ?? 'Resultado';
  document.getElementById('resultScore').textContent = `${correctCount} / ${total}`;
  document.getElementById('resultPercent').textContent = `${percent}%`;

  /* Animación de la barra */
  setTimeout(() => {
    document.getElementById('resultBar').style.width = `${percent}%`;
  }, 100);

  /* Emoji y mensaje según porcentaje */
  const { emoji, message } = getResultFeedback(percent);
  document.getElementById('resultEmoji').textContent = emoji;
  document.getElementById('resultMessage').textContent = message;

  /* Botón reintentar */
  document.getElementById('retryBtn').onclick = () => {
    window.location.href = `quiz.html?sesion=${sesionId}`;
  };
}

function getResultFeedback(percent) {
  if (percent === 100) return { emoji: '🏆', message: '¡Perfecto! Respondiste todo correctamente.' };
  if (percent >= 80)  return { emoji: '🎉', message: '¡Excelente resultado! Dominas bien el tema.' };
  if (percent >= 60)  return { emoji: '👍', message: 'Buen desempeño. Sigue repasando.' };
  if (percent >= 40)  return { emoji: '📚', message: 'Hay margen de mejora. ¡Vuelve a intentarlo!' };
  return { emoji: '💪', message: 'No te desanimes, repasa el material e inténtalo de nuevo.' };
}
