import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

/* =========================
   🔥 Firebase Admin 초기화
   ========================= */
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(
        /\\n/g,
        "\n"
      ),
    }),
  });
}

/* =========================
   🟡 POST /auth/kakao
   ========================= */
export async function POST(req: NextRequest) {
  try {
    const { kakaoAccessToken } = await req.json();

    if (!kakaoAccessToken) {
      return NextResponse.json(
        { error: "Missing kakaoAccessToken" },
        { status: 400 }
      );
    }

    /* =========================
       1️⃣ 카카오 사용자 정보 조회
       ========================= */
    const kakaoRes = await fetch(
      "https://kapi.kakao.com/v2/user/me",
      {
        headers: {
          Authorization: `Bearer ${kakaoAccessToken}`,
        },
      }
    );

    if (!kakaoRes.ok) {
      return NextResponse.json(
        { error: "Invalid Kakao token" },
        { status: 401 }
      );
    }

    const kakaoUser = await kakaoRes.json();

    const kakaoId = kakaoUser.id;
    const kakaoAccount = kakaoUser.kakao_account ?? {};
    const profile = kakaoAccount.profile ?? {};

    const uid = `kakao:${kakaoId}`;

    /* =========================
       2️⃣ Firebase Custom Token 생성
       ========================= */
    const customToken = await admin
      .auth()
      .createCustomToken(uid, {
        provider: "kakao",
        email: kakaoAccount.email ?? null,
        nickname: profile.nickname ?? null,
        photoURL: profile.profile_image_url ?? null,
      });

    /* =========================
       3️⃣ 앱으로 응답
       ========================= */
    return NextResponse.json({
      customToken,
      nickname: profile.nickname ?? null,
      photoURL: profile.profile_image_url ?? null,
    });
  } catch (e) {
    console.error("🔥 Kakao auth error:", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
