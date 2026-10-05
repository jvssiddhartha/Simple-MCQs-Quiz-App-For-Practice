/**
 * db.js - IndexedDB Local Storage Manager for MCQ Practice
 * Stores questions and original screenshots locally in the browser without any backend.
 */

const DB_NAME = 'MCQPracticeDB';
const DB_VERSION = 1;
const STORE_NAME = 'questions';

class MCQDatabase {
  constructor() {
    this.db = null;
    this.initPromise = this._init();
  }

  _init() {
    return new Promise((resolve, reject) => {
      // IndexedDB support check
      if (!window.indexedDB) {
        console.warn('IndexedDB not supported, falling back to localStorage');
        resolve(null);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', event.target.error);
        resolve(null); // Will fallback to localStorage
      };
    });
  }

  async _getStore(mode = 'readonly') {
    await this.initPromise;
    if (this.db) {
      const transaction = this.db.transaction(STORE_NAME, mode);
      return transaction.objectStore(STORE_NAME);
    }
    return null;
  }

  // --- CRUD Operations ---

  async getAllQuestions() {
    const store = await this._getStore('readonly');
    if (!store) {
      return this._lsGetAll();
    }

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        // Sort descending by creation date (newest first)
        const items = request.result || [];
        items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getQuestion(id) {
    const numId = Number(id);
    const store = await this._getStore('readonly');
    if (!store) {
      return this._lsGet(numId);
    }

    return new Promise((resolve, reject) => {
      const request = store.get(numId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async addQuestion(questionData) {
    const type = questionData.type === 'multiple' ? 'multiple' : 'single';
    let correctAnswers = [];
    if (Array.isArray(questionData.correctAnswers) && questionData.correctAnswers.length > 0) {
      correctAnswers = [...questionData.correctAnswers];
    } else if (questionData.correctAnswer) {
      correctAnswers = [questionData.correctAnswer];
    } else {
      correctAnswers = ['A'];
    }

    const item = {
      question: questionData.question.trim(),
      type: type, // 'single' | 'multiple'
      options: {
        A: (questionData.options?.A || '').trim(),
        B: (questionData.options?.B || '').trim(),
        C: (questionData.options?.C || '').trim(),
        D: (questionData.options?.D || '').trim()
      },
      correctAnswer: correctAnswers[0] || 'A', // backward compatibility
      correctAnswers: correctAnswers, // Array of 'A' | 'B' | 'C' | 'D'
      screenshot: questionData.screenshot || null,
      createdAt: Date.now()
    };

    const store = await this._getStore('readwrite');
    if (!store) {
      return this._lsAdd(item);
    }

    return new Promise((resolve, reject) => {
      const request = store.add(item);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateQuestion(questionData) {
    const store = await this._getStore('readwrite');
    if (!store) {
      return this._lsUpdate(questionData);
    }

    return new Promise((resolve, reject) => {
      const getRequest = store.get(Number(questionData.id));
      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        if (!existing) {
          reject(new Error('Question not found'));
          return;
        }

        const type = questionData.type || existing.type || 'single';
        let correctAnswers = [];
        if (Array.isArray(questionData.correctAnswers) && questionData.correctAnswers.length > 0) {
          correctAnswers = [...questionData.correctAnswers];
        } else if (questionData.correctAnswer) {
          correctAnswers = [questionData.correctAnswer];
        } else if (existing.correctAnswers) {
          correctAnswers = [...existing.correctAnswers];
        } else {
          correctAnswers = [existing.correctAnswer || 'A'];
        }

        const updated = {
          ...existing,
          question: questionData.question.trim(),
          type: type,
          options: {
            A: (questionData.options?.A || '').trim(),
            B: (questionData.options?.B || '').trim(),
            C: (questionData.options?.C || '').trim(),
            D: (questionData.options?.D || '').trim()
          },
          correctAnswer: correctAnswers[0] || 'A',
          correctAnswers: correctAnswers,
          screenshot: questionData.screenshot !== undefined ? questionData.screenshot : existing.screenshot,
          updatedAt: Date.now()
        };

        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve(updated);
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteQuestion(id) {
    const numId = Number(id);
    const store = await this._getStore('readwrite');
    if (!store) {
      return this._lsDelete(numId);
    }

    return new Promise((resolve, reject) => {
      const request = store.delete(numId);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async countQuestions() {
    const store = await this._getStore('readonly');
    if (!store) {
      return this._lsGetAll().length;
    }

    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result || 0);
      request.onerror = () => reject(request.error);
    });
  }

  // --- LocalStorage Fallback Methods ---

  _lsGetAll() {
    try {
      const raw = localStorage.getItem('mcq_questions');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  _lsGet(id) {
    const list = this._lsGetAll();
    return list.find(q => q.id === id) || null;
  }

  _lsAdd(item) {
    const list = this._lsGetAll();
    const newId = Date.now();
    item.id = newId;
    list.unshift(item);
    localStorage.setItem('mcq_questions', JSON.stringify(list));
    return newId;
  }

  _lsUpdate(item) {
    const list = this._lsGetAll();
    const idx = list.findIndex(q => q.id === Number(item.id));
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...item };
      localStorage.setItem('mcq_questions', JSON.stringify(list));
      return list[idx];
    }
    return null;
  }

  _lsDelete(id) {
    const list = this._lsGetAll().filter(q => q.id !== Number(id));
    localStorage.setItem('mcq_questions', JSON.stringify(list));
    return true;
  }

  // --- Sample Questions Loader ---
  async seedSampleQuestions() {
    const samples = [
      {
        question: "What is the default port of HTTP?",
        type: "single",
        options: {
          A: "21",
          B: "80",
          C: "443",
          D: "25"
        },
        correctAnswers: ["B"]
      },
      {
        question: "Which of the following are valid application layer protocols? (Select all that apply)",
        type: "multiple",
        options: {
          A: "HTTP",
          B: "DNS",
          C: "TCP",
          D: "SMTP"
        },
        correctAnswers: ["A", "B", "D"]
      },
      {
        question: "Which protocol is connection-oriented?",
        type: "single",
        options: {
          A: "UDP",
          B: "IP",
          C: "TCP",
          D: "ICMP"
        },
        correctAnswers: ["C"]
      },
      {
        question: "What is the function of DNS?",
        type: "single",
        options: {
          A: "Translate domain names to IP addresses",
          B: "Encrypt data in transit",
          C: "Manage routing tables",
          D: "Assign dynamic IP addresses to clients"
        },
        correctAnswers: ["A"]
      }
    ];

    for (const sample of samples) {
      await this.addQuestion(sample);
    }
  }

  // --- Backup & Restore (JSON) ---
  async exportAllAsJSON() {
    const questions = await this.getAllQuestions();
    const backupData = {
      app: 'MCQPractice',
      version: 1,
      exportedAt: new Date().toISOString(),
      count: questions.length,
      questions: questions
    };
    return JSON.stringify(backupData, null, 2);
  }

  async importFromJSON(jsonString) {
    if (!jsonString || typeof jsonString !== 'string') {
      throw new Error('Invalid backup file content');
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      throw new Error('Failed to parse JSON file');
    }

    let questionItems = [];
    if (Array.isArray(parsed)) {
      questionItems = parsed;
    } else if (parsed && Array.isArray(parsed.questions)) {
      questionItems = parsed.questions;
    } else {
      throw new Error('No valid questions array found in backup file');
    }

    if (questionItems.length === 0) {
      throw new Error('Backup file contains 0 questions');
    }

    let importedCount = 0;
    for (const item of questionItems) {
      if (item && item.question) {
        await this.addQuestion({
          question: item.question,
          type: item.type || (Array.isArray(item.correctAnswers) && item.correctAnswers.length > 1 ? 'multiple' : 'single'),
          options: item.options || { A: '', B: '', C: '', D: '' },
          correctAnswers: item.correctAnswers || [item.correctAnswer || 'A'],
          screenshot: item.screenshot || null
        });
        importedCount++;
      }
    }

    return importedCount;
  }

  // Request browser not to automatically clear IndexedDB when disk is low
  async requestPersistentStorage() {
    try {
      if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persist();
        if (isPersisted) {
          console.log('IndexedDB persistent storage granted by browser');
        }
      }
    } catch (e) {
      console.warn('Persistent storage check error:', e);
    }
  }
}

// Global instance
window.mcqDB = new MCQDatabase();
window.mcqDB.requestPersistentStorage();

