#!/usr/bin/env python3
"""
Simple test for image generation with Gemini 2.5 Flash Image Preview
"""

import base64
from google import genai
from google.genai import types

# Initialize client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def test_gemini_image_generation():
    """Test image generation with gemini-2.5-flash-image-preview"""
    model = "gemini-2.5-flash-image-preview"
    prompt = "A beautiful sunset over mountains with orange and pink colors"
    
    print(f"Testing {model} with prompt: {prompt}")
    
    try:
        # Method 1: Try generate_content (this might work for Gemini models)
        print("\n1. Trying generate_content...")
        response = client.models.generate_content(
            model=model,
            contents=[f"Generate an image: {prompt}"]
        )
        
        if response.candidates and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'inline_data') and part.inline_data:
                    print("✅ Success with generate_content!")
                    print(f"Generated image data length: {len(part.inline_data.data)} bytes")
                    return True
                else:
                    print(f"Part content: {part}")
        
        print("❌ No image found in generate_content response")
        
    except Exception as e:
        print(f"❌ generate_content failed: {e}")
    
    try:
        # Method 2: Try generate_images with config
        print("\n2. Trying generate_images...")
        response = client.models.generate_images(
            model=model,
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="16:9"
            )
        )
        
        if response.generated_images and len(response.generated_images) > 0:
            print("✅ Success with generate_images!")
            print(f"Generated {len(response.generated_images)} images")
            return True
        else:
            print("❌ No images in generate_images response")
            
    except Exception as e:
        print(f"❌ generate_images failed: {e}")
    
    # Method 3: Try other available image models
    print("\n3. Trying other image models...")
    other_models = [
        "imagen-3.0-generate-002",
        "imagen-4.0-generate-001",
        "gemini-2.0-flash-exp-image-generation"
    ]
    
    for test_model in other_models:
        try:
            print(f"Testing {test_model}...")
            response = client.models.generate_images(
                model=test_model,
                prompt=prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio="16:9"
                )
            )
            
            if response.generated_images and len(response.generated_images) > 0:
                print(f"✅ Success with {test_model}!")
                return test_model
                
        except Exception as e:
            print(f"❌ {test_model} failed: {e}")
    
    return None

if __name__ == "__main__":
    print("Testing Gemini Image Generation")
    print("="*50)
    
    working_model = test_gemini_image_generation()
    
    if working_model:
        if isinstance(working_model, str):
            print(f"\n✅ Working model found: {working_model}")
            print(f"Update your _MODEL to: _MODEL = '{working_model}'")
        else:
            print(f"\n✅ gemini-2.5-flash-image-preview is working!")
    else:
        print("\n❌ No working image models found")
        print("\nPossible solutions:")
        print("1. Check if your Google Cloud project has Vertex AI enabled")
        print("2. Verify your API key has the right permissions")
        print("3. Try using a different Google AI service or API")
        print("4. The models might be in preview and require special access")
