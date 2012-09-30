(function(){
	//---------------------------------------------------------
	// toLocaleDateString メソッドの上書き
	//---------------------------------------------------------
	Date.prototype.toLocaleDateString = function(label) {
		const DAY_LABEL		= ['日','月','火','水','木','金','土'];
		var s = this.getFullYear() + '/' + (this.getMonth() + 1) + '/' + this.getDate();
		if (label) {
			s += ' （' + DAY_LABEL[this.getDay()] + '）';
		}
		return s;
	}

	//---------------------------------------------------------
	// 既存または新規タブでリンクを開く
	//---------------------------------------------------------
	window.openTab = function () {
		var url = this.href;
		chrome.tabs.getAllInWindow(null, function(tabs) {
			for (var i=0 ; i<tabs.length ; i++) {
				if (tabs[i].url == url) {
					chrome.tabs.update(tabs[i].id, {selected: true});
					return;
				}
			}
			chrome.tabs.create({'url': url});
		});
	}

	//---------------------------------------------------------
	// Config (using localStorage)
	//---------------------------------------------------------
	Config = function() {
		this.__name = 'config';
		this.__valmap = {};
		this.__defmap = {};
		this.__autosave = false;
	}
	Config.prototype = new Object;
	Config.prototype.define = function(key, defval) {
		this.__defmap[key] = defval;
		Config.prototype.__defineGetter__(key, function(){
			if (key in this.__valmap) {
				// console.log(this.__name + "(get-val): " + key + "=" + this.__valmap[key]);
				return this.__valmap[key];
			} else {
				// console.log(this.__name + "(get-def): " + key + "=" + this.__defmap[key]);
				return this.__defmap[key];
			}
		});
		Config.prototype.__defineSetter__(key, function(val){
			this.__valmap[key] = val;
			if (this.__autosave) {
				this.save();
			}
		});
	}
	Config.prototype.resetToDefault = function() {
		this.__valmap = {};
	}
	Config.prototype.load = function() {
		for (var key in this.__defmap) {
			var name = this.__name + '.' + key;
			var json = localStorage.getItem(name);
			if (json != null) {
				this.__valmap[key] = JSON.parse(json);
			}
		}
	}
	Config.prototype.save = function() {
		for (var key in this.__valmap) {
			var name = this.__name + '.' + key;
			localStorage.setItem(name, JSON.stringify(this.__valmap[key]));
		}
	}

	TepcoWatcherConfig = function() {
		this.define('notify_enabled'			,true);
		this.define('notify_anytime'			,false);
		this.define('notify_timeout'			,     60 * 1000);	//   1分

		this.define('notify_threshold'			,90);				// 90%以上のとき通知
		this.define('notify_in_saving'			,true);				// 計画停電中のとき通知

		this.define('cache_timeout'				,60 * 60 * 1000);	// 1時間
		
		this.define('forecast_enabled'			,true);
		this.define('forecast_update_interval'	,3 * 60 * 60 * 1000);	// 3時間

		this.define('quick_update_interval'		, 2 * 60 * 1000);	//  2分
		this.define('latest_update_interval'	,15 * 60 * 1000);	//  15分

		this.define('graph_enabled'				,true);
		this.define('graph_fx_off'				,false);
		this.define('graph_fadetime'			,200);
		
		this.define('twitter_enabled'			,true);
		this.define('twitter_notify'			,true);
		this.define('twitter_username'			,'tichi73/tepco-watch');
		this.define('twitter_update_interval'	,30 * 60 * 1000);	//  30分
		this.define('twitter_view_min'			,4);				// 少なくとも表示するツイート数
		this.define('twitter_view_max'			,100);				// 最大で表示するツイート数
		this.define('twitter_view_duration'		,3 * 24 * 60 * 60 * 1000);

		this.define('mukku_enabled'				,true);
		this.define('mukku_update_interval'		,3 * 60 * 60 * 1000);	// 3時間
		this.define('mukku_group'				,"");
	}
	TepcoWatcherConfig.prototype = new Config();
})();
