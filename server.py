# =============================================================================
# CogniFlow Local Development Server (Python)
# 
# Solves the "501 Unsupported method ('POST')" error in python -m http.server.
# Serves static files AND handles /api/chat requests locally using Google Gemini.
# =============================================================================

import os
import sys
import json
import urllib.request
import urllib.error
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = int(os.environ.get("PORT", 8080))

# Load environment variables from .env or .env.local
def load_env_file(filepath):
    if not os.path.exists(filepath):
        return
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip("'\"")
                    if k not in os.environ:
                        os.environ[k] = v
    except Exception as e:
        print(f"Notice: Could not read {filepath}: {e}")

load_env_file(".env.local")
load_env_file(".env")

class CogniFlowHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path == "/api/chat":
            content_length = int(self.headers.get("Content-Length", 0))
            body_bytes = self.rfile.read(content_length)
            
            try:
                payload = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
            except Exception:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Invalid JSON body"}).encode("utf-8"))
                return

            api_key = os.environ.get("GEMINI_API_KEY", "").strip()
            if not api_key:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                err_msg = {
                    "error": "GEMINI_API_KEY is not set. Please create a .env file with GEMINI_API_KEY=your_key or set it in your environment."
                }
                self.wfile.write(json.dumps(err_msg).encode("utf-8"))
                return

            message = payload.get("message", "")
            history = payload.get("history", [])
            context = payload.get("context", {})

            # Prepare system prompt
            system_instruction = (
                f"You are CogniFlow AI Tutor, a patient, encouraging academic tutor. "
                f"Course: {context.get('course', 'UI/UX')}. Lesson: {context.get('lessonTitle', 'General')}. "
                f"Explain concepts clearly with markdown formatting."
            )

            # Build Gemini payload
            contents = []
            if isinstance(history, list):
                for h in history[-14:]:
                    role = "user" if h.get("role") in ["user", "me"] else "model"
                    text = h.get("text", "")
                    if text:
                        if contents and contents[-1]["role"] == role:
                            contents[-1]["parts"][0]["text"] += "\n\n" + text
                        else:
                            contents.append({"role": role, "parts": [{"text": text}]})

            while contents and contents[0]["role"] != "user":
                contents.pop(0)

            if contents and contents[-1]["role"] == "user":
                contents[-1]["parts"][0]["text"] += "\n\n" + message
            else:
                contents.append({"role": "user", "parts": [{"text": message}]})

            gemini_payload = {
                "systemInstruction": {"parts": [{"text": system_instruction}]},
                "contents": contents,
                "generationConfig": {"temperature": 0.65, "maxOutputTokens": 1000}
            }

            model = os.environ.get("GEMINI_MODEL", "gemini-3.7-flash")
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

            req = urllib.request.Request(
                url,
                data=json.dumps(gemini_payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "x-goog-api-key": api_key
                },
                method="POST"
            )

            try:
                with urllib.request.urlopen(req, timeout=30) as response:
                    res_body = response.read().decode("utf-8")
                    data = json.loads(res_body)
                    candidates = data.get("candidates", [])
                    reply = ""
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        reply = "".join(p.get("text", "") for p in parts).strip()

                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": True, "reply": reply}).encode("utf-8"))
            except urllib.error.HTTPError as http_err:
                err_text = http_err.read().decode("utf-8")
                try:
                    err_json = json.loads(err_text)
                    err_msg = err_json.get("error", {}).get("message", err_text)
                except Exception:
                    err_msg = err_text
                self.send_response(502)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": err_msg}).encode("utf-8"))
            except Exception as e:
                self.send_response(502)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"Failed to connect to Gemini API: {str(e)}"}).encode("utf-8"))
        else:
            self.send_error(404, "Endpoint not found")

if __name__ == "__main__":
    server_address = ("", PORT)
    try:
        httpd = HTTPServer(server_address, CogniFlowHandler)
        print("=" * 60)
        print(f" CogniFlow Server running at http://localhost:{PORT}")
        print(f" AI Tutor Endpoint active at http://localhost:{PORT}/api/chat")
        print(f" GEMINI_API_KEY: {'Active' if os.environ.get('GEMINI_API_KEY') else 'Not set (add to .env)'}")
        print("=" * 60)
        httpd.serve_forever()
    except OSError as e:
        if e.errno == 10048 or "Address already in use" in str(e):
            print(f"Port {PORT} is already in use by another process.")
            print(f"Please stop the existing server (e.g. Press Ctrl+C in that terminal) and run this again.")
        else:
            raise
