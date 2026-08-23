import json

def process_data(user_input):
    # Safe
    data = json.loads(user_input)
    
    # Unsafe
    eval(user_input)
    
def execute_code(command):
    exec(command)
