(function(exports) {
'use strict';

/**
 * Module dependencies
 */
/*var Timespan = Calendar.Timespan;*/
var compare = Calendar.compare;
/*var localeFormat = Calendar.App.dateFormat.localeFormat;*/

/**
 * Constants
 */
const SECOND = 1000;
const MINUTE = (SECOND * 60);
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

exports._hourDate = new Date();
exports.startsOnMonday = false;
exports.FLOATING = 'floating';
exports.ALLDAY = 'allday';
exports.SECOND = SECOND;
exports.MINUTE = MINUTE;
exports.HOUR = HOUR;
exports.PAST = 'past';
exports.NEXT_MONTH = 'next-month';
exports.OTHER_MONTH = 'other-month';
exports.PRESENT = 'present';
exports.FUTURE = 'future';

Object.defineProperty(exports, 'today', {
  get: function() {
    return new Date();
  }
});

exports.getTimeL10nLabel = function(timeLabel) {
  return timeLabel + (navigator.mozHour12 ? '12' : '24');
};

exports.daysInWeek = function() {
  // XXX: We need to localize this...
  return 7;
};

/**
 * Calculates day of week when starting day is Monday.
 */
exports.dayOfWeekFromMonday = function(numeric) {
  var day = numeric - 1;
  if (day < 0) {
    return 6;
  }

  return day;
};

/**
 * Calculates day of week when starting day is Sunday.
 */
exports.dayOfWeekFromSunday = function(numeric) {
  return numeric;
};

/**
 * Checks is given date is today.
 *
 * @param {Date} date compare.
 * @return {Boolean} true when today.
 */
exports.isToday = function(date) {
  return exports.isSameDate(date, exports.today);
};

/**
 * Intended to be used in combination
 * with hoursOfOccurence used to sort
 * hours. ALLDAY is always first.
 */
exports.compareHours = function(a, b) {
  // to cover the case of a is allday
  // and b is also allday
  if (a === b) {
    return 0;
  }

  if (a === exports.ALLDAY) {
    return -1;
  }

  if (b === exports.ALLDAY) {
    return 1;
  }

  return compare(a, b);
};

/**
 * Checks if date object only contains date information (not time).
 *
 * Example:
 *
 *    var time = new Date(2012, 0, 1, 1);
 *    this._isOnlyDate(time); // false
 *
 *    var time = new Date(2012, 0, 1);
 *    this._isOnlyDate(time); // true
 *
 * @param {Date} date to verify.
 * @return {Boolean} see above.
 */
exports.isOnlyDate = function(date) {
  if (
    date.getHours() === 0 &&
    date.getMinutes() === 0 &&
    date.getSeconds() === 0
  ) {
    return true;
  }

  return false;
};

/**
 * Given a start and end date will
 * calculate which hours given
 * event occurs (in order from allday -> 23).
 *
 * When an event occurs all of the given
 * date will return only "allday"
 *
 * @param {Date} day point for all day calculations.
 * @param {Date} start start point of given span.
 * @param {Date} end point of given span.
 * @return {Array} end end point of given span.
 */
exports.hoursOfOccurence = function(day, start, end) {
  // beginning reference point (start of given date)
  var refStart = exports.createDay(day);
  var refEnd = exports.endOfDay(day);

  var startBefore = start <= refStart;
  var endsAfter = end >= refEnd;

  if (startBefore && endsAfter) {
    return [exports.ALLDAY];
  }

  start = (startBefore) ? refStart : start;
  end = (endsAfter) ? refEnd : end;

  var curHour = start.getHours();
  var lastHour = end.getHours();
  var hours = [];

  // using < not <= because we only
  // want to include the last hour if
  // it contains some minutes or seconds.
  for (; curHour < lastHour; curHour++) {
    hours.push(curHour);
  }

  //XXX: just minutes would probably be fine?
  //     seconds are here for consistency.
  if (end.getMinutes() || end.getSeconds()) {
    hours.push(end.getHours());
  }

  return hours;
};

/**
 * Calculates the difference between
 * two points in hours.
 *
 * @param {Date|Numeric} start start hour.
 * @param {Date|Numeric} end end hour.
 */
exports.hourDiff = function(start, end) {
  start = (start instanceof Date) ? start.valueOf() : start;
  end = (end instanceof Date) ? end.valueOf() : end;

  start = start / HOUR;
  end = end / HOUR;

  return end - start;
};

/**
 * Calculates the difference (in days) between 2 dates.
 */
exports.dayDiff = function(startDate, endDate) {
  return (endDate - startDate) / DAY;
};

/**
 * Creates timespan for given day.
 *
 * @param {Date} date date of span.
 * @param {Boolean} includeTime uses given date
 *                           as the start time of the timespan
 *                           rather then the absolute start of
 *                           the day of the given date.
 */
exports.spanOfDay = function(date, includeTime) {
  if (typeof(includeTime) === 'undefined') {
    date = exports.createDay(date);
  }

  var end = exports.createDay(date);
  end.setDate(end.getDate() + 1);
  return new Calendar.Timespan(date, end);
};

/**
 * Creates timespan for a given month.
 * Starts at the first week that occurs
 * in the given month. Ends at the
 * last day, minute, second of given month.
 */
exports.spanOfMonth = function(month) {
  month = new Date(
    month.getFullYear(),
    month.getMonth(),
    1
  );

  var startDay = exports.getWeekStartDate(month);

  var endDay = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    1
  );

  endDay.setMilliseconds(-1);
  endDay = exports.getWeekEndDate(endDay);
  return new Calendar.Timespan(startDay, endDay);
};

/**
 * Converts a date to UTC
 */
exports.getUTC = function(date) {
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds()
  );
};

/**
 * Converts transport time into a JS Date object.
 *
 * @param {Object} transport date in transport format.
 * @return {Date} javascript date converts the transport into
 *                the current time.
 */
exports.dateFromTransport = function(transport) {
  var utc = transport.utc;
  var offset = transport.offset;
  var zone = transport.tzid;

  var date = new Date(
    // offset is expected to be 0 in the floating case
    parseInt(utc) - parseInt(offset)
  );

  if (zone && zone === exports.FLOATING) {
    return exports.getUTC(date);
  }

  return date;
};

/**
 * Converts a date object into a transport value
 * which can be stored in the database or sent
 * to a service.
 *
 * When the tzid value is given an is the string
 * value of "floating" it will convert the local
 * time directly to UTC zero and record no offset.
 * This along with the tzid is understood to be
 * a "floating" time which will occur at that position
 * regardless of the current tzid's offset.
 *
 * @param {Date} date js date object.
 * @param {String} [tzid] optional tzid.
 * @param {Boolean} isDate true when is a "date" representation.
 */
exports.dateToTransport = function(date, tzid, isDate) {
  var result = Object.create(null);

  if (isDate) {
    result.isDate = isDate;
  }

  if (tzid) {
    result.tzid = tzid;
  }

  var utc = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds()
  );

  // remember a "date" is always a floating
  // point in time otherwise we don't use it...
  if (isDate || tzid && tzid === exports.FLOATING) {
    result.utc = utc;
    result.offset = 0;
    result.tzid = exports.FLOATING;
  } else {
    var localUtc = date.valueOf();
    var offset = utc - localUtc;

    result.utc = utc;
    result.offset = offset;
  }

  return result;
};

/**
 * Checks if two date objects occur
 * on the same date (in the same month, year, day).
 * Disregards time.
 *
 * @param {Date} first date.
 * @param {Date} second date.
 * @return {Boolean} true when they are the same date.
 */
exports.isSameDate = function(first, second) {
  return first.getMonth() == second.getMonth() &&
         first.getDate() == second.getDate() &&
         first.getFullYear() == second.getFullYear();
};

/**
 * Returns an identifier for a specific
 * date in time for a given date
 *
 * @param {Date} date to get id for.
 * @return {String} identifier.
 */
exports.getDayId = function(date) {
  return [
    'd',
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ].join('-');
};

/**
 * Returns a date object from
 * a string id for a date.
 *
 * @param {String} id identifier for date.
 * @return {Date} date output.
 */
exports.dateFromId = function(id) {
  var parts = id.split('-'),
      date,
      type;

  if (parts.length > 1) {
    type = parts.shift();
    switch (type) {
      case 'd':
        date = new Date(parts[0], parts[1], parts[2]);
        break;
      case 'm':
        date = new Date(parts[0], parts[1]);
        break;
    }
  }

  return date;
};

/**
 * Returns an identifier for a specific
 * month in time for a given date.
 *
 * @return {String} identifier.
 */
exports.getMonthId = function(date) {
  return [
    'm',
    date.getFullYear(),
    date.getMonth()
  ].join('-');
};

exports.createDay = function(date, day, month, year) {
  return new Date(
    year != null ? year : date.getFullYear(),
    month != null ? month : date.getMonth(),
    day != null ? day : date.getDate()
  );
};

exports.endOfDay = function(date) {
  var day = exports.createDay(date, date.getDate() + 1);
  day.setMilliseconds(-1);
  return day;
};

/**
 * Returns localized day of week.
 *
 * @param {Date|Number} date numeric or date object.
 */
exports.dayOfWeek = function(date) {
  var number = date;

  if (typeof(date) !== 'number') {
    number = date.getDay();
  }

  if (exports.startsOnMonday) {
    return exports.dayOfWeekFromMonday(number);
  }
  return exports.dayOfWeekFromSunday(number);
};

/**
 * Finds localized week start date of given date.
 *
 * @param {Date} date any day the week.
 * @return {Date} first date in the week of given date.
 */
exports.getWeekStartDate = function(date) {
  var currentDay = exports.dayOfWeek(date);
  var startDay = (date.getDate() - currentDay);

  return exports.createDay(date, startDay);
};

exports.getWeekEndDate = function(date) {
  // TODO: There are localization problems
  // with this approach as we assume a 7 day week.
  var start = exports.getWeekStartDate(date);
  start.setDate(start.getDate() + 7);
  start.setMilliseconds(-1);

  return start;
};

/**
 * Returns an array of dates objects.
 * Inclusive. First and last are
 * the given instances.
 *
 * @param {Date} start starting day.
 * @param {Date} end ending day.
 * @param {Boolean} includeTime include times start/end ?
 */
exports.daysBetween = function(start, end, includeTime) {
  if (start > end) {
    var tmp = end;
    end = start;
    start = tmp;
    tmp = null;
  }

  var list = [];
  var last = start.getDate();

  // handle the case where start & end dates
  // are the same date.
  if (exports.isSameDate(start, end)) {
    if (includeTime) {
      list.push(end);
    } else {
      list.push(this.createDay(start));
    }
    return list;
  }

  while (true) {
    var next = new Date(
      start.getFullYear(),
      start.getMonth(),
      ++last
    );

    if (next > end) {
      throw new Error(
        'sanity fails next is greater then end'
      );
    }

    if (!exports.isSameDate(next, end)) {
      list.push(next);
      continue;
    }

    break;
  }

  if (includeTime) {
    list.unshift(start);
    list.push(end);
  } else {
    list.unshift(exports.createDay(start));
    list.push(exports.createDay(end));
  }

  return list;
};

/**
 * Returns an array of weekdays based on the start date.
 * Will always return the 7 daysof that week regardless of
 * what the start date isbut they will be returned
 * in the order of their localized getDay function.
 *
 * @param {Date} startDate point of origin.
 * @return {Array} a list of dates in order of getDay().
 */
exports.getWeeksDays = function(startDate) {
  //local day position
  var weeksDayStart = exports.getWeekStartDate(startDate);
  var result = [weeksDayStart];

  for (var i = 1; i < 7; i++) {
    result.push(exports.createDay(weeksDayStart, weeksDayStart.getDate() + i));
  }

  return result;
};

/**
 * Checks if date is in the past
 *
 * @param {Date} date to check.
 * @return {Boolean} true when date is in the past.
 */
exports.isPast = function(date) {
  return (date.valueOf() < exports.today.valueOf());
};

/**
 * Checks if date is in the future
 *
 * @param {Date} date to check.
 * @return {Boolean} true when date is in the future.
 */
exports.isFuture = function(date) {
  return !exports.isPast(date);
};

/**
 * Based on the input date
 * will return one of the following states
 *
 *  past, present, future
 *
 * @param {Date} day for compare.
 * @param {Date} month comparison month.
 * @return {String} state.
 */
exports.relativeState = function(day, month) {
  var states;
  //var today = exports.today;

  // 1. the date is today (real time)
  if (exports.isToday(day)) {
    return exports.PRESENT;
  }

  // 2. the date is in the past (real time)
  if (exports.isPast(day)) {
    states = exports.PAST;
  // 3. the date is in the future (real time)
  } else {
    states = exports.FUTURE;
  }

  // 4. the date is not in the current month (relative time)
  if (day.getMonth() !== month.getMonth()) {
    states += ' ' + exports.OTHER_MONTH;
  }

  return states;
};

/**
 * Computes the relative hour (0...23.9999) inside the given day.
 * If `date` is on a different day than `baseDate` it will return `0`.
 * Used by week view to compute the position of the busytimes relative to
 * the top of the view.
 */
exports.relativeOffset = function(baseDate, date) {
  if (exports.isSameDate(baseDate, date)) {
    return date.getHours() + (date.getMinutes() / 60);
  }
  // different day!
  return 0;
};

/**
 * Computes the relative duration between startDate and endDate inside
 * a given baseDate. Returns a number between 0 and 24.
 * Used by MultiDay view to compute the height of the busytimes relative to
 * the length inside the baseDate.
 */
exports.relativeDuration = function(baseDate, startDate, endDate) {
  if (!exports.isSameDate(startDate, endDate)) {
    if (exports.isSameDate(baseDate, startDate)) {
      endDate = exports.endOfDay(baseDate);
    } else if (exports.isSameDate(baseDate, endDate)) {
      startDate = exports.createDay(endDate);
    } else {
      // started before baseDate and ends on a different day
      return 24;
    }
  }
  return exports.hourDiff(startDate, endDate);
};

/**
 * Checks if startDate and endDate are at first millisecond of the day and
 * if the distance between both dates is a multiple of a full day.
 */
exports.isAllDay = function(startDate, endDate) {
  var dayDiff = exports.dayDiff(startDate, endDate);
  return exports.relativeTime(startDate) === 0 &&
    exports.relativeTime(endDate) === 0 &&
    dayDiff > 0 && Number.isInteger(dayDiff);
};

/**
 * Gets the milliseconds elapsed since the start of the day.
 */
exports.relativeTime = function(date) {
  return date.getHours() * HOUR +
    date.getMinutes() * MINUTE +
    date.getSeconds() * SECOND +
    date.getMilliseconds();
};

exports.lunarcalc = {

  //get lunar date from a solar date
  LunarDate: {
    madd: new Array(0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334),
    HsString: '甲乙丙丁戊己庚辛壬癸',
    EbString: '子丑寅卯辰巳午未申酉戌亥',
    NumString: '一二三四五六七八九十',
    MonString: '正二三四五六七八九十冬腊',
    CalendarData: new Array(0xA4B, 0x5164B, 0x6A5, 0x6D4, 0x415B5, 0x2B6,
      0x957, 0x2092F, 0x497, 0x60C96, 0xD4A, 0xEA5, 0x50DA9, 0x5AD, 0x2B6,
      0x3126E, 0x92E, 0x7192D, 0xC95, 0xD4A, 0x61B4A, 0xB55, 0x56A, 0x4155B,
      0x25D, 0x92D, 0x2192B, 0xA95, 0x71695, 0x6CA, 0xB55, 0x50AB5, 0x4DA,
      0xA5B, 0x30A57, 0x52B, 0x8152A, 0xE95, 0x6AA, 0x615AA, 0xAB5, 0x4B6,
      0x414AE, 0xA57, 0x526, 0x31D26, 0xD95, 0x70B55, 0x56A, 0x96D, 0x5095D,
      0x4AD, 0xA4D, 0x41A4D, 0xD25, 0x81AA5, 0xB54, 0xB6A, 0x612DA, 0x95B,
      0x49B, 0x41497, 0xA4B, 0xA164B, 0x6A5, 0x6D4, 0x615B4, 0xAB6, 0x957,
      0x5092F, 0x497, 0x64B, 0x30D4A, 0xEA5, 0x80D65, 0x5AC, 0xAB6, 0x5126D,
      0x92E, 0xC96, 0x41A95, 0xD4A, 0xDA5, 0x20B55, 0x56A, 0x7155B, 0x25D,
      0x92D, 0x5192B, 0xA95, 0xB4A, 0x416AA, 0xAD5, 0x90AB5, 0x4BA, 0xA5B,
      0x60A57, 0x52B, 0xA93, 0x40E95),
    Year: null,
    Month: null,
    Day: null,
    TheDate: null,
    GetBit: function(m, n) {
      return (m >> n) & 1;
    },
    e2c: function() {
      this.TheDate = (arguments.length != 3) ?
        new Date() : new Date(arguments[0], arguments[1], arguments[2]);
      var total, m, n, k;
      var isEnd = false;
      var tmp = this.TheDate.getFullYear();
      total = (tmp - 1921) * 365 + Math.floor((tmp - 1921) / 4) +
        this.madd[this.TheDate.getMonth()] + this.TheDate.getDate() - 38;
      if (this.TheDate.getYear() % 4 === 0 && this.TheDate.getMonth() > 1) {
        total++;
      }
      for (m = 0;; m++) {
        k = (this.CalendarData[m] < 0xfff) ? 11 : 12;
        for (n = k; n >= 0; n--) {
          if (total <= 29 + this.GetBit(this.CalendarData[m], n)) {
            isEnd = true;
            break;
          }
          total = total - 29 - this.GetBit(this.CalendarData[m], n);
        }
        if (isEnd) {
          break;
        }
      }
      this.Year = 1921 + m;
      this.Month = k - n + 1;
      this.Day = total;
      if (k == 12) {
        if (this.Month == Math.floor(this.CalendarData[m] / 0x10000) + 1) {
          this.Month = 1 - this.Month;
        }
        if (this.Month > Math.floor(this.CalendarData[m] / 0x10000) + 1) {
          this.Month--;
        }
      }
    },
    GetcDateString: function() {
      var tmp = '';
      if (this.Day == 1) {
        if (this.Month < 1) {
          tmp += '闰';
          tmp += this.MonString.charAt(-this.Month - 1);
        }
        else {
          tmp += this.MonString.charAt(this.Month - 1);
        }
        tmp += '月';
      }
      else {
        tmp += (this.Day < 11) ? '初' : ((this.Day < 20) ? '十' :
          ((this.Day < 21) ? '二十' : ((this.Day < 30) ? '廿' : '三十')));
        if (this.Day % 10 !== 0 || this.Day == 10) {
          tmp += this.NumString.charAt((this.Day - 1) % 10);
        }
      }
      return tmp;
    },
    GetLunarDay: function(solarYear, solarMonth, solarDay) {
      if (solarYear < 1921 || solarYear > 2020) {
        return '';
      }
      else {
        solarMonth = (parseInt(solarMonth) > 0) ? (solarMonth - 1) : 11;
        this.e2c(solarYear, solarMonth, solarDay);
        return this.GetcDateString();
      }
    },
    GetLDay: function(solarYear, solarMonth, solarDay) {
      solarMonth = (parseInt(solarMonth) > 0) ? (solarMonth - 1) : 11;
      this.e2c(solarYear, solarMonth, solarDay);
      return this.Day;
    },
    GetLMonth: function(solarYear, solarMonth, solarDay) {
      solarMonth = (parseInt(solarMonth) > 0) ? (solarMonth - 1) : 11;
      this.e2c(solarYear, solarMonth, solarDay);
      return this.Month;
    }
  },

  lunarInfo: function(sYear, sMonth, sDay) //sMonth = 0,1,2,...
  {
    sMonth += 1;
    //lunar festivals
    var lDay = this.LunarDate.GetLDay(sYear, sMonth, sDay);
    var lMonth = this.LunarDate.GetLMonth(sYear, sMonth, sDay);
    var lDateString = '';
    if (lMonth < 10) {
      lDateString += '0';
    }
    lDateString += lMonth.toString();
    if (lDay < 10) {
      lDateString += '0';
    }
    lDateString += lDay.toString();
    if (lDateString in this.lFtv) {
      return this.lFtv[lDateString];
    }

    //solar festivals
    var sDateString = '';
    if (sMonth < 10) {
      sDateString += '0';
    }
    sDateString += sMonth.toString();
    if (sDay < 10) {
      sDateString += '0';
    }
    sDateString += sDay.toString();
    if (sDateString in this.sFtv) {
      return this.sFtv[sDateString];
    }

    // solar terms
    var offDate =
      new Date((31556925974.7 * (sYear - 1900) +
      this.sTermInfo[sMonth * 2 - 1] * 60000) + Date.UTC(1900, 0, 6, 2, 5));
    if (offDate.getUTCDate() == sDay) {
      return this.solarTerm[sMonth * 2 - 1];
    }
    offDate =
      new Date((31556925974.7 * (sYear - 1900) +
      this.sTermInfo[sMonth * 2 - 2] * 60000) + Date.UTC(1900, 0, 6, 2, 5));
    if (offDate.getUTCDate() == sDay){
      return this.solarTerm[sMonth * 2 - 2];
    }

    // lunar day
    return this.LunarDate.GetLunarDay(sYear, sMonth, sDay);
  },

  // set solar and lunar festivals
  sFtv: {
    '0101': '元旦',
    '0214': '情人节',
    '0307': '女生节',
    '0308': '妇女节',
    '0401': '愚人节',
    '0501': '劳动节',
    '0504': '青年节',
    '0601': '儿童节',
    '0701': '建党节',
    '0801': '建军节',
    '0910': '教师节',
    '1001': '国庆节',
    '1112': '男生节',
    '1225': '圣诞节'
  },

  lFtv: {
    '0101': '春节',
    '0115': '元宵节',
    '0505': '端午节',
    '0707': '七夕节',
    '0815': '中秋节',
    '0909': '重阳节',
    '1208': '腊八节'
  },

  //set solar terms
  solarTerm: ['小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
                  '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑',
                  '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'],
  sTermInfo: [0, 21208, 42467, 63836, 85337, 107014, 128867, 150921,
                  173149, 195551, 218072, 240693, 263343, 285989, 308563,
                  331033, 353350, 375494, 397447, 419210, 440795, 462224,
                  483532, 504758]

};

window.addEventListener('localized', function changeStartDay() {
  var startDay = navigator.mozL10n.get('weekStartsOnMonday');

  if (startDay && parseInt(startDay, 10)) {
    exports.startsOnMonday = true;
  } else {
    exports.startsOnMonday = false;
  }
});

}(Calendar.Calc = {}));
