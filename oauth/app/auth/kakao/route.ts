import { NextResponse } from "next/server";
import admin from "firebase-admin";

/* =========================
   🔥 Firebase Admin 초기화
   ========================= */
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }),
  });
}

/**
 * Kakao OAuth Callback
 * GET /auth/kakao?code=xxxx
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { ok: false, error: "Authorization code missing" },
        { status: 400 }
      );
    }

    /* =========================
       1️⃣ 카카오 access_token 요청
       ========================= */
    const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.KAKAO_REST_API_KEY!,
        redirect_uri: "https://72-3.vercel.app/auth/kakao",
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    console.log("🔥 KAKAO TOKEN RESPONSE:", tokenData);

    if (!tokenData.access_token) {
      return NextResponse.json(
        {
          ok: false,
          error: "Failed to get kakao access token",
          detail: tokenData,
        },
        { status: 401 }
      );
    }

    /* =========================
       2️⃣ 카카오 사용자 정보 조회
       ========================= */
    const profileRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const profile = await profileRes.json();

    if (!profile?.id) {
      return NextResponse.json(
        { ok: false, error: "Invalid kakao profile", detail: profile },
        { status: 400 }
      );
    }

    const kakaoAccount = profile.kakao_account ?? {};
    const profileInfo = kakaoAccount.profile ?? {};

    /* =========================
       3️⃣ Firebase Custom Token 생성
       ========================= */
    const uid = `kakao:${profile.id}`;

    const customToken = await admin
      .auth()
      .createCustomToken(uid, {
        provider: "kakao",
        email: kakaoAccount.email ?? null,
        nickname: profileInfo.nickname ?? null,
      });

    /* =========================
       4️⃣ 앱으로 리다이렉트 (로그인 완료)
       ========================= */
    return NextResponse.redirect(
      `verse72://login?token=${customToken}`
    );

    // 🔹 디버그용 (웹에서 확인하고 싶으면)
    // return NextResponse.json({ ok: true, customToken });

  } catch (err) {
    console.error("🔥 KAKAO AUTH SERVER ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
