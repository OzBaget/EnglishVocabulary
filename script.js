/*
 * Global vocabulary data and core logic for the vocabulary practice site.
 * This script defines the vocabulary sets for three levels, helpers to
 * persist progress in localStorage, and functions to render both the
 * index page and the per‑level practice interface.
 */

// Vocabulary sets for each level. Each entry contains the English word,
// a Hebrew translation and a short English definition derived from
// trusted dictionary sources. See project documentation for citations.
const levels = {
  "1": [
    { word: "anticipate", translation: "לצפות (לחזות מראש)", definition: "to imagine or expect that something will happen" },
    { word: "approximate", translation: "משוער, בקירוב", definition: "not completely accurate but close" },
    { word: "coherent", translation: "עקבי, קוהרנטי", definition: "clear and carefully considered, each part connecting naturally" },
    { word: "compile", translation: "לקבץ, לאסוף ולסדר", definition: "to collect information from different places and arrange it" },
    { word: "denote", translation: "לציין, לסמל", definition: "to represent or mean something" },
    { word: "discrete", translation: "נפרד, מבודל", definition: "clearly separate or different in shape or form" },
    { word: "fluctuate", translation: "להתנדנד, להשתנות", definition: "to change continuously between one level or thing and another" },
    { word: "forthcoming", translation: "קרוב, מתקרב", definition: "happening soon" },
    { word: "incentive", translation: "תמריץ", definition: "something that encourages a person to do something by offering a reward" },
    { word: "inherent", translation: "טבוע, מובנה", definition: "existing as a natural or basic part of something" }
  ],
  "2": [
    { word: "radical", translation: "רדיקלי (תומך בשינוי גדול)", definition: "believing or expressing that there should be great social or political change" },
    { word: "reluctance", translation: "חוסר רצון, היסוס", definition: "an unwillingness to do something" },
    { word: "subordinate", translation: "כפוף, בדרגה נמוכה", definition: "having a lower or less important position" },
    { word: "supplement", translation: "תוספת", definition: "something added to improve or complete something" },
    { word: "comprehensive", translation: "מקיף, כולל", definition: "complete and including everything necessary" },
    { word: "controversy", translation: "מחלוקת", definition: "a lot of disagreement or argument about something" },
    { word: "deduce", translation: "להסיק", definition: "to reach an answer by thinking carefully about known facts" },
    { word: "empirical", translation: "אמפירי", definition: "based on experience or scientific experiments and not only on ideas" },
    { word: "explicit", translation: "מפורש", definition: "clear and exact; showing or talking about sex or violence in detail" },
    { word: "paradigm", translation: "פרדיגמה, מודל", definition: "a typical example or model of something" }
  ],
  "3": [
    { word: "ambivalent", translation: "דו‑ערכי, אמביוולנטי", definition: "having two different feelings about something" },
    { word: "juxtapose", translation: "להציב זה לצד זה", definition: "to place very different things or people close to each other" },
    { word: "fastidious", translation: "דקדקן, קפדן", definition: "wanting every detail of something to be correct and perfect" },
    { word: "magnanimous", translation: "נדיב, רחב לב", definition: "very kind and generous towards an enemy or someone you have defeated" },
    { word: "pernicious", translation: "מזיק מאוד, הרסני", definition: "very harmful" },
    { word: "prosaic", translation: "שגרתי, חסר עניין", definition: "ordinary and not interesting" },
    { word: "sagacious", translation: "נבון, פיקח", definition: "having or showing understanding and the ability to make good decisions and judgments" },
    { word: "tantamount", translation: "שקול ל-, שווה ערך", definition: "being almost the same or having the same effect as something, usually something bad" },
    { word: "clandestine", translation: "חשאי, סודי", definition: "secret and often illegal" },
    { word: "ubiquitous", translation: "נמצא בכל מקום", definition: "seeming to be in all places" }
  ]
};

/**
 * Construct a unique key for storing a word's status for a given level in
 * localStorage. This allows the user to revisit the page later and only
 * practise words that are not yet fully mastered.
 *
 * @param {string|number} level The level identifier ("1", "2" or "3").
 * @param {string} word The English word.
 * @returns {string} A unique localStorage key.
 */
function getStatusKey(level, word) {
  return `level${level}_${word}`;
}

/**
 * Get the stored status for a word in a given level. Possible values are
 * "unknown" (default), "half" (partially known) and "known".
 *
 * @param {string|number} level
 * @param {string} word
 * @returns {string} The stored status, or "unknown" if none is found.
 */
function getWordStatus(level, word) {
  return localStorage.getItem(getStatusKey(level, word)) || "unknown";
}

/**
 * Persist a new status for a given word in a specific level.
 *
 * @param {string|number} level
 * @param {string} word
 * @param {string} status Must be "unknown", "half" or "known".
 */
function setWordStatus(level, word, status) {
  localStorage.setItem(getStatusKey(level, word), status);
}

/**
 * Return the list of word objects for a level. If includeKnown is false
 * (default) the returned array excludes words whose status is "known".
 *
 * @param {string|number} level The level identifier.
 * @param {boolean} includeKnown Whether to include words marked as known.
 * @returns {Array<{word:string, translation:string, definition:string}>}
 */
function getWordsForLevel(level, includeKnown = false) {
  const list = levels[level] || [];
  if (includeKnown) return list.slice();
  return list.filter(item => getWordStatus(level, item.word) !== "known");
}

/**
 * Count the number of words in a level that have the specified status.
 *
 * @param {string|number} level
 * @param {string} status "known" or "half"
 * @returns {number}
 */
function countByStatus(level, status) {
  const list = levels[level] || [];
  let count = 0;
  for (const item of list) {
    if (getWordStatus(level, item.word) === status) {
      count++;
    }
  }
  return count;
}

/**
 * Remove all status entries for a level from localStorage, effectively
 * resetting the user's progress for that level.
 *
 * @param {string|number} level
 */
function resetLevel(level) {
  const list = levels[level] || [];
  for (const item of list) {
    localStorage.removeItem(getStatusKey(level, item.word));
  }
}

/**
 * Update progress indicators for each level on the index page. This function
 * reads the DOM to find elements annotated with data-level and updates
 * their progress bars and remaining count. Called on page load and after
 * resetting a level.
 */
function updateLevelProgressUI() {
  document.querySelectorAll(".level-item").forEach(elem => {
    const level = elem.dataset.level;
    const total = levels[level] ? levels[level].length : 0;
    const known = countByStatus(level, "known");
    const half = countByStatus(level, "half");
    const remain = total - known;
    const progressBar = elem.querySelector("progress");
    const textSpan = elem.querySelector(".progress-text");
    if (progressBar) {
      progressBar.max = total;
      progressBar.value = known;
    }
    if (textSpan) {
      textSpan.textContent = `נשארו ${remain} מילים (חצי: ${half})`;
    }
  });
}

// When the DOM has loaded, determine which page we are on and attach
// appropriate handlers.
document.addEventListener("DOMContentLoaded", () => {
  // Index page logic: update progress indicators and bind reset buttons
  if (document.querySelector(".level-list")) {
    updateLevelProgressUI();
    document.querySelectorAll(".reset-button").forEach(btn => {
      btn.addEventListener("click", () => {
        const level = btn.dataset.level;
        if (confirm(`האם לאפס את ההתקדמות ברמה ${level}?`)) {
          resetLevel(level);
          updateLevelProgressUI();
        }
      });
    });
  }

  // Level page logic: initialise practice interface if container exists
  if (document.getElementById("level-container")) {
    const params = new URLSearchParams(window.location.search);
    const level = params.get("level") || "1";
    initLevel(level);
  }
});

/**
 * Initialise a practice session for the given level. This creates the card
 * container, attaches swipe and flip handlers, and updates progress text
 * after each card. When all words are practised, a completion message
 * appears with links back to the index or to the next level.
 *
 * @param {string|number} level
 */
function initLevel(level) {
  const words = getWordsForLevel(level);
  const container = document.getElementById("level-container");
  const instructionsElem = document.getElementById("instructions");
  const progressElem = document.getElementById("remaining");
  let currentIndex = 0;

  function showCard() {
    container.innerHTML = "";
    // If no more cards, display completion message
    if (currentIndex >= words.length) {
      const msg = document.createElement("div");
      msg.className = "finish-message";
      let html = `סיימת את כל המילים ברמה ${level}!<br/>`;
      html += `<a href="index.html" class="button">חזרה לדף הבית</a>`;
      const nextLevel = parseInt(level, 10) + 1;
      if (levels[String(nextLevel)]) {
        html += `<a href="level.html?level=${nextLevel}" class="button">עבור לרמה ${nextLevel}</a>`;
      }
      msg.innerHTML = html;
      container.appendChild(msg);
      if (instructionsElem) instructionsElem.style.display = "none";
      if (progressElem) progressElem.textContent = "";
      return;
    }

    const item = words[currentIndex];
    const cardContainer = document.createElement("div");
    cardContainer.className = "card-container";

    const card = document.createElement("div");
    card.className = "card";

    const front = document.createElement("div");
    front.className = "front";
    front.textContent = item.word;

    const back = document.createElement("div");
    back.className = "back";
    back.innerHTML = `<div class="translation">${item.translation}</div><div class="definition">${item.definition}</div>`;

    card.appendChild(front);
    card.appendChild(back);

    const overlay = document.createElement("div");
    overlay.className = "status-overlay";

    cardContainer.appendChild(card);
    cardContainer.appendChild(overlay);
    container.appendChild(cardContainer);

    let startX, startY;
    let moved = false;
    let isFlipped = false;

    // Handle pointer events for swipe/flip detection
    cardContainer.addEventListener("pointerdown", event => {
      startX = event.clientX;
      startY = event.clientY;
      moved = false;
    });

    cardContainer.addEventListener("pointermove", () => {
      moved = true;
    });

    cardContainer.addEventListener("pointerup", event => {
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      // If movement is minimal, treat as flip
      if (!moved || (absX < 30 && absY < 30)) {
        if (!isFlipped) {
          card.classList.add("flip");
          isFlipped = true;
        } else {
          card.classList.remove("flip");
          isFlipped = false;
        }
        return;
      }
      // Determine swipe direction
      let newStatus = null;
      if (absX > absY) {
        if (dx > 50) {
          newStatus = "known";
          overlay.className = "status-overlay known show";
        } else if (dx < -50) {
          newStatus = "unknown";
          overlay.className = "status-overlay unknown show";
        }
      } else {
        if (dy > 50) {
          newStatus = "half";
          overlay.className = "status-overlay half show";
        }
      }
      if (newStatus) {
        setWordStatus(level, item.word, newStatus);
        // After showing the overlay briefly, go to next card
        setTimeout(() => {
          overlay.classList.remove("show");
          currentIndex++;
          showCard();
        }, 400);
      }
    });

    // Update progress text
    if (progressElem) {
      progressElem.textContent = `מילה ${currentIndex + 1} מתוך ${words.length}`;
    }
  }

  showCard();
}
