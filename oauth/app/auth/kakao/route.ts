import { NextResponse } from "next/server";
import admin from "firebase-admin";

/* =========================
   🔥 Next.js Node 런타임 명시
   ========================= */
export const runtime = "nodejs";

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
        redirect_uri: process.env.KAKAO_REDIRECT_URI!,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    console.log("🟡 KAKAO TOKEN:", tokenData);

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

    const nickname = profileInfo.nickname ?? "";
    const photoURL =
      profileInfo.profile_image_url ??
      profileInfo.thumbnail_image_url ??
      "";

    /* =========================
       3️⃣ Firebase Custom Token 생성
       ========================= */
    const uid = `kakao:${profile.id}`;

    const customToken = await admin.auth().createCustomToken(uid, {
      provider: "kakao",
      email: kakaoAccount.email ?? null,
    });

    /* =========================
       4️⃣ 앱으로 딥링크 리다이렉트
       (token + nickname + photo)
       ========================= */
    const redirectUrl = new URL("verse72://login");

    redirectUrl.searchParams.set(
      "token",
      encodeURIComponent(customToken)
    );

    redirectUrl.searchParams.set(
      "nickname",
      encodeURIComponent(nickname)
    );

    redirectUrl.searchParams.set(
      "photo",
      encodeURIComponent(photoURL)
    );

    return NextResponse.redirect(redirectUrl);

  } catch (err) {
    console.error("🔥 KAKAO AUTH SERVER ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
