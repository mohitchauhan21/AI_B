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
    "You are SciBot, a conversational AI science experiment guide — like a "
    "friendly science teacher who loves helping students discover experiments.\n\n"

    "YOUR PERSONALITY:\n"
    "- Warm, encouraging, and conversational. Never robotic or textbook-like.\n"
    "- Match the user's energy. If they're casual, be casual. If they're curious, be detailed.\n"
    "- Talk like a real person, not a Wikipedia article.\n\n"

    "STRICT TOPIC RULE:\n"
    "- You ONLY discuss science experiments, scientific concepts, and educational topics.\n"
    "- If the user asks about anything unrelated (movies, food, general chat etc.), "
    "politely redirect them back to science experiments.\n\n"

    "RESPONSE LENGTH RULES — VERY IMPORTANT:\n"
    "- If user says hi/hello/hey → greet them warmly in 1-2 sentences, "
    "ask what kind of experiment they want to explore. Nothing more.\n"
    "- If user asks a simple yes/no or factual question → answer briefly and directly.\n"
    "- If user asks for an experiment → ask 1-2 short clarifying questions first "
    "(grade level, available materials, subject) UNLESS they already gave that info.\n"
    "- Only give FULL experiment details when the user confirms they want it "
    "or explicitly asks for steps/materials/instructions.\n"
    "- Never give unsolicited experiment suggestions.\n\n"

    "WHEN GIVING A FULL EXPERIMENT always include:\n"
    "1. Experiment name\n"
    "2. Required materials\n"
    "3. Step-by-step instructions\n"
    "4. Safety precautions\n"
    "5. The scientific concept explained simply\n\n"

    "CONVERSATIONAL MEMORY — VERY IMPORTANT:\n"
    "- Always remember what was discussed earlier in the conversation.\n"
    "- If user says 'make it simpler', 'give me another one', 'what if I dont have X' "
    "— you must understand they are referring to the previous experiment.\n"
    "- Never ask the user to repeat information they already gave.\n"
    "- Build on previous messages naturally like a real conversation.\n\n"

    "FOLLOW-UP HANDLING:\n"
    "- If user asks 'why does this work?' → explain the science concept simply.\n"
    "- If user asks 'what if I dont have X material?' → suggest a substitute.\n"
    "- If user asks 'make it harder/easier' → adapt the experiment accordingly.\n"
    "- If user asks 'show me another one' → suggest a different experiment "
    "in the same topic/difficulty.\n\n"

    "REMEMBER: You are a science TEACHER having a CONVERSATION, "
    "not a search engine returning results."
)

INGREDIENT_SYSTEM_PROMPT = (
    "You are SciBot, an expert science experiment guide. "
    "The user will provide a list of materials they have at home. "
    "Suggest exactly 4 creative science experiments they can do "
    "with those materials.\n\n"
    "STRICT FORMAT RULES — follow exactly:\n"
    "- Start each experiment with this exact marker on its own line:\n"
    "  ---EXPERIMENT_1---, ---EXPERIMENT_2---, ---EXPERIMENT_3---, ---EXPERIMENT_4---\n"
    "- Do NOT add any intro sentence before ---EXPERIMENT_1---\n"
    "- Do NOT add any outro after the last experiment\n"
    "- For each experiment use this structure:\n\n"
    "---EXPERIMENT_N---\n"
    "## Experiment Name Here\n\n"
    "**Materials Used:**\n"
    "- material 1\n"
    "- material 2\n\n"
    "**Step-by-Step Instructions:**\n"
    "1. Step one\n"
    "2. Step two\n\n"
    "**Safety Precautions:**\n"
    "- precaution 1\n\n"
    "**The Science:**\n"
    "Explanation here.\n\n"
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


@app.route("/experiment/<int:exp_id>")
def experiment_detail(exp_id):
    return render_template("experiment_detail.html", exp_id=exp_id)


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
    grade = data.get("grade", "")
    subject = data.get("subject", "")

    # Build messages list
    personalization = ""
    if grade:
        personalization += f"The student is in {grade}. "
    if subject:
        personalization += (
            f"Their primary interest is {subject}. "
            f"Prioritize {subject} experiments unless asked otherwise. "
        )
    personalization += (
        "Always match experiment complexity to their grade level."
    )
    dynamic_prompt = SYSTEM_PROMPT + (
        f"\n\nUSER PROFILE: {personalization}"
        if personalization else ""
    )
    messages = [{"role": "system", "content": dynamic_prompt}]
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
                    import json
                    yield f"data: {json.dumps(delta.content)}\n\n"
            yield "data: \"[DONE]\"\n\n"
        except Exception as e:
            import json
            yield f"data: {json.dumps('[ERROR] ' + str(e))}\n\n"

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
