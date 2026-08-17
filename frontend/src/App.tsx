import { useState, useEffect, useRef } from 'react'
import { createClient, ConnectError } from '@connectrpc/connect'
import { createConnectTransport } from '@connectrpc/connect-web'

import {
  GreetService,
  PurchaseService,
  StreamingService,
  type ProductItem,
  type PurchaseResponse,
  type GetOrderStatusResponse,
  type StreamProgressResponse,
} from './gen/greet/v1/greet_pb'

// Connect Web Transport connecting to Go Backend (HTTP/1.1 or HTTP/2)
const transport = createConnectTransport({
  baseUrl: 'http://localhost:8080',
})

const greetClient = createClient(GreetService, transport)
const purchaseClient = createClient(PurchaseService, transport)
const streamingClient = createClient(StreamingService, transport)

function App() {
  // --- 1. Greet State ---
  const [name, setName] = useState('Gopher & React Developer')
  const [greetingMessage, setGreetingMessage] = useState('')
  const [greetError, setGreetError] = useState<string | null>(null)
  const [isGreetingLoading, setIsGreetingLoading] = useState(false)

  // --- 2. Purchase & Inventory State ---
  const [products, setProducts] = useState<ProductItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('prod-apple')
  const [quantity, setQuantity] = useState<number>(1)
  const [receipt, setReceipt] = useState<PurchaseResponse | null>(null)
  const [orderStatus, setOrderStatus] = useState<GetOrderStatusResponse | null>(null)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const [isPurchaseLoading, setIsPurchaseLoading] = useState(false)

  // --- 3. Streaming State ---
  const [taskName, setTaskName] = useState('Data Migration & Sync')
  const [totalSteps, setTotalSteps] = useState(6)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamProgress, setStreamProgress] = useState<number>(0)
  const [streamLogs, setStreamLogs] = useState<StreamProgressResponse[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)

  // Fetch initial product catalog
  const fetchProducts = async () => {
    try {
      const res = await purchaseClient.listProducts({})
      setProducts(res.products)
      if (res.products.length > 0 && !selectedProductId) {
        setSelectedProductId(res.products[0].id)
      }
    } catch (err) {
      console.error('Failed to load products:', err)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  // 1. Handle Greet RPC
  const handleGreet = async () => {
    setIsGreetingLoading(true)
    setGreetError(null)
    setGreetingMessage('')
    try {
      const res = await greetClient.greet({ name })
      setGreetingMessage(res.greeting)
    } catch (err) {
      if (err instanceof ConnectError) {
        setGreetError(`[${err.code}]: ${err.rawMessage}`)
      } else {
        setGreetError(String(err))
      }
    } finally {
      setIsGreetingLoading(false)
    }
  }

  // 2. Handle Purchase RPC
  const handlePurchase = async () => {
    setIsPurchaseLoading(true)
    setPurchaseError(null)
    setReceipt(null)
    setOrderStatus(null)
    try {
      const res = await purchaseClient.purchase({
        productId: selectedProductId,
        quantity: Number(quantity),
      })
      setReceipt(res)
      // Refresh products to show updated stock
      await fetchProducts()
    } catch (err) {
      if (err instanceof ConnectError) {
        setPurchaseError(`[${err.code}]: ${err.rawMessage}`)
      } else {
        setPurchaseError(String(err))
      }
    } finally {
      setIsPurchaseLoading(false)
    }
  }

  // Check Order Status RPC
  const handleCheckStatus = async (receiptId: string) => {
    try {
      const res = await purchaseClient.getOrderStatus({ receiptId })
      setOrderStatus(res)
    } catch (err) {
      alert(`Error checking status: ${err}`)
    }
  }

  // 3. Handle Server Streaming RPC
  const handleStartStream = async () => {
    setIsStreaming(true)
    setStreamProgress(0)
    setStreamLogs([])

    const ac = new AbortController()
    abortControllerRef.current = ac

    try {
      const stream = streamingClient.streamProgress(
        {
          taskName: taskName || 'Background Job',
          totalSteps: Number(totalSteps),
        },
        { signal: ac.signal }
      )

      for await (const chunk of stream) {
        setStreamProgress(chunk.percentage)
        setStreamLogs((prev) => [...prev, chunk])
      }
    } catch (err) {
      if (err instanceof ConnectError && err.code === 1 /* Canceled */) {
        console.log('Stream cancelled by user.')
      } else {
        console.error('Streaming error:', err)
      }
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }

  const handleCancelStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsStreaming(false)
    }
  }

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', padding: '2rem 1.5rem', textAlign: 'left' }}>
      <header style={{ marginBottom: '2rem', borderBottom: '2px solid #e5e7eb', paddingBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '2.5rem' }}>⚡</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', color: '#111827' }}>ConnectRPC + Go + React</h1>
            <p style={{ margin: '4px 0 0', color: '#4b5563', fontSize: '15px' }}>
              gRPCの型安全性 × RESTの手軽さ × Server Streaming を体感できるデモ
            </p>
          </div>
        </div>
      </header>

      {/* Feature 1: Greet Service */}
      <section
        style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', margin: 0, color: '#1f2937' }}>
            1. Unary RPC & エラーハンドリング (GreetService)
          </h2>
          <span style={{ fontSize: '12px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
            Unary Call
          </span>
        </div>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: '6px 0 16px' }}>
          空文字を入力して送信すると、バックエンドから返された <code>CodeInvalidArgument</code> を型安全にキャッチします。
        </p>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="お名前を入力（空にして送信するとエラー実演）"
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
          <button
            onClick={handleGreet}
            disabled={isGreetingLoading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: isGreetingLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {isGreetingLoading ? '送信中...' : 'Greet 実行'}
          </button>
        </div>

        {greetingMessage && (
          <div style={{ marginTop: '12px', padding: '12px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', color: '#065f46' }}>
            <strong>🎉 サーバーからの応答:</strong> {greetingMessage}
          </div>
        )}

        {greetError && (
          <div style={{ marginTop: '12px', padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b' }}>
            <strong>⚠️ エラー検知 (ConnectError):</strong> {greetError}
          </div>
        )}
      </section>

      {/* Feature 2: Purchase & Inventory Service */}
      <section
        style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', margin: 0, color: '#1f2937' }}>
            2. データ取得 & 在庫管理 (PurchaseService)
          </h2>
          <span style={{ fontSize: '12px', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
            CRUD & State
          </span>
        </div>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: '6px 0 16px' }}>
          Proto定義に基づいて在庫チェック、注文処理、伝票ステータス照会を型安全に実行します。
        </p>

        {/* Product Catalog */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>商品カタログ (サーバー在庫):</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
            {products.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedProductId(p.id)}
                style={{
                  padding: '10px',
                  border: selectedProductId === p.id ? '2px solid #2563eb' : '1px solid #e5e7eb',
                  background: selectedProductId === p.id ? '#eff6ff' : '#f9fafb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>{p.name}</div>
                <div style={{ fontSize: '13px', color: '#4b5563' }}>¥{p.price.toLocaleString()}</div>
                <div style={{ fontSize: '12px', color: p.stock > 0 ? '#059669' : '#dc2626' }}>
                  在庫: {p.stock} 点
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Purchase Form */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            購入数量:
            <input
              type="number"
              value={quantity}
              min="1"
              max="50"
              onChange={(e) => setQuantity(Number(e.target.value))}
              style={{ width: '80px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
            />
          </label>

          <button
            onClick={handlePurchase}
            disabled={isPurchaseLoading}
            style={{
              padding: '8px 18px',
              backgroundColor: '#059669',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: isPurchaseLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {isPurchaseLoading ? '処理中...' : '注文を確定する'}
          </button>
        </div>

        {purchaseError && (
          <div style={{ marginTop: '12px', padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b' }}>
            <strong>⚠️ 注文エラー:</strong> {purchaseError}
          </div>
        )}

        {receipt && (
          <div style={{ marginTop: '16px', padding: '14px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: '#0f172a' }}>📄 領収書: {receipt.receiptId}</strong>
              <button
                onClick={() => handleCheckStatus(receipt.receiptId)}
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                配送ステータス確認
              </button>
            </div>
            <div style={{ fontSize: '13px', color: '#334155', marginTop: '6px' }}>
              <div>商品名: <strong>{receipt.productName}</strong> × {receipt.quantity} 点</div>
              <div>単価: ¥{receipt.unitPrice.toLocaleString()} | 合計: <strong>¥{receipt.totalPrice.toLocaleString()}</strong></div>
              <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>注文日時: {receipt.createdAt}</div>
            </div>
          </div>
        )}

        {orderStatus && (
          <div style={{ marginTop: '10px', padding: '12px', background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '6px', color: '#0369a1', fontSize: '13px' }}>
            <div><strong>🚚 追跡番号:</strong> {orderStatus.trackingNumber}</div>
            <div><strong>ステータス:</strong> {orderStatus.status}</div>
            <div><strong>お届け予定日:</strong> {orderStatus.estimatedDelivery}</div>
          </div>
        )}
      </section>

      {/* Feature 3: Server Streaming Service */}
      <section
        style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', margin: 0, color: '#1f2937' }}>
            3. Server Streaming リアルタイム通信 (StreamingService)
          </h2>
          <span style={{ fontSize: '12px', background: '#f3e8ff', color: '#7e22ce', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
            Streaming RPC
          </span>
        </div>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: '6px 0 16px' }}>
          Envoy プロキシや WebSocket サーバーは一切不要！ 標準 HTTP で Go から React へリアルタイムにデータを連続ストリーミングします。
        </p>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="タスク名"
            disabled={isStreaming}
            style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', flex: 1 }}
          />

          <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ステップ数:
            <input
              type="number"
              value={totalSteps}
              min="2"
              max="15"
              disabled={isStreaming}
              onChange={(e) => setTotalSteps(Number(e.target.value))}
              style={{ width: '60px', padding: '6px', border: '1px solid #d1d5db', borderRadius: '6px' }}
            />
          </label>

          {!isStreaming ? (
            <button
              onClick={handleStartStream}
              style={{
                padding: '8px 18px',
                backgroundColor: '#7c3aed',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ストリーム開始 ▶
            </button>
          ) : (
            <button
              onClick={handleCancelStream}
              style={{
                padding: '8px 18px',
                backgroundColor: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              中断 ⏹
            </button>
          )}
        </div>

        {/* Progress Bar */}
        {(isStreaming || streamLogs.length > 0) && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: '#4b5563' }}>
              <span>進捗率: {streamProgress}%</span>
              <span>{isStreaming ? '⚡ リアルタイム受信中...' : '完了 / 待機中'}</span>
            </div>
            <div style={{ width: '100%', height: '10px', background: '#e5e7eb', borderRadius: '5px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${streamProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #7c3aed, #2563eb)',
                  transition: 'width 0.3s ease-in-out',
                }}
              />
            </div>
          </div>
        )}

        {/* Live Logs */}
        {streamLogs.length > 0 && (
          <div
            style={{
              background: '#0f172a',
              color: '#38bdf8',
              fontFamily: 'monospace',
              fontSize: '12px',
              padding: '12px',
              borderRadius: '8px',
              maxHeight: '160px',
              overflowY: 'auto',
            }}
          >
            {streamLogs.map((log, idx) => (
              <div key={idx} style={{ marginBottom: '4px' }}>
                <span style={{ color: '#94a3b8' }}>[{log.timestamp}]</span>{' '}
                <span style={{ color: '#a78bfa' }}>({log.percentage}%)</span> {log.message}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default App
