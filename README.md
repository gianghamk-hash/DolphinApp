<div align="center">

<img src="icon-source.png" alt="Dolphin Logo" width="120" height="120" />

# 🐬 DOLPHIN HA LONG CRUISE

**Hệ thống quản lý du thuyền & dịch vụ khách hàng đa nền tảng**

[![Build Dolphin APKs](https://github.com/gianghamk-hash/DolphinApp/actions/workflows/build.yml/badge.svg)](https://github.com/gianghamk-hash/DolphinApp/actions/workflows/build.yml)
[![GitHub release](https://img.shields.io/badge/release-v1.0-gold?style=flat-square)](https://github.com/gianghamk-hash/DolphinApp)
[![Platform](https://img.shields.io/badge/platform-Android-3DDC84?style=flat-square&logo=android&logoColor=white)](https://github.com/gianghamk-hash/DolphinApp)
[![Firebase](https://img.shields.io/badge/backend-Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com)
[![License](https://img.shields.io/badge/license-Private-red?style=flat-square)]()

*Ứng dụng Android + Web cho phép khách order, nhân viên phục vụ, quản lý vận hành — tất cả đồng bộ realtime trên cùng hệ thống.*

</div>

---

## 📋 Mục lục

- [Giới thiệu](#-giới-thiệu)
- [Tính năng chính](#-tính-năng-chính)
- [Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
- [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [Cài đặt & Build](#-cài-đặt--build)
- [Hướng dẫn sử dụng](#-hướng-dẫn-sử-dụng)
- [Tech Stack](#-tech-stack)
- [Bảo mật](#-bảo-mật)
- [Đóng góp](#-đóng-góp)
- [Liên hệ](#-liên-hệ)

---

## 🌊 Giới thiệu

**Dolphin Ha Long Cruise** là hệ thống quản lý dịch vụ toàn diện cho du thuyền, bao gồm 5 phân hệ chạy chung một backend Firebase:

| Phân hệ | Mô tả | Người dùng |
|---------|-------|-----------|
| 🍸 **Premium Lounge** | Quản lý order đồ uống & bánh ngọt | Khách VIP |
| 🌴 **Bungalow** | Quản lý dịch vụ chòi nghỉ dưỡng | Khách nghỉ dưỡng |
| 🍽️ **Sun View Restaurant** | Order buffet & alacarte | Khách ăn uống |
| 🎭 **Infinity Show** | Quản lý bàn show & dịch vụ | Ban tổ chức |
| 🏠 **Landing Page** | Điều hướng đến các phân hệ | Tất cả |

Toàn bộ hệ thống sử dụng **Firebase Firestore realtime** — mọi thao tác của khách và nhân viên đều được đồng bộ tức thì.

---

## ✨ Tính năng chính

### 🧑‍🍳 Dành cho Khách hàng

- 🌐 **Đa ngôn ngữ**: Việt, Anh, Trung, Hàn, Nhật, Thái, Nga
- 📱 **Order trực tiếp** trên điện thoại — không cần tải app riêng
- 🔔 **Gọi phục vụ** chỉ với 1 chạm
- 📋 **Theo dõi trạng thái đơn** realtime (Chờ → Đang pha chế → Hoàn thành)
- ⏱️ **Giới hạn thông minh** theo combo (VD: 1 Khoai + 1 Trái + 5 Nước)

### 👨‍💼 Dành cho Nhân viên

- 🔐 **Bảo mật PIN** — nhân viên phải xác thực để vào khu vực nội bộ
- 📊 **Bảng đơn realtime** — đơn mới tự động hiện
- 🔥 **Quản lý chế biến** — nhận đơn, đánh dấu hoàn thành
- 🚨 **Cảnh báo đơn trễ** — đơn quá 5 phút sẽ nhấp nháy đỏ
- 📦 **Đóng ca & lưu trữ** — lịch sử lưu trên cloud

### 👑 Dành cho Quản lý (Manager App)

- ⚡ **Bỏ qua mọi mã PIN** — truy cập tức thì mọi khu vực
- 📈 **Báo cáo doanh thu** theo ca / ngày / tháng
- 🗺️ **Sơ đồ phòng** — theo dõi trạng thái từng bàn
- 🔄 **Chuyển bàn** giữa các phòng bungalow
- 🎯 **Quản lý mã chủ động** — đổi mã từ xa, đồng bộ nhiều thiết bị
- 📤 **Xuất Excel** báo cáo chi tiết

### 🎨 Trải nghiệm người dùng

- 🌅 **Cảnh Hạ Long động** — mặt trời di chuyển theo giờ thực, mưa, mây, sương mù
- 🎵 **Nhạc nền thư giãn** — 5 bản ballad khác nhau
- 🔔 **Chuông thông báo** kiểu khách sạn 5 sao
- 🎊 **Hiệu ứng confetti** khi order thành công
- 📱 **Responsive** — chạy đẹp trên điện thoại, tablet, laptop

---

## 🏗️ Kiến trúc hệ thống

---┌─────────────────────────────────────────────────────────────┐
│ NGƯỜI DÙNG │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│ │ 📱 Khách │ │ 👨‍💼 Nhân viên│ │ 👑 Quản lý │ │
│ │ (Web/QR) │ │ (Staff App) │ │ (Manager App) │ │
│ └──────┬───────┘ └──────┬───────┘ └────────┬─────────┘ │
└─────────┼─────────────────┼───────────────────┼─────────────┘
│ │ │
▼ ▼ ▼
┌─────────────────────────────────────────────────────────────┐
│ 🌐 FIREBASE FIRESTORE (Realtime) │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐ │
│ │ bun_orders │ │lounge_order│ │ res_orders │ │show_table│ │
│ │ bun_calls │ │lounge_call │ │ res_calls │ │show_hist │ │
│ │ bun_tables │ │lounge_table│ │ res_tables │ │ │ │
│ └────────────┘ └────────────┘ └────────────┘ └──────────┘ │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 👑 master_config (Quản lý mã chủ) │ │
│ └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

text


## 📁 Cấu trúc thư mục
DolphinApp/
├── 📄 index.html # Landing page — chọn phân hệ
├── 🍸 dolphin-lounge.html # Premium Lounge
├── 🌴 dolphin-bungalow.html # Bungalow
├── 🍽️ dolphin-restaurant.html # Nhà hàng tầng 2
├── 🎭 dolphin-show.html # Infinity Show
├── 👑 master.js # Hệ thống Máy Chủ (bypass PIN)
├── 🖼️ icon-source.png # Icon gốc 1024x1024
├── 📁 .github/
│ └── 📁 workflows/
│ └── ⚙️ build.yml # Tự động build APK
└── 📖 README.md # File này

---

## 🚀 Cài đặt & Build

### Cách 1: Tải APK có sẵn (Dễ nhất)

**1.** Vào tab [**Actions**](https://github.com/gianghamk-hash/DolphinApp/actions)

**2.** Chọn workflow run **mới nhất** (có dấu ✅ xanh)

**3.** Kéo xuống cuối trang → mục **Artifacts**:

| Artifact | Dành cho | Ghi chú |
|----------|----------|---------|
| 📦 `DolphinStaff-APK` | Nhân viên | **Cần PIN** khi vào khu vực nội bộ |
| 👑 `DolphinManager-APK` | Quản lý | **Bỏ qua mọi PIN** — không chia sẻ |

**4.** Giải nén file `.zip` → cài APK lên điện thoại Android.

### Cách 2: Build lại từ đầu

Repo này tự động build APK qua **GitHub Actions** mỗi khi có commit mới:

```bash
# Clone repo
git clone https://github.com/gianghamk-hash/DolphinApp.git
cd DolphinApp

# Sửa file HTML tùy ý → commit → push
git add .
git commit -m "Update features"
git push

# → Vào tab Actions xem build → tải APK ở Artifacts

