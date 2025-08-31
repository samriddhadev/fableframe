import base64
import math
import os
import traceback
from pathlib import Path

from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO

from tenacity import retry, stop_after_attempt, wait_exponential, RetryError

# Initialize Gemini client with your API key
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Use a valid model for image generation that's available in your account
# From the model listing, these models support image generation:
_MODEL = "gemini-1.5-flash"  # This was in your original code and is available

def list_available_models():
    """List all available models to help debug model availability issues"""
    try:
        models = client.models.list()
        print("Available models:")
        for model in models:
            print(f"- {model.name}: {model.display_name}")
        return models
    except Exception as e:
        print(f"Error listing models: {e}")
        return []
    

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=3, min=30, max=90))
def _generate_scene_image_with_retry(
    story_id: str,
    scene_id: str,
    visual_prompt: str,
    model: str = _MODEL,
    width: int = 512,
    height: int = 512,
    negative_prompt: str = None,
    reference_scene_id: str = None
) -> str:
    """Internal function with retry logic for image generation"""
    image_base64 = None
    try:
        reference_image = None
        
        previous_image_base64 = get_previous_image_base64(
            story_id, reference_scene_id)

        if previous_image_base64:
            image_data = base64.b64decode(previous_image_base64)
            reference_image = Image.open(BytesIO(image_data))
        print(f"generating image with model: {_MODEL}, size: {width}x{height}")
        # Construct the multimodal prompt
        prompt = f"""
        All characters and scenes are fictional and for entertainment purposes only.
        Always generate cinematic imagery with atmosphere, not gore or graphic harm.
        Visual Prompt: {visual_prompt}
        Negative Prompt: {negative_prompt if negative_prompt else ''}
        Image Size: {width}x{height}
        """
        aspect_ratio = get_aspect_ratio(width, height)
        print(f"Using aspect ratio: {aspect_ratio}")
        
        # Try image generation first
        if reference_image:
            # For reference image case, use generate_content without GenerateImagesConfig
            # generate_content doesn't support GenerateImagesConfig
            response = client.models.generate_content(
                model=_MODEL,  # Use a working text model for fallback
                contents=[
                    reference_image,
                    f"Always generate cinematic imagery with atmosphere, not gore or graphic harm. Generate an image with the following prompt in conformance with the reference image: {prompt}"
                ]
            )
            if response.candidates and response.candidates[0].content.parts:
                part = response.candidates[0].content.parts[0]
                
                # Check if the part has inline_data (an image)
                if part.inline_data:
                    image_bytes = part.inline_data.data
                    image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        else:
            # Use generate_content for Gemini image models
            # Many Gemini models support image generation through generate_content
            response = client.models.generate_content(
                model=_MODEL,
                contents=[f"Always generate cinematic imagery with atmosphere, not gore or graphic harm. Generate an image: {visual_prompt}"]
            )
            print(f"Response from generate_content: {response}")
            # Extract image from response
            if response.candidates and response.candidates[0].content.parts:
                part = response.candidates[0].content.parts[0]
                
                # Check if the part has inline_data (an image)
                if part.inline_data:
                    image_bytes = part.inline_data.data
                    image_base64 = base64.b64encode(image_bytes).decode('utf-8')
                else:
                    print("No image data found, trying fallback approach")
                    raise Exception("No image data found in response")
            else:
                print("No response candidates found, trying fallback")
                raise Exception("No response candidates found")
        
        if not image_base64:
            raise Exception("Failed to generate image")
    except Exception as e:
        print(f"Error during image generation: {e}")
        raise e
    return image_base64


def generate_scene_image(
    story_id: str,
    scene_id: str,
    visual_prompt: str,
    model: str = _MODEL,
    width: int = 512,
    height: int = 512,
    negative_prompt: str = None,
    reference_scene_id: str = None
) -> str:
    """Generate a scene image with retry logic and fallback to placeholder"""
    try:
        # Try the retry-enabled function first
        return _generate_scene_image_with_retry(
            story_id=story_id,
            scene_id=scene_id,
            visual_prompt=visual_prompt,
            model=model,
            width=width,
            height=height,
            negative_prompt=negative_prompt,
            reference_scene_id=reference_scene_id
        )
        
    except RetryError as retry_error:
        print(f"Retry exhausted after multiple attempts: {retry_error}")
        print("Generating placeholder image as fallback...")
        
        # Generate placeholder image when retries are exhausted
        return create_placeholder_image(visual_prompt, width, height)
        
    except Exception as e:
        traceback.print_exception(e)
        print(f"Error generating image: {e}")
        print("Creating placeholder image as fallback...")
        
        # Final fallback: create a placeholder image
        return create_placeholder_image(visual_prompt, width, height)


def create_placeholder_image(prompt: str, width: int = 512, height: int = 512) -> str:
    """Create a placeholder image with text when actual image generation fails"""
    try:
        from PIL import Image, ImageDraw, ImageFont
        import hashlib
        
        # Create a colored background based on prompt hash
        hash_color = int(hashlib.md5(prompt.encode()).hexdigest()[:6], 16)
        r = (hash_color >> 16) & 255
        g = (hash_color >> 8) & 255
        b = hash_color & 255
        
        # Create image
        img = Image.new('RGB', (width, height), color=(r, g, b))
        draw = ImageDraw.Draw(img)
        
        # Add text
        try:
            # Try to use a system font
            font = ImageFont.truetype("arial.ttf", 20)
        except:
            # Fallback to default font
            font = ImageFont.load_default()
        
        # Wrap text
        words = prompt.split()
        lines = []
        current_line = []
        max_width = width - 40
        
        for word in words:
            test_line = ' '.join(current_line + [word])
            bbox = draw.textbbox((0, 0), test_line, font=font)
            if bbox[2] - bbox[0] <= max_width:
                current_line.append(word)
            else:
                if current_line:
                    lines.append(' '.join(current_line))
                    current_line = [word]
                else:
                    lines.append(word)
        
        if current_line:
            lines.append(' '.join(current_line))
        
        # Draw text
        y_offset = (height - len(lines) * 25) // 2
        for i, line in enumerate(lines):
            bbox = draw.textbbox((0, 0), line, font=font)
            text_width = bbox[2] - bbox[0]
            x = (width - text_width) // 2
            y = y_offset + i * 25
            
            # Draw text with outline for better visibility
            draw.text((x-1, y-1), line, fill=(0,0,0), font=font)
            draw.text((x+1, y-1), line, fill=(0,0,0), font=font)
            draw.text((x-1, y+1), line, fill=(0,0,0), font=font)
            draw.text((x+1, y+1), line, fill=(0,0,0), font=font)
            draw.text((x, y), line, fill=(255,255,255), font=font)
        
        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        return image_base64
        
    except Exception as e:
        print(f"Error creating placeholder image: {e}")
        # Return a very basic base64 encoded 1x1 pixel image
        tiny_img = Image.new('RGB', (1, 1), color=(128, 128, 128))
        buffer = BytesIO()
        tiny_img.save(buffer, format='PNG')
        return base64.b64encode(buffer.getvalue()).decode('utf-8')


def get_aspect_ratio(width: int, height: int) -> str:
    gcd = math.gcd(width, height)
    return f"{width // gcd}:{height // gcd}"

# Example helper function to get previous image base64
def get_previous_image_base64(story_id: str, scene_id: str) -> str:
    if not scene_id:
        return None
    try:
        data_dir = Path(os.getenv("DATA_DIR", "/story")) / story_id / "images"
        path = data_dir / f"{scene_id}.png"  # adjust path to your storage
        with open(path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")
    except Exception as e:
        print(f"Error retrieving previous image: {e}")
    return None
