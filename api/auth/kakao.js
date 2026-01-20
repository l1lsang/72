import admin from "firebase-admin";
import fetch from "node-fetch";

/* =========================
   🔥 Firebase Admin 초기화
   ========================= */
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

/* =========================
   🟡 Kakao Auth Handler
   ========================= */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Authorization code missing" });
  }

  try {
    /* =========================
       1️⃣ 카카오 토큰 요청
       ========================= */
    const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.KAKAO_REST_API_KEY!,
        redirect_uri: "verse72://login", // 🔥 app.json + 콘솔과 완전 동일
        code,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      throw new Error("Kakao access token not issued");
    }

    /* =========================
       2️⃣ 카카오 사용자 정보
       ========================= */
    const profileRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const profile = await profileRes.json();

    const kakaoId = profile?.id;
    if (!kakaoId) {
      throw new Error("Invalid Kakao profile");
    }

    const account = profile.kakao_account || {};
    const profileInfo = account.profile || {};

    const displayName = profileInfo.nickname || "카카오 사용자";
    const photoURL = profileInfo.profile_image_url || null;
    const email = account.email || null;

    /* =========================
       3️⃣ Firebase UID 생성
       ========================= */
    const uid = `kakao:${kakaoId}`;

    /* =========================
       4️⃣ Firebase Custom Token
       ========================= */
    const customToken = await admin.auth().createCustomToken(uid);

    /* =========================
       5️⃣ 🔥 Firestore 유저 upsert
       ========================= */
    const userRef = db.collection("users").doc(uid);

    await userRef.set(
      {
        uid,
        provider: "kakao",
        email,
        displayName,
        photoURL,
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true } // ✅ 최초 생성 + 재로그인 업데이트
    );

    /* =========================
       6️⃣ 클라이언트 응답
       ========================= */
    return res.status(200).json({ customToken });

  } catch (error) {
    console.error("🔥 KAKAO AUTH ERROR:", error);
    return res.status(500).json({
      error: "카카오 로그인 처리 중 오류가 발생했습니다.",
    });
  }
}

