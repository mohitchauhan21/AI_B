# SciBot — AI Science Experiment Recommender ⚗️

SciBot is a full-stack AI-powered web application designed to recommend, explain, and guide users through educational science experiments. Built with a dark, futuristic laboratory aesthetic, it features a streaming chatbot, a curated experiment explorer, and an interactive ingredient lab.

## 🚀 Features

### 1. Main Chatbot (`/`)
- Interactive chat interface where users can ask for science experiment recommendations.
- Streams responses in real-time from the **Groq API** using the `llama-3.3-70b-versatile` model.
- Maintains session-based conversation history.
- Enforces domain-specific constraints via system prompts (only discusses science/educational topics).
- Includes a collapsible Model Config panel to adjust **Temperature** and **Top-p** settings on the fly.

### 2. Experiment Explorer (`/explorer`)
- A visually appealing grid of 12 curated science experiments.
- **Filters** by Category (Physics, Chemistry, Biology, Earth Science) and Difficulty (Beginner, Intermediate, Advanced).
- Displays key details at a glance: category, difficulty badge, and estimated time.
- Clicking a card opens a modal revealing required materials, step-by-step instructions, and the scientific concepts explained.

### 3. Ingredient Lab (`/ingredient-lab`)
- Allows users to input comma-separated materials they have at home.
- Submits the materials to the Groq API, which generates exactly 3 custom science experiments based on the input.
- Displays the generated suggestions as beautifully formatted, easy-to-read cards.
- Includes a Model Config panel to tweak the AI's creativity.

## 🛠️ Tech Stack

- **Backend:** Python, Flask
- **Frontend:** HTML5, Vanilla JavaScript, Custom CSS (Glassmorphism, Animations)
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
│   │   └── style.css      # Custom dark futuristic theme
│   └── js/
│       └── main.js        # Frontend logic (streaming, filters, modals)
└── templates/
    ├── base.html          # Base layout with navbar and animations
    ├── index.html         # Chatbot UI
    ├── explorer.html      # Experiment grid UI
    └── ingredient_lab.html# Material input UI
```

## 🎨 UI/UX Highlights
- **Theme:** Dark, futuristic laboratory aesthetic.
- **Color Palette:** Deep navy/black background, neon green, and cyan accents.
- **Effects:** Glassmorphism styling for cards and modals, smooth hover micro-animations, and a subtle animated particle background.
- **Typography:** Orbitron for technical headings, Exo 2 for readable body text.
- **Responsiveness:** Fully responsive design that works seamlessly on desktop and mobile devices.

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
