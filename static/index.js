$(()=>{
  faceOf();
  $('#userJoin').on('click',join);
});
var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);
const user=()=>{
  return localStorage.getItem('user')
}
const faceOf=()=>{
  if (localStorage.getItem('user')){
    $('#meUser').html(user());
    $('#loginCard').hide();
    $('#mainpage').show();
    $('.navbar').show();
  }else{ 
    $('#loginCard').show();
    $('#mainpage').hide();
    $('.navbar').hide();
  }
}
const logout=()=>{
  let u =user() 
  localStorage.removeItem('user');
  localStorage.removeItem("channel");
  socket.emit('disconnect',{'user':u});
  faceOf();
}
socket.on('user Connected',(m)=>{
  console.log(m['data']);
  alert(m['data']);
});
socket.on('all users',(m)=>{
  $('#onUsers').empty();
  m.users.forEach(el => {
    act = el==user() ? 'active': '';
    $('#onUsers').append(`<li class="list-group-item ${act}">${el}</li>`)
  });
});
socket.on('all channels',(m)=>{
  $('#channels').empty();
  m.channels.forEach(el => {
    $('#channels').append(`<li class="list-group-item">${el}</li>`)
  });
});

const join=()=>{
  const u=$('#username').val();
  if (u.length<3){ return alert('Use stronger username!')}
  localStorage.setItem('user', u);
  socket.emit('user connect', {
    'user':u,
  });
  faceOf();
}
const addChannel1=()=>{
  $('.modal').modal();
}
const addChannel2=()=>{
  let c=$('#channelName').val();
  if (c.length<3){return alert('PLease Select Stronger Name!')}
  socket.emit('channel created', {
    'channel':c,
    'user':user()
  });
}