# 🏠 Smart Home Energy Monitor

> IoT-based Real-time Energy Monitoring System with AI-Powered Insights

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![AWS](https://img.shields.io/badge/AWS-Serverless-orange)](https://aws.amazon.com/)
[![ESP32](https://img.shields.io/badge/ESP32-Arduino-blue)](https://www.espressif.com/)

---

## 📖 Overview

**Smart Home Energy Monitor** เป็นระบบ IoT แบบ End-to-End ที่ออกแบบมาเพื่อติดตามและวิเคราะห์การใช้พลังงานไฟฟ้าในบ้านและสำนักงานแบบ Real-time พร้อมด้วย AI Insights จาก Google Gemini API

### 🌟 Key Features

- ⚡ **Real-time Monitoring** - อัปเดตข้อมูลทุก 30 วินาที
- 📊 **Historical Analysis** - เก็บข้อมูลย้อนหลัง 30 วัน (summary ถึง 1 ปี)
- 🤖 **AI-Powered Insights** - คำแนะนำประหยัดพลังงานจาก Google Gemini
- 🌓 **Day/Night Tariff** - คำนวณค่าไฟตามอัตราก้าวหน้า
- 📱 **Responsive Dashboard** - ใช้งานได้ทั้ง Desktop และ Mobile
- 💰 **Cost-Effective** - ค่าใช้จ่าย AWS < $1/เดือน (estimated)
- 🔄 **Automated Archiving** - สำรองข้อมูลอัตโนมัติทุกวัน

---

## 🏗️ Architecture

```
┌─────────────────┐
│   ESP32 Device  │ ──MQTT──┐
│   (Hardware)    │         │
└─────────────────┘         │
                            ▼
                    ┌───────────────┐
                    │  AWS IoT Core │
                    └───────┬───────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
        ┌──────────────┐        ┌─────────────┐
        │  DynamoDB    │        │  Lambda     │
        │  (Storage)   │◄───────┤  Functions  │
        └──────┬───────┘        └─────────────┘
               │                        │
               └────────┬───────────────┘
                        ▼
                ┌───────────────┐
                │   S3 Archive  │
                └───────────────┘
                        │
                        ▼
                ┌───────────────┐
                │   Dashboard   │
                │  (Frontend)   │
                └───────────────┘
```

### Tech Stack

**Hardware:**
- ESP32 (Lolin32)
- SCT-013 Current Sensor
- OLED Display (SSD1306)

**Backend:**
- AWS Lambda (Node.js 18.x)
- AWS IoT Core (MQTT)
- DynamoDB (NoSQL Database)
- S3 (Archival Storage)
- API Gateway (GraphQL)

**Frontend:**
- HTML5 + Vanilla JavaScript
- Chart.js & Dygraph (Visualization)
- Tailwind CSS (Styling)

**AI/ML:**
- Google Gemini 2.5 Flash API

---

## 📁 Project Structure

```
smart-home-energy-monitor/
├── src-aws/              # Backend (AWS Serverless)
│   ├── core/             # Business logic & helpers
│   ├── functions/        # Lambda functions
│   ├── dashboard/        # Frontend web app
│   ├── tests/            # Unit tests
│   └── docs/             # Backend documentation
│
├── src-esp/              # Hardware (ESP32 Firmware)
│   ├── src/              # Arduino source code
│   ├── certificates/     # AWS IoT certificates
│   └── platformio.ini    # Build configuration
│
├── docs/                 # Project documentation
├── LICENSE               # MIT License
└── README.md             # This file
```

---

## 🚀 Quick Start

### Prerequisites

- **Hardware:**
  - ESP32 development board
  - SCT-013 current sensor (30A/1V)
  - OLED display (128x64, I2C)
  - USB cable & power supply

- **Software:**
  - Node.js >= 18.0.0
  - AWS CLI configured
  - PlatformIO (for ESP32)
  - Serverless Framework

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/smart-home-energy-monitor.git
cd smart-home-energy-monitor
```

### 2. Setup Backend (AWS)

```bash
cd src-aws

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Deploy to AWS
serverless deploy

# Deploy dashboard
serverless client deploy
```

### 3. Setup Hardware (ESP32)

```bash
cd ../src-esp

# 1. Create AWS IoT Thing and download certificates
# 2. Place certificates in src-esp/certificates/
# 3. Copy and edit config file
cp src/config/config.example.h src/config/config.h

# 4. Flash firmware
pio run -t upload

# 5. Monitor serial output
pio device monitor
```

---

## 📊 Dashboard Screenshots

<img src="docs/images/dashboard-overview.png" width="600" alt="Dashboard Overview">

*Real-time monitoring dashboard*

<img src="docs/images/report-page.png" width="600" alt="Report Page">

*Historical usage reports*

---

## 📖 Documentation

### Backend (AWS)
- [Complete Documentation](src-aws/README.md)
- [Code Structure](src-aws/docs/CODE_STRUCTURE.md)
- [API Reference](src-aws/docs/API.md)

### Hardware (ESP32)
- [Hardware Setup Guide](src-esp/README.md)

### General
- [Development Guide](docs/DEVELOPMENT.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

---

## 💰 Cost Estimation

Monthly AWS costs (estimated):

| Service       | Usage              | Cost/Month |
|---------------|-------------------|------------|
| Lambda        | ~100K invocations | $0.20      |
| DynamoDB      | 1 GB storage      | $0.25      |
| S3            | 5 GB storage      | $0.12      |
| IoT Core      | 1M messages       | $0.08      |
| API Gateway   | 100K requests     | $0.35      |
| **Total**     |                   | **< $1.00** |

*Note: Actual costs may vary based on usage*

---

## 🎓 Project Context

This project was developed as part of:
- Learning IoT & Cloud Computing
- Studying AWS Serverless Architecture
- Exploring AI integration in IoT systems
- Solving real-world energy consumption problems

---

## 🧪 Testing

```bash
# Backend tests
cd src-aws
npm test
npm run lint

# Hardware tests (optional)
cd src-esp
pio test
```

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
Copyright (c) 2025 Apivit Y.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

---

## 🙏 Acknowledgments

- **AWS Serverless Framework** - Infrastructure as Code
- **Google Gemini API** - AI Insights
- **Savjee's EmonLib-ESP32** - Current sensing library
- **Adafruit** - OLED display libraries
- **Community** - All open-source contributors

---

## 📞 Contact & Support

- **Author:** Apivit Y.
- **Email:** apiwit806@gmail.com
- **Issues:** [GitHub Issues](https://github.com/IceEz555/smart-energy-monitoring-project)

---

## 🙏 Credits

- **Savjee** [GitHub](https://github.com/Savjee/home-energy-monitor)
---
## 🗺️ Roadmap

### Version 2.0 (Planned)
- [ ] User authentication (AWS Cognito)
- [ ] Multi-user support
- [ ] Mobile app (React Native)
- [ ] Push notifications (SNS)
- [ ] Advanced analytics dashboard
- [ ] Solar panel integration

---

<p align="center">
  Made with ❤️ for IoT & Cloud Computing
</p>

<p align="center">
  <sub>If this project helps you, please consider giving it a ⭐️</sub>
</p>