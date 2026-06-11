(() => {
  const OUT_OF_SCOPE_MESSAGE =
    "Maaf, saya hanya dapat membantu pertanyaan terkait VOLTA-LEARN, pengukuran tegangan, multimeter, osiloskop, K3, simulasi, dan evaluasi praktikum.";

  const normalize = (text) =>
    String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const tokenize = (text) => {
    const stopWords = new Set([
      "apa", "itu", "yang", "dan", "di", "ke", "dari", "untuk", "cara", "bagaimana",
      "mengapa", "saja", "saat", "pada", "dengan", "sebelum", "setelah", "adalah",
      "jelaskan", "tolong", "bantu", "saya", "praktikum"
    ]);
    return normalize(text)
      .split(" ")
      .filter((word) => word.length > 2 && !stopWords.has(word));
  };

  const getKnowledgeBase = () => window.VOLTA_LEARN_KNOWLEDGE_BASE || [];
  const getQuickQuestions = () => window.VOLTA_LEARN_QUICK_QUESTIONS || [];

  const isClearlyOutOfScope = (question) => {
    const normalizedQuestion = normalize(question);
    const blockedTerms = [
      "milan", "bola", "sepak bola", "film", "lagu", "musik", "game", "presiden",
      "politik", "cuaca", "resep", "masak", "makanan", "mobil", "motor",
      "air conditioner", "pendingin ruangan", "ac ruangan", "ac mobil",
      "harga saham", "crypto", "bitcoin"
    ];
    return blockedTerms.some((term) => normalizedQuestion.includes(term));
  };

  const scoreEntry = (question, entry) => {
    const normalizedQuestion = normalize(question);
    const questionTokens = tokenize(question);
    const intentTokens = tokenize(entry.intent || "");
    const titleTokens = tokenize(entry.title || "");
    let score = 0;

    (entry.keywords || []).forEach((keyword) => {
      const normalizedKeyword = normalize(keyword);
      if (!normalizedKeyword) return;
      if (normalizedQuestion === normalizedKeyword) score += 10;
      else if (normalizedQuestion.includes(normalizedKeyword)) score += normalizedKeyword.includes(" ") ? 7 : 4;
    });

    questionTokens.forEach((token) => {
      if ((entry.keywords || []).some((keyword) => normalize(keyword).split(" ").includes(token))) score += 2;
      if (intentTokens.includes(token)) score += 3;
      if (titleTokens.includes(token)) score += 2;
    });

    if (normalizedQuestion.includes("volta") && /volta|tujuan|manfaat|simulasi|lab/.test(entry.keywords?.join(" ") || "")) {
      score += 2;
    }

    return score;
  };

  const findBestAnswer = (question) => {
    if (isClearlyOutOfScope(question)) {
      return {
        answer: OUT_OF_SCOPE_MESSAGE,
        title: "Di luar ruang lingkup",
        score: 0
      };
    }

    const entries = getKnowledgeBase();
    const ranked = entries
      .map((entry) => ({ entry, score: scoreEntry(question, entry) }))
      .sort((a, b) => b.score - a.score);

    const best = ranked[0];
    if (!best || best.score < 4) {
      return {
        answer: OUT_OF_SCOPE_MESSAGE,
        title: "Di luar ruang lingkup",
        score: 0
      };
    }

    return {
      answer: best.entry.answer,
      title: best.entry.title,
      score: best.score
    };
  };

  const createMessage = (role, text, meta = "") => {
    const message = document.createElement("div");
    message.className = `ai-tutor-message ${role}`;

    const bubble = document.createElement("div");
    bubble.className = "ai-tutor-bubble";
    bubble.textContent = text;
    message.appendChild(bubble);

    if (meta) {
      const metaEl = document.createElement("span");
      metaEl.className = "ai-tutor-meta";
      metaEl.textContent = meta;
      message.appendChild(metaEl);
    }

    return message;
  };

  const initTutor = () => {
    if (document.getElementById("aiTutorRoot")) return;

    const root = document.createElement("section");
    root.className = "ai-tutor";
    root.id = "aiTutorRoot";
    root.setAttribute("aria-label", "AI Tutor VOLTA-LEARN");

    root.innerHTML = `
      <button class="ai-tutor-toggle" id="aiTutorToggle" type="button" aria-label="Buka AI Tutor VOLTA-LEARN" aria-expanded="false">
        <span>AI</span>
        <i class="fas fa-bolt" aria-hidden="true"></i>
      </button>
      <div class="ai-tutor-panel" id="aiTutorPanel" role="dialog" aria-labelledby="aiTutorTitle" aria-hidden="true">
        <div class="ai-tutor-header">
          <div>
            <p class="ai-tutor-kicker">Asisten Lokal</p>
            <h2 id="aiTutorTitle">AI Tutor VOLTA-LEARN</h2>
            <p>Asisten ini hanya menjawab seputar materi VOLTA-LEARN.</p>
          </div>
          <button class="ai-tutor-close" id="aiTutorClose" type="button" aria-label="Tutup AI Tutor">
            <i class="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>
        <div class="ai-tutor-messages" id="aiTutorMessages" aria-live="polite"></div>
        <div class="ai-tutor-quick" id="aiTutorQuick" aria-label="Pertanyaan cepat"></div>
        <form class="ai-tutor-form" id="aiTutorForm">
          <input id="aiTutorInput" type="text" autocomplete="off" placeholder="Tulis pertanyaan tentang VOLTA-LEARN..." aria-label="Pertanyaan untuk AI Tutor VOLTA-LEARN" />
          <button type="submit" aria-label="Kirim pertanyaan">
            <i class="fas fa-paper-plane" aria-hidden="true"></i>
          </button>
        </form>
      </div>
    `;

    document.body.appendChild(root);

    const toggle = document.getElementById("aiTutorToggle");
    const close = document.getElementById("aiTutorClose");
    const panel = document.getElementById("aiTutorPanel");
    const messages = document.getElementById("aiTutorMessages");
    const quick = document.getElementById("aiTutorQuick");
    const form = document.getElementById("aiTutorForm");
    const input = document.getElementById("aiTutorInput");

    const scrollToBottom = () => {
      messages.scrollTop = messages.scrollHeight;
    };

    const openPanel = () => {
      root.classList.add("is-open");
      panel.setAttribute("aria-hidden", "false");
      toggle.setAttribute("aria-expanded", "true");
      setTimeout(() => input.focus(), 80);
    };

    const closePanel = () => {
      root.classList.remove("is-open");
      panel.setAttribute("aria-hidden", "true");
      toggle.setAttribute("aria-expanded", "false");
      toggle.focus();
    };

    const askQuestion = (question) => {
      const cleanQuestion = String(question || "").trim();
      if (!cleanQuestion) return;

      messages.appendChild(createMessage("user", cleanQuestion));
      const result = findBestAnswer(cleanQuestion);
      messages.appendChild(createMessage("bot", result.answer, result.title));
      scrollToBottom();
    };

    messages.appendChild(createMessage(
      "bot",
      "Halo, saya AI Tutor VOLTA-LEARN. Silakan tanya tentang tegangan AC/DC, multimeter, osiloskop, K3, simulasi, kesalahan pengukuran, atau evaluasi praktikum.",
      "Siap membantu"
    ));

    getQuickQuestions().forEach((question) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ai-tutor-chip";
      btn.textContent = question;
      btn.addEventListener("click", () => {
        openPanel();
        askQuestion(question);
      });
      quick.appendChild(btn);
    });

    toggle.addEventListener("click", () => {
      root.classList.contains("is-open") ? closePanel() : openPanel();
    });
    close.addEventListener("click", closePanel);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && root.classList.contains("is-open")) closePanel();
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      askQuestion(input.value);
      input.value = "";
    });
  };

  window.VoltaLearnTutor = { findBestAnswer };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTutor);
  } else {
    initTutor();
  }
})();
