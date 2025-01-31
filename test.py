import ollama
print(ollama.list())
response = ollama.chat(model='mistral', messages=[{"role": "user", "content": "Hello!"}])
print(response)

