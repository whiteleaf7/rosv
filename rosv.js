//
// RO SerVer checker by whiteleaf
//
// つかいかた
// rosv>help 参照
//
// 2011/04/05 Ver.1.3 サーバ一覧表示時に、鯖のどこが落ちてるか分かりやすくした
//                    (色制御コードの増加のため3行にわたって表示するように)
// 2011/03/12 Ver.1.2 コマンドが間違っているときに有効かどうかチェックするようにした
// 2011/03/09 Ver.1.1 表示形式変更、Array#include を使うように修正
// 2011/03/07 Ver.1.0
//
// The MIT License
//
// Copyright (c) 2011 whiteleaf
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

var Rosv = {
  arguments_order_prefix: "rosv",         // コマンド名
  arguments_spliter: ">",                 // コマンドの区切り文字
  setting_filename: "rosv_setting_" + escape_filename(name) + ".ini",    // 設定ファイル名(プロファイル別管理)
  check_interval_when_serveropen: 600,    // 全サーバオープン時の更新間隔
  check_interval_when_serverdown: 60,     // 全サーバダウン時の更新間隔
  prototypejs_remote_loading: true        // prototype.js をリモートから取得するか
};

Rosv.version = "1.3";

if (Rosv.prototypejs_remote_loading) {
  eval(load_prototypejs_by_google());
}
else {
  eval(load_script("prototype4lime.js"));
}

Rosv.Console = Class.create({
  initialize: function(channel) {
    this.channel = channel;
  },

  send: function(message) {
    send(this.channel, message);
  },

  action: function(message) {
    action(this.channel, message);
  },

  privmsg: function(message) {
    sendRaw("privmsg " + this.channel + " " + message);
  },

  information: function(message) {
    this.send("[Rosv] " + message);
  }
});

Rosv.Command = Class.create({
  commands: {
    boot: [], kill: [], start: ["サーバ名"], stop: ["サーバ名"],
    check: ["サーバ名(もしくは " + Rosv.arguments_order_prefix + Rosv.arguments_spliter + "サーバ名)"]
  },
  server_list: ["chaos", "loki", "iris", "fenrir", "sara", "lydia", "baldur", "odin", "thor",
                "freya", "bijou", "idun", "heimdal", "eir", "tyr", "lisa", "ses", "tiamet",
                "verdandi", "magni", "surt", "forsety", "garm", "urdr", "norn"],

  initialize: function(prefix, channel, text, checker) {
    var args = text.toLowerCase().split(Rosv.arguments_spliter);
    if (args.shift() != Rosv.arguments_order_prefix) {
      return;
    }
    this.checker = checker;
    this.channel = channel;
    this.owner = (prefix.nick == myNick);
    this.is_boot = this.is_valid_channel(channel);
    this.console = new Rosv.Console(channel);
    var order = args.shift();
    if (!order) {
      this.check_all();
      return;
    }
    if (order == "help") {
      this.help();
      return;
    }
    if (this.commands[order]) {
      if (this.commands[order].length != args.length) {
        this.console.information("コマンドの引数が足りません。 " + Rosv.arguments_order_prefix + Rosv.arguments_spliter +
                                 "help を参照して下さい");
        return;
      }
      this[order](args);
      return;
    }
    if (this.is_valid_server(order)) {
      this.check([order]);
      return;
    }
    if (!this.is_boot && !this.owner) return;
    this.console.information("コマンドが間違っています。 " + Rosv.arguments_order_prefix + Rosv.arguments_spliter +
                             "help を参照して下さい");
  },

  is_valid_channel: function(channel) {
    return this.checker.channels.include(channel);
  },

  is_valid_server: function(server) {
    return this.server_list.include(server);
  },

  // rosv>boot
  // for owner
  boot: function() {
    if (!this.owner) return;
    if (!this.is_boot) {
      this.checker.channels.push(this.channel);
      this.console.information("このチャンネルで Rosv を有効にしました");
      this.checker.save_setting();
    }
    else {
      this.console.information("すでに有効済みです");
    }
  },

  // rosv>kill
  // for owner
  kill: function() {
    if (!this.owner) return;
    if (!this.is_boot) {
      this.help();
      return;
    }
    var index = this.checker.channels.indexOf(this.channel);
    if (index >= 0) {
      this.checker.channels.splice(index, 1);
      this.console.information("このチャンネルで Rosv を無効にしました");
      this.checker.save_setting();
    }
  },

  // rosv>start>server_name
  // for owner
  start: function(args) {
    if (!this.owner) return;
    if (!this.is_boot) {
      this.help();
      return;
    }
    var server = args[0];
    if (!this.is_valid_server(server)) {
      this.console.information("有効なサーバ名ではありません");
      return;
    }
    var notify_channels = this.checker.check_servers[server];
    if (notify_channels) {
      if (notify_channels.include(this.channel)) {
        this.console.information("既に監視対象です");
        return;
      }
      else {
        notify_channels.push(this.channel);
      }
    }
    else {
      this.checker.check_servers[server] = [this.channel];
    }
    this.console.information(server + " を監視対象にしました");
    this.checker.save_setting();
  },

  // rosv>stop>server_name
  // for owner
  stop: function(args) {
    if (!this.owner) return;
    if (!this.is_boot) {
      this.help();
      return;
    }
    var server = args[0];
    if (!this.is_valid_server(server)) {
      this.console.information("有効なサーバ名ではありません");
      return;
    }
    var notify_channels = this.checker.check_servers[server];
    if (!notify_channels) {
      this.console.information("監視対象ではありません");
      return;
    }
    var index = notify_channels.indexOf(this.channel);
    if (index == -1) {
      this.console.information("監視対象ではありません");
      return;
    }
    notify_channels.splice(index, 1);
    this.console.information(server + " を監視対象から外しました");
    this.checker.save_setting();
  },

  // rosv
  check_all: function() {
    if (!this.is_boot) {
      this.help();
      return;
    }
    result = [];
    for (var server in this.checker.status.all) {
      result.push(this.get_detail_status_ratio(server));
    }
    [9, 9, 8].each(function(count) {
      this.console.privmsg(result.splice(0, count).join(" "));
    }, this);
    /*
    for (var server in this.checker.status.all) {
      var display_name = " " + server.capitalize() + " ";
      result.push("<color white," + (this.checker.status.all[server] == "open" ? "green>" : "red>") +
                  display_name + "<stop>");
    }
    this.console.privmsg(result.join(" "));
    */
  },

  get_detail_status_ratio: function(server) {
    if (server == "common") {
      return "<color white," + (this.checker.status.all.common == "open" ? "green>" : "red>") +
             " Common <stop>";
    }
    var display_name = " " + server.capitalize() + " ";
    var result = "";
    var detail_status_ratio = new Array(display_name.length);
    var ratio = display_name.length / 19;
    var i = 0;
    for (var sub_server in this.checker.status.detail[server]) {
      var index = Math.floor(i * ratio);
      var status = detail_status_ratio[index];
      if (status != "down") {
        detail_status_ratio[index] = this.checker.status.detail[server][sub_server];
      }
      i++;
    }
    detail_status_ratio.each(function(status, i) {
      result += "<color white," + (status == "open" ? "green>" : "red>") +
                display_name.substr(i, 1);
    });
    result += "<stop>";
    return result;
  },

  // rosv>check>server_name
  // alias : rosv>server_name
  check: function(args) {
    if (!this.is_boot) {
      this.help();
      return;
    }
    var server = args[0];
    if (!this.is_valid_server(server)) {
      this.console.information("有効なサーバ名ではありません");
      return;
    }
    var result = [];
    for (var sub_server in this.checker.status.detail[server]) {
      result.push("<color white," + (this.checker.status.detail[server][sub_server] == "open" ? "green> " : "red> ") +
                  sub_server + " <stop>");
    }
    this.console.privmsg(result.join(" "));
  },

  // rosv>help
  help: function() {
    if (!this.is_boot) {
      if (this.owner) {
        this.console.information("このチャンネルで有効にするには " + Rosv.arguments_order_prefix + Rosv.arguments_spliter +
                                 "boot を実行して下さい");
      }
      return;
    }
    var messages = [];
    for (var order in this.commands) {
      msg = Rosv.arguments_order_prefix + Rosv.arguments_spliter + order;
      if (this.commands[order].length > 0) {
        msg += Rosv.arguments_spliter + this.commands[order].join(Rosv.arguments_spliter);
      }
      messages.push(msg);
    }
    this.console.send(messages.join(" | "));
  }
});

Rosv.Checker = Class.create({
  setting: null,
  channels: [],
  check_servers: {},
  status: { all: {}, detail: { common: {} } },
  before_status: null,
  ragu_url: "http://raguweb.net/rosv/?",
  //ragu_url: "http://localhost:3000/ragu.html?",
  timer_id: null,
  check_interval: Rosv.check_interval_when_serverdown,

  onload: function() {
    log("RoServer Checker version " + Rosv.version);
    this.load_setting();
    this.start_scraping();
    this.scraping();
  },

  commandline: function(prefix, channel, text) {
    new Rosv.Command(prefix, channel, text, this);
  },

  scraping: function() {
    new Ajax.Request(this.ragu_url + (new Date).getTime().toString(), {
      method: "get",
      onComplete: function(transport) {
        this.parse_ragu_rosv(transport.responseText);
        this.notify();
      }.bind(this),
      onFailure: function(transport) {
        log("[Rosv] 受信出来ませんでした");
      },
      onException: function(transport, exception) {
        log("[Rosv] エラーが発生しました(" + exception.message + ")");
        this.stop_scraping();
      }.bind(this)
    });
  },

  start_scraping: function() {
    this.timer_id = setInterval(this.scraping.bind(this), this.check_interval * 1000);
  },

  stop_scraping: function() {
    if (this.timer_id) {
      clearInterval(this.timer_id);
      this.timer_id = null;
    }
  },

  notify: function() {
    if (this.before_status) {
      var all = this.status.all;
      var exists_down_server = false;
      var notify_messages_for_channel = {};
      this.channels.each(function(ch) {
        notify_messages_for_channel[ch] = { open: [], down: [] };
      });
      for (var server in all) {
        if (all[server] == "down") {
          exists_down_server = true;
        }
        if (all[server] != this.before_status.all[server] && this.check_servers[server]) {
          this.check_servers[server].each(function(ch) {
            if (this.channels.include(ch)) {
              notify_messages_for_channel[ch][all[server]].push(server.capitalize());
            }
          }, this);
        }
      }
      for (var ch in notify_messages_for_channel) {
        if (notify_messages_for_channel[ch].open.length > 0) {
          send(ch, "[Rosv] サーバが Open しました [ " + notify_messages_for_channel[ch].open.join(", ") + " ]");
        }
        if (notify_messages_for_channel[ch].down.length > 0) {
          send(ch, "[Rosv] サーバが Down しました [ " + notify_messages_for_channel[ch].down.join(", ") + " ]");
        }
      }
      var interval = (exists_down_server ? Rosv.check_interval_when_serverdown : Rosv.check_interval_when_serveropen);
      if (interval != this.check_interval) {
        this.check_interval = interval;
        this.stop_scraping();
        this.start_scraping();
      }
    }
    this.before_status = deep_clone(this.status);
  },

  load_setting: function() {
    this.setting = new Ini(Rosv.setting_filename);
    if (!this.setting.load()) {
      this.channels = [];
      return;
    }
    if (this.setting.data.global.channels == "") {
      this.channels = [];
    }
    else {
      this.channels = this.setting.data.global.channels.split(",");
    }
    for (var server_name in this.setting.data.server) {
      if (this.setting.data.server[server_name] == "") {
        this.check_servers[server_name] = [];
      }
      else {
        this.check_servers[server_name] = this.setting.data.server[server_name].split(",");
      }
    }
  },

  save_setting: function() {
    this.setting.data.global.channels = this.channels.join(",");
    for (var server_name in this.check_servers) {
      this.setting.data.server[server_name] = this.check_servers[server_name].join(",");
    }
    this.setting.save();
  },

  ragu_all_server_status_reg: /<td width="46px" style="background:(.+?);">(.+?)<\/td>/,
  ragu_detail_server_name_reg: /<h3 class="entry-header">(.+?)&nbsp;&nbsp;/,
  ragu_detail_server_status_reg: /<td style="background:(.+?);width:43px;">(.+?)<\/td>/,

  parse_ragu_rosv: function(body) {
    var buffer = body;
    var all_status = {};
    var detail_status = {};
    // all server status
    while (true) {
      if (!buffer.match(this.ragu_all_server_status_reg)) break;
      buffer = RegExp.rightContext;
      var status = (RegExp.$1 == "green" ? "open" : "down");
      var name = RegExp.$2.toLowerCase();
      if (name.match(/<a href=".+?\.html">(.+?)<\/a>/)) {
        name = RegExp.$1;
      }
      all_status[name] = status;
    }
    // server detail status
    while (true) {
      if (!buffer.match(this.ragu_detail_server_name_reg)) break;
      buffer = RegExp.rightContext;
      var name = RegExp.$1.toLowerCase();
      detail_status[name] = {};
      while (true) {
        if (!buffer.match(this.ragu_detail_server_status_reg)) break;
        buffer = RegExp.rightContext;
        var status = (RegExp.$1 == "green" ? "open" : "down");
        var detail_name = RegExp.$2;
        detail_status[name][detail_name] = status;
        if (/^<\/tr><\/table>/.test(buffer)) {
          buffer = RegExp.rightContext;
          break;
        }
      }
    }
    this.status.all = all_status;
    this.status.detail = detail_status;
  }
});

var rosvchecker = new Rosv.Checker;

function event::onLoad() {
  rosvchecker.onload();
}

function event::onChannelText(prefix, channel, text) {
  rosvchecker.commandline(prefix, channel, text);
}

String.prototype.trim = function() {
  return this.replace(/(^\s+)|(\s+$)/g, "");
};

//
// Simple Ini file controller
//
// [ ] で囲まれたものはセクションとして扱われ、それ以降のデータはセクションに所属する
// セクションが登場するまでのデータは global というセクションに割り当てられる
//
// var ini = new Ini("setting.ini");
// value1 = ini.data.global.key;
// value2 = ini.data.section.key;
//
var Ini = Class.create({
  delimiter: "=",
  global_section: "global",

  initialize: function(filename) {
    this.filename = filename;
  },

  clear: function() {
    this.data = { global: {} };
  },

  load: function() {
    this.clear();
    var file = openFile(this.filename);
    if (file) {
      var section = this.global_section;
      var line;
      while ((line = file.readLine()) != null) {
        if (line.trim() == 0) continue;
        if (/^\[(.+?)\]/.test(line)) {
          section = RegExp.$1.trim();
          if (!this.data[section]) {
            this.data[section] = {};
          }
          continue;
        }
        var res = line.split(this.delimiter);
        if (res.length != 2) continue;
        var key = res[0].trim(), value = res[1].trim();
        this.data[section][key] = value;
      }
      file.close();
      return true;
    }
    return false;
  },

  save: function() {
    var file = openFile(this.filename, false);
    if (file) {
      for (var section in this.data) {
        if (section != this.global_section) {
          file.writeLine("[" + section + "]");
        }
        for (var key in this.data[section]) {
          file.writeLine(key + this.delimiter + this.data[section][key]);
        }
      }
      file.truncate();
      file.close();
      return true;
    }
    return false;
  }
});

//
// ファイル名に使えない文字等をエスケープ
//
function escape_filename(filename) {
  var pattern = [[":", "colon"], ["?", "question"], ["/", "slash"]];
  for (var i in pattern) {
    filename = filename.replace(pattern[i][0], pattern[i][1]);
  }
  return encodeURI(filename);
}

//
// オブジェクトのコピー作成
//
function deep_clone(obj) {
  //return eval("(function(){return " + Object.toJSON(obj) + "})();");
  return Object.toJSON(obj).evalJSON();
}

//
// 外部スクリプトのロード
// スコープの関係で eval(load_script(..)) とすること
// userScriptPath からの相対パス or http
//
function load_script(filename) {
  var r;
  if (filename.match(/^https?:/)) {
    if (r = new ActiveXObject("Microsoft.XMLHTTP")) {
      r.open("GET", filename, false);
      r.send("");
      return r.responseText;
    }
  }
  else {
    var f = openFile(userScriptPath + "\\" + filename);
    var res = "";
    if (f) {
      res = f.readAll();
      f.close();
    }
    else {
      log(filename + " is not found");
    }
    return res;
  }
}

// only prototype.js 1.7.0.0
function load_prototypejs_by_google() {
  return "var document={getElementsByTagName:function(){return[{src:''}];}," +
         "createElement:function(){return{appendChild:function(){}};}," +
         "createTextNode:function(){},createEvent:function(){return{__proto__:{}};}," +
         "getElementById:function(){return{};},write:function(){},domain:'localhost'};" +
         "var window={document:document,attachEvent:function(){},setTimeout:function(a,b){setTimeout(a,b);}};" +
         "var navigator={userAgent:'LimeChat'};var location={protocol:'http:',port:''};" +
         load_script("http://ajax.googleapis.com/ajax/libs/prototype/1.7.0.0/prototype.js").substr(0, 46965);
}
