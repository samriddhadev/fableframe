import openai
import re

# List of words/phrases that Gemini often flags
SENSITIVE_TERMS = {
    r"\btragic\b": "dramatic",
    r"\bpoverty\b": "urban setting",
    r"\blonely\b": "quiet",
    r"\bisolated?\b": "peaceful",
    r"\bsolitude\b": "serenity",
    r"\bmelancholic\b": "moody",
    r"\bgrief\b": "intense atmosphere",
    r"\bsad(ness)?\b": "moody tone",
    r"\babandon(ed|ment)?\b": "aged",
    r"\bdecay\b": "weathered",
    r"\bpoignant\b": "notable",
    r"\bweary\b": "slow-spinning",
    r"\bheavy atmosphere\b": "atmospheric lighting",
    r"\bmemory|memories\b": "visual details",
}

def generate_text(prompt: str, reference: str) -> str:
    """Generate a visual prompt from a story snippet, utilizing previous reference if present."""
    client = openai.OpenAI()
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You generate visual prompts for image generation from story snippets."},
            {"role": "user", "content": build_visual_prompt(prompt, reference)}
        ],
        temperature=0.7,
        n=1,
        stop=None,
    )
    return response.choices[0].message.content.strip()



def sanitize_prompt(prompt: str) -> str:
    """Replace sensitive or policy-flagging words with neutral alternatives."""
    clean_prompt = prompt
    for pattern, replacement in SENSITIVE_TERMS.items():
        clean_prompt = re.sub(pattern, replacement, clean_prompt, flags=re.IGNORECASE)
    return clean_prompt.strip()


def build_visual_prompt(prompt: str, reference: str = None) -> str:
    """
    Build a safe but atmospheric visual prompt for horror-style YouTube stories.
    Preserves named characters (like Arjun) while avoiding flagged sensitive terms.
    """

    # Horror-friendly replacements
    replacements = {
        "sad": "ominous",
        "lonely": "eerie",
        "tragic": "mysterious",
        "abandoned": "forgotten",
        "solitude": "quiet stillness",
        "decay": "aged and weathered",
        "death": "dark presence",
        "blood": "crimson glow",
        "haunted": "shadowed",
        "grief": "uneasy silence",
        "melancholic": "moody",
        "poverty": "old, atmospheric setting",
        "corpse": "statue-like figure",
    }

    safe_prompt = prompt
    for bad, good in replacements.items():
        safe_prompt = safe_prompt.replace(bad, good)

    if reference:
        full_prompt = (
            f"You are an expert at creating cinematic visual prompts for image generation models. "
            f"Build upon the previous visual prompt: '{reference}', "
            f"and the new story snippet: '{safe_prompt}'. "
            "Keep named characters clearly visible in the scene. "
            "Focus on cinematic lighting, eerie atmosphere, and visual detail, not emotions."
        )
    else:
        full_prompt = (
            f"You are an expert at creating cinematic visual prompts for image generation models. "
            f"Given the following story snippet: '{safe_prompt}', "
            "generate a concise visual description emphasizing eerie atmosphere, lighting, and detail. "
            "If a character is mentioned describe their presence, posture, or silhouette."
        )

    return full_prompt

