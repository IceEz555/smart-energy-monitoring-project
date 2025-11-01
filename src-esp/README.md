# 🔌 ESP32 Energy Monitor - Hardware

> Real-time energy monitoring device using ESP32 and current sensor

---

## 📋 Table of Contents

- [Hardware Requirements](#-hardware-requirements)
- [Wiring Diagram](#-wiring-diagram)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Firmware Upload](#-firmware-upload)
- [Troubleshooting](#-troubleshooting)

---

## 🛠️ Hardware Requirements

### Required Components

| Component | Specification | Quantity | Estimated Price |
|-----------|--------------|----------|-----------------|
| ESP32 Development Board | Lolin32 or similar | 1 | ~$5 |
| SCT-013 Current Sensor | 30A/1V (Non-invasive) | 1 | ~$8 |
| OLED Display | 128x64 SSD1306 (I2C) | 1 | ~$4 |
| Resistor | 10kΩ | 1 | <$1 |
| Capacitor | 10µF | 1 | <$1 |
| 3.5mm Audio Jack | Female | 1 | <$1 |
| Breadboard | Standard | 1 | ~$3 |
| Jumper Wires | Male-to-Male | ~10 | <$2 |
| USB Cable | Micro USB | 1 | ~$2 |
| **Total** | | | **~$26** |

### Optional Components
- Enclosure/Case
- Power Supply (5V 1A)
- Terminal blocks

---

## 🔌 Wiring Diagram

### Pin Connections

```
ESP32 (Lolin32)          Component
─────────────────        ─────────────
GPIO34 (ADC1_6)    ───►  SCT-013 Signal (via voltage divider)
3.3V               ───►  OLED VCC
GND                ───►  OLED GND, SCT-013 GND
GPIO5 (SCL)        ───►  OLED SCL
GPIO4 (SDA)        ───►  OLED SDA
```

### Current Sensor Circuit

```
SCT-013 (30A/1V)
     │
     ├─── [10kΩ] ─── 3.3V/2 (Bias)
     │
     ├─── [10µF] ─── GND
     │
     └─── GPIO34 (ADC Input)
```

**Visual Diagram:**

```
                    ┌──────────────┐
                    │   ESP32      │
                    │   (Lolin32)  │
     SCT-013        │              │
    ┌───────┐       │              │      ┌──────────┐
    │  30A  │       │              │      │  OLED    │
    │  /1V  │──────►│ GPIO34 (ADC) │      │ 128x64   │
    │       │       │              │      │          │
    └───────┘       │ 3.3V    ────►├─────►│ VCC      │
                    │ GND     ────►├─────►│ GND      │
                    │ GPIO5   ────►├─────►│ SCL      │
                    │ GPIO4   ────►├─────►│ SDA      │
                    └──────────────┘      └──────────┘
```

### Voltage Divider for SCT-013

```
     3.3V
      │
      ┣── 10kΩ ──┬── GPIO34 (ESP32)
                 │
     SCT-013 ────┤
     (Signal)    │
                 ├── 10µF (to GND)
                 │
      ┣─────────┴── GND
```

**Purpose:** Bias ADC input to 1.65V (midpoint) for AC signal measurement

---

## 📦 Installation

### 1. Install PlatformIO

**Option A: VS Code Extension (Recommended)**
```bash
# Install VS Code
# Then install PlatformIO IDE extension from marketplace
```

**Option B: Command Line**
```bash
pip install platformio
```

### 2. Clone Repository

```bash
git clone https://github.com/yourusername/smart-home-energy-monitor.git
cd smart-home-energy-monitor/src-esp
```

### 3. Install Dependencies

```bash
# PlatformIO will auto-install libraries from platformio.ini
pio lib install
```

---

## ⚙️ Configuration

### Step 1: AWS IoT Setup

1. **Create IoT Thing in AWS Console:**
   ```bash
   # Go to: AWS Console → IoT Core → Manage → Things → Create Thing
   # Thing name: Room1 (or your device name)
   ```

2. **Download Certificates:**
   - Device certificate (`.pem.crt`)
   - Private key (`.pem.key`)
   - Amazon Root CA 1 (`AmazonRootCA1.pem`)

3. **Place Certificates:**
   ```bash
   mkdir -p certificates/
   # Copy certificates to src-esp/certificates/
   mv ~/Downloads/certificate.pem.crt certificates/
   mv ~/Downloads/private.pem.key certificates/
   mv ~/Downloads/AmazonRootCA1.pem certificates/amazonrootca1.pem
   ```

### Step 2: Configure WiFi & AWS

Create `src/config/config.h`:

```cpp
#ifndef CONFIG_H
#define CONFIG_H

// ==========================================
// WiFi Configuration
// ==========================================
#define WIFI_NETWORK "YourWiFiSSID"
#define WIFI_PASSWORD "YourWiFiPassword"
#define WIFI_TIMEOUT 20000  // 20 seconds

// ==========================================
// Device Information
// ==========================================
#define DEVICE_NAME "Room1"  // Must match AWS IoT Thing name

// ==========================================
// AWS IoT Configuration
// ==========================================
#define AWS_ENABLED true
#define AWS_IOT_ENDPOINT "xxxxx-ats.iot.ap-southeast-2.amazonaws.com"
#define AWS_IOT_TOPIC "esp32/data"

// ==========================================
// Hardware Configuration
// ==========================================
#define ADC_INPUT 34        // GPIO34 for current sensor
#define HOME_VOLTAGE 220    // Your home voltage (220V or 110V)
#define LOCAL_MEASUREMENTS 30  // Send every 30 readings

// ==========================================
// Display Configuration
// ==========================================
#define SCREEN_WIDTH 64
#define SCREEN_HEIGHT 128

// ==========================================
// Optional Features
// ==========================================
#define DEBUG false
#define NTP_TIME_SYNC_ENABLED true
#define NTP_SERVER "pool.ntp.org"
#define NTP_OFFSET_SECONDS 25200  // GMT+7 (Bangkok)
#define NTP_UPDATE_INTERVAL_MS 60000

// ==========================================
// MQTT Configuration
// ==========================================
#define MQTT_CONNECT_TIMEOUT 30000
#define MQTT_CONNECT_DELAY 250

#endif
```

### Step 3: Calibrate Current Sensor

**Find Calibration Constant:**

1. Upload firmware with `DEBUG true`
2. Connect a known load (e.g., 100W light bulb)
3. Read serial output for measured current
4. Calculate: `calibration = (actual_amps / measured_amps) * current_constant`
5. Update in `setup()`:
   ```cpp
   emon1.current(ADC_INPUT, 88.27);  // Update this value
   ```

**Formula:**
```
Calibration = (Turns Ratio) / (Burden Resistor)
For SCT-013-030: 2000 / 22Ω = 90.9
```

---

## 🚀 Firmware Upload

### Using PlatformIO CLI

```bash
# Build firmware
pio run

# Upload to ESP32
pio run -t upload

# Monitor serial output
pio device monitor -b 115200
```

### Using PlatformIO IDE (VS Code)

1. Open project in VS Code
2. Click "Upload" button (→) in bottom toolbar
3. Open Serial Monitor (🔌 icon)

### Expected Serial Output

```
[WIFI] Connecting
[WIFI] Connected: 192.168.1.100
[MQTT] Connecting to AWS...
[MQTT] AWS Connected!
[ENERGY] Measuring...
[MQTT] AWS publish: {"readings":[523,587,...]}
```

---

## 🐛 Troubleshooting

### WiFi Connection Issues

**Symptom:** `[WIFI] FAILED`

**Solutions:**
1. Check WiFi credentials in `config.h`
2. Ensure 2.4GHz WiFi (ESP32 doesn't support 5GHz)
3. Move ESP32 closer to router
4. Check signal strength in serial monitor

### AWS MQTT Connection Failed

**Symptom:** `[MQTT] AWS connection timeout`

**Solutions:**

1. **Verify Certificates:**
   ```bash
   ls -la certificates/
   # Should show: certificate.pem.crt, private.pem.key, amazonrootca1.pem
   ```

2. **Check AWS IoT Endpoint:**
   ```bash
   aws iot describe-endpoint --endpoint-type iot:Data-ATS
   # Copy output to AWS_IOT_ENDPOINT in config.h
   ```

3. **Verify IoT Policy:**
   ```json
   {
     "Effect": "Allow",
     "Action": "iot:Publish",
     "Resource": "arn:aws:iot:REGION:ACCOUNT:topic/esp32/data"
   }
   ```

4. **Attach Policy to Certificate:**
   ```bash
   aws iot attach-policy \
     --policy-name YourPolicyName \
     --target arn:aws:iot:REGION:ACCOUNT:cert/CERT_ID
   ```

### Incorrect Current Readings

**Symptom:** Values are too high or too low

**Solutions:**
1. Recalibrate sensor (see Configuration Step 3)
2. Check wiring connections
3. Ensure SCT-013 is clamped around **only one wire** (not both)
4. Verify voltage divider circuit

### OLED Display Not Working

**Symptom:** Blank screen

**Solutions:**
1. Check I2C connections (GPIO4=SDA, GPIO5=SCL)
2. Verify I2C address:
   ```cpp
   // Try 0x3C or 0x3D
   display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
   ```
3. Test with I2C scanner:
   ```cpp
   Wire.beginTransmission(0x3C);
   if (Wire.endTransmission() == 0) {
     Serial.println("Found at 0x3C");
   }
   ```

### Upload Failed

**Symptom:** `Failed to connect to ESP32`

**Solutions:**
1. Hold "BOOT" button while uploading
2. Check USB cable (must support data, not just power)
3. Install CP2102 drivers (for Lolin32)
4. Try different USB port

---

## 📊 Data Format

### MQTT Message Structure

```json
{
  "readings": [523, 587, 601, 548, 492, ...]
}
```

- **Frequency:** Every 30 seconds (configurable via `LOCAL_MEASUREMENTS`)
- **Data Type:** Array of integers (watts)
- **Size:** ~200 bytes per message

---

## 🔧 Advanced Configuration

### Change Measurement Interval

```cpp
// In config.h
#define LOCAL_MEASUREMENTS 60  // Send every 60 readings (1 minute)
```

### Enable Deep Sleep (Battery Mode)

```cpp
void goToDeepSleep() {
  esp_sleep_enable_timer_wakeup(300 * 1000000);  // 5 minutes
  esp_deep_sleep_start();
}
```

### Use External Antenna

```cpp
// In setup()
WiFi.mode(WIFI_STA);
esp_wifi_set_ant(ESP_ANT_ANT2);  // External antenna
```

---

## 📖 Code Structure

```
src-esp/
├── src/
│   ├── MainV.2.ino           # Main program
│   ├── config/
│   │   ├── config.h          # User configuration
│   │   └── enums.h           # Enums & structs
│   ├── tasks/
│   │   ├── wifi-connection.h
│   │   ├── mqtt-aws.h
│   │   ├── measure-electricity.h
│   │   ├── updateDisplay.h
│   │   └── ...
│   └── functions/
│       └── drawfunctions.h   # OLED display functions
│
├── certificates/             # AWS IoT certs (gitignored)
├── platformio.ini            # Build configuration
└── README.md                 # This file
```

---

## 🎓 Understanding the Code

### Task Architecture (FreeRTOS)

```cpp
xTaskCreate(
  taskFunction,    // Function to run
  "TaskName",      // Name for debugging
  stackSize,       // Stack size (bytes)
  NULL,            // Parameters
  priority,        // Priority (0-10)
  NULL             // Task handle
);
```

**Tasks in this project:**
1. `keepWiFiAlive` - Maintain WiFi connection
2. `keepAWSConnectionAlive` - Maintain MQTT connection
3. `measureElectricity` - Read current sensor every 1s
4. `updateDisplay` - Refresh OLED every 2s
5. `fetchTimeFromNTP` - Sync time every 60s

### Energy Calculation

```cpp
double amps = emon1.calcIrms(2000);  // 2000 samples
double watts = amps * HOME_VOLTAGE;  // P = I × V
```

**Why 2000 samples?**
- AC frequency: 50Hz (or 60Hz)
- Need multiple cycles for accurate RMS
- 2000 samples ≈ 40 cycles @ 50Hz

---

## 📚 Libraries Used

| Library | Purpose | Version |
|---------|---------|---------|
| EmonLib-ESP32 | Current measurement | Latest |
| PubSubClient | MQTT client | ^2.8 |
| Adafruit SSD1306 | OLED display | Latest |
| Adafruit GFX | Graphics primitives | Latest |
| ArduinoJson | JSON parsing | ^6.19 |
| NTPClient | Time synchronization | Latest |

---

## 🔒 Security Notes

⚠️ **Never commit certificates to Git!**

```bash
# Already in .gitignore:
certificates/
*.pem
*.key
*.crt
config.h  # Contains WiFi password
```

### Secure Your Device

1. **Change default credentials**
2. **Use WPA2/WPA3 WiFi**
3. **Rotate certificates periodically**
4. **Keep firmware updated**
5. **Disable debug mode in production**

---

## 🙏 Credits

- **Savjee** - EmonLib-ESP32 library
- **Adafruit** - Display libraries
- **Espressif** - ESP32 framework

---

<p align="center">
  Made with ❤️ for IoT Education
</p>