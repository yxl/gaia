'use strict';

var Test = {};
var FileSystemService = null;
var MatrixSearch = null;
var USER_DICT_FILE_NAME = '';
var SYS_DICT_FILE_NAME = '';

var MatrixSearchTest = {
  _ms: null,
  _logPanel: null,

  init: function test_init() {
    FileSystemService = Test.FileSystemService;
    MatrixSearch = Test.MatrixSearch;
    USER_DICT_FILE_NAME = 'idb://user_dict_test_file';
    SYS_DICT_FILE_NAME = 'xhr://../data/db.json';
    var self = MatrixSearchTest;
    FileSystemService.init(function fileSystemServiceInitCallback() {
        self._ms = new MatrixSearch();
        self._ms.init(SYS_DICT_FILE_NAME, USER_DICT_FILE_NAME,
                function msInitCallback(status) {
        });
    });
    var btn = document.getElementById('convert-button');
    btn.addEventListener('click', self.convert, false);
    btn = document.getElementById('reset');
    btn.addEventListener('click', self.reset, false);
    btn = document.getElementById('search');
    btn.addEventListener('click', self.search, false);
    btn = document.getElementById('delsearch');
    btn.addEventListener('click', self.delsearch, false);

    btn = document.getElementById('predict-button');
    btn.addEventListener('click', self.predict, false);

    btn = document.getElementById('batch');
    btn.addEventListener('click', self.batch, false);

    self._logPanel = document.getElementById('log');
  },

  unint: function test_uninit() {
    var self = MatrixSearchTest;
    FileSystemService.uninit();
    self._ms.uninit();
  },

  search: function test_search() {
    var self = MatrixSearchTest;
    var py = document.getElementById('py-text').value;
    var start = new Date();
    self._ms.search(py);
    var display = document.getElementById('display');
    display.innerHTML = '<br />' + (new Date() - start) + 'ms ' + self._ms.get_candidate_num() + 'candidates.';
  },

  reset: function test_reset() {
    var self = MatrixSearchTest;
    self._ms.reset_search();
  },

  delsearch: function test_delsearch() {
    var self = MatrixSearchTest;
    var py = self._ms.get_pystr().str;
    var pos = py.length - 1;
    self._ms.delsearch(pos, false, true);
  },

  convert: function test_convert() {
    var self = MatrixSearchTest;
    var py = self._ms.get_pystr().str;
    var cands = '';
    var num = self._ms.get_candidate_num();
    for (var i=0; i<num; i++) {
      if (i % 10 == 0) {
        cands += '<br />';
      }
      var strs = self._ms.get_candidate(i);
      cands += strs[0] + '(' + strs[1] + ') ';
    }
    var display = document.getElementById('display');
    display.innerHTML = cands + '<br />' + num + ' candidate(s) for ' +
        py;
    document.getElementById('py-text').value = py;
    return cands;
  },

  predict: function test_predict() {
    var self = MatrixSearchTest;
    var predictStr = document.getElementById('predict-input').value;
    var result = self._ms.get_predicts(predictStr);
                var cands = '';
    var predicts = '';
    var num = result.length;
    for (var i=0; i<num; i++) {
      if (i % 10 == 0) {
        predicts += '<br />';
      }
      var strs = result[i]
      predicts += strs[0] + '(' + strs[1] + ') ';
    }
    var display = document.getElementById('predict-display');
    display.innerHTML = predicts + '<br />' + num +
        ' prediction word(s) for ' + predictStr;
  },

  batch: function test_batch() {
    var self = MatrixSearchTest;
    self.clear_log();
    const TIMES = 100;
    var testcases = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'z', 'ba', 'da', 'fa', 'ga', 'ha'];
    function run() {
      var testcase = testcases.shift();
      var start = new Date();
      for (var i = 0; i < TIMES; i++) {
        self._ms.reset_search();
        self._ms.search(testcase);
      }
      self.log(testcase + ' X 100: ' + Math.round((new Date() - start) / TIMES * 100) + 'ms');
      if (testcases.length > 0) {
        setTimeout(run, 0);
      }
    }
    run();
  },

  log: function test_log(line) {
    var self = MatrixSearchTest;
    var logElem = document.createElement('p');
    logElem.textContent = line;
    self._logPanel.appendChild(logElem);
  },

  clear_log: function test_clear_log() {
    MatrixSearchTest._logPanel.textContent = '';
  }
};
window.addEventListener('load', MatrixSearchTest.init, false);
window.addEventListener('unload', MatrixSearchTest.unint, false);