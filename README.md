# Go + React Connect RPC & REST API Boilerplate

## 🏗️ ディレクトリ構成
- `proto/`: Protocol Buffers スキーマ定義
- `backend/`: Go バックエンド (Connect RPC & REST API)
- `frontend/`: React (TypeScript + Vite) フロントエンド

---

## 🚀 起動方法

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
