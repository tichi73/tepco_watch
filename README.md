#東京電力 Watch

現在の電力使用状況と今後の予測使用量や計画停電の予定を表示します。データ取得には「東京電力電力供給状況API」「Yahoo! 電気予報API」「計画停電情報API」「OfficialTEPCOなどのツイート」を、グラフ表示には jqPlot を利用しています。

東京電力管内の現在・過去の電力使用状況、
および今後予測される電力使用量を見やすくグラフ表示します。

電力使用状況のデータ取得には [東京電力電力供給状況API](http://tepco-usage-api.appspot.com/) を利用しています。
昨日以前のデータを取得してグラフ表示することもできます。

今後の使用量予報の取得には [Yahoo! 電気予報API](http://developer.yahoo.co.jp/webapi/shinsai/v1/setsuden/electricpowerforecast.html) を利用しています。

計画停電情報の取得には [計画停電情報API](http://mukku.org/v2.00/) を利用しています。

また @OfficialTEPCO と @Yahoo_DenkiYoho のツイートを取得して、
最新の停電情報や節電情報を表示します。
ツイートを取得するリストを自由に変更することもできます。

電力使用量やツイートの情報が更新されたときは、デスクトップ通知でお知らせします。

グラフ表示には [jqPlot](http://www.jqplot.com/) 1.0.4 を利用しています。

Windows 7, MAC OS X で動作確認しています。
不具合報告などは [@tichi73](http://twitter.com/tichi73) までお願いします。