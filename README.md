# Go + React Connect RPC & REST API Boilerplate

## 🏗️ ディレクトリ構成
- `proto/`: Protocol Buffers スキーマ定義
- `backend/`: Go バックエンド (Connect RPC & REST API)
- `frontend/`: React (TypeScript + Vite) フロントエンド

---

## 🛠️ 環境構築手順 (Ubuntu / Linux)

本プロジェクトの開発には **Go**, **Node.js (npm)**, **Buf CLI** が必要です。

### 1. 必要なツールのインストール

#### ① 共通パッケージの更新
```bash
sudo apt update && sudo apt install -y curl git build-essential
```

#### ② Go のインストール
```bash
# Goのインストール (aptまたは公式推奨の手順)
sudo apt install -y golang-go

# バージョン確認 (Go 1.22以上推奨)
go version
```
*(※最新版のGoをインストールしたい場合は、[公式サイト](https://go.dev/dl/)のバイナリを `/usr/local` に展開するか snap: `sudo snap install --classic go` を使用してください)*

#### ③ Node.js & npm のインストール
```bash
# NodeSource から最新の LTS (Node.js 20.x 等) をインストールする場合
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# バージョン確認
node -v
npm -v
```

#### ④ Buf CLI のインストール (Protobuf コード生成ツール)
以下のいずれかの方法でインストールします。

**方法 A: バイナリを直接配置 (推奨)**
```bash
# /usr/local/bin に最新の buf バイナリをダウンロード
sudo curl -sSL "https://github.com/bufbuild/buf/releases/latest/download/buf-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/buf && sudo chmod +x /usr/local/bin/buf

# バージョン確認
buf --version
```

**方法 B: npm 経由でグローバルインストール**
```bash
npm install -g @bufbuild/buf
```

---

## 🚀 起動・開発手順

### 1. Protobuf コード生成 (スキーマ変更時)
プロジェクトルートで以下を実行します。
```bash
buf generate
```

### 2. Backend Server (Go)
```bash
cd backend

# パッケージの整理とダウンロード
go mod tidy

# サーバーの起動 (http://localhost:8080)
go run main.go
```

### 3. Frontend Server (React)
```bash
cd frontend

# パッケージのインストール
npm install

# 開発サーバーの起動 (http://localhost:5173)
npm run dev
```
