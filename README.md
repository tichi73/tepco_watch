#東京電力 Watch

東京電力管内の電力状況に関する以下の情報をポップアップ表示する Google Chrome 用のブラウザ拡張です。

- 現在および過去の電力使用量
- 今後予測される電力使用量
- 指定したグループの計画停電の実施状況および予定
- 最新の停電情報や節電情報に関する Twitter 上のツイート

電力使用状況のデータ取得には [東京電力電力供給状況API](http://tepco-usage-api.appspot.com/) を利用しています。
昨日以前のデータを取得してグラフ表示することもできます。

今後の電力使用量予報の取得には [Yahoo! 電気予報API](http://developer.yahoo.co.jp/webapi/shinsai/v1/setsuden/electricpowerforecast.html) を利用しています。

計画停電情報の取得には [計画停電情報API](http://mukku.org/v2.00/) を利用しています。

また [@OfficialTEPCO](https://twitter.com/OfficialTEPCO) と [@Yahoo_DenkiYoho](https://twitter.com/Yahoo_DenkiYoho) のツイートを取得して、最新の停電情報や節電情報を表示します。
ツイートを取得するリストを自由に変更することもできます。

電力使用量やツイートの情報が更新されたときは、デスクトップ通知でお知らせします。
電力使用量が一定値以上のときにデスクトップ通知するなどの設定ができます。

グラフ表示には [jqPlot](http://www.jqplot.com/) 1.0.4 を利用しています。

Windows 7, Mac OS X で動作確認しています。
不具合報告などは [@tichi73](http://twitter.com/tichi73) までお願いします。