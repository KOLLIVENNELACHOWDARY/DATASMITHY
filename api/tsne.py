# api/tsne.py
# Vercel Python Serverless Function — t-SNE endpoint
# Deploy: npx vercel --prod (auto-detected, no config needed beyond vercel.json)

from http.server import BaseHTTPRequestHandler
import json, numpy as np

def tsne_manual(X, n_components=2, perplexity=30, n_iter=1000, lr=200.0):
    """
    Pure NumPy t-SNE implementation — no sklearn needed.
    Good enough for up to 2000 points.
    """
    n = len(X)
    perplexity = min(perplexity, n - 1)

    # Pairwise squared distances
    def pairwise_sq_dist(A):
        sum_sq = np.sum(A**2, axis=1)
        D = sum_sq[:,None] + sum_sq[None,:] - 2*A@A.T
        np.fill_diagonal(D, 0)
        return np.maximum(D, 0)

    # Compute P matrix (symmetric conditional probabilities)
    D = pairwise_sq_dist(X)
    P = np.zeros((n, n))
    target_entropy = np.log(perplexity)

    for i in range(n):
        di = np.delete(D[i], i)
        beta = 1.0
        for _ in range(50):  # binary search for sigma
            pi = np.exp(-di * beta)
            pi_sum = pi.sum() + 1e-10
            pi /= pi_sum
            H = -np.sum(pi * np.log(pi + 1e-10))
            if abs(H - target_entropy) < 1e-5: break
            if H < target_entropy: beta /= 2.0
            else: beta *= 2.0
        row = np.insert(pi, i, 0)
        P[i] = row

    P = (P + P.T) / (2 * n)
    P = np.maximum(P, 1e-12)

    # Initialize Y randomly
    np.random.seed(42)
    Y = np.random.randn(n, n_components) * 0.01
    gains = np.ones_like(Y)
    dY_prev = np.zeros_like(Y)
    momentum = 0.5

    for step in range(n_iter):
        if step == 250: momentum = 0.8

        # Q matrix
        D_y = pairwise_sq_dist(Y)
        Q_num = 1.0 / (1.0 + D_y)
        np.fill_diagonal(Q_num, 0)
        Q = Q_num / (Q_num.sum() + 1e-10)
        Q = np.maximum(Q, 1e-12)

        # Gradient
        PQ = P - Q
        dY = np.zeros_like(Y)
        for i in range(n):
            diff = Y[i] - Y
            dY[i] = 4 * np.sum((PQ[:,i] * Q_num[:,i])[:,None] * diff, axis=0)

        # Adaptive learning rate
        gains = (gains + 0.2) * ((dY > 0) != (dY_prev > 0)) + \
                (gains * 0.8) * ((dY > 0) == (dY_prev > 0))
        gains = np.maximum(gains, 0.01)

        dY_prev = momentum * dY_prev - lr * gains * dY
        Y += dY_prev
        Y -= Y.mean(axis=0)  # center

    return Y

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            body   = json.loads(self.rfile.read(length))
            X      = np.array(body['features'], dtype=np.float64)
            labels = body.get('labels', [])

            if len(X) < 5:
                self._error(400, 'Need at least 5 data points')
                return

            # Normalize features to [0,1]
            X_min, X_max = X.min(axis=0), X.max(axis=0)
            X_range = X_max - X_min
            X_range[X_range == 0] = 1
            X_norm = (X - X_min) / X_range

            n          = len(X_norm)
            perplexity = min(30, n // 3)
            n_iter     = min(500, max(200, n * 2))

            coords = tsne_manual(X_norm, perplexity=perplexity, n_iter=n_iter)

            # Build class cluster info
            unique_labels = list(set(labels))
            clusters = {}
            for lbl in unique_labels:
                idxs = [i for i,l in enumerate(labels) if l == lbl]
                pts  = coords[idxs]
                clusters[lbl] = {
                    'center':  pts.mean(axis=0).tolist(),
                    'spread':  float(pts.std()),
                    'count':   len(idxs),
                }

            self.send_response(200)
            self._cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'points':   coords.tolist(),
                'clusters': clusters,
                'n':        n,
            }).encode())

        except Exception as e:
            self._error(500, str(e))

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin',  '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _error(self, code, msg):
        self.send_response(code)
        self._cors()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'error': msg}).encode())

    def log_message(self, *args): pass  # silence Vercel logs