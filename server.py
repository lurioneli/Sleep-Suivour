#!/usr/bin/env python3
"""
Simple HTTP server for local network access to the Fasting Tracker app.
This allows you to access the app from your phone or other devices on the same WiFi network.
"""

import http.server
import socketserver
import socket
import sys
import argparse
import os
import re

# Allowed file extensions (whitelist)
ALLOWED_EXTENSIONS = {'.html', '.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.webp'}

# Allowed directories (relative to server root)
ALLOWED_PATHS = {'/', '/index.html', '/app.js', '/styles.css'}

class SecureHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):

    def do_GET(self):
        # Sanitize and validate the path
        if not self.is_safe_path(self.path):
            self.send_error(403, "Forbidden")
            return
        super().do_GET()

    def do_POST(self):
        # Disable POST requests - this is a static file server
        self.send_error(405, "Method Not Allowed")

    def do_PUT(self):
        self.send_error(405, "Method Not Allowed")

    def do_DELETE(self):
        self.send_error(405, "Method Not Allowed")

    def is_safe_path(self, path):
        """Validate the requested path for security."""
        # Remove query string
        path = path.split('?')[0]

        # Decode URL encoding
        try:
            from urllib.parse import unquote
            path = unquote(path)
        except:
            pass

        # Block path traversal attempts
        if '..' in path or '//' in path:
            print(f"⚠️  Blocked path traversal attempt: {path}")
            return False

        # Block hidden files (starting with .)
        if '/.' in path or path.startswith('.'):
            print(f"⚠️  Blocked hidden file access: {path}")
            return False

        # Normalize path
        normalized = os.path.normpath(path)

        # Ensure we stay within the server directory
        if normalized.startswith('/') and len(normalized) > 1:
            normalized = normalized[1:]  # Remove leading slash for check

        # Check file extension (allow directories)
        if '.' in os.path.basename(path):
            ext = os.path.splitext(path)[1].lower()
            if ext not in ALLOWED_EXTENSIONS:
                print(f"⚠️  Blocked disallowed file type: {path}")
                return False

        return True

    def end_headers(self):
        # Security headers
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'SAMEORIGIN')
        self.send_header('X-XSS-Protection', '1; mode=block')
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        self.send_header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')

        # Content Security Policy - restrict what can be loaded
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data:; "
            "connect-src 'self'; "
            "frame-ancestors 'self';"
        )
        self.send_header('Content-Security-Policy', csp)

        # Cache control for development
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Expires', '0')

        super().end_headers()

    def log_message(self, format, *args):
        """Custom logging with security info."""
        client_ip = self.client_address[0]
        print(f"[{client_ip}] {args[0]}")

def get_local_ip():
    """Get the local IP address of this machine."""
    try:
        # Create a socket to determine the local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        return "localhost"

def main():
    parser = argparse.ArgumentParser(description='Fasting Tracker Local Server')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to (default: 0.0.0.0)')
    parser.add_argument('--port', type=int, default=8000, help='Port to bind to (default: 8000)')
    args = parser.parse_args()

    local_ip = get_local_ip()

    # Use secure handler
    Handler = SecureHTTPRequestHandler

    # Allow socket reuse to prevent "Address already in use" errors
    socketserver.TCPServer.allow_reuse_address = True

    with socketserver.TCPServer((args.host, args.port), Handler) as httpd:
        print("=" * 60)
        print("🔒 Fasting Tracker Server Started (Secure Mode)")
        print("=" * 60)
        print(f"\nServer is running on {args.host}:{args.port}")
        print(f"\nAccess the app from:")
        print(f"  - This computer:    http://localhost:{args.port}")
        print(f"  - Other devices:    http://{local_ip}:{args.port}")
        print(f"\nMake sure your devices are on the same WiFi network!")
        print("\n🛡️  Security features enabled:")
        print("  - Path traversal protection")
        print("  - File extension whitelist")
        print("  - Security headers (CSP, XSS, etc.)")
        print("  - Hidden file blocking")
        print("  - HTTP method restrictions")
        print("\nPress Ctrl+C to stop the server\n")
        print("=" * 60)

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\nShutting down server...")
            sys.exit(0)

if __name__ == "__main__":
    main()
