let webURL = "https://web.whatsapp.com/";

// Obtener el elemento webview y asignar la URL
document.addEventListener('DOMContentLoaded', () => {
  const webview = document.getElementById('webview');
  webview.src = webURL;
});