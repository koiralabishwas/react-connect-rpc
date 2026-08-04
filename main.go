package main

import (
	"context"
	"fmt"
	"net/http"

	"connectrpc.com/connect"
	"github.com/rs/cors"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	greetv1 "my-rpc-app/gen/greet/v1"
	"my-rpc-app/gen/greet/v1/greetv1connect"
)

// ==========================================
// 1. Greet Feature Logic
// ==========================================
type GreetServer struct{}

func (s *GreetServer) Greet(
	ctx context.Context,
	req *connect.Request[greetv1.GreetRequest],
) (*connect.Response[greetv1.GreetResponse], error) {
	return connect.NewResponse(&greetv1.GreetResponse{
		Greeting: fmt.Sprintf("Hello, %s!", req.Msg.Name),
	}), nil
}

// ==========================================
// 2. Purchase Feature Logic
// ==========================================
type PurchaseServer struct{}

func (s *PurchaseServer) Purchase(
	ctx context.Context,
	req *connect.Request[greetv1.PurchaseRequest],
) (*connect.Response[greetv1.PurchaseResponse], error) {
	
	totalPrice := req.Msg.Quantity * req.Msg.Price

	return connect.NewResponse(&greetv1.PurchaseResponse{
		ReceiptId:  "REC-12345", // Hardcoded for now
		Product:    req.Msg.Product,
		Quantity:   req.Msg.Quantity,
		TotalPrice: totalPrice,
	}), nil
}

// ==========================================
// 3. Server Setup
// ==========================================
func main() {
	mux := http.NewServeMux()
	
	// Mount Greet Service
	greetPath, greetHandler := greetv1connect.NewGreetServiceHandler(&GreetServer{})
	mux.Handle(greetPath, greetHandler)

	// Mount Purchase Service
	purchasePath, purchaseHandler := greetv1connect.NewPurchaseServiceHandler(&PurchaseServer{})
	mux.Handle(purchasePath, purchaseHandler)

	// Setup CORS for React (port 5173)
	corsHandler := cors.New(cors.Options{
		AllowedOrigins: []string{"http://localhost:5173"},
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{"*"},
		ExposedHeaders: []string{"connect-protocol-version"},
	}).Handler(mux)

	fmt.Println("Server running on http://localhost:8080")
	http.ListenAndServe(":8080", h2c.NewHandler(corsHandler, &http2.Server{}))
}
