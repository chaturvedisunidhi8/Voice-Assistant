 
import os
from flask import Flask, request, jsonify
import requests
from dotenv import load_dotenv
from flask_cors import CORS

load_dotenv()  # load .env so OPENROUTER_API_KEY is available[web:59][web:61]

app = Flask(__name__)
CORS(app)  # allow all origins in dev so browser can call this API[web:73]

# OpenRouter config

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")


OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"  # chat endpoint[web:64][web:72]
MODEL_NAME = "amazon/nova-2-lite-v1:free"  # model id from OpenRouter model page[web:77][web:83]
##amazon/nova-2-lite-v1:free
##arcee-ai/trinity-mini:free  , tngtech/tng-r1t-chimera:free
@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json(silent=True) or {}
    prompt = data.get("prompt", "").strip()

    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400

    try:
        payload = {
            "model": MODEL_NAME,
            "messages": [
                {"role": "system", "content": "You are a helpful voice assistant."},
                {"role": "user", "content": prompt},
            ],
        }

        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        }

        resp = requests.post(OPENROUTER_URL, json=payload, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        # DEBUG: print full response in terminal so we can see errors or content
        print("OpenRouter response:", data)

        # If OpenRouter returned an explicit error object
        if isinstance(data, dict) and "error" in data:
            msg = data["error"].get("message", "Unknown OpenRouter error")
            return jsonify({"answer": f"Model error: {msg}"}), 200

        # Normal chat completion format: choices[0].message.content[web:64][web:72]
        answer = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content")
        )

        if not answer:
            return jsonify({"answer": "Model returned no content."}), 200

        return jsonify({"answer": answer})

    except Exception as e:
        # For debugging; in production you would log this instead
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    # Run backend on http://localhost:5000
    app.run(host="0.0.0.0", port=5000, debug=True)
