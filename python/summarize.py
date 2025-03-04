from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, pipeline
import requests
import os

app = Flask(__name__)
CORS(app)

# Mistral API Configuration
MISTRAL_API_KEY = "7LmAgUBYsjwwT6fcnpwkqQfOwkjXA9AN"
MISTRAL_ENDPOINT = "https://api.mistral.ai/v1/chat/completions"

# Load summarization model locally
def load_models():
    global summarizer
    
    # Summarization Model (Keep local)
    summarizer_tokenizer = AutoTokenizer.from_pretrained("facebook/bart-large-cnn")
    summarizer_model = AutoModelForSeq2SeqLM.from_pretrained("facebook/bart-large-cnn")
    summarizer = pipeline("summarization", model=summarizer_model, tokenizer=summarizer_tokenizer)

load_models()

@app.route('/generate', methods=['POST'])
def generate_text():
    data = request.json
    prompt = data.get('prompt', '')
    
    # Mixtral 8x7B API Call
    headers = {
        "Authorization": f"Bearer {MISTRAL_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "mistral-large-latest",
        "messages": [{
            "role": "user",
            "content": f"You are an AI writing assistant. Continue this text: {prompt}"
        }],
        "temperature": 0.7,
        "top_p": 0.95,
        "max_tokens": 500,
        "stream": False
    }
    
    try:
        response = requests.post(MISTRAL_API_ENDPOINT, json=payload, headers=headers)
        response.raise_for_status()
        result = response.json()
        
        generated_text = result['choices'][0]['message']['content']
        
        return jsonify({
            'generated_text': generated_text,
            'model': 'Mixtral 8x7B',
            'parameters': {
                'architecture': 'Mixture of Experts',
                'temperature': 0.7,
                'top_p': 0.95,
                'tokens_generated': result['usage']['completion_tokens']
            }
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/summarize', methods=['POST'])
def summarize_text():
    # Keep existing BART implementation
    data = request.json
    text = data.get('text', '')
    
    max_chunk_length = 1024
    chunks = [text[i:i+max_chunk_length] for i in range(0, len(text), max_chunk_length)]
    
    summaries = []
    for chunk in chunks:
        summary = summarizer(
            chunk,
            max_length=150,
            min_length=30,
            do_sample=False,
            no_repeat_ngram_size=3
        )
        summaries.append(summary[0]['summary_text'])
    
    final_summary = ' '.join(summaries)
    
    return jsonify({
        'summary': final_summary,
        'model': 'BART-large-cnn',
        'processing': {
            'chunks_processed': len(chunks),
            'compression_ratio': f"{len(final_summary)/len(text):.1%}"
        }
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)