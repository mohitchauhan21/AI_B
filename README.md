# SciBot — AI Science Experiment Recommender ⚗️

SciBot is a full-stack AI-powered web application designed to recommend, explain, and guide users through educational science experiments. Built with a stunning dark/light futuristic laboratory aesthetic, it features a highly conversational streaming chatbot, a curated experiment explorer, and an interactive ingredient lab.

## 🚀 Features

### 1. Conversational Chatbot (`/`)
- **Smart Conversational AI:** System logic dictates that the bot behaves like a friendly science teacher. It naturally handles casual greetings, asks clarifying questions before suggesting experiments, and avoids unsolicited long text dumps.
- **Real-Time Streaming:** Streams responses seamlessly from the **Groq API** using the `llama-3.3-70b-versatile` model.
- **Dynamic UI:** Features a chat window that auto-expands after the landing hero section hides, distinct user/bot message bubbles, a glowing input bar, a pulsing send button, and an animated "SciBot is thinking..." state.

### 2. Experiment Explorer (`/explorer`)
- A visually appealing grid of 12 curated science experiments.
- **Interactive Cards:** Hover over cards to see a smooth shimmer effect, lift animation, and emoji scaling. Each card features a glowing colored top border indicating its category (Chemistry, Physics, Biology, Earth Science).
- **Filters:** Instantly sort by Category and Difficulty (Beginner, Intermediate, Advanced).
- **Frosted Glass Modal:** Clicking a card opens an animated frosted glass modal revealing materials (prefixed with ✅), numbered step-by-step instructions (with glowing circles), and a highlighted science explanation box.

### 3. Ingredient Lab (`/ingredient-lab`)
- **Animated Beaker:** Features a playful, pure-CSS animated bubbling beaker illustration.
- **Smart Input:** A dynamic input field with a cycling placeholder that suggests common household materials every 3 seconds.
- Allows users to input comma-separated materials they have at home.
- Submits the materials to the Groq API, generating exactly 3 custom science experiments based on the input.
- Displays the generated suggestions instantly with staggered fade-in animations and numbered neon headers.

## 🎨 UI/UX Highlights
- **Light/Dark Theme Toggle:** Click the 🌙 / ☀️ icon in the navbar to switch themes. Preferences are saved automatically via `localStorage`.
- **Aesthetic:** Features deep navy/black backgrounds, neon green and cyan accents, and glassmorphism styling.
- **Animations:** Custom animated background particles, smooth page load fade-ins, and interactive ripple click effects on buttons.
- **Typography:** Orbitron for technical headings, Exo 2 for readable body text.
- **Responsiveness:** Fully responsive design that works seamlessly on desktop and mobile devices, including a smooth slide-down mobile menu.

## 🛠️ Tech Stack

- **Backend:** Python, Flask
- **Frontend:** HTML5, Vanilla JavaScript, Custom CSS 
- **AI Integration:** Groq Python SDK (Model: `llama-3.3-70b-versatile`)
- **Environment:** `python-dotenv` for managing API keys.

## 📂 Project Structure

```text
science-recommender/
├── app.py                 # Main Flask application and API endpoints
├── .env                   # Environment variables (API Key)
├── requirements.txt       # Python dependencies
├── static/
│   ├── css/
│   │   └── style.css      # Custom theming, animations, and layout
│   └── js/
│       └── main.js        # Frontend logic (streaming, theme toggle, dynamic UI)
└── templates/
    ├── base.html          # Base layout with navbar and theme toggle
    ├── index.html         # Chatbot UI
    ├── explorer.html      # Experiment grid UI
    └── ingredient_lab.html# Material input UI
```

## ⚙️ Setup and Installation

1. **Clone the repository** (or navigate to the project directory).

2. **Create a virtual environment (optional but recommended):**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```

3. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables:**
   - Open the `.env` file in the root directory.
   - Replace the placeholder with your actual Groq API key:
     ```env
     GROQ_API_KEY=gsk_your_actual_api_key_here
     ```

5. **Run the Application:**
   ```bash
   python app.py
   ```

6. **Access the App:**
   - Open your web browser and navigate to `http://127.0.0.1:5000`
