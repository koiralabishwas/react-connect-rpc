# 🚀 Go + React Connect RPC Boilerplate

このプロジェクトは、バックエンドに **Go**、フロントエンドに **React (Next.js / Vite)** を採用し、両者を **Connect RPC** で繋ぐフルスタックアプリケーションのボイラープレート（ひな形）です。

## 💡 Connect RPC とは？

Connect RPC は、HTTP/1.1 および HTTP/2 上で動作する、シンプルで強力な RPC（Remote Procedure Call）フレームワークです。gRPC の強力な型安全性を持ちながら、gRPC-Web のような複雑なプロキシ（Envoyなど）を必要とせず、ブラウザから直接 Go サーバーと通信できるのが最大の特徴です。

### 🆚 REST API との比較（なぜ Connect RPC を使うのか？）

従来の REST API 開発では、「API定義書（Swagger等）のメンテナンス」「フロント/バックでの型のズレによるバグ」「JSONのパース処理」など、多くのオーバーヘッドが発生していました。

| 特徴 | REST API | Connect RPC |
| :--- | :--- | :--- |
| **スキーマ駆動** | OpenAPI 等を手動管理（ズレやすい） | `.proto` ファイルが唯一の絶対的な仕様書 |
| **型安全性** | なし（TypeScriptの型は手書きか別ツールで生成） | **完全な型安全。** バックエンドの変更が即座にフロントのエラーとして検知される |
| **リクエスト手法** | `fetch` や `axios` で URL と HTTP メソッドを指定 | フロント側では**ローカル関数を呼ぶように** `client.purchase(req)` とするだけ |
| **通信量・速度** | JSON (比較的サイズが大きい) | JSON または Protobuf (バイナリ通信による高速化が可能) |
| **開発体験 (DX)** | エンドポイントやパラメータ名を手動で確認 | IDE（VSCode等）の強力なオートコンプリートが効く |

---

## 📂 ディレクトリ構成

```text
.
├── proto/             # Protocol Buffers (スキーマ定義の単一情報源)
│   └── greet/v1/
│       └── greet.proto
├── frontend/          # React / Next.js アプリケーション (TypeScript)
│   ├── src/
│   │   ├── gen/       # 自動生成された TS クライアントコード (編集不可)
│   │   └── App.tsx    # フロントエンドの実装
│   └── package.json
├── gen/               # 自動生成された Go サーバーコード (編集不可)
├── main.go            # Go バックエンドのエントリーポイントとロジック実装
├── buf.yaml           # Buf (コード生成ツール) のモジュール設定
└── buf.gen.yaml       # コード生成プラグインの設定
```

## 🏗️ アーキテクチャの仕組み
## 3つの要素で構成
### 1.The Blueprint (proto/)
通信の設計図となる .proto ファイルです。ここで「どのような関数があるか」「どんなデータ（型）を受け取り、何を返すか」を定義します。
この設計図を元に、Buf が Go と TypeScript 用のコードを自動生成します。
```proto
// 例: 商品購入用の設計図 (proto/greet/v1/greet.proto)
message PurchaseRequest {
  string product = 1;
  int32 quantity = 2;
  int32 price = 3;
}

message PurchaseResponse {
  string receipt_id = 1;
  int32 total_price = 2;
}

service PurchaseService {
  rpc Purchase(PurchaseRequest) returns (PurchaseResponse);
}
```
### 2.The Backedn
自動生成された Go のインターフェースを満たすように、ビジネスロジックだけを実装します。HTTP ルーティングや JSON パースの記述は不要です。
```go
// main.go
func (s *PurchaseServer) Purchase(
    ctx context.Context,
    req *connect.Request[greetv1.PurchaseRequest],
) (*connect.Response[greetv1.PurchaseResponse], error) {
    
    // 複雑なパース処理なしに、型安全なリクエストを直接受け取る
    total := req.Msg.Quantity * req.Msg.Price
    
    return connect.NewResponse(&greetv1.PurchaseResponse{
        ReceiptId:  "REC-12345",
        TotalPrice: total,
    }), nil
}
```

### 3.The Frontend
```typescript
// App.tsx
// URLやHTTPメソッドの指定なしに、関数としてバックエンドを呼び出せる！
const res = await client.purchase({
  product: "Apple",
  quantity: 3,
  price: 100
});

console.log(res.receiptId);  // IDEの補完が効く
console.log(res.totalPrice);
```

## 開発の進め方
新しい機能（エンドポイント）を追加したい場合は、常に以下の 4 ステップで行います。

1. Schema: proto/**/*.proto にリクエストとレスポンスのメッセージ、および Service を定義する。

2. Generate: プロジェクトルートで buf generate コマンドを実行し、Go/TS のコードを自動生成・同期する。

3. Backend: main.go などのバックエンド側で、自動生成されたインターフェースに従ってロジックを追加する。

4. Frontend: React 側で client.新しい関数名(params) を呼び出し、UIを構築する。
