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
   🟡 Kakao Auth API
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
    /* 1️⃣ 카카오 토큰 요청 */
    const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.KAKAO_REST_API_KEY!,
        redirect_uri: "https://verse72.vercel.app/auth/kakao",
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      throw new Error("Kakao access token not issued");
    }

    /* 2️⃣ 카카오 사용자 정보 */
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

    /* 3️⃣ Firebase Custom Token */
    const uid = `kakao:${kakaoId}`;
    const customToken = await admin.auth().createCustomToken(uid);

    /* 4️⃣ Firestore upsert */
    await db.collection("users").doc(uid).set(
      {
        uid,
        provider: "kakao",
        displayName: profile.kakao_account?.profile?.nickname ?? "카카오 사용자",
        photoURL:
          profile.kakao_account?.profile?.profile_image_url ?? null,
        email: profile.kakao_account?.email ?? null,
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.status(200).json({ customToken });
  } catch (e) {
    console.error("🔥 KAKAO AUTH ERROR:", e);
    return res.status(500).json({ error: "Kakao auth failed" });
  }
}
