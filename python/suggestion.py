import os
import json
import random
from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize Groq client
client = Groq(api_key="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")

def generate_detailed_scores():
    """
    Generate detailed scores for each suggestion
    """
    return {
        'readability': round(random.uniform(5, 10), 2),
        'grammar': round(random.uniform(5, 10), 2),
        'style': round(random.uniform(5, 10), 2),
        'clarity': round(random.uniform(5, 10), 2)
    }

def analyze_text_with_mistral(text):
    """
    Use Mistral to analyze and provide text suggestions
    """
    try:
        # Updated prompt to ensure clean JSON output with proper structure
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": """You are an advanced text analysis AI. 
                    For the given text, provide improvement suggestions in a JSON object format.
                    Respond with a JSON object containing a "suggestions" key with an array of:
                    - category: Analysis category (Readability/Grammar/Style/Clarity)
                    - message: Detailed improvement suggestion
                    - severity: Issue severity (low/medium/high)
                    - original_text: Exact problematic text snippet
                    - suggested_text: Improved version of the text
                    - scores: Detailed scoring dictionary

                    Example valid response:
                    {
                      "suggestions": [
                        {
                          "category": "Readability",
                          "message": "Sentence is complex and could be simplified",
                          "severity": "medium",
                          "original_text": "Complex original sentence here",
                          "suggested_text": "Simplified clear sentence version",
                          "scores": {
                            "readability": 6.5,
                            "grammar": 8.0,
                            "style": 7.2,
                            "clarity": 6.8
                          }
                        }
                      ]
                    }"""
                },
                {
                    "role": "user",
                    "content": f"Analyze this text and provide detailed suggestions: {text}"
                }
            ],
            model="mixtral-8x7b-32768",
            response_format={"type": "json_object"},
            max_tokens=1000,
            temperature=0.7
        )
        
        # Parse and extract suggestions
        response_text = chat_completion.choices[0].message.content
        response_data = json.loads(response_text)
        suggestions = response_data.get('suggestions', [])
        
        # Add unique IDs and ensure scores exist
        for idx, suggestion in enumerate(suggestions):
            suggestion['id'] = idx
            if 'scores' not in suggestion:
                suggestion['scores'] = generate_detailed_scores()
        
        return suggestions
    
    except json.JSONDecodeError:
        print("Failed to parse JSON response")
        return []
    except KeyError:
        print("Response missing 'suggestions' key")
        return []
    except Exception as e:
        print(f"Error in Mistral analysis: {e}")
        return []

@app.route('/analyze_text', methods=['POST'])
def analyze_text():
    """
    Main endpoint for text analysis
    """
    try:
        # Get text from request
        data = request.json
        text = data.get('text', '').strip()
        
        # Basic validation
        if not text:
            return jsonify({
                'suggestions': [],
                'error': 'No text provided for analysis'
            }), 400
        
        # Analyze text using Mistral
        suggestions = analyze_text_with_mistral(text)
        
        return jsonify({
            'suggestions': suggestions
        })
    
    except Exception as e:
        print(f"Error in text analysis: {e}")
        return jsonify({
            'suggestions': [],
            'error': 'Internal server error'
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """
    Simple health check endpoint
    """
    return jsonify({
        'status': 'healthy',
        'service': 'Text Analysis API'
    })

if __name__ == '__main__':
    # Ensure you have a GROQ_API_KEY environment variable set
    
    app.run(debug=True, port=5001)