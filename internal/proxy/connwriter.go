package proxy

import (
	"bufio"
	"io"
	"net"
	"net/http"
	"strconv"
)

// newBufReader wraps a connection in a buffered reader for http.ReadRequest.
func newBufReader(conn net.Conn) *bufio.Reader {
	return bufio.NewReader(conn)
}

// nopReadCloser is an io.ReadCloser over an in-memory byte slice.
type nopReadCloser struct {
	data []byte
	pos  int
}

func (n *nopReadCloser) Close() error { return nil }

func (n *nopReadCloser) Read(p []byte) (int, error) {
	if n.pos >= len(n.data) {
		return 0, io.EOF
	}
	c := copy(p, n.data[n.pos:])
	n.pos += c
	return c, nil
}

// connResponseWriter is a minimal http.ResponseWriter that serializes a
// response directly onto a raw connection (the decrypted TLS tunnel). It is
// used so the MITM path can reuse the same relay code as plain HTTP, which
// writes through an http.ResponseWriter.
//
// It is intentionally simple: it buffers status/headers until the first body
// write (or flush) and emits a complete HTTP/1.1 response with an explicit
// Content-Length, which it derives from the buffered body.
type connResponseWriter struct {
	conn        net.Conn
	header      http.Header
	status      int
	body        []byte
	wroteHeader bool
}

func (w *connResponseWriter) Header() http.Header {
	return w.header
}

func (w *connResponseWriter) WriteHeader(status int) {
	if w.wroteHeader {
		return
	}
	w.status = status
	w.wroteHeader = true
}

func (w *connResponseWriter) Write(b []byte) (int, error) {
	if !w.wroteHeader {
		w.WriteHeader(http.StatusOK)
	}
	w.body = append(w.body, b...)
	return len(b), nil
}

// flush writes the buffered status line, headers, and body to the connection.
// It must be called once after the handler returns.
func (w *connResponseWriter) flush() {
	if !w.wroteHeader {
		w.WriteHeader(http.StatusOK)
	}

	// Content-Length is set from the fully-buffered body; drop any inbound
	// Transfer-Encoding since we are not chunking.
	w.header.Del("Transfer-Encoding")
	w.header.Set("Content-Length", strconv.Itoa(len(w.body)))

	resp := &http.Response{
		StatusCode: w.status,
		Proto:      "HTTP/1.1",
		ProtoMajor: 1,
		ProtoMinor: 1,
		Header:     w.header,
		Body:       &nopReadCloser{data: w.body},
		// ContentLength lets the stdlib writer emit it correctly.
		ContentLength: int64(len(w.body)),
	}
	_ = resp.Write(w.conn)
}
