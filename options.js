(function(){
var option_notify = {
	title: "デスクトップ通知に関する設定",
	options: [
		{
			id: "notify_enabled",
			legend: "新しい情報を取得したときのデスクトップ通知",
			type: "select",
			select: [
				{text: "有効", value: true},
				{text: "無効", value: false}
			],
			class: "select select_boolean",
		},{
			id: "notify_anytime",
			legend: "常に通知を行う（注意：テスト用）",
			type: "select",
			select: [
				{text: "通知する", value: true},
				{text: "通知しない", value: false}
			],
			class: "select select_boolean",
			enabled_if: function(){ return $("#notify_enabled").val()=="true" },
		},{
			id: "notify_timeout",
			legend: "デスクトップ通知を自動的に閉じる時間",
			type: "number",
			min: 3,
			max: 600,
			size: 3,
			postfix: "秒",
			class: "input_seconds",
			enabled_if: function(){ return $("#notify_enabled").val()=="true" },
		},
	],
};
var option_usage = {
	title: "<a href=\"http://tepco-usage-api.appspot.com/\" target=\"_blank\">東京電力電力供給状況API</a> による情報取得に関する設定",
	options: [
		{
			id: "latest_update_interval",
			legend: "電力使用状況を取得する間隔",
			type: "number",
			min: 5,
			max: 120,
			size: 3,
			postfix: "分",
			class: "input_minutes",
		},{
			id: "notify_threshold",
			legend: "デスクトップ通知を行う電気使用量しきい値",
			type: "number",
			min: 0,
			max: 100,
			size: 3,
			postfix: "％以上のとき通知する",
			class: "input_number",
		},{
			id: "notify_in_saving",
			legend: "計画停電実施中のときのデスクトップ通知",
			type: "select",
			select: [
				{text: "通知する", value: true},
				{text: "通知しない", value: false}
			],
			class: "select select_boolean",
			enabled_if: function(){ return $("#notify_enabled").val()=="true" },
		},
	],
};
var option_forecast = {
	title: "<a href=\"http://developer.yahoo.co.jp/webapi/shinsai/v1/setsuden/electricpowerforecast.html\" target=\"_blank\">Yahoo! 電気予報API</a> による情報取得に関する設定",
	options: [
		{
			id: "forecast_enabled",
			legend: "電気予報APIによる情報の取得",
			type: "select",
			select: [
				{text:"取得する", value: true},
				{text:"取得しない", value: false}
			],
			class: "select select_boolean",
		},{
			id: "forecast_update_interval",
			legend: "電気予報を取得する間隔",
			type: "number",
			min: 1,
			max: 24,
			size: 3,
			postfix: "時間",
			class: "input_hours",
			enabled_if: function(){ return $("#forecast_enabled").val()=="true" },
		},
	],
}
var option_twitter = {
	title: "Twitter による情報取得に関する設定",
	options: [
		{
			id: "twitter_enabled",
			legend: "ツイッターから関連ツイートを以下リストから取得",
			type: "select",
			select: [
				{text:"取得する", value: true},
				{text:"取得しない", value: false}
			],
			class: "select select_boolean",
		},{
			id: "twitter_username",
			legend: "＠ユーザ名／リスト名",
			type: "text",
			size: 30,
			prefix: '@',
			postfix: ' <span id="check_twitter">確認する</span>',
			enabled_if: function(){ return $("#twitter_enabled").val()=="true" },
		},{
			id: "twitter_update_interval",
			legend: "ツイートを取得する間隔",
			type: "number",
			min: 5,
			max: 120,
			size: 3,
			postfix: "分",
			class: "input_minutes",
			enabled_if: function(){ return $("#twitter_enabled").val()=="true" },
		},{
			id: "twitter_notify",
			legend: "新しいツイートがあったときのデスクトップ通知",
			type: "select",
			select: [
				{text:"通知する", value: true},
				{text:"通知しない", value: false}
			],
			class: "select select_boolean",
			enabled_if: function(){ return $("#notify_enabled").val()=="true" && $("#twitter_enabled").val()=="true" },
		},{
			id: "twitter_view_min",
			legend: "少なくとも表示するツイートの個数",
			type: "number",
			min: 1,
			max: 100,
			size: 3,
			postfix: "ツイート",
			class: "input_number",
			enabled_if: function(){ return $("#twitter_enabled").val()=="true" },
		},{
			id: "twitter_view_duration",
			legend: "これより古いツイートは表示しない",
			type: "number",
			min: 1,
			max: 720,
			size: 3,
			postfix: "時間",
			class: "input_hours",
			enabled_if: function(){ return $("#twitter_enabled").val()=="true" },
		},
	],
};

var option_graph = {
	title: "電力使用状況のグラフ表示に関する設定",
	options: [
		{
			id: "graph_enabled",
			legend: "電力使用状況のグラフ表示",
			type: "select",
			select: [
				{text:"表示する", value: true},
				{text:"表示しない", value: false}
			],
			class: "select select_boolean",
		},{
			id: "graph_fx_off",
			legend: "グラフ切り替え時のアニメーション効果",
			type: "select",
			select: [
				{text:"効果あり", value: false},
				{text:"効果なし", value: true}
			],
			class: "select select_boolean",
			enabled_if: function(){ return $("#graph_enabled").val()=="true" },
		},
	],
};

var option_mukku = {
	title: "計画停電情報APIに関する設定",
	title: "<a href=\"http://mukku.org/v2.00/\" target=\"_blank\">計画停電情報API</a> による情報取得に関する設定",
	options: [
		{
			id: "mukku_enabled",
			legend: "計画停電情報APIによる情報の取得",
			type: "select",
			select: [
				{text:"取得する", value: true},
				{text:"取得しない", value: false}
			],
			class: "select select_boolean",
		},{
			id: "mukku_update_interval",
			legend: "計画停電情報を取得する間隔",
			type: "number",
			min: 1,
			max: 24,
			size: 3,
			postfix: "時間",
			class: "input_hours",
			enabled_if: function(){ return $("#mukku_enabled").val()=="true" },
		},{
			id: "mukku_group",
			legend: "計画停電のグループ番号（<a href='http://www.tepco.co.jp/KT/' target='_blank'>東京電力HPで調べる</a>）",
			type: "select",
			select: [
				{text:"（未設定）", value: ""},
				{
					optgroup: "1グループ",
					select: [
						{text:"1-A", value: "1-A"},
						{text:"1-B", value: "1-B"},
						{text:"1-C", value: "1-C"},
						{text:"1-D", value: "1-D"},
						{text:"1-E", value: "1-E"},
					]
				},
				{
					optgroup: "2グループ",
					select: [
						{text:"2-A", value: "2-A"},
						{text:"2-B", value: "2-B"},
						{text:"2-C", value: "2-C"},
						{text:"2-D", value: "2-D"},
						{text:"2-E", value: "2-E"},
					]
				},
				{
					optgroup: "3グループ",
					select: [
						{text:"3-A", value: "3-A"},
						{text:"3-B", value: "3-B"},
						{text:"3-C", value: "3-C"},
						{text:"3-D", value: "3-D"},
						{text:"3-E", value: "3-E"},
					]
				},
				{
					optgroup: "4グループ",
					select: [
						{text:"4-A", value: "4-A"},
						{text:"4-B", value: "4-B"},
						{text:"4-C", value: "4-C"},
						{text:"4-D", value: "4-D"},
						{text:"4-E", value: "4-E"},
					]
				},
				{
					optgroup: "5グループ",
					select: [
						{text:"5-A", value: "5-A"},
						{text:"5-B", value: "5-B"},
						{text:"5-C", value: "5-C"},
						{text:"5-D", value: "5-D"},
						{text:"5-E", value: "5-E"},
					]
				},
			],
			class: "select",
			enabled_if: function(){ return $("#mukku_enabled").val()=="true" },
		},
	],
};

var option_list = [
	option_notify,
	option_usage,
	option_forecast,
	option_twitter,
	option_graph,
	option_mukku,
];

function create_option_table(opt) {
	var templete_tbody = $("#templete_tbody");
	var option_tbody = $(".option_tbody");

	var tr = $(".title_tr", templete_tbody).clone(true);
	$(".option_title", tr).append(opt.title);
	option_tbody.append(tr);

	for (var i=0 ; i<opt.options.length ; i++) {
		var o = opt.options[i];
		var tr = $(".option_tr", templete_tbody).clone(true);
		$(".option_desc", tr).append(o.legend);
		var input;
		switch (o.type) {
		case "number":
		case "text":
			input = $(document.createElement('input'));
			input.attr("type", o.type).attr("id", o.id);
			if (o.size) {
				input.attr("size", o.size);
			}
			if (o.maxlength) {
				input.attr("maxlength", o.size);
			}
			if (o.type == "number") {
				if ("min" in o) {
					input.attr("min", o.min);
				}
				if ("max" in o) {
					input.attr("max", o.max);
				}
			}
			break;
		case "select":
			input = $(document.createElement('select'));
			input.attr("id", o.id);
			for (var j=0 ; j<o.select.length ; j++) {
				if (o.select[j].optgroup) {
					var optgroup = $(document.createElement('optgroup'));
					var select = o.select[j].select;
					optgroup.attr('label', o.select[j].optgroup);
					for (var k=0 ; k<select.length ; k++) {
						var option = $(document.createElement('option'));
						option.val(select[k].value).text(select[k].text);
						optgroup.append(option);
					}
					input.append(optgroup);
				} else {
					var option = $(document.createElement('option'));
					option.val(o.select[j].value).text(o.select[j].text);
					input.append(option);
				}
			}
			break;
		}
		if (input) {
			if (o.class) {
				input.addClass(o.class);
			}
			if (o.css) {
				input.css(o.css);
			}
			$(".option_input", tr).append(input);
			inputs[o.id] = input;
		}
		if (o.prefix) {
			$(".option_prefix", tr).append(o.prefix);
		}
		if (o.postfix) {
			$(".option_postfix", tr).append(o.postfix);
		}
		if ("min" in o || "max" in o) {
			var range = "（";
			if ("min" in o) {
				range += o.min;
			}
			range += "～";
			if ("max" in o) {
				range += o.max;
			}
			range += "）";
			$(".option_range", tr).text(range);
		}
		option_tbody.append(tr);
	}
}

function check_option_enabled(opt) {
	for (var i=0 ; i<opt.options.length ; i++) {
		var o = opt.options[i];
		var input = $("#" + o.id);
		if (!input) {
			continue;
		}
		if (o.type == "number") {
			var value = parseInt(input.val());
			// console.log(value);
			if (isNaN(value)) {
				value = config.__defmap[o.id];
				if (input.hasClass('input_seconds')) {
					value /= 1000;
				} else if (input.hasClass('input_minutes')) {
					value /= 60 * 1000;
				} else if (input.hasClass('input_hours')) {
					value /= 60 * 60 * 1000;
				}
				// console.log(o.id + "(def)=" + value);
			}
			if ('min' in o && value < o.min) {
				value = o.min;
			}
			if ('max' in o && value > o.max) {
				value = o.max;
			}
			input.val(value);
		}
		if (o.enabled_if) {
			var enabled = o.enabled_if();
			input.prop("disabled", !enabled);
		}
	}
}

function create_option() {
	for (var i=0 ; i<option_list.length ; i++) {
		create_option_table(option_list[i]);
	}
}

function check_option() {
	for (var i=0 ; i<option_list.length ; i++) {
		check_option_enabled(option_list[i]);
	}
}

function onchange() {
	// console.log("========== onchange ==========");
	var input = $(this);
	var id = input.attr('id');
	var value = input.val();
	// console.log(id + "=" + value);
	input.addClass('changed');
	if (id == 'twitter_username') {
		value = value.replace(/[^\w\-\/]/g,'');
		value = value.replace(/\/$/,'');
		input.val(value);
	}
	check_option();
}

function check_twitter() {
	var value = $('#twitter_username').val();
	var url = 'https://twitter.com/';
	if (value.match(/(.+)\/(.+)/)) {
		url += '#!/list/' + value;
	} else {
		url += '#!/' + value;
	}
	window.open(url, 'check_twitter', 'width=1024, height=768');
}

function load_option() {
	// console.log("========== load_option ==========");
	config.load();
	setup_option();
}

function reset_option() {
	// console.log("========== reset_option ==========");
	config.resetToDefault();
	setup_option();
}

function setup_option() {
	// console.log("========== setup_option ==========");
	for (var id in inputs) {
		var input = inputs[id];
		var value = config[id];
		// console.log(id + "=" + value);
		if (input.hasClass('input_seconds')) {
			value /= 1000;
		} else if (input.hasClass('input_minutes')) {
			value /= 60 * 1000;
		} else if (input.hasClass('input_hours')) {
			value /= 60 * 60 * 1000;
		}
		input.val(value.toString());
		input.removeClass('changed');
	}
	check_option();
}

function save_option() {
	// console.log("========== save_option ==========");
	for (var id in inputs) {
		var input = inputs[id];
		var value = input.val();
		if (input.hasClass('input_seconds')) {
			value *= 1000;
		} else if (input.hasClass('input_minutes')) {
			value *= 60 * 1000;
		} else if (input.hasClass('input_hours')) {
			value *= 60 * 60 * 1000;
		} else if (input.hasClass('input_number')) {
			value = parseInt(value);
		} else if (input.hasClass('select_boolean')) {
			value = value != 'false';
		}
		// console.log(id + "=" + value);
		input.removeClass('changed');
		config[id] = value;
	}
	config.save();
	var options_port = chrome.extension.connect({name: 'options'});
	options_port.postMessage({action: "reqConfigReload"});
	options_port.disconnect();
}

var config = new TepcoWatcherConfig;
var inputs = {};

$(document).ready(function(){
	create_option();
	load_option();
	$('#load').click(load_option);
	$('#save').click(save_option);
	$('#reset').click(reset_option);
	$('input').change(onchange);
	$('select').change(onchange);
	$('#check_twitter').click(check_twitter);
});
})();
