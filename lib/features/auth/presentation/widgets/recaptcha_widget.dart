import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:fastnew/core/theme/app_colors.dart';

class RecaptchaWidget extends StatefulWidget {
  final ValueChanged<bool> onVerified;
  final String siteKey;

  const RecaptchaWidget({
    super.key,
    required this.onVerified,
    this.siteKey = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI', // Clé de test publique de Google reCAPTCHA v2
  });

  @override
  State<RecaptchaWidget> createState() => _RecaptchaWidgetState();
}

class _RecaptchaWidgetState extends State<RecaptchaWidget> {
  late final WebViewController _webViewController;
  bool _isLoading = true;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _initController();
  }

  void _initController() {
    _webViewController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (String url) {
            if (mounted) {
              setState(() {
                _isLoading = false;
              });
            }
          },
          onWebResourceError: (WebResourceError error) {
            // Note: En mode avion ou sans réseau, le reCAPTCHA échouera
            if (mounted) {
              setState(() {
                _hasError = true;
                _isLoading = false;
              });
            }
          },
        ),
      )
      ..addJavaScriptChannel(
        'CaptchaChannel',
        onMessageReceived: (JavaScriptMessage message) {
          if (message.message == 'verified') {
            widget.onVerified(true);
          } else if (message.message == 'expired' || message.message == 'error') {
            widget.onVerified(false);
          }
        },
      );

    _loadHtml();
  }

  void _loadHtml() {
    final htmlContent = '''
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <script src="https://www.google.com/recaptcha/api.js" async defer></script>
          <style>
            body {
              margin: 0;
              padding: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              background-color: transparent;
            }
            .captcha-container {
              transform: scale(0.9);
              transform-origin: 0 0;
            }
          </style>
          <script type="text/javascript">
            function onCallback(token) {
              CaptchaChannel.postMessage('verified');
            }
            function onExpired() {
              CaptchaChannel.postMessage('expired');
            }
            function onError() {
              CaptchaChannel.postMessage('error');
            }
          </script>
        </head>
        <body>
          <div class="captcha-container">
            <div class="g-recaptcha" 
                 data-sitekey="${widget.siteKey}" 
                 data-callback="onCallback" 
                 data-expired-callback="onExpired" 
                 data-error-callback="onError">
            </div>
          </div>
        </body>
      </html>
    ''';

    final contentBase64 = base64Encode(const Utf8Encoder().convert(htmlContent));
    _webViewController.loadRequest(
      Uri.parse('data:text/html;base64,$contentBase64'),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_hasError) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.red[50],
          borderRadius: BorderRadius.circular(15),
          border: Border.all(color: Colors.red[200]!),
        ),
        child: Column(
          children: [
            const Icon(Icons.error_outline, color: Colors.redAccent, size: 36),
            const SizedBox(height: 8),
            const Text(
              "Erreur de chargement du reCAPTCHA.",
              style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red),
            ),
            const SizedBox(height: 4),
            const Text(
              "Veuillez vérifier votre connexion Internet.",
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: Colors.red),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () {
                setState(() {
                  _hasError = false;
                  _isLoading = true;
                });
                _loadHtml();
              },
              child: const Text("Réessayer"),
            ),
          ],
        ),
      );
    }

    return SizedBox(
      height: 90,
      width: double.infinity,
      child: Stack(
        children: [
          WebViewWidget(controller: _webViewController),
          if (_isLoading)
            const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
              ),
            ),
        ],
      ),
    );
  }
}
