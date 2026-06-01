#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <time.h>
#include <mbedtls/md.h>
#include "secrets.h"

// Os dados de Wi-Fi agora vêm do arquivo secrets.h (que não vai pro GitHub)
const char* ssid = WIFI_SSID;
const char* password = WIFI_PASSWORD;

// Gera a criptografia HMAC-SHA256 (Idêntica ao security_service.py)
String generateHMAC(String payload, String key) {
  mbedtls_md_context_t ctx;
  mbedtls_md_type_t md_type = MBEDTLS_MD_SHA256;
  
  mbedtls_md_init(&ctx);
  mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(md_type), 1);
  mbedtls_md_hmac_starts(&ctx, (const unsigned char *) key.c_str(), key.length());
  mbedtls_md_hmac_update(&ctx, (const unsigned char *) payload.c_str(), payload.length());
  
  unsigned char hmacResult[32];
  mbedtls_md_hmac_finish(&ctx, hmacResult);
  mbedtls_md_free(&ctx);
  
  String hmacHex = "";
  for(int i = 0; i < 32; i++) {
    char hex[3];
    sprintf(hex, "%02x", hmacResult[i]);
    hmacHex += hex;
  }
  return hmacHex;
}

String extractJsonStringValue(const String& json, const char* key) {
  String needle = String("\"") + key + "\":\"";
  int start = json.indexOf(needle);
  if (start < 0) {
    return "";
  }

  start += needle.length();
  int end = json.indexOf('"', start);
  if (end < 0) {
    return "";
  }

  return json.substring(start, end);
}

String loginAndCreateSession() {
  HTTPClient http;

  Serial.println("Tentando autenticar usuario de teste...");
  http.begin(LOGIN_URL);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");

  String loginBody = String("username=") + TEST_USERNAME + "&password=" + TEST_PASSWORD;
  int loginResponseCode = http.POST(loginBody);
  String loginResponse = http.getString();
  http.end();

  if (loginResponseCode != 200) {
    Serial.print("Falha no login. HTTP ");
    Serial.println(loginResponseCode);
    Serial.println(loginResponse);
    return "";
  }

  String accessToken = extractJsonStringValue(loginResponse, "access_token");
  if (accessToken.length() == 0) {
    Serial.println("Nao foi possivel extrair access_token da resposta de login.");
    Serial.println(loginResponse);
    return "";
  }

  Serial.println("✅ Login OK. Criando sessao real...");
  http.begin(SESSION_START_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + accessToken);

  String sessionBody = String("{\"bin_code\":\"") + BIN_ID + "\"}";
  int sessionResponseCode = http.POST(sessionBody);
  String sessionResponse = http.getString();
  http.end();

  if (sessionResponseCode != 201) {
    Serial.print("Falha ao criar sessao. HTTP ");
    Serial.println(sessionResponseCode);
    Serial.println(sessionResponse);
    return "";
  }

  String sessionToken = extractJsonStringValue(sessionResponse, "session_token");
  if (sessionToken.length() == 0) {
    Serial.println("Nao foi possivel extrair session_token da resposta de sessao.");
    Serial.println(sessionResponse);
    return "";
  }

  Serial.print("✅ Sessao real criada. Token: ");
  Serial.println(sessionToken);
  return sessionToken;
}

void setup() {
  Serial.begin(115200);
  delay(1000); 
  
  Serial.println("\n--- INICIANDO ESP32 WROVER ---");
  
  // Verifica se a memória extra (PSRAM) está funcionando
  if (psramFound()) {
    Serial.println("✅ SUCESSO: PSRAM Encontrada! Temos memoria de sobra para as fotos.");
  } else {
    Serial.println("❌ ERRO: PSRAM nao encontrada. Verifique o platformio.ini.");
  }

  Serial.print("Conectando na rede: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n✅ SUCESSO: WiFi Conectado!");
  Serial.print("Endereço IP da sua lixeira: ");
  Serial.println(WiFi.localIP());

  // Precisamos da hora exata para a assinatura HMAC não dar erro de "Replay Attack"
  Serial.print("Sincronizando relógio via Servidor Mundial (NTP)...");
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  while (time(nullptr) < 1000000000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ Relogio sincronizado!");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n--- Enviando dados falsos para a API Python ---");

    String sessionToken = loginAndCreateSession();
    if (sessionToken.length() == 0) {
      Serial.println("❌ Nao foi possivel obter token de sessao real. Abortando teste.");
      while(true) { delay(1000); }
    }
    
    HTTPClient http;
    http.begin(API_URL);
    http.addHeader("Content-Type", "application/json");
    
    // 1. Pega a hora atual exata
    time_t now = time(nullptr);
    String timestamp = String(now);
    
    // 2. Monta o pacote usando o token real obtido no backend.
    String jsonPayload = String("{\"session_token\":\"") + sessionToken + "\",\"weight_grams\":250.5,\"image\":\"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=\"}";
    
    // 3. O SEGREDO DO PROJETO: Assinatura de hardware!
    String message = String(BIN_ID) + timestamp + jsonPayload;
    String signature = generateHMAC(message, HARDWARE_API_KEY);
    
    // 4. Adiciona os cabeçalhos de segurança
    http.addHeader("X-Bin-ID", BIN_ID);
    http.addHeader("X-Timestamp", timestamp);
    http.addHeader("X-Signature", signature);
    
    // 5. Dispara para o seu computador
    int httpResponseCode = http.POST(jsonPayload);
    
    Serial.print("Código HTTP retornado: ");
    Serial.println(httpResponseCode);
    Serial.print("Resposta do Servidor: ");
    Serial.println(http.getString());
    
    http.end();

    // 6. Trava a placa para ela enviar apenas UMA vez e não estourar o limite Anti-Fraude de novo!
    Serial.println("\n--- Teste concluido! Aperte o botao EN/RST na placa se quiser enviar de novo ---");
    while(true) { delay(1000); }
  }
  
}