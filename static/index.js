$(() => {
  faceOf();
  $('[data-toggle="tooltip"]').tooltip();
  $('#userJoin').on('click', join);
});
var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);
const user = () => {
  return localStorage.getItem('user')
}
const faceOf = () => {
  if (localStorage.getItem('user')) {
    $('#meUser').html(user());
    $('#loginCard').hide();
    $('#mainpage').show();
    $('.navbar').show();
    loadUandC();    
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

const join = () => {
  const u = $('#username').val();
  if (u.length < 3) {
    return alert('Use stronger username!')
  }
  localStorage.setItem('user', u);
  socket.emit('user connect', {
    'user': u,
  });
  faceOf();
}
const addChannel = (justModal) => {
  if (justModal) {
    return $('#addChannelModal').modal();
  }
  let c = $('#channelName').val();
  $('#addChannelModal').modal('hide');
  if (c.length < 3) {
    return alert('PLease Select Stronger Name!')
  }
  socket.emit('channel created', {
    'channel': c,
    'user': user()
  });
}
const loadUandC = () => {
  $.ajax({
    url: '/ajax/first',
  }).done(data => {
    console.log(data);
    updateChannels(data.channels);
    updateUsers(data.users);    
  });
}
const updateChannels=list=>{
  $('#channels').empty();
  list.forEach(el => {
    $('#channels').append(`<li class="list-group-item">${el}</li>`)
  });
}
const updateUsers=list=>{
  $('#onUsers').empty();
  list.forEach(el => {
    act = el == user() ? 'active' : '';
    $('#onUsers').append(`<li class="list-group-item ${act}">${el}</li>`)
  });
}
const userLine=a=> `<li class="list-group-item">${a[0]}<i class="far fa-comments fa-lg ml-2" href='${a[1]}' data-toggle="tooltip" data-placement="right" title='chat'></i></li>`;
const channelLine=a=>`<li class="list-group-item">${a[0]}<i class="fas fa-sign-in-alt fa-lg ml-2" href='${a[1]}' data-toggle="tooltip" data-placement="right" title='Join'></i></li>`;
