var global={};
$(() => {
  faceOf();
  $('[data-toggle="tooltip"]').tooltip();
  $('#userJoin').on('click', join);
  const picker=new EmojiButton();
  picker.on('emoji',emoji=>inputUpdate($('#msg'),emoji));
  $('#emj').click(()=>picker.togglePicker());
  $('#username').keypress(e=>{if (e.which == 13) {join(); return false}});
  $('#msg').keypress(e=>{if (e.which == 13) {sendMsg(); return false}});
  $('#channelName').keypress(e=>{if (e.which == 13) {addChannel(); return false}});
  // $('.toast').toast();
});
const inputUpdate=(el,add)=>{
  const s=$(el)[0].selectionStart;
  const cont=$(el).val();
  $(el).val(cont.substring(0,s)+String(add)+cont.substring(s));
};
// var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);
var socket = io();

const user = () => localStorage.getItem('user');
const channel = () => localStorage.getItem('channel');
const userLine=(a,b)=> `<li class="list-group-item ${b}">${a[0]}<i class="far fa-comments fa-lg ml-2" onclick='sendPM("${a[1]}")' data-toggle="tooltip" data-placement="right" title='chat'></i></li>`;
const channelLine=(a,b)=>`<li class="list-group-item ${b}">${a}<i class="fas fa-sign-in-alt fa-lg ml-2" onclick='joinChannel("${a}")' data-toggle="tooltip" data-placement="right" title='Join'></i></li>`;
const messageLine=a=>{
  let node='';
  if (a[0] == user()){
    node=`<div class="text-right">${a[1]} :<small class="text-muted"><u>${a[0]}</u> (${a[2]}) </small></div>`;
  } else {node=`<div class="text-left"><small class="text-muted"> (${a[2]}) <u>${a[0]}</u></small>: ${a[1]}</div>`;}
  $('#channelMessages').prepend(node);
};
const faceOf = () => {
  if (user()) {
    $('#meUser').html(user());
    online(user());
    $('#loginCard').hide();
    $('#mainpage').show();
    $('.navbar').show();
    loadUandC(); 
    $('#chName').text('None');
    if (channel()) {loadMsg();}
  } else {
    $('#loginCard').show();
    $('#mainpage').hide();
    $('.navbar').hide();
  }
};
const logout = () => {
  let u = user();
  let c= channel();
  localStorage.removeItem('user');
  localStorage.removeItem("channel");
  console.log(u+' is logged out!');
  socket.emit('user logout', {'user': u,'room':c});
  faceOf();
};
const updateEnv=m=>{
  $('#onUsers').empty();
  $('#channels').empty();  
  updateUsers(m.users);
  updateChannels(m.channels);
  $('#usCount').text(m.users.length);
  $('#chName').text(channel()?channel():'None');
};
socket.on('update', (m) => {
  global=m;
  updateEnv(m);
});
socket.on('joint to channel', (m) => {
  $('#channelMessages').empty();
  updateChannels(m.channels);
});
socket.on('new message',(data) => {
  if (data.room!=channel()){return false}
  messageLine(data.msg);
});
socket.on('all message', (data) => {
  if (data.room!=channel()){return false}
  $('#channelMessages').empty();
  data.msg.forEach(e=>messageLine(e));
});
const join = () => {
  const u = $('#username').val();
  if (u.length < 3) {
    return alert('Use stronger username!');
  }
  localStorage.setItem('user', u);
  connect(u);
  faceOf();
};
const online=u=>socket.emit('user online', {'user': u, 'room':channel()?channel():null,'time':moment().format('HH:mm:ss')});
const connect=u=>socket.emit('user connect', {'user': u});
const addChannel = (justModal) => {
  const node=$('#addChannelModal');
  if (justModal) {
    return $(node).modal();
  }
  let c = $('#channelName').val().trim();
  cList=$('#channels li').text().split('Join');
  if (c.length < 3) {
    return alert('PLease Select Stronger Name!');
  }
  if (cList.indexOf(c)>-1){return alert('this Channel name already exist!')}
  $(node).modal('hide');  
  $('#channelName').val('');
  socket.emit('channel created', {
    'channel': c,
    'user': user(),
    'time':moment().format('HH:mm:ss')
  });
};
const loadAll=()=>{
  $.ajax({
    url: '/ajax/all',
  }).done(data => console.log(data))
  return 'Done';
};
const loadUandC = () => {
  $.ajax({
    url: '/ajax/first',
  }).done(updateEnv);
};
const loadMsg = () => {
  $.ajax({
    url: '/ajax/messages',
    data:{'channel':channel()}
  }).done(data => {
    data.msg.forEach(e=>messageLine(e));
  }).fail(function() {
    alert( "error Loading Messages" );
  });
};
const updateChannels=list=>{
  if (!list){return false;}
  $('#channels').empty();
  if (list.indexOf(channel())==-1){deletChannel();}
  list.forEach(el => $('#channels').append(channelLine(el,el == channel() ? 'active' : '')));
};
const updateUsers=list=>{
  $('#onUsers').empty();
  list.forEach(el => $('#onUsers').append(userLine(el,el[0] == user() ? 'active' : '')));
} ;
const joinChannel=name=>{
  localStorage.setItem('channel',name);
  $('#channelMessages').empty();
  $('#chName').text(name);
  updateChannels(channelLists());
  socket.emit('join',{'user':user(),'room':name,'time':moment().format('HH:mm:ss')});
};
const sendPM=uID=>{
  alert('Under Development');
};
const sendMsg=()=>{
  const msg=$('#msg').val().trim();
  const u=user();
  const c=channel();
  if (c=='None' || !c){return alert('Please join a channel first!');}
  const t=moment().format('HH:mm:ss');
  if (msg.length<2 || msg.length>400){return alert('message should have between 1 and 400 characters!');}
  $('#msg').val('');
  socket.emit('new message',{'user':u,'msg':[u,msg,t],'room':c,'time':t});
};
const channelLists=()=>{
  l=$('#channels li').text().split('Join');
  l.pop();
  return l;
}
const leaveRoom=()=>{
  socket.emit('leave',{'user':user(),'room':channel(),'time':moment().format('HH:mm:ss')});
  channelSwitch();
};
const delRoom=()=>{
  let c=channel();
  socket.emit('delete room',{'user':user(),'room':c,'time':moment().format('HH:mm:ss')}, r => {
    if (r) {
      deletChannel();
    } else{
      alert('Only Channel Owners can Delete the channels!');
    } 
  });
}
const channelSwitch=()=>{
  localStorage.removeItem("channel");
  $('#chName').text('None');
  $('#channelMessages').empty();
  updateChannels(channelLists());
}
const deletChannel=()=>{
  channelSwitch();
  $('#channelMessages').append(`<h1 class="text-center">${c} is Deleted.`);
}