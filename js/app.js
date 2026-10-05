/**
 * app.js - Main Application Controller for MCQ Practice
 * Coordinates UI views, OCR interaction, IndexedDB storage, and Quiz Engine.
 */

document.addEventListener('DOMContentLoaded', () => {
  // ================= State Management =================
  const state = {
    currentView: 'home',
    questions: [],
    
    // Upload & Add Question State
    currentImageSource: null,
    currentImageDataUrl: null,
    
    // Quiz Session State
    quiz: {
      activeQuestions: [],
      currentIndex: 0,
      userAnswers: {}, // index -> 'A' | 'B' | 'C' | 'D'
      order: 'sequential',
      countSetting: 'all',
      isCompleted: false
    },

    // Modal state
    pendingDeleteId: null
  };

  // ================= DOM Elements =================
  const dom = {
    // Navigation
    navBtns: document.querySelectorAll('.nav-btn, .mobile-nav-btn'),
    navBrand: document.getElementById('nav-brand-btn'),
    themeToggle: document.getElementById('theme-toggle-btn'),
    sunIcon: document.getElementById('theme-icon-sun'),
    moonIcon: document.getElementById('theme-icon-moon'),

    // Views
    views: {
      'home': document.getElementById('view-home'),
      'add': document.getElementById('view-add'),
      'practice-settings': document.getElementById('view-practice-settings'),
      'practice-active': document.getElementById('view-practice-active'),
      'practice-result': document.getElementById('view-practice-result')
    },

    // Home View
    homeTotalCount: document.getElementById('home-total-count'),
    homeListCountBadge: document.getElementById('home-list-count-badge'),
    homeBtnAdd: document.getElementById('home-btn-add'),
    homeBtnPractice: document.getElementById('home-btn-practice'),
    questionList: document.getElementById('question-list'),
    emptyState: document.getElementById('questions-empty-state'),
    btnDemoSamples: document.getElementById('btn-demo-samples'),
    btnEmptyAdd: document.getElementById('btn-empty-add'),

    // Add View
    btnBackToHome: document.getElementById('btn-back-to-home'),
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('file-input'),
    browseBtn: document.getElementById('browse-btn'),
    dropzonePrompt: document.getElementById('dropzone-prompt'),
    previewWrapper: document.getElementById('preview-wrapper'),
    imagePreview: document.getElementById('image-preview'),
    btnChangeImage: document.getElementById('btn-change-image'),
    btnExtract: document.getElementById('btn-extract'),
    btnSkipToManual: document.getElementById('btn-skip-to-manual'),
    ocrProgressBox: document.getElementById('ocr-progress-box'),
    ocrStatusLabel: document.getElementById('ocr-status-label'),
    ocrProgressPercent: document.getElementById('ocr-progress-percent'),
    ocrProgressFill: document.getElementById('ocr-progress-fill'),
    saveSuccessBanner: document.getElementById('save-success-banner'),
    btnAddAnother: document.getElementById('btn-add-another'),
    btnSuccessGoPractice: document.getElementById('btn-success-go-practice'),
    btnViewOrigShot: document.getElementById('btn-view-orig-shot'),
    addForm: document.getElementById('add-question-form'),
    formQuestion: document.getElementById('form-question'),
    formOptA: document.getElementById('form-option-a'),
    formOptB: document.getElementById('form-option-b'),
    formOptC: document.getElementById('form-option-c'),
    formOptD: document.getElementById('form-option-d'),
    formCorrectAnswer: document.getElementById('form-correct-answer'),

    // Practice Settings View
    btnSettingsBack: document.getElementById('btn-settings-back-to-home'),
    settingsCountPills: document.querySelectorAll('#settings-count-group .pill-choice'),
    settingsAllCount: document.getElementById('settings-all-count'),
    orderRadios: document.querySelectorAll('input[name="quiz-order"]'),
    btnStartPractice: document.getElementById('btn-start-practice'),
    settingsNoQuestionsWarn: document.getElementById('settings-no-questions-warn'),

    // Active Quiz View
    btnExitQuiz: document.getElementById('btn-exit-quiz'),
    quizCounter: document.getElementById('quiz-question-counter'),
    quizAnsweredStatus: document.getElementById('quiz-answered-status'),
    quizProgressBar: document.getElementById('quiz-progress-bar'),
    quizShotContainer: document.getElementById('quiz-shot-container'),
    quizViewShotBtn: document.getElementById('quiz-view-shot-btn'),
    quizQuestionText: document.getElementById('quiz-question-text'),
    quizOptionsContainer: document.getElementById('quiz-options-container'),
    btnQuizPrev: document.getElementById('btn-quiz-prev'),
    btnQuizNext: document.getElementById('btn-quiz-next'),
    quizPaginationGrid: document.getElementById('quiz-pagination-grid'),

    // Result View
    resultNumerator: document.getElementById('result-score-numerator'),
    resultDenominator: document.getElementById('result-score-denominator'),
    resultPercent: document.getElementById('result-score-percent'),
    resultCorrectCount: document.getElementById('result-correct-count'),
    resultWrongCount: document.getElementById('result-wrong-count'),
    resultSkippedCount: document.getElementById('result-skipped-count'),
    pillSkippedWrap: document.getElementById('pill-skipped-wrap'),
    btnPracticeAgain: document.getElementById('btn-practice-again'),
    btnResultHome: document.getElementById('btn-result-home'),
    reviewQuestionsList: document.getElementById('review-questions-list'),

    // Modals
    screenshotModal: document.getElementById('screenshot-modal'),
    modalScreenshotImg: document.getElementById('modal-screenshot-img'),
    btnCloseShotModal: document.getElementById('btn-close-shot-modal'),

    editModal: document.getElementById('edit-question-modal'),
    btnCloseEditModal: document.getElementById('btn-close-edit-modal'),
    modalEditForm: document.getElementById('modal-edit-form'),
    modalEditId: document.getElementById('modal-edit-id'),
    modalEditQuestion: document.getElementById('modal-edit-question'),
    modalEditOptA: document.getElementById('modal-edit-opt-a'),
    modalEditOptB: document.getElementById('modal-edit-opt-b'),
    modalEditOptC: document.getElementById('modal-edit-opt-c'),
    modalEditOptD: document.getElementById('modal-edit-opt-d'),
    modalEditCorrect: document.getElementById('modal-edit-correct'),
    modalShotPreviewArea: document.getElementById('modal-shot-preview-area'),
    modalEditShotPreview: document.getElementById('modal-edit-shot-preview'),

    deleteModal: document.getElementById('delete-modal'),
    btnCloseDeleteModal: document.getElementById('btn-close-delete-modal'),
    btnCancelDelete: document.getElementById('btn-cancel-delete'),
    btnConfirmDelete: document.getElementById('btn-confirm-delete'),

    toast: document.getElementById('toast')
  };

  // ================= Notification Toast =================
  let toastTimeout = null;
  function showToast(message) {
    if (toastTimeout) clearTimeout(toastTimeout);
    dom.toast.textContent = message;
    dom.toast.classList.remove('hidden');
    toastTimeout = setTimeout(() => {
      dom.toast.classList.add('hidden');
    }, 2500);
  }

  // ================= Theme Management =================
  function initTheme() {
    const savedTheme = localStorage.getItem('mcq_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    applyTheme(theme);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mcq_theme', theme);
    if (theme === 'dark') {
      dom.sunIcon.classList.remove('hidden');
      dom.moonIcon.classList.add('hidden');
    } else {
      dom.sunIcon.classList.add('hidden');
      dom.moonIcon.classList.remove('hidden');
    }
  }

  dom.themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  // ================= View Navigation =================
  function switchView(viewName) {
    // Hide all views
    Object.values(dom.views).forEach(el => el.classList.remove('active'));

    // Update active view
    if (dom.views[viewName]) {
      dom.views[viewName].classList.add('active');
      state.currentView = viewName;
      window.scrollTo(0, 0);
    }

    // Update active nav button state
    dom.navBtns.forEach(btn => {
      const target = btn.getAttribute('data-view');
      if (target === viewName || (viewName.startsWith('practice') && target === 'practice-settings')) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Refresh view specific state
    if (viewName === 'home') {
      loadAndRenderQuestions();
    } else if (viewName === 'practice-settings') {
      updateSettingsView();
    }
  }

  // Bind top navbar & bottom bar buttons
  dom.navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view');
      switchView(view);
    });
  });

  dom.navBrand.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('home');
  });

  dom.homeBtnAdd.addEventListener('click', () => switchView('add'));
  dom.btnEmptyAdd.addEventListener('click', () => switchView('add'));
  dom.btnBackToHome.addEventListener('click', () => switchView('home'));
  dom.btnSettingsBack.addEventListener('click', () => switchView('home'));
  dom.btnResultHome.addEventListener('click', () => switchView('home'));

  dom.homeBtnPractice.addEventListener('click', () => {
    if (state.questions.length === 0) {
      showToast('Please add at least 1 question first!');
      switchView('add');
      return;
    }
    switchView('practice-settings');
  });

  dom.btnSuccessGoPractice.addEventListener('click', () => {
    switchView('practice-settings');
  });

  // ================= Data Loading & Rendering (Home & List) =================
  async function loadAndRenderQuestions() {
    try {
      state.questions = await window.mcqDB.getAllQuestions();
      renderHomeStats();
      renderQuestionList();
    } catch (err) {
      console.error('Failed to load questions:', err);
    }
  }

  function renderHomeStats() {
    const count = state.questions.length;
    dom.homeTotalCount.textContent = count;
    dom.homeListCountBadge.textContent = `${count} Question${count === 1 ? '' : 's'} Added`;
    dom.settingsAllCount.textContent = count;
  }

  function renderQuestionList() {
    dom.questionList.innerHTML = '';

    if (state.questions.length === 0) {
      dom.emptyState.classList.remove('hidden');
      return;
    }

    dom.emptyState.classList.add('hidden');

    state.questions.forEach((q, index) => {
      const card = document.createElement('div');
      card.className = 'question-card-item';
      
      const qNum = state.questions.length - index; // Display 1-based number
      
      card.innerHTML = `
        <div class="item-header">
          <span class="item-index">Question ${qNum}</span>
          <div class="item-actions">
            <button class="item-action-btn item-btn-edit" data-id="${q.id}">Edit</button>
            <span style="color: var(--border-color)">|</span>
            <button class="item-action-btn item-btn-delete" data-id="${q.id}">Delete</button>
          </div>
        </div>

        <p class="item-question-text">${escapeHtml(q.question)}</p>

        <div class="item-options-preview">
          <div class="item-option-row ${q.correctAnswer === 'A' ? 'is-correct' : ''}">
            <span class="item-opt-letter">A.</span> <span>${escapeHtml(q.options?.A || '')}</span>
          </div>
          <div class="item-option-row ${q.correctAnswer === 'B' ? 'is-correct' : ''}">
            <span class="item-opt-letter">B.</span> <span>${escapeHtml(q.options?.B || '')}</span>
          </div>
          <div class="item-option-row ${q.correctAnswer === 'C' ? 'is-correct' : ''}">
            <span class="item-opt-letter">C.</span> <span>${escapeHtml(q.options?.C || '')}</span>
          </div>
          <div class="item-option-row ${q.correctAnswer === 'D' ? 'is-correct' : ''}">
            <span class="item-opt-letter">D.</span> <span>${escapeHtml(q.options?.D || '')}</span>
          </div>
        </div>

        ${q.screenshot ? `
          <div class="item-footer-meta">
            <span class="item-screenshot-badge" data-shot="${q.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              <span>View Original Screenshot</span>
            </span>
          </div>
        ` : ''}
      `;

      // Event listeners for Edit, Delete, View Screenshot
      card.querySelector('.item-btn-edit').addEventListener('click', () => openEditModal(q.id));
      card.querySelector('.item-btn-delete').addEventListener('click', () => promptDeleteQuestion(q.id));

      const shotBadge = card.querySelector('.item-screenshot-badge');
      if (shotBadge) {
        shotBadge.addEventListener('click', () => openScreenshotModal(q.screenshot));
      }

      dom.questionList.appendChild(card);
    });
  }

  // Load Sample Demo Questions
  dom.btnDemoSamples.addEventListener('click', async () => {
    await window.mcqDB.seedSampleQuestions();
    showToast('Loaded 3 sample questions!');
    await loadAndRenderQuestions();
  });

  // ================= Add Question / Upload / OCR =================
  // Browse Trigger
  dom.browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dom.fileInput.click();
  });

  dom.dropzone.addEventListener('click', () => {
    if (!state.currentImageDataUrl) {
      dom.fileInput.click();
    }
  });

  // Drag and Drop
  dom.dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dom.dropzone.classList.add('dragover');
  });

  dom.dropzone.addEventListener('dragleave', () => {
    dom.dropzone.classList.remove('dragover');
  });

  dom.dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dom.dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  // File Input Changed
  dom.fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  });

  // Clipboard Paste Support (Ctrl+V) anywhere on Add screen
  window.addEventListener('paste', (e) => {
    if (state.currentView !== 'add') return;
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          handleFileSelected(blob);
          showToast('Screenshot pasted from clipboard!');
          break;
        }
      }
    }
  });

  function handleFileSelected(file) {
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file');
      return;
    }

    state.currentImageSource = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      state.currentImageDataUrl = e.target.result;
      showImagePreview(state.currentImageDataUrl);
      dom.btnExtract.disabled = false;
      dom.btnViewOrigShot.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }

  function showImagePreview(dataUrl) {
    dom.imagePreview.src = dataUrl;
    dom.previewWrapper.classList.remove('hidden');
    dom.dropzonePrompt.classList.add('hidden');
  }

  dom.btnChangeImage.addEventListener('click', (e) => {
    e.stopPropagation();
    resetUploadState();
    dom.fileInput.click();
  });

  function resetUploadState() {
    state.currentImageSource = null;
    state.currentImageDataUrl = null;
    dom.fileInput.value = '';
    dom.imagePreview.src = '';
    dom.previewWrapper.classList.add('hidden');
    dom.dropzonePrompt.classList.remove('hidden');
    dom.btnExtract.disabled = true;
    dom.ocrProgressBox.classList.add('hidden');
    dom.btnViewOrigShot.classList.add('hidden');
  }

  dom.btnViewOrigShot.addEventListener('click', () => {
    if (state.currentImageDataUrl) {
      openScreenshotModal(state.currentImageDataUrl);
    }
  });

  // Skip directly to manual entry
  dom.btnSkipToManual.addEventListener('click', () => {
    dom.formQuestion.focus();
    dom.formQuestion.scrollIntoView({ behavior: 'smooth' });
  });

  // Extract Question (OCR)
  dom.btnExtract.addEventListener('click', async () => {
    if (!state.currentImageDataUrl) return;

    dom.btnExtract.disabled = true;
    dom.ocrProgressBox.classList.remove('hidden');
    dom.ocrStatusLabel.textContent = 'Processing screenshot...';
    dom.ocrProgressPercent.textContent = '0%';
    dom.ocrProgressFill.style.width = '0%';

    try {
      const result = await window.MCQ_OCR.extractText(state.currentImageDataUrl, (prog) => {
        dom.ocrStatusLabel.textContent = prog.status;
        const pct = Math.round(prog.progress * 100);
        dom.ocrProgressPercent.textContent = `${pct}%`;
        dom.ocrProgressFill.style.width = `${pct}%`;
      });

      // Populate Editable Form
      const { question, options, detectedAnswer } = result.parsed;
      dom.formQuestion.value = question || '';
      dom.formOptA.value = options.A || '';
      dom.formOptB.value = options.B || '';
      dom.formOptC.value = options.C || '';
      dom.formOptD.value = options.D || '';
      
      if (detectedAnswer && ['A', 'B', 'C', 'D'].includes(detectedAnswer)) {
        dom.formCorrectAnswer.value = detectedAnswer;
      }

      showToast('Question extracted! Review & edit below.');
      
      // Smooth scroll to edit form
      dom.formQuestion.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
      console.error('OCR Error:', err);
      showToast('Could not extract text automatically. Please enter manually.');
    } finally {
      dom.ocrProgressBox.classList.add('hidden');
      dom.btnExtract.disabled = false;
    }
  });

  // Save Question Form Submission
  dom.addForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const question = dom.formQuestion.value.trim();
    const optA = dom.formOptA.value.trim();
    const optB = dom.formOptB.value.trim();
    const optC = dom.formOptC.value.trim();
    const optD = dom.formOptD.value.trim();
    const correctAnswer = dom.formCorrectAnswer.value;

    if (!question || !optA || !optB || !optC || !optD) {
      showToast('Please fill in the question and all 4 options');
      return;
    }

    if (!correctAnswer) {
      showToast('Please select the correct answer');
      return;
    }

    const questionData = {
      question,
      options: { A: optA, B: optB, C: optC, D: optD },
      correctAnswer,
      screenshot: state.currentImageDataUrl || null
    };

    try {
      await window.mcqDB.addQuestion(questionData);
      await loadAndRenderQuestions();

      // Show Success Banner (Step 3)
      dom.saveSuccessBanner.classList.remove('hidden');
      dom.saveSuccessBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast('✓ Question Added');

      // Clear Form Fields
      dom.addForm.reset();
      dom.formCorrectAnswer.value = '';
    } catch (err) {
      console.error('Failed to save question:', err);
      showToast('Error saving question: ' + err.message);
    }
  });

  // "+ Add Another Question" Fast Flow
  dom.btnAddAnother.addEventListener('click', () => {
    dom.saveSuccessBanner.classList.add('hidden');
    resetUploadState();
    dom.addForm.reset();
    dom.formCorrectAnswer.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Ready for next question!');
  });

  // ================= 6. Quiz Settings =================
  function updateSettingsView() {
    const total = state.questions.length;
    dom.settingsAllCount.textContent = total;

    if (total === 0) {
      dom.btnStartPractice.disabled = true;
      dom.settingsNoQuestionsWarn.classList.remove('hidden');
    } else {
      dom.btnStartPractice.disabled = false;
      dom.settingsNoQuestionsWarn.classList.add('hidden');
    }
  }

  // Pill selection for question count (5, 10, 20, All)
  dom.settingsCountPills.forEach(pill => {
    pill.addEventListener('click', () => {
      dom.settingsCountPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.quiz.countSetting = pill.getAttribute('data-count');
    });
  });

  // Start Practice Button
  dom.btnStartPractice.addEventListener('click', () => {
    if (state.questions.length === 0) {
      showToast('No questions available to practice!');
      return;
    }

    // Determine order
    let selectedOrder = 'sequential';
    dom.orderRadios.forEach(radio => {
      if (radio.checked) selectedOrder = radio.value;
    });
    state.quiz.order = selectedOrder;

    // Clone questions
    let pool = [...state.questions];

    // Apply Randomization if chosen
    if (selectedOrder === 'random') {
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
    } else {
      // Sequential: practiced in the original chronological order added
      pool.reverse();
    }

    // Determine number of questions
    let count = pool.length;
    if (state.quiz.countSetting !== 'all') {
      count = Math.min(parseInt(state.quiz.countSetting, 10), pool.length);
    }
    state.quiz.activeQuestions = pool.slice(0, count);

    // Reset quiz tracking
    state.quiz.currentIndex = 0;
    state.quiz.userAnswers = {};
    state.quiz.isCompleted = false;

    // Launch active quiz
    switchView('practice-active');
    renderActiveQuizQuestion();
  });

  // ================= 5 & 7. Active Practice Engine =================
  function renderActiveQuizQuestion() {
    const currentQ = state.quiz.activeQuestions[state.quiz.currentIndex];
    const totalQ = state.quiz.activeQuestions.length;
    const currentIdx = state.quiz.currentIndex;

    // Header counter: "Question 1 / 25"
    dom.quizCounter.textContent = `Question ${currentIdx + 1} / ${totalQ}`;
    
    // Answered status
    const answeredCount = Object.keys(state.quiz.userAnswers).length;
    dom.quizAnsweredStatus.textContent = `${answeredCount} of ${totalQ} answered`;

    // Progress bar
    const progressPercent = ((currentIdx + 1) / totalQ) * 100;
    dom.quizProgressBar.style.width = `${progressPercent}%`;

    // Attached screenshot preview button
    if (currentQ.screenshot) {
      dom.quizShotContainer.classList.remove('hidden');
      dom.quizViewShotBtn.onclick = () => openScreenshotModal(currentQ.screenshot);
    } else {
      dom.quizShotContainer.classList.add('hidden');
    }

    // Question Text
    dom.quizQuestionText.textContent = currentQ.question;

    // Render Options A, B, C, D (touch-friendly radio pills)
    dom.quizOptionsContainer.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D'];
    const currentSelected = state.quiz.userAnswers[currentIdx];

    letters.forEach(letter => {
      const optText = currentQ.options?.[letter] || '';
      const isSelected = currentSelected === letter;

      const optBtn = document.createElement('div');
      optBtn.className = `quiz-opt-btn ${isSelected ? 'selected' : ''}`;
      optBtn.setAttribute('data-option', letter);
      optBtn.innerHTML = `
        <div class="quiz-opt-circle">${isSelected ? '●' : '○'}</div>
        <div class="quiz-opt-text"><strong>${letter}.</strong> ${escapeHtml(optText)}</div>
      `;

      optBtn.addEventListener('click', () => {
        // Record user answer
        state.quiz.userAnswers[currentIdx] = letter;
        // Do NOT reveal answer yet, just update selected visual
        renderActiveQuizQuestion();
      });

      dom.quizOptionsContainer.appendChild(optBtn);
    });

    // Prev / Next button states
    dom.btnQuizPrev.disabled = currentIdx === 0;

    if (currentIdx === totalQ - 1) {
      dom.btnQuizNext.innerHTML = `
        <span>Finish Quiz</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
      `;
    } else {
      dom.btnQuizNext.innerHTML = `
        <span>Next</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
      `;
    }

    // Render Bottom Pagination (1 2 3 4 5...)
    renderQuizPagination();
  }

  function renderQuizPagination() {
    dom.quizPaginationGrid.innerHTML = '';
    const totalQ = state.quiz.activeQuestions.length;

    for (let i = 0; i < totalQ; i++) {
      const bubble = document.createElement('button');
      bubble.type = 'button';
      bubble.className = 'pag-bubble';
      bubble.textContent = i + 1;

      if (i === state.quiz.currentIndex) {
        bubble.classList.add('current');
      }

      if (state.quiz.userAnswers[i] !== undefined) {
        bubble.classList.add('answered');
      }

      bubble.addEventListener('click', () => {
        state.quiz.currentIndex = i;
        renderActiveQuizQuestion();
      });

      dom.quizPaginationGrid.appendChild(bubble);
    }
  }

  // Prev / Next Button Actions
  dom.btnQuizPrev.addEventListener('click', () => {
    if (state.quiz.currentIndex > 0) {
      state.quiz.currentIndex--;
      renderActiveQuizQuestion();
    }
  });

  dom.btnQuizNext.addEventListener('click', () => {
    const totalQ = state.quiz.activeQuestions.length;
    if (state.quiz.currentIndex < totalQ - 1) {
      state.quiz.currentIndex++;
      renderActiveQuizQuestion();
    } else {
      // Completed Quiz!
      finishQuiz();
    }
  });

  dom.btnExitQuiz.addEventListener('click', () => {
    if (confirm('Are you sure you want to exit? Your practice progress will be lost.')) {
      switchView('home');
    }
  });

  // ================= 8 & 9. Final Results & Review =================
  function finishQuiz() {
    state.quiz.isCompleted = true;
    const questions = state.quiz.activeQuestions;
    const totalQ = questions.length;
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;

    questions.forEach((q, idx) => {
      const userPick = state.quiz.userAnswers[idx];
      if (!userPick) {
        skippedCount++;
      } else if (userPick === q.correctAnswer) {
        correctCount++;
      } else {
        wrongCount++;
      }
    });

    const percent = Math.round((correctCount / totalQ) * 100);

    // Update Result View Elements
    dom.resultNumerator.textContent = correctCount;
    dom.resultDenominator.textContent = totalQ;
    dom.resultPercent.textContent = `${percent}%`;
    dom.resultCorrectCount.textContent = correctCount;
    dom.resultWrongCount.textContent = wrongCount;
    dom.resultSkippedCount.textContent = skippedCount;

    if (skippedCount === 0) {
      dom.pillSkippedWrap.classList.add('hidden');
    } else {
      dom.pillSkippedWrap.classList.remove('hidden');
    }

    // Render Detailed Answer Review
    renderAnswerReview(questions);

    // Switch to Result View
    switchView('practice-result');
  }

  function renderAnswerReview(questions) {
    dom.reviewQuestionsList.innerHTML = '';

    questions.forEach((q, idx) => {
      const userPick = state.quiz.userAnswers[idx];
      const isCorrect = userPick === q.correctAnswer;
      const isSkipped = !userPick;

      const reviewCard = document.createElement('div');
      reviewCard.className = 'review-card';

      let statusBadge = '';
      if (isSkipped) {
        statusBadge = `<span class="review-badge skipped">○ Skipped</span>`;
      } else if (isCorrect) {
        statusBadge = `<span class="review-badge correct">✓ Correct</span>`;
      } else {
        statusBadge = `<span class="review-badge wrong">✕ Wrong</span>`;
      }

      const letters = ['A', 'B', 'C', 'D'];
      const optionsHtml = letters.map(letter => {
        const isUserPick = userPick === letter;
        const isAnswer = q.correctAnswer === letter;
        
        let rowClass = 'review-opt-row';
        if (isAnswer) rowClass += ' is-correct-answer';
        if (isUserPick && !isCorrect) rowClass += ' is-user-pick is-wrong';

        let badge = '';
        if (isAnswer) {
          badge = `<span class="review-indicator-badge correct-pick">Correct Answer</span>`;
        } else if (isUserPick) {
          badge = `<span class="review-indicator-badge user-pick">Your Pick</span>`;
        }

        return `
          <div class="${rowClass}">
            <div class="review-opt-left">
              <strong>${letter}.</strong>
              <span>${escapeHtml(q.options?.[letter] || '')}</span>
            </div>
            ${badge}
          </div>
        `;
      }).join('');

      reviewCard.innerHTML = `
        <div class="review-card-top">
          <span class="item-index">Question ${idx + 1}</span>
          ${statusBadge}
        </div>
        <h4 class="review-question-title">${escapeHtml(q.question)}</h4>
        <div class="review-options-list">
          ${optionsHtml}
        </div>
        <div class="review-summary-row">
          <span>Your Answer: <strong>${userPick ? `Option ${userPick}` : 'None'}</strong></span>
          <span>Correct Answer: <strong>Option ${q.correctAnswer}</strong></span>
          ${q.screenshot ? `<button type="button" class="btn btn-text btn-xs review-shot-btn">View Screenshot</button>` : ''}
        </div>
      `;

      if (q.screenshot) {
        const shotBtn = reviewCard.querySelector('.review-shot-btn');
        if (shotBtn) {
          shotBtn.addEventListener('click', () => openScreenshotModal(q.screenshot));
        }
      }

      dom.reviewQuestionsList.appendChild(reviewCard);
    });
  }

  // Practice Again (Restart with same questions / unlimited times)
  dom.btnPracticeAgain.addEventListener('click', () => {
    switchView('practice-settings');
  });

  // ================= Modals: Screenshot Viewer =================
  function openScreenshotModal(imgSrc) {
    if (!imgSrc) return;
    dom.modalScreenshotImg.src = imgSrc;
    dom.screenshotModal.classList.remove('hidden');
  }

  dom.btnCloseShotModal.addEventListener('click', () => {
    dom.screenshotModal.classList.add('hidden');
    dom.modalScreenshotImg.src = '';
  });

  dom.screenshotModal.addEventListener('click', (e) => {
    if (e.target === dom.screenshotModal) {
      dom.screenshotModal.classList.add('hidden');
    }
  });

  // ================= Modals: Edit Question =================
  async function openEditModal(id) {
    const q = await window.mcqDB.getQuestion(id);
    if (!q) return;

    dom.modalEditId.value = q.id;
    dom.modalEditQuestion.value = q.question;
    dom.modalEditOptA.value = q.options?.A || '';
    dom.modalEditOptB.value = q.options?.B || '';
    dom.modalEditOptC.value = q.options?.C || '';
    dom.modalEditOptD.value = q.options?.D || '';
    dom.modalEditCorrect.value = q.correctAnswer || 'A';

    if (q.screenshot) {
      dom.modalEditShotPreview.src = q.screenshot;
      dom.modalShotPreviewArea.classList.remove('hidden');
    } else {
      dom.modalShotPreviewArea.classList.add('hidden');
    }

    dom.editModal.classList.remove('hidden');
  }

  dom.btnCloseEditModal.addEventListener('click', () => {
    dom.editModal.classList.add('hidden');
  });

  dom.editModal.addEventListener('click', (e) => {
    if (e.target === dom.editModal) {
      dom.editModal.classList.add('hidden');
    }
  });

  dom.modalEditForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = dom.modalEditId.value;
    const updated = {
      id,
      question: dom.modalEditQuestion.value.trim(),
      options: {
        A: dom.modalEditOptA.value.trim(),
        B: dom.modalEditOptB.value.trim(),
        C: dom.modalEditOptC.value.trim(),
        D: dom.modalEditOptD.value.trim()
      },
      correctAnswer: dom.modalEditCorrect.value
    };

    try {
      await window.mcqDB.updateQuestion(updated);
      dom.editModal.classList.add('hidden');
      showToast('Question updated successfully');
      await loadAndRenderQuestions();
    } catch (err) {
      showToast('Failed to update: ' + err.message);
    }
  });

  // ================= Modals: Delete Question =================
  function promptDeleteQuestion(id) {
    state.pendingDeleteId = id;
    dom.deleteModal.classList.remove('hidden');
  }

  dom.btnCancelDelete.addEventListener('click', () => {
    state.pendingDeleteId = null;
    dom.deleteModal.classList.add('hidden');
  });

  dom.btnCloseDeleteModal.addEventListener('click', () => {
    state.pendingDeleteId = null;
    dom.deleteModal.classList.add('hidden');
  });

  dom.deleteModal.addEventListener('click', (e) => {
    if (e.target === dom.deleteModal) {
      state.pendingDeleteId = null;
      dom.deleteModal.classList.add('hidden');
    }
  });

  dom.btnConfirmDelete.addEventListener('click', async () => {
    if (state.pendingDeleteId) {
      try {
        await window.mcqDB.deleteQuestion(state.pendingDeleteId);
        state.pendingDeleteId = null;
        dom.deleteModal.classList.add('hidden');
        showToast('Question deleted');
        await loadAndRenderQuestions();
      } catch (err) {
        showToast('Failed to delete: ' + err.message);
      }
    }
  });

  // ================= Utility: HTML Escaping =================
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ================= Initialization =================
  initTheme();
  loadAndRenderQuestions();
});
