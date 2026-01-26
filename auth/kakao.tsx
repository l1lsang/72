import { useEffect } from "react";

export default function KakaoRedirectPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) return;

    // 🔥 서버 API로 code 전달
    fetch("/api/auth/kakao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then(res => res.json())
      .then(data => {
        console.log("✅ Kakao login success", data);
        // TODO: Firebase customToken으로 앱/웹 로그인 처리
      })
      .catch(err => {
        console.error("🔥 Kakao login failed", err);
      });
  }, []);

  return <p>카카오 로그인 처리 중입니다…</p>;
}
