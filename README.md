# 💬 ChatWave - Real-Time Chat Application

A modern real-time chat application built using **Firebase** and **JavaScript**, designed to deliver a seamless messaging experience similar to WhatsApp.

---

## 🚀 Live Demo

🔗 *( https://chatwave-36adf.web.app)*

---

## 📌 Features

* 🔐 User Authentication (Login / Register)
* 👥 Real-time user list
* 💬 One-to-one messaging
* ⚡ Instant message updates using Firebase
* 🟢 Online user status (optional enhancement)
* 📱 Responsive UI

---

## 🛠️ Tech Stack

* **Frontend:** HTML, CSS, JavaScript
* **Backend (BaaS):** Firebase

  * Firebase Authentication
  * Cloud Firestore
  * Firebase Storage
* **Version Control:** Git & GitHub

---

## 📂 Project Structure

```
chatwave-app/
│
├── index.html
├── style.css
├── app.js
├── firebase.js
├── assets/
└── components/
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository

```
git clone https://github.com/your-username/chatwave-app.git
cd chatwave-app
```

### 2️⃣ Install dependencies (if any)

```
npm install
```

### 3️⃣ Setup Firebase

* Go to Firebase Console
* Create a project
* Enable:

  * Authentication (Email/Password)
  * Firestore Database
  * Storage

### 4️⃣ Add your Firebase config

Update `firebase.js`:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "XXXX",
  appId: "XXXX"
};
```

---

## ▶️ Run the Project

Simply open:

```
index.html
```

Or use Live Server in VS Code.

---

## 🧪 How to Test Chat Feature

* Open app in **two browsers**
* Register two different users
* Start chatting in real-time

---

## 📸 Screenshots

*(Add screenshots here — I can help you create them)*

---

## 🚧 Future Improvements

* 🔍 Search users
* 📎 File & image sharing
* 🟡 Typing indicator
* 🌙 Dark mode
* 📞 Voice/Video calling

---

## 🤝 Contributing

Contributions are welcome!
Feel free to fork this repo and submit a pull request.

---

## 📄 License

This project is open-source and available under the MIT License.

---

## 👨‍💻 Author

**Abdul Nadeem**
📍 Pune, Maharashtra
📧 [abdulnadeem5150@gmail.com](mailto:abdulnadeem5150@gmail.com)

🔗 GitHub: https://github.com/abdulnadeem5150
🔗 LinkedIn: https://www.linkedin.com/in/abdulnadeem-/

---

## ⭐ Support

If you like this project, please ⭐ the repository!

```
firebase serve --only hosting
``` 
  ss