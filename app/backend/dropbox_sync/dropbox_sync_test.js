const DropboxSync = require('./dropbox_sync.js');

async function test() {
  const TOKEN = "";

  var sync = new DropboxSync(TOKEN);

  //var ret = await sync.syncFileTwoWay('/home/tobi/tmp/dropbox/test.txt', '/ezra2/test.txt');
  //console.log(ret);

  var authenticated = await sync.isAuthenticated();
  console.log(authenticated);
}

test();
