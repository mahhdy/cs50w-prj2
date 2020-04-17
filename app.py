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
online_users = {}

@app.route("/")
def index():
    return render_template('index.html')
@app.route("/ajax/first")
def ajax_all():
    users=[]
    for a,b in online_users.items():
        users.append([a,b])
    return jsonify({'users':users,'channels':[*messages]})
@app.route("/ajax/messeges")
def ajax_channel(channel):
    
    users=[]
    for a,b in online_users.items():
        users.append([a,b])
    return jsonify({'users':users,'channels':[*messages]})

@socketio.on('message received')
def add_message():
    emit('user Connected', {'data': 'Connected'})

@socketio.on('user logout')
def user_disconnect(data):
    user=data['user']
    online_users.pop(user,None)
    emit('all users',{'users':[*online_users]}, broadcast=True)    

@socketio.on('user connect')
def userJoin(data):
    user=data['user']
    online_users[user]=request.sid
    emit('all users',{'users':online_users.items()}, broadcast=True)
@socketio.on('channel created')
def add_channel(data):
    c=str(data['channel']).strip()
    if c in messages:
        return ""
    messages[c]={'users':[],'messages':[],'created_by':data['user']}
    emit('all channels',{'channels':[*messages]}, broadcast=True)
@socketio.on('join')
def on_join(data):
    user = data['user']
    room = data['room']
    join_room(room)
    send(user + ' has entered the room.', room=room)

@socketio.on('leave')
def on_leave(data):
    user = data['user']
    room = data['room']
    leave_room(room)
    send(user + ' has left the room.', room=room)




if __name__ == '__main__':
    socketio.run(app)