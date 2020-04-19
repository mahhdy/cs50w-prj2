import os,sys
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
def get_users():
    return [list(x) for x in online_users.items()]
def get_updates():
    return {'users':get_users(),'msg':messages,'channels':[*messages]}
def sentUpdate():
    emit('update',{'users':get_users(),'msg':messages,'channels':[*messages]}, broadcast=True)
@app.route("/")
def index():
    return render_template('index.html')
@socketio.on_error()        # Handles the default namespace
def error_handler(e):
    print(e)
    print('Error Occured at '+ request.event["message"]) # "my error event"
    print(request.event["args"])    # (data,)
@app.route("/ajax/first")
def ajax_all():
    return jsonify({'users':get_users(),'channels':[*messages]})
@app.route("/ajax/messages")
def ajax_channel():
    d=request.values.get('channel')
    if d in messages:
        lst=messages[d]
        return jsonify({'users':lst['users'],'msg':lst['messages']})
    return jsonify({'users':[],'msg':[]}) 
def channel_messages(obj):
    messages[obj['room']]['messages'].append(obj['msg'])
    socketio.emit('new message',{'msg':obj['msg'],'user':obj['user']}, room=obj['room'])
socketio.on_event('new message',channel_messages)    
# @socketio.on('message received')
# def add_message():
#     emit('user Connected', {'data': 'Connected'})
@socketio.on('user logout')
def user_disconnect(data):
    user=data['user']
    channel=data['room']
    online_users.pop(user,None)
    if channel:
        if channel in messages:
            if user in messages[channel]['users']:
                messages[channel]['users'].remove(user)
                leave_room(channel)
    sentUpdate()
    # emit('all users',{'users':[*online_users]}, broadcast=True)
@socketio.on('user connect')
def userJoin(data):
    user=data['user']
    online_users[user]=request.sid
    sentUpdate()
    # emit('all users',{'users':get_users()}, broadcast=True)
@socketio.on('user online')
def on_online(d):
    u=d['user']
    if not u in online_users:
        online_users[u]=request.sid
    if d['room']:
        if not d['room'] in messages:
            messages[d['room']]={'users':[u],'messages':[[u,'Room is Activated']],'created_by':u}
        join_room(d['room'])
    sentUpdate()
@socketio.on('channel created')
def add_channel(data):
    c=str(data['channel']).strip()
    if c in messages:
        return ""
    intro=[[data['user'],'Channel is created by '+data['user']]]
    messages[c]={'users':[],'messages':intro,'created_by':data['user']}
    sentUpdate()
    # emit('all channels',{'channels':[*messages]}, broadcast=True)
@socketio.on('join')
def on_join(data):
    d=data
    u = d['user']
    r=d['room']
    d['msg']=[u,u + ' has entered the room.']
    join_room(r)
    m=messages[r]
    print(m,file=sys.stderr)
    print(m['users'],file=sys.stderr)
    m['users'].append(u)
    channel_messages(d)

@socketio.on('leave')
def on_leave(data):
    user = data['user']
    room = data['room']
    leave_room(room)
    send(user + ' has left the room.', room=room)




if __name__ == '__main__':
    socketio.run(app)