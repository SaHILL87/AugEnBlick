from flask import Flask, request, jsonify
from flask_cors import CORS
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time

app = Flask(__name__)
CORS(app)

def setup_driver():
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # Run in background
    chrome_options.add_argument('--user-data-dir=C:\\Users\\gurna\\AppData\\Local\\Google\\Chrome\\User Data')
    chrome_options.add_argument('--profile-directory=Profile 9')
    service = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=chrome_options)

@app.route('/send-message', methods=['POST'])
def send_message():
    data = request.get_json()
    phone = data.get("phone")
    message = data.get("message")
    
    if not phone or not message:
        return jsonify({"error": "Phone number and message are required"}), 400
    
    driver = setup_driver()
    try:
        print("1")
        driver.get(f'https://web.whatsapp.com/send?phone={phone}&text={message}')
        print("2")
        send_button = WebDriverWait(driver, 30).until(
            EC.element_to_be_clickable((By.XPATH, '//span[@data-icon="send"]'))
        )
        print("3")
        send_button.click()
        print("4")
        time.sleep(2)
        return jsonify({"success": True, "message": "Message sent successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    # finally:
    #     driver.quit()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
