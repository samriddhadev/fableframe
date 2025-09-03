import re

def extract_base64_from_data_url(data_url):
    """
    Extract base64 data from a data URL
    
    Input: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..."
    Output: "/9j/4AAQSkZJRgABAQEAYABgAAD..."
    """
    # Method 1: Simple split (if you know the format)
    if "base64," in data_url:
        return data_url.split("base64,")[1]
    
    # Method 2: Using regex for more robust parsing
    match = re.match(r"data:([^;]+);base64,(.+)", data_url)
    if match:
        mime_type = match.group(1)  # e.g., "image/jpeg"
        base64_data = match.group(2)  # the actual base64 string
        return base64_data
    
    # If it's already just base64 (no data URL prefix)
    return data_url