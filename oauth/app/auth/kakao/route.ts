import { NextResponse } from "next/server";

/**
 * 카카오 OAuth 콜백 핸들러
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
        redirect_uri: process.env.KAKAO_REDIRECT_URI!,
        code,
        ...(process.env.KAKAO_CLIENT_SECRET && {
          client_secret: process.env.KAKAO_CLIENT_SECRET,
        }),
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error("❌ KAKAO TOKEN ERROR:", tokenData);
      return NextResponse.json(
        { ok: false, error: "Failed to get kakao access token" },
        { status: 401 }
      );
    }

    /* =========================
       2️⃣ 카카오 사용자 정보 조회
       ========================= */
    const profileRes = await fetch(
      "https://kapi.kakao.com/v2/user/me",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    const profile = await profileRes.json();

    if (!profile?.id) {
      return NextResponse.json(
        { ok: false, error: "Invalid kakao profile" },
        { status: 400 }
      );
    }

    const kakaoId = profile.id;
    const kakaoAccount = profile.kakao_account || {};
    const profileInfo = kakaoAccount.profile || {};

    /* =========================
       3️⃣ (지금은 테스트 응답)
       ========================= */
    return NextResponse.json({
      ok: true,
      kakaoId,
      email: kakaoAccount.email ?? null,
      nickname: profileInfo.nickname ?? null,
      profileImage: profileInfo.profile_image_url ?? null,
    });

    /**
     * 👉 다음 단계:
     * 여기서 Firebase Admin으로
     * customToken 만들어서 앱으로 redirect 하면 끝
     */
  } catch (err) {
    console.error("🔥 KAKAO AUTH ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
