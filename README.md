# README

## このリポジトリについて

JS による物理シミュレーションの探求

## 開発

Node.js と Cmake をインストールしてください
make spring で、js ファイルがビルドされます
spring.html を開いてください

make cloth, make sdf, make multigrid 　も同様です

## 1 バネのシミュレーション

[spring-video.mp4](./videos/spring-video.mp4)

x(t_next) = argmin(x(t_now)のエネルギーの総和) で各フレームにおける、バネの端点の場所を計算して、画面に描画しています。
具体的には、 argmin は、　エネルギーの総和のヘッシアンが正定になるように変換して、その逆行列に、エネルギーの勾配をかけた値です。
