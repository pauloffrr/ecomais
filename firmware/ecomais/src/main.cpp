#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <time.h>
#include <mbedtls/md.h>
#include "esp_camera.h"
#include <base64.h>
#include "secrets.h"

// Pinos para ESP32-WROVER-KIT / placas WROVER com conector de camera.
#define PWDN_GPIO_NUM     -1
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM     21
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       19
#define Y4_GPIO_NUM       18
#define Y3_GPIO_NUM        5
#define Y2_GPIO_NUM        4
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

const char* ssid = WIFI_SSID;
const char* password = WIFI_PASSWORD;

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

void setup() {
  Serial.begin(115200);
  delay(1000); 
  
  Serial.println("\n--- INICIANDO ESP32 WROVER ---");
  
  
  if (psramFound()) {
    Serial.println("✅ SUCESSO: PSRAM Encontrada! Temos memoria de sobra para as fotos.");
  } else {
    Serial.println("❌ ERRO: PSRAM nao encontrada. Verifique o platformio.ini.");
  }

  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 10000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE_QVGA; 
  config.jpeg_quality = 12;           
  config.fb_count = 1;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("❌ Falha na inicializacao da camera com o erro 0x%x\n", err);
  } else {
    Serial.println("✅ Camera inicializada com sucesso!");
    sensor_t * sensor = esp_camera_sensor_get();
    if (sensor) {
      Serial.printf("Sensor detectado. PID: 0x%02x\n", sensor->id.PID);

      sensor->set_whitebal(sensor, 1);
      sensor->set_awb_gain(sensor, 1);
      sensor->set_wb_mode(sensor, 0);       // 0 = auto
      sensor->set_gain_ctrl(sensor, 1);
      sensor->set_exposure_ctrl(sensor, 1);
      sensor->set_brightness(sensor, 0);
      sensor->set_contrast(sensor, 1);
      sensor->set_saturation(sensor, 0);
      sensor->set_sharpness(sensor, 1);
    }
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
    Serial.println("\n--- Preparando para enviar dados da lixeira (Upload) ---");
    Serial.println("Aguardando 10 segundos para dar tempo de voce criar a sessao no App...");
    delay(10000); 
    
    Serial.println("\n--- Enviando peso e foto simulada para o Backend ---");
    
    HTTPClient http;
    http.begin(API_URL);
    http.addHeader("Content-Type", "application/json");
    
    time_t now = time(nullptr);
    String timestamp = String(now);
    
    Serial.println("📸 Tirando foto do descarte...");
    for (int i = 0; i < 3; i++) {
      camera_fb_t * warmup = esp_camera_fb_get();
      if (warmup) {
        esp_camera_fb_return(warmup);
      }
      delay(120);
    }

    camera_fb_t * fb = esp_camera_fb_get();
    
    if (!fb) {
      Serial.println("❌ Falha ao capturar. Tentando novamente em 2 segundos...");
      delay(2000);
      fb = esp_camera_fb_get();
    }

    String base64Image = "";

    if (!fb) {
      Serial.println("❌ Falha na camera! Usando imagem falsa de fallback para enviar o peso mesmo assim...");
      base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    } else {
      Serial.println("✅ Foto capturada com sucesso!");
      base64Image = base64::encode(fb->buf, fb->len);
      esp_camera_fb_return(fb); 
    }
    
    String jsonPayload = "{\"weight_grams\":250.5,\"image\":\"" + base64Image + "\"}";
    
    String message = String(BIN_ID) + timestamp + jsonPayload;
    String signature = generateHMAC(message, HARDWARE_API_KEY);
    
    http.addHeader("X-Bin-ID", BIN_ID);
    http.addHeader("X-Timestamp", timestamp);
    http.addHeader("X-Signature", signature);
    
    int httpResponseCode = http.POST(jsonPayload);
    
    Serial.print("Código HTTP retornado: ");
    Serial.println(httpResponseCode);
    Serial.print("Resposta do Servidor: ");
    Serial.println(http.getString());
    
    http.end();

    Serial.println("\n--- Upload de hardware concluido! Aperte o botao EN/RST na placa se quiser simular outro descarte ---");
    while(true) { delay(1000); }
  }
  
}
