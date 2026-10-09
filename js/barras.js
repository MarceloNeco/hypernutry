/* HyperNutry — leitor de código de barras (HN.barras)
 * Usa o ZXing hospedado em vendor/zxing/ (Apache-2.0), carregado só quando a pessoa abre o modo Código.
 * Por quê: o BarcodeDetector do Chrome falha em lata curva, não lê na vertical, inventa números de 8 dígitos
 * e não existe no iPhone. O ZXing lê em qualquer ângulo (giramos a imagem) e confere o dígito verificador.
 * Tudo roda no aparelho; nada da imagem sai dele. */
(function (HN) {
  var B = HN.barras = {}, reader = null, carregando = null;
  B.pronto = function () { return !!window.ZXing; };
  B.carregar = function () {
    if (window.ZXing) return Promise.resolve();
    if (carregando) return carregando;
    carregando = new Promise(function (ok, fail) {
      var s = document.createElement('script'); s.src = 'vendor/zxing/zxing.min.js';
      s.onload = function () { ok(); }; s.onerror = function () { carregando = null; fail(new Error('zxing')); };
      document.head.appendChild(s);
    });
    return carregando;
  };
  function leitor() {
    if (reader) return reader; var Z = window.ZXing;
    reader = new Z.MultiFormatReader(); var h = new Map();
    h.set(Z.DecodeHintType.TRY_HARDER, true);
    h.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E]);
    reader.setHints(h); return reader;
  }
  function decodificar(c) {
    var Z = window.ZXing;
    try { var r = leitor().decode(new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(c)))); return r ? r.getText() : null; } catch (e) { return null; }
  }
  function girar(c, graus) {
    var rad = graus * Math.PI / 180, s = Math.abs(Math.sin(rad)), co = Math.abs(Math.cos(rad));
    var r = document.createElement('canvas'); r.width = Math.round(c.width * co + c.height * s); r.height = Math.round(c.width * s + c.height * co);
    var x = r.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, r.width, r.height);
    x.translate(r.width / 2, r.height / 2); x.rotate(rad); x.drawImage(c, -c.width / 2, -c.height / 2);
    return r;
  }
  // dígito verificador (EAN-8, UPC-A, EAN-13): recusa número inventado por leitura ruim
  B.valido = function (code) {
    code = String(code || '').replace(/\D/g, ''); if ([8, 12, 13].indexOf(code.length) < 0) return false;
    var s = 0, i, n = code.length;
    for (i = 0; i < n - 1; i++) s += (+code[n - 2 - i]) * (i % 2 === 0 ? 3 : 1);
    return (10 - s % 10) % 10 === +code[n - 1];
  };
  B.ANGULOS_VIVO = [0, 90, -7, 7, 83, 97];                 // leitura ao vivo: rápido (cada tentativa ≈ 15 ms)
  B.ANGULOS_FOTO = [0, 90, -15, -7, 7, 15, 75, 83, 97, 105]; // foto parada: tenta mais inclinações
  // lê um canvas tentando vários ângulos (horizontal, vertical e inclinado); devolve o número ou null
  B.ler = function (c, angulos) {
    if (!window.ZXing || !c || !c.width) return null;
    var lista = angulos || B.ANGULOS_VIVO, i, t;
    for (i = 0; i < lista.length; i++) { t = decodificar(lista[i] === 0 ? c : girar(c, lista[i])); if (t && B.valido(t)) return t.replace(/\D/g, ''); }
    return null;
  };
})(window.HN = window.HN || {});
