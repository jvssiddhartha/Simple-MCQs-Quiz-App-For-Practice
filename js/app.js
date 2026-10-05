/**
 * app.js - Main Application Controller for MCQ Practice
 * Supports Single Answer (Radio) and Multiple Answers (Checkbox) questions.
 * Coordinates UI views, OCR interaction, IndexedDB storage, and Quiz Engine.
 */

document.addEventListener('DOMContentLoaded', () => {
  // ================= State Management =================
  const state = {
    currentView: 'home',
    questions: [],
    
    // Add Question State
    addType: 'single', // 'single' | 'multiple'
    currentImageSource: null,
    currentImageDataUrl: null,
    
    // Quiz Session State
    quiz: {
      activeQuestions: [],
      currentIndex: 0,
      userAnswers: {}, // index -> string ('B') for single, array (['A', 'C']) for multiple
      order: 'sequential',
      countSetting: 'all',
      isCompleted: false
    },

    // Modal state
    modalEditType: 'single',
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
    
    // Add Question Type & Answer Elements
    addTypePills: document.querySelectorAll('#add-type-group .type-pill'),
    addSingleAnswerGroup: document.getElementById('add-single-answer-group'),
    addMultiAnswerGroup: document.getElementById('add-multi-answer-group'),
    formCorrectAnswer: document.getElementById('form-correct-answer'),
    addMultiCheckboxes: document.querySelectorAll('input[name="add-correct-multi"]'),

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
    quizTypeBadge: document.getElementById('quiz-type-badge'),
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

    // Modals: Screenshot
    screenshotModal: document.getElementById('screenshot-modal'),
    modalScreenshotImg: document.getElementById('modal-screenshot-img'),
    btnCloseShotModal: document.getElementById('btn-close-shot-modal'),

    // Modals: Edit Question
    editModal: document.getElementById('edit-question-modal'),
    btnCloseEditModal: document.getElementById('btn-close-edit-modal'),
    modalEditForm: document.getElementById('modal-edit-form'),
    modalEditId: document.getElementById('modal-edit-id'),
    modalEditQuestion: document.getElementById('modal-edit-question'),
    modalEditOptA: document.getElementById('modal-edit-opt-a'),
    modalEditOptB: document.getElementById('modal-edit-opt-b'),
    modalEditOptC: document.getElementById('modal-edit-opt-c'),
    modalEditOptD: document.getElementById('modal-edit-opt-d'),
    modalTypePills: document.querySelectorAll('#modal-type-group .type-pill'),
    modalSingleAnswerGroup: document.getElementById('modal-single-answer-group'),
    modalMultiAnswerGroup: document.getElementById('modal-multi-answer-group'),
    modalEditCorrect: document.getElementById('modal-edit-correct'),
    modalMultiCheckboxes: document.querySelectorAll('input[name="modal-correct-multi"]'),
    modalShotPreviewArea: document.getElementById('modal-shot-preview-area'),
    modalEditShotPreview: document.getElementById('modal-edit-shot-preview'),

    // Modals: Delete
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

  // ================= Question Type Switching =================
  function setAddQuestionType(type) {
    state.addType = type;
    dom.addTypePills.forEach(pill => {
      pill.classList.toggle('active', pill.getAttribute('data-type') === type);
    });

    if (type === 'multiple') {
      dom.addSingleAnswerGroup.classList.add('hidden');
      dom.addMultiAnswerGroup.classList.remove('hidden');
    } else {
      dom.addSingleAnswerGroup.classList.remove('hidden');
      dom.addMultiAnswerGroup.classList.add('hidden');
    }
  }

  dom.addTypePills.forEach(pill => {
    pill.addEventListener('click', () => {
      setAddQuestionType(pill.getAttribute('data-type'));
    });
  });

  function setModalEditQuestionType(type) {
    state.modalEditType = type;
    dom.modalTypePills.forEach(pill => {
      pill.classList.toggle('active', pill.getAttribute('data-type') === type);
    });

    if (type === 'multiple') {
      dom.modalSingleAnswerGroup.classList.add('hidden');
      dom.modalMultiAnswerGroup.classList.remove('hidden');
    } else {
      dom.modalSingleAnswerGroup.classList.remove('hidden');
      dom.modalMultiAnswerGroup.classList.add('hidden');
    }
  }

  dom.modalTypePills.forEach(pill => {
    pill.addEventListener('click', () => {
      setModalEditQuestionType(pill.getAttribute('data-type'));
    });
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
      
      const qNum = state.questions.length - index;
      const isMulti = q.type === 'multiple';
      const correctList = q.correctAnswers || [q.correctAnswer || 'A'];
      
      card.innerHTML = `
        <div class="item-header">
          <div>
            <span class="item-index">Question ${qNum}</span>
            <span class="item-type-tag ${isMulti ? 'multi' : ''}">
              ${isMulti ? '☑ Multiple Choice' : '○ Single Choice'}
            </span>
          </div>
          <div class="item-actions">
            <button class="item-action-btn item-btn-edit" data-id="${q.id}">Edit</button>
            <span style="color: var(--border-color)">|</span>
            <button class="item-action-btn item-btn-delete" data-id="${q.id}">Delete</button>
          </div>
        </div>

        <p class="item-question-text">${escapeHtml(q.question)}</p>

        <div class="item-options-preview">
          <div class="item-option-row ${correctList.includes('A') ? 'is-correct' : ''}">
            <span class="item-opt-letter">${isMulti ? (correctList.includes('A') ? '☑' : '☐') : 'A.'}</span>
            <span>${escapeHtml(q.options?.A || '')}</span>
          </div>
          <div class="item-option-row ${correctList.includes('B') ? 'is-correct' : ''}">
            <span class="item-opt-letter">${isMulti ? (correctList.includes('B') ? '☑' : '☐') : 'B.'}</span>
            <span>${escapeHtml(q.options?.B || '')}</span>
          </div>
          <div class="item-option-row ${correctList.includes('C') ? 'is-correct' : ''}">
            <span class="item-opt-letter">${isMulti ? (correctList.includes('C') ? '☑' : '☐') : 'C.'}</span>
            <span>${escapeHtml(q.options?.C || '')}</span>
          </div>
          <div class="item-option-row ${correctList.includes('D') ? 'is-correct' : ''}">
            <span class="item-opt-letter">${isMulti ? (correctList.includes('D') ? '☑' : '☐') : 'D.'}</span>
            <span>${escapeHtml(q.options?.D || '')}</span>
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
    showToast('Loaded sample questions!');
    await loadAndRenderQuestions();
  });

  // ================= Add Question / Upload / OCR =================
  dom.browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dom.fileInput.click();
  });

  dom.dropzone.addEventListener('click', () => {
    if (!state.currentImageDataUrl) {
      dom.fileInput.click();
    }
  });

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

  dom.fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  });

  // Clipboard Paste Support (Ctrl+V)
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
      const { question, options, detectedAnswer, detectedAnswers, detectedType } = result.parsed;
      dom.formQuestion.value = question || '';
      dom.formOptA.value = options.A || '';
      dom.formOptB.value = options.B || '';
      dom.formOptC.value = options.C || '';
      dom.formOptD.value = options.D || '';
      
      // Auto-set Question Type
      if (detectedType === 'multiple') {
        setAddQuestionType('multiple');
        dom.addMultiCheckboxes.forEach(cb => {
          cb.checked = (detectedAnswers || []).includes(cb.value);
        });
      } else {
        setAddQuestionType('single');
        if (detectedAnswer && ['A', 'B', 'C', 'D'].includes(detectedAnswer)) {
          dom.formCorrectAnswer.value = detectedAnswer;
        }
      }

      showToast('Question extracted! Review & edit below.');
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

    if (!question || !optA || !optB || !optC || !optD) {
      showToast('Please fill in the question and all 4 options');
      return;
    }

    let correctAnswers = [];
    if (state.addType === 'multiple') {
      correctAnswers = Array.from(dom.addMultiCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

      if (correctAnswers.length === 0) {
        showToast('Please check at least one correct option');
        return;
      }
    } else {
      const selected = dom.formCorrectAnswer.value;
      if (!selected) {
        showToast('Please select the correct answer');
        return;
      }
      correctAnswers = [selected];
    }

    const questionData = {
      question,
      type: state.addType,
      options: { A: optA, B: optB, C: optC, D: optD },
      correctAnswer: correctAnswers[0],
      correctAnswers,
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
      dom.addMultiCheckboxes.forEach(cb => (cb.checked = false));
      setAddQuestionType('single');
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
    dom.addMultiCheckboxes.forEach(cb => (cb.checked = false));
    setAddQuestionType('single');
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

    let selectedOrder = 'sequential';
    dom.orderRadios.forEach(radio => {
      if (radio.checked) selectedOrder = radio.value;
    });
    state.quiz.order = selectedOrder;

    let pool = [...state.questions];

    if (selectedOrder === 'random') {
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
    } else {
      pool.reverse();
    }

    let count = pool.length;
    if (state.quiz.countSetting !== 'all') {
      count = Math.min(parseInt(state.quiz.countSetting, 10), pool.length);
    }
    state.quiz.activeQuestions = pool.slice(0, count);

    state.quiz.currentIndex = 0;
    state.quiz.userAnswers = {};
    state.quiz.isCompleted = false;

    switchView('practice-active');
    renderActiveQuizQuestion();
  });

  // ================= 5 & 7. Active Practice Engine =================
  function renderActiveQuizQuestion() {
    const currentQ = state.quiz.activeQuestions[state.quiz.currentIndex];
    const totalQ = state.quiz.activeQuestions.length;
    const currentIdx = state.quiz.currentIndex;
    const isMulti = currentQ.type === 'multiple';

    // Header counter: "Question 1 / 25"
    dom.quizCounter.textContent = `Question ${currentIdx + 1} / ${totalQ}`;
    
    // Answered status
    const answeredCount = Object.keys(state.quiz.userAnswers).filter(k => {
      const a = state.quiz.userAnswers[k];
      return Array.isArray(a) ? a.length > 0 : Boolean(a);
    }).length;
    dom.quizAnsweredStatus.textContent = `${answeredCount} of ${totalQ} answered`;

    // Progress bar
    const progressPercent = ((currentIdx + 1) / totalQ) * 100;
    dom.quizProgressBar.style.width = `${progressPercent}%`;

    // Question Type Indicator Badge
    if (isMulti) {
      dom.quizTypeBadge.className = 'quiz-type-badge multi';
      dom.quizTypeBadge.textContent = '☑ Multiple Answers (Checkboxes)';
    } else {
      dom.quizTypeBadge.className = 'quiz-type-badge';
      dom.quizTypeBadge.textContent = '○ Single Answer (Radio)';
    }

    // Attached screenshot preview button
    if (currentQ.screenshot) {
      dom.quizShotContainer.classList.remove('hidden');
      dom.quizViewShotBtn.onclick = () => openScreenshotModal(currentQ.screenshot);
    } else {
      dom.quizShotContainer.classList.add('hidden');
    }

    // Question Text
    dom.quizQuestionText.textContent = currentQ.question;

    // Render Options A, B, C, D
    dom.quizOptionsContainer.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D'];
    const currentAnswer = state.quiz.userAnswers[currentIdx];

    letters.forEach(letter => {
      const optText = currentQ.options?.[letter] || '';
      
      let isSelected = false;
      if (isMulti) {
        isSelected = Array.isArray(currentAnswer) && currentAnswer.includes(letter);
      } else {
        isSelected = currentAnswer === letter;
      }

      const optBtn = document.createElement('div');
      optBtn.className = `quiz-opt-btn ${isSelected ? 'selected' : ''}`;
      optBtn.setAttribute('data-option', letter);

      // Icon: radio circle for single, checkbox square for multiple
      const iconHtml = isMulti
        ? `<div class="quiz-opt-square">${isSelected ? '✓' : ''}</div>`
        : `<div class="quiz-opt-circle">${isSelected ? '●' : '○'}</div>`;

      optBtn.innerHTML = `
        ${iconHtml}
        <div class="quiz-opt-text"><strong>${letter}.</strong> ${escapeHtml(optText)}</div>
      `;

      optBtn.addEventListener('click', () => {
        if (isMulti) {
          // Toggle selection in array
          let list = Array.isArray(state.quiz.userAnswers[currentIdx])
            ? [...state.quiz.userAnswers[currentIdx]]
            : [];
          if (list.includes(letter)) {
            list = list.filter(l => l !== letter);
          } else {
            list.push(letter);
          }
          state.quiz.userAnswers[currentIdx] = list;
        } else {
          // Single radio select
          state.quiz.userAnswers[currentIdx] = letter;
        }
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

      const ans = state.quiz.userAnswers[i];
      const isAnswered = Array.isArray(ans) ? ans.length > 0 : Boolean(ans);
      if (isAnswered) {
        bubble.classList.add('answered');
      }

      bubble.addEventListener('click', () => {
        state.quiz.currentIndex = i;
        renderActiveQuizQuestion();
      });

      dom.quizPaginationGrid.appendChild(bubble);
    }
  }

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
      const isMulti = q.type === 'multiple';
      const qCorrect = q.correctAnswers || [q.correctAnswer || 'A'];

      if (isMulti) {
        const userPicks = Array.isArray(userPick) ? userPick : [];
        if (userPicks.length === 0) {
          skippedCount++;
        } else {
          const sUser = [...userPicks].sort();
          const sCorrect = [...qCorrect].sort();
          const isMatch = sUser.length === sCorrect.length && sUser.every((v, i) => v === sCorrect[i]);
          if (isMatch) correctCount++;
          else wrongCount++;
        }
      } else {
        if (!userPick) {
          skippedCount++;
        } else if (userPick === qCorrect[0]) {
          correctCount++;
        } else {
          wrongCount++;
        }
      }
    });

    const percent = Math.round((correctCount / totalQ) * 100);

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

    renderAnswerReview(questions);
    switchView('practice-result');
  }

  function renderAnswerReview(questions) {
    dom.reviewQuestionsList.innerHTML = '';

    questions.forEach((q, idx) => {
      const userPick = state.quiz.userAnswers[idx];
      const isMulti = q.type === 'multiple';
      const qCorrect = q.correctAnswers || [q.correctAnswer || 'A'];

      let isCorrect = false;
      let isSkipped = false;

      if (isMulti) {
        const userPicks = Array.isArray(userPick) ? userPick : [];
        if (userPicks.length === 0) {
          isSkipped = true;
        } else {
          const sUser = [...userPicks].sort();
          const sCorrect = [...qCorrect].sort();
          isCorrect = sUser.length === sCorrect.length && sUser.every((v, i) => v === sCorrect[i]);
        }
      } else {
        if (!userPick) {
          isSkipped = true;
        } else {
          isCorrect = userPick === qCorrect[0];
        }
      }

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
      const userList = Array.isArray(userPick) ? userPick : (userPick ? [userPick] : []);

      const optionsHtml = letters.map(letter => {
        const isUserPick = userList.includes(letter);
        const isAnswer = qCorrect.includes(letter);
        
        let rowClass = 'review-opt-row';
        if (isAnswer) rowClass += ' is-correct-answer';
        if (isUserPick && !isAnswer) rowClass += ' is-user-pick is-wrong';

        let badge = '';
        if (isAnswer && isUserPick) {
          badge = `<span class="review-indicator-badge correct-pick">Correct Pick</span>`;
        } else if (isAnswer) {
          badge = `<span class="review-indicator-badge correct-pick">Correct Answer</span>`;
        } else if (isUserPick) {
          badge = `<span class="review-indicator-badge user-pick">Your Pick</span>`;
        }

        const marker = isMulti ? (isUserPick ? '☑' : '☐') : `${letter}.`;

        return `
          <div class="${rowClass}">
            <div class="review-opt-left">
              <strong>${marker}</strong>
              <span>${escapeHtml(q.options?.[letter] || '')}</span>
            </div>
            ${badge}
          </div>
        `;
      }).join('');

      const userDisplay = userList.length > 0 ? userList.map(l => `Option ${l}`).join(', ') : 'None';
      const correctDisplay = qCorrect.map(l => `Option ${l}`).join(', ');

      reviewCard.innerHTML = `
        <div class="review-card-top">
          <div>
            <span class="item-index">Question ${idx + 1}</span>
            <span class="item-type-tag ${isMulti ? 'multi' : ''}">
              ${isMulti ? '☑ Multiple Choice' : '○ Single Choice'}
            </span>
          </div>
          ${statusBadge}
        </div>
        <h4 class="review-question-title">${escapeHtml(q.question)}</h4>
        <div class="review-options-list">
          ${optionsHtml}
        </div>
        <div class="review-summary-row">
          <span>Your Answer: <strong>${userDisplay}</strong></span>
          <span>Correct Answer: <strong>${correctDisplay}</strong></span>
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

    const isMulti = q.type === 'multiple';
    setModalEditQuestionType(isMulti ? 'multiple' : 'single');

    const correctList = q.correctAnswers || [q.correctAnswer || 'A'];
    if (isMulti) {
      dom.modalMultiCheckboxes.forEach(cb => {
        cb.checked = correctList.includes(cb.value);
      });
    } else {
      dom.modalEditCorrect.value = correctList[0] || 'A';
    }

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
    const isMulti = state.modalEditType === 'multiple';

    let correctAnswers = [];
    if (isMulti) {
      correctAnswers = Array.from(dom.modalMultiCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

      if (correctAnswers.length === 0) {
        showToast('Please check at least one correct option');
        return;
      }
    } else {
      correctAnswers = [dom.modalEditCorrect.value];
    }

    const updated = {
      id,
      question: dom.modalEditQuestion.value.trim(),
      type: state.modalEditType,
      options: {
        A: dom.modalEditOptA.value.trim(),
        B: dom.modalEditOptB.value.trim(),
        C: dom.modalEditOptC.value.trim(),
        D: dom.modalEditOptD.value.trim()
      },
      correctAnswer: correctAnswers[0],
      correctAnswers
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
