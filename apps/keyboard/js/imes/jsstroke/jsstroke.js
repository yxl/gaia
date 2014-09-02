'use strict';

var strokeSearchSingle;
var assocSearchSingle;
var keywordHeap;
var assocRetHeap;
var charRetHeap;

var Module = {

  _isReady: false,

  filePackagePrefixURL:'js/imes/jsstroke/',

  canvas: {},

  _main: function(){
    assocSearchSingle=
      Module.cwrap('assocSearchSearch','number',
      ['number','number','number']);
    strokeSearchSingle=
      Module.cwrap('strokeSearchSearch','number',
      ['string','number','number']);
    Module.ccall('assocSearchInit','',[],[]);
    Module.ccall('strokeSearchInit','',[],[]);

    var asnDataBytes = 100 * 6 * 2;
    var kwnDataBytes = 6 * 2;
    var chnDataBytes = 100 *  2;
    var asdataPtr = Module._malloc(asnDataBytes);
    var kwdataPtr = Module._malloc(kwnDataBytes);
    var chdataPtr = Module._malloc(chnDataBytes);
    assocRetHeap = new Uint16Array(this.HEAPU16.buffer,
      asdataPtr, asnDataBytes/2);
    keywordHeap = new Uint16Array(this.HEAPU16.buffer,
      kwdataPtr, kwnDataBytes/2);
    charRetHeap = new Uint16Array(this.HEAPU16.buffer,
      chdataPtr, chnDataBytes/2);

    Module._isReady = true;
  },

  assocGetResults: function (keywords, limit) {
    var id = 0;
    for (id = 0; id<assocRetHeap.length;id++){
      assocRetHeap[id] = 0;
    }
    for (id = 0; id<keywords.length;id++){
      keywordHeap[id] = keywords.charCodeAt(id);
    }
    for (id=keywords.length; id<6; id++){
      keywordHeap[id] = '\0';
    }
    assocSearchSingle(keywordHeap.byteOffset,limit,assocRetHeap.byteOffset);

    var phraseResult = [];
    var phraseId = 0;
    while (assocRetHeap[phraseId*6]) {
      var charResult = '';
      var charId = phraseId*6;
      while(assocRetHeap[charId]){
        charResult += String.fromCharCode(assocRetHeap[charId]);
        ++charId;
      }
      phraseResult.push(charResult);
      ++phraseId;
    }
    return phraseResult;
  },

  strokeGetResults: function (strokes, limit) {
    for (var id = 0; id<charRetHeap.length;id++){
      charRetHeap[id] = 0;
    }
    strokeSearchSingle(strokes,limit,charRetHeap.byteOffset);

    var charResult = [];
    id = 0;
    //If id excesses range, the result will be undefined.
    while(charRetHeap[id]){
      charResult.push(String.fromCharCode(charRetHeap[id]));
      ++id;
    }
    return charResult;
  },
};
  
  
(function () {

/* for non-Mozilla browsers */
if (!KeyEvent) {
  var KeyEvent = {
    DOM_VK_BACK_SPACE: 0x8,
    DOM_VK_RETURN: 0xd
  };
}

var IMEngineBase = function engineBase_constructor() {
  this._glue = {};
};

IMEngineBase.prototype = {
  /**
   * Glue ojbect between the IMEngieBase and the IMEManager.
   */
  _glue: {
    /**
     * The source code path of the IMEngine
     * @type String
     */
    path: '',

    /**
     * Sends candidates to the IMEManager
     */
    sendCandidates: function(candidates) {},

    /**
     * Sends pending symbols to the IMEManager.
     */
    sendPendingSymbols: function(symbols) {},

    /**
     * Passes the clicked key to IMEManager for default action.
     * @param {number} keyCode The key code of an integer.
     */
    sendKey: function(keyCode) {},

    /**
     * Sends the input string to the IMEManager.
     * @param {String} str The input string.
     */
    sendString: function(str) {},

    /**
     * Change the keyboad
     * @param {String} keyboard The name of the keyboard.
     */
    alterKeyboard: function(keyboard) {}
  },

  /**
   * Initialization.
   * @param {Glue} glue Glue object of the IMManager.
   */
  init: function engineBase_init(glue) {
    this._glue = glue;
  },

  /**
   * Destruction.
   */
  uninit: function engineBase_uninit() {
  },

  /**
   * Notifies when a keyboard key is clicked.
   * @param {number} keyCode The key code of an integer number.
   */
  click: function engineBase_click(keyCode) {
  },

  /**
   * Notifies when pending symbols need be cleared
   */
  empty: function engineBase_empty() {
  },

  /**
   * Notifies when a candidate is selected.
   * @param {String} text The text of the candidate.
   * @param {Object} data User data of the candidate.
   */
  select: function engineBase_select(text, data) {
  },

  /**
   * Notifies when the IM is shown
   */
  activate: function engineBase_activate(language, state, options) {
  },

  /**
   * Called when the keyboard is hidden
   */
  deactivate: function engineBase_deactivate() {
  }
};

var IMEngine = function engine_constructor() {
  IMEngineBase.call(this);
};

IMEngine.prototype = {
  // Implements IMEngineBase
  __proto__: new IMEngineBase(),

  // Buffer limit will force output the longest matching terms
  // if the length of the syllables buffer is reached.
  _kBufferLenLimit: 51,

  // Remember the candidate length of last searching result because we don't
  // want to output all candidates at a time.
  // Set it to 0 when we don't need the candidates buffer anymore.
  _candidatesLength: 0,

  /**
   * The last selected text used to generate prediction.
   * @type string
   */
  _historyText: '',
  _pendingSymbols: '',
  _firstCandidate: '', 
  _keypressQueue: [],
  _isWorking: false,
  _isActive: false,
  _uninitTimer: null,

  _sendPendingSymbols: function engine_sendPendingSymbols() {
    if (this._pendingSymbols) {
      var self = this;
      var symbols = '';
      var len = this._pendingSymbols.length;
      for (var id = 0; id< len; id++){
        switch(this._pendingSymbols[id]){
        case 'h':
          symbols += '㇐';
          break;
        case 's':
          symbols += '㇑';
          break;
        case 'p':
          symbols += '㇓';
          break;
        case 'n':
          symbols += '㇔';
          break;
        case 'z':
          symbols += '㇜';
          break;
        case '?':
          symbols += '*';
          break;
        }
      }
      self._glue.setComposition(symbols);
    } else {
      this._glue.endComposition();
    }
  },

  /**
   * Send candidates list.
   * @param {Array.<string>} candidates The candidates to be sent.
   * @return {void}  No return value.
   */
  _sendCandidates: function engine_sendCandidates(candidates) {
    var list = [];
    var len = candidates.length;
    for (var id = 0; id < len; id++) {
      var cand = candidates[id];
      if (id === 0) {
        this._firstCandidate = cand;
      }
      list.push([cand, id]);
    }
    this._glue.sendCandidates(list);
  },

  _start: function engine_start() {
    if (this._isWorking){
      return;
    }
    this._isWorking = true;
    this._next();
  },

  _next: function engine_next() {

    if (!this._keypressQueue.length) {
      this._isWorking = false;
      return;
    }

    var code = this._keypressQueue.shift();

    // Code 333 is a special keycode for the all-match key.
    var realCode =  (code == 333) ? 63 : code;

    if (code === 0) {
      // This is a select function operation.
      this._updateCandidatesAndSymbols(this._next.bind(this));
      return;
    }

    // Backspace - delete last input symbol if exists
    if (code === KeyEvent.DOM_VK_BACK_SPACE) {
      if (!this._pendingSymbols) {
        if (this._firstCandidate) {
          // prevent updateCandidateList from making the same suggestions
          this.empty();
        }
        // pass the key to IMEManager for default action
        this._glue.sendKey(realCode);
        this._next();
      } else {
        this._pendingSymbols = this._pendingSymbols.substring(0,
          this._pendingSymbols.length - 1);
        this._updateCandidatesAndSymbols(this._next.bind(this));
      }
      return;
    }

    // Select the first candidate if needed.
    if (code === KeyEvent.DOM_VK_RETURN ||
        !this._isStrokeKey(code) ||
        this._pendingSymbols.length >= this._kBufferLenLimit) {
      var sendKey = true;
      if (this._firstCandidate) {
        if (this._pendingSymbols) {
          // candidate list exists; output the first candidate
          this._glue.endComposition(this._firstCandidate);
          // no return here
          if (code === KeyEvent.DOM_VK_RETURN) {
            sendKey = false;
          }
        }
        this._sendCandidates([]);
      }
      //pass the key to IMEManager for default action
      this.empty();
      if (sendKey) {
        this._glue.sendKey(realCode);
      }
      this._next();
      return;
    }

    // add symbol to pendingSymbols
    this._appendNewSymbol(realCode);
    this._updateCandidatesAndSymbols(this._next.bind(this));
  },

  // stroke keys: h,s,p,n,z, and the code for vague search
  // Code values: 333 - all-match key, 104 - 'h', 110 - 'n'
  // 112 - 'p', 115 - 's', 122 - 'z'
  _isStrokeKey :function engine_isStrokeKey(code) {
    if( code===333 || code === 104 ||code ===110 ||
      code===112 || code === 115 ||code ===122) {
      return true;
    }
    return false;
  },
  
  _appendNewSymbol: function engine_appendNewSymbol(code) {
    var symbol = String.fromCharCode(code);
    this._pendingSymbols += symbol;
  },

  _updateCandidatesAndSymbols:function engine_updateCandsAndSymbols(callback) {
    var self = this;
    this._updateCandidateList(function() {
      self._sendPendingSymbols();
      callback();
    });
  },

  _updateCandidateList: function engine_updateCandidateList(callback) {

    var self = this;
    var numberOfCandidatesPerRow = this._glue.getNumberOfCandidatesPerRow ?
      this._glue.getNumberOfCandidatesPerRow() : Number.Infinity;

    this._candidatesLength = 0;
    var num = 0;

    if (!this._pendingSymbols) {
      // If there is no pending symbols, make prediction with the previous
      // select words.

      if(this._historyText){
        var predicts = Module.assocGetResults(this._historyText,50);
        num = predicts.length;
        if (num > numberOfCandidatesPerRow + 1){
          self._candidatesLength = num;
        }
        self._sendCandidates(predicts);
        callback();

      } else {
        this._sendCandidates([]);
        callback();
      }

    } else {
      // Update the candidates list by the pending pinyin string.
      this._historyText = '';
      var candidates = Module.strokeGetResults(this._pendingSymbols,50);
      num = candidates.length;
      if (num > numberOfCandidatesPerRow + 1){
        self._candidatesLength = num;
      }
      self._sendCandidates(candidates);
      callback();
    }
  },

  _alterKeyboard: function engine_changeKeyboard(keyboard) {
    this._resetKeypressQueue();
    this.empty();
    this._glue.alterKeyboard(keyboard);
  },

  _resetKeypressQueue: function engine_abortKeypressQueue() {
    this._keypressQueue = [];
    this._isWorking = false;
  },

  /**
   * Override
   */
  init: function engine_init(glue) {
    IMEngineBase.prototype.init.call(this, glue);
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'js/imes/jsstroke/engine_c.js';
    document.body.appendChild(script);
  },

  /**
   * Override
   */
  uninit: function engine_uninit() {
    IMEngineBase.prototype.uninit.call(this);
    if (this._uninitTimer) {
      clearTimeout(this._uninitTimer);
      this._uninitTimer = null;
    }
    this._resetKeypressQueue();
    this.empty();
  },

  /**
   *Override
   */
  click: function engine_click(keyCode) {
    IMEngineBase.prototype.click.call(this, keyCode);
    if (Module._isReady) {
      switch (keyCode) {
        case -31: // Switch to English Symbol Panel, Page 1
        case -32: // Switch to English Symbol Panel, Page 2
          var index = Math.abs(keyCode);
          var symbolPage = index % 10;
          this._alterKeyboard(
          'zh-Hans-Stroke-Symbol-En-' + symbolPage);
          break;
        default:
          this._keypressQueue.push(keyCode);
          break;
      }
    this._start(); //after click, start search
    }
  },

  /**
   * Override
   */
  select: function engine_select(text, data) {
    IMEngineBase.prototype.select.call(this, text, data);

    var self = this;
    var nextStep = function(text) {
      if (text) {
        if (self._pendingSymbols) {
          self._pendingSymbols = '';
          self._glue.endComposition(text);
        } else {
          self._glue.setComposition('');
          self._glue.endComposition(text);
        }
        self._historyText = text;
        self._candidatesLength = 0;
      }
      self._keypressQueue.push(0);
      self._start();
    };

    nextStep(text);
  },

  /**
   * Override
   */
  empty: function engine_empty() {
    IMEngineBase.prototype.empty.call(this);
    this._pendingSymbols = '';
    this._historyText = '';
    this._firstCandidate = '';
    this._sendPendingSymbols();
    this._sendCandidates([]);
  },

  /**
   * Override
   */
  activate: function engine_activate(language, state, options) {
    IMEngineBase.prototype.activate.call(this, language, state, options);
    var self = this;
    self._start();
    this._isActive = true;
  },

  getMoreCandidates: function engine_getMore(indicator, maxCount, callback) {
    if (this._candidatesLength === 0) {
      callback(null);
      return;
    }
    var num = this._candidatesLength;
    maxCount = Math.min((maxCount || num) + indicator, num);
    var totalResNum = 50;
    var results = this._pendingSymbols ?
      Module.strokeGetResults(this._pendingSymbols,totalResNum):
      Module.assocGetResults(this._historyText,totalResNum);
    var len = results.length;
    var list = [];
    for (var i = indicator; i < len; i++) {
      list.push([results[i], i+indicator]);
    }
    callback(list);
  }

};

var jsstroke = new IMEngine();

// Expose jspinyin as an AMD module
if (typeof define === 'function' && define.amd) {
  define('jsstroke', [], function() { return jsstroke; });
}

// Expose the engine to the Gaia keyboard
if (typeof InputMethods !== 'undefined') {
  InputMethods.jsstroke = jsstroke;
}

})();