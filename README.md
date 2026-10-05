# MCQ Practice - Simple Personal Exam Practice Tool

A clean, mobile-first web application designed with a single focused purpose:
**Upload Screenshot → Extract/Add MCQ → Save → Practice**

---

## Features

- **Home Page**: Displays total question count, quick buttons for **+ Add Questions** and **Practice Quiz**, plus a full list of all saved questions with **Edit** and **Delete** actions.
- **Screenshot OCR & Fast Addition**:
  - Drag & drop or browse image, mobile camera capture, or paste from clipboard (`Ctrl+V`).
  - Client-side in-browser OCR (powered by Tesseract.js) to extract Question, Option A, Option B, Option C, and Option D.
  - Quick editable form to verify or correct any OCR inaccuracies.
  - Dropdown to select the Correct Answer.
  - Immediate **"✓ Question Added"** confirmation with **"+ Add Another Question"** for rapid multi-question entry.
- **Local Storage (IndexedDB)**:
  - All questions and original screenshots are stored locally in the browser.
  - Zero login, zero backend, zero external database required.
  - Works offline once loaded and persists across sessions.
- **Quiz Practice**:
  - **Quiz Settings**: Choose number of questions (`5`, `10`, `20`, `All`) and question order (`Sequential` or `Random`).
  - **Active Quiz**:
    - One question at a time (`Question 1 / 25`).
    - Touch-friendly option cards (A, B, C, D).
    - Previous and Next buttons.
    - Interactive bottom navigation (`1 2 3 4 5...`).
    - Answers are **not** revealed during the quiz.
- **Final Result & Review**:
  - Score fraction (e.g. `18 / 20`), percentage (`90%`), and counts for `✓ Correct` and `✕ Wrong`.
  - Detailed **Review Answers** list comparing your choices with the correct answers.
  - Unlimited practice with **"Practice Again"**.
- **Mobile-First & Clean UI**:
  - White/light background, card layout, smooth touch controls, and dark mode toggle.

---

## File Structure

```
e:/QUIZ/
├── index.html        # Semantic HTML single-page structure
├── css/
│   └── styles.css    # Clean, responsive CSS design system
├── js/
│   ├── db.js         # IndexedDB persistent local storage wrapper
│   ├── ocr.js        # In-browser OCR & smart MCQ regex parser
│   └── app.js        # View routing, form handling, & quiz engine
└── README.md
```

---

## How to Run

You can open `index.html` directly in any modern browser, or run a lightweight local server:

```bash
# Using Python
python -m http.server 8085

# Or simply open index.html in Chrome, Edge, Safari, or Firefox
```
