from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os

# Add backend directory to path for imports
sys.path.append(os.path.dirname(__file__))

# Import all handlers dynamically
import importlib.util

def load_handler(folder_name):
    """Dynamically load handler from function folder"""
    handler_path = os.path.join(os.path.dirname(__file__), folder_name, 'index.py')
    spec = importlib.util.spec_from_file_location(f"{folder_name}.index", handler_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.handler

# Load all handlers
login_handler = load_handler('login')
register_handler = load_handler('register')
get_messages_handler = load_handler('get-messages')
send_message_handler = load_handler('send-message')
get_user_handler = load_handler('get-user')
update_activity_handler = load_handler('update-activity')
get_subscriptions_handler = load_handler('get-subscriptions')
subscribe_handler = load_handler('subscribe')
profile_photos_handler = load_handler('profile-photos')
blacklist_handler = load_handler('blacklist')
get_conversations_handler = load_handler('get-conversations')
private_messages_handler = load_handler('private-messages')
send_sms_handler = load_handler('send-sms')
verify_sms_handler = load_handler('verify-sms')
reset_password_handler = load_handler('reset-password')
admin_users_handler = load_handler('admin-users')
create_payment_handler = load_handler('create-payment')
payment_webhook_handler = load_handler('payment-webhook')
generate_upload_url_handler = load_handler('generate-upload-url')
add_energy_handler = load_handler('add-energy')
add_reaction_handler = load_handler('add-reaction')
create_user_handler = load_handler('create-user')
export_database_handler = load_handler('export-database')

app = Flask(__name__)
CORS(app)

# Helper function to convert Flask request to event dict
def flask_to_event(method_override=None):
    """Convert Flask request to AWS Lambda-style event dict"""
    event = {
        'httpMethod': method_override or request.method,
        'headers': dict(request.headers),
        'queryStringParameters': dict(request.args) if request.args else {},
        'body': request.get_data(as_text=True) if request.data else '{}'
    }
    return event

# Helper function to convert handler response to Flask response
def handler_to_flask(handler_response):
    """Convert AWS Lambda handler response to Flask response"""
    status_code = handler_response.get('statusCode', 200)
    headers = handler_response.get('headers', {})
    body = handler_response.get('body', '')
    
    response = jsonify(body) if headers.get('Content-Type') == 'application/json' else body
    flask_response = app.response_class(
        response=body,
        status=status_code,
        headers=headers
    )
    return flask_response

# Mock context object
class MockContext:
    def __init__(self):
        self.request_id = 'mock-request-id'
        self.function_name = 'flask-api'

context = MockContext()

# Routes
@app.route('/api/login', methods=['POST', 'OPTIONS'])
def login():
    event = flask_to_event()
    response = login_handler(event, context)
    return handler_to_flask(response)

@app.route('/api/register', methods=['POST', 'OPTIONS'])
def register():
    event = flask_to_event()
    response = register_handler(event, context)
    return handler_to_flask(response)

@app.route('/api/messages', methods=['GET', 'POST', 'OPTIONS'])
def messages():
    event = flask_to_event()
    if request.method == 'GET':
        response = get_messages_handler(event, context)
    else:
        response = send_message_handler(event, context)
    return handler_to_flask(response)

@app.route('/api/user', methods=['GET', 'OPTIONS'])
def get_user():
    event = flask_to_event()
    response = get_user_handler(event, context)
    return handler_to_flask(response)

@app.route('/api/update-activity', methods=['POST', 'OPTIONS'])
def update_activity():
    event = flask_to_event()
    response = update_activity_handler(event, context)
    return handler_to_flask(response)

@app.route('/api/subscriptions', methods=['GET', 'OPTIONS'])
def get_subscriptions():
    event = flask_to_event()
    response = get_subscriptions_handler(event, context)
    return handler_to_flask(response)

@app.route('/api/subscribe/<int:target_id>', methods=['GET', 'POST', 'DELETE', 'OPTIONS'])
def subscribe(target_id):
    event = flask_to_event()
    # Add targetUserId to query params or body
    if request.method == 'GET' or request.method == 'DELETE':
        event['queryStringParameters']['targetUserId'] = str(target_id)
    else:
        import json
        body_data = json.loads(event['body']) if event['body'] else {}
        body_data['targetUserId'] = target_id
        event['body'] = json.dumps(body_data)
    response = subscribe_handler(event, context)
    return handler_to_flask(response)

@app.route('/api/profile-photos', methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
def profile_photos():
    event = flask_to_event()
    response = profile_photos_handler(event, context)
    return handler_to_flask(response)

@app.route('/api/profile-photos/<int:photo_id>', methods=['DELETE', 'OPTIONS'])
def delete_profile_photo(photo_id):
    event = flask_to_event('DELETE')
    event['queryStringParameters']['photoId'] = str(photo_id)
    response = profile_photos_handler(event, context)
    return handler_to_flask(response)

@app.route('/api/blacklist', methods=['GET', 'POST', 'DELETE', 'OPTIONS'])
def blacklist():
    event = flask_to_event()
    response = blacklist_handler(event, context)
    return handler_to_flask(response)

@app.route('/api/blacklist/<int:blocked_id>', methods=['DELETE', 'OPTIONS'])
def delete_blacklist(blocked_id):
    event = flask_to_event('DELETE')
    event['queryStringParameters']['blockedUserId'] = str(blocked_id)
    response = blacklist_handler(event, context)
    return handler_to_flask(response)

@app.route('/api/conversations', methods=['GET', 'OPTIONS'])
def get_conversations():
    event = flask_to_event()
    response = get_conversations_handler(event, context)
    return handler_to_flask(response)

@app.route('/api/messages/<int:other_user_id>', methods=['GET', 'OPTIONS'])
def get_private_messages(other_user_id):
    event = flask_to_event()
    event['queryStringParameters']['otherUserId'] = str(other_user_id)
    response = private_messages_handler(event, context)
    return handler_to_flask(response)

@app.route('/api/private-messages', methods=['POST', 'OPTIONS'])
def send_private_message():
    event = flask_to_event()
    response = private_messages_handler(event, context)
    return handler_to_flask(response)

@app.route('/api/send-sms', methods=['POST', 'OPTIONS'])
def send_sms():
    event = flask_to_event()
    response = send_sms_handler(event, context)
    return handler_to_flask(response)

@app.route('/api/verify-sms', methods=['POST', 'OPTIONS'])
def verify_sms():
    event = flask_to_event()
    response = verify_sms_handler(event, context)
    return handler_to_flask(response)

@app.route('/api/reset-password', methods=['POST', 'OPTIONS'])
def reset_password():
    event = flask_to_event()
    response = reset_password_handler(event, context)
    return handler_to_flask(response)

@app.route('/api/admin/users', methods=['GET', 'POST', 'OPTIONS'])
def admin_users():
    event = flask_to_event()
    response = admin_users_handler(event, context)
    return handler_to_flask(response)

@app.route('/api/payment/create', methods=['POST', 'OPTIONS'])
def create_payment():
    event = flask_to_event()
    response = create_payment_handler(event, context)
    return handler_to_flask(response)

@app.route('/api/payment/webhook', methods=['POST', 'OPTIONS'])
def payment_webhook():
    event = flask_to_event()
    response = payment_webhook_handler(event, context)
    return handler_to_flask(response)

@app.route('/api/upload-url', methods=['GET', 'OPTIONS'])
def generate_upload_url():
    event = flask_to_event()
    response = generate_upload_url_handler(event, context)
    return handler_to_flask(response)

@app.route('/api/add-energy', methods=['POST', 'OPTIONS'])
def add_energy():
    event = flask_to_event()
    response = add_energy_handler(event, context)
    return handler_to_flask(response)

@app.route('/api/add-reaction', methods=['POST', 'OPTIONS'])
def add_reaction():
    event = flask_to_event()
    response = add_reaction_handler(event, context)
    return handler_to_flask(response)

@app.route('/api/create-user', methods=['POST', 'OPTIONS'])
def create_user():
    event = flask_to_event()
    response = create_user_handler(event, context)
    return handler_to_flask(response)

@app.route('/api/export-database', methods=['GET', 'OPTIONS'])
def export_database():
    event = flask_to_event()
    response = export_database_handler(event, context)
    return handler_to_flask(response)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'message': 'API is running'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=False)