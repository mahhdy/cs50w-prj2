import os,sys
from collections import OrderedDict
from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO,send, emit, join_room, leave_room,rooms,close_room
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
    emit('update',{'users':get_users(),'msg':channels,'channels':[*channels],'join':rooms()}, broadcast=True)
@app.route("/")
def index():
    return render_template('index.html')
@socketio.on_error()
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
@app.route("/ajax/check")
def ajax_check():
    u=request.values.get('name')
    if u in online_users:
        return jsonify({'res':True})
    return jsonify({'res':False})
@app.route("/ajax/all")
def ajax_log():
    return jsonify({'users':get_users(),'rest':channels})
@socketio.on('new message')
def channel_messages(obj):
    channels[obj['room']]['messages'].append(obj['msg'])
    channels[obj['room']]['messages']=channels[obj['room']]['messages'][-100:]
    socketio.emit('new message',{'msg':obj['msg'],'user':obj['user'],'room':obj['room']}, room=obj['room'])
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
@socketio.on('user online')
def on_online(d):
    u=d['user']
    if not u in online_users:
        online_users[u]=request.sid
    if d['room']:
        if not d['room'] in channels:
            channels[d['room']]={'users':[u],'messages':[[u,'Room is Activated',d['time']]],'created_by':u}
        join_room(d['room'])
        if not u in channels[d['room']]['users']:
            channels[d['room']]['users'].append(u)
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
    u = data['user']
    r=data['room']
    join_room(r)
    channels[r]['users'].append(u)
    sentUpdate()
    # socketio.emit('all message',{'msg':channels[r]['messages'][-100:],'user':u,'room':r}, room=r,include_self=True)
    socketio.emit('announce alert',{'alert':u+' is happy to join the '+r,'user':u,'room':r}, room=r,include_self=False)
    return channels[r]['messages'][-100:]
@socketio.on('delete room')
def del_room(data):
    r = data['room']
    u = data['user']
    if channels[r]['created_by']==u:
        close_room(r)
        channels.pop(r,None)
        sentUpdate()
        return True
    return False
@socketio.on('leave')
def on_leave(data):
    user = data['user']
    room = data['room']
    if room in channels:
        leave_room(room)
        channels[room]['users'].remove(user)
        socketio.emit('announce alert',{'alert':user+' has left '+room,'user':user,'room':room}, room=room,include_self=False)
        if data['doU']:
            sentUpdate()

if __name__ == '__main__':
    socketio.run(app)