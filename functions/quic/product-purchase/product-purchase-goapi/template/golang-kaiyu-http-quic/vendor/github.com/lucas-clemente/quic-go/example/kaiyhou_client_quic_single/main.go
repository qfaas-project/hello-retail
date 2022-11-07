package main

import (
	"bufio"
	"bytes"
	"crypto/tls"
	"crypto/x509"
	"flag"
	"fmt"
	"github.com/lucas-clemente/quic-go"
	"github.com/lucas-clemente/quic-go/http3"
	"github.com/lucas-clemente/quic-go/internal/protocol"
	"github.com/lucas-clemente/quic-go/internal/utils"
	"github.com/lucas-clemente/quic-go/logging"
	"github.com/lucas-clemente/quic-go/qlog"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"sync"
	"time"
)

// Thic Client keep reuses a single H3 Client instances

// AddRootCA adds the root CA certificate to a cert pool
func AddRootCA(certPool *x509.CertPool) {
	caCertRaw, err := ioutil.ReadFile("pauling.crt") // "ca.pem"
	if err != nil {
		panic(err)
	}
	if ok := certPool.AppendCertsFromPEM(caCertRaw); !ok {
		panic("Could not add root ceritificate to pool.")
	}
}

func main() {
	verbose := flag.Bool("v", false, "verbose")
	//quiet := flag.Bool("q", false, "don't print the data")
	keyLogFile := flag.String("keylog", "", "key log file")
	insecure := flag.Bool("insecure", false, "skip certificate verification")
	qlogEnable := flag.Bool("qlog", false, "output a qlog (in the same directory)")
	interval := flag.Int("interval", 5, "interval between each request")
	numRequest := flag.Int("numRequest", 1, "number of requests send in one test")
	bodyContent := flag.String("body", "", "key log file")
	printResp := flag.Bool("p", false, "print resp")

	flag.Parse()
	urls := flag.Args()

	logger := utils.DefaultLogger

	if *verbose {
		logger.SetLogLevel(utils.LogLevelDebug)
	} else {
		//logger.SetLogLevel(utils.LogLevelInfo)
		logger.SetLogLevel(utils.LogLevelNothing)
	}

	timeFormat := "2006-01-02 15:04:05.000"
	logger.SetLogTimeFormat(timeFormat)
	//logger.SetLogTimeFormat("[quic_client]")

	var keyLog io.Writer
	if len(*keyLogFile) > 0 {
		f, err := os.Create(*keyLogFile)
		if err != nil {
			log.Fatal(err)
		}
		defer f.Close()
		keyLog = f
	}

	//pool, err := x509.SystemCertPool()
	//if err != nil {
	//	log.Fatal(err)
	//}
	pool := x509.NewCertPool()
	AddRootCA(pool)

	qconf := &quic.Config{
		TokenStore: quic.NewLRUTokenStore(10, 4),
		//Versions:   []protocol.VersionNumber{protocol.VersionDraft29},
		Versions:   []protocol.VersionNumber{protocol.VersionDraft32},
		//MaxIdleTimeout:	10 * time.Second,
		//, protocol.VersionDraft29, protocol.VersionTLS
		//Versions: [VersionDraft29, VersionDraft32],
	}

	if *qlogEnable {
		qconf.Tracer = qlog.NewTracer(func(_ logging.Perspective, connID []byte) io.WriteCloser {
			filename := fmt.Sprintf("client_%x.qlog", connID)
			f, err := os.Create(filename)
			if err != nil {
				log.Fatal(err)
			}
			log.Printf("Creating qlog file %s.\n", filename)
			return utils.NewBufferedWriteCloser(bufio.NewWriter(f), f)
		})
	}

	log.Printf("Start Test\n")

	tlcConfig := &tls.Config{
		RootCAs:            pool,
		InsecureSkipVerify: *insecure,
		KeyLogWriter:       keyLog,
		ClientSessionCache: tls.NewLRUClientSessionCache(64),
		//NextProtos: []string{nextProtoH3},
	}

	roundTripper := &http3.RoundTripper{
		TLSClientConfig: tlcConfig,
		QuicConfig:      qconf,
	}

	hclient := &http.Client{
		Transport: roundTripper,
	}

	no0RttCnt := 0

	for i := 0; i < *numRequest; i++ {

		var wg sync.WaitGroup
		wg.Add(len(urls))
		startTime := time.Now()

		go func() {

			if *printResp {
				//fmt.Printf("[Before Connection] qconf.TokenStore: %s\n", qconf.TokenStore)
				//fmt.Printf("[Before Connection] tlcConfig.ClientSessionCache: %s\n", tlcConfig.ClientSessionCache
			}

			//defer roundTripper.CloseAfterHandshakeConfirmed()
			//defer roundTripper.Close()

			for _, addr := range urls {
				go func(addr string) {

					var req *http.Request
					if len(*bodyContent) > 0 {
						//req, _ = http.NewRequest(http3.MethodPOST0RTT, addr, bytes.NewReader([]byte(*bodyContent)))
						req, _ = http.NewRequest(http.MethodPost, addr, bytes.NewReader([]byte(*bodyContent)))
						if *printResp {
							fmt.Printf("[HTTP POST0RTT] Addr: %s, Body: %s\n", addr, *bodyContent)
						}
					} else {
						if *printResp {
							fmt.Printf("[HTTP GET0RTT] Addr: %s, Body: %s\n", addr, *bodyContent)
						}
						req, _ = http.NewRequest(http3.MethodGet0RTT, addr, nil)
						//req, _ = http.NewRequest(http.MethodGet, addr, nil)
					}

					//log.Println("Before DO: ", time.Since(startTime)): 0 ms
					//fmt.Printf("[After Connection] qconf.TokenStore: %s\n", qconf.TokenStore)
					//fmt.Printf("[After Connection] tlcConfig.ClientSessionCache: %s\n", tlcConfig.ClientSessionCache)

					rsp, err := hclient.Do(req)

					log.Println(time.Since(startTime)) // This time is a litter longer than the wireshark record.
					// Don't know the reason -> because of DNS

					if time.Since(startTime) > 40*time.Millisecond {
						no0RttCnt += 1
						fmt.Println("No 0RTT: ", no0RttCnt)
					}

					if err != nil {
						log.Fatal(err)
					}

					if rsp.Body != nil {
						defer rsp.Body.Close()
					}

					body := &bytes.Buffer{}
					_, err = io.Copy(body, rsp.Body)
					if err != nil {
						log.Fatal(err)
					}

					//	logger.Infof("Request Body: %d bytes", body.Len())
					logger.Infof("Request Body: %s", body.Bytes())

					if *printResp {
						fmt.Printf("[HTTP Resp] Status: %d, Body: %s\n", rsp.StatusCode, body.Bytes())
					}
					wg.Done()
				}(addr)
			}
			wg.Wait()
		}()

		//log.Printf("%s", time.Since(startTime))
		time.Sleep(time.Duration(*interval) * time.Second)
	}
}
