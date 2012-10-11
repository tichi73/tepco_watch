(function(){

var tepco_usage_quick_url = 'http://tepco-usage-api.appspot.com/quick.txt';
var tepco_usage_latest_url = 'http://tepco-usage-api.appspot.com/latest.json';
var tepco_usage_date_url = 'http://tepco-usage-api.appspot.com/YYYYMMDD.json';
var twitter_url = 'https://api.twitter.com/1/tichi73/lists/tepco-watch/statuses.json';
var yahoo_forecast_url = 'http://setsuden.yahooapis.jp/v1/Setsuden/electricPowerForecast';
var yahoo_forecast_appid ='u4Wn54Wxg67cSC8juregwvUc.VzyFj8tKzQspcxcl1b0pUstbI.CyYq75G0-';
var mukku_url = 'http://mukku.org/v2.00/TGL/?output=json';
var apps_icons = {
	on: 'img/icon_on48.png',
	off: 'img/icon_off48.png',
};

//---------------------------------------------------------
// Status
//---------------------------------------------------------
BackgroundStatus = function() {
	var now = new Date().getTime();
	this.define('latest_data_time'	,now - (     60*60*1000));
	this.define('latest_tweet_time'	,now - (3*24*60*60*1000));
	this.define('current_usage_rate' ,600);
	this.__name = 'background';
	this.__autosave = true;
}
BackgroundStatus.prototype = new Config();

//---------------------------------------------------------
// Cache
//---------------------------------------------------------
function Cache() {
	this.cache_hash = {};
	this.cache_timeout = 0;
}
Cache.prototype.storeCache = function(key, data, timeout) {
	if (key in this.cache_hash) {
		this.cache_hash[key].data = data;
		// console.log("update cache: " + key);
	} else {
		this.cache_hash[key] = { timer: null, data: data };
		// console.log("create cache: " + key);
	}
	this.setClearTimer(key, timeout);
}
Cache.prototype.loadCache = function(key, timeout) {
	if (key in this.cache_hash) {
		// console.log("load cache: " + key);
		this.setClearTimer(key, timeout);
		return this.cache_hash[key].data;
	}
	return null;
}
Cache.prototype.clearCache = function(key) {
	if (key in this.cache_hash) {
		var cache = this.cache_hash[key];
		if (cache.timer != null) {
			clearTimeout(cache.timer);
			cache.timer = null;
		}
		console.log("cleanup cache: " + key);
		delete this.cache_hash[key];
	}
}
Cache.prototype.setClearTimer = function(key, timeout) {
	var cache = this.cache_hash[key];
	if (cache.timer != null) {
		clearTimeout(cache.timer);
		cache.timer = null;
	}
	if (timeout == null) {
		timeout = this.cache_timeout;
	}
	if (timeout > 0) {
		var self = this;
		cache.timeout = timeout;
		cache.timer = setTimeout(function(){
			console.log("cleanup cache: " + key);
			delete self.cache_hash[key];
		}, timeout);
	} else {
		cache.timeout = null;
	}
}

//---------------------------------------------------------
// DesktopNotifier / LatestNotifier
//---------------------------------------------------------
DesktopNotifier = function(title, body, saving) {
	this.title = title;
	this.body = body;
	this.saving = saving;
}
DesktopNotifier.prototype.timeout = 0;
DesktopNotifier.prototype.show = function() {
	if (!webkitNotifications) {
		return;
	}
	var icon = this.saving ? apps_icons.off : apps_icons.on;
	var notification = webkitNotifications.createNotification(icon, this.title, this.body);
	notification.show();
	if (this.timeout > 0) {
		setTimeout(function(){ notification.cancel() }, this.timeout);
	}
	return notification;
}

LatestNotifier = function(data) {
	var title, body;
	if (data.usage_rate >= 0) {
		title = data.usage + " 万kW 【" + data.usage_rate.toFixed(1) + "%】 使用中";
	} else {
		title = "電力使用率が取得できませんでした。";
	}
	if (data.saving) {
		body = title;
		title = "■■■ 計画停電実施中です！ ■■■";
	} else {
		var usage_updated = new Date(data.usage_updated);
		body = usage_updated.toLocaleDateString(true) + ' ' + usage_updated.toLocaleTimeString() + ' 更新';
	}
	DesktopNotifier.call(this, title, body, data.saving);
}
LatestNotifier.prototype = new DesktopNotifier();

TweetNotifier = function(data, saving) {
	var title, body;
	title = data.screen_name;
	body = data.text;
	DesktopNotifier.call(this, title, body, saving);
}
TweetNotifier.prototype = new DesktopNotifier();

//---------------------------------------------------------
// Loader
//---------------------------------------------------------
function Loader () {
	this.loading = false;
	this.success = false;
	this.data = null;
}

Loader.prototype = {
	url: null,
	name: 'Loader',
	cached: false,
	timer: null,
	interval: 0,
	stopTimer: function() {
		if (this.timer != null) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	},
	setCacheData: function(data) {
		this.data = data;
		this.cached = true;
	},
	loading_check: function() {
		if (this.loading) {
			console.warn("loading_check: already loading!: name=", this.name);
			return -1;
		} else {
			this.loading = true;
			return 0;
		}
	},
	load: function () {
		if (this.loading_check() < 0) {
			return;
		}
		this.stopTimer();

		var self = this;
		
		// [@TODO] キャッシュの仕組みが超手抜きなので、できれば見直す
		if (self.cached) {
			self.success = true;
			self.loading = false;
			self.onsuccess(self.data);
			self.oncomplete(null, 'OK');
			// console.log("oncached: name=" + self.name + " : url=" + self.url);
			return;
		}

		$.ajax({
			url: this.url,
			dataType: this.dataType,
			dataFilter: function(data, dataType) {
				return self.dataFilter(data, dataType);
			},
			beforeSend: function(XMLHttpRequest, textStatus) {
				return self.beforeSend(XMLHttpRequest, textStatus);
			},
			complete: function(XMLHttpRequest, textStatus) {
				if (self.interval > 0) {
					self.timer = setTimeout(function(){self.load()}, self.interval);
				}
				return self.oncomplete(XMLHttpRequest, textStatus);
			},
			success: function(data, textStatus, XMLHttpRequest) {
				self.data = data;
				self.success = true;
				self.loading = false;
				return self.onsuccess(data);
			},
			error: function(XMLHttpRequest, textStatus, errorThrown) {
				self.success = false;
				self.loading = false;
				return self.onerror(textStatus, errorThrown);
			},
		});
	},
	dataFilter: function(data, dataType) { return data; },
	beforeSend: function(XMLHttpRequest, textStatus) {},
	onsuccess: function(data) {
		// console.log("onsuccess: name=" + this.name + " : data=" + data);
	},
	onerror: function(textStatus, errorThrown) {
		console.error("onerror: name=" + this.name + " : status=" + textStatus + " : errorThrown=" + errorThrown);
	},
	oncomplete: function(XMLHttpRequest, textStatus) {
		// console.log("oncomplete: name=" + this.name + " : status=" + textStatus);
	},
};

//---------------------------------------------------------
// ForecastLoader
//---------------------------------------------------------
function ForecastLoader (args) {
	this.setup(args);
};
ForecastLoader.prototype = new Loader();
ForecastLoader.prototype.name = 'ForecastLoader';
ForecastLoader.prototype.setup = function(args) {
	this.url = yahoo_forecast_url + "?appid=" + yahoo_forecast_appid + "&output=json";
	if (args && args.date) {
		var date = new Date(args.date);
		// 日付を YYYYMMDD 形式にして API 引数として渡す
		var date_val = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
		this.url += "&date=" + date_val.toString();
	} else {
		this.url += "&results=169";
	}
}
ForecastLoader.prototype.onsuccess = function(data) {
	var epf = data.ElectricPowerForecasts.Forecast;
	var forecast = {};
	for (var i=0; i<epf.length ; i++) {
		var f = epf[i];
		var date_str = UsageLoader.prototype.dateToString(new Date(f.Date), 'day');
		if (!forecast[date_str]) {
			forecast[date_str] = [];
		}
		// kW -> 万kW に変換
		forecast[date_str][parseInt(f.Hour)] = {
			usage: f.Usage.$ / 10000,
			capacity: f.Capacity.$ / 10000,
		};
	}
	this.forecast = forecast;
}

//---------------------------------------------------------
// QuickLoader
//---------------------------------------------------------
function QuickLoader () {}
QuickLoader.prototype = new Loader();
QuickLoader.prototype.name = 'QuickLoader';
QuickLoader.prototype.url = tepco_usage_quick_url;
QuickLoader.prototype.dataFilter = function(data, dataType) {
	var vars = data.split(',');
	var quick = {
		date: vars[0],
		usage: parseInt(vars[1]),
		capacity: parseInt(vars[2]),
	}
	quick.usage_rate = (quick.capacity > 0) ? (100.0 * quick.usage / quick.capacity) : -1;
	// console.log("quickLoader.dataFilter: [" + quick.date + "] " + quick.usage + " : " + quick.usage_rate.toFixed(1) + "%");
	return quick;
}

//---------------------------------------------------------
// UsageLoader
//---------------------------------------------------------
function UsageLoader (args) {
	this.setup(args);
};
UsageLoader.prototype = new Loader();
UsageLoader.prototype.name = 'UsageLoader';
UsageLoader.prototype.setup = function(args) {
	var type = this.type;
	if (args) {
		if (args.type) {
			type = args.type;
		}
		if (!type && args.date) {
			type = 'day';
		}
	}
	switch (type) {
	case 'latest':
	default:
		this.type = 'latest';
		this.url = tepco_usage_latest_url;
		break;
	case 'month':
	case 'day':
		this.type = type;
		this.date = new Date(args.date);
		this.date_str = this.dateToString(this.date, this.type);
		this.url = tepco_usage_date_url.replace(/YYYYMMDD/, this.date_str);
		break;
	}
};
UsageLoader.prototype.dateToString = function(date, type) {
	var date_str = date.getFullYear() + '/' + (date.getMonth() + 1);
	if (type == 'day') {
		date_str += '/' + date.getDate();
	}
	return date_str;
}
UsageLoader.prototype.onsuccess = function(data) {
	function date_localize(data) {
		function utc2local(utc) {
			var local = new Date(utc + ' UTC');
			return local.toString().replace(/ GMT.*/, '');
		};
		if (data.usage_updated) {
			data.usage_updated = utc2local(data.usage_updated);
		}
		if (data.capacity_updated) {
			data.capacity_updated = utc2local(data.capacity_updated);
		}
		if (data.entryfor) {
			data.entryfor = utc2local(data.entryfor);
		}
	};
	switch (this.type) {
	case 'latest':
		date_localize(data);
		data.usage_rate = (data.capacity > 0) ? (100.0 * data.usage / data.capacity) : -1;
		break;
	case 'month':
	case 'day':
		for (var i=0 ; i<data.length ; i++) {
			date_localize(data[i]);
		}
		break;
	}
	this.data = data;
};

//---------------------------------------------------------
// MukkuLoader
//---------------------------------------------------------
function MukkuLoader () {}
MukkuLoader.prototype = new Loader();
MukkuLoader.prototype.url = mukku_url;
MukkuLoader.prototype.name = 'MukkuLoader';
// MukkuLoader.prototype.dataType = 'json';
MukkuLoader.prototype.dataFilter = function(data, dataType) {
	// Day オブジェクトの値が空欄になって JSON パースエラーになるので、ダミーの値を入れる。
	data = data.replace(/"Day":,/, '"Day":0,');
	var json = JSON.parse(data);
	return json;
}
MukkuLoader.prototype.onsuccess = function(data) {
	// console.log("MukkuLoader: " + data.Status);
	var mukku = {
		ResultInfo: {
			Status: data.Status,
			PowerCutTime: data.LastUpDate[0],
			GroupData: data.LastUpDate[1],
		},
		Result: {},
	};
	for (var i=0 ; i<data.TimeGroup.length ; i++) {
		var tg = data.TimeGroup[i];
		var group = tg.Group + '-' + tg.SubGroup;
		mukku.Result[group] = {
			All: tg.Time.All,
			Count: tg.Time.Count,
			Start: tg.Time.Start,
			End: tg.Time.End,
		};
	}
	this.data = mukku;
};

//---------------------------------------------------------
// TwitLoader
//---------------------------------------------------------
function TweetLoader() {}
TweetLoader.prototype = new Loader();
TweetLoader.prototype.name = 'TweetLoader';
TweetLoader.prototype.url = twitter_url;
TweetLoader.prototype.timeline_url = function(user) {
	if (user.match(/(.+)\/(.+)/)) {
		var user = RegExp.$1;
		var list = RegExp.$2;
		return 'https://api.twitter.com/1/' + user + '/lists/' + list + '/statuses.json';
	} else {
		return 'https://api.twitter.com/1/statuses/user_timeline.json?screen_name=' + user;
	}
}
TweetLoader.prototype.onsuccess = function(data) {
	var tweets = [];
	this.raw_data = this.data;
	for (var i=0; i<data.length ;i++) {
		var tweet = data[i];
		var url = 'https://twitter.com/' + tweet.user.screen_name;
		var date = new Date(tweet.created_at);
		tweets.push({
			id_str: tweet.id_str,
			created_at: date,
			time: date.getTime(),
			text: tweet.text,
			user_link: url,
			tweet_link: url + '/status/' + tweet.id_str,
			screen_name: tweet.user.screen_name,
			image_url: tweet.user.profile_image_url,
		});
	}
	this.data = tweets;
}

//---------------------------------------------------------
// GroupLoader
//---------------------------------------------------------
function GroupLoader() {
	this.group = [];
	this.data = [];
	this.success_count = 0;
	this.error_count = 0;
};
GroupLoader.prototype = new Loader();
GroupLoader.prototype.name = 'GroupLoader';
GroupLoader.prototype.addLoader = function(loader) {
	var self = this;
	var org_onsuccess = loader.onsuccess;
	var org_onerror = loader.onerror;
	var org_oncomplete = loader.oncomplete;

	loader.onsuccess = function(data) {
		org_onsuccess.call(loader, data);
		self.success_count++;
	};
	loader.onerror = function(textStatus, errorThrown) {
		org_onerror.call(loader, textStatus, errorThrown);
		self.error_count++;
	};
	loader.oncomplete = function(XMLHttpRequest, textStatus) {
		org_oncomplete.call(loader, XMLHttpRequest, textStatus);
		self.load_done();
	};
	this.group.push(loader);
}
GroupLoader.prototype.load_done = function() {
	if (this.success_count + this.error_count == this.group.length) {
		for (var i=0 ; i<this.group.length ; i++) {
			this.data[i] = this.group[i].data;
		}
		this.success = (this.error_count == 0);
		this.loading = false;
		this.oncomplete();
	}
}
GroupLoader.prototype.oncomplete = function() {
	// console.log("oncomplete: success_count=" + this.success_count + " ,error_count=" + this.error_count);
}
GroupLoader.prototype.load = function() {
	if (this.loading_check() < 0) {
		return;
	}
	this.data = [];
	this.success_count = 0;
	this.error_count = 0;
	this.loading = true;
	for (var i=0 ; i<this.group.length ; i++) {
		var loader = this.group[i];
		loader.group_index = i;
		loader.load();
	}
}

//---------------------------------------------------------
// TepcoWatcher
//---------------------------------------------------------
function TepcoWatcher() {
	this.extension_port = {};
	this.initConfig();
	this.initCache();
	this.initListener();
	this.initLoader();
	this.initLoader2();
}

TepcoWatcher.prototype.initConfig = function() {
	this.config = new TepcoWatcherConfig;
	this.status = new BackgroundStatus;
	this.config.load();
	this.status.load();
}

TepcoWatcher.prototype.initCache = function() {
	var self = this;
	this.cache = new Cache;
	this.cache.__defineGetter__('cache_timeout', function(){ return self.config.cache_timeout });
}

TepcoWatcher.prototype.initListener = function() {
	var self = this;
	chrome.extension.onConnect.addListener(function(port){
		//console.log("chrome.extension.onConnect:", port.name, arguments);
		self.extension_port[port.name] = port;
		port.onMessage.addListener(function(){
			self.onRequest.apply(self, arguments);
		});
		port.onDisconnect.addListener(function(){
			//console.log("port.onDisconnect:", port.name, arguments);
			delete self.extension_port[port.name];
		});
	});
}

TepcoWatcher.prototype.initLoader = function() {
	var self = this;
	
	this.quickLoader = new QuickLoader;
	this.quickLoader.__defineGetter__('interval',function(){ return self.config.quick_update_interval });
	this.quickLoader.oncomplete = function() {
		// 速報値をポップアップに通知
		self.sendResponse('rspQuickData', self.quickLoader);
		self.updateUsageRate();
	}

	this.latestLoader = new UsageLoader({type: 'latest'});
	this.latestLoader.__defineGetter__('interval',function(){ return self.config.latest_update_interval });
	this.latestLoader.oncomplete = function() {
		// [DEBUG] 計画停電実施中フラグや電力使用率の試験用
		// self.latestLoader.data.saving = !self.latestLoader.data.saving;
		// self.latestLoader.data.usage_rate = 120;

		self.sendResponse('rspLatestData', self.latestLoader);
		self.updateUsageRate();
		self.updateIcon();
		if (self.latestLoader.success) {
			self.notifyLatest(self.latestLoader.data);
			self.clearUsageCache();
		}
	}
}

TepcoWatcher.prototype.initLoader2 = function() {
	var self = this;
	if (this.config.forecast_enabled) {
		if (!this.forecastLoader) {
			this.forecastLoader = new ForecastLoader;
			// this.forecastLoader.interval = this.config.forecast_update_interval;
			this.forecastLoader.__defineGetter__('interval',function(){ return self.config.forecast_update_interval });
		}
	} else if (this.forecastLoader) {
		this.forecastLoader.stopTimer();
		this.forecastLoader = null;
	}

	if (this.config.twitter_enabled) {
		if (!this.tweetLoader) {
			this.tweetLoader = new TweetLoader;
			//this.tweetLoader.interval = this.config.update_twitter_interval;
			this.tweetLoader.__defineGetter__('interval',function(){ return self.config.twitter_update_interval });
			this.tweetLoader.oncomplete = function() {
				self.sendResponse('rspTweetData', self.tweetLoader);
				if (self.tweetLoader.success) {
					self.notifyTweet(self.tweetLoader.data);
				}
			}
		}
		this.tweetLoader.url = this.tweetLoader.timeline_url(this.config.twitter_username);
	} else if (this.tweetLoader) {
		this.tweetLoader.stopTimer();
		this.tweetLoader = null;
	}
	
	if (this.config.mukku_enabled) {
		if (!this.mukkuLoader) {
			this.mukkuLoader = new MukkuLoader;
			this.mukkuLoader.__defineGetter__('interval',function(){ return self.config.mukku_update_interval });
			this.mukkuLoader.oncomplete = function() {
				// console.log(self.mukkuLoader.data);
				self.sendResponse('rspMukkuData', self.mukkuLoader);
			}
		}
	} else if (this.mukkuLoader) {
		this.mukkuLoader.stopTimer();
		this.mukkuLoader = null;
	}

	this.current_usage_rate = this.status.current_usage_rate;
}

TepcoWatcher.prototype.startLoader = function() {
	this.quickLoader.load();
	this.latestLoader.load();
	if (this.forecastLoader) {
		this.forecastLoader.load();
	}
	if (this.tweetLoader) {
		this.tweetLoader.load();
	}
	if (this.mukkuLoader) {
		this.mukkuLoader.load();
	}
}

TepcoWatcher.prototype.reload = function() {
	// console.log("========== reload ==========");
	this.config.load();
	this.initLoader2();
	this.startLoader();
}

TepcoWatcher.prototype.onRequest = function (request, sender, callback) {
	switch (request.action) {
	case 'reqConfigReload':
		this.reload();
		break;
	case 'reqQuickData':
		if (this.quickLoader.success) {
			this.sendResponse('rspQuickData', this.quickLoader);
		} else {
			this.quickLoader.load();
		}
		break;
	case 'reqLatestData':
		if (this.latestLoader.success) {
			this.sendResponse('rspLatestData', this.latestLoader);
		} else {
			this.latestLoader.load();
		}
		break;
	case 'reqTweetData':
		if (this.tweetLoader.success) {
			this.sendResponse('rspTweetData', this.tweetLoader);
		} else {
			this.tweetLoader.load();
		}
		break;
	case 'reqMukkuData':
		if (this.mukkuLoader.success) {
			this.sendResponse('rspMukkuData', this.mukkuLoader);
		} else {
			this.mukkuLoader.load();
		}
		break;
	case 'reqUsageData':
		this.getUsageData(request.dates);
		break;
	}
}

TepcoWatcher.prototype.sendResponse = function(msg_action, loader) {
	var msg = { action: msg_action } ;
	if (loader) {
		msg.enabled = true;
		msg.name = loader.name;
		msg.success = loader.success;
		msg.data = loader.data;
	} else {
		msg.enabled = false;
	}
	if (this.extension_port['popup']) {
		this.extension_port['popup'].postMessage(msg);
	}
}

TepcoWatcher.prototype.paddingForecast = function(loader) {
	var forecast = null;
	if (this.forecastLoader) {
		var date_str = UsageLoader.prototype.dateToString(loader.date, 'day');
		forecast = this.forecastLoader.forecast[date_str];
	}
	if (!loader.data) {
		loader.data = [];
	}
	for (var i = 0 ; i<24 ; i++) {
		if (loader.data[i]) {
			// 使用量実績が 0 より大きいときは、予報データで代替しないため continue する。
			if (loader.data[i].usage > 0) {
				// [DEBUG] 試験的に停電実施中を再現
				// if (i==14 || i==15) { loader.data[i].saving = true; }
				loader.data[i].usage_type = loader.data[i].saving ? 0 : 1;
				continue;
			}
			// 東電による予測値が提供されている場合は、それを予報データとする。
			if (loader.data[i].forecast > 0) {
				if (!loader.data[i].yahoo_forecast) {
					loader.data[i].usage_type = 2;
				}
				continue;
			}
		}
		// 予報データがない場合は、break する
		if (!forecast || !forecast[i]) {
			break;
		}
		var usage_type = 3;
		// [DEBUG] 試験的にでんき予報データを差し込む
		// if (i==20 || i==21) { usage_type = 2; }
		var padding = {
			yahoo_forecast: true,
			usage_type: usage_type,
			forecast: forecast[i].usage,
			saving: false,
			usage: 0,
			capacity: forecast[i].capacity,
			year: loader.date.getFullYear(),
			month: loader.date.getMonth() + 1,
			day: loader.date.getDate(),
		};
		loader.data[i] = padding;
	}
}

TepcoWatcher.prototype.usageCompleteHandler = function(loader) {
	var self = this;
	return function() {
		self.paddingForecast(loader);
	}
}

TepcoWatcher.prototype.getUsageData = function(dates) {
	function usage_cache_key(date) {
		return 'usage_' + date;
	}

	var usageLoader = new GroupLoader;
	var self = this;
	for (var i=0 ; i<dates.length ; i++) {
		var loader = new UsageLoader({date: dates[i]});
		var cached_data = self.cache.loadCache(usage_cache_key(loader.date_str));
		if (cached_data != null) {
			loader.setCacheData(cached_data);
		}
		loader.oncomplete = this.usageCompleteHandler(loader);
		usageLoader.addLoader(loader);
	}
	usageLoader.oncomplete = function() {
		// [DEBUG] データ読み出し遅延試験用
		// setTimeout(function(){self.sendResponse('rspUsageData', usageLoader);}, 500);

		// console.log(usageLoader);
		self.sendResponse('rspUsageData', usageLoader);

		for (var i=0 ; i<usageLoader.group.length ; i++) {
			var loader = usageLoader.group[i];
			if (loader.success && !loader.cached) {
				self.cache.storeCache(usage_cache_key(loader.date_str), loader.data);
			}
		}
	}
	usageLoader.load();
}

TepcoWatcher.prototype.clearUsageCache = function () {
	var cache = this.cache;
	var keys = [];
	for (var key in cache.cache_hash) {
		if (key.match(/^usage_/)) {
			var c = cache.cache_hash[key];
			if (c.data && (c.data.length < 24 || c.data[c.data.length-1].yahoo_forecast)) {
				// 24時間分のデータがそろっていない場合、または Yahoo予報 を含む場合はキャッシュクリアする
				keys.push(key);
			}
		}
	}
	for (var i=0 ; i<keys.length ; i++) {
		cache.clearCache(keys[i]);
	}
}

TepcoWatcher.prototype.notifyLatest = function (data) {
	var time = new Date(data.usage_updated).getTime();
	var do_notify = this.config.notify_anytime ? true : false;
	if (this.status.latest_data_time < time) {
		this.status.latest_data_time = time;	// 最新データ更新あり（常時表示モードでない場合も含む）
	} else if (!do_notify) {
		return;					// 更新なし＆常時表示モードでないので終了
	}
	if (do_notify) {
		// すでに表示決定なのでスルー
	} else if (data.usage_rate >= this.config.notify_threshold) {
		do_notify = true;
	} else if (data.saving && this.config.notify_in_saving) {
		do_notify = true;
	}
	if (do_notify) {
		if (this.config.notify_enabled) {
			var notifier = new LatestNotifier(data);
			notifier.timeout = this.config.notify_timeout;
			notifier.show();
		}
	}
}

TepcoWatcher.prototype.notifyTweet = function (tweets) {
	var latest_tweet_time = this.status.latest_tweet_time;
	var unread_tweets = tweets.length;
	if (unread_tweets == 0) {
		// ツイートが取得できなかった？
		return;
	}
	for (var i=0 ; i<tweets.length ; i++) {
		if (latest_tweet_time >= tweets[i].time) {
			unread_tweets = i;	// find old tweet!
			break;
		}
	}
	if (this.config.notify_anytime || (this.config.twitter_notify && unread_tweets > 0)) {
		if (this.config.notify_enabled) {
			var saving = this.latestLoader.success ? this.latestLoader.data.saving : false;
			var notifier = new TweetNotifier(tweets[0], saving);
			if (unread_tweets > 1) {
				notifier.title += " (" + unread_tweets + " new tweets)";
			}
			notifier.timeout = this.config.notify_timeout;
			notifier.show();
		}
		this.status.latest_tweet_time = tweets[0].time;
	}
	console.log("notifyTweet: unread_tweets=" + unread_tweets + ", latest_tweet_time=" + this.status.latest_tweet_time);
}

TepcoWatcher.prototype.updateUsageRate = function() {
	var badge_text;
	var ql = this.quickLoader;
	var ll = this.latestLoader;
	var next_usage_rate;
	
	if (ql.success && ql.data.usage_rate >= 0) {
		// badge_text = ql.data.usage_rate.toFixed(1);
		next_usage_rate = parseInt(ql.data.usage_rate * 10 + 0.5);
	} else if (ll.success && ll.data.usage_rate >= 0) {
		// badge_text = ll.data.usage_rate.toFixed(1);
		next_usage_rate = parseInt(ll.data.usage_rate * 10 + 0.5);
	} else {
		badge_text = 'ERR';
		chrome.browserAction.setBadgeText({ "text": 'ERR' });
	}
	// 使用率の表示を徐々に変える
	this.next_usage_rate = next_usage_rate;
	// console.log("updateUsageRate: " + this.current_usage_rate + " -> " + this.next_usage_rate);
	this.updateUsageRateBadge();
}

TepcoWatcher.prototype.updateUsageRateBadge = function() {
	var diff = 0;
	var sign = 0;
	if (this.next_usage_rate > this.current_usage_rate) {
		sign = +1;	// current_usage_rate を徐々に増やす
		diff = this.next_usage_rate - this.current_usage_rate;
	} else if (this.next_usage_rate < this.current_usage_rate) {
		sign = -1;	// current_usage_rate を徐々に減らす
		diff = this.current_usage_rate - this.next_usage_rate;
	}
	if (sign) {
		if (diff > 200) {
			diff = 100;
		} else if (diff > 100) {
			diff = 50;
		} else if (diff > 50) {
			diff = 20;
		} else if (diff > 25) {
			diff = 10;
		} else if (diff > 10) {
			diff = 5;
		} else if (diff > 5) {
			diff = 2;
		} else {
			diff = 1;
		}
		this.current_usage_rate += sign * diff;
	}
	var rate_text = (this.current_usage_rate / 10.0).toFixed(1);
	chrome.browserAction.setBadgeText({ "text": rate_text });

	if (this.current_usage_rate == this.next_usage_rate) {
		this.status.current_usage_rate = this.current_usage_rate;
		return;
	}

	// 使用率を再表示
	var self = this;
	setTimeout(function(){ self.updateUsageRateBadge() }, 200);
}

TepcoWatcher.prototype.updateIcon = function() {
	if (this.latestLoader.success) {
		var icon = this.latestLoader.data.saving ? apps_icons.off : apps_icons.on;
		chrome.browserAction.setIcon({ "path": icon });
	}
}

var tw=null;
$(document).ready(function(){
	tw = new TepcoWatcher;
	tw.startLoader();
});

})();
