import os
from google import genai
import base64

# Create client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Text generation
text_resp = client.models.generate_content(
    model="gemini-2.0",
    contents=["Write a short horror story set in a dark apartment."]
)
print("Generated text:")
print(text_resp.candidates[0].content.parts[0].text)

# Image generation
image_resp = client.models.generate_content(
    model="gemini-2.0-flash-image",
    contents=["A dimly lit, eerie apartment interior, cinematic horror style, high detail"]
)
# Extract base64 image
if image_resp.candidates:
    image_b64 = image_resp.candidates[0].content.parts[0].b64_json
    image_bytes = base64.b64decode(image_b64)
    with open("horror_apartment.png", "wb") as f:
        f.write(image_bytes)
