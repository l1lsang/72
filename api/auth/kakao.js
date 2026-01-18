import admin from "firebase-admin";

// ===============================
// 🔐 Firebase Admin 초기화
// ===============================
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

// ===============================
// 🌐 Kakao User API
// ===============================
const KAKAO_USER_API = "https://kapi.kakao.com/v2/user/me";

// ===============================
// 🚀 Vercel API Handler
// ===============================
export default async function handler(req, res) {
  // POST만 허용
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { accessToken } = req.body;

  if (!accessToken) {
    return res.status(400).json({ error: "accessToken is required" });
  }

  try {
    // ===============================
    // 1️⃣ 카카오 사용자 정보 요청
    // ===============================
    const kakaoRes = await fetch(KAKAO_USER_API, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
    });

    if (!kakaoRes.ok) {
      const errorText = await kakaoRes.text();
      console.error("Kakao API Error:", errorText);
      return res.status(401).json({ error: "Invalid Kakao access token" });
    }

    const kakaoUser = await kakaoRes.json();

    const kakaoId = kakaoUser.id;
    const email = kakaoUser.kakao_account?.email ?? null;
    const nickname = kakaoUser.properties?.nickname ?? "카카오 사용자";

    if (!kakaoId) {
      return res.status(400).json({ error: "Invalid Kakao user data" });
    }

    // ===============================
    // 2️⃣ Firebase UID 생성
    // ===============================
    const uid = `kakao:${kakaoId}`;

    // ===============================
    // 3️⃣ Firebase Custom Token 발급
    // ===============================
    const customToken = await admin.auth().createCustomToken(uid, {
      provider: "kakao",
      email,
      nickname,
    });

    // ===============================
    // 4️⃣ 응답
    // ===============================
    return res.status(200).json({
      customToken,
      user: {
        uid,
        email,
        nickname,
        provider: "kakao",
      },
    });
  } catch (err) {
    console.error("Kakao Auth Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
