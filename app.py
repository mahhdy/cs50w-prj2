import os,sys
from collections import OrderedDict
from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO,send, emit, join_room, leave_room
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config["UPLOAD_DIR"] = os.getenv("UPLOAD_DIR")
socketio = SocketIO(app)
MESSAGES_LIMIT = 100
channels = {}
online_users = {}
def get_users():
    return [list(x) for x in online_users.items()]
def sentUpdate():
    emit('update',{'users':get_users(),'msg':channels,'channels':[*channels]}, broadcast=True)
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
    return jsonify({'users':get_users(),'channels':[*channels]})
@app.route("/ajax/messages")
def ajax_channel():
    d=request.values.get('channel')
    if d in channels:
        lst=channels[d]
        return jsonify({'users':lst['users'],'msg':lst['messages'][-100:]})
    return jsonify({'users':[],'msg':[]}) 
@app.route("/ajax/all")
def ajax_log():
    return jsonify({'users':get_users(),'rest':channels})     
def channel_messages(obj):
    channels[obj['room']]['messages'].append(obj['msg'])
    channels[obj['room']]['messages']=channels[obj['room']]['messages'][-100:]
    socketio.emit('new message',{'msg':channels[obj['room']]['messages'],'user':obj['user']}, room=obj['room'])#obj['msg']
socketio.on_event('new message',channel_messages)   
@socketio.on('user logout')
def user_disconnect(data):
    user=data['user']
    channel=data['room']
    online_users.pop(user,None)
    if channel:
        if channel in channels:
            if user in channels[channel]['users']:
                channels[channel]['users'].remove(user)
                leave_room(channel)
    sentUpdate()
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
        if not d['room'] in channels:
            channels[d['room']]={'users':[u],'messages':[[u,'Room is Activated',d['time']]],'created_by':u}
        join_room(d['room'])
    sentUpdate()
@socketio.on('channel created')
def add_channel(data):
    c=str(data['channel']).strip()
    if c in channels:
        return ""
    intro=[[data['user'],'Channel is created by '+data['user'],data['time']]]
    channels[c]={'users':[],'messages':intro,'created_by':data['user']}
    sentUpdate()
@socketio.on('join')
def on_join(data):
    d=data
    u = d['user']
    r=d['room']
    d['msg']=[u,u + ' has entered the room.',d['time']]
    join_room(r)
    m=channels[r]
    m['users'].append(u)
    channel_messages(d)

@socketio.on('leave')
def on_leave(data):
    user = data['user']
    room = data['room']
    leave_room(room)
    channels[room]['users'].remove(user)
    send(user + ' has left the room.', room=room)




if __name__ == '__main__':
    socketio.run(app)