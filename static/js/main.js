/* ============================================================
   SciBot — Main JavaScript
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  // ─── Theme Toggle ───
  const themeToggle = document.getElementById("themeToggle");
  const currentTheme = localStorage.getItem("scibot-theme");
  if (currentTheme === "light") {
    document.body.classList.add("light-mode");
    if(themeToggle) themeToggle.textContent = "☀️";
  }
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("light-mode");
      let theme = "dark";
      if (document.body.classList.contains("light-mode")) {
        theme = "light";
        themeToggle.textContent = "☀️";
      } else {
        themeToggle.textContent = "🌙";
      }
      localStorage.setItem("scibot-theme", theme);
    });
  }

  // ─── Button Ripple Effect ───
  document.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", function(e) {
      const x = e.clientX - e.target.getBoundingClientRect().left;
      const y = e.clientY - e.target.getBoundingClientRect().top;
      const ripples = document.createElement("span");
      ripples.style.left = x + "px";
      ripples.style.top = y + "px";
      ripples.classList.add("ripple");
      this.appendChild(ripples);
      setTimeout(() => ripples.remove(), 600);
    });
  });

  // ─── Navbar Scroll Effect ───
  const navbar = document.getElementById("mainNav");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 20) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  });

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

  // ── Onboarding ──
  const overlay = document.getElementById("onboardingOverlay");
  let userProfile = JSON.parse(
    localStorage.getItem("scibot-profile") || "null"
  );

  if (overlay) {
    // If profile already exists skip onboarding
    if (userProfile) {
      overlay.style.display = "none";
      applyProfileToChat(userProfile);
    } else {
      // Show onboarding
      let selectedGrade = null;
      let currentStep = 1;

      document.querySelectorAll(".option-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const step = btn.closest(".onboarding-step");
          step.querySelectorAll(".option-btn")
            .forEach(b => b.classList.remove("selected"));
          btn.classList.add("selected");

          setTimeout(() => {
            if (currentStep === 1) {
              selectedGrade = btn.dataset.value;
              // Move to step 2
              document.getElementById("step1")
                .classList.add("hidden");
              document.getElementById("step2")
                .classList.remove("hidden");
              document.getElementById("dot1")
                .classList.remove("active");
              document.getElementById("dot2")
                .classList.add("active");
              currentStep = 2;
            } else {
              // Complete onboarding
              const profile = {
                grade: selectedGrade,
                subject: btn.dataset.value
              };
              localStorage.setItem(
                "scibot-profile", JSON.stringify(profile)
              );
              userProfile = profile;

              // Animate overlay out
              overlay.style.opacity = "0";
              overlay.style.transform = "scale(1.05)";
              setTimeout(() => {
                overlay.style.display = "none";
                applyProfileToChat(profile);
              }, 400);
            }
          }, 300);
        });
      });
    }
  }

  function applyProfileToChat(profile) {
    // Show a personalized greeting in the first bot message
    const gradeLabels = {
      "grade6-8": "Grade 6–8",
      "grade9-10": "Grade 9–10",
      "grade11-12": "Grade 11–12",
      "college": "College"
    };
    const gradeText = gradeLabels[profile.grade] || profile.grade;
    const subjectText = profile.subject;

    // Update the welcome bubble if it exists
    const firstBubble = document.querySelector(
      ".msg.bot .msg-bubble"
    );
    if (firstBubble) {
      firstBubble.innerHTML = `
        <p>Hey there, future scientist! 🧪 I'm <strong>SciBot</strong>.</p>
        <p>I can see you're a <strong>${gradeText}</strong> student
        interested in <strong>${subjectText}</strong>. 
        I'll tailor my experiments just for you!</p>
        <p>What would you like to explore today?</p>`;
    }

    // Also store profile globally for use in fetch calls
    window.scibotProfile = profile;
  }

  // ════════════════════════════════════════════════════════════
  //  CHATBOT PAGE
  // ════════════════════════════════════════════════════════════
  const chatForm   = document.getElementById("chatForm");
  const chatInput  = document.getElementById("chatInput");
  const chatWindow = document.getElementById("chatWindow");
  const sendBtn    = document.getElementById("sendBtn");

  if (chatForm) {
    let history = [];

    // Auto-resize textarea and send button glow
    chatInput.addEventListener("input", () => {
      chatInput.style.height = "auto";
      chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + "px";
      if(chatInput.value.trim().length > 0) {
        sendBtn.classList.add("has-text");
      } else {
        sendBtn.classList.remove("has-text");
      }
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
          body: JSON.stringify({
            message: text,
            history,
            temperature,
            top_p,
            grade: window.scibotProfile?.grade || "",
            subject: window.scibotProfile?.subject || ""
          }),
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
              const raw = line.slice(6).trim();
              if (!raw) continue;
              try {
                  const parsed = JSON.parse(raw);
                  if (parsed === "[DONE]") continue;
                  if (parsed.startsWith("[ERROR]")) {
                      fullReply += parsed;
                      break;
                  }
                  fullReply += parsed;
              } catch (err) {
                  // fallback for any unparseable chunk
                  fullReply += raw;
              }
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

    // Auto-fill chat input if coming from experiment detail page
    const prefill = sessionStorage.getItem("scibot-prefill");
    if (prefill && chatInput) {
      chatInput.value = prefill;
      sessionStorage.removeItem("scibot-prefill");
      chatInput.dispatchEvent(new Event("input"));
      chatInput.focus();
    }
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
    div.innerHTML = `<div class="msg-avatar">🤖</div><div class="msg-bubble typing-indicator">SciBot is thinking... <span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`;
    return div;
  }

  function scrollChat() { if (chatWindow) chatWindow.scrollTop = chatWindow.scrollHeight; }

  // ── Minimal Markdown renderer ──
  function renderMarkdown(md) {
    // Step 1: Escape HTML
    let html = md
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Step 2: Fix broken markdown links like [text](url) showing as plain text
    html = html.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");

    // Step 3: Bold and italic
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    html = html.replace(/`(.+?)`/g, "<code>$1</code>");

    // Step 4: Headings
    html = html.replace(/^### (.+)$/gm, "<h4>$1</h4>");
    html = html.replace(/^## (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^# (.+)$/gm, "<h2>$1</h2>");

    // Step 5: Process line by line
    const lines = html.split("\n");
    let out = "";
    let inUl = false;
    let inOl = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Unordered list item (- or *)
      if (/^[-*]\s+/.test(line)) {
        if (inOl) { out += "</ol>"; inOl = false; }
        if (!inUl) { out += "<ul>"; inUl = true; }
        out += `<li>${line.replace(/^[-*]\s+/, "")}</li>`;
        continue;
      }

      // Ordered list item (1. 2. 3.)
      if (/^\d+\.\s+/.test(line)) {
        if (inUl) { out += "</ul>"; inUl = false; }
        if (!inOl) { out += "<ol>"; inOl = true; }
        out += `<li>${line.replace(/^\d+\.\s+/, "")}</li>`;
        continue;
      }

      // Close open lists
      if (inUl) { out += "</ul>"; inUl = false; }
      if (inOl) { out += "</ol>"; inOl = false; }

      // Empty line
      if (line === "") { out += "<br>"; continue; }

      // Already a heading tag
      if (/^<h[2-4]>/.test(line)) { out += line; continue; }

      // Regular paragraph
      out += `<p>${line}</p>`;
    }

    // Close any unclosed lists
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
        detailedSteps:[
          "Set the plastic bottle upright in the centre of the tray. The tray will catch all the overflow, so make sure the sides are at least 3 cm high.",
          "Using a spoon, carefully add exactly 2 tablespoons of baking soda (sodium bicarbonate) into the bottle. Shake it gently so it settles to the bottom.",
          "Squeeze in 5–6 drops of red or orange food coloring and a generous squirt of dish soap. The soap acts as a foaming agent that will make the eruption more dramatic.",
          "Slowly pour 100 ml of white vinegar directly into the bottle opening. Step back at least 30 cm immediately — the reaction starts within 2–3 seconds. Watch the vivid foam surge upward and overflow like a real lava flow!"
        ],
        science:"This demonstrates an acid-base reaction. Vinegar (acetic acid) reacts with baking soda (sodium bicarbonate) producing carbon dioxide gas, which creates the foamy eruption.",
        funFact:"Real volcanoes erupt due to dissolved gases in magma — just like the CO₂ in your bottle, the pressure buildup eventually forces the material out!",
        safety:["Keep vinegar away from eyes — it can sting; wear safety glasses if available.","Do the experiment on a surface that can get wet, or outdoors.","Wash hands thoroughly after handling food coloring to avoid staining."]
      },
      { name:"Invisible Ink", emoji:"🔍", category:"Chemistry", difficulty:"Beginner", time:"20 min",
        materials:["Lemon juice","Cotton swab","White paper","Lamp or iron"],
        steps:["Dip cotton swab in lemon juice.","Write a secret message on paper.","Let it dry completely.","Hold paper near a warm lamp or iron to reveal the message."],
        detailedSteps:[
          "Squeeze fresh lemon juice into a small bowl or cup. Dip a clean cotton swab into the juice, soaking it well but not dripping.",
          "Write your secret message on plain white paper using the soaked cotton swab. Press firmly so enough juice transfers. The writing will be nearly invisible when wet.",
          "Set the paper aside and wait 10–15 minutes until it is completely dry. At this stage you should see almost nothing — that is perfect!",
          "Hold the paper about 10 cm above a warm lamp bulb or ask an adult to run a warm iron over it (cotton setting, no steam). After 20–30 seconds, the message will appear in light brown letters."
        ],
        science:"Lemon juice is an organic substance that oxidizes and turns brown when heated, making the invisible writing appear.",
        funFact:"Spies in World War I actually used lemon juice and milk as invisible inks to send secret messages that looked like ordinary blank paper!",
        safety:["Never hold paper directly on a hot iron without adult supervision.","Keep the lamp or heat source at a safe distance to avoid burning the paper.","Wash hands after handling citrus juice if you have any skin sensitivity."]
      },
      { name:"Static Electricity Butterfly", emoji:"🦋", category:"Physics", difficulty:"Beginner", time:"10 min",
        materials:["Tissue paper","Balloon","Scissors","Wool sweater"],
        steps:["Cut a small butterfly from tissue paper.","Inflate the balloon.","Rub the balloon vigorously on the wool sweater.","Hold balloon close to the butterfly to make it 'fly'."],
        detailedSteps:[
          "Cut a butterfly shape roughly 8–10 cm wide from a single sheet of tissue paper. Tissue paper works best because it is extremely lightweight — the lighter the better for this experiment.",
          "Blow up the balloon to about 20 cm diameter and tie it securely. Place the tissue butterfly flat on a table.",
          "Rub the inflated balloon back and forth vigorously on the wool sweater for at least 30 seconds. You may hear a faint crackling sound — that is static charge building up on the surface.",
          "Slowly lower the charged balloon to within 2–3 cm of the tissue butterfly. Watch it leap up and stick! Move the balloon in a circular path and the butterfly will follow, appearing to fly through the air."
        ],
        science:"Rubbing the balloon creates a static charge by transferring electrons. The charged balloon induces an opposite charge on the tissue, attracting it.",
        funFact:"Lightning is simply a massive static electricity discharge — the same force attracting your tissue butterfly, but scaled up to 300 million volts!",
        safety:["Avoid bringing the charged balloon near sensitive electronics as static can damage them.","Rub the balloon on dry wool only — wet materials will not generate a useful charge.","Do not over-inflate the balloon to reduce the chance of it popping unexpectedly."]
      },
      { name:"Rainbow Walking Water", emoji:"🌈", category:"Physics", difficulty:"Beginner", time:"30 min",
        materials:["6 cups","Water","Food coloring (red, yellow, blue)","Paper towels"],
        steps:["Fill cups 1, 3, 5 with water and add different food coloring.","Leave cups 2, 4, 6 empty.","Fold paper towels into strips and bridge between cups.","Wait and watch the colors 'walk' and mix!"],
        detailedSteps:[
          "Arrange 6 clear cups in a row. Fill cups 1, 3, and 5 with water to about 3/4 full. Add 10 drops of red food coloring to cup 1, yellow to cup 3, and blue to cup 5.",
          "Leave cups 2, 4, and 6 completely empty. These are the mixing chambers where the colors will combine to form secondary colors.",
          "Fold three paper towels lengthwise into thin strips. Drape one strip from cup 1 to cup 2, another from cup 2 to cup 3, and so on until all adjacent cups are bridged.",
          "Set a timer and observe every 5 minutes. Within 15–30 minutes you will see colored water traveling up and over each paper towel bridge. Cups 2, 4, and 6 will gradually fill with orange, green, and purple water!"
        ],
        science:"Capillary action draws water up through the tiny gaps in the paper towel fibers, defying gravity and mixing colors where they meet.",
        funFact:"Plants rely on capillary action to transport water from their roots all the way to the tips of their tallest leaves — some trees pull water up over 100 metres!",
        safety:["Use food-grade coloring only and avoid contact with eyes.","Lay down newspaper under the cups in case of spills.","Dispose of the colored water safely — do not pour large quantities down a drain in one go."]
      },
      { name:"Egg in a Bottle", emoji:"🥚", category:"Physics", difficulty:"Intermediate", time:"15 min",
        materials:["Hard-boiled egg (peeled)","Glass bottle with opening slightly smaller than egg","Matches","Small piece of paper"],
        steps:["Peel the hard-boiled egg.","Light the paper and drop it into the bottle.","Quickly place the egg on the bottle opening.","Watch the egg get pushed inside!"],
        detailedSteps:[
          "Hard-boil an egg for 10 minutes, cool it under cold water, then peel it completely. The egg must be slightly wider than the bottle's mouth — a standard milk bottle or wide-mouth glass jar works perfectly.",
          "Tear a small strip of paper about 5 cm long. Ask an adult to light one end with a match, then quickly drop the burning paper into the bottle.",
          "Immediately place the peeled egg small-end-down onto the bottle's mouth, sealing it like a stopper. Press lightly to ensure a firm seal around the rim.",
          "Watch for 10–15 seconds as the flame consumes the oxygen inside. The egg will start to bulge inward, then pop through the opening with a satisfying thud as air pressure pushes it in!"
        ],
        science:"The burning paper heats the air inside. When the flame goes out, the air cools and contracts, creating lower pressure inside. The higher atmospheric pressure outside pushes the egg in.",
        funFact:"Atmospheric pressure at sea level is about 101,325 pascals — roughly equivalent to a 10-tonne weight pressing on every square metre of the egg's surface!",
        safety:["This experiment requires adult supervision due to the use of matches and open flame.","Use a glass or heat-resistant bottle only — plastic can warp or melt.","Keep a glass of water nearby to immediately extinguish matches after use."]
      },
      { name:"Density Tower", emoji:"🗼", category:"Physics", difficulty:"Intermediate", time:"25 min",
        materials:["Honey","Corn syrup","Dish soap","Water","Vegetable oil","Rubbing alcohol","Tall glass"],
        steps:["Pour honey into the glass first.","Slowly layer corn syrup, then dish soap.","Add water colored with food coloring.","Gently add vegetable oil, then rubbing alcohol.","Observe the distinct layers!"],
        detailedSteps:[
          "Start with the tallest, clearest glass you can find. Carefully pour 2–3 tablespoons of honey into the bottom. Pour it slowly down the centre to avoid coating the sides.",
          "Tilt the glass slightly and pour corn syrup gently along the inside edge so it slides under the honey without mixing. Add dish soap the same way — each layer should be clearly separate.",
          "Mix a few drops of food coloring into water in a separate cup. Slowly pour the colored water down a spoon held just above the dish soap layer so it lands gently.",
          "Using the same spoon technique, layer vegetable oil above the water. Finally, pour rubbing alcohol (colored with a different food coloring) as the top layer. You should now see 6 distinct, colorful horizontal bands!"
        ],
        science:"Each liquid has a different density (mass per unit volume). Denser liquids sink to the bottom while less dense ones float on top, creating visible layers.",
        funFact:"The Dead Sea is so dense with dissolved salt that humans float on its surface without swimming — its water is nearly 10 times saltier than typical ocean water!",
        safety:["Rubbing alcohol is flammable — keep it away from open flames and heat sources.","Wear gloves when handling rubbing alcohol if you have sensitive skin.","Do not drink any of the liquids in this experiment, especially the rubbing alcohol."]
      },
      { name:"DNA Extraction", emoji:"🧬", category:"Biology", difficulty:"Intermediate", time:"30 min",
        materials:["Strawberries","Dish soap","Salt","Rubbing alcohol (cold)","Zip-lock bag","Coffee filter","Cup"],
        steps:["Mash strawberries in the bag.","Add 1 tsp salt and 2 tsp dish soap with water, mix gently.","Strain through coffee filter into cup.","Slowly pour cold rubbing alcohol down the side.","Watch white stringy DNA appear!"],
        detailedSteps:[
          "Place 2–3 ripe strawberries in a zip-lock bag and seal it. Squeeze and squish for 2 full minutes until the strawberries are completely mashed into a smooth liquid pulp.",
          "Add 1 teaspoon of salt, 2 teaspoons of dish soap, and 2 tablespoons of cold water to the bag. Seal it again and mix by gently rolling and kneading — do NOT shake, as bubbles will interfere with extraction.",
          "Place a coffee filter inside a clear cup or glass. Pour the strawberry mixture into the filter and allow it to drain naturally for 5 minutes. The filtered liquid contains the DNA.",
          "Tilt the cup slightly and slowly pour ice-cold rubbing alcohol down the inside edge so it forms a clear layer above the red liquid. Within 30 seconds, you will see white, stringy clumps rising into the alcohol layer — that is real strawberry DNA you can see with the naked eye!"
        ],
        science:"The soap breaks open cell membranes, salt clumps proteins, and alcohol precipitates the DNA out of solution so you can see it with the naked eye.",
        funFact:"Strawberries are octoploid — they have 8 copies of each chromosome, which is why they produce so much visible DNA compared to most other fruits!",
        safety:["Use cold rubbing alcohol straight from the fridge — warm alcohol evaporates too quickly and gives poor results.","Handle rubbing alcohol away from flames and in a ventilated space.","Wash hands after the experiment; rubbing alcohol can dry out and irritate skin."]
      },
      { name:"Photosynthesis in Action", emoji:"🌿", category:"Biology", difficulty:"Beginner", time:"45 min",
        materials:["Aquatic plant (e.g. Elodea)","Clear glass","Water","Baking soda","Lamp"],
        steps:["Fill glass with water and add a pinch of baking soda.","Place the aquatic plant inside.","Shine a bright lamp on it.","Observe tiny bubbles forming on the leaves."],
        detailedSteps:[
          "Fill a clear glass or beaker with room-temperature water. Stir in a small pinch (about 1/4 teaspoon) of baking soda — this dissolves into CO₂ which the plant will use for photosynthesis.",
          "Carefully place a fresh sprig of Elodea (available at pet shops) or any aquatic plant into the water. Position it so the cut stem end faces upward for maximum bubble visibility.",
          "Position a bright desk lamp about 15 cm away from the glass. Use the strongest bulb available — the brighter the light, the faster photosynthesis will occur.",
          "Observe closely over the next 10–20 minutes. You will see tiny bubbles forming on the leaf surfaces and rising to the top. Count the bubbles per minute to measure the rate of photosynthesis — try moving the lamp closer and further away to see how light intensity affects the rate!"
        ],
        science:"The plant uses light energy to convert CO₂ (from baking soda) and water into glucose and oxygen. The bubbles are oxygen gas being released.",
        funFact:"A single mature tree produces enough oxygen every day to supply the breathing needs of 2 adult humans for an entire 24-hour period!",
        safety:["Do not leave a desk lamp unattended for long periods as bulbs can overheat.","Aquatic plants can irritate sensitive skin — wash hands after handling.","Use room-temperature water; cold tap water slows the plant's metabolism significantly."]
      },
      { name:"Erosion Simulation", emoji:"🏔️", category:"Earth Science", difficulty:"Beginner", time:"25 min",
        materials:["Sand","Soil","Rocks/pebbles","Baking tray","Watering can","Books for incline"],
        steps:["Prop one end of the tray with books to create a slope.","Layer sand, soil, and rocks on the raised end.","Slowly pour water from the top.","Observe how water moves the materials differently."],
        detailedSteps:[
          "Place a baking tray on a flat table. Stack 3–4 books under one end to create a 30–40 degree slope. Make sure the tray is stable and won't slide.",
          "Build a miniature landscape on the raised end: place larger rocks first, then a layer of soil, then loose sand on top. Pat it into a gentle mound shape — this represents a hillside or mountain.",
          "Fill a watering can with water and position an empty container at the lower end of the tray to collect runoff. From a height of about 30 cm, pour a slow, steady stream of water onto the top of your mound.",
          "Watch carefully as the water flows down: sand moves first and travels furthest, soil moves moderately and clumps, while rocks stay nearly in place. After 3–4 pours, compare how far different materials have traveled — you are watching erosion happen in real time!"
        ],
        science:"Water erosion carries lighter particles farther than heavy ones. This models how rivers and rain shape landscapes over time through weathering and erosion.",
        funFact:"The Grand Canyon was carved entirely by the Colorado River over about 5–6 million years — erosion is one of the most powerful forces shaping Earth's surface!",
        safety:["Do the experiment near a sink or outside to handle water spills easily.","Dry sand can become airborne — pour water gently to avoid dust clouds.","Wash hands after handling soil, which can contain natural bacteria."]
      },
      { name:"Crystal Growing", emoji:"💎", category:"Chemistry", difficulty:"Intermediate", time:"3-7 days",
        materials:["Sugar or alum","Hot water","Glass jar","String","Pencil"],
        steps:["Dissolve as much sugar/alum as possible in hot water.","Pour into the jar.","Tie string to pencil and suspend in solution.","Wait several days for crystals to grow!"],
        detailedSteps:[
          "Ask an adult to heat 250 ml of water until almost boiling. Slowly stir in alum (potassium aluminium sulfate, available at pharmacies) one tablespoon at a time. Keep adding and stirring until no more will dissolve — this creates a supersaturated solution.",
          "Allow the solution to cool for 5 minutes, then carefully pour it into a clean glass jar. Do not pour in any undissolved crystals at the bottom.",
          "Tie one end of a piece of string or thread to the middle of a pencil. The string should be long enough to hang into the jar without touching the bottom. Rest the pencil across the jar rim so the string hangs inside the solution.",
          "Place the jar in a quiet spot where it will not be disturbed and cover loosely with a paper towel to keep dust out. Check every 24 hours — after 3–7 days you will see beautiful geometric crystals growing on the string. The longer you wait, the larger they get!"
        ],
        science:"As water evaporates, the dissolved substance becomes supersaturated and molecules arrange into a repeating lattice structure — a crystal.",
        funFact:"Diamonds are crystals of pure carbon — the same element in graphite pencil lead, but arranged in a completely different crystal structure that makes them the hardest natural substance on Earth!",
        safety:["Use oven mitts when handling hot water and ask an adult to boil water for you.","Alum solution can irritate eyes — avoid splashing and wash hands after handling.","Keep the growing jar away from vibrations, which can disrupt crystal formation."]
      },
      { name:"Earthquake-Proof Building", emoji:"🏗️", category:"Earth Science", difficulty:"Advanced", time:"60 min",
        materials:["Marshmallows","Toothpicks","Gelatin on a plate (to simulate ground)","Small weights"],
        steps:["Build structures using marshmallows and toothpicks.","Place them on the gelatin plate.","Shake the plate to simulate an earthquake.","Test which design survives best, then redesign!"],
        detailedSteps:[
          "Prepare a large flat plate of set gelatin (jello) to represent unstable ground. Use marshmallows as joints and toothpicks as beams to build your first structure — start with a simple cube, 4 toothpicks tall and 4 wide.",
          "Place your structure on the gelatin plate. Gently shake the plate side to side for 10 seconds to simulate a mild earthquake. Note which joints or beams fail first.",
          "Now redesign with engineering principles in mind: add diagonal cross-braces on each face using extra toothpicks — triangles are much stronger than squares. Make the base wider than the top to lower the centre of gravity.",
          "Test your improved design with progressively stronger shaking, then add small coins or clay lumps as weights on top (representing a building's contents). Compare how many weights each design can hold before collapsing. Document your findings and iterate — real engineers run dozens of tests before finalising a design!"
        ],
        science:"Engineers use triangular bracing and flexible joints to resist seismic forces. This demonstrates structural engineering principles used in real earthquake-resistant buildings.",
        funFact:"Japan's Tokyo Skytree — the world's tallest tower — uses a central concrete shaft that sways independently of the outer structure, absorbing earthquake energy like a giant shock absorber!",
        safety:["Toothpicks have sharp ends — handle carefully and dispose of broken ones safely.","Do not eat the marshmallows after the experiment as they may pick up germs during handling.","Wash hands thoroughly after handling gelatin to remove food residue."]
      },
      { name:"Fermentation Lab", emoji:"🍞", category:"Biology", difficulty:"Advanced", time:"45 min",
        materials:["Active dry yeast","Sugar","Warm water","Balloon","Plastic bottle","Measuring spoons"],
        steps:["Add warm water and 1 tsp sugar to the bottle.","Add 1 packet of yeast and swirl gently.","Stretch a balloon over the bottle opening.","Observe the balloon inflating over 20-30 minutes."],
        detailedSteps:[
          "Pour 250 ml of warm water (about 37°C — comfortably warm to the touch, like a bath) into a clean plastic bottle. Water that is too hot will kill the yeast; too cold and the yeast stay dormant.",
          "Add exactly 1 teaspoon of white sugar to the warm water and swirl the bottle gently for 30 seconds until the sugar dissolves completely. Sugar is the food source the yeast will consume.",
          "Add one 7g packet of active dry yeast to the bottle. Swirl gently — do not shake vigorously. Stretch the opening of a balloon and fit it tightly over the neck of the bottle, sealing it completely.",
          "Set the bottle in a warm location (near a warm lamp or on a sunny windowsill) and observe every 5 minutes. Within 10–15 minutes, the yeast will become active and you will see the balloon slowly inflating as CO₂ gas is produced. At the 30-minute mark, measure the balloon circumference with a piece of string and compare results with different sugar quantities!"
        ],
        science:"Yeast performs anaerobic respiration (fermentation), consuming sugar and producing carbon dioxide gas and ethanol. The CO₂ inflates the balloon.",
        funFact:"The same fermentation process used in this experiment is what makes bread rise, beer ferment, and yogurt form — humans have been harnessing yeast for over 5,000 years!",
        safety:["Use warm, not hot, water — temperatures above 45°C kill yeast and ruin the experiment.","Do not inhale directly from the balloon; the CO₂ concentration inside can cause dizziness.","Clean up immediately after the experiment as yeast mixtures can develop a strong odour if left out."]
      },
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
        card.setAttribute("data-cat", exp.category);
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
        card.addEventListener("click", () => {
          sessionStorage.setItem("scibot-experiment", JSON.stringify(exp));
          sessionStorage.setItem("scibot-exp-index", i);
          window.open(`/experiment/${i}`, "_blank");
        });
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
      document.documentElement.classList.add("modal-open");
    }
    function closeModal() { overlay.classList.add("hidden"); document.documentElement.classList.remove("modal-open"); }
    closeBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
  }

  // ════════════════════════════════════════════════════════════
  //  INGREDIENT LAB
  // ════════════════════════════════════════════════════════════
  const ingInput = document.getElementById("ingredientInput");
  if(ingInput) {
    const placeholders = [
      "e.g. baking soda, vinegar, food coloring",
      "e.g. balloon, string, water, salt",
      "e.g. milk, dish soap, cotton swab",
      "e.g. lemon, copper wire, nail"
    ];
    let pIdx = 0;
    setInterval(() => {
      pIdx = (pIdx + 1) % placeholders.length;
      ingInput.setAttribute("placeholder", placeholders[pIdx]);
    }, 3000);
  }

  const ingForm = document.getElementById("ingredientForm");
  if (ingForm) {
    // Store all 4 experiments and track current index
    let allExperiments = [];
    let currentExpIndex = 0;

    ingForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = document.getElementById("ingredientInput");
      const materials = input.value.trim();
      if (!materials) return;

      const submitBtn  = document.getElementById("ingredientSubmit");
      const btnText    = submitBtn.querySelector(".btn-text");
      const btnLoader  = document.getElementById("ingredientLoader");
      const results    = document.getElementById("ingredientResults");
      const cardEl     = document.getElementById("resultsCards");

      submitBtn.disabled = true;
      btnText.classList.add("hidden");
      btnLoader.classList.remove("hidden");
      results.classList.add("hidden");
      allExperiments = [];
      currentExpIndex = 0;

      const temperature = parseFloat(
        document.getElementById("ingTempSlider")?.value ?? 0.7
      );
      const top_p = parseFloat(
        document.getElementById("ingTopPSlider")?.value ?? 0.9
      );

      try {
        const res  = await fetch("/ingredient", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ materials, temperature, top_p }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        // Split by the strict markers
        const rawText = data.response;
        const parts = rawText
          .split(/---EXPERIMENT_\d+---/)
          .map(p => p.trim())
          .filter(p => p.length > 20);

        if (parts.length >= 2) {
          allExperiments = parts.slice(0, 4);
        } else {
          // Fallback split if model didn't follow format
          const fallback = rawText.split(
            /(?=#{1,4}\s*Experiment\s*[1234])/i
          ).map(p => p.trim()).filter(p => p.length > 20);
          allExperiments = fallback.length >= 2
            ? fallback.slice(0, 4)
            : [rawText];
        }

        currentExpIndex = 0;
        showExperiment(currentExpIndex);
        results.classList.remove("hidden");

      } catch (err) {
        cardEl.innerHTML = `
          <div class="result-card">
            <p>⚠️ ${err.message}</p>
          </div>`;
        results.classList.remove("hidden");
      }

      submitBtn.disabled = false;
      btnText.classList.remove("hidden");
      btnLoader.classList.add("hidden");
    });

    function showExperiment(index) {
      const cardEl    = document.getElementById("resultsCards");
      const counterEl = document.getElementById("expCounter");
      const total     = allExperiments.length;

      // Clean content — remove heading marker if present
      const content = allExperiments[index]
        .replace(/^#{1,4}\s*Experiment\s*\d+[:\-]?\s*/i, "")
        .trim();

      // Animate out then in
      cardEl.style.opacity = "0";
      cardEl.style.transform = "translateY(10px)";

      setTimeout(() => {
        cardEl.innerHTML = `
          <div class="result-card">
            <div class="result-card-topbar">
              <div class="result-card-number">
                Experiment ${index + 1} of ${total}
              </div>
              <div class="exp-dots">
                ${allExperiments.map((_, i) => `
                  <span class="exp-dot ${i === index ? 'active' : ''}"
                    onclick="jumpToExperiment(${i})">
                  </span>`).join("")}
              </div>
            </div>
            ${renderMarkdownSimple(content)}
          </div>`;

        // Update counter
        if (counterEl) counterEl.textContent =
          `${index + 1} / ${total}`;

        // Update shuffle button state
        const shuffleBtn = document.getElementById("shuffleBtn");
        if (shuffleBtn) {
          const nextIdx = (index + 1) % total;
          shuffleBtn.querySelector(".shuffle-label").textContent =
            nextIdx === 0
              ? "↩ Back to First"
              : `Next Experiment →`;
        }

        cardEl.style.transition = "opacity 0.35s ease, transform 0.35s ease";
        cardEl.style.opacity = "1";
        cardEl.style.transform = "translateY(0)";
      }, 200);
    }

    // Shuffle / cycle button
    const shuffleBtn = document.getElementById("shuffleBtn");
    if (shuffleBtn) {
      shuffleBtn.addEventListener("click", () => {
        if (allExperiments.length === 0) return;
        currentExpIndex = (currentExpIndex + 1) % allExperiments.length;
        showExperiment(currentExpIndex);
      });
    }

    // Global jump function for dot navigation
    window.jumpToExperiment = function(index) {
      if (index >= 0 && index < allExperiments.length) {
        currentExpIndex = index;
        showExperiment(index);
      }
    };
  }

  function renderMarkdownSimple(md) {
    let html = md
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Remove broken markdown links
    html = html.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");

    // Bold and italic
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    html = html.replace(/`(.+?)`/g, "<code>$1</code>");

    // Headings — handle #### ## # all levels
    html = html.replace(/^#{4}\s+(.+)$/gm, "<h4>$1</h4>");
    html = html.replace(/^#{3}\s+(.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^#{2}\s+(.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^#{1}\s+(.+)$/gm, "<h2>$1</h2>");

    const lines = html.split("\n");
    let out = "", inUl = false, inOl = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (/^[-*]\s+/.test(line)) {
        if (inOl) { out += "</ol>"; inOl = false; }
        if (!inUl) { out += "<ul>"; inUl = true; }
        out += `<li>${line.replace(/^[-*]\s+/, "")}</li>`;
        continue;
      }
      if (/^\d+\.\s+/.test(line)) {
        if (inUl) { out += "</ul>"; inUl = false; }
        if (!inOl) { out += "<ol>"; inOl = true; }
        out += `<li>${line.replace(/^\d+\.\s+/, "")}</li>`;
        continue;
      }
      if (inUl) { out += "</ul>"; inUl = false; }
      if (inOl) { out += "</ol>"; inOl = false; }
      if (line === "") { out += "<br>"; continue; }
      if (/^<h[2-4]>/.test(line)) { out += line; continue; }
      out += `<p>${line}</p>`;
    }
    if (inUl) out += "</ul>";
    if (inOl) out += "</ol>";
    return out;
  }
});
