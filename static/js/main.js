/* ============================================================
   SciBot — Main JavaScript
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  // ─── Navbar Toggle (mobile) ───
  const toggle = document.getElementById("navToggle");
  const links  = document.getElementById("navLinks");
  if (toggle) {
    toggle.addEventListener("click", () => links.classList.toggle("open"));
    document.addEventListener("click", (e) => {
      if (!toggle.contains(e.target) && !links.contains(e.target)) links.classList.remove("open");
    });
  }

  // ─── Generic Config Panel Toggle ───
  document.querySelectorAll(".config-toggle").forEach((btn) => {
    btn.addEventListener("click", () => btn.closest(".config-panel").classList.toggle("open"));
  });

  // ─── Generic Slider → Output binding ───
  document.querySelectorAll('input[type="range"]').forEach((slider) => {
    const out = document.getElementById(slider.id.replace("Slider", "Value"));
    if (out) {
      const sync = () => (out.textContent = parseFloat(slider.value).toFixed(2));
      slider.addEventListener("input", sync);
      sync();
    }
  });

  // ════════════════════════════════════════════════════════════
  //  CHATBOT PAGE
  // ════════════════════════════════════════════════════════════
  const chatForm   = document.getElementById("chatForm");
  const chatInput  = document.getElementById("chatInput");
  const chatWindow = document.getElementById("chatWindow");
  const sendBtn    = document.getElementById("sendBtn");

  if (chatForm) {
    let history = [];

    // Auto-resize textarea
    chatInput.addEventListener("input", () => {
      chatInput.style.height = "auto";
      chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + "px";
    });

    // Enter to send (Shift+Enter for newline)
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); chatForm.requestSubmit(); }
    });

    chatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (!text) return;

      // Append user message
      appendMessage("user", text);
      history.push({ role: "user", content: text });
      chatInput.value = "";
      chatInput.style.height = "auto";
      sendBtn.disabled = true;

      // Show typing indicator
      const typing = createTypingIndicator();
      chatWindow.appendChild(typing);
      scrollChat();

      // Read config
      const temperature = parseFloat(document.getElementById("tempSlider")?.value ?? 0.7);
      const top_p       = parseFloat(document.getElementById("topPSlider")?.value ?? 0.9);

      try {
        const res = await fetch("/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history, temperature, top_p }),
        });

        // Remove typing indicator
        typing.remove();

        // Create bot bubble and stream into it
        const { wrapper, bubble } = appendMessage("bot", "", true);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullReply = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6);
            if (payload === "[DONE]") continue;
            if (payload.startsWith("[ERROR]")) { fullReply += payload; break; }
            fullReply += payload;
          }
          bubble.innerHTML = renderMarkdown(fullReply);
          scrollChat();
        }

        history.push({ role: "assistant", content: fullReply });
      } catch (err) {
        typing.remove();
        appendMessage("bot", "⚠️ Network error. Please try again.");
      }
      sendBtn.disabled = false;
      chatInput.focus();
    });
  }

  // ── Chat helpers ──
  function appendMessage(role, text, returnEl = false) {
    const wrapper = document.createElement("div");
    wrapper.className = `msg ${role}`;
    const avatar = document.createElement("div");
    avatar.className = "msg-avatar";
    avatar.textContent = role === "bot" ? "🤖" : "🧑‍🔬";
    const bubble = document.createElement("div");
    bubble.className = "msg-bubble";
    bubble.innerHTML = text ? renderMarkdown(text) : "";
    wrapper.append(avatar, bubble);
    chatWindow.appendChild(wrapper);
    scrollChat();
    if (returnEl) return { wrapper, bubble };
  }

  function createTypingIndicator() {
    const div = document.createElement("div");
    div.className = "msg bot";
    div.innerHTML = `<div class="msg-avatar">🤖</div><div class="msg-bubble typing-indicator"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`;
    return div;
  }

  function scrollChat() { if (chatWindow) chatWindow.scrollTop = chatWindow.scrollHeight; }

  // ── Minimal Markdown renderer ──
  function renderMarkdown(md) {
    let html = md
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      .replace(/^### (.+)$/gm, '<h4 style="color:var(--neon-cyan);margin:0.6em 0 0.3em;">$1</h4>')
      .replace(/^## (.+)$/gm, '<h3 style="color:var(--neon-green);margin:0.6em 0 0.3em;">$1</h3>')
      .replace(/^# (.+)$/gm, '<h2 style="color:var(--neon-green);margin:0.6em 0 0.3em;">$1</h2>');

    // Convert lines to paragraphs / lists
    const lines = html.split("\n");
    let out = "", inUl = false, inOl = false;
    for (let l of lines) {
      const trimmed = l.trim();
      // unordered
      if (/^[-*] /.test(trimmed)) {
        if (!inUl) { out += "<ul>"; inUl = true; }
        out += `<li>${trimmed.slice(2)}</li>`;
        continue;
      } else if (inUl) { out += "</ul>"; inUl = false; }
      // ordered
      if (/^\d+\.\s/.test(trimmed)) {
        if (!inOl) { out += "<ol>"; inOl = true; }
        out += `<li>${trimmed.replace(/^\d+\.\s/, "")}</li>`;
        continue;
      } else if (inOl) { out += "</ol>"; inOl = false; }
      // blank line
      if (trimmed === "") { out += " "; continue; }
      // headings already converted
      if (trimmed.startsWith("<h")) { out += trimmed; continue; }
      out += `<p>${trimmed}</p>`;
    }
    if (inUl) out += "</ul>";
    if (inOl) out += "</ol>";
    return out;
  }

  // ════════════════════════════════════════════════════════════
  //  EXPERIMENT EXPLORER
  // ════════════════════════════════════════════════════════════
  const grid = document.getElementById("experimentGrid");
  if (grid) {
    const experiments = [
      { name:"Volcano Eruption", emoji:"🌋", category:"Chemistry", difficulty:"Beginner", time:"15 min",
        materials:["Baking soda","Vinegar","Dish soap","Food coloring","Plastic bottle","Tray"],
        steps:["Place the bottle on the tray.","Add 2 tbsp baking soda into the bottle.","Add a squirt of dish soap and food coloring.","Pour vinegar in and step back!"],
        science:"This demonstrates an acid-base reaction. Vinegar (acetic acid) reacts with baking soda (sodium bicarbonate) producing carbon dioxide gas, which creates the foamy eruption." },
      { name:"Invisible Ink", emoji:"🔍", category:"Chemistry", difficulty:"Beginner", time:"20 min",
        materials:["Lemon juice","Cotton swab","White paper","Lamp or iron"],
        steps:["Dip cotton swab in lemon juice.","Write a secret message on paper.","Let it dry completely.","Hold paper near a warm lamp or iron to reveal the message."],
        science:"Lemon juice is an organic substance that oxidizes and turns brown when heated, making the invisible writing appear." },
      { name:"Static Electricity Butterfly", emoji:"🦋", category:"Physics", difficulty:"Beginner", time:"10 min",
        materials:["Tissue paper","Balloon","Scissors","Wool sweater"],
        steps:["Cut a small butterfly from tissue paper.","Inflate the balloon.","Rub the balloon vigorously on the wool sweater.","Hold balloon close to the butterfly to make it 'fly'."],
        science:"Rubbing the balloon creates a static charge by transferring electrons. The charged balloon induces an opposite charge on the tissue, attracting it." },
      { name:"Rainbow Walking Water", emoji:"🌈", category:"Physics", difficulty:"Beginner", time:"30 min",
        materials:["6 cups","Water","Food coloring (red, yellow, blue)","Paper towels"],
        steps:["Fill cups 1, 3, 5 with water and add different food coloring.","Leave cups 2, 4, 6 empty.","Fold paper towels into strips and bridge between cups.","Wait and watch the colors 'walk' and mix!"],
        science:"Capillary action draws water up through the tiny gaps in the paper towel fibers, defying gravity and mixing colors where they meet." },
      { name:"Egg in a Bottle", emoji:"🥚", category:"Physics", difficulty:"Intermediate", time:"15 min",
        materials:["Hard-boiled egg (peeled)","Glass bottle with opening slightly smaller than egg","Matches","Small piece of paper"],
        steps:["Peel the hard-boiled egg.","Light the paper and drop it into the bottle.","Quickly place the egg on the bottle opening.","Watch the egg get pushed inside!"],
        science:"The burning paper heats the air inside. When the flame goes out, the air cools and contracts, creating lower pressure inside. The higher atmospheric pressure outside pushes the egg in." },
      { name:"Density Tower", emoji:"🗼", category:"Physics", difficulty:"Intermediate", time:"25 min",
        materials:["Honey","Corn syrup","Dish soap","Water","Vegetable oil","Rubbing alcohol","Tall glass"],
        steps:["Pour honey into the glass first.","Slowly layer corn syrup, then dish soap.","Add water colored with food coloring.","Gently add vegetable oil, then rubbing alcohol.","Observe the distinct layers!"],
        science:"Each liquid has a different density (mass per unit volume). Denser liquids sink to the bottom while less dense ones float on top, creating visible layers." },
      { name:"DNA Extraction", emoji:"🧬", category:"Biology", difficulty:"Intermediate", time:"30 min",
        materials:["Strawberries","Dish soap","Salt","Rubbing alcohol (cold)","Zip-lock bag","Coffee filter","Cup"],
        steps:["Mash strawberries in the bag.","Add 1 tsp salt and 2 tsp dish soap with water, mix gently.","Strain through coffee filter into cup.","Slowly pour cold rubbing alcohol down the side.","Watch white stringy DNA appear!"],
        science:"The soap breaks open cell membranes, salt clumps proteins, and alcohol precipitates the DNA out of solution so you can see it with the naked eye." },
      { name:"Photosynthesis in Action", emoji:"🌿", category:"Biology", difficulty:"Beginner", time:"45 min",
        materials:["Aquatic plant (e.g. Elodea)","Clear glass","Water","Baking soda","Lamp"],
        steps:["Fill glass with water and add a pinch of baking soda.","Place the aquatic plant inside.","Shine a bright lamp on it.","Observe tiny bubbles forming on the leaves."],
        science:"The plant uses light energy to convert CO₂ (from baking soda) and water into glucose and oxygen. The bubbles are oxygen gas being released." },
      { name:"Erosion Simulation", emoji:"🏔️", category:"Earth Science", difficulty:"Beginner", time:"25 min",
        materials:["Sand","Soil","Rocks/pebbles","Baking tray","Watering can","Books for incline"],
        steps:["Prop one end of the tray with books to create a slope.","Layer sand, soil, and rocks on the raised end.","Slowly pour water from the top.","Observe how water moves the materials differently."],
        science:"Water erosion carries lighter particles farther than heavy ones. This models how rivers and rain shape landscapes over time through weathering and erosion." },
      { name:"Crystal Growing", emoji:"💎", category:"Chemistry", difficulty:"Intermediate", time:"3-7 days",
        materials:["Sugar or alum","Hot water","Glass jar","String","Pencil"],
        steps:["Dissolve as much sugar/alum as possible in hot water.","Pour into the jar.","Tie string to pencil and suspend in solution.","Wait several days for crystals to grow!"],
        science:"As water evaporates, the dissolved substance becomes supersaturated and molecules arrange into a repeating lattice structure — a crystal." },
      { name:"Earthquake-Proof Building", emoji:"🏗️", category:"Earth Science", difficulty:"Advanced", time:"60 min",
        materials:["Marshmallows","Toothpicks","Gelatin on a plate (to simulate ground)","Small weights"],
        steps:["Build structures using marshmallows and toothpicks.","Place them on the gelatin plate.","Shake the plate to simulate an earthquake.","Test which design survives best, then redesign!"],
        science:"Engineers use triangular bracing and flexible joints to resist seismic forces. This demonstrates structural engineering principles used in real earthquake-resistant buildings." },
      { name:"Fermentation Lab", emoji:"🍞", category:"Biology", difficulty:"Advanced", time:"45 min",
        materials:["Active dry yeast","Sugar","Warm water","Balloon","Plastic bottle","Measuring spoons"],
        steps:["Add warm water and 1 tsp sugar to the bottle.","Add 1 packet of yeast and swirl gently.","Stretch a balloon over the bottle opening.","Observe the balloon inflating over 20-30 minutes."],
        science:"Yeast performs anaerobic respiration (fermentation), consuming sugar and producing carbon dioxide gas and ethanol. The CO₂ inflates the balloon." },
    ];

    let activeCategory = "all";
    let activeDifficulty = "all";

    function renderCards() {
      const filtered = experiments.filter((e) => {
        const catMatch  = activeCategory === "all" || e.category === activeCategory;
        const diffMatch = activeDifficulty === "all" || e.difficulty === activeDifficulty;
        return catMatch && diffMatch;
      });
      grid.innerHTML = "";
      document.getElementById("emptyState").classList.toggle("hidden", filtered.length > 0);
      filtered.forEach((exp, i) => {
        const card = document.createElement("div");
        card.className = "exp-card";
        card.style.animationDelay = `${i * 0.06}s`;
        const diffClass = `badge-${exp.difficulty.toLowerCase()}`;
        card.innerHTML = `
          <div class="exp-card-emoji">${exp.emoji}</div>
          <div class="exp-card-title">${exp.name}</div>
          <div class="exp-card-meta">
            <span class="badge badge-category">${exp.category}</span>
            <span class="badge ${diffClass}">${exp.difficulty}</span>
          </div>
          <div class="exp-card-time">⏱ ${exp.time}</div>`;
        card.addEventListener("click", () => openModal(exp));
        grid.appendChild(card);
      });
    }

    // Filter clicks
    document.querySelectorAll("#categoryFilters .filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#categoryFilters .filter-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        activeCategory = btn.dataset.category;
        renderCards();
      });
    });
    document.querySelectorAll("#difficultyFilters .filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#difficultyFilters .filter-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        activeDifficulty = btn.dataset.difficulty;
        renderCards();
      });
    });

    renderCards();

    // ── Modal ──
    const overlay  = document.getElementById("modalOverlay");
    const closeBtn = document.getElementById("modalClose");
    function openModal(exp) {
      document.getElementById("modalTitle").textContent = exp.name;
      document.getElementById("modalCategory").textContent = exp.category;
      document.getElementById("modalCategory").className = "badge badge-category";
      const diffEl = document.getElementById("modalDifficulty");
      diffEl.textContent = exp.difficulty;
      diffEl.className = `badge badge-${exp.difficulty.toLowerCase()}`;
      document.getElementById("modalTime").textContent = `⏱ ${exp.time}`;
      const matList = document.getElementById("modalMaterials");
      matList.innerHTML = exp.materials.map((m) => `<li>${m}</li>`).join("");
      const stepList = document.getElementById("modalSteps");
      stepList.innerHTML = exp.steps.map((s) => `<li>${s}</li>`).join("");
      document.getElementById("modalScience").textContent = exp.science;
      overlay.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    }
    function closeModal() { overlay.classList.add("hidden"); document.body.style.overflow = ""; }
    closeBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
  }

  // ════════════════════════════════════════════════════════════
  //  INGREDIENT LAB
  // ════════════════════════════════════════════════════════════
  const ingForm = document.getElementById("ingredientForm");
  if (ingForm) {
    ingForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input  = document.getElementById("ingredientInput");
      const materials = input.value.trim();
      if (!materials) return;

      const submitBtn = document.getElementById("ingredientSubmit");
      const btnText   = submitBtn.querySelector(".btn-text");
      const btnLoader = document.getElementById("ingredientLoader");
      const results   = document.getElementById("ingredientResults");
      const cards     = document.getElementById("resultsCards");

      submitBtn.disabled = true;
      btnText.classList.add("hidden");
      btnLoader.classList.remove("hidden");

      const temperature = parseFloat(document.getElementById("ingTempSlider")?.value ?? 0.7);
      const top_p       = parseFloat(document.getElementById("ingTopPSlider")?.value ?? 0.9);

      try {
        const res = await fetch("/ingredient", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ materials, temperature, top_p }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        cards.innerHTML = `<div class="result-card">${renderMarkdownSimple(data.response)}</div>`;
        results.classList.remove("hidden");
      } catch (err) {
        cards.innerHTML = `<div class="result-card"><p>⚠️ ${err.message}</p></div>`;
        results.classList.remove("hidden");
      }
      submitBtn.disabled = false;
      btnText.classList.remove("hidden");
      btnLoader.classList.add("hidden");
    });
  }

  function renderMarkdownSimple(md) {
    let html = md
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h3>$1</h3>');
    const lines = html.split("\n");
    let out = "", inUl = false, inOl = false;
    for (let l of lines) {
      const t = l.trim();
      if (/^[-*] /.test(t)) { if (!inUl) { out += "<ul>"; inUl = true; } out += `<li>${t.slice(2)}</li>`; continue; }
      else if (inUl) { out += "</ul>"; inUl = false; }
      if (/^\d+\.\s/.test(t)) { if (!inOl) { out += "<ol>"; inOl = true; } out += `<li>${t.replace(/^\d+\.\s/, "")}</li>`; continue; }
      else if (inOl) { out += "</ol>"; inOl = false; }
      if (t === "") continue;
      if (t.startsWith("<h")) { out += t; continue; }
      out += `<p>${t}</p>`;
    }
    if (inUl) out += "</ul>";
    if (inOl) out += "</ol>";
    return out;
  }
});
