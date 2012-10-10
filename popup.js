(function(){
//---------------------------------------------------------
// Status
//---------------------------------------------------------
PopupStatus = function() {
	this.define('compare_yesterday'		,true);
	this.define('compare_lastweek'		,false);
	this.define('percent_mode'		,false);
	this.define('bottomcut_mode'		,false);
	this.__name = 'popup';
	this.__autosave = true;
}
PopupStatus.prototype = new Config();

//---------------------------------------------------------
var max_capacity_default = 6000;
var y_tickInterval = 1000;
var busy = { latest: false, usage: false };

var view_date;
var move_date;
var graph_side = 0;
var tweet_pasttime_timer;
var preloading = true;

var config = new TepcoWatcherConfig;
var status = new PopupStatus;

var popup_port;

const DATE_1DAY_OFFSET	= 24 * 60 * 60 * 1000;

const KEYCODE_LEFT	= 37;
const KEYCODE_UP	= 38;
const KEYCODE_RIGHT	= 39;
const KEYCODE_DOWN	= 40;

function jqplot_today(arg) {
	var config = {
		label: '当日実績', shadow: false, renderer: $.jqplot.BarRenderer, rendererOptions: {barMargin: 14}
	};
	for (var i in arg) { config[i] = arg[i]; }
	return config;
}

function jqplot_yesterday(arg) {
	var config = {
		label: '前日実績', markerOptions: {size: 6}
	};
	for (var i in arg) { config[i] = arg[i]; }
	return config;
}

function jqplot_capacity(arg) {
	var config = {
		label: '供給力', showLabel: false, lineWidth: 1, markerOptions: {show: true, size: 3}
	};
	for (var i in arg) { config[i] = arg[i]; }
	return config;
};

function jqplot_default(arg) {
	var config = {
		seriesColors: [ "#FF0000", "#4bb2c5", "#c5b47f", "#EAA228", "#579575", "#839557", "#958c12", "#953579", "#4b5de4", "#d8b83f", "#ff5800", "#0085cc"],
		legend: {
			show: true, location: 'sw',
			// xoffset: 6, yoffset: 6,
		},
		series: [],
		axes: {
			xaxis: {
				renderer: $.jqplot.CategoryAxisRenderer, 
				ticks: (function(){var a=[];for(var i=0;i<24;i++){a.push(i.toString())};return a})(),
			},
			yaxis: {
				min: 0,
				max: max_capacity_default,
				tickOptions: { formatString: '%d' },
				tickInterval: y_tickInterval,
			},
		},
		cursor: {  
			show: true,
			showVerticalLine: false,
			showHorizontalLine: true,
			showCursorLegend: false,
			showTooltip: false,
			zoom: true,
			dblClickReset: true,
		},
	};
	for (var i in arg) { config[i] = arg[i]; }
	return config;
};

function setBusy(type) {
	if (busy[type]) {
		return -1;
	}
	busy[type] = true;
	switch (type) {
	case 'usage':
		// $('.navi_button').attr("disabled","disabled");
		break;
	}
	return 0;
}

function clearBusy(type) {
	busy[type] = false;
	switch (type) {
	case 'usage':
		// $('.navi_button').removeAttr("disabled");
		break;
	}
}

function sendMessage(msg) {
	if (popup_port) {
		popup_port.postMessage(msg);
	} else {
		console.error("popup_port not connected!");
	}
}

function onMessage(request, sender, callback) {
	switch (request.action) {
	case 'rspQuickData':
		updateQuickView(request.data, function(){ clearBusy('quick'); });
		break;

	case 'rspLatestData':
		updateLatestView(request.data, function(){ clearBusy('latest'); resize(); });
		break;

	case 'rspUsageData':
		updateGraphView(request.data, function(){ clearBusy('usage') });
		break;

	case 'rspTweetData':
		updateTweetView(request.data, function(){ clearBusy('tweet') });
		break;

	case 'rspMukkuData':
		updateMukkuView(request.data, function(){ clearBusy('mukku') });
		break;
	}
}

function updateQuickView(data, callback) {
	// 使用率速報値表示
	var quick_usage = data.usage + ' 万kW【' + data.usage_rate.toFixed(1) + '%】使用中 [' + data.date + ']';
	$('#usage').text(quick_usage);
}

function updateLatestView(data, callback) {
	// アイコンの設定
	if (data.saving) {
		$('#icon').attr("src", "img/icon_off48.png");
		$('#saving').attr('class', 'saving_on').text("計画停電：実施中です！");
	} else {
		$('#icon').attr("src", "img/icon_on48.png");
		$('#saving').attr('class', 'saving_off').text("計画停電：実施していません");
	}

	// 使用率表示 ⇒ 速報値で表示するように変更
// 	var latest_usage = '現在 ' + data.usage + ' 万kW【' + data.usage_rate.toFixed(1) + '%】使用中';
// 	$('#usage').text(latest_usage);

	// 予想最大電力／ピーク時供給力
	var capacity_info = '予想需要 ' + data.forecast_peak_usage + ' 万kW(' + data.forecast_peak_period + '時台)';
	capacity_info += ' ／ ';
	capacity_info += '最大供給力 ' + data.capacity + ' 万kW(' + data.capacity_peak_period + '時台)';
	$('#capacity_info').text(capacity_info);

// 	// データ読み込み日時の更新
	var usage_updated = new Date(data.usage_updated);
	$("#updated").text(usage_updated.toLocaleDateString() + ' ' + usage_updated.toLocaleTimeString());

	// グラフ表示日が未設定の場合、最新日に移動（初回時・更新時）
	if (!view_date) {
		view_date = new Date(data.year, data.month-1, data.day);
		if (config.graph_enabled) {
			moveDate(0);
		} else {
			preloadingDone();
		}
	}
	callback();
}

function preloadingNone() {
	if (preloading) {
		$('#preloading_div').hide();
		preloading = false;
	}
}
function preloadingDone() {
	if (preloading) {
		if (config.graph_fx_off) {
			$('#preloading_div').hide();
		} else {
			$('#preloading_div').fadeOut(config.graph_fadetime);
		}
		preloading = false;
	}
}

function updateGraphView(data, callback) {
	if (!config.graph_enabled) {
		return;
	}
	var y_max = 0;
	var y_min = 10000000;
	var y_data = [];
	var plot_date;
	var plot_capacity = status.percent_mode ? false : true;
	var jqplot_config = jqplot_default();
	
	function check_max(y) {
		if (y_max < y) {
			y_max = y;
		}
		if (y_min > y) {
			y_min = y;
		}
	}
	function date_label(date, cnt0, cnt1, cnt2, cnt3) {
		var label = date.toLocaleDateString();
		var opt = '';
		if (cnt0 > 0) {
			opt += '【停電】';
		}
		if (cnt1 > 0) {
			opt += '［実績］';
		}
		if (cnt2 > 0) {
			opt += '［でんき予報］';
		}
		if (cnt3 > 0) {
			opt += '［Yahoo!予報］';
		}
		if (opt) {
			label += ' ' + opt;
		}
		return label;
	}
	function graph_toggleside() {
		graph_side = graph_getside(false);
	}
	function graph_getside(currentside) {
		return currentside ? graph_side : ((graph_side + 1) & 1);
	}
	function graph_getid(currentside) {
		var side = graph_getside(currentside);
		return 'graph' + side;
	}
	function data_prepare() {
		// ロードしたデータを jqPlot に渡す準備を行う
		for (var i=0 ; i<data.length ; i++) {
			var usage = data[i];
			if (!usage || usage.length == 0) {
				continue;
			}
			var date = new Date(usage[0].year, usage[0].month-1, usage[0].day);
			if (i == 0) {
				// 当日データの場合（配列の先頭を当日としている）
				var y_usages = [[],[],[],[]];
				var y_count = [0,0,0,0];
				var y_capacity = [];
				for (var t=0 ; t<usage.length ; t++) {
					var y_value0 = usage[t].usage || usage[t].forecast;
					var y_value = status.percent_mode ? (100 * y_value0 / usage[t].capacity) : y_value0;
					var type = usage[t].usage_type;
					y_usages[0].push(type == 0 ? y_value : 0);
					y_usages[1].push(type == 1 ? y_value : 0);
					y_usages[2].push(type == 2 ? y_value : 0);
					y_usages[3].push(type == 3 ? y_value : 0);
					++y_count[type];
					if (plot_capacity) {
						y_capacity.push(usage[t].capacity);
						check_max(usage[t].capacity);
					}
					check_max(y_value0);
				}

				jqplot_config.series.push(jqplot_today(y_count[0] ? {label: date_label(date,1,0,0,0)}  : {showLabel: false} ));
				jqplot_config.series.push(jqplot_today(y_count[1] ? {label: date_label(date,0,1,0,0)}  : {showLabel: false} ));
				jqplot_config.series.push(jqplot_today(y_count[2] ? {label: date_label(date,0,0,1,0)}  : {showLabel: false} ));
				jqplot_config.series.push(jqplot_today(y_count[3] ? {label: date_label(date,0,0,0,1)}  : {showLabel: false} ));

				y_data.push(y_usages[0]);
				y_data.push(y_usages[1]);
				y_data.push(y_usages[2]);
				y_data.push(y_usages[3]);

				if (plot_capacity) {
					jqplot_config.series.push(jqplot_capacity());
					y_data.push(y_capacity);
				}
				plot_date = date;
			} else {
				var y_usage = [];
				var y_count = [0,0,0,0];
				for (var t=0 ; t<usage.length ; t++) {
					var y_value0 = usage[t].usage || usage[t].forecast;
					var y_value = status.percent_mode ? (100 * y_value0 / usage[t].capacity) : y_value0;
					y_usage.push(y_value);
					check_max(y_value);
					++y_count[usage[t].usage_type];
				}
				var series = jqplot_yesterday({label: date_label(date, y_count[0], y_count[1], y_count[2], y_count[3])});
				jqplot_config.series.push(series);
				y_data.push(y_usage);
			}
		}
	}

	function draw_graph () {
		if (plot_date && y_data.length > 0) {
			// jqplot_config.title = view_date.toLocaleDateString(true);
			// Y軸最大値を調整
			if (status.percent_mode) {
				jqplot_config.axes.yaxis.max = 100;
				jqplot_config.axes.yaxis.tickInterval = 10;
				if (status.bottomcut_mode) {
					jqplot_config.axes.yaxis.min = 50;
					jqplot_config.axes.yaxis.tickInterval = 5;
				}
			} else {
				// jqplot_config.axes.yaxis.max = y_max + (y_tickInterval / 2);
				// jqplot_config.axes.yaxis.max = y_max;
				var y_tick = y_tickInterval;
				if (status.bottomcut_mode) {
					y_tick = Math.floor(y_tick / 2);
					jqplot_config.axes.yaxis.tickInterval = y_tick;
					jqplot_config.axes.yaxis.min = Math.floor(y_min / y_tick) * y_tick;
				}
				jqplot_config.axes.yaxis.max = Math.floor((y_max + y_tick - 1) / y_tick) * y_tick;
			}
			// グラフを生成する
			new_graph.empty();
			new_graph_outer.show();	// 一旦 show しないと jqplot がグラフを描画してくれない
			$.jqplot(new_graph_id, y_data, jqplot_config);
			new_graph_outer.hide();
			// 凡例の行間を詰める
			$("td.jqplot-table-legend").css('padding-top', '2px');
			$(".jqplot-table-legend").hide();
		} else {
			var msg = "＜データがありません＞";
			var table = '<table width="100%" height="100%" class="glaph_error">';
			table += '<tr><td align="center" valign="middle">' + msg + '</td></tr></table>';
			new_graph.empty();
			new_graph.removeAttr('class');
			new_graph.append(table);
		}
		new_graph_outer.css('z-index', 2);
		old_graph_outer.css('z-index', 1);
	}

	function draw_after() {
		view_date = move_date;
		$('#update_data').val(view_date.toLocaleDateString(true));
		old_graph_outer.hide();
		old_graph.empty();
		graph_toggleside();
 		$(".jqplot-event-canvas").hover(
			function(){ $(".jqplot-table-legend").fadeIn(); },
			function(){ $(".jqplot-table-legend").fadeOut(); }
		);
		callback();
	}

	var new_graph_id = graph_getid(true);
	var new_graph = $('#' + new_graph_id);
	var new_graph_outer = $('#' + new_graph_id + '_outer');

	var old_graph_id = graph_getid(false);
	var old_graph = $('#' + old_graph_id);
	var old_graph_outer = $('#' + old_graph_id + '_outer');

	data_prepare();
	draw_graph();

	if (preloading) {
		new_graph_outer.show();
		draw_after();
		preloadingDone();
	} else {
		if (config.graph_fx_off) {
			new_graph_outer.show();
			draw_after();
		} else {
			new_graph_outer.fadeIn(config.graph_fadetime, draw_after);
		}
	}
}

function updateMukkuView(data, callback) {
	var mi = $('#mukku_info');
	var mukku_on = false;
	var text = '';

	if (config.mukku_group == "") {
		var options_url = chrome.extension.getURL("options.html");
		var options_a = $(document.createElement('a'));
		options_a.attr('href', options_url).attr('target', '_blank').text('[オプション]');
		mi.empty();
		mi.append(options_a);
		mi.append(' から計画停電のグループ番号を設定してください');
	} else {
		var result = data.Result[config.mukku_group];
		if (!result) {
			mukku_on = true;
			text = "計画停電の情報が取得できませんでした";
		} else {
			if (result.Count > 0) {
				text = result.All + ' に計画停電が予定されています [' + config.mukku_group + ']';
				mukku_on = true;
			} else {
				text = '本日 グループ ' + config.mukku_group + ' に計画停電の予定はありません';
			}
		}
		mi.text(text);
	}
	if (mukku_on) {
		mi.addClass('mukku_on');
		mi.removeClass('mukku_off');
	} else {
		mi.removeClass('mukku_on');
		mi.addClass('mukku_off');
	}
	callback();
}

function updateTweetTime() {
	if (!config.twitter_enabled) {
		return;
	}
	function pasttimeText(msec) {
		var sec = Math.floor(msec / 1000);
		if (sec < 60) {
			return sec + '秒前';
		}
		var min = Math.floor(sec / 60); sec %= 60;
		if (min < 60) {
			return min + '分' + sec + '秒前';
		}
		var hour = Math.floor(min / 60); min %= 60;
		if (hour < 24) {
			return hour + '時間' + min + '分前';
		}
		var day = Math.floor(hour / 24); hour %= 24;
		return day + '日と' + hour + '時間前';
	}
	var now = new Date();
	var date = new Date();
	$('#tweet_table tbody').each(function(){
		var time = $(".tweet_time", this).text();
		date.setTime(time);
		var datetext = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
		datetext += ' (' + pasttimeText(now.getTime() - time) + ')';
		$(".tweet_date", this).text(datetext);
	});

	if (tweet_pasttime_timer != null) {
		clearTimeout(tweet_pasttime_timer);
	}
	tweet_pasttime_timer = setTimeout(updateTweetTime, 60 * 1000);
}

function updateTweetView(data, callback) {
	if (!config.twitter_enabled) {
		return;
	}
	var table = $('#tweet_table');
	table.empty();
	if (data && data.length > 0) {
		var tbody_templete = $('#tweet_templete tbody:first-child');
		var now = new Date();
		for (var i=0 ; i<data.length && i<config.twitter_view_max; i++) {
			var tweet = data[i];
			var date = new Date(tweet.created_at);
	 		var pasttime = now.getTime() - date.getTime();
			if (pasttime > config.twitter_view_duration && i >= config.twitter_view_min) {
				break;
			}
			var tbody = tbody_templete.clone(true);
			$('.tweet_icon', tbody).attr('src', tweet.image_url);
			$('.tweet_link', tbody).attr('href', tweet.tweet_link);
			$('.tweet_name', tbody).attr('href', tweet.user_link).text(tweet.screen_name);
			$(".tweet_date", tbody).text("");
			$(".tweet_time", tbody).text(date.getTime());
			$('.tweet_text', tbody).text(tweet.text);
			table.append(tbody);
		}
		updateTweetTime();
	} else {
		var msg = "＜ツイートが取得できません＞";
		var tbody = '<tbody class="glaph_error"><tr><td align="center" valign="middle">' + msg + '</td></tr></tbody>';
		table.append(tbody);
	}
	callback();
}

function moveDate(move) {
	if (!config.graph_enabled) {
		return;
	}
	if (setBusy('usage') < 0) {
		return;
	}
	function offsetDate(date, offset) {
		return new Date(date.getTime() + offset * DATE_1DAY_OFFSET);
	}
	var dates_list = [];
	dates_list.add = function(date) { this.push(date.toDateString()) };

	move_date = offsetDate(view_date, move);
	dates_list.add(move_date);
	if (status.compare_yesterday) {
		dates_list.add(offsetDate(move_date, -1));
	}
	if (status.compare_lastweek) {
		dates_list.add(offsetDate(move_date, -7));
	}
	sendMessage({action: "reqUsageData", dates: dates_list});
}

function graphOption() {
	var type = this.name;
	switch (type) {
	case 'yesterday':
	case 'lastweek':
		status['compare_' + type] = this.checked;
		break;
	case 'percent':
	case 'bottomcut':
		status[type + '_mode'] = this.checked;
		break;
	default:
		return;
	}
	moveDate(0);
}

function updateQuickData() {
	setBusy('quick');
	sendMessage({action: "reqQuickData"});
}

function updateLatestData() {
	setBusy('latest');
	view_date = null;
	sendMessage({action: "reqLatestData"});
}

function updateTweetData() {
	if (!config.twitter_enabled) {
		return;
	}
	setBusy('tweet');
	sendMessage({action: "reqTweetData"});
}

function updateMukkuData() {
	setBusy('mukku');
	sendMessage({action: "reqMukkuData"});
}

function resize() {
	if (!config.twitter_enabled) {
		$('#tweet_area').hide();
	}
	if (!config.graph_enabled) {
		$('#graph_area').hide();
		$('#navi_area').hide();
	}
	if (!config.twitter_enabled && !config.graph_enabled) {
		preloadingNone();
	}
	if (!config.mukku_enabled) {
		$('#mukku_area').hide();
	}

	var table_width = $('#main_table').outerWidth(true);
	var table_height = $('#main_table').outerHeight(true);

	// console.log("resize: " + table_width + "x" + table_height);

	$(".resize_target").width(table_width);
	$(".resize_target").height(table_height);
	
	$('html').width($('body').outerWidth(true));
	$('html').height($('body').outerHeight(true));
}

function init_graph_ctrl() {
	if (!config.graph_enabled) {
		return;
	}
	
	$('#chk_yesterday').attr('checked', !!status.compare_yesterday).click(graphOption);
	$('#chk_lastweek').attr('checked', !!status.compare_lastweek).click(graphOption);
	$('#chk_percent').attr('checked', !!status.percent_mode).click(graphOption);
	$('#chk_bottomcut').attr('checked', !!status.bottomcut_mode).click(graphOption);
	
	$('#move_prev').click(function(){moveDate(-1)});
	$('#move_next').click(function(){moveDate(+1)});
	$('#update_data').click(updateLatestData).val(new Date().toLocaleDateString(true));

	var panel = $('#navi_panel');
	var option = $('#navi_option');
	panel.width(option.outerWidth());
	var offset = panel.offset();
	offset.top  = offset.top  + panel.outerHeight() - option.outerHeight() - 0;
	offset.left = offset.left + panel.outerWidth()  - option.outerWidth()  + 0;
	option.offset(offset);

	$('#navi_open').hover(
		function(){ $(this).attr('class', 'navi_open_on'); },
		function(){ $(this).attr('class', 'navi_open_off'); }
	);
	$('#navi_open').click(function(){ $('#navi_option').show(); });
	$('#navi_close').click(function(){ $('#navi_option').hide(); });

	$(window).keyup(function(e){
		switch (e.keyCode) {
		case KEYCODE_LEFT:	moveDate(-1); break;
		case KEYCODE_UP:	moveDate(-7); break;
		case KEYCODE_RIGHT:	moveDate(+1); break;
		case KEYCODE_DOWN:	moveDate(+7); break;
		}
	});
}

function start() {
	popup_port = chrome.extension.connect({name: 'popup'});
	popup_port.onMessage.addListener(onMessage);
	updateQuickData();
	updateLatestData();
	updateTweetData();
	updateMukkuData();
}

$(document).ready(function(){
	config.load();
	status.load();
	$('a').click(openTab);
	resize();
	init_graph_ctrl();
	start();
});
})();
