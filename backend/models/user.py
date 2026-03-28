from datetime import datetime

def user_schema(name, email, password):
    return {
        "name": name,
        "email": email,
        "password": password,
        "created_at": datetime.utcnow()
    }