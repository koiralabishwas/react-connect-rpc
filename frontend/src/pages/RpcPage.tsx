import { useState } from 'react'
import { createClient } from '@connectrpc/connect'
import { createConnectTransport } from '@connectrpc/connect-web'

import { GreetService, PurchaseService, OrderEstimateService } from '../gen/greet/v1/greet_pb'
import type { OrderEstimateResponse } from '../gen/greet/v1/greet_pb'

const transport = createConnectTransport({
  baseUrl: 'http://localhost:8080',
})

const greetClient = createClient(GreetService, transport)
const purchaseClient = createClient(PurchaseService, transport)
const estimateClient = createClient(OrderEstimateService, transport)

export function RpcPage() {
  // 1. Greet
  const [name, setName] = useState('')
  const [greetingMessage, setGreetingMessage] = useState('')

  // 2. Purchase
  const [product, setProduct] = useState('りんご')
  const [quantity, setQuantity] = useState(3)
  const [price, setPrice] = useState(100)
  const [receipt, setReceipt] = useState<any>(null)

  // 3. Order Estimate
  const [customerName, setCustomerName] = useState('田中太郎')
  const [couponCode, setCouponCode] = useState('SAVE10')
  const [isMember, setIsMember] = useState(true)
  const [item1Name, setItem1Name] = useState('ノートPC')
  const [item1Price, setItem1Price] = useState(120000)
  const [item1Qty, setItem1Qty] = useState(1)
  const [item2Name, setItem2Name] = useState('ワイヤレスマウス')
  const [item2Price, setItem2Price] = useState(3000)
  const [item2Qty, setItem2Qty] = useState(2)
  const [estimate, setEstimate] = useState<OrderEstimateResponse | null>(null)

  const handleGreet = async () => {
    try {
      const res = await greetClient.greet({ name: name })
      setGreetingMessage(res.greeting)
    } catch (err) {
      console.error("Greet RPC failed:", err)
    }
  }

  const handlePurchase = async () => {
    try {
      const res = await purchaseClient.purchase({
        product: product,
        quantity: Number(quantity),
        price: Number(price)
      })
      setReceipt(res)
    } catch (err) {
      console.error("Purchase RPC failed:", err)
    }
  }

  const handleEstimate = async () => {
    try {
      const res = await estimateClient.estimate({
        customerName: customerName,
        couponCode: couponCode,
        isMember: isMember,
        items: [
          { itemName: item1Name, unitPrice: Number(item1Price), quantity: Number(item1Qty) },
          { itemName: item2Name, unitPrice: Number(item2Price), quantity: Number(item2Qty) },
        ],
      })
      setEstimate(res)
    } catch (err) {
      console.error("Estimate RPC failed:", err)
    }
  }

  return (
    <div style={{ boxSizing: "border-box", width: "100%" }}>
      <h1>Connect RPC 版 (/rpc)</h1>
      
      {/* 1. Greet サービス */}
      <div style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "8px", marginBottom: "2rem", boxSizing: "border-box" }}>
        <h2>1. 挨拶サービス (Greet Service)</h2>
        <div style={{ display: "flex", gap: "8px", width: "100%" }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="お名前を入力してください..."
            style={{ padding: "8px", flex: 1, minWidth: 0, boxSizing: "border-box" }}
          />
          <button onClick={handleGreet} style={{ padding: "8px 16px", flexShrink: 0 }}>
            挨拶を送信
          </button>
        </div>

        {greetingMessage && (
          <div style={{ marginTop: "1rem", padding: "1rem", background: "#e8f5e9", borderRadius: "4px", color: "#2e7d32" }}>
            <strong>サーバーからの返答: </strong> {greetingMessage}
          </div>
        )}
      </div>

      {/* 2. Purchase サービス */}
      <div style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "8px", marginBottom: "2rem", boxSizing: "border-box" }}>
        <h2>2. 商品購入サービス (Purchase Service)</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
          
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>商品名:</span>
            <input
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              style={{ width: "60%", padding: "4px", boxSizing: "border-box" }}
            />
          </label>

          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>数量:</span>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              style={{ width: "60%", padding: "4px", boxSizing: "border-box" }}
            />
          </label>

          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>単価 (¥):</span>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              style={{ width: "60%", padding: "4px", boxSizing: "border-box" }}
            />
          </label>

          <button onClick={handlePurchase} style={{ padding: "8px 16px", marginTop: "10px", alignSelf: "flex-start" }}>
            購入リクエストを送信
          </button>
        </div>

        {receipt && (
          <div style={{ marginTop: "1rem", padding: "1rem", background: "#f0f0f0", borderRadius: "4px", color: "#333" }}>
            <h3 style={{ marginTop: 0 }}>領収書番号: {receipt.receiptId}</h3>
            <p style={{ margin: "4px 0" }}><strong>品名:</strong> {receipt.product}</p>
            <p style={{ margin: "4px 0" }}><strong>数量:</strong> {receipt.quantity}</p>
            <p style={{ margin: "4px 0" }}><strong>合計金額:</strong> ¥{receipt.totalPrice.toLocaleString()}</p>
          </div>
        )}
      </div>

      {/* 3. 注文見積もり計算サービス */}
      <div style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "8px", boxSizing: "border-box" }}>
        <h2>3. 注文見積もり計算サービス</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
          
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>顧客名:</span>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={{ width: "60%", padding: "4px", boxSizing: "border-box" }}
            />
          </label>

          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>商品 1:</span>
            <div style={{ width: "60%", display: "flex", gap: "4px", boxSizing: "border-box" }}>
              <input
                value={item1Name}
                onChange={(e) => setItem1Name(e.target.value)}
                placeholder="品名"
                style={{ flex: 2, minWidth: 0, padding: "4px", boxSizing: "border-box" }}
              />
              <input
                type="number"
                value={item1Price}
                onChange={(e) => setItem1Price(Number(e.target.value))}
                placeholder="単価"
                style={{ flex: 1, minWidth: 0, padding: "4px", boxSizing: "border-box" }}
              />
              <input
                type="number"
                value={item1Qty}
                onChange={(e) => setItem1Qty(Number(e.target.value))}
                placeholder="数量"
                style={{ width: "48px", flexShrink: 0, padding: "4px", boxSizing: "border-box" }}
              />
            </div>
          </label>

          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>商品 2:</span>
            <div style={{ width: "60%", display: "flex", gap: "4px", boxSizing: "border-box" }}>
              <input
                value={item2Name}
                onChange={(e) => setItem2Name(e.target.value)}
                placeholder="品名"
                style={{ flex: 2, minWidth: 0, padding: "4px", boxSizing: "border-box" }}
              />
              <input
                type="number"
                value={item2Price}
                onChange={(e) => setItem2Price(Number(e.target.value))}
                placeholder="単価"
                style={{ flex: 1, minWidth: 0, padding: "4px", boxSizing: "border-box" }}
              />
              <input
                type="number"
                value={item2Qty}
                onChange={(e) => setItem2Qty(Number(e.target.value))}
                placeholder="数量"
                style={{ width: "48px", flexShrink: 0, padding: "4px", boxSizing: "border-box" }}
              />
            </div>
          </label>

          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>クーポンコード:</span>
            <select
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              style={{ width: "60%", padding: "4px", boxSizing: "border-box" }}
            >
              <option value="">なし</option>
              <option value="SAVE10">SAVE10 (10% 割引)</option>
              <option value="SPECIAL500">SPECIAL500 (¥500 割引)</option>
            </select>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              checked={isMember}
              onChange={(e) => setIsMember(e.target.checked)}
            />
            <span>会員ステータス (会員限定 5% 割引)</span>
          </label>

          <button onClick={handleEstimate} style={{ padding: "8px 16px", marginTop: "10px", alignSelf: "flex-start" }}>
            見積もりを計算
          </button>
        </div>

        {estimate && (
          <div style={{ marginTop: "1rem", padding: "1rem", background: "#f0f0f0", borderRadius: "4px", color: "#333" }}>
            <h3 style={{ marginTop: 0 }}>見積書番号: {estimate.estimateId}</h3>
            <p style={{ margin: "4px 0" }}><strong>顧客名:</strong> {estimate.customerName}</p>
            <p style={{ margin: "4px 0" }}><strong>小計:</strong> ¥{estimate.subtotal.toLocaleString()}</p>
            <p style={{ margin: "4px 0" }}><strong>割引合計:</strong> -¥{estimate.discountAmount.toLocaleString()}</p>
            <p style={{ margin: "4px 0" }}><strong>消費税 (10%):</strong> +¥{estimate.taxAmount.toLocaleString()}</p>
            <p style={{ margin: "4px 0" }}><strong>最終請求額:</strong> ¥{estimate.totalAmount.toLocaleString()}</p>
            <p style={{ margin: "4px 0" }}><strong>お届け予定日:</strong> {estimate.estimatedDelivery}</p>
            <div style={{ marginTop: "4px" }}>
              <strong>適用された割引・特典:</strong>
              <ul style={{ margin: "4px 0", paddingLeft: "20px" }}>
                {estimate.appliedDiscounts.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
