#!/usr/bin/env python3
"""
Test the fixed image generation function
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from module.image import generate_scene_image

def test_image_generation():
    """Test the improved image generation function"""
    print("Testing improved image generation...")
    
    try:
        result = generate_scene_image(
            story_id="test_story",
            scene_id="scene_1", 
            visual_prompt="A beautiful sunset over mountains with vibrant orange and pink colors reflecting on a calm lake",
            width=512,
            height=512
        )
        
        if result:
            print(f"✅ Success! Generated image base64 length: {len(result)}")
            
            # Save the result to check if it's a valid image
            import base64
            from PIL import Image
            from io import BytesIO
            
            try:
                image_data = base64.b64decode(result)
                img = Image.open(BytesIO(image_data))
                print(f"✅ Valid image: {img.size} pixels, format: {img.format}")
                
                # Save for inspection
                img.save("test_generated_image.png")
                print("✅ Saved test image as 'test_generated_image.png'")
                
            except Exception as img_error:
                print(f"❌ Invalid image data: {img_error}")
        else:
            print("❌ No result returned")
            
    except Exception as e:
        print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    test_image_generation()
