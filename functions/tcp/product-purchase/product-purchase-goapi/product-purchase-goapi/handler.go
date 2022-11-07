package function

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"

	handler "github.com/openfaas/templates-sdk/go-http"
)

var (
	URL_PRODUCT_PURCHASE_GET_PRICE    = os.Getenv("URL_PRODUCT_PURCHASE_GET_PRICE")
	URL_PRODUCT_PURCHASE_AUTHORIZE_CC = os.Getenv("URL_PRODUCT_PURCHASE_AUTHORIZE_CC")
	URL_PRODUCT_PURCHASE_PUBLISH      = os.Getenv("URL_PRODUCT_PURCHASE_PUBLISH")
)

type PurchaseRequest struct {
	CreditCard string `json:"creditCard"`
	User       string `json:"user"`
	Id         string `json:"id"`
}

type PriceRequest struct {
	Id string `json:"id"`
}

type PriceResponse struct {
	Id       string `json:"id"`
	GotPrice bool   `json:"gotPrice"`
	Price    string `json:"price"`
}

type CCRequest struct {
	CreditCard string `json:"creditCard"`
	User       string `json:"user"`
}

type CCResponse struct {
	CreditCard    string `json:"creditCard"`
	User          string `json:"user"`
	Approved      bool   `json:"approved"`
	Authorization int64  `json:"authorization"`
}

type PublishRequest struct {
	CreditCard    string `json:"creditCard"`
	User          string `json:"user"`
	Approved      bool   `json:"approved"`
	Authorization int64  `json:"authorization"`
	Id            string `json:"id"`
	GotPrice      bool   `json:"gotPrice"`
	Price         string `json:"price"`
}

type PublishResponse struct {
	ProductID     string `json:"productId"`
	ProductPrice  string `json:"productPrice"`
	UserId        string `json:"userId"`
	Authorization int64  `json:"authorization"`
}

type PurchaseResponse = PublishResponse

func handleError(err error, hint string) {
	if err != nil {
		fmt.Println("[ERROR]", hint)
		panic(err)
	}
}

// Handle a function invocation
func Handle(req handler.Request) (handler.Response, error) {
	var err error
	var purchaseRespBytes []byte
	hclient := &http.Client{}

	// resp, err := hclient.Get(chain_go_api_tls_1)

	fmt.Println("Req Body Str", string(req.Body))
	// Parse the request from users
	var purchaseReqObj PurchaseRequest
	err = json.Unmarshal(req.Body, &purchaseReqObj)
	handleError(err, "Request parsing failed")

	// STEP 01: Get Price
	priceReqObj := PriceRequest{Id: purchaseReqObj.Id}
	priceReqBytes, err := json.Marshal(priceReqObj)
	handleError(err, "Making price req json failed")
	priceReq, err := http.NewRequest("POST", URL_PRODUCT_PURCHASE_GET_PRICE, bytes.NewBuffer(priceReqBytes))
	handleError(err, "Making price http req failed")
	priceReq.Header.Set("Content-Type", "application/json")
	priceResp, err := hclient.Do(priceReq)
	handleError(err, "Getting price failed")
	if priceResp.Body != nil {
		defer priceResp.Body.Close()
	}
	priceRespBody, err := ioutil.ReadAll(priceResp.Body)
	handleError(err, "Reading price resp body failed")
	var priceRespObj PriceResponse
	err = json.Unmarshal(priceRespBody, &priceRespObj)
	handleError(err, "Parsing price resp failed")

	// STEP 02: Authorize Credit Card
	ccReqObj := CCRequest{CreditCard: purchaseReqObj.CreditCard, User: purchaseReqObj.User}
	ccReqBytes, err := json.Marshal(ccReqObj)
	handleError(err, "Making cc req json failed")
	ccReq, err := http.NewRequest("POST", URL_PRODUCT_PURCHASE_AUTHORIZE_CC, bytes.NewBuffer(ccReqBytes))
	handleError(err, "Making cc http req failed")
	ccReq.Header.Set("Content-Type", "application/json")
	ccResp, err := hclient.Do(ccReq)
	handleError(err, "Getting cc failed")
	if ccResp.Body != nil {
		defer ccResp.Body.Close()
	}
	ccRespBody, err := ioutil.ReadAll(ccResp.Body)
	var ccRespObj CCResponse
	err = json.Unmarshal(ccRespBody, &ccRespObj)
	handleError(err, "Parsing cc resp failed")

	// STEP 03: Publish
	pubReqObj := PublishRequest{
		CreditCard:    ccRespObj.CreditCard,
		User:          ccRespObj.User,
		Approved:      ccRespObj.Approved,
		Authorization: ccRespObj.Authorization,
		Id:            priceRespObj.Price,
		GotPrice:      priceRespObj.GotPrice,
		Price:         priceRespObj.Price,
	}
	pubReqBytes, err := json.Marshal(pubReqObj)
	handleError(err, "Making pub req json failed")
	pubReq, err := http.NewRequest("POST", URL_PRODUCT_PURCHASE_PUBLISH, bytes.NewBuffer(pubReqBytes))
	handleError(err, "Making pub http req failed")
	pubReq.Header.Set("Content-Type", "application/json")
	pubResp, err := hclient.Do(pubReq)
	handleError(err, "Getting pub failed")
	if pubResp.Body != nil {
		defer pubResp.Body.Close()
	}
	pubRespBody, err := ioutil.ReadAll(pubResp.Body)
	var pubRespObj PublishResponse
	err = json.Unmarshal(pubRespBody, &pubRespObj)
	handleError(err, "Parsing pub resp failed")

	// Repond to the user
	var purchaseRespObj PurchaseResponse
	purchaseRespObj = pubRespObj
	purchaseRespBytes, err = json.Marshal(purchaseRespObj)
	handleError(err, "Making purchase resp json failed")

	respHeader := http.Header{}
	respHeader.Set("Content-Type", "application/json")

	return handler.Response{
		Body:       purchaseRespBytes,
		StatusCode: http.StatusOK,
		Header:     respHeader,
	}, err
}
