#!/usr/bin/env python3
"""
Test script to list available Google AI models and test image generation
"""

import os
from google import genai

# Initialize client with your API key
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def list_all_models():
    """List all available models with their capabilities"""
    try:
        print("Fetching available models...")
        models = client.models.list()
        
        print("\n" + "="*80)
        print("AVAILABLE MODELS")
        print("="*80)
        
        image_models = []
        text_models = []
        
        for model in models:
            model_info = {
                'name': model.name,
                'display_name': getattr(model, 'display_name', 'N/A'),
                'description': getattr(model, 'description', 'N/A')
            }
            
            print(f"\nModel: {model_info['name']}")
            print(f"  Display Name: {model_info['display_name']}")
            print(f"  Description: {model_info['description']}")
            
            # Categorize models
            if 'image' in model_info['name'].lower() or 'imagen' in model_info['name'].lower():
                image_models.append(model_info['name'])
            else:
                text_models.append(model_info['name'])
        
        print("\n" + "="*80)
        print("IMAGE GENERATION MODELS:")
        for model in image_models:
            print(f"  - {model}")
            
        print("\nTEXT/MULTIMODAL MODELS:")
        for model in text_models:
            print(f"  - {model}")
            
        return image_models, text_models
        
    except Exception as e:
        print(f"Error listing models: {e}")
        return [], []

def test_image_generation(model_name: str):
    """Test image generation with a specific model"""
    try:
        print(f"\nTesting image generation with model: {model_name}")
        
        from google.genai import types
        
        response = client.models.generate_images(
            model=model_name,
            prompt="A beautiful sunset over mountains",
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="16:9"
            )
        )
        
        if response.generated_images and len(response.generated_images) > 0:
            print(f"✅ SUCCESS: Image generated with {model_name}")
            return True
        else:
            print(f"❌ FAILED: No images returned from {model_name}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR testing {model_name}: {e}")
        return False

if __name__ == "__main__":
    print("Google AI Models Test")
    print("="*50)
    
    # List all models
    image_models, text_models = list_all_models()
    
    # Test common image generation models
    common_image_models = [
        "imagen-3.0-generate-001",
        "imagen-2.0-generate-001", 
        "gemini-1.5-pro-latest",
        "gemini-1.5-flash-latest",
        "gemini-2.5-flash-image-preview",
        "gemini-2.0-flash-preview-image-generation"
    ]
    
    print("\n" + "="*80)
    print("TESTING COMMON IMAGE MODELS")
    print("="*80)
    
    working_models = []
    for model in common_image_models:
        if test_image_generation(model):
            working_models.append(model)
    
    print("\n" + "="*80)
    print("RESULTS")
    print("="*80)
    print(f"Working image models: {working_models}")
    
    if working_models:
        print(f"\n✅ Recommended model to use: {working_models[0]}")
        print(f"Update your _MODEL variable to: _MODEL = \"{working_models[0]}\"")
    else:
        print("\n❌ No working image generation models found.")
        print("You may need to:")
        print("1. Enable the Vertex AI API in Google Cloud Console")
        print("2. Check your API key permissions")
        print("3. Use a different Google AI service")
