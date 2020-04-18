window.emojioneVersion = "3.1";
$(() => {
  faceOf();
  $('[data-toggle="tooltip"]').tooltip();
  $('#userJoin').on('click', join);
  const picker=new EmojiButton({position:'top'});//{position:'top-end'}
  picker.on('emoji',emoji=>document.querySelector('#msg').value += emoji);
  $('#emj').click(()=>picker.togglePicker())
  // input.addEventListener('click',()=>picker.togglePicker(input));
   // window.emojioneVersion = "2.1.1"; 
  // $('#msg').emojioneArea(
  //   {
  //   // container: "#msg",
  //   pickerPosition: "top",
  //   // hideSource: false,
  //   // inline: true,
  //   // useSprite: false,
  //   // standalone: true,
  // }
  // );
});
var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);
const user = () => localStorage.getItem('user');
const channel = () => localStorage.getItem('channel');
const userLine=(a,b)=> `<li class="list-group-item ${b}">${a[0]}<i class="far fa-comments fa-lg ml-2" onclick='sendPM("${a[1]}")' data-toggle="tooltip" data-placement="right" title='chat'></i></li>`;
const channelLine=(a,b)=>`<li class="list-group-item ${b}">${a}<i class="fas fa-sign-in-alt fa-lg ml-2" onclick='joinChannel("${a}")' data-toggle="tooltip" data-placement="right" title='Join'></i></li>`;
// ${a[0]==user()?"class='float-right'":""}  @ ${moment().format('H:mm:ss')} 
const messageLine=a=>$('#channelMessages').append(`<li>${a[0]}>> ${a[1]} </li>`);
const faceOf = () => {
  if (user()) {
    $('#meUser').html(user());
    connect(user());
    $('#loginCard').hide();
    $('#mainpage').show();
    $('.navbar').show();
    loadUandC(); 
    $('#chName').text('None');
    if (channel()) {loadMsg()}
  } else {
    $('#loginCard').show();
    $('#mainpage').hide();
    $('.navbar').hide();
  }
}
const logout = () => {
  let u = user();
  localStorage.removeItem('user');
  localStorage.removeItem("channel");
  console.log(u+' is log out!');
  socket.emit('user logout', {
    'user': u
  });
  faceOf();
}
socket.on('all users', (m) => {
  $('#onUsers').empty();
  updateUsers(m.users);
});
socket.on('all channels', (m) => {
  $('#channels').empty();
  updateChannels(m.channels);
});
socket.on('joint to channel', (m) => {
  $('#channelMessages').empty();
  updateChannels(m.channels);
});
socket.on('new message', (data) => {
  $('#channelMessages').append(messageLine(data.msg));
});
const join = () => {
  const u = $('#username').val();
  if (u.length < 3) {
    return alert('Use stronger username!')
  }
  localStorage.setItem('user', u);
  connect(u);
  faceOf();
}
const connect=u=>socket.emit('user connect', {'user': u});
const addChannel = (justModal) => {
  const node=$('#addChannelModal');
  if (justModal) {
    return $(node).modal();
  }
  let c = $('#channelName').val();
  if (c.length < 3) {
    return alert('PLease Select Stronger Name!')
  }
  $(node).modal('hide');  
  $('#channelName').val('');
  socket.emit('channel created', {
    'channel': c,
    'user': user()
  });
}
const loadUandC = () => {
  $.ajax({
    url: '/ajax/first',
  }).done(data => {
    updateChannels(data.channels);
    updateUsers(data.users);
    $('#usCount').text(data.users.length);
  });
}
const loadMsg = () => {
  joinChannel(channel());
  $.ajax({
    url: '/ajax/messages',
    data:{'channel':channel()}
  }).done(data => {
    console.log(data);
    data['msg'].forEach(e=>messageLine(e));
    updateChannels(data.channels);
    updateUsers(data.users);
    $('#usCount').text(data.users.length);
    $('#chName').text(channel()?channel():'None');
  }).fail(function() {
    alert( "error Loading Messages" );
  });
}
const updateChannels=list=>{
  if (!list){return false}
  $('#channels').empty();
  list.forEach(el => {
    $('#channels').append(channelLine(el))
  });
}
const updateUsers=list=>{
  $('#onUsers').empty();
  list.forEach(el => $('#onUsers').append(userLine(el,el[0] == user() ? 'active' : '')));
} 
const joinChannel=name=>{
  localStorage.setItem('channel',name);
  $('#channelMessages').empty();
  $('#chName').text(name);
  socket.emit('join',{'user':user(),'room':name});
}
const sendPM=uID=>{
  alert('I am going to chat at ' + uID.toString() + ' channel');
}
const sendMsg=()=>{
  const msg=$('#msg').val().trim();
  const u=user();
  const c=channel();
  if (msg.length<2 || msg.length>100){return alert('message should be more than 3 and less than 100 characters!')}
  $('#msg').val('');
  socket.emit('new message',{'user':u,'msg':[u,msg],'room':c});
}