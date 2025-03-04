from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import (
    pipeline,
    AutoTokenizer,
    AutoModelForSeq2SeqLM,
    T5ForConditionalGeneration,
    T5Tokenizer,
    MarianMTModel,
    MarianTokenizer
)
import requests
import re
import os
from spellchecker import SpellChecker


app = Flask(__name__)
CORS(app)

# Mistral API Configuration
MISTRAL_API_KEY = "7LmAgUBYsjwwT6fcnpwkqQfOwkjXA9AN"
MISTRAL_ENDPOINT = "https://api.mistral.ai/v1/chat/completions"

# Load all models
def load_models():
    global summarizer, grammar_fixer, paraphraser, paraphraser_tokenizer, translation_model,spell, translation_tokenizer
    
    # Summarization Model
    summarizer_tokenizer = AutoTokenizer.from_pretrained("facebook/bart-large-cnn")
    summarizer_model = AutoModelForSeq2SeqLM.from_pretrained("facebook/bart-large-cnn")
    summarizer = pipeline("summarization", model=summarizer_model, tokenizer=summarizer_tokenizer)

    # Grammar Fixing
    grammar_fixer = pipeline("text2text-generation", model="vennify/t5-base-grammar-correction")
    spell = SpellChecker()

    # Paraphrasing
    paraphraser = T5ForConditionalGeneration.from_pretrained("t5-small")
    paraphraser_tokenizer = T5Tokenizer.from_pretrained("t5-small")
    
    # Translation
    translation_model_name = "Helsinki-NLP/opus-mt-en-hi"
    translation_model = MarianMTModel.from_pretrained(translation_model_name)
    translation_tokenizer = MarianTokenizer.from_pretrained(translation_model_name)

load_models()

# AI Copilot Endpoint
@app.route('/generate', methods=['POST'])
def generate_text():
    data = request.json
    prompt = data.get('prompt', '')
    
    headers = {
        "Authorization": f"Bearer {MISTRAL_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "mistral-large-latest",
        "messages": [{
            "role": "user",
            "content": f"You are an AI writing assistant.Do not write anything in bold. Continue this text: {prompt}"
        }],
        "temperature": 0.7,
        "top_p": 0.95,
        "max_tokens": 500,
        "stream": False
    }
    
    try:
        response = requests.post(MISTRAL_ENDPOINT, json=payload, headers=headers)
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

# Document Summarization
@app.route('/summarize', methods=['POST'])
def summarize_text():
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


@app.route('/fix_grammar', methods=['POST'])
def fix_grammar():
    """
    Endpoint for comprehensive text correction:
    1. Spell checking
    2. Grammar correction
    
    Ensures input and output types remain consistent
    
    Returns:
        JSON response with original and corrected text
    """
    data = request.get_json()
    text = data.get('text', '')
    
    # Tracking original input format
    input_type = type(text)
    
    # Handle different input types gracefully
    if not isinstance(text, str):
        try:
            text = str(text)
        except Exception as e:
            return jsonify({
                "error": f"Could not convert input to string: {str(e)}",
                "original_text": text
            }), 400
    
    # Step 1: Spell Checking
    spell_checked = correct_spelling(text)
    
    # Step 2: Grammar Correction
    grammar_result = grammar_fixer(f"grammar: {spell_checked}")
    grammar_corrected = grammar_result[0]['generated_text']
    
    # Prepare response
    response = {
        "original_text": text,
        "corrected_text": grammar_corrected
    }
    
    # If any corrections were made, add details
    if spell_checked != text or grammar_corrected != text:
        response["corrections"] = []
        
        if spell_checked != text:
            response["corrections"].append({
                "type": "spelling",
                "original": text,
                "corrected": spell_checked
            })
        
        if grammar_corrected != spell_checked:
            response["corrections"].append({
                "type": "grammar",
                "original": spell_checked,
                "corrected": grammar_corrected
            })
    
    return jsonify(response)

def correct_spelling(text):
    """
    Correct spelling while preserving original text structure.
    
    Args:
        text (str): Input text to spell check
    
    Returns:
        str: Text with spelling corrections
    """
    # If input is not a string, convert to string
    if not isinstance(text, str):
        text = str(text)
    
    # Split text into words and non-words (punctuation/numbers)
    tokens = re.findall(r"(\w+)|(\W+)", text)
    corrected = []
    
    for word, non_word in tokens:
        if word:
            # Get corrected word (or keep original if no suggestion)
            correction = spell.correction(word) or word
            corrected.append(correction)
        elif non_word:
            corrected.append(non_word)
    
    return "".join(corrected)

@app.route('/rewrite', methods=['POST'])
def rewrite():
    data = request.json
    text = data.get('text', '')
    input_ids = paraphraser_tokenizer.encode(f"paraphrase: {text}", return_tensors="pt")
    outputs = paraphraser.generate(input_ids, max_length=512, num_return_sequences=1)
    rewritten_text = paraphraser_tokenizer.decode(outputs[0], skip_special_tokens=True)
    return jsonify({"rewritten_text": rewritten_text})

@app.route('/translate', methods=['POST'])
def translate():
    data = request.json
    text = data.get('text', '')
    tokenized_text = translation_tokenizer.prepare_seq2seq_batch([text], return_tensors="pt")
    translated_tokens = translation_model.generate(**tokenized_text)
    translated_text = translation_tokenizer.decode(translated_tokens[0], skip_special_tokens=True)
    return jsonify({"translated_text": translated_text})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)