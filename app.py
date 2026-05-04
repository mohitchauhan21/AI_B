"""
SciBot — AI Science Experiment Recommender
Flask backend with Groq LLM integration.
"""

import os
from flask import Flask, render_template, request, jsonify, Response, stream_with_context
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# ---------------------------------------------------------------------------
# Groq client
# ---------------------------------------------------------------------------

raw_key = os.getenv("GROQ_API_KEY", "").strip().strip('"').strip("'")
client = Groq(api_key=raw_key)

MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = (
    "You are SciBot, an expert science experiment guide for students. "
    "You ONLY discuss science experiments, scientific concepts, and related "
    "educational topics. For every experiment you suggest, always include: "
    "required materials, step-by-step instructions, safety precautions, and "
    "the scientific concept being demonstrated. Be encouraging and age-appropriate."
)

INGREDIENT_SYSTEM_PROMPT = (
    "You are SciBot, an expert science experiment guide. The user will provide "
    "a list of materials they have at home. Suggest exactly 3 creative science "
    "experiments they can do with those materials. For each experiment provide:\n"
    "1. A catchy experiment name\n"
    "2. Which of the provided materials are used\n"
    "3. Step-by-step instructions\n"
    "4. Safety precautions\n"
    "5. The scientific concept demonstrated\n\n"
    "Format each experiment with clear headings using markdown. "
    "Be encouraging and age-appropriate."
)

# ---------------------------------------------------------------------------
# Page routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/explorer")
def explorer():
    return render_template("explorer.html")


@app.route("/ingredient-lab")
def ingredient_lab():
    return render_template("ingredient_lab.html")


# ---------------------------------------------------------------------------
# API routes
# ---------------------------------------------------------------------------

@app.route("/chat", methods=["POST"])
def chat():
    """Streaming chat endpoint."""
    data = request.get_json(force=True)
    user_message = data.get("message", "")
    history = data.get("history", [])
    temperature = float(data.get("temperature", 0.7))
    top_p = float(data.get("top_p", 0.9))

    # Build messages list
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": user_message})

    def generate():
        try:
            stream = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                temperature=temperature,
                top_p=top_p,
                max_tokens=2048,
                stream=True,
            )
            for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    yield f"data: {delta.content}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.route("/ingredient", methods=["POST"])
def ingredient():
    """Ingredient Lab endpoint — returns full response (no stream)."""
    data = request.get_json(force=True)
    materials = data.get("materials", "")
    temperature = float(data.get("temperature", 0.7))
    top_p = float(data.get("top_p", 0.9))

    user_prompt = (
        f"Suggest 3 science experiments I can do with these materials: {materials}"
    )

    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": INGREDIENT_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            top_p=top_p,
            max_tokens=2048,
        )
        reply = completion.choices[0].message.content
        return jsonify({"response": reply})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
if __name__ == "__main__":
    app.run(debug=True, port=5000)
