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
        // 카카오 공식 권장
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",

        // ✅ REST API 키만 사용 (JS 키 ❌, Admin 키 ❌)
        client_id: process.env.KAKAO_REST_API_KEY!,

        // ✅ 카카오 콘솔에 등록된 Redirect URI와 완전 동일
        redirect_uri: "https://72-3.vercel.app/auth/kakao",

        // ✅ 방금 받은 인가 코드 (1회용)
        code,
      }),
    });

    const tokenData = await tokenRes.json();

    // 🔥 디버깅용 (문제 생기면 이 로그 보면 됨)
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
       3️⃣ 정상 응답 (테스트 단계)
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
