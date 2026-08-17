import { useState, useEffect } from 'react'
import { RpcPage } from './pages/RpcPage'
import { RestPage } from './pages/RestPage'

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname)

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname)
    }
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const navigate = (path: string) => {
    window.history.pushState(null, '', path)
    setCurrentPath(path)
  }

  // ホーム (/) の場合: /rpc と /rest のリンクのみを表示
  if (currentPath === '/' || currentPath === '') {
    return (
      <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "600px" }}>
        <h1>ホーム</h1>
        <ul style={{ lineHeight: "2.2rem" }}>
          <li>
            <a
              href="/rpc"
              onClick={(e) => {
                e.preventDefault()
                navigate('/rpc')
              }}
            >
              Connect RPC 版 (/rpc)
            </a>
          </li>
          <li>
            <a
              href="/rest"
              onClick={(e) => {
                e.preventDefault()
                navigate('/rest')
              }}
            >
              REST API 版 (/rest)
            </a>
          </li>
        </ul>
      </div>
    )
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "600px" }}>
      <nav style={{ marginBottom: "1.5rem", borderBottom: "1px solid #ccc", paddingBottom: "0.5rem" }}>
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault()
            navigate('/')
          }}
          style={{ marginRight: "1rem" }}
        >
          ホーム
        </a>
        |
        <a
          href="/rpc"
          onClick={(e) => {
            e.preventDefault()
            navigate('/rpc')
          }}
          style={{
            margin: "0 1rem",
            fontWeight: currentPath === '/rpc' ? 'bold' : 'normal',
          }}
        >
          Connect RPC 版 (/rpc)
        </a>
        |
        <a
          href="/rest"
          onClick={(e) => {
            e.preventDefault()
            navigate('/rest')
          }}
          style={{
            marginLeft: "1rem",
            fontWeight: currentPath === '/rest' ? 'bold' : 'normal',
          }}
        >
          REST API 版 (/rest)
        </a>
      </nav>

      {currentPath === '/rpc' && <RpcPage />}
      {currentPath === '/rest' && <RestPage />}
      {currentPath !== '/rpc' && currentPath !== '/rest' && (
        <div>
          <p>ページが見つかりません (404 Not Found)</p>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault()
              navigate('/')
            }}
          >
            ホームに戻る
          </a>
        </div>
      )}
    </div>
  )
}

export default App
