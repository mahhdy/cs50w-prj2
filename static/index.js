var global={};
$(() => {
  faceOf();
  $('[data-toggle="tooltip"]').tooltip();
  $('#userJoin').on('click', join);
  const picker=new EmojiButton();
  picker.on('emoji',emoji=>inputUpdate($('#msg'),emoji));
  $('#emj').click(()=>picker.togglePicker());
  $('#username').keypress(e=>{if (e.which == 13) {join(); return false;}});
  $('#msg').keypress(e=>{if (e.which == 13) {sendMsg(); return false;}});
  $('#channelName').keypress(e=>{if (e.which == 13) {addChannel(); return false;}});
  $('h5.card-header').click(function(e){
    $('.list-group-flush').addClass('d-none d-sm-block d-md-none');
    $(this).next().removeClass('d-none d-sm-block d-md-none');
  });
    
  // $('.toast').toast();
});
const inputUpdate=(el,add)=>{
  const s=$(el)[0].selectionStart;
  const cont=$(el).val();
  $(el).val(cont.substring(0,s)+String(add)+cont.substring(s));
  setTimeout(()=> $(el).focus(), 500);
};
// var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);
var socket = io();

const user = () => localStorage.getItem('user');
const channel = () => localStorage.getItem('channel');
const userLine=(a,b)=> `<li class="list-group-item ${b}" data-user='${a[0]}' onclick='sendPM("${a[1]}")' >${a[0]}<span class="badge badge-warning ml-1">channel</span><i class="far fa-comments fa-lg ml-2" onclick='sendPM("${a[1]}")' data-toggle="tooltip" data-placement="right" title='chat'></i></li>`;
const channelLine=a=>`<li class="list-group-item" data-channel='${a}' onclick='joinChannel("${a}")' ><span class="badge badge-pill badge-warning mr-2">${global.msg? global.msg[a].users.length:0}</span>${a}<i class="fas fa-sign-in-alt fa-lg ml-2" onclick='' data-toggle="tooltip" data-placement="right" title='Join'></i></li>`;//joinChannel("${a}")
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
  updateUsers(m.users);
  updateChannels(m.channels);
  $('#usCount').text(`(${m.users.length})`);
  $('#cnCount').text(`(${m.channels.length})`);
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
socket.on('announce alert',(data) => {
  if (data.room!=channel()){return false;}
  $('#channelMessages').prepend(`<div class="text-center"><small class="text-muted"> ${data.alert}</small></div>`);
});
socket.on('new message',(data) => {
  if (data.room!=channel()){return false;}
  messageLine(data.msg);
});
const join = () => {
  const u = $('#username').val();
  if (u.length < 3) {return Swal.fire({icon: 'error',title: 'Ooops..', text: 'Use stronger username!'});}
  $.get('/ajax/check',{name:u},d=>{
    if (d.res) {return Swal.fire({
      icon: 'error',
      title: 'Ooops..',
      text: 'Display Name is not Available',
    });}
    localStorage.setItem('user', u);
    connect(u);
    faceOf();    
  }).fail(()=>{ Swal.fire({
      icon: 'error',
      title: 'Ooops..',
      text: 'Somethiong Was Wrong, refresh the Page',
    });}    
  );
};
const online=u=>socket.emit('user online', {'user': u, 'room':channel()?channel():null,'time':moment().format('HH:mm:ss')});
const connect=u=>socket.emit('user connect', {'user': u});
const addChannel =async () => {
  const { value: text } = await Swal.fire({
    title: 'New Channel Name',
    input: 'text',
    inputPlaceholder: 'Type new chanel name here...',
    showCancelButton: true,
    inputValidator: (value) => {
      if (value.trim().length<3) {return 'PLease Select Stronger Name!';}
      if (global.channels.indexOf(value)>-1){return'this Channel name already exist!';}
    }
  });  
  if (text) {
  $('#addChannelModal').modal('hide');  
  $('#channelName').val('');
  socket.emit('channel created', {
    'channel': text,
    'user': user(),
    'time':moment().format('HH:mm:ss')
  });    
  }
};
const loadAll=()=>{
  var res={};
  $.ajax({
    url: '/ajax/all',
    success: d=>res=d,
    async:false
  });
  return res;
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
  }).fail(function() {Swal.fire({
      icon: 'error',
      title: 'Ooops..',
      text: 'error Loading Messages',
    });
  });
};
const updateChannels=list=>{
  if (!list){return false;}
  $('#channels').empty();
  let c=channel();
  if (list.indexOf(c)==-1){
    channelSwitch();
    $('#channelMessages').append(`<h1 class="text-center bg-warning">${c == null?'No Channel is Selected Yet!': c+' is Deleted.'} </h1>`);
  }
  list.sort().forEach(el => $('#channels').append(channelLine(el)));
  $(`[data-channel="${c}"]`).addClass('active');
};
const updateUsers=list=>{
  $('#onUsers').empty();
  list.sort().forEach(el => $('#onUsers').append(userLine(el,el[0] == user() ? 'active' : '')));
};
const joinChannel=name=>{
  if (channel()){socket.emit('leave',{'user':user(),'room':channel(),'doU':false});}  
  localStorage.setItem('channel',name);
  $('#channelMessages').empty();
  $('#chName').text(name);
  $('[data-channel]').removeClass('active');
  $(`[data-channel="${name}"]`).addClass('active');
  socket.emit('join',{'user':user(),'room':name,'time':moment().format('HH:mm:ss')},d=>d.forEach(e=>messageLine(e)));
};
const sendPM=uID=> Swal.fire({icon: 'info',title: 'Ooops..', text: 'Under Development!'});
const sendMsg=()=>{
  const msg=$('#msg').val().trim();
  const u=user();
  const c=channel();
  if (c=='None' || !c){return Swal.fire({icon: 'info',title: 'Ooops..', text: 'Please Join a Channel First!'});}
  const t=moment().format('HH:mm:ss');
  if (msg.length<2 || msg.length>400){return Swal.fire({icon: 'Error',title: 'Out Of Limit', text: 'messages should have between 1 and 400 characters!'});}
  $('#msg').val('');
  socket.emit('new message',{'user':u,'msg':[u,msg,t],'room':c,'time':t});
};
const leaveRoom=()=>{
  socket.emit('leave',{'user':user(),'room':channel(),'time':moment().format('HH:mm:ss')});
  channelSwitch();
};
const delRoom=()=>{
  let c=channel();
  socket.emit('delete room',{'user':user(),'room':c,'time':moment().format('HH:mm:ss')}, r => {
    if (!r) { Swal.fire({icon: 'info',title: 'Ooops..', text: 'Only Channel Owners can Delete the channels!'}); } 
  });
};
const channelSwitch=()=>{
  localStorage.removeItem("channel");
  $('#chName').text('None');
  $('#channelMessages').empty();
};