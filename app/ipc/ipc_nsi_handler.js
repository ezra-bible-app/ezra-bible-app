const NSI = require('node-sword-interface');
const IpcListener = require('./ipc_listener.js');

class IpcNsiHandler {
  constructor() {
    this._ipcListener = new IpcListener();
    this._nsi = new NSI();
    this._nsi.enableMarkup();

    //this._nsi_getAllLocalModules_counter = 0;
    this._ipcListener.addCallback('nsi_getAllLocalModules', async (moduleType='BIBLE') => {
      //this._nsi_getAllLocalModules_counter++;
      //console.log('nsi_getAllLocalModules ' + this._nsi_getAllLocalModules_counter);
      var allLocalModules = this._nsi.getAllLocalModules(moduleType);
      return allLocalModules;
    });

    //this._nsi_getBookText_counter = 0;
    this._ipcListener.addCallback('nsi_getBookText', async (moduleCode, bookCode, startVerseNr=-1, verseCount=-1) => {
      //this._nsi_getBookText_counter++;
      //console.log('nsi_getBookText ' + this._nsi_getBookText_counter);
      var bookText = this._nsi.getBookText(moduleCode, bookCode, startVerseNr, verseCount);
      return bookText;
    });
  }
}

module.exports = IpcNsiHandler;