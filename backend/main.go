package main

import (
	"context"
	"encoding/json"
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
// 1. Greet Feature Logic (Connect RPC)
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
// 2. Purchase Feature Logic (Connect RPC)
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
// 3. Order Estimate Feature Logic (Connect RPC)
// ==========================================
type OrderEstimateServer struct{}

func (s *OrderEstimateServer) Estimate(
	ctx context.Context,
	req *connect.Request[greetv1.OrderEstimateRequest],
) (*connect.Response[greetv1.OrderEstimateResponse], error) {
	msg := req.Msg
	var subtotal int32 = 0
	for _, item := range msg.Items {
		subtotal += item.UnitPrice * item.Quantity
	}

	var discountAmount int32 = 0
	var appliedDiscounts []string

	// 会員割引 (5%)
	if msg.IsMember && subtotal > 0 {
		memberDiscount := subtotal * 5 / 100
		discountAmount += memberDiscount
		appliedDiscounts = append(appliedDiscounts, fmt.Sprintf("会員特別割引 (5%%): -¥%d", memberDiscount))
	}

	// クーポン割引
	switch msg.CouponCode {
	case "SAVE10":
		couponDiscount := subtotal * 10 / 100
		discountAmount += couponDiscount
		appliedDiscounts = append(appliedDiscounts, fmt.Sprintf("クーポン割引 (SAVE10 / 10%%): -¥%d", couponDiscount))
	case "SPECIAL500":
		var couponDiscount int32 = 500
		if couponDiscount > subtotal {
			couponDiscount = subtotal
		}
		discountAmount += couponDiscount
		appliedDiscounts = append(appliedDiscounts, fmt.Sprintf("特別クーポン (SPECIAL500): -¥%d", couponDiscount))
	}

	if len(appliedDiscounts) == 0 {
		appliedDiscounts = append(appliedDiscounts, "割引なし")
	}

	taxableAmount := subtotal - discountAmount
	if taxableAmount < 0 {
		taxableAmount = 0
	}
	taxAmount := taxableAmount * 10 / 100
	totalAmount := taxableAmount + taxAmount

	return connect.NewResponse(&greetv1.OrderEstimateResponse{
		EstimateId:        "EST-88231",
		CustomerName:      msg.CustomerName,
		Subtotal:          subtotal,
		DiscountAmount:    discountAmount,
		TaxAmount:         taxAmount,
		TotalAmount:       totalAmount,
		AppliedDiscounts:  appliedDiscounts,
		EstimatedDelivery: "3〜5営業日以内 (最短配送)",
	}), nil
}

// ==========================================
// 4. REST API Logic (Comparison)
// ==========================================
type RestGreetRequest struct {
	Name string `json:"name"`
}

type RestGreetResponse struct {
	Greeting string `json:"greeting"`
}

func handleRestGreet(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req RestGreetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	res := RestGreetResponse{
		Greeting: fmt.Sprintf("Hello, %s!", req.Name),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

type RestPurchaseRequest struct {
	Product  string `json:"product"`
	Quantity int32  `json:"quantity"`
	Price    int32  `json:"price"`
}

type RestPurchaseResponse struct {
	ReceiptId  string `json:"receiptId"`
	Product    string `json:"product"`
	Quantity   int32  `json:"quantity"`
	TotalPrice int32  `json:"totalPrice"`
}

func handleRestPurchase(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req RestPurchaseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	totalPrice := req.Quantity * req.Price

	res := RestPurchaseResponse{
		ReceiptId:  "REC-12345",
		Product:    req.Product,
		Quantity:   req.Quantity,
		TotalPrice: totalPrice,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

type RestOrderItem struct {
	ItemName  string `json:"itemName"`
	UnitPrice int32  `json:"unitPrice"`
	Quantity  int32  `json:"quantity"`
}

type RestOrderEstimateRequest struct {
	CustomerName string          `json:"customerName"`
	Items        []RestOrderItem `json:"items"`
	CouponCode   string          `json:"couponCode"`
	IsMember     bool            `json:"isMember"`
}

type RestOrderEstimateResponse struct {
	EstimateId        string   `json:"estimateId"`
	CustomerName      string   `json:"customerName"`
	Subtotal          int32    `json:"subtotal"`
	DiscountAmount    int32    `json:"discountAmount"`
	TaxAmount         int32    `json:"taxAmount"`
	TotalAmount       int32    `json:"totalAmount"`
	AppliedDiscounts  []string `json:"appliedDiscounts"`
	EstimatedDelivery string   `json:"estimatedDelivery"`
}

func handleRestOrderEstimate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req RestOrderEstimateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var subtotal int32 = 0
	for _, item := range req.Items {
		subtotal += item.UnitPrice * item.Quantity
	}

	var discountAmount int32 = 0
	var appliedDiscounts []string

	if req.IsMember && subtotal > 0 {
		memberDiscount := subtotal * 5 / 100
		discountAmount += memberDiscount
		appliedDiscounts = append(appliedDiscounts, fmt.Sprintf("会員特別割引 (5%%): -¥%d", memberDiscount))
	}

	switch req.CouponCode {
	case "SAVE10":
		couponDiscount := subtotal * 10 / 100
		discountAmount += couponDiscount
		appliedDiscounts = append(appliedDiscounts, fmt.Sprintf("クーポン割引 (SAVE10 / 10%%): -¥%d", couponDiscount))
	case "SPECIAL500":
		var couponDiscount int32 = 500
		if couponDiscount > subtotal {
			couponDiscount = subtotal
		}
		discountAmount += couponDiscount
		appliedDiscounts = append(appliedDiscounts, fmt.Sprintf("特別クーポン (SPECIAL500): -¥%d", couponDiscount))
	}

	if len(appliedDiscounts) == 0 {
		appliedDiscounts = append(appliedDiscounts, "割引なし")
	}

	taxableAmount := subtotal - discountAmount
	if taxableAmount < 0 {
		taxableAmount = 0
	}
	taxAmount := taxableAmount * 10 / 100
	totalAmount := taxableAmount + taxAmount

	res := RestOrderEstimateResponse{
		EstimateId:        "EST-88231",
		CustomerName:      req.CustomerName,
		Subtotal:          subtotal,
		DiscountAmount:    discountAmount,
		TaxAmount:         taxAmount,
		TotalAmount:       totalAmount,
		AppliedDiscounts:  appliedDiscounts,
		EstimatedDelivery: "3〜5営業日以内 (最短配送)",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

// ==========================================
// 5. Server Setup
// ==========================================
func main() {
	mux := http.NewServeMux()
	
	// Mount Connect RPC Services
	greetPath, greetHandler := greetv1connect.NewGreetServiceHandler(&GreetServer{})
	mux.Handle(greetPath, greetHandler)

	purchasePath, purchaseHandler := greetv1connect.NewPurchaseServiceHandler(&PurchaseServer{})
	mux.Handle(purchasePath, purchaseHandler)

	estimatePath, estimateHandler := greetv1connect.NewOrderEstimateServiceHandler(&OrderEstimateServer{})
	mux.Handle(estimatePath, estimateHandler)

	// Mount REST API Handlers
	mux.HandleFunc("/api/greet", handleRestGreet)
	mux.HandleFunc("/api/purchase", handleRestPurchase)
	mux.HandleFunc("/api/estimate", handleRestOrderEstimate)

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
