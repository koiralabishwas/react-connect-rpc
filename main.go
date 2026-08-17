package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"sync"
	"time"

	"connectrpc.com/connect"
	"github.com/rs/cors"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	greetv1 "my-rpc-app/gen/greet/v1"
	"my-rpc-app/gen/greet/v1/greetv1connect"
)

// ==========================================
// In-Memory Data Store for Demonstration
// ==========================================
type Store struct {
	mu       sync.Mutex
	products map[string]*greetv1.ProductItem
	orders   map[string]*greetv1.GetOrderStatusResponse
}

var globalStore = &Store{
	products: map[string]*greetv1.ProductItem{
		"prod-apple": {
			Id:    "prod-apple",
			Name:  "Fresh Aomori Apple 🍎",
			Price: 150,
			Stock: 20,
		},
		"prod-coffee": {
			Id:    "prod-coffee",
			Name:  "Specialty Coffee Beans ☕",
			Price: 850,
			Stock: 10,
		},
		"prod-keyboard": {
			Id:    "prod-keyboard",
			Name:  "Mechanical Keyboard ⌨️",
			Price: 18500,
			Stock: 4,
		},
	},
	orders: make(map[string]*greetv1.GetOrderStatusResponse),
}

// ==========================================
// 1. Greet Feature Logic
// ==========================================
type GreetServer struct{}

func (s *GreetServer) Greet(
	ctx context.Context,
	req *connect.Request[greetv1.GreetRequest],
) (*connect.Response[greetv1.GreetResponse], error) {
	name := req.Msg.Name
	if name == "" {
		// Demonstrating typed Connect errors
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("name parameter cannot be empty"))
	}

	return connect.NewResponse(&greetv1.GreetResponse{
		Greeting: fmt.Sprintf("Hello, %s! Welcome to ConnectRPC 🎉", name),
	}), nil
}

// ==========================================
// 2. Purchase Feature Logic
// ==========================================
type PurchaseServer struct{}

func (s *PurchaseServer) ListProducts(
	ctx context.Context,
	req *connect.Request[greetv1.ListProductsRequest],
) (*connect.Response[greetv1.ListProductsResponse], error) {
	globalStore.mu.Lock()
	defer globalStore.mu.Unlock()

	items := make([]*greetv1.ProductItem, 0, len(globalStore.products))
	for _, p := range globalStore.products {
		items = append(items, &greetv1.ProductItem{
			Id:    p.Id,
			Name:  p.Name,
			Price: p.Price,
			Stock: p.Stock,
		})
	}

	return connect.NewResponse(&greetv1.ListProductsResponse{
		Products: items,
	}), nil
}

func (s *PurchaseServer) Purchase(
	ctx context.Context,
	req *connect.Request[greetv1.PurchaseRequest],
) (*connect.Response[greetv1.PurchaseResponse], error) {
	globalStore.mu.Lock()
	defer globalStore.mu.Unlock()

	if req.Msg.Quantity <= 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("quantity must be at least 1"))
	}

	prod, exists := globalStore.products[req.Msg.ProductId]
	if !exists {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("product with ID '%s' not found", req.Msg.ProductId))
	}

	if prod.Stock < req.Msg.Quantity {
		return nil, connect.NewError(
			connect.CodeResourceExhausted,
			fmt.Errorf("insufficient stock: requested %d, but only %d available", req.Msg.Quantity, prod.Stock),
		)
	}

	// Deduct stock
	prod.Stock -= req.Msg.Quantity

	receiptID := fmt.Sprintf("REC-%d", time.Now().UnixNano()%1000000)
	totalPrice := prod.Price * req.Msg.Quantity
	createdAt := time.Now().Format("2006-01-02 15:04:05")

	// Save order status for later tracking
	globalStore.orders[receiptID] = &greetv1.GetOrderStatusResponse{
		ReceiptId:         receiptID,
		Status:            "PROCESSING",
		TrackingNumber:    fmt.Sprintf("TRK-%06d", time.Now().Unix()%1000000),
		EstimatedDelivery: time.Now().Add(48 * time.Hour).Format("2006-01-02"),
	}

	return connect.NewResponse(&greetv1.PurchaseResponse{
		ReceiptId:   receiptID,
		ProductName: prod.Name,
		Quantity:    req.Msg.Quantity,
		UnitPrice:   prod.Price,
		TotalPrice:  totalPrice,
		CreatedAt:   createdAt,
	}), nil
}

func (s *PurchaseServer) GetOrderStatus(
	ctx context.Context,
	req *connect.Request[greetv1.GetOrderStatusRequest],
) (*connect.Response[greetv1.GetOrderStatusResponse], error) {
	globalStore.mu.Lock()
	defer globalStore.mu.Unlock()

	order, exists := globalStore.orders[req.Msg.ReceiptId]
	if !exists {
		return nil, connect.NewError(connect.CodeNotFound, fmt.Errorf("order '%s' not found", req.Msg.ReceiptId))
	}

	return connect.NewResponse(order), nil
}

// ==========================================
// 3. Streaming Feature Logic (Server Streaming)
// ==========================================
type StreamingServer struct{}

func (s *StreamingServer) StreamProgress(
	ctx context.Context,
	req *connect.Request[greetv1.StreamProgressRequest],
	stream *connect.ServerStream[greetv1.StreamProgressResponse],
) error {
	totalSteps := req.Msg.TotalSteps
	if totalSteps <= 0 {
		totalSteps = 5
	}
	if totalSteps > 20 {
		totalSteps = 20
	}

	taskName := req.Msg.TaskName
	if taskName == "" {
		taskName = "Background Job"
	}

	for i := 1; i <= int(totalSteps); i++ {
		select {
		case <-ctx.Done():
			// Client disconnected or cancelled request
			return ctx.Err()
		default:
			percentage := int32((float64(i) / float64(totalSteps)) * 100)
			msg := fmt.Sprintf("[%s] Step %d of %d completed", taskName, i, totalSteps)
			if i == int(totalSteps) {
				msg = fmt.Sprintf("[%s] All %d steps finished successfully! ✅", taskName, totalSteps)
			}

			err := stream.Send(&greetv1.StreamProgressResponse{
				CurrentStep: int32(i),
				TotalSteps:  totalSteps,
				Percentage:  percentage,
				Message:     msg,
				Timestamp:   time.Now().Format("15:04:05.000"),
			})
			if err != nil {
				return err
			}

			time.Sleep(600 * time.Millisecond)
		}
	}

	return nil
}

// ==========================================
// 4. Server Setup & Routing
// ==========================================
func main() {
	mux := http.NewServeMux()

	// Mount Greet Service
	greetPath, greetHandler := greetv1connect.NewGreetServiceHandler(&GreetServer{})
	mux.Handle(greetPath, greetHandler)

	// Mount Purchase Service
	purchasePath, purchaseHandler := greetv1connect.NewPurchaseServiceHandler(&PurchaseServer{})
	mux.Handle(purchasePath, purchaseHandler)

	// Mount Streaming Service
	streamingPath, streamingHandler := greetv1connect.NewStreamingServiceHandler(&StreamingServer{})
	mux.Handle(streamingPath, streamingHandler)

	// Setup CORS for React (Vite default port 5173)
	corsHandler := cors.New(cors.Options{
		AllowedOrigins: []string{"http://localhost:5173", "http://127.0.0.1:5173"},
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{"*"},
		ExposedHeaders: []string{
			"connect-protocol-version",
			"connect-content-encoding",
			"grpc-status",
			"grpc-message",
		},
	}).Handler(mux)

	fmt.Println("🚀 Connect RPC Go Server running on http://localhost:8080")
	fmt.Printf(" - Greet Service:     %s\n", greetPath)
	fmt.Printf(" - Purchase Service:  %s\n", purchasePath)
	fmt.Printf(" - Streaming Service: %s\n", streamingPath)

	err := http.ListenAndServe(":8080", h2c.NewHandler(corsHandler, &http2.Server{}))
	if err != nil {
		fmt.Printf("Server error: %v\n", err)
	}
}
