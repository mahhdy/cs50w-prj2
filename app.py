import os

from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO,send, emit, join_room, leave_room
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config["UPLOAD_DIR"] = os.getenv("UPLOAD_DIR")
socketio = SocketIO(app)
MESSAGES_LIMIT = 255
messages = {}
online_users = set()

@app.route("/")
def index():
    return render_template('index.html')

@socketio.on('message received')
def add_message():
    emit('user Connected', {'data': 'Connected'})

@socketio.on('disconnect')
def test_disconnect():
    print('Client disconnected')

@socketio.on('user connect')
def userJoin(data):
    print('received args: ' +data['user'])
    online_users.add(data['user'])
    print(online_users)
    emit('all users',{'users':list(online_users)}, broadcast=True)
@socketio.on('channel created')
def add_channel(data):
    c=str(data['channel']).strip()
    print(c)
    if c in messages:
        return ""
    messages[c]={users:[],messages:[],created_by:data['user']}
    emit('all channels',{'channels':[*messages]}, broadcast=True)





if __name__ == '__main__':
    socketio.run(app)