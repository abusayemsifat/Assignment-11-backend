<div align="center">

# 🩸 BloodLink — Backend API

**REST API for the BloodLink blood donation platform. Built with Node.js, Express, and MongoDB.**

**[⚙️ Live API](https://backend-11-cyan.vercel.app) &nbsp;·&nbsp; [🌐 Frontend Site](https://assignment-11-abusayemsifat.pages.dev) &nbsp;·&nbsp; [💻 Frontend Repo](https://github.com/abusayemsifat/Assignment-11-frontend)**

<img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" /> <img src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white" /> <img src="https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white" /> <img src="https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black" /> <img src="https://img.shields.io/badge/Stripe-635BFF?style=flat-square&logo=stripe&logoColor=white" /> <img src="https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white" />

</div>

---

## About

This is the backend for BloodLink — a full-stack blood donation platform serving donors and recipients across all 64 districts of Bangladesh. It handles authentication verification, blood request management, blog content, contact form submissions, and Stripe payment processing.

---

## Tech Stack

| | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB Atlas |
| Auth | Firebase Admin SDK (token verification) |
| Payments | Stripe |
| Deployment | Vercel |

---

## API Reference

**Base URL:** `https://backend-11-cyan.vercel.app`

Protected routes require a Firebase ID token in the request header:
```
Authorization: Bearer <firebase_id_token>
```

### Users
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `POST` | `/users` | — | Register a new user |
| `GET` | `/users` | 🔒 | Get all users |
| `GET` | `/users/role/:email` | — | Get user role and profile |
| `PATCH` | `/users/update/:email` | — | Update profile details |
| `PATCH` | `/update/user/status` | 🔒 | Block or unblock a user |

### Stats
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `GET` | `/total-donors` | — | Total registered donor count |
| `GET` | `/total-requests` | — | Total blood request count |

### Blood Requests
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `POST` | `/requests` | 🔒 | Create a new blood request |
| `GET` | `/all-requests` | — | Get all blood requests |
| `GET` | `/my-request` | 🔒 | Get the authenticated user's requests |
| `GET` | `/search-requests` | — | Filter by blood group, district, upazila |
| `PATCH` | `/requests/:id/status` | 🔒 | Update a request's donation status |
| `DELETE` | `/requests/:id` | 🔒 | Delete a blood request |

### Blogs
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `GET` | `/blogs` | — | Get all published blog posts |
| `GET` | `/blogs/:id` | — | Get a single blog post |
| `POST` | `/blogs` | 🔒 | Create a new blog post |
| `PATCH` | `/blogs/:id` | 🔒 | Edit a blog post |
| `DELETE` | `/blogs/:id` | 🔒 | Delete a blog post |

### Contact & Payments
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `POST` | `/contact` | — | Submit a contact form message |
| `GET` | `/contact` | 🔒 | Get all contact submissions |
| `POST` | `/create-payment-checkout` | — | Create a Stripe checkout session |
| `POST` | `/success-payment` | — | Confirm and record a completed payment |

---

## Database Collections

| Collection | Description |
|---|---|
| `user` | Registered donors and admins |
| `request` | Blood donation requests |
| `blogs` | Blog articles |
| `contacts` | Contact form submissions |
| `payments` | Completed Stripe payments |

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Donor | `donor@bloodlink.com` | `Demo@1234` |
| Admin | `admin@bloodlink.com` | `Admin@1234` |

---
 
<div align="center">
  Built to save lives in Bangladesh 🇧🇩
</div>