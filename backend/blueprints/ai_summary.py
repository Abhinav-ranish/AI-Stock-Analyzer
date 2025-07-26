from groq import Groq

client = Groq()

def get_groq_analysis(prompt: str) -> str:
    try:
        res = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_completion_tokens=1024,
            top_p=1,
        )

        text = res.choices[0].message.content.strip()
        print("[GROQ RAW MARKDOWN]", text)

        # Optional: strip surrounding code fences if present
        if text.startswith("```") and text.endswith("```"):
            text = text.strip("`").strip()

        return text

    except Exception as e:
        print("[GROQ ERROR]", e)
        return "AI summary unavailable"
