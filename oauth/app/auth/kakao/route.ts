import { NextResponse } from "next/server";

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
        // 🔥 charset 꼭 포함 (카카오 공식 예제)
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",

        // 🔥 REST API 키 (JS 키 ❌)
        client_id: process.env.KAKAO_REST_API_KEY!,

        // 🔥 authorize 단계와 완전히 동일해야 함
        redirect_uri: "https://72-3.vercel.app/auth/kakao",

        // 🔥 방금 받은 code (1회용)
        code,

        // ❗ Client Secret을 "사용함"으로 켠 경우만
        ...(process.env.KAKAO_CLIENT_SECRET
          ? { client_secret: process.env.KAKAO_CLIENT_SECRET }
          : {}),
      }),
    });

    const tokenData = await tokenRes.json();

    // 🔥 이 로그가 제일 중요
    console.log("🔥 KAKAO TOKEN RESPONSE:", tokenData);

    if (!tokenData.access_token) {
      return NextResponse.json(
        {
          ok: false,
          error: "Failed to get kakao access token",
          detail: tokenData, // 🔥 실제 카카오 에러 그대로 반환
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
       3️⃣ 테스트 응답 (정상)
       ========================= */
    return NextResponse.json({
      ok: true,
      kakaoId: profile.id,
      email: kakaoAccount.email ?? null,
      nickname: profileInfo.nickname ?? null,
      profileImage: profileInfo.profile_image_url ?? null,
    });

  } catch (err) {
    console.error("🔥 KAKAO AUTH SERVER ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
