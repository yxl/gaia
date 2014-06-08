/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function importScripts(urls, callback) {
  if (urls.length > 1) {
    // Load the nth file as soon as everything up to the
    // n-1th one is done.
    importScripts(urls.slice(0,urls.length-1), function () {
      importScripts([urls[urls.length-1]], callback);
    });
    return;
  }
  var script = document.createElement('script');
  script.src = urls[0];
  script.onload = callback;
  document.body.appendChild(script);
}

(function() {
  importScripts(['js/imes/jsshouxie/zinnia-engine.js', 'js/imes/jsshouxie/emscripten_zinnia.js'], function() {
      console.log('loaded\n');
    });

    
var debugging = false;
var debug = function jsshouxie_debug(str) {
  if (!debugging) {
    return;
  }

  var done = false;
  if (typeof window != 'undefined' && window.dump) {
    window.dump('jsshouxie: ' + str + '\n');
    done = true;
  }
  if (typeof console != 'undefined' && console.log) {
    console.log('jsshouxie: ' + str);
    if (arguments.length > 1) {
      console.log.apply(this, arguments);
    }
    done = true;
  }
  if (done) {
    return;
  }
  if (typeof Test != 'undefined') {
    print('jsshouxie: ' + str + '\n');
  }
};

var assert = function jsshouxie_assert(condition, msg) {
  if (!debugging)
    return;
  if (!condition) {
    var str = typeof msg === 'undefined' ? assert.caller.toString() : msg;
    if (typeof alert === 'function') {
      alert(msg);
    } else {
      throw str;
    }
  }
};

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
  _kBufferLenLimit: 30,

  // Remember the candidate length of last searching result because we don't
  // want to output all candidates at a time.
  // Set it to 0 when we don't need the candidates buffer anymore.
  _candidatesLength: 0,

  _workerTimeout: 600000,

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

  // Current keyboard
  _keyboard: 'zh-Hans-Shouxie',

  _timeOutId: null,
  _writing: false,
  _isInited: false,
  
  _board: {
    _strokePoints: [],
    
    addStrokePoint: function(x, y) {
      if (x < -1 || y < -1) {
        dump("dd");
      }
      this._strokePoints.push(x, y);
    },
    
    getMousePoint: function(event) {
      var canvas = IMERender.activeIme.querySelector('#handwriting');
      if (!canvas) {
        return [0, 0];
      }
      var canvasRect = canvas.getBoundingClientRect();
      var posX = canvasRect.left - document.body.clientLeft;
      var posY = canvasRect.top - document.body.clientTop;
      return [event.pageX - posX, event.pageY - posY];
    },
    
    sendStrokePoints: function() {
      if (this._strokePoints.length == 0) {
        return;
      }
      var str = HWREngine.recognize(this._strokePoints);
      jsshouxie._sendCandidates(HWREngine.recognize(this._strokePoints));
      jsshouxie._sendPendingSymbols();
      jsshouxie._board.clear();
    },
    
    clear: function() {
        this._strokePoints = [];
        jsshouxie._render.clear();
    },
  },
  
  _render: {
    _lastX: -1,
    _lastY: -1,
    _ctx: null,
    _width: 280,
    _height: 280,
    
    init: function(width, height) {
      var canvas = IMERender.activeIme.querySelector('#handwriting');
      this._ctx = canvas.getContext('2d');
      this._ctx.strokeStyle = "#df4b26";
      this._ctx.lineJoin = "round";
      this._ctx.lineWidth = 5;
      this._width = width;
      this._height = height;
    },
    
    clear: function() {
      this._ctx.clearRect(0, 0, this._width, this._height);
      this._lastX = this._lastY = -1;
    },
    
    draw: function(x, y, start) {
      this._ctx.beginPath();
      if (start) {
        this._lastX = x-1;
        this._lastY = y;
      }
      this._ctx.moveTo(this._lastX, this._lastY);
      this._ctx.lineTo(x, y);
      this._ctx.closePath();
      this._ctx.stroke();
      this._lastX = x;
      this._lastY = y;
    },
  },

  isInCanvas: function(event) {
    var canvas = IMERender.activeIme.querySelector('#handwriting');
    if (!canvas) {
      return false;
    };
    if (!this._isInited) {
      canvas.height = canvas.clientHeight;
      //canvas.addEventListener("touchleave",this.canvasMouseUp);
      this._render.init(canvas.width, canvas.height);
      this._isInited = true;
    }
    var canvasRect = canvas.getBoundingClientRect();
    var body = canvas.ownerDocument.body;
    var left = canvasRect.left - body.clientLeft;
    var top = canvasRect.top - body.clientTop;
    var right = canvasRect.right - body.clientLeft;
    var bottom = canvasRect.bottom - body.clientTop;
    if (event.pageX > left && event.pageX < right && event.pageY > top && event.pageY < bottom) {
      return true;
    } else {
      return false;
    }
  },

  canvasMouseDown: function engine_mousedown(event){
    clearTimeout(this._timeOutId);
    var point = this._board.getMousePoint(event);
    this._board.addStrokePoint(point[0], point[1]);
    this._writing = true;
    this._render.draw(point[0], point[1], true);
  },

  canvasMouseMove: function engine_mousemove(event) {
    if (!this._writing) {
      return;
    }
    
    var point = this._board.getMousePoint(event);
    this._board.addStrokePoint(point[0], point[1]);
    this._render.draw(point[0], point[1], false);
  },

  canvasMouseUp: function engine_mouseup(event) {
    this._timeOutId = setTimeout(this._board.sendStrokePoints.bind(this._board), 500);
    this._writing = false;
    this._board.addStrokePoint(-1, 0);
  },

  _sendPendingSymbols: function engine_sendPendingSymbols() {
    debug('SendPendingSymbol: ' + this._pendingSymbols);
    var self = this;
    self._glue.setComposition(self._firstCandidate.trim());
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
      if (id == 0) {
        this._firstCandidate = cand;
      }
      list.push([cand, id]);
    }

    this._glue.sendCandidates(list);
  },

  _start: function engine_start() {
    if (this._isWorking)
      return;

    this._isWorking = true;
    debug('Start keyQueue loop.');
    this._next();
  },

  _next: function engine_next() {
    debug('Processing keypress');

    if (!this._keypressQueue.length) {
      debug('keyQueue emptied.');
      this._isWorking = false;
      return;
    }

    var code = this._keypressQueue.shift();

    if (code == 0) {
      // This is a select function operation.
      this._updateCandidatesAndSymbols(this._next.bind(this));
      return;
    }

    debug('key code: ' + code);

    // Backspace - delete last input symbol if exists
    if (code === KeyEvent.DOM_VK_BACK_SPACE) {
      debug('Backspace key');

      if (!this._pendingSymbols) {
        if (this._firstCandidate) {
          debug('Remove candidates.');

          // prevent updateCandidateList from making the same suggestions
          this.empty();
        } else {
          // pass the key to IMEManager for default action
          debug('Default action.');
          this._glue.sendKey(code);
        }
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
        !this._isShouxieKey(code) ||
        this._pendingSymbols.length >= this._kBufferLenLimit) {
      debug('Non-pinyin key is pressed or the input is too long.');
      var sendKey = true;
      if (this._firstCandidate) {
        if (this._pendingSymbols) {
          // candidate list exists; output the first candidate
          debug('Sending first candidate.');
          this._glue.endComposition(this._firstCandidate);
          // no return here
          if (code === KeyEvent.DOM_VK_RETURN) {
            sendKey = false;
          }
        }
        this._sendCandidates([]);
      }

      //pass the key to IMEManager for default action
      debug('Default action.');
      this.empty();
      if (sendKey) {
        this._glue.sendKey(code);
      }
      this._next();
      return;
    }

    var symbol = String.fromCharCode(code);

    debug('Processing symbol: ' + symbol);

    // add symbol to pendingSymbols
    this._appendNewSymbol(code);
    this._updateCandidatesAndSymbols(this._next.bind(this));
  },

  _isShouxieKey: function engine_isShouxieKey(code) {
    if (this._keyboard == 'zh-Hans-Shouxie') {
      // '
      if (code == 39) {
        return true;
      }

      // a-z
      if (code >= 97 && code <= 122) {
        return true;
      }
    }

    return false;
  },

  _appendNewSymbol: function engine_appendNewSymbol(code) {
    var symbol = String.fromCharCode(code);
    this._pendingSymbols += symbol;
  },

  _updateCandidatesAndSymbols: function engine_updateCandsAndSymbols(callback) {
    var self = this;
    this._updateCandidateList(function() {
      self._sendPendingSymbols();
      callback();
    });
  },

  _updateCandidateList: function engine_updateCandidateList(callback) {
    debug('Update Candidate List.');

    var self = this;
    var numberOfCandidatesPerRow = this._glue.getNumberOfCandidatesPerRow ?
      this._glue.getNumberOfCandidatesPerRow() : Number.Infinity;

    this._candidatesLength = 0;

    if (!this._pendingSymbols) {
      // If there is no pending symbols, make prediction with the previous
      // select words.
      if (this._historyText) {
        debug('Buffer is empty; make suggestions based on select term.');

      } else {
        this._sendCandidates([]);
        callback();
      }
    } else {
      // Update the candidates list by the pending pinyin string.
      this._historyText = '';

    }
  },

  _alterKeyboard: function engine_changeKeyboard(keyboard) {
    this._resetKeypressQueue();
    this.empty();

    this._keyboard = keyboard;
    this._glue.alterKeyboard(keyboard);
  },

  _resetKeypressQueue: function engine_abortKeypressQueue() {
    this._keypressQueue = [];
    this._isWorking = false;
  },

  _accessUserDict: function engine_loadUserDict(action, param, callback) {
    var indexedDB = window.indexedDB;

    if (!indexedDB) {
      callback(null);
      return;
    }

    // Access user_dict.data from IndexedDB
    var dbVersion = 1;
    var STORE_NAME = 'files';
    var USER_DICT = 'user_dict';

    var request = indexedDB.open('EmpinyinDatabase', dbVersion);

    request.onerror = function opendb_onerror(event) {
      debug('Error occurs when openning database: ' + event.target.errorCode);
      callback(null);
    };

    request.onsuccess = function opendb_onsuccess(event) {
      var db = event.target.result;

      if (action == 'load') {
        var request = db.transaction([STORE_NAME], 'readonly')
                        .objectStore(STORE_NAME).get(USER_DICT);

        request.onsuccess = function readdb_oncomplete(event) {
          db.close();
          if (!event.target.result) {
            callback(null);
          } else {
            callback(event.target.result.content);
          }
        };

        request.onerror = function readdb_oncomplete(event) {
          debug('Failed to read file from DB: ' + event.target.result.name);
          db.close();
          callback(null);
        };
      } else if (action == 'save') {
        var obj = {
          name: USER_DICT,
          content: param
        };

        var request = db.transaction([STORE_NAME], 'readwrite')
                        .objectStore(STORE_NAME).put(obj);

        request.onsuccess = function readdb_oncomplete(event) {
          db.close();
          callback(true);
        };

        request.onerror = function readdb_oncomplete(event) {
          debug('Failed to write file to DB: ' + event.target.result.name);
          db.close();
          callback(false);
        };
      }
    };

    request.onupgradeneeded = function opendb_onupgradeneeded(event) {
      var db = event.target.result;

      // Delete the old ObjectStore if present
      if (db.objectStoreNames.length !== 0) {
        db.deleteObjectStore(STORE_NAME);
      }

      db.createObjectStore(STORE_NAME, { keyPath: 'name' });
    };
  },

  /**
   * Override
   */
  init: function engine_init(glue) {
    IMEngineBase.prototype.init.call(this, glue);
    debug('init.');
    
    
  },

  /**
   * Override
   */
  uninit: function engine_uninit() {
    IMEngineBase.prototype.uninit.call(this);
    debug('Uninit.');

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
    if (this._layoutPage !== LAYOUT_PAGE_DEFAULT) {
      this._glue.sendKey(keyCode);
      return;
    }

    IMEngineBase.prototype.click.call(this, keyCode);

    switch (keyCode) {
      case -11: // Switch to Shouxie Panel
        this._alterKeyboard('zh-Hans-Shouxie');
        break;
      case -20: // Switch to Chinese Symbol Panel, Same page
      case -21: // Switch to Chinese Symbol Panel, Page 1
      case -22: // Switch to Chinese Symbol Panel, Page 2
      case -30: // Switch to English Symbol Panel, Same page
      case -31: // Switch to English Symbol Panel, Page 1
      case -32: // Switch to English Symbol Panel, Page 2
        var index = Math.abs(keyCode);
        var symbolType = index < 30 ? 'Ch' : 'En';
        var symbolPage = index % 10;
        if (!symbolPage)
          symbolPage = this._keyboard.substr(-1);
        this._alterKeyboard(
          'zh-Hans-Shouxie-Symbol-' + symbolType + '-' + symbolPage);
        break;
      default:
        this._keypressQueue.push(keyCode);
        break;
    }

    this._start();
  },

  _layoutPage: LAYOUT_PAGE_DEFAULT,

  setLayoutPage: function engine_setLayoutPage(page) {
    this._layoutPage = page;
  },

  /**
   * Override
   */
  select: function engine_select(text, data) {
    IMEngineBase.prototype.select.call(this, text, data);

    var self = this;
    var nextStep = function(text) {
      if (text) {
        /*
        if (self._pendingSymbols) {
          self._pendingSymbols = '';
          self._glue.endComposition(text);
        } else {
        */
          self._glue.sendString(text);
        //}
        self._historyText = text;
        self._candidatesLength = 0;
        self.empty();
      }
      self._keypressQueue.push(0);
      self._start();
    };
      // A predication candidate is selected.
      nextStep(text);
    //}
  },

  /**
   * Override
   */
  empty: function engine_empty() {
    IMEngineBase.prototype.empty.call(this);
    debug('empty.');
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

    if (this._uninitTimer) {
      clearTimeout(this._uninitTimer);
      this._uninitTimer = null;
    }

    var inputType = state.type;
    debug('Activate. Input type: ' + inputType);

    var keyboard = 'zh-Hans-Shouxie';
    if (inputType == '' || inputType == 'text' || inputType == 'textarea') {
      keyboard = this._keyboard;
    }

    this._glue.alterKeyboard(keyboard);


    this._isActive = true;
  },

  /**
   * Override
   */
  deactivate: function engine_deactivate() {
    IMEngineBase.prototype.deactivate.call(this);
    debug('Deactivate.');

    if (!this._isActive)
      return;

    this._isActive = false;

    this._resetKeypressQueue();
    this.empty();

    var self = this;
  },

  getMoreCandidates: function engine_getMore(indicator, maxCount, callback) {
    if (this._candidatesLength == 0) {
      callback(null);
      return;
    }

    var num = this._candidatesLength;
    maxCount = Math.min((maxCount || num) + indicator, num);

    var msgId = this._pendingSymbols ? 'im_get_candidates' : 'im_get_predicts';

  }
};

var jsshouxie = new IMEngine();

// Expose jsshouxie as an AMD module
if (typeof define === 'function' && define.amd)
  define('jsshouxie', [], function() { return jsshouxie; });

// Expose the engine to the Gaia keyboard
if (typeof InputMethods !== 'undefined') {
  InputMethods.jsshouxie = jsshouxie;
}
})();
