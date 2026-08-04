import { useState } from 'react'
import { createClient } from '@connectrpc/connect'
import { createConnectTransport } from '@connectrpc/connect-web'

import { GreetService, PurchaseService } from './gen/greet/v1/greet_pb'

const transport = createConnectTransport({
  baseUrl: 'http://localhost:8080',
})

const greetClient = createClient(GreetService, transport)
const purchaseClient = createClient(PurchaseService, transport)

function App() {
  const [name, setName] = useState('')
  const [greetingMessage, setGreetingMessage] = useState('')

  const [product, setProduct] = useState('Apple')
  const [quantity, setQuantity] = useState(3)
  const [price, setPrice] = useState(100)
  const [receipt, setReceipt] = useState<any>(null)

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

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "600px" }}>
      <h1>React + Connect RPC + Go</h1>
      
      <div style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "8px", marginBottom: "2rem" }}>
        <h2>1. Greet Service</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name..."
            style={{ padding: "8px", flex: 1 }}
          />
          <button onClick={handleGreet} style={{ padding: "8px 16px" }}>
            Send Greeting
          </button>
        </div>

        {greetingMessage && (
          <div style={{ marginTop: "1rem", padding: "1rem", background: "#e8f5e9", borderRadius: "4px" }}>
            <strong>Server replied: </strong> {greetingMessage}
          </div>
        )}
      </div>

      <div style={{ border: "1px solid #ccc", padding: "1rem", borderRadius: "8px" }}>
        <h2>2. Purchase Service</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          
          <label style={{ display: "flex", justifyContent: "space-between" }}>
            Product Name:
            <input
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              style={{ width: "60%", padding: "4px" }}
            />
          </label>

          <label style={{ display: "flex", justifyContent: "space-between" }}>
            Quantity:
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              style={{ width: "60%", padding: "4px" }}
            />
          </label>

          <label style={{ display: "flex", justifyContent: "space-between" }}>
            Price (¥):
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              style={{ width: "60%", padding: "4px" }}
            />
          </label>

          <button onClick={handlePurchase} style={{ padding: "8px 16px", marginTop: "10px", alignSelf: "flex-start" }}>
            Send Purchase Request
          </button>
        </div>

        {receipt && (
          <div style={{ marginTop: "1rem", padding: "1rem", background: "#f0f0f0", borderRadius: "4px" }}>
            <h3 style={{ marginTop: 0 }}>Receipt: {receipt.receiptId}</h3>
            <p style={{ margin: "4px 0" }}><strong>Item:</strong> {receipt.product}</p>
            <p style={{ margin: "4px 0" }}><strong>Qty:</strong> {receipt.quantity}</p>
            <p style={{ margin: "4px 0" }}><strong>Total:</strong> ¥{receipt.totalPrice}</p>
          </div>
        )}
      </div>

    </div>
  )
}

export default App
